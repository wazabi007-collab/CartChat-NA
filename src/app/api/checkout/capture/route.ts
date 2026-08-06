import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { normalizeNamibianPhone } from "@/lib/utils";
import { hasCartRecovery } from "@/lib/tier-limits";

/**
 * POST /api/checkout/capture — remember a checkout in progress so it can be
 * recovered if the buyer never places the order.
 *
 * Called from the checkout form once the buyer has entered a name, a valid
 * WhatsApp number and has items in the cart. Anonymous by necessity (buyers
 * never sign in), so abuse is bounded structurally rather than by auth:
 *
 *  - the merchant must exist, be active, be on an eligible plan and have the
 *    toggle on — ineligible stores never create rows at all;
 *  - UNIQUE (merchant_id, customer_whatsapp) means repeat posts upsert instead
 *    of queueing more messages, and the cron sends at most ONE reminder per row;
 *  - a per-merchant daily cap limits how many distinct numbers can be enrolled.
 *
 * Never returns store or buyer data — only { ok }.
 */

/** Max NEW abandoned-checkout rows a single store can accrue per day. */
const DAILY_CAPTURE_CAP = 50;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const merchantId = typeof body?.merchant_id === "string" ? body.merchant_id : "";
  const rawName = typeof body?.customer_name === "string" ? body.customer_name.trim() : "";
  const rawPhone = typeof body?.customer_whatsapp === "string" ? body.customer_whatsapp : "";
  const itemCount = Number(body?.cart_item_count);
  const totalNad = Number(body?.cart_total_nad);

  // Quiet 200s: this is fire-and-forget from the checkout form and must never
  // surface an error to a buyer mid-purchase.
  const ok = () => NextResponse.json({ ok: true });

  if (!merchantId || !rawName || !rawPhone) return ok();
  if (!Number.isFinite(itemCount) || itemCount < 1) return ok();
  if (!Number.isFinite(totalNad) || totalNad < 1) return ok();

  const phone = normalizeNamibianPhone(rawPhone);
  // Namibian E.164: +264 followed by 8-9 digits.
  if (!/^\+264\d{8,9}$/.test(phone)) return ok();

  const supabase = createServiceClient();

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, cart_recovery_enabled, is_active, store_status, subscriptions(tier, status)")
    .eq("id", merchantId)
    .eq("is_active", true)
    .eq("store_status", "active")
    .maybeSingle();

  if (!merchant || merchant.cart_recovery_enabled === false) return ok();

  const sub = Array.isArray(merchant.subscriptions)
    ? merchant.subscriptions[0]
    : merchant.subscriptions;
  // Oshi-Automate / Oshi-Pro feature. Trials count too — a merchant evaluating
  // a premium plan should see the automation they are being sold.
  const liveSub = sub && (sub.status === "active" || sub.status === "trial");
  if (!liveSub || !hasCartRecovery(sub.tier)) return ok();

  // Cap new enrolments per store per day.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("abandoned_checkouts")
    .select("id", { count: "exact", head: true })
    .eq("merchant_id", merchantId)
    .gte("created_at", since);
  if ((count ?? 0) >= DAILY_CAPTURE_CAP) return ok();

  await supabase
    .from("abandoned_checkouts")
    .upsert(
      {
        merchant_id: merchantId,
        customer_name: rawName.slice(0, 120),
        customer_whatsapp: phone,
        cart_item_count: Math.round(itemCount),
        cart_total_nad: Math.round(totalNad),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "merchant_id,customer_whatsapp" }
    );

  return ok();
}
