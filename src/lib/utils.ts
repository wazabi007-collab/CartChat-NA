/**
 * Format price from cents to NAD display string
 * e.g., 4999 → "N$49.99"
 */
export function formatPrice(cents: number): string {
  return `N$${(cents / 100).toFixed(2)}`;
}

/**
 * Convert NAD amount to cents for storage
 * e.g., 49.99 → 4999
 */
export function toCents(nad: number): number {
  return Math.round(nad * 100);
}

/**
 * Generate URL-safe slug from store name
 * e.g., "Mama's Kitchen" → "mamas-kitchen"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Normalize a Namibian phone number to +264 international format.
 * e.g. "0811234567" → "+264811234567", "+081..." → "+264811234567"
 */
export function normalizeNamibianPhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  // Strip leading 0 (local format like 0811234567)
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  // Ensure 264 country code prefix
  if (!digits.startsWith("264")) {
    digits = "264" + digits;
  }
  return "+" + digits;
}

/**
 * Generate WhatsApp deep link
 * @param phone - Phone number in any format (auto-normalized to +264)
 * @param message - Pre-filled message text
 */
export function whatsappLink(phone: string, message: string): string {
  const normalized = normalizeNamibianPhone(phone);
  const cleanPhone = normalized.replace(/\D/g, "");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "…";
}

/**
 * Merge class names (simple cn utility without clsx dependency)
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

