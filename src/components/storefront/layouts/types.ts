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
  rental_unit?: string | null;
  // Read by cartItemFromProduct — without these a hire reaches checkout with
  // no deposit and no hire limits.
  deposit_nad?: number | null;
  required_documents?: string | null;
  rental_min_days?: number | null;
  rental_max_days?: number | null;
  requires_id_number?: boolean | null;
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
  // A hire rate without its unit reads as the whole price of the hire, which
  // is what a customer will hold you to. Every layout must say per what.
  if (product.item_type === "rental") {
    return `${formatPrice(product.price_nad)} / ${product.rental_unit === "night" ? "night" : "day"}`;
  }
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
