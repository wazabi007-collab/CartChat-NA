# Industry-Themed Storefronts — Design Spec

## Overview

Each merchant storefront gets visual theming based on their industry archetype. The 6 archetypes (already defined in `src/lib/industry.ts`) each receive a distinct color scheme, layout variant, CTA wording, and section labels. Merchants without an industry set keep the current default green layout unchanged.

## Scope

**In scope:**
- Storefront listing page (`src/app/s/[slug]/page.tsx`) — themed product area
- Product card / product section components — layout variants per archetype
- Theme config system in `src/lib/industry.ts`

**Out of scope:**
- Store header (stays white, unchanged; fallback avatar circle remains green regardless of archetype)
- WhatsApp button (stays green across all archetypes)
- Product detail page (not themed)
- Cart drawer (stays green, not themed)
- Checkout, footer, report button (unchanged)
- Database changes (industry column already exists)

## Theme Configurations

Each archetype defines:
- `accent` — primary color for prices, borders, section labels, CTA buttons
- `accentHover` — darker shade for button hover states
- `bgTint` — light background color for the product area
- `borderColor` — card/row border color
- `ctaText` — button label (e.g., "Add to Cart", "Book Now")
- `sectionLabel` — default section heading (overridden by merchant's actual category names)
- `layout` — one of: `menu-list`, `compact-grid`, `product-grid`, `horizontal-card`, `service-list`, `visual-gallery`

### The 6 Themes

| Archetype | Accent | Accent Hover | BG Tint | Border Color | Layout | CTA | Default Section Label |
|---|---|---|---|---|---|---|---|
| food_prepared | `#ea580c` | `#c2410c` | `#fff7ed` | `#fed7aa` | menu-list | "Order Now" | "Menu" |
| food_fresh | `#15803d` | `#166534` | `#f0fdf4` | `#bbf7d0` | compact-grid | "Add to Basket" | "Fresh Picks" |
| retail | `#16a34a` | `#15803d` | `#f0fdf4` | `#bbf7d0` | product-grid | "Add to Cart" | "Products" |
| beauty | `#db2777` | `#be185d` | `#fdf2f8` | `#fbcfe8` | horizontal-card | "Book Now" | "Treatments" |
| services | `#2563eb` | `#1d4ed8` | `#eff6ff` | `#bfdbfe` | service-list | "Request" | "Our Services" |
| gifting | `#b45309` | `#92400e` | `#fffbeb` | `#fde68a` | visual-gallery | "Send Gift" | "Gift Collection" |

## Layout Variants

All layouts support optional images. If a product has images, they display. If not, the layout degrades gracefully to text-only.

### menu-list (Food Prepared)
- Vertical stack of rows
- Each row: product name + description on the left, price + small "Add" button on the right
- If product has an image: small thumbnail on the left side of the row
- If no image: text-only row
- Warm orange borders and accent

### compact-grid (Food Fresh)
- 2-column grid on mobile, 3-column on tablet+ (denser than standard)
- Small cards: image (or placeholder), name, price
- Quick-add focused — grocery shopping feel
- Earthy green accent

### product-grid (Retail)
- 2-column grid on mobile, 3-4 on desktop (current layout)
- Standard product cards with image, name, price, "Add to Cart"
- This is the existing layout with green accent — virtually identical to current
- Default for null industry

### horizontal-card (Beauty)
- Full-width horizontal cards
- Image thumbnail on the left, name + description + price + CTA on the right
- If no image: icon placeholder on the left
- Soft pink accent, rounded corners
- Service/booking oriented feel

### service-list (Services)
- Vertical stack of rows (similar to menu-list)
- Each row: service name + description on left, price + "Request" button on right
- If product has an image: small thumbnail on left
- If no image: text-only (expected to be the common case)
- Blue accent, professional feel

### visual-gallery (Gifting)
- 2-column grid with larger image area than standard
- Cards: tall image space, name, short description, price, "Send Gift" button
- If no image: decorative placeholder
- Warm gold accent, inviting feel

## Null Industry Behavior

If `merchant.industry` is null or undefined:
- `getThemeConfig()` returns `null`
- No theming applied — current green layout renders exactly as-is
- No accent color changes, no layout variant changes
- Equivalent to the existing storefront experience

Note: `getArchetype()` (used for WhatsApp templates) defaults null to `"retail"`. `getThemeConfig()` has different semantics — it returns `null` for null industry to signal "no theme, use current default." For any recognized industry string (including those mapped to the retail archetype like "fashion", "electronics"), `getThemeConfig()` returns a full ThemeConfig. For unknown industry strings not in `ARCHETYPE_MAP`, it also returns `null`.

## Section Labels

Section label precedence:
1. If a section has a named category from the merchant, use that name
2. If there are uncategorized products AND named categories also exist, use "Other" (current behavior)
3. If there are uncategorized products AND no named categories exist, use the theme's `sectionLabel` (e.g., "Menu", "Fresh Picks")
4. If no theme (null industry), use "Products" (current behavior)

## Architecture

### Theme config (`src/lib/industry.ts`)

Add a `getThemeConfig(industry)` function alongside the existing `getArchetype()`:

```typescript
export interface ThemeConfig {
  accent: string;
  accentHover: string;
  bgTint: string;
  borderColor: string;
  ctaText: string;
  sectionLabel: string;
  layout: 'menu-list' | 'compact-grid' | 'product-grid' | 'horizontal-card' | 'service-list' | 'visual-gallery';
}

export function getThemeConfig(industry: string | null | undefined): ThemeConfig | null
```

Returns `null` for null/undefined/unknown industry (signals: use current default layout).

### Styling approach: CSS custom properties

Themed colors use CSS custom properties set on a parent container, not dynamic Tailwind class names (which get purged at build time). The storefront page sets variables on the product area wrapper:

```html
<main style={{ '--accent': theme.accent, '--accent-hover': theme.accentHover, '--bg-tint': theme.bgTint, '--border-color': theme.borderColor }}>
```

Layout components then use these variables via Tailwind arbitrary values (`bg-[var(--accent)]`) or inline styles. For hover states, use `onMouseEnter`/`onMouseLeave` or a small CSS class defined in a `<style>` tag within the component.

When theme is null (no industry), no CSS variables are set and the existing Tailwind classes (`bg-green-600`, etc.) apply as-is.

### Data flow: product descriptions

The menu-list, horizontal-card, and service-list layouts display product descriptions alongside names. The storefront page must pass `product.description` through to layout components. The existing `ProductCard` does not use descriptions — only the new layout variants need it.

### Product detail page links

All layout variants (rows, cards, etc.) link to `/s/${slug}/${productId}` when clicked, matching the current ProductCard behavior. The detail page itself is not themed.

### Storefront page (`src/app/s/[slug]/page.tsx`)

- Call `getThemeConfig(merchant.industry)` at the top
- If theme is null, render current layout unchanged
- If theme exists:
  - Apply `bgTint` to the main product area background
  - Pass theme config to product section rendering
  - Use theme's `sectionLabel` as fallback for uncategorized products

### Product section components

Two approaches (recommend option A):

**A) Single ProductSection component with variant prop**
- `<ProductSection variant={theme.layout} theme={theme} products={products} sectionName={name} />`
- Internally switches on variant to render the right layout
- Each layout is a sub-component or render function

**B) Separate components per layout**
- `<MenuList>`, `<CompactGrid>`, `<ProductGrid>`, etc.
- Storefront page selects which to render

### ProductCard changes

The existing `ProductCard` component gets optional theme props:
- `accentColor` — for price text and CTA button background
- `ctaText` — button label override
- Falls back to current green/"Add to Cart" when not provided

## Files to Create/Modify

**Modify:**
- `src/lib/industry.ts` — add `ThemeConfig` type and `getThemeConfig()` function
- `src/app/s/[slug]/page.tsx` — apply theme to product area, pass to components
- `src/components/storefront/product-card.tsx` — accept optional theme props

**Create:**
- `src/components/storefront/product-section.tsx` — variant-aware section component containing layout switching logic
- `src/components/storefront/layouts/menu-list.tsx` — Food Prepared layout
- `src/components/storefront/layouts/compact-grid.tsx` — Food Fresh layout
- `src/components/storefront/layouts/horizontal-card.tsx` — Beauty layout
- `src/components/storefront/layouts/service-list.tsx` — Services layout
- `src/components/storefront/layouts/visual-gallery.tsx` — Gifting layout

(product-grid layout is handled by existing ProductCard in a grid — no new file needed)

## Testing

- Visit storefront with each industry set → verify correct theme applied
- Visit storefront with null industry → verify current layout unchanged
- Test products with and without images for each layout
- Test category name override vs default section label
- Mobile responsiveness for all 6 layouts
