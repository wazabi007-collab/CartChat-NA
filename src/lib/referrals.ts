import { getReferralBounty } from "@/lib/constants";

/**
 * Shared shapes and money rules for the referral programme.
 *
 * The admin console (src/app/(admin)/admin/referrals) and the agent dashboard
 * must agree to the cent on what is owed, so the "a bounty exists once the
 * referred merchant is actually paying" rule lives here rather than being
 * written out twice.
 */

/** One row of get_my_referred_merchants() — the only merchant data an agent sees. */
export type ReferredMerchant = {
  merchant_id: string;
  store_name: string;
  store_live: boolean;
  joined_at: string;
  tier: string;
  sub_status: string;
};

/** One referral_payouts row, minus the admin-only columns the grants withhold. */
export type ReferralPayout = {
  merchant_id: string;
  commission_nad: number;
  paid_reference: string | null;
  paid_at: string;
};

/** How far a referred store has got. Each step includes the ones before it. */
export type ReferralMilestone = "signed_up" | "store_live" | "subscribed";

/** Where this store's bounty sits: nothing owed yet, owed, or already banked. */
export type CommissionState = "not_yet" | "pending" | "paid";

export type ReferralRow = {
  merchantId: string;
  storeName: string;
  joinedAt: string;
  tier: string;
  milestone: ReferralMilestone;
  commission: CommissionState;
  /** Cents. The bounty for this store: what was paid, or what is owed, or 0. */
  amountNad: number;
  paidReference: string | null;
  paidAt: string | null;
};

export type ReferralLedger = {
  rows: ReferralRow[];
  paidNad: number;
  pendingNad: number;
  earnedNad: number;
};

export const MILESTONE_LABELS: Record<ReferralMilestone, string> = {
  signed_up: "Signed up",
  store_live: "Store live",
  subscribed: "Subscribed",
};

/**
 * A bounty is owed only once the merchant is genuinely paying — 'trial' and
 * 'grace' are not money in the bank, and suspended stores have stopped paying.
 * Same test the admin payout screen applies before it offers "Mark paid".
 */
export function isPayingSubscription(subStatus: string): boolean {
  return subStatus === "active";
}

export function referralMilestone(m: ReferredMerchant): ReferralMilestone {
  if (isPayingSubscription(m.sub_status)) return "subscribed";
  if (m.store_live) return "store_live";
  return "signed_up";
}

/**
 * Fold the referred stores and the recorded payouts into one ledger.
 *
 * Payouts are matched by merchant_id (referral_payouts is UNIQUE on it — one
 * bounty per store, ever). A paid row reports the amount that was actually
 * paid, not today's tier price, so a later plan change never rewrites history.
 */
export function buildReferralLedger(
  merchants: ReferredMerchant[],
  payouts: ReferralPayout[]
): ReferralLedger {
  const paidByMerchant = new Map(payouts.map((p) => [p.merchant_id, p]));

  const rows: ReferralRow[] = merchants.map((m) => {
    const paid = paidByMerchant.get(m.merchant_id);
    const owed = isPayingSubscription(m.sub_status) ? getReferralBounty(m.tier) : 0;
    return {
      merchantId: m.merchant_id,
      storeName: m.store_name,
      joinedAt: m.joined_at,
      tier: m.tier,
      milestone: referralMilestone(m),
      commission: paid ? "paid" : owed > 0 ? "pending" : "not_yet",
      amountNad: paid ? paid.commission_nad : owed,
      paidReference: paid?.paid_reference ?? null,
      paidAt: paid?.paid_at ?? null,
    };
  });

  const paidNad = rows.reduce((s, r) => (r.commission === "paid" ? s + r.amountNad : s), 0);
  const pendingNad = rows.reduce((s, r) => (r.commission === "pending" ? s + r.amountNad : s), 0);

  return { rows, paidNad, pendingNad, earnedNad: paidNad + pendingNad };
}

/**
 * Bounties are whole rand and are quoted that way everywhere agents read them
 * ("N$75", not formatPrice's "N$75.00") — the cents would only ever be 00.
 */
export function formatBounty(cents: number): string {
  return `N$${Math.round(cents / 100).toLocaleString("en-GB")}`;
}
