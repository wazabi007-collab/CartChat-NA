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
 * Only touches local-format numbers (0811234567) or bare digits (811234567).
 * Foreign numbers with a valid country code (e.g. +27...) are left as-is.
 */
export function normalizeNamibianPhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  // Already has +264 country code — return as-is
  if (digits.startsWith("264") && digits.length >= 11) {
    return "+" + digits;
  }
  // Local format: starts with 0 (e.g. 0811234567)
  if (digits.startsWith("0") && digits.length <= 11) {
    return "+264" + digits.slice(1);
  }
  // Bare local digits without leading 0 (e.g. 811234567) — 8-9 digits
  if (digits.length >= 8 && digits.length <= 10 && !digits.startsWith("264")) {
    return "+264" + digits;
  }
  // Anything else (foreign number like +27..., +1...) — just ensure + prefix
  return "+" + digits;
}

/**
 * Generate WhatsApp deep link.
 * Normalizes Namibian local numbers; leaves foreign numbers intact.
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

