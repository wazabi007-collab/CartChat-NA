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
