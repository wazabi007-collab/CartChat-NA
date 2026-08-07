import type { SupabaseClient } from "@supabase/supabase-js";
import { TIER_LIMITS, type SubscriptionTier } from "@/lib/tier-limits";
import { namibianMonthStartISO } from "@/lib/date";

/**
 * Monthly order quota — the single implementation.
 *
 * Quotas reset at the start of each CALENDAR month (Namibian time), not on the
 * merchant's billing anniversary. That is deliberate and simple to explain, but
 * it does mean a merchant who subscribes on the 25th gets a fresh allowance a
 * few days later.
 *
 * Two things this deliberately does NOT do:
 *
 *  - Count cancelled orders. The reminder cron auto-cancels unpaid orders after
 *    ~49 hours, so counting them meant a merchant could burn an entire month's
 *    allowance on abandoned checkouts they were never paid for, and have their
 *    store shut off with zero revenue. Observed in production: one store had a
 *    month where all 8 quota-consuming orders were cancelled.
 *
 *  - Use `new Date()` month boundaries. On Vercel that resolves to midnight UTC
 *    — 02:00 in Namibia — so orders placed in the first two hours of the 1st
 *    were charged to the previous month. See namibianMonthStartISO().
 */
export async function getMonthlyOrderCount(
  supabase: SupabaseClient,
  merchantId: string
): Promise<number> {
  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("merchant_id", merchantId)
    .neq("status", "cancelled")
    .gte("created_at", namibianMonthStartISO());

  return count || 0;
}

/** True when the merchant has reached their tier's monthly order limit. */
export async function isOrderLimitReached(
  supabase: SupabaseClient,
  merchantId: string,
  tier: SubscriptionTier
): Promise<boolean> {
  const orderLimit = TIER_LIMITS[tier].orders_per_month;
  if (orderLimit === -1) return false;

  const count = await getMonthlyOrderCount(supabase, merchantId);
  return count >= orderLimit;
}
