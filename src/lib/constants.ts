export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

export const SITE_NAME = "OshiCart";
export const SITE_DESCRIPTION =
  "Create your WhatsApp store in 5 minutes. Free for Namibian businesses.";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const NAD_CURRENCY = "NAD";

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB upload limit
export const TARGET_IMAGE_SIZE = 100 * 1024; // 100KB after compression
export const MAX_IMAGE_WIDTH = 800; // px

export const BANKS_NAMIBIA = [
  "FNB Namibia",
  "Bank Windhoek",
  "Standard Bank Namibia",
  "Nedbank Namibia",
  "Letshego",
  "Other",
] as const;

export const PAYMENT_METHODS = [
  { value: "eft", label: "Bank Transfer (EFT)", icon: "🏦" },
  { value: "cod", label: "Cash on Delivery", icon: "💵" },
  { value: "momo", label: "MTC MoMo / Maris", icon: "📱" },
  { value: "ewallet", label: "eWallet", icon: "📲" },
] as const;

export const EWALLET_PROVIDERS = [
  { value: "fnb_ewallet", label: "FNB eWallet" },
  { value: "paypulse", label: "PayPulse (Standard Bank)" },
  { value: "easywallet", label: "EasyWallet (Bank Windhoek)" },
  { value: "paytoday", label: "PayToday (Nedbank)" },
] as const;

export const INDUSTRIES_NAMIBIA = [
  { value: "grocery", label: "Grocery & Supermarket" },
  { value: "butchery", label: "Butchery & Meat" },
  { value: "bakery", label: "Bakery & Confectionery" },
  { value: "restaurant", label: "Restaurant & Dining" },
  { value: "takeaway", label: "Takeaway & Fast Food" },
  { value: "cafe", label: "Coffee Shop & Cafe" },
  { value: "liquor", label: "Liquor & Beverages" },
  { value: "pharmacy", label: "Pharmacy & Health" },
  { value: "fashion", label: "Fashion & Clothing" },
  { value: "salon", label: "Salon & Beauty" },
  { value: "cosmetics", label: "Cosmetics & Skincare" },
  { value: "electronics", label: "Electronics & Phones" },
  { value: "hardware", label: "Hardware & Building" },
  { value: "auto_parts", label: "Auto Parts & Accessories" },
  { value: "agriculture", label: "Agriculture & Farming" },
  { value: "crafts", label: "Arts, Crafts & Curios" },
  { value: "furniture", label: "Furniture & Home" },
  { value: "stationery", label: "Stationery & Office" },
  { value: "pet", label: "Pet Supplies" },
  { value: "sports", label: "Sports & Outdoor" },
  { value: "toys", label: "Toys & Kids" },
  { value: "catering", label: "Catering & Events" },
  { value: "cleaning", label: "Cleaning & Laundry" },
  { value: "printing", label: "Printing & Signage" },
  { value: "gas_water", label: "Gas & Water" },
  { value: "flowers", label: "Florist & Gifts" },
  { value: "general_dealer", label: "General Dealer & Wholesale" },
  { value: "services", label: "Services & Repairs" },
  { value: "other", label: "Other" },
] as const;

export const REPORT_REASONS = [
  { value: "scam", label: "Suspected scam or fraud" },
  { value: "fake_products", label: "Fake or counterfeit products" },
  { value: "no_delivery", label: "Paid but never received order" },
  { value: "misleading", label: "Misleading product descriptions" },
  { value: "inappropriate", label: "Inappropriate or prohibited items" },
  { value: "other", label: "Other" },
] as const;

export const STORE_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending Review", color: "bg-yellow-100 text-yellow-800" },
  active: { label: "Active", color: "bg-green-100 text-green-800" },
  suspended: { label: "Suspended", color: "bg-red-100 text-red-800" },
  banned: { label: "Banned", color: "bg-gray-100 text-gray-800" },
};

// Re-export from tier-limits for convenience (single source of truth is tier-limits.ts)
export { STATUS_LABELS as SUBSCRIPTION_STATUS_LABELS } from "@/lib/tier-limits";
