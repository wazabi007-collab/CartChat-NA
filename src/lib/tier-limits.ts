export type SubscriptionTier = "oshi_start" | "oshi_basic" | "oshi_grow" | "oshi_pro";
export type SubscriptionStatus = "trial" | "active" | "grace" | "soft_suspended" | "hard_suspended";

export interface TierLimit {
  products: number;       // -1 = unlimited
  orders_per_month: number; // -1 = unlimited
  inventory: boolean;
  coupons: boolean;
  branding: boolean;      // true = OshiCart branding shown
  price_nad: number;      // monthly price in cents
}

// Static fallback — must match tier_limits DB table
export const TIER_LIMITS: Record<SubscriptionTier, TierLimit> = {
  oshi_start: { products: 20,  orders_per_month: 50,  inventory: true,  coupons: true,  branding: false, price_nad: 0 },
  // A paid tier must never be worse than the free tier: oshi_basic previously
  // removed inventory + coupons that oshi_start gets for free.
  oshi_basic: { products: 50,  orders_per_month: 300, inventory: true,  coupons: true,  branding: false, price_nad: 14900 },
  oshi_grow:  { products: 200, orders_per_month: 1000, inventory: true,  coupons: true,  branding: false, price_nad: 39900 },
  oshi_pro:   { products: -1,  orders_per_month: -1,  inventory: true,  coupons: true,  branding: false, price_nad: 79900 },
};

export const TIER_LABELS: Record<SubscriptionTier, string> = {
  oshi_start: "Oshi-Start",
  oshi_basic: "Oshi-Storefront",
  oshi_grow: "Oshi-Automate",
  oshi_pro: "Oshi-Pro",
};

export const TIER_COLORS: Record<SubscriptionTier, string> = {
  oshi_start: "bg-gray-100 text-gray-800",
  oshi_basic: "bg-blue-100 text-blue-800",
  oshi_grow: "bg-green-100 text-green-800",
  oshi_pro: "bg-purple-100 text-purple-800",
};

export const STATUS_LABELS: Record<SubscriptionStatus, { label: string; color: string }> = {
  trial: { label: "Trial", color: "bg-yellow-100 text-yellow-800" },
  active: { label: "Active", color: "bg-green-100 text-green-800" },
  grace: { label: "Grace Period", color: "bg-orange-100 text-orange-800" },
  soft_suspended: { label: "Suspended", color: "bg-red-100 text-red-800" },
  hard_suspended: { label: "Offline", color: "bg-gray-100 text-gray-800" },
};

export function canAddProduct(tier: SubscriptionTier, currentCount: number): boolean {
  const limit = TIER_LIMITS[tier].products;
  return limit === -1 || currentCount < limit;
}

export function hasTierFeature(tier: SubscriptionTier, feature: "inventory" | "coupons"): boolean {
  return TIER_LIMITS[tier][feature];
}

export function showBranding(tier: SubscriptionTier): boolean {
  return TIER_LIMITS[tier].branding;
}

/**
 * Automated abandoned-checkout recovery is an Oshi-Automate / Oshi-Pro feature —
 * it is the concrete automation those plans are sold on. Change this set to
 * widen or narrow eligibility.
 */
export const CART_RECOVERY_TIERS: SubscriptionTier[] = ["oshi_grow", "oshi_pro"];

export function hasCartRecovery(tier: SubscriptionTier | string | null | undefined): boolean {
  return !!tier && CART_RECOVERY_TIERS.includes(tier as SubscriptionTier);
}

export function formatTierPrice(tier: SubscriptionTier): string {
  const price = TIER_LIMITS[tier].price_nad;
  if (price === 0) return "Free";
  return `N$${(price / 100).toLocaleString()}/mo`;
}

export function isSubscriptionActive(status: SubscriptionStatus): boolean {
  return status === "trial" || status === "active" || status === "grace";
}

export function isReadOnly(status: SubscriptionStatus): boolean {
  return status === "soft_suspended" || status === "hard_suspended";
}
