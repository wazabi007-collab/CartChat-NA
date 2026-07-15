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

// `logo` points to a real brand image in public/payment-logos/ where one
// exists. EFT and Cash on Delivery are not brands, so they have no logo
// (rendered as a brand-coloured badge instead — see PaymentMethodVisual).
// eWallet is a generic category (neutral wallet badge); the merchant then
// picks a specific bank wallet from EWALLET_PROVIDERS, each with its own logo.
export const PAYMENT_METHODS = [
  { value: "eft", label: "Bank Transfer (EFT)", icon: "🏦", logo: null },
  { value: "cod", label: "Cash on Delivery", icon: "💵", logo: null },
  { value: "momo", label: "MTC Maris", icon: "📱", logo: "/payment-logos/mtc-maris.png" },
  { value: "ewallet", label: "eWallet", icon: "📲", logo: null },
  { value: "pay2cell", label: "FNB Pay2Cell", icon: "💳", logo: "/payment-logos/fnb-ewallet.png" },
  { value: "paytoday", label: "PayToday", icon: "⚡", logo: "/payment-logos/paytoday.png" },
] as const;

// Bank send-to-cellphone wallets + popular cross-bank apps. Each Namibian bank
// has its own wallet: FNB eWallet, Standard Bank BlueWallet, Bank Windhoek
// EasyWallet, Nedbank Money (MobiMoney).
export const EWALLET_PROVIDERS = [
  { value: "fnb_ewallet", label: "FNB eWallet", logo: "/payment-logos/fnb-ewallet.png" },
  { value: "paypulse", label: "PayPulse (Standard Bank)", logo: "/payment-logos/paypulse.png" },
  { value: "easywallet", label: "EasyWallet (Bank Windhoek)", logo: "/payment-logos/easywallet.png" },
  { value: "nedbank_money", label: "Nedbank Money (MobiMoney)", logo: "/payment-logos/nedbank-money.png" },
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

// ─── Store location (Namibian regions + towns) ──────────────────────────
// Region order = rough commercial density so common picks sit near the top.
export const NAMIBIA_REGIONS = [
  { value: "khomas",       label: "Khomas" },
  { value: "erongo",       label: "Erongo" },
  { value: "oshana",       label: "Oshana" },
  { value: "oshikoto",     label: "Oshikoto" },
  { value: "otjozondjupa", label: "Otjozondjupa" },
  { value: "omusati",      label: "Omusati" },
  { value: "ohangwena",    label: "Ohangwena" },
  { value: "kavango_east", label: "Kavango East" },
  { value: "kavango_west", label: "Kavango West" },
  { value: "hardap",       label: "Hardap" },
  { value: "karas",        label: "ǁKaras" },
  { value: "kunene",       label: "Kunene" },
  { value: "omaheke",      label: "Omaheke" },
  { value: "zambezi",      label: "Zambezi" },
] as const;

export const TOWNS_NAMIBIA = [
  // Khomas
  { value: "windhoek",     label: "Windhoek",     region: "khomas" },
  { value: "khomas_other", label: "Other (Khomas)", region: "khomas" },
  // Erongo
  { value: "swakopmund",   label: "Swakopmund",   region: "erongo" },
  { value: "walvis_bay",   label: "Walvis Bay",   region: "erongo" },
  { value: "henties_bay",  label: "Henties Bay",  region: "erongo" },
  { value: "arandis",      label: "Arandis",      region: "erongo" },
  { value: "usakos",       label: "Usakos",       region: "erongo" },
  { value: "karibib",      label: "Karibib",      region: "erongo" },
  { value: "omaruru",      label: "Omaruru",      region: "erongo" },
  { value: "erongo_other", label: "Other (Erongo)", region: "erongo" },
  // Oshana
  { value: "oshakati",     label: "Oshakati",     region: "oshana" },
  { value: "ongwediva",    label: "Ongwediva",    region: "oshana" },
  { value: "ondangwa",     label: "Ondangwa",     region: "oshana" },
  { value: "oshana_other", label: "Other (Oshana)", region: "oshana" },
  // Oshikoto
  { value: "tsumeb",       label: "Tsumeb",       region: "oshikoto" },
  { value: "omuthiya",     label: "Omuthiya",     region: "oshikoto" },
  { value: "oniipa",       label: "Oniipa",       region: "oshikoto" },
  { value: "oshikoto_other", label: "Other (Oshikoto)", region: "oshikoto" },
  // Otjozondjupa
  { value: "otjiwarongo",  label: "Otjiwarongo",  region: "otjozondjupa" },
  { value: "okahandja",    label: "Okahandja",    region: "otjozondjupa" },
  { value: "grootfontein", label: "Grootfontein", region: "otjozondjupa" },
  { value: "otavi",        label: "Otavi",        region: "otjozondjupa" },
  { value: "okakarara",    label: "Okakarara",    region: "otjozondjupa" },
  { value: "otjozondjupa_other", label: "Other (Otjozondjupa)", region: "otjozondjupa" },
  // Omusati
  { value: "outapi",       label: "Outapi",       region: "omusati" },
  { value: "oshikuku",     label: "Oshikuku",     region: "omusati" },
  { value: "okahao",       label: "Okahao",       region: "omusati" },
  { value: "ruacana",      label: "Ruacana",      region: "omusati" },
  { value: "omusati_other", label: "Other (Omusati)", region: "omusati" },
  // Ohangwena
  { value: "eenhana",      label: "Eenhana",      region: "ohangwena" },
  { value: "helao_nafidi", label: "Helao Nafidi (Oshikango)", region: "ohangwena" },
  { value: "ohangwena_other", label: "Other (Ohangwena)", region: "ohangwena" },
  // Kavango East
  { value: "rundu",        label: "Rundu",        region: "kavango_east" },
  { value: "divundu",      label: "Divundu",      region: "kavango_east" },
  { value: "kavango_east_other", label: "Other (Kavango East)", region: "kavango_east" },
  // Kavango West
  { value: "nkurenkuru",   label: "Nkurenkuru",   region: "kavango_west" },
  { value: "kavango_west_other", label: "Other (Kavango West)", region: "kavango_west" },
  // Hardap
  { value: "mariental",    label: "Mariental",    region: "hardap" },
  { value: "rehoboth",     label: "Rehoboth",     region: "hardap" },
  { value: "aranos",       label: "Aranos",       region: "hardap" },
  { value: "maltahohe",    label: "Maltahöhe",    region: "hardap" },
  { value: "hardap_other", label: "Other (Hardap)", region: "hardap" },
  // ǁKaras
  { value: "keetmanshoop", label: "Keetmanshoop", region: "karas" },
  { value: "luderitz",     label: "Lüderitz",     region: "karas" },
  { value: "oranjemund",   label: "Oranjemund",   region: "karas" },
  { value: "karasburg",    label: "Karasburg",    region: "karas" },
  { value: "rosh_pinah",   label: "Rosh Pinah",   region: "karas" },
  { value: "karas_other",  label: "Other (ǁKaras)", region: "karas" },
  // Kunene
  { value: "opuwo",        label: "Opuwo",        region: "kunene" },
  { value: "khorixas",     label: "Khorixas",     region: "kunene" },
  { value: "outjo",        label: "Outjo",        region: "kunene" },
  { value: "kamanjab",     label: "Kamanjab",     region: "kunene" },
  { value: "kunene_other", label: "Other (Kunene)", region: "kunene" },
  // Omaheke
  { value: "gobabis",      label: "Gobabis",      region: "omaheke" },
  { value: "omaheke_other", label: "Other (Omaheke)", region: "omaheke" },
  // Zambezi
  { value: "katima_mulilo", label: "Katima Mulilo", region: "zambezi" },
  { value: "bukalo",       label: "Bukalo",       region: "zambezi" },
  { value: "zambezi_other", label: "Other (Zambezi)", region: "zambezi" },
] as const;

export const REGION_LABELS: Record<string, string> = Object.fromEntries(
  NAMIBIA_REGIONS.map((r) => [r.value, r.label])
);
export const TOWN_LABELS: Record<string, string> = Object.fromEntries(
  TOWNS_NAMIBIA.map((t) => [t.value, t.label])
);
export const TOWN_REGION: Record<string, string> = Object.fromEntries(
  TOWNS_NAMIBIA.map((t) => [t.value, t.region])
);
export function townsForRegion(region: string) {
  return TOWNS_NAMIBIA.filter((t) => t.region === region);
}

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
  // Legacy value no longer offered in the picker (Standard Bank is now PayPulse).
  if (value === "bluewallet") return "BlueWallet (Standard Bank)";
  return EWALLET_PROVIDERS.find((p) => p.value === value)?.label ?? "eWallet";
}

// ─── Referral program ───────────────────────────────────────────────────
// One-time bounty per paid tier (cents). Free/trial tier earns nothing.
export const REFERRAL_BOUNTY_NAD: Record<string, number> = {
  oshi_start: 0,
  oshi_basic: 7500,
  oshi_grow: 20000,
  oshi_pro: 40000,
};
export const REFERRED_TRIAL_DAYS = 35; // referred merchants (5 extra days vs the standard 30)
export const STANDARD_TRIAL_DAYS = 30;

export function getReferralBounty(tier: string | null | undefined): number {
  return (tier && REFERRAL_BOUNTY_NAD[tier]) || 0;
}
