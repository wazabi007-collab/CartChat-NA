"use client";

import { useState } from "react";
import type { ThemeConfig } from "@/lib/industry";
import { ProductCard } from "./product-card";
import { cartItemFromProduct } from "./cart-provider";
import { ProductSection } from "./product-section";
import { StorefrontSearch } from "./search-bar";

interface Section {
  name: string;
  products: Product[];
}

interface Product {
  id: string;
  name: string;
  sku?: string | null;
  description: string | null;
  price_nad: number;
  images: string[] | null;
  category_id: string | null;
  track_inventory: boolean;
  stock_quantity: number | null;
  low_stock_threshold: number | null;
  allow_backorder: boolean;
  item_type?: string;
  service_mode?: string | null;
  rental_unit?: string | null;
  deposit_nad?: number | null;
  required_documents?: string | null;
  rental_min_days?: number | null;
  rental_max_days?: number | null;
  requires_id_number?: boolean | null;
  has_variants?: boolean;
}

interface StorefrontProductsProps {
  sections: Section[];
  allProducts: Product[];
  theme: ThemeConfig | null;
  slug: string;
  disabled: boolean;
  whatsappNumber?: string;
  storeName?: string;
  searchQuery?: string;
}

export function StorefrontProducts({
  sections,
  allProducts,
  theme,
  slug,
  disabled,
  whatsappNumber,
  storeName,
  searchQuery = "",
}: StorefrontProductsProps) {
  const [sortBy, setSortBy] = useState("default");

  function sortProducts(list: Product[]): Product[] {
    if (sortBy === "default") return list;
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case "name_asc": return a.name.localeCompare(b.name);
        case "name_desc": return b.name.localeCompare(a.name);
        case "price_asc": return a.price_nad - b.price_nad;
        case "price_desc": return b.price_nad - a.price_nad;
        default: return 0;
      }
    });
  }

  const searchResults = searchQuery ? sortProducts(allProducts) : null;

  // Sort sections when not searching
  const sortedSections = sortBy !== "default"
    ? sections.map((s) => ({ ...s, products: sortProducts(s.products) }))
    : sections;

  return (
    <>
      {/* Search + Sort bar */}
      {(allProducts.length > 5 || searchQuery) && (
        <div className="flex gap-2 mb-6">
          <div className="flex-1">
            <StorefrontSearch
              accentColor={theme?.accent}
              initialQuery={searchQuery}
            />
          </div>
          <select
            aria-label="Sort products"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white shadow-sm shadow-slate-900/5 focus:outline-none focus:ring-2 focus:border-transparent appearance-none cursor-pointer"
            style={theme ? { "--tw-ring-color": theme.accent } as React.CSSProperties : undefined}
          >
            <option value="default">Sort</option>
            <option value="name_asc">Name A-Z</option>
            <option value="name_desc">Name Z-A</option>
            <option value="price_asc">Price: Low</option>
            <option value="price_desc">Price: High</option>
          </select>
        </div>
      )}

      {/* Search results */}
      {searchResults !== null ? (
        searchResults.length === 0 ? (
          <p className="text-center text-slate-500 py-8">
            No products found for &ldquo;{searchQuery}&rdquo;
          </p>
        ) : (
          <>
            <p className="mb-3 text-sm font-semibold text-slate-500">
              {searchResults.length} result{searchResults.length === 1 ? "" : "s"} for &ldquo;{searchQuery}&rdquo;
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {searchResults.map((product) => (
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
                  itemType={product.item_type as "product" | "service" | "rental" | undefined}
                  rentalUnit={product.rental_unit}
                  whatsappNumber={whatsappNumber}
                  storeName={storeName}
                  hasVariants={product.has_variants}
                  cartPayload={cartItemFromProduct(product)}
                />
              ))}
            </div>
          </>
        )
      ) : theme ? (
        /* Themed sections */
        <div className="space-y-8">
          {sortedSections.map((section) => (
            <ProductSection
              key={section.name}
              sectionName={section.name}
              products={section.products}
              theme={theme}
              slug={slug}
              disabled={disabled}
              whatsappNumber={whatsappNumber}
              storeName={storeName}
            />
          ))}
        </div>
      ) : (
        /* Default sections */
        <div className="space-y-8">
          {sortedSections.map((section) => (
            <section key={section.name}>
              <h2 className="text-lg font-bold text-slate-950 mb-3">
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
                    itemType={product.item_type as "product" | "service" | "rental" | undefined}
                    rentalUnit={product.rental_unit}
                    whatsappNumber={whatsappNumber}
                    storeName={storeName}
                    hasVariants={product.has_variants}
                    cartPayload={cartItemFromProduct(product)}
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
