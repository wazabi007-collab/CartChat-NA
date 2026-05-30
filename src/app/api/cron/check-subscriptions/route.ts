import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { daysUntil, formatDateForWhatsApp, sendWhatsAppEvent } from "@/lib/whatsapp-events";
import { TIER_LABELS, type SubscriptionTier } from "@/lib/tier-limits";

type MerchantRow = {
  id: string;
  store_name: string;
  whatsapp_number: string | null;
};

type SubscriptionRow = {
  id: string;
  merchant_id: string;
  tier: SubscriptionTier;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  grace_ends_at: string | null;
  soft_suspended_at: string | null;
  merchants: MerchantRow;
};

const REMINDER_DAYS = new Set([7, 3, 1]);

export async function GET(request: NextRequest) {
  // Reject if CRON_SECRET is not properly configured
  if (!process.env.CRON_SECRET || process.env.CRON_SECRET.length < 16) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  // Verify cron secret with timing-safe comparison
  const authHeader = request.headers.get("authorization") || "";
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  const isValid = authHeader.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
  if (!isValid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const now = new Date();
  const sevenDaysAhead = new Date(now.getTime() + 7 * 86400000).toISOString();

  const { data: endingSoon } = await supabase
    .from("subscriptions")
    .select("id, merchant_id, tier, status, trial_ends_at, current_period_end, grace_ends_at, soft_suspended_at, merchants!inner(id, store_name, whatsapp_number)")
    .in("status", ["trial", "active"])
    .or(`trial_ends_at.lte.${sevenDaysAhead},current_period_end.lte.${sevenDaysAhead}`);

  for (const sub of ((endingSoon || []) as unknown as SubscriptionRow[])) {
    const merchant = sub.merchants;
    const endDate = sub.status === "trial" ? sub.trial_ends_at : sub.current_period_end;
    if (!endDate) continue;

    const days = daysUntil(endDate);
    if (!REMINDER_DAYS.has(days)) continue;

    if (sub.status === "trial") {
      await sendWhatsAppEvent({
        supabase,
        merchantId: sub.merchant_id,
        eventKey: `trial_ending_soon:${sub.merchant_id}:${days}`,
        templateName: "trial_ending_soon",
        recipientPhone: merchant.whatsapp_number,
        variables: [
          merchant.store_name,
          String(days),
          formatDateForWhatsApp(endDate),
        ],
      });
    } else {
      await sendWhatsAppEvent({
        supabase,
        merchantId: sub.merchant_id,
        eventKey: `subscription_expiring_soon:${sub.merchant_id}:${days}`,
        templateName: "subscription_expiring_soon",
        recipientPhone: merchant.whatsapp_number,
        variables: [
          merchant.store_name,
          TIER_LABELS[sub.tier] || sub.tier,
          String(days),
        ],
      });
    }
  }

  const { error } = await supabase.rpc("check_expired_subscriptions");

  if (error) {
    console.error("Cron error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: statusChanged } = await supabase
    .from("subscriptions")
    .select("id, merchant_id, tier, status, trial_ends_at, current_period_end, grace_ends_at, soft_suspended_at, merchants!inner(id, store_name, whatsapp_number)")
    .in("status", ["grace", "soft_suspended", "hard_suspended"]);

  for (const sub of ((statusChanged || []) as unknown as SubscriptionRow[])) {
    const merchant = sub.merchants;

    if (sub.status === "grace" && sub.grace_ends_at) {
      await sendWhatsAppEvent({
        supabase,
        merchantId: sub.merchant_id,
        eventKey: `subscription_grace_started:${sub.merchant_id}:${sub.grace_ends_at.slice(0, 10)}`,
        templateName: "subscription_grace_started",
        recipientPhone: merchant.whatsapp_number,
        variables: [
          merchant.store_name,
          TIER_LABELS[sub.tier] || sub.tier,
          formatDateForWhatsApp(sub.grace_ends_at),
        ],
      });
    }

    if (sub.status === "soft_suspended" || sub.status === "hard_suspended") {
      await sendWhatsAppEvent({
        supabase,
        merchantId: sub.merchant_id,
        eventKey: `subscription_suspended:${sub.merchant_id}:${sub.status}`,
        templateName: "subscription_suspended",
        recipientPhone: merchant.whatsapp_number,
        variables: [
          merchant.store_name,
          TIER_LABELS[sub.tier] || sub.tier,
        ],
      });
    }
  }

  return NextResponse.json({
    success: true,
    remindersChecked: endingSoon?.length || 0,
    lifecycleChecked: statusChanged?.length || 0,
    timestamp: new Date().toISOString(),
  });
}
