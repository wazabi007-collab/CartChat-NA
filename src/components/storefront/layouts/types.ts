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
}

export interface LayoutProps {
  products: LayoutProduct[];
  theme: ThemeConfig;
  slug: string;
  disabled?: boolean;
}
