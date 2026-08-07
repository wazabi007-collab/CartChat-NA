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
 * Single source of truth for the public, sellable plans (excludes the free
 * trial). Prices and product/order counts are derived from TIER_LIMITS so a
 * price change happens in exactly one place. Consumed by the homepage pricing
 * section, the /pricing page, and the subscription checkout.
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
      "OshiCart store link",
      "Local payments (EFT, COD, MTC Maris, eWallet)",
      "Proof-of-payment upload",
      "Automated WhatsApp order updates",
      "Customer list & order history",
      "Verified-purchase reviews & ratings",
      "WhatsApp broadcast to your customers",
      "Bulk product import (CSV)",
      "Sales analytics",
      "No OshiCart branding",
    ],
  },
  {
    tier: "oshi_grow",
    name: TIER_LABELS.oshi_grow,
    priceDisplay: priceDisplay("oshi_grow"),
    period: "/month",
    audience: "For growing sellers who want to win back lost sales",
    cta: "Start Automate",
    href: "/signup?tier=oshi_grow",
    highlighted: true,
    iconKey: "automate",
    features: [
      ...countLines("oshi_grow"),
      "Everything in Storefront",
      "Abandoned-checkout WhatsApp recovery",
      "Inventory tracking",
      "Coupon & discount codes",
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
    ],
  },
];
