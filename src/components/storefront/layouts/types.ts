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

export interface LayoutProps {
  products: LayoutProduct[];
  theme: ThemeConfig;
  slug: string;
  disabled?: boolean;
}
