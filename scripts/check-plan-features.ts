/**
 * What the pricing pages claim must match what the code enforces.
 *
 * Oshi-Automate advertised "Inventory tracking" and "Coupon & discount codes"
 * as its differentiators while TIER_LIMITS granted both on every tier,
 * including free — merchants were being asked to pay N$399 for things they
 * already had. Meanwhile statements were genuinely gated to Automate and Pro
 * and advertised nowhere at all.
 *
 * This checks both directions: nothing sold as exclusive may be ungated, and
 * nothing gated may be sold as universal.
 *
 *   npx tsx scripts/check-plan-features.ts
 */
import { PUBLIC_PLANS, ADVERTISED_GATES } from "../src/lib/plans";
import {
  TIER_LIMITS,
  hasCartRecovery,
  hasStatements,
  hasAnnualStatement,
  hasPriorityPlacement,
  showBranding,
  hasTierFeature,
  type SubscriptionTier,
} from "../src/lib/tier-limits";

const ALL_TIERS: SubscriptionTier[] = ["oshi_start", "oshi_basic", "oshi_grow", "oshi_pro"];
const RANK: Record<SubscriptionTier, number> = {
  oshi_start: 0,
  oshi_basic: 1,
  oshi_grow: 2,
  oshi_pro: 3,
};

/** How to ask the code whether a tier really has each advertised feature. */
const GATE_CHECKS: Record<string, (tier: SubscriptionTier) => boolean> = {
  "Abandoned-checkout WhatsApp recovery": hasCartRecovery,
  "Monthly statements with VAT totals": hasStatements,
  // The received/outstanding view lives on the statements page.
  "Bank reconciliation — what came in, what is still owed": hasStatements,
  "Twelve-month statement in one document for year-end": hasAnnualStatement,
  // Branding is inverted: paying removes the badge.
  "No OshiCart branding on your store": (tier) => !showBranding(tier),
  "Priority placement in Browse Stores": hasPriorityPlacement,
};

let failures = 0;

function fail(message: string) {
  failures++;
  console.log(`FAIL ${message}`);
}

function ok(message: string) {
  console.log(`ok   ${message}`);
}

// --- Anything sold as exclusive must actually be gated ------------------

for (const { feature, lowestTier } of ADVERTISED_GATES) {
  const check = GATE_CHECKS[feature];
  if (!check) {
    fail(`"${feature}" is advertised as gated but has no code check`);
    continue;
  }

  const wronglyIncluded = ALL_TIERS.filter(
    (tier) => RANK[tier] < RANK[lowestTier] && check(tier)
  );
  const wronglyDenied = ALL_TIERS.filter(
    (tier) => RANK[tier] >= RANK[lowestTier] && !check(tier)
  );

  if (wronglyIncluded.length) {
    fail(`"${feature}" is sold from ${lowestTier} but ${wronglyIncluded.join(", ")} already has it`);
  } else if (wronglyDenied.length) {
    fail(`"${feature}" is sold from ${lowestTier} but ${wronglyDenied.join(", ")} is denied it`);
  } else {
    ok(`"${feature}" is gated exactly as advertised (from ${lowestTier})`);
  }
}

// --- Anything sold as universal must be ungated -------------------------

const universalClaims: { claim: string; check: (t: SubscriptionTier) => boolean }[] = [
  { claim: "Inventory tracking", check: (t) => hasTierFeature(t, "inventory") },
  { claim: "Coupons and discount codes", check: (t) => hasTierFeature(t, "coupons") },
];

// Higher plans say "Everything in <lower plan>" rather than repeating the
// list, so the claim only has to appear on the entry-level plan. Checking
// every plan made this skip silently, which is worse than not checking.
const entryPlan = PUBLIC_PLANS[0];

for (const { claim, check } of universalClaims) {
  if (!entryPlan.features.includes(claim)) {
    fail(`"${claim}" is ungated in code but not listed on ${entryPlan.name}`);
    continue;
  }
  const denied = ALL_TIERS.filter((tier) => !check(tier));
  if (denied.length) {
    fail(`"${claim}" is sold on ${entryPlan.name} but ${denied.join(", ")} cannot use it`);
  } else {
    ok(`"${claim}" is listed on ${entryPlan.name} and genuinely available on every tier`);
  }
}

// --- The gated features must be sold somewhere --------------------------

const allFeatureText = PUBLIC_PLANS.flatMap((p) => p.features).join(" | ");
for (const { feature } of ADVERTISED_GATES) {
  if (allFeatureText.includes(feature)) ok(`"${feature}" appears on a plan`);
  else fail(`"${feature}" is gated in code but sold on no plan`);
}

// --- Prices and limits come from TIER_LIMITS ----------------------------

for (const plan of PUBLIC_PLANS) {
  const cents = TIER_LIMITS[plan.tier].price_nad;
  const expected = cents === 0 ? "Free" : `N$${(cents / 100).toLocaleString()}`;
  if (plan.priceDisplay === expected) ok(`${plan.name} price matches TIER_LIMITS (${expected})`);
  else fail(`${plan.name} shows ${plan.priceDisplay}, TIER_LIMITS says ${expected}`);
}

// A paid plan that lists nothing beyond the tier below it has no reason to exist.
for (const plan of PUBLIC_PLANS) {
  if (plan.features.length < 3) {
    fail(`${plan.name} lists only ${plan.features.length} features`);
  }
}
ok("every plan lists at least three features");

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
