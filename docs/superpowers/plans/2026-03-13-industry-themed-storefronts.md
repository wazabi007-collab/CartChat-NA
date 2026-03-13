# Industry-Themed Storefronts Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each merchant storefront a distinct visual theme (colors, layout, CTA text) based on their industry archetype.

**Architecture:** Add a `ThemeConfig` map to `src/lib/industry.ts`, create a `ProductSection` component that switches between 6 layout variants, and wire it into the storefront page via CSS custom properties. Null industry keeps the current green layout unchanged.

**Tech Stack:** Next.js 14 (App Router), React Server Components, Tailwind CSS, CSS custom properties for dynamic theming.

**Spec:** `docs/superpowers/specs/2026-03-13-industry-themed-storefronts-design.md`

---

## File Map

**Modify:**
- `src/lib/industry.ts` — add `ThemeConfig` interface + `THEME_CONFIGS` map + `getThemeConfig()` function
- `src/app/s/[slug]/page.tsx` — import theme, set CSS vars on `<main>`, replace inline sections with `<ProductSection>`
- `src/components/storefront/product-card.tsx` — add optional `accentColor`, `accentHover`, `ctaText` props, use inline styles when provided

**Create:**
- `src/components/storefront/layouts/types.ts` — shared `LayoutProduct` and `LayoutProps` types for all layouts
- `src/components/storefront/product-section.tsx` — variant-aware wrapper that switches layout based on `theme.layout`
- `src/components/storefront/layouts/menu-list.tsx` — Food Prepared layout (row-based)
- `src/components/storefront/layouts/compact-grid.tsx` — Food Fresh layout (dense 3-col grid)
- `src/components/storefront/layouts/horizontal-card.tsx` — Beauty layout (horizontal cards)
- `src/components/storefront/layouts/service-list.tsx` — Services layout (text list)
- `src/components/storefront/layouts/visual-gallery.tsx` — Gifting layout (large-image grid)

---

## Chunk 1: Theme Config + ProductCard Theming

### Task 1: Add ThemeConfig to industry.ts

**Files:**
- Modify: `src/lib/industry.ts`

- [ ] **Step 1: Add ThemeConfig interface and type**

Add after the existing `OrderMessageData` interface (line 16):

```typescript
export type LayoutVariant =
  | "menu-list"
  | "compact-grid"
  | "product-grid"
  | "horizontal-card"
  | "service-list"
  | "visual-gallery";

export interface ThemeConfig {
  accent: string;
  accentHover: string;
  bgTint: string;
  borderColor: string;
  ctaText: string;
  sectionLabel: string;
  layout: LayoutVariant;
}
```

- [ ] **Step 2: Add THEME_CONFIGS map**

Add after the `ARCHETYPE_MAP` (after line 54):

```typescript
const THEME_CONFIGS: Record<IndustryArchetype, ThemeConfig> = {
  food_prepared: {
    accent: "#ea580c",
    accentHover: "#c2410c",
    bgTint: "#fff7ed",
    borderColor: "#fed7aa",
    ctaText: "Order Now",
    sectionLabel: "Menu",
    layout: "menu-list",
  },
  food_fresh: {
    accent: "#15803d",
    accentHover: "#166534",
    bgTint: "#f0fdf4",
    borderColor: "#bbf7d0",
    ctaText: "Add to Basket",
    sectionLabel: "Fresh Picks",
    layout: "compact-grid",
  },
  retail: {
    accent: "#16a34a",
    accentHover: "#15803d",
    bgTint: "#f0fdf4",
    borderColor: "#bbf7d0",
    ctaText: "Add to Cart",
    sectionLabel: "Products",
    layout: "product-grid",
  },
  beauty: {
    accent: "#db2777",
    accentHover: "#be185d",
    bgTint: "#fdf2f8",
    borderColor: "#fbcfe8",
    ctaText: "Book Now",
    sectionLabel: "Treatments",
    layout: "horizontal-card",
  },
  services: {
    accent: "#2563eb",
    accentHover: "#1d4ed8",
    bgTint: "#eff6ff",
    borderColor: "#bfdbfe",
    ctaText: "Request",
    sectionLabel: "Our Services",
    layout: "service-list",
  },
  gifting: {
    accent: "#b45309",
    accentHover: "#92400e",
    bgTint: "#fffbeb",
    borderColor: "#fde68a",
    ctaText: "Send Gift",
    sectionLabel: "Gift Collection",
    layout: "visual-gallery",
  },
};
```

- [ ] **Step 3: Add getThemeConfig function**

Add after the existing `getArchetype()` function (after line 185):

```typescript
export function getThemeConfig(industry: string | null | undefined): ThemeConfig | null {
  if (!industry) return null;
  const archetype = ARCHETYPE_MAP[industry];
  if (!archetype) return null;
  return THEME_CONFIGS[archetype];
}
```

- [ ] **Step 4: Verify the build compiles**

Run: `npx next build --no-lint 2>&1 | head -20` (or `npm run build`)
Expected: No TypeScript errors related to industry.ts

- [ ] **Step 5: Commit**

```bash
git add src/lib/industry.ts
git commit -m "feat: add ThemeConfig map and getThemeConfig() to industry module"
```

---

### Task 2: Add theme props to ProductCard

**Files:**
- Modify: `src/components/storefront/product-card.tsx`

- [ ] **Step 1: Add optional theme props to interface**

Add to `ProductCardProps` interface (after `disabled?: boolean` on line 19):

```typescript
  accentColor?: string;
  accentHover?: string;
  ctaText?: string;
```

- [ ] **Step 2: Destructure new props**

Update the destructuring (line 22-26) to include:

```typescript
export function ProductCard({
  id, name, price, imageUrl, slug,
  trackInventory, stockQuantity, lowStockThreshold, allowBackorder,
  disabled, accentColor, accentHover, ctaText,
}: ProductCardProps) {
```

- [ ] **Step 3: Theme the price text**

Change line 68 from:
```tsx
<p className="text-green-600 font-bold text-base mt-1">
```
To:
```tsx
<p className="font-bold text-base mt-1" style={accentColor ? { color: accentColor } : undefined}>
```
And add a fallback class — when no accentColor, keep `text-green-600`:
```tsx
<p className={`font-bold text-base mt-1 ${accentColor ? '' : 'text-green-600'}`} style={accentColor ? { color: accentColor } : undefined}>
```

- [ ] **Step 4: Theme the CTA button**

Change the active button (lines 80-86) from:
```tsx
<button
  onClick={() => addItem({ productId: id, name, price, imageUrl })}
  className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors"
>
  Add to Cart
</button>
```
To:
```tsx
<button
  onClick={() => addItem({ productId: id, name, price, imageUrl })}
  className={`w-full text-white text-sm font-medium py-2 px-3 rounded-md transition-colors ${accentColor ? '' : 'bg-green-600 hover:bg-green-700'}`}
  style={accentColor ? { backgroundColor: accentColor } : undefined}
  onMouseEnter={accentHover ? (e) => { e.currentTarget.style.backgroundColor = accentHover; } : undefined}
  onMouseLeave={accentColor ? (e) => { e.currentTarget.style.backgroundColor = accentColor; } : undefined}
>
  {ctaText ?? "Add to Cart"}
</button>
```

- [ ] **Step 5: Verify build compiles**

Run: `npx next build --no-lint 2>&1 | head -20`
Expected: No errors. Existing storefronts unaffected (no props passed = green defaults).

- [ ] **Step 6: Commit**

```bash
git add src/components/storefront/product-card.tsx
git commit -m "feat: add optional theme props to ProductCard for accent color and CTA text"
```

---

## Chunk 2: Layout Components

### Task 3: Create shared product type for layouts

All layout components need the same product shape. Define a shared type to avoid repeating it.

**Files:**
- Create: `src/components/storefront/layouts/types.ts`

- [ ] **Step 1: Create the shared types file**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/storefront/layouts/types.ts
git commit -m "feat: add shared types for storefront layout components"
```

---

### Task 4: Create menu-list layout (Food Prepared)

**Files:**
- Create: `src/components/storefront/layouts/menu-list.tsx`

- [ ] **Step 1: Create menu-list component**

```typescript
"use client";

import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/utils";
import { useCart } from "../cart-provider";
import type { LayoutProps } from "./types";

export function MenuList({ products, theme, slug, disabled }: LayoutProps) {
  const { addItem } = useCart();

  return (
    <div className="flex flex-col gap-2">
      {products.map((product) => {
        const imageUrl = product.images?.[0] ?? null;
        const isOutOfStock =
          product.track_inventory &&
          (product.stock_quantity ?? 0) === 0 &&
          !product.allow_backorder;

        return (
          <div
            key={product.id}
            className="flex items-center gap-3 bg-white rounded-lg p-3"
            style={{ border: `1px solid ${theme.borderColor}` }}
          >
            {imageUrl && (
              <Link href={`/s/${slug}/${product.id}`} className="shrink-0">
                <div className="relative w-16 h-16 rounded-md overflow-hidden bg-gray-100">
                  <Image
                    src={imageUrl}
                    alt={product.name}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
              </Link>
            )}
            <Link href={`/s/${slug}/${product.id}`} className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-gray-900 truncate">
                {product.name}
              </h3>
              {product.description && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                  {product.description}
                </p>
              )}
            </Link>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-bold text-sm" style={{ color: theme.accent }}>
                {formatPrice(product.price_nad)}
              </span>
              {isOutOfStock || disabled ? (
                <span className="text-xs text-gray-400">Sold out</span>
              ) : (
                <button
                  onClick={() =>
                    addItem({
                      productId: product.id,
                      name: product.name,
                      price: product.price_nad,
                      imageUrl,
                    })
                  }
                  className="text-white text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
                  style={{ backgroundColor: theme.accent }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.accentHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme.accent;
                  }}
                >
                  {theme.ctaText}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/storefront/layouts/menu-list.tsx
git commit -m "feat: add menu-list layout component for Food Prepared archetype"
```

---

### Task 5: Create compact-grid layout (Food Fresh)

**Files:**
- Create: `src/components/storefront/layouts/compact-grid.tsx`

- [ ] **Step 1: Create compact-grid component**

```typescript
"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingCart } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useCart } from "../cart-provider";
import type { LayoutProps } from "./types";

export function CompactGrid({ products, theme, slug, disabled }: LayoutProps) {
  const { addItem } = useCart();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {products.map((product) => {
        const imageUrl = product.images?.[0] ?? null;
        const isOutOfStock =
          product.track_inventory &&
          (product.stock_quantity ?? 0) === 0 &&
          !product.allow_backorder;

        return (
          <div
            key={product.id}
            className="bg-white rounded-lg overflow-hidden flex flex-col"
            style={{ border: `1px solid ${theme.borderColor}` }}
          >
            <Link href={`/s/${slug}/${product.id}`} className="block">
              {imageUrl ? (
                <div className="relative aspect-square bg-gray-100">
                  <Image
                    src={imageUrl}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div
                  className="aspect-square flex items-center justify-center"
                  style={{ backgroundColor: theme.bgTint }}
                >
                  <ShoppingCart className="w-8 h-8 text-gray-300" />
                </div>
              )}
            </Link>
            <div className="p-2 flex flex-col flex-1 text-center">
              <Link href={`/s/${slug}/${product.id}`}>
                <h3 className="font-medium text-gray-900 text-xs leading-tight line-clamp-2">
                  {product.name}
                </h3>
              </Link>
              <p className="font-bold text-sm mt-1" style={{ color: theme.accent }}>
                {formatPrice(product.price_nad)}
              </p>
              <div className="mt-auto pt-1.5">
                {isOutOfStock || disabled ? (
                  <span className="text-xs text-gray-400">Sold out</span>
                ) : (
                  <button
                    onClick={() =>
                      addItem({
                        productId: product.id,
                        name: product.name,
                        price: product.price_nad,
                        imageUrl,
                      })
                    }
                    className="w-full text-white text-xs font-medium py-1.5 px-2 rounded-md transition-colors"
                    style={{ backgroundColor: theme.accent }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.accentHover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = theme.accent;
                    }}
                  >
                    {theme.ctaText}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/storefront/layouts/compact-grid.tsx
git commit -m "feat: add compact-grid layout component for Food Fresh archetype"
```

---

### Task 6: Create horizontal-card layout (Beauty)

**Files:**
- Create: `src/components/storefront/layouts/horizontal-card.tsx`

- [ ] **Step 1: Create horizontal-card component**

```typescript
"use client";

import Link from "next/link";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useCart } from "../cart-provider";
import type { LayoutProps } from "./types";

export function HorizontalCard({ products, theme, slug, disabled }: LayoutProps) {
  const { addItem } = useCart();

  return (
    <div className="flex flex-col gap-3">
      {products.map((product) => {
        const imageUrl = product.images?.[0] ?? null;
        const isOutOfStock =
          product.track_inventory &&
          (product.stock_quantity ?? 0) === 0 &&
          !product.allow_backorder;

        return (
          <div
            key={product.id}
            className="bg-white rounded-xl overflow-hidden flex"
            style={{ border: `1px solid ${theme.borderColor}` }}
          >
            <Link href={`/s/${slug}/${product.id}`} className="shrink-0">
              {imageUrl ? (
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 bg-gray-100">
                  <Image
                    src={imageUrl}
                    alt={product.name}
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div
                  className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center"
                  style={{ backgroundColor: theme.bgTint }}
                >
                  <Sparkles className="w-8 h-8" style={{ color: theme.borderColor }} />
                </div>
              )}
            </Link>
            <div className="p-3 flex-1 flex flex-col min-w-0">
              <Link href={`/s/${slug}/${product.id}`}>
                <h3 className="font-semibold text-sm text-gray-900 truncate">
                  {product.name}
                </h3>
              </Link>
              {product.description && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                  {product.description}
                </p>
              )}
              <div className="mt-auto flex items-center justify-between pt-2">
                <span className="font-bold text-sm" style={{ color: theme.accent }}>
                  {formatPrice(product.price_nad)}
                </span>
                {isOutOfStock || disabled ? (
                  <span className="text-xs text-gray-400">Unavailable</span>
                ) : (
                  <button
                    onClick={() =>
                      addItem({
                        productId: product.id,
                        name: product.name,
                        price: product.price_nad,
                        imageUrl,
                      })
                    }
                    className="text-white text-xs font-medium px-4 py-1.5 rounded-full transition-colors"
                    style={{ backgroundColor: theme.accent }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.accentHover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = theme.accent;
                    }}
                  >
                    {theme.ctaText}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/storefront/layouts/horizontal-card.tsx
git commit -m "feat: add horizontal-card layout component for Beauty archetype"
```

---

### Task 7: Create service-list layout (Services)

**Files:**
- Create: `src/components/storefront/layouts/service-list.tsx`

- [ ] **Step 1: Create service-list component**

```typescript
"use client";

import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/utils";
import { useCart } from "../cart-provider";
import type { LayoutProps } from "./types";

export function ServiceList({ products, theme, slug, disabled }: LayoutProps) {
  const { addItem } = useCart();

  return (
    <div className="flex flex-col gap-2">
      {products.map((product) => {
        const imageUrl = product.images?.[0] ?? null;
        const isOutOfStock =
          product.track_inventory &&
          (product.stock_quantity ?? 0) === 0 &&
          !product.allow_backorder;

        return (
          <div
            key={product.id}
            className="flex items-center gap-3 bg-white rounded-lg p-3"
            style={{ border: `1px solid ${theme.borderColor}` }}
          >
            {imageUrl && (
              <Link href={`/s/${slug}/${product.id}`} className="shrink-0">
                <div className="relative w-14 h-14 rounded-md overflow-hidden bg-gray-100">
                  <Image
                    src={imageUrl}
                    alt={product.name}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </div>
              </Link>
            )}
            <Link href={`/s/${slug}/${product.id}`} className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-gray-900">
                {product.name}
              </h3>
              {product.description && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                  {product.description}
                </p>
              )}
            </Link>
            <div className="shrink-0 text-right">
              <div className="font-bold text-sm" style={{ color: theme.accent }}>
                {formatPrice(product.price_nad)}
              </div>
              {isOutOfStock || disabled ? (
                <span className="text-xs text-gray-400">Unavailable</span>
              ) : (
                <button
                  onClick={() =>
                    addItem({
                      productId: product.id,
                      name: product.name,
                      price: product.price_nad,
                      imageUrl,
                    })
                  }
                  className="text-white text-xs font-medium px-3 py-1 rounded-full mt-1 transition-colors"
                  style={{ backgroundColor: theme.accent }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.accentHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme.accent;
                  }}
                >
                  {theme.ctaText}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/storefront/layouts/service-list.tsx
git commit -m "feat: add service-list layout component for Services archetype"
```

---

### Task 8: Create visual-gallery layout (Gifting)

**Files:**
- Create: `src/components/storefront/layouts/visual-gallery.tsx`

- [ ] **Step 1: Create visual-gallery component**

```typescript
"use client";

import Link from "next/link";
import Image from "next/image";
import { Gift } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useCart } from "../cart-provider";
import type { LayoutProps } from "./types";

export function VisualGallery({ products, theme, slug, disabled }: LayoutProps) {
  const { addItem } = useCart();

  return (
    <div className="grid grid-cols-2 gap-3">
      {products.map((product) => {
        const imageUrl = product.images?.[0] ?? null;
        const isOutOfStock =
          product.track_inventory &&
          (product.stock_quantity ?? 0) === 0 &&
          !product.allow_backorder;

        return (
          <div
            key={product.id}
            className="bg-white rounded-xl overflow-hidden flex flex-col"
            style={{ border: `1px solid ${theme.borderColor}` }}
          >
            <Link href={`/s/${slug}/${product.id}`} className="block">
              {imageUrl ? (
                <div className="relative aspect-[4/5] bg-gray-100">
                  <Image
                    src={imageUrl}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div
                  className="aspect-[4/5] flex items-center justify-center"
                  style={{ backgroundColor: theme.bgTint }}
                >
                  <Gift className="w-12 h-12" style={{ color: theme.borderColor }} />
                </div>
              )}
            </Link>
            <div className="p-3 flex flex-col flex-1 text-center">
              <Link href={`/s/${slug}/${product.id}`}>
                <h3 className="font-semibold text-sm text-gray-900 line-clamp-1">
                  {product.name}
                </h3>
              </Link>
              {product.description && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                  {product.description}
                </p>
              )}
              <p className="font-bold text-base mt-1.5" style={{ color: theme.accent }}>
                {formatPrice(product.price_nad)}
              </p>
              <div className="mt-auto pt-2">
                {isOutOfStock || disabled ? (
                  <span className="text-xs text-gray-400">Unavailable</span>
                ) : (
                  <button
                    onClick={() =>
                      addItem({
                        productId: product.id,
                        name: product.name,
                        price: product.price_nad,
                        imageUrl,
                      })
                    }
                    className="w-full text-white text-sm font-medium py-2 px-3 rounded-full transition-colors"
                    style={{ backgroundColor: theme.accent }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.accentHover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = theme.accent;
                    }}
                  >
                    {theme.ctaText}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/storefront/layouts/visual-gallery.tsx
git commit -m "feat: add visual-gallery layout component for Gifting archetype"
```

---

## Chunk 3: ProductSection + Storefront Integration

### Task 9: Create ProductSection component

**Files:**
- Create: `src/components/storefront/product-section.tsx`

- [ ] **Step 1: Create the variant-switching ProductSection**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/storefront/product-section.tsx
git commit -m "feat: add ProductSection component with layout variant switching"
```

---

### Task 10: Wire theming into storefront page

**Files:**
- Modify: `src/app/s/[slug]/page.tsx`

- [ ] **Step 1: Add imports**

Add to the imports at the top of the file:

```typescript
import { getThemeConfig } from "@/lib/industry";
import { ProductSection } from "@/components/storefront/product-section";
```

- [ ] **Step 2: Get theme config after merchant fetch**

Add after `const hasBranding = showBranding(tier);` (line 67):

```typescript
  const theme = getThemeConfig(merchant.industry);
```

- [ ] **Step 3: Update section label logic**

Replace the uncategorized section name logic (lines 108-113):

```typescript
  const uncategorized = categoryMap.get(null);
  if (uncategorized && uncategorized.length > 0) {
    sections.push({
      name: sections.length > 0 ? "Other" : "Products",
      products: uncategorized,
    });
  }
```

With:

```typescript
  const uncategorized = categoryMap.get(null);
  if (uncategorized && uncategorized.length > 0) {
    let fallbackName: string;
    if (sections.length > 0) {
      fallbackName = "Other";
    } else {
      fallbackName = theme?.sectionLabel ?? "Products";
    }
    sections.push({ name: fallbackName, products: uncategorized });
  }
```

- [ ] **Step 4: Replace the product rendering section**

Replace the `<main>` block (lines 176-209) with:

```tsx
      {/* Products */}
      <main
        className="max-w-4xl mx-auto px-4 py-6"
        style={theme ? { backgroundColor: theme.bgTint } : undefined}
      >
        {allProducts.length === 0 ? (
          <p className="text-center text-gray-500 py-12">
            No products available yet. Check back soon!
          </p>
        ) : theme ? (
          <div className="space-y-8">
            {sections.map((section) => (
              <ProductSection
                key={section.name}
                sectionName={section.name}
                products={section.products}
                theme={theme}
                slug={slug}
                disabled={isSoftSuspended}
              />
            ))}
          </div>
        ) : (
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
                      stockQuantity={product.stock_quantity}
                      lowStockThreshold={product.low_stock_threshold}
                      allowBackorder={product.allow_backorder}
                      disabled={isSoftSuspended}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
```

- [ ] **Step 5: Verify build compiles**

Run: `npx next build --no-lint 2>&1 | head -30`
Expected: No TypeScript errors. Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/app/s/[slug]/page.tsx
git commit -m "feat: integrate industry theming into storefront page"
```

---

### Task 11: Manual QA testing

- [ ] **Step 1: Test null industry storefront**

Visit any merchant storefront with `industry = null`. Verify it looks exactly the same as before — green accent, standard grid, "Add to Cart" buttons.

- [ ] **Step 2: Test each archetype**

Set a test merchant's industry in Supabase to each of these values and verify the storefront:

| Set industry to | Expected layout | Expected accent |
|---|---|---|
| `restaurant` | menu-list rows | orange |
| `grocery` | compact 2-col/3-col grid | earthy green |
| `fashion` | standard product grid | green |
| `salon` | horizontal cards | pink |
| `cleaning` | service list rows | blue |
| `flowers` | visual gallery, tall images | gold |

- [ ] **Step 3: Test with and without product images**

For at least one archetype, test a product with an image and a product without an image. Verify both render correctly.

- [ ] **Step 4: Test mobile responsiveness**

Open each layout on a mobile viewport (375px). Verify nothing overflows or looks broken.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: industry-themed storefronts — 6 archetype layouts with distinct colors and CTA text"
```
