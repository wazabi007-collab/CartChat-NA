import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isWhatsAppEnabled } from "@/lib/whatsapp";
import { formatPrice } from "@/lib/utils";

/**
 * Cron job: Payment reminders + auto-cancel unpaid orders.
 * Runs every 15 minutes via Vercel Cron.
 *
 * Schedule: pending non-COD orders get reminders at 2hr, 24hr, 3 days.
 * After 3 days + 1 hour, auto-cancel and restock inventory.
 */
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (!isWhatsAppEnabled()) {
    return NextResponse.json({ ok: true, reason: "whatsapp disabled" });
  }

  const supabase = createServiceClient();
  const now = new Date();
  let remindersSent = 0;
  let ordersCancelled = 0;

  // ---- 1. Send payment reminders ----

  // Find pending non-COD orders created in the last 3 days
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const { data: pendingOrders } = await supabase
    .from("orders")
    .select(`
      id, order_number, customer_name, customer_whatsapp,
      created_at, reminder_count, total_nad, payment_method,
      merchant_id,
      merchants!inner(store_name, store_slug)
    `)
    .eq("status", "pending")
    .neq("payment_method", "cod")
    .gte("created_at", threeDaysAgo.toISOString())
    .order("created_at", { ascending: true });

  if (pendingOrders) {
    for (const order of pendingOrders) {
      const createdAt = new Date(order.created_at);
      const ageMs = now.getTime() - createdAt.getTime();
      const ageHours = ageMs / (1000 * 60 * 60);
      const reminderCount = order.reminder_count || 0;
      const merchant = order.merchants as unknown as { store_name: string; store_slug: string };

      let shouldRemind = false;

      if (ageHours >= 2 && reminderCount === 0) shouldRemind = true;
      else if (ageHours >= 24 && reminderCount === 1) shouldRemind = true;
      else if (ageHours >= 72 && reminderCount === 2) shouldRemind = true;

      if (shouldRemind && order.customer_whatsapp) {
        const total = formatPrice(order.total_nad || 0);
        const storeUrl = `https://oshicart.com/s/${merchant.store_slug}`;

        // Fire-and-forget WhatsApp reminder
        fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "https://oshicart.com"}/api/whatsapp/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merchant_id: order.merchant_id,
            order_id: order.id,
            template_name: "payment_reminder",
            recipient_phone: order.customer_whatsapp,
            variables: [
              order.customer_name || "Customer",
              String(order.order_number),
              merchant.store_name,
              total,
              storeUrl,
            ],
          }),
        }).catch(() => {});

        // Update reminder count
        await supabase
          .from("orders")
          .update({
            reminder_count: reminderCount + 1,
            last_reminder_at: now.toISOString(),
          })
          .eq("id", order.id);

        remindersSent++;
      }
    }
  }

  // ---- 2. Auto-cancel expired unpaid orders (3 days + 1 hour) ----

  const expiredCutoff = new Date(
    now.getTime() - (3 * 24 + 1) * 60 * 60 * 1000
  );

  const { data: expiredOrders } = await supabase
    .from("orders")
    .select(`
      id, order_number, customer_name, customer_whatsapp,
      merchant_id, reminder_count,
      merchants!inner(store_name)
    `)
    .eq("status", "pending")
    .neq("payment_method", "cod")
    .lte("created_at", expiredCutoff.toISOString())
    .gte("reminder_count", 3);

  if (expiredOrders) {
    for (const order of expiredOrders) {
      const merchant = order.merchants as unknown as { store_name: string };

      // Cancel the order
      await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", order.id);

      // Restock inventory
      const { data: items } = await supabase
        .from("order_items")
        .select("product_id, quantity")
        .eq("order_id", order.id);

      if (items) {
        for (const item of items) {
          // Direct restock: increment stock_quantity
          const { data: product } = await supabase
            .from("products")
            .select("stock_quantity")
            .eq("id", item.product_id)
            .single();

          if (product) {
            await supabase
              .from("products")
              .update({
                stock_quantity: (product.stock_quantity || 0) + item.quantity,
              })
              .eq("id", item.product_id);
          }
        }
      }

      // Notify customer of cancellation
      if (order.customer_whatsapp) {
        fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "https://oshicart.com"}/api/whatsapp/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merchant_id: order.merchant_id,
            order_id: order.id,
            template_name: "order_cancelled",
            recipient_phone: order.customer_whatsapp,
            variables: [
              order.customer_name || "Customer",
              String(order.order_number),
              merchant.store_name,
            ],
          }),
        }).catch(() => {});
      }

      ordersCancelled++;
    }
  }

  return NextResponse.json({
    ok: true,
    remindersSent,
    ordersCancelled,
    timestamp: now.toISOString(),
  });
}
