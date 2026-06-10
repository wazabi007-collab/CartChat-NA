import type { SupabaseClient } from "@supabase/supabase-js";
import { TIER_LIMITS, type SubscriptionTier } from "@/lib/tier-limits";

/**
 * Returns true when the merchant has reached their tier's monthly order limit.
 *
 * Mirrors the checkout gate in src/app/checkout/[slug]/page.tsx (lines ~80-95)
 * so the storefront and checkout can't drift apart. If the logic changes here,
 * update the checkout page too (or migrate it to use this helper).
 */
export async function isOrderLimitReached(
  supabase: SupabaseClient,
  merchantId: string,
  tier: SubscriptionTier
): Promise<boolean> {
  const orderLimit = TIER_LIMITS[tier].orders_per_month;
  if (orderLimit === -1) return false;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("merchant_id", merchantId)
    .gte("created_at", startOfMonth.toISOString());

  return (count || 0) >= orderLimit;
}
