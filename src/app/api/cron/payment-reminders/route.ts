import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { isWhatsAppEnabled } from "@/lib/whatsapp";
import { formatPrice } from "@/lib/utils";
import { getOrderPayableTotal } from "@/lib/vat";
import { sendWhatsAppEvent } from "@/lib/whatsapp-events";
import { hasCartRecovery } from "@/lib/tier-limits";

/**
 * Cron job: Payment reminders + auto-cancel unpaid orders.
 * Runs every 15 minutes via Vercel Cron.
 *
 * Schedule: pending non-COD orders get TWO reminders, at 6hr and 24hr.
 * After 49 hours — a full day past the last reminder — the order is
 * auto-cancelled and its stock released.
 *
 * The number of reminders and the auto-cancel gate are coupled: cancelling
 * requires reminder_count >= REMINDER_TIERS.length, so an order is only ever
 * closed after every warning has actually been sent. Change the tiers and the
 * gate follows automatically; scripts/check-payment-reminders.ts fails if the
 * two ever drift apart.
 *
 * A customer who has ALREADY PAID is never chased and never cancelled. Two
 * signals prove payment, and both were previously ignored here:
 *
 *   - a live row in order_payments (the merchant recorded the money)
 *   - proof_of_payment_url on the order (the customer uploaded a slip)
 *
 * Without those checks this cron chased customers who had paid, and then
 * cancelled their order at 49 hours with the money already in the merchant's
 * bank -- punishing exactly the people who did the right thing.
 */
export async function GET(req: NextRequest) {
  // Reject if CRON_SECRET is not properly configured (fail closed)
  if (!process.env.CRON_SECRET || process.env.CRON_SECRET.length < 16) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  // Verify cron secret with a length-checked timing-safe comparison
  const authHeader = req.headers.get("authorization") || "";
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  const isValid =
    authHeader.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
  if (!isValid) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // WhatsApp being off must NOT stop order expiry — auto-cancel (section 2) is
  // order-lifecycle work, not messaging. Only the reminder/alert sections are
  // skipped when messaging is disabled.
  const whatsappOn = isWhatsAppEnabled();

  const supabase = createServiceClient();
  const now = new Date();
  let remindersSent = 0;
  let ordersCancelled = 0;
  let merchantOrderAlertsSent = 0;
  let lowStockAlertsSent = 0;

  // Orders that are settled in the merchant's eyes, however the status reads.
  // Recording a payment or receiving proof must silence this cron.
  const { data: paidRows } = await supabase
    .from("order_payments")
    .select("order_id")
    .is("voided_at", null);
  const settledOrderIds = new Set((paidRows ?? []).map((r) => r.order_id));

  // Hours after the order at which each reminder goes out. Two is deliberate:
  // the first at 6 hours gives someone the working day to get to a bank, the
  // second next morning. A third inside 48 hours read as nagging, and every
  // template also opens a billable WhatsApp conversation.
  const REMINDER_TIERS = [6, 24] as const;

  // ---- 1. Send payment reminders ----
  // Sections 1–1c are messaging; skipped entirely when WhatsApp is disabled.
  if (whatsappOn) {

  // Find pending non-COD orders created in the last 3 days
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const { data: pendingOrders } = await supabase
    .from("orders")
    .select(`
      id, order_number, customer_name, customer_whatsapp,
      created_at, reminder_count, subtotal_nad, delivery_fee_nad, discount_nad, vat_nad, vat_inclusive, deposit_nad, payment_method, proof_of_payment_url,
      merchant_id, tracking_token,
      merchants!inner(store_name, store_slug, is_demo)
    `)
    .eq("status", "pending")
    .neq("payment_method", "cod")
    // A practice order's "customer" is a number an agent typed to see what
    // happens. Chasing it sends a real "please pay" WhatsApp to whoever owns
    // that number, and then cancels an order nobody placed.
    .eq("merchants.is_demo", false)
    .gte("created_at", threeDaysAgo.toISOString())
    .order("created_at", { ascending: true });

  if (pendingOrders) {
    for (const order of pendingOrders) {
      const createdAt = new Date(order.created_at);
      const ageMs = now.getTime() - createdAt.getTime();
      const ageHours = ageMs / (1000 * 60 * 60);
      const reminderCount = order.reminder_count || 0;
      const merchant = order.merchants as unknown as { store_name: string; store_slug: string };

      // Paid already? Say nothing. A recorded payment or an uploaded slip
      // both mean the customer has done their part.
      if (settledOrderIds.has(order.id) || order.proof_of_payment_url) continue;

      // Due when this order is old enough for the next unsent reminder.
      const shouldRemind =
        reminderCount < REMINDER_TIERS.length &&
        ageHours >= REMINDER_TIERS[reminderCount];

      if (shouldRemind && order.customer_whatsapp) {
        const total = formatPrice(getOrderPayableTotal(order));

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
      id, order_number, customer_name, created_at, subtotal_nad, delivery_fee_nad, discount_nad, vat_nad, vat_inclusive, deposit_nad,
      merchant_id,
      merchants!inner(store_name, whatsapp_number, is_demo)
    `)
    .eq("status", "pending")
    .eq("merchants.is_demo", false)
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
        formatPrice(getOrderPayableTotal(order)),
      ],
    });
    if (result.ok && !result.skipped) merchantOrderAlertsSent++;
  }

  // ---- 1c. Alert merchants about low stock ----

  const { data: lowStockProducts } = await supabase
    .from("products")
    .select("id, merchant_id, name, stock_quantity, merchants!inner(store_name, whatsapp_number, is_demo)")
    .eq("merchants.is_demo", false)
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

  } // end messaging sections (whatsappOn)

  // ---- 2. Auto-cancel expired unpaid orders (3 days + 1 hour) ----
  // Always runs, even with WhatsApp disabled — stock must be released and
  // stale orders closed regardless of whether we can notify anyone.

  const expiredCutoff = new Date(
    now.getTime() - 49 * 60 * 60 * 1000
  );

  const { data: expiredOrders } = await supabase
    .from("orders")
    .select(`
      id, order_number, customer_name, customer_whatsapp,
      merchant_id, reminder_count, proof_of_payment_url,
      merchants!inner(store_name, is_demo)
    `)
    .eq("status", "pending")
    .neq("payment_method", "cod")
    // Practice orders never receive reminders, so the gate below would hold
    // them pending forever anyway — and a cancellation WhatsApp would reach a
    // number an agent invented. They are cleared by the purge instead.
    .eq("merchants.is_demo", false)
    .lte("created_at", expiredCutoff.toISOString())
    // Never close an order before every reminder has gone out. Tied to the
    // tier list so shortening the cadence cannot silently disable cancelling
    // and leave stock locked up forever.
    .gte("reminder_count", REMINDER_TIERS.length);

  if (expiredOrders) {
    for (const order of expiredOrders) {
      // Never cancel an order the customer has paid for or sent proof of.
      // The merchant may simply be slow to confirm; cancelling here would
      // restock goods that are already sold and refund nothing.
      if (settledOrderIds.has(order.id) || order.proof_of_payment_url) continue;

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

  // ---- 3. Abandoned-checkout recovery ----
  // One reminder per abandoned checkout, an hour after the buyer gave their
  // details and left without ordering. Eligibility (paid plan + merchant
  // toggle) was already checked at capture time, but it is re-checked here so
  // a downgrade or a switched-off toggle stops queued reminders too.
  let cartRemindersSent = 0;
  if (whatsappOn) {
    const abandonedCutoff = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

    const { data: abandoned } = await supabase
      .from("abandoned_checkouts")
      .select(
        "id, merchant_id, customer_name, customer_whatsapp, cart_item_count, cart_total_nad, merchants!inner(store_name, store_slug, cart_recovery_enabled, is_demo, subscriptions(tier, status))"
      )
      .eq("merchants.is_demo", false)
      .is("reminder_sent_at", null)
      .is("recovered_at", null)
      .lte("created_at", abandonedCutoff)
      .limit(100);

    for (const row of abandoned ?? []) {
      const merchant = row.merchants as unknown as {
        store_name: string;
        store_slug: string;
        cart_recovery_enabled: boolean;
        subscriptions: { tier: string; status: string } | { tier: string; status: string }[];
      };
      const sub = Array.isArray(merchant.subscriptions)
        ? merchant.subscriptions[0]
        : merchant.subscriptions;

      const stillEligible =
        merchant.cart_recovery_enabled !== false &&
        (sub?.status === "active" || sub?.status === "trial") &&
        hasCartRecovery(sub?.tier);

      // Stamp either way so an ineligible row is not re-examined every 15 min.
      if (stillEligible) {
        const firstName = (row.customer_name || "there").split(" ")[0];
        const result = await sendWhatsAppEvent({
          supabase,
          merchantId: row.merchant_id,
          eventKey: `abandoned_cart_reminder:${row.id}`,
          templateName: "abandoned_cart_reminder",
          recipientPhone: row.customer_whatsapp,
          variables: [
            firstName,
            String(row.cart_item_count),
            formatPrice(row.cart_total_nad),
            merchant.store_name,
          ],
          buttonParams: [merchant.store_slug],
        });
        if (result.ok && !result.skipped) cartRemindersSent++;
      }

      await supabase
        .from("abandoned_checkouts")
        .update({ reminder_sent_at: now.toISOString() })
        .eq("id", row.id);
    }
  }

  // ---- 4. Purge stale abandoned checkouts ----
  // These rows hold a name + phone for someone who never bought, so they are
  // deleted after 30 days regardless of outcome.
  const purgeCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  await supabase.from("abandoned_checkouts").delete().lt("created_at", purgeCutoff);

  // ---- 5. Clear out old practice orders -------------------------------------
  // Practice stores exist to be clicked through, so they fill up with orders
  // nobody placed. Nothing ever removed them: the shared demo store had
  // accumulated months of them, skewing its own analytics and — for hires —
  // holding rental dates against availability forever. Thirty days is long
  // enough to show a prospect what an order looks like.
  const practiceCutoff = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const { data: practiceStores } = await supabase
    .from("merchants")
    .select("id")
    .eq("is_demo", true);
  let practiceOrdersPurged = 0;
  if (practiceStores?.length) {
    const { data: purged } = await supabase
      .from("orders")
      .delete()
      .in("merchant_id", practiceStores.map((m) => m.id))
      .lt("created_at", practiceCutoff)
      .select("id");
    practiceOrdersPurged = purged?.length ?? 0;
  }

  return NextResponse.json({
    ok: true,
    remindersSent,
    merchantOrderAlertsSent,
    lowStockAlertsSent,
    ordersCancelled,
    cartRemindersSent,
    practiceOrdersPurged,
    timestamp: now.toISOString(),
  });
}
