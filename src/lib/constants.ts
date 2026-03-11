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
