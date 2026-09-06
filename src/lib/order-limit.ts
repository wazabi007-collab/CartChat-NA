import type { SupabaseClient } from "@supabase/supabase-js";
import { TIER_LIMITS, type SubscriptionTier } from "@/lib/tier-limits";
import {
  namibianBillingPeriod,
  namibianMonthStartISO,
  type BillingPeriod,
} from "@/lib/date";

/**
 * Monthly order quota — the single implementation.
 *
 * The allowance runs from the merchant's BILLING DATE, not the calendar month.
 * A merchant who subscribes on the 25th gets a full month of orders before the
 * counter resets; under the old calendar-month rule they got six days.
 *
 * Three things this deliberately does NOT do:
 *
 *  - Count cancelled orders. The reminder cron auto-cancels unpaid orders after
 *    ~49 hours, so counting them meant a merchant could burn an entire month's
 *    allowance on abandoned checkouts they were never paid for, and have their
 *    store shut off with zero revenue. Observed in production: one store had a
 *    month where all 8 quota-consuming orders were cancelled.
 *
 *  - Use `new Date()` month boundaries. On Vercel that resolves to midnight UTC
 *    — 02:00 in Namibia — so orders placed in the first two hours of a cycle
 *    were charged to the previous one. See namibianBillingPeriod().
 *
 *  - Assume a billing date exists. Most merchants are on the free tier and have
 *    never paid, so current_period_start is null for them; see below.
 */

/**
 * The cycle a merchant's allowance runs on.
 *
 * Paid merchants anchor on current_period_start, which the billing endpoint
 * sets to the moment payment is recorded — so paying or upgrading starts a
 * fresh allowance immediately. Merchants who have never paid anchor on the day
 * they signed up, which gives free and trial stores a stable, explainable reset
 * day instead of no cycle at all.
 */
async function resolveBillingPeriod(
  supabase: SupabaseClient,
  merchantId: string
): Promise<BillingPeriod> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("current_period_start, created_at")
    .eq("merchant_id", merchantId)
    .maybeSingle();

  // No row is a real answer (most merchants never paid). A refused or timed-out
  // query is not — swallowing it silently moved the merchant onto a calendar
  // month, which can hand back an allowance they had already spent.
  if (error) {
    throw new Error(`Could not read the billing period: ${error.message}`);
  }

  const anchor = data?.current_period_start ?? data?.created_at ?? null;

  // No subscription row at all: anchor on the 1st, which reproduces the old
  // calendar-month behaviour rather than handing out a rolling allowance.
  return namibianBillingPeriod(new Date(anchor ?? namibianMonthStartISO()));
}

export interface OrderQuota {
  /** Orders placed in the current cycle, excluding cancelled ones. */
  count: number;
  /** Tier allowance; -1 means unlimited. */
  limit: number;
  reached: boolean;
  /** When the current allowance resets. */
  resetsAt: string;
}

async function countOrdersInPeriod(
  supabase: SupabaseClient,
  merchantId: string,
  period: BillingPeriod
): Promise<number> {
  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("merchant_id", merchantId)
    .neq("status", "cancelled")
    .gte("created_at", period.startISO)
    .lt("created_at", period.endISO);

  // A failed count returns null, and `count || 0` used to read that as a store
  // with a quiet month. Database insertion now also enforces the allowance
  // atomically; this read still needs to fail closed for truthful UI state.
  if (error) {
    throw new Error(`Could not count this cycle's orders: ${error.message}`);
  }

  return count ?? 0;
}

/** Full quota picture for a merchant, including when the allowance resets. */
export async function getOrderQuota(
  supabase: SupabaseClient,
  merchantId: string,
  tier: SubscriptionTier
): Promise<OrderQuota> {
  const limit = TIER_LIMITS[tier].orders_per_month;
  const period = await resolveBillingPeriod(supabase, merchantId);

  // Unlimited tiers never need the count, so skip the query entirely.
  if (limit === -1) {
    return { count: 0, limit, reached: false, resetsAt: period.endISO };
  }

  const count = await countOrdersInPeriod(supabase, merchantId, period);
  return { count, limit, reached: count >= limit, resetsAt: period.endISO };
}

/** Orders used in the merchant's current billing cycle. */
export async function getMonthlyOrderCount(
  supabase: SupabaseClient,
  merchantId: string
): Promise<number> {
  const period = await resolveBillingPeriod(supabase, merchantId);
  return countOrdersInPeriod(supabase, merchantId, period);
}

/** True when the merchant has used their whole allowance for this cycle. */
export async function isOrderLimitReached(
  supabase: SupabaseClient,
  merchantId: string,
  tier: SubscriptionTier
): Promise<boolean> {
  const { reached } = await getOrderQuota(supabase, merchantId, tier);
  return reached;
}
