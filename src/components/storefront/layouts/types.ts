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
}

/** Returns the correct CTA text based on item_type: products always show "Add to Cart" */
export function getCtaText(product: LayoutProduct, theme: ThemeConfig): string {
  return product.item_type === "service" ? theme.ctaText : "Add to Cart";
}

/** Returns formatted price or "Price on request" for zero-price products */
export function getDisplayPrice(product: LayoutProduct, formatPrice: (n: number) => string): string {
  if (product.item_type === "service" && product.price_nad === 0) return "Request a Quote";
  if (product.item_type === "service" && product.price_nad > 0) return `From ${formatPrice(product.price_nad)}`;
  if (product.price_nad === 0) return "Price on request";
  return formatPrice(product.price_nad);
}

export interface LayoutProps {
  products: LayoutProduct[];
  theme: ThemeConfig;
  slug: string;
  disabled?: boolean;
}
