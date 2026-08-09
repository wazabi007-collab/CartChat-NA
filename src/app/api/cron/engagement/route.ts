import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { isWhatsAppEnabled, sendWhatsAppTemplate } from "@/lib/whatsapp";
import { namibianDateString, formatNamibianDate } from "@/lib/date";

/**
 * Cron: the three engagement messages, daily at 09:00 Namibian time.
 *
 *  activation_day1/3 — merchant signed up but the store still has no
 *                      products, so it is invisible in Browse Stores. This is
 *                      the funnel's biggest measured leak: most stores that
 *                      die, die here.
 *  win_back          — store was suspended after the trial and nobody ever
 *                      said anything. One message, ever.
 *  booking_reminder  — the customer's appointment is tomorrow. Double-booking
 *                      is prevented at order time; no-shows are prevented here.
 *
 * Dedup is claim-then-send through engagement_notifications' unique indexes:
 * the INSERT happens before the send, so a crashed run can at worst send
 * nothing — never twice. Template names live in Meta; until a template is
 * approved its sends fail, are recorded in the response, and their claims are
 * released so approval day delivers them — one quiet attempt per day.
 */
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || process.env.CRON_SECRET.length < 16) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const authHeader = req.headers.get("authorization") || "";
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (
    authHeader.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isWhatsAppEnabled()) {
    return NextResponse.json({ skipped: "WhatsApp disabled" });
  }

  const service = createServiceClient();
  const results = { activation: 0, winBack: 0, bookingReminders: 0, failures: [] as string[] };

  /** Claim a dedup slot; false means another run already sent this one. */
  async function claim(kind: string, merchantId: string | null, orderId: string | null) {
    const { error } = await service
      .from("engagement_notifications")
      .insert({ kind, merchant_id: merchantId, order_id: orderId });
    return !error;
  }

  /**
   * A failed send must release its claim, or the recipient is silently lost:
   * until Meta approves a template every send fails, and a consumed claim
   * would mean nobody ever gets the message once approval lands. Releasing
   * retries tomorrow — one attempt a day, and a failed send shows nobody
   * anything, so this cannot nag.
   */
  async function release(kind: string, merchantId: string | null, orderId: string | null) {
    let query = service.from("engagement_notifications").delete().eq("kind", kind);
    query = merchantId ? query.eq("merchant_id", merchantId) : query.eq("order_id", orderId as string);
    await query;
  }

  // --- Activation: live stores with zero products, 1 and 3 days in ---------
  const { data: merchants } = await service
    .from("merchants")
    .select("id, store_name, store_slug, whatsapp_number, created_at, is_active, store_status")
    .eq("is_active", true)
    .eq("store_status", "active")
    .gte("created_at", new Date(Date.now() - 5 * 86_400_000).toISOString());

  for (const m of merchants ?? []) {
    const { count } = await service
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("merchant_id", m.id)
      .is("deleted_at", null);
    if ((count ?? 0) > 0 || !m.whatsapp_number) continue;

    const ageDays = (Date.now() - new Date(m.created_at).getTime()) / 86_400_000;
    const kind = ageDays >= 3 ? "activation_day3" : ageDays >= 1 ? "activation_day1" : null;
    if (!kind) continue;

    if (await claim(kind, m.id, null)) {
      // Guide link is the template's fixed button, house style.
      const r = await sendWhatsAppTemplate(m.whatsapp_number, "store_activation_nudge", [
        m.store_name,
      ]);
      if (r.success) results.activation++;
      else {
        results.failures.push(`${kind} ${m.store_slug}: ${r.error}`);
        await release(kind, m.id, null);
      }
    }
  }

  // --- Win-back: suspended stores, one message ever -------------------------
  const { data: suspended } = await service
    .from("merchants")
    .select("id, store_name, store_slug, whatsapp_number, store_status")
    .in("store_status", ["soft_suspended", "hard_suspended"]);

  for (const m of suspended ?? []) {
    if (!m.whatsapp_number) continue;
    if (await claim("win_back", m.id, null)) {
      const r = await sendWhatsAppTemplate(m.whatsapp_number, "store_win_back", [
        m.store_name,
      ]);
      if (r.success) results.winBack++;
      else {
        results.failures.push(`win_back ${m.store_slug}: ${r.error}`);
        await release("win_back", m.id, null);
      }
    }
  }

  // --- Booking reminders: service appointments happening tomorrow ----------
  const tomorrow = namibianDateString(new Date(Date.now() + 86_400_000));
  const { data: bookings } = await service
    .from("orders")
    .select(
      "id, customer_name, customer_whatsapp, delivery_time, merchant_id, merchants!inner(store_name, store_slug), order_items!inner(products!inner(item_type))"
    )
    .eq("delivery_date", tomorrow)
    .neq("status", "cancelled")
    .eq("order_items.products.item_type", "service")
    .not("delivery_time", "is", null);

  for (const b of bookings ?? []) {
    if (!b.customer_whatsapp) continue;
    const store = b.merchants as unknown as { store_name: string; store_slug: string } | null;
    const storeName = store?.store_name ?? "the store";
    if (await claim("booking_reminder", null, b.id)) {
      // Button suffix = store slug: "let the store know" opens THEIR store.
      const r = await sendWhatsAppTemplate(
        b.customer_whatsapp,
        "booking_reminder",
        [
          b.customer_name,
          storeName,
          formatNamibianDate(`${tomorrow}T12:00:00+02:00`, { weekday: "long", day: "numeric", month: "long" }),
          b.delivery_time as string,
        ],
        [store?.store_slug ?? ""]
      );
      if (r.success) results.bookingReminders++;
      else {
        results.failures.push(`booking_reminder order ${b.id}: ${r.error}`);
        await release("booking_reminder", null, b.id);
      }
    }
  }

  return NextResponse.json(results);
}
