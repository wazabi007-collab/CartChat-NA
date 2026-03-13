"use client";

import type { ThemeConfig } from "@/lib/industry";
import { ProductCard } from "./product-card";
import { MenuList } from "./layouts/menu-list";
import { CompactGrid } from "./layouts/compact-grid";
import { HorizontalCard } from "./layouts/horizontal-card";
import { ServiceList } from "./layouts/service-list";
import { VisualGallery } from "./layouts/visual-gallery";
import type { LayoutProduct } from "./layouts/types";

interface ProductSectionProps {
  sectionName: string;
  products: LayoutProduct[];
  theme: ThemeConfig;
  slug: string;
  disabled?: boolean;
}

export function ProductSection({
  sectionName,
  products,
  theme,
  slug,
  disabled,
}: ProductSectionProps) {
  return (
    <section>
      <h2
        className="text-lg font-bold mb-3"
        style={{ color: theme.accent }}
      >
        {sectionName}
      </h2>
      {theme.layout === "menu-list" && (
        <MenuList products={products} theme={theme} slug={slug} disabled={disabled} />
      )}
      {theme.layout === "compact-grid" && (
        <CompactGrid products={products} theme={theme} slug={slug} disabled={disabled} />
      )}
      {theme.layout === "product-grid" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              price={product.price_nad}
              imageUrl={product.images?.[0] ?? null}
              slug={slug}
              trackInventory={product.track_inventory}
              stockQuantity={product.stock_quantity ?? undefined}
              lowStockThreshold={product.low_stock_threshold ?? undefined}
              allowBackorder={product.allow_backorder}
              disabled={disabled}
              accentColor={theme.accent}
              accentHover={theme.accentHover}
              ctaText={theme.ctaText}
            />
          ))}
        </div>
      )}
      {theme.layout === "horizontal-card" && (
        <HorizontalCard products={products} theme={theme} slug={slug} disabled={disabled} />
      )}
      {theme.layout === "service-list" && (
        <ServiceList products={products} theme={theme} slug={slug} disabled={disabled} />
      )}
      {theme.layout === "visual-gallery" && (
        <VisualGallery products={products} theme={theme} slug={slug} disabled={disabled} />
      )}
    </section>
  );
}
