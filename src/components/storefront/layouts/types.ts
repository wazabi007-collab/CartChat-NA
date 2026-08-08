import type { ThemeConfig } from "@/lib/industry";

export interface LayoutProduct {
  id: string;
  name: string;
  description: string | null;
  price_nad: number;
  images: string[] | null;
  track_inventory: boolean;
  stock_quantity: number | null;
  low_stock_threshold: number | null;
  allow_backorder: boolean;
  item_type?: string;
  service_mode?: string | null;
  has_variants?: boolean;
}

/** Returns the correct CTA text based on item_type: products always show "Add to Cart" */
/**
 * The button label on a storefront card.
 *
 * Falls back to the merchant's archetype rather than relying only on the
 * per-product flag. `item_type` is NOT NULL DEFAULT 'product', so an existing
 * row saying "product" cannot be told apart from one the merchant was never
 * asked about — and in practice almost nobody sets it. Platform-wide only three
 * products were ever marked as services, while genuine service merchants
 * (a computer repair shop, a cleaning business) had none, so their customers
 * saw "Add to Cart" for a repair.
 *
 * A stored "service" still wins, so a retailer can mark an individual item as
 * a service.
 */
export function getCtaText(product: LayoutProduct, theme: ThemeConfig): string {
  const isService = product.item_type === "service" || theme.isService;
  return isService ? theme.ctaText : "Add to Cart";
}

/** Returns formatted price or "Price on request" for zero-price products */
export function getDisplayPrice(product: LayoutProduct, formatPrice: (n: number) => string): string {
  if (product.item_type === "service" && product.price_nad === 0) return "Request a Quote";
  if (product.item_type === "service" && product.price_nad > 0) return `From ${formatPrice(product.price_nad)}`;
  if (product.price_nad === 0) return "Price on request";
  return formatPrice(product.price_nad);
}

export function getStockLabel(product: LayoutProduct): string | null {
  if (product.item_type === "service" || !product.track_inventory) return null;
  const quantity = product.stock_quantity ?? 0;
  if (quantity <= 0 && !product.allow_backorder) return "Out of stock";
  if (quantity <= 0 && product.allow_backorder) return "Available on backorder";
  return `${quantity.toLocaleString("en-NA")} in stock`;
}

export interface LayoutProps {
  products: LayoutProduct[];
  theme: ThemeConfig;
  slug: string;
  disabled?: boolean;
}
