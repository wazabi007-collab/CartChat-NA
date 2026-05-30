import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isWhatsAppEnabled } from "@/lib/whatsapp";
import { formatPrice } from "@/lib/utils";
import { sendWhatsAppEvent } from "@/lib/whatsapp-events";

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
  let merchantOrderAlertsSent = 0;
  let lowStockAlertsSent = 0;

  // ---- 1. Send payment reminders ----

  // Find pending non-COD orders created in the last 3 days
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const { data: pendingOrders } = await supabase
    .from("orders")
    .select(`
      id, order_number, customer_name, customer_whatsapp,
      created_at, reminder_count, subtotal_nad, delivery_fee_nad, discount_nad, payment_method,
      merchant_id, tracking_token,
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

      if (ageHours >= 1 && reminderCount === 0) shouldRemind = true;
      else if (ageHours >= 12 && reminderCount === 1) shouldRemind = true;
      else if (ageHours >= 48 && reminderCount === 2) shouldRemind = true;

      if (shouldRemind && order.customer_whatsapp) {
        const total = formatPrice(
          (order.subtotal_nad || 0) + (order.delivery_fee_nad || 0) - (order.discount_nad || 0)
        );

        // WhatsApp reminder — sent server-side via the shared library (no
        // HTTP round-trip to the now server-only /api/whatsapp/send).
        await sendWhatsAppEvent({
          supabase,
          merchantId: order.merchant_id,
          orderId: order.id,
          eventKey: `payment_reminder:${order.id}:${reminderCount + 1}`,
          templateName: "payment_reminder",
          recipientPhone: order.customer_whatsapp,
          variables: [
            order.customer_name || "Customer",
            String(order.order_number),
            merchant.store_name,
            total,
          ],
          buttonParams: order.tracking_token ? [order.tracking_token] : undefined,
        });

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

  // ---- 1b. Alert merchants when orders stay pending too long ----

  const stalePendingCutoff = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const { data: staleOrders } = await supabase
    .from("orders")
    .select(`
      id, order_number, customer_name, created_at, subtotal_nad, delivery_fee_nad, discount_nad,
      merchant_id,
      merchants!inner(store_name, whatsapp_number)
    `)
    .eq("status", "pending")
    .lte("created_at", stalePendingCutoff.toISOString())
    .order("created_at", { ascending: true })
    .limit(100);

  for (const order of (staleOrders || [])) {
    const merchant = order.merchants as unknown as { store_name: string; whatsapp_number: string | null };
    const result = await sendWhatsAppEvent({
      supabase,
      merchantId: order.merchant_id,
      orderId: order.id,
      eventKey: `pending_order_reminder_merchant:${order.id}:2h`,
      templateName: "pending_order_reminder_merchant",
      recipientPhone: merchant.whatsapp_number,
      variables: [
        merchant.store_name,
        String(order.order_number),
        order.customer_name || "Customer",
        formatPrice(
          (order.subtotal_nad || 0) + (order.delivery_fee_nad || 0) - (order.discount_nad || 0)
        ),
      ],
    });
    if (result.ok && !result.skipped) merchantOrderAlertsSent++;
  }

  // ---- 1c. Alert merchants about low stock ----

  const { data: lowStockProducts } = await supabase
    .from("products")
    .select("id, merchant_id, name, stock_quantity, merchants!inner(store_name, whatsapp_number)")
    .eq("track_inventory", true)
    .eq("is_available", true)
    .lte("stock_quantity", 3)
    .order("stock_quantity", { ascending: true })
    .limit(100);

  for (const product of (lowStockProducts || [])) {
    const merchant = product.merchants as unknown as { store_name: string; whatsapp_number: string | null };
    const qty = Number(product.stock_quantity || 0);
    const result = await sendWhatsAppEvent({
      supabase,
      merchantId: product.merchant_id,
      eventKey: `low_stock_alert:${product.id}:${qty}`,
      templateName: "low_stock_alert",
      recipientPhone: merchant.whatsapp_number,
      variables: [
        merchant.store_name,
        product.name || "Product",
        String(qty),
      ],
    });
    if (result.ok && !result.skipped) lowStockAlertsSent++;
  }

  // ---- 2. Auto-cancel expired unpaid orders (3 days + 1 hour) ----

  const expiredCutoff = new Date(
    now.getTime() - 49 * 60 * 60 * 1000
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

      // Cancel the order. This update fires the trg_restock_on_cancel
      // database trigger (007), which restocks inventory exactly once,
      // respects each product's track_inventory flag, and writes a
      // stock_adjustments audit row. Do NOT also restock manually here —
      // that previously double-counted inventory for tracked products and
      // wrongly restocked non-tracking products.
      await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", order.id);

      // Notify customer of cancellation — sent server-side via the library.
      if (order.customer_whatsapp) {
        await sendWhatsAppEvent({
          supabase,
          merchantId: order.merchant_id,
          orderId: order.id,
          eventKey: `order_cancelled:${order.id}`,
          templateName: "order_cancelled",
          recipientPhone: order.customer_whatsapp,
          variables: [
            order.customer_name || "Customer",
            String(order.order_number),
            merchant.store_name,
          ],
        });
      }

      ordersCancelled++;
    }
  }

  return NextResponse.json({
    ok: true,
    remindersSent,
    merchantOrderAlertsSent,
    lowStockAlertsSent,
    ordersCancelled,
    timestamp: now.toISOString(),
  });
}
