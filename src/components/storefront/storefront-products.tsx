import type { ThemeConfig } from "@/lib/industry";
import { ProductCard } from "./product-card";
import { cartItemFromProduct } from "@/lib/cart-item";
import { ProductSection } from "./product-section";
import { StorefrontSearch } from "./search-bar";
import { SortSelect } from "./sort-select";
import { sortProducts, type SortValue } from "@/lib/product-sort";

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
  /** Applied on the server; the select below only reflects and changes it. */
  sort: SortValue;
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
  sort,
}: StorefrontProductsProps) {
  const searchResults = searchQuery ? sortProducts(allProducts, sort) : null;

  const sortedSections =
    sort !== "default"
      ? sections.map((s) => ({ ...s, products: sortProducts(s.products, sort) }))
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
          <SortSelect value={sort} accentColor={theme?.accent} />
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
