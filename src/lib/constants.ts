export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

export const SITE_NAME = "OshiCart";
export const SITE_DESCRIPTION =
  "Create your WhatsApp store in 5 minutes. Free for Namibian businesses.";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const NAD_CURRENCY = "NAD";

export const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB upload limit (sharp compresses before storage)
export const TARGET_IMAGE_SIZE = 300 * 1024; // 300KB after compression
export const MAX_IMAGE_WIDTH = 1200; // px

export const BANKS_NAMIBIA = [
  "FNB Namibia",
  "Bank Windhoek",
  "Standard Bank Namibia",
  "Nedbank Namibia",
  "Letshego",
  "Other",
] as const;

/** Known branch codes for Namibian banks — auto-populate on bank selection */
export const BANK_BRANCH_CODES: Record<string, string> = {
  "FNB Namibia": "282-672",
  "Bank Windhoek": "483-872",
  "Standard Bank Namibia": "082-672",
  "Nedbank Namibia": "461-089",
  "Letshego": "",
  "Other": "",
};

export const PAYMENT_METHODS = [
  { value: "eft", label: "Bank Transfer (EFT)", icon: "🏦" },
  { value: "cod", label: "Cash on Delivery", icon: "💵" },
  { value: "momo", label: "MTC Maris", icon: "📱" },
  { value: "ewallet", label: "eWallet", icon: "📲" },
  { value: "pay2cell", label: "FNB Pay2Cell", icon: "💳" },
  { value: "paytoday", label: "PayToday", icon: "⚡" },
] as const;

// Bank send-to-cellphone wallets + popular cross-bank apps. Each Namibian bank
// has its own wallet: FNB eWallet, Standard Bank BlueWallet, Bank Windhoek
// EasyWallet, Nedbank Money (MobiMoney).
export const EWALLET_PROVIDERS = [
  { value: "fnb_ewallet", label: "FNB eWallet" },
  { value: "bluewallet", label: "BlueWallet (Standard Bank)" },
  { value: "easywallet", label: "EasyWallet (Bank Windhoek)" },
  { value: "nedbank_money", label: "Nedbank Money (MobiMoney)" },
  { value: "paypulse", label: "PayPulse (Standard Bank)" },
] as const;

// Industry options shown at store setup. `group` drives the optgroup rendering
// in the setup dropdown; `value` is stored on merchants.industry (free text, no
// DB enum) and mapped to a storefront archetype in lib/industry.ts.
// Display order follows GROUP order, then list order within each group.
export const INDUSTRY_GROUP_ORDER = [
  "Food & Drink",
  "Groceries & Fresh",
  "Fashion & Apparel",
  "Beauty & Health",
  "Electronics & Tech",
  "Home, Hardware & Auto",
  "General Retail & Gifts",
  "Services",
  "Other",
] as const;

export const INDUSTRIES_NAMIBIA = [
  // Food & Drink
  { value: "restaurant", label: "Restaurant & Dining", group: "Food & Drink" },
  { value: "takeaway", label: "Takeaway & Fast Food", group: "Food & Drink" },
  { value: "street_food", label: "Kapana & Street Food", group: "Food & Drink" },
  { value: "cafe", label: "Coffee Shop & Cafe", group: "Food & Drink" },
  { value: "bakery", label: "Bakery & Confectionery", group: "Food & Drink" },
  { value: "catering", label: "Catering & Events", group: "Food & Drink" },
  // Groceries & Fresh
  { value: "grocery", label: "Grocery & Supermarket", group: "Groceries & Fresh" },
  { value: "butchery", label: "Butchery & Meat", group: "Groceries & Fresh" },
  { value: "liquor", label: "Liquor & Beverages", group: "Groceries & Fresh" },
  { value: "agriculture", label: "Agriculture & Farming", group: "Groceries & Fresh" },
  { value: "gas_water", label: "Gas & Water", group: "Groceries & Fresh" },
  // Fashion & Apparel
  { value: "fashion", label: "Fashion & Clothing", group: "Fashion & Apparel" },
  { value: "second_hand", label: "Second-hand & Thrift", group: "Fashion & Apparel" },
  // Beauty & Health
  { value: "salon", label: "Salon & Beauty", group: "Beauty & Health" },
  { value: "cosmetics", label: "Cosmetics & Skincare", group: "Beauty & Health" },
  { value: "pharmacy", label: "Pharmacy & Health", group: "Beauty & Health" },
  // Electronics & Tech
  { value: "electronics", label: "Electronics & Phones", group: "Electronics & Tech" },
  { value: "airtime", label: "Airtime, Data & Tokens", group: "Electronics & Tech" },
  // Home, Hardware & Auto
  { value: "hardware", label: "Hardware & Building", group: "Home, Hardware & Auto" },
  { value: "furniture", label: "Furniture & Home", group: "Home, Hardware & Auto" },
  { value: "auto_parts", label: "Auto Parts & Accessories", group: "Home, Hardware & Auto" },
  // General Retail & Gifts
  { value: "stationery", label: "Stationery & Office", group: "General Retail & Gifts" },
  { value: "sports", label: "Sports & Outdoor", group: "General Retail & Gifts" },
  { value: "toys", label: "Toys & Kids", group: "General Retail & Gifts" },
  { value: "crafts", label: "Arts, Crafts & Curios", group: "General Retail & Gifts" },
  { value: "pet", label: "Pet Supplies", group: "General Retail & Gifts" },
  { value: "flowers", label: "Florist & Gifts", group: "General Retail & Gifts" },
  { value: "general_dealer", label: "General Dealer & Wholesale", group: "General Retail & Gifts" },
  // Services
  { value: "cleaning", label: "Cleaning & Laundry", group: "Services" },
  { value: "printing", label: "Printing & Signage", group: "Services" },
  { value: "repairs", label: "Repairs (Phone, Auto, Appliance)", group: "Services" },
  { value: "services", label: "Other Services", group: "Services" },
  // Other
  { value: "other", label: "Other", group: "Other" },
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

export function getPaymentMethodLabel(value: string | null | undefined): string {
  return PAYMENT_METHODS.find((m) => m.value === value)?.label ?? "Payment";
}

export function getEwalletProviderLabel(value: string | null | undefined): string {
  return EWALLET_PROVIDERS.find((p) => p.value === value)?.label ?? "eWallet";
}
