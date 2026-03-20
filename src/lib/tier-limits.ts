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
  oshi_start: { products: 10,  orders_per_month: 20,  inventory: false, coupons: false, branding: true,  price_nad: 0 },
  oshi_basic: { products: 30,  orders_per_month: 200, inventory: false, coupons: false, branding: false, price_nad: 9900 },
  oshi_grow:  { products: 200, orders_per_month: 500, inventory: true,  coupons: true,  branding: false, price_nad: 29900 },
  oshi_pro:   { products: -1,  orders_per_month: -1,  inventory: true,  coupons: true,  branding: false, price_nad: 49900 },
};

export const TIER_LABELS: Record<SubscriptionTier, string> = {
  oshi_start: "Oshi-Start",
  oshi_basic: "Oshi-Basic",
  oshi_grow: "Oshi-Grow",
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
