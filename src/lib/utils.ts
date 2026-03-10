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
 * Generate WhatsApp deep link
 * @param phone - Phone number with country code (e.g., "264811234567")
 * @param message - Pre-filled message text
 */
export function whatsappLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, "");
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

/**
 * Free tier limits
 */
export const TIER_LIMITS = {
  free: {
    maxProducts: 20,
    maxOrdersPerMonth: 20,
  },
  pro: {
    maxProducts: 150,
    maxOrdersPerMonth: 300,
  },
  business: {
    maxProducts: Infinity,
    maxOrdersPerMonth: Infinity,
  },
} as const;
