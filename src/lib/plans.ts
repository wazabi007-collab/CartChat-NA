import { TIER_LIMITS, TIER_LABELS, type SubscriptionTier } from "@/lib/tier-limits";

export type PlanIconKey = "store" | "automate" | "pro";

export interface PublicPlan {
  tier: SubscriptionTier;
  name: string;
  priceDisplay: string; // e.g. "N$149" — derived from TIER_LIMITS
  period: string;       // "/month"
  audience: string;
  cta: string;
  href: string;
  highlighted: boolean;
  iconKey: PlanIconKey;
  features: string[];   // count lines (derived) + marketing copy
}

function priceDisplay(tier: SubscriptionTier): string {
  const cents = TIER_LIMITS[tier].price_nad;
  return cents === 0 ? "Free" : `N$${(cents / 100).toLocaleString()}`;
}

function countLines(tier: SubscriptionTier): string[] {
  const { products, orders_per_month } = TIER_LIMITS[tier];
  return [
    products === -1 ? "Unlimited products" : `${products} products`,
    orders_per_month === -1
      ? "Unlimited orders/month"
      : `${orders_per_month.toLocaleString()} orders/month`,
  ];
}

/**
 * Everything every plan includes, free tier included.
 *
 * Kept explicit because the pricing page previously advertised inventory
 * tracking and coupons as Oshi-Automate features when TIER_LIMITS grants both
 * on every tier — a differentiator that did not differentiate. Anything listed
 * here must be genuinely ungated; anything genuinely gated belongs in the plan
 * that gates it, and scripts/check-plan-features.ts enforces that both ways.
 */
const INCLUDED_EVERYWHERE = [
  "Your own store link and QR code",
  "Automated WhatsApp order updates",
  "Local payments — EFT, cash, MTC Maris, eWallet, Pay2Cell, PayToday",
  "Proof-of-payment upload",
  "Products, services and appointment bookings",
  "Inventory tracking",
  "Coupons and discount codes",
  "Customer list and order history",
  "Verified-purchase reviews and ratings",
  "WhatsApp broadcast to your customers",
  "Bulk product import from a spreadsheet",
  "Record payments received against orders",
  "One-tap reorder for repeat customers",
  "Yango and inDrive courier booking",
  "Live order tracking link for customers",
  "Listed in Browse Stores for your town",
  "Tax invoices with VAT",
  "Sales analytics",
  "Install OshiCart as an app on your phone",
];

/**
 * Single source of truth for the public, sellable plans (the free Oshi-Start
 * tier is not sold here). Prices and product/order counts are derived from
 * TIER_LIMITS so a price change happens in exactly one place. Consumed by the
 * homepage pricing section, /pricing, the subscription checkout, and the
 * dashboard upgrade list.
 */
export const PUBLIC_PLANS: PublicPlan[] = [
  {
    tier: "oshi_basic",
    name: TIER_LABELS.oshi_basic,
    priceDisplay: priceDisplay("oshi_basic"),
    period: "/month",
    audience: "For vendors, home businesses, and small shops",
    cta: "Start Storefront",
    href: "/signup?tier=oshi_basic",
    highlighted: false,
    iconKey: "store",
    features: [
      ...countLines("oshi_basic"),
      ...INCLUDED_EVERYWHERE,
      // The one thing paying actually buys at this tier.
      "No OshiCart branding on your store",
    ],
  },
  {
    tier: "oshi_grow",
    name: TIER_LABELS.oshi_grow,
    priceDisplay: priceDisplay("oshi_grow"),
    period: "/month",
    audience: "For growing sellers who want lost sales back and books that balance",
    cta: "Start Automate",
    href: "/signup?tier=oshi_grow",
    highlighted: true,
    iconKey: "automate",
    features: [
      ...countLines("oshi_grow"),
      "Everything in Oshi-Storefront",
      // Both genuinely gated — see CART_RECOVERY_TIERS and STATEMENT_TIERS.
      "Abandoned-checkout WhatsApp recovery",
      "Monthly statements with VAT totals",
      "Bank reconciliation — what came in, what is still owed",
      "Spreadsheet export for your bookkeeper",
    ],
  },
  {
    tier: "oshi_pro",
    name: TIER_LABELS.oshi_pro,
    priceDisplay: priceDisplay("oshi_pro"),
    period: "/month",
    audience: "For high-volume stores that have outgrown order limits",
    cta: "Start Pro",
    href: "/signup?tier=oshi_pro",
    highlighted: false,
    iconKey: "pro",
    features: [
      ...countLines("oshi_pro"),
      "Everything in Oshi-Automate",
      "No monthly order limit",
    ],
  },
];

/**
 * Features the pricing pages claim are exclusive to a plan, and the tier that
 * must therefore gate them in code. Checked by scripts/check-plan-features.ts.
 */
export const ADVERTISED_GATES: { feature: string; lowestTier: SubscriptionTier }[] = [
  { feature: "Abandoned-checkout WhatsApp recovery", lowestTier: "oshi_grow" },
  { feature: "Monthly statements with VAT totals", lowestTier: "oshi_grow" },
  { feature: "Bank reconciliation — what came in, what is still owed", lowestTier: "oshi_grow" },
  { feature: "No OshiCart branding on your store", lowestTier: "oshi_basic" },
];
