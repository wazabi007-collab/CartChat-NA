"use client";

import { useState } from "react";
import type { ThemeConfig } from "@/lib/industry";
import { ProductCard } from "./product-card";
import { ProductSection } from "./product-section";
import { StorefrontSearch } from "./search-bar";

interface Section {
  name: string;
  products: Product[];
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price_nad: number;
  images: string[] | null;
  category_id: string | null;
  track_inventory: boolean;
  stock_quantity: number | null;
  low_stock_threshold: number | null;
  allow_backorder: boolean;
}

interface StorefrontProductsProps {
  sections: Section[];
  allProducts: Product[];
  theme: ThemeConfig | null;
  slug: string;
  disabled: boolean;
}

export function StorefrontProducts({
  sections,
  allProducts,
  theme,
  slug,
  disabled,
}: StorefrontProductsProps) {
  const [search, setSearch] = useState("");

  const filteredProducts = search
    ? allProducts.filter((p) => {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q)
        );
      })
    : null;

  return (
    <>
      {/* Search bar */}
      {allProducts.length > 5 && (
        <div className="mb-6">
          <StorefrontSearch
            onSearch={setSearch}
            accentColor={theme?.accent}
          />
        </div>
      )}

      {/* Search results */}
      {filteredProducts !== null ? (
        filteredProducts.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No products found for &ldquo;{search}&rdquo;
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((product) => (
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
                accentColor={theme?.accent}
                accentHover={theme?.accentHover}
                ctaText={theme?.ctaText}
              />
            ))}
          </div>
        )
      ) : theme ? (
        /* Themed sections */
        <div className="space-y-8">
          {sections.map((section) => (
            <ProductSection
              key={section.name}
              sectionName={section.name}
              products={section.products}
              theme={theme}
              slug={slug}
              disabled={disabled}
            />
          ))}
        </div>
      ) : (
        /* Default sections */
        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.name}>
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                {section.name}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {section.products.map((product) => (
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
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
