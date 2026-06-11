# Preview-as-Customer Mode — Design

**Date:** 2026-06-11
**Scope:** chatcart-na (Next.js + Supabase).

## Problem

A merchant cannot see their own storefront before it's live. The storefront,
product-detail, and checkout routes all gate on
`is_active = true AND store_status = 'active'` (and products on
`is_available = true`), so a not-yet-active store 404s and in-review/hidden
products are invisible to the owner. The dashboard "Preview store" link just
points at the public URL, so it 404s for an inactive store.

## Key enabler (verified)

The storefront routes use the cookie-aware SSR Supabase client, and RLS already
grants the authenticated owner full read access to their own merchant row (any
`is_active`/`store_status`) and all their own products (any
`is_available`/`moderation_status`). So preview needs **no service client and no
new route** — only a `?preview=1` branch that drops the public gating filters
and lets RLS scope results to the owner.

## Decision (made with user)

- v1 = **preview + checkout view, no real order.** Browse the storefront as a
  customer (even inactive/in-review), open product details, and reach checkout
  to confirm it renders — but **Place Order is disabled** in preview. No
  `place_order`, `is_test`, analytics, or stock changes (the real test-order is
  a deferred follow-up).
- Reuse the existing routes with a `?preview=1` param (not a duplicated route),
  since the storefront render logic is heavy and not cleanly extractable.

## Design

### 1. Shared preview resolver — `src/lib/preview.ts` (new)

A small helper used by all three routes to keep the ownership check DRY:

```ts
// Returns true only when preview is requested AND the signed-in user owns
// the store. Routes call this after fetching the merchant (which must include
// user_id). When preview is requested but the caller is not the owner, the
// route redirects to the non-preview URL.
export function isOwnerPreview(
  previewRequested: boolean,
  merchantUserId: string | null,
  currentUserId: string | null
): boolean
```

Each route also needs the "drop the active/approved filters when preview is
requested" branch inline (filters differ per query), plus adding `user_id` to
the merchant select where it isn't already present.

### 2. Storefront — `src/app/s/[slug]/page.tsx`

- Read `preview` from `searchParams`. `previewRequested = preview === "1"`.
- Merchant fetch: when `previewRequested`, omit `.eq("is_active", true)` and
  `.eq("store_status", "active")`. (Storefront already selects `*`, so
  `user_id` is present.)
- Resolve `isPreview` via `isOwnerPreview(previewRequested, merchant?.user_id,
  user.id)`. If `previewRequested` but not the owner → `redirect("/s/{slug}")`.
- Product/count queries: when `isPreview`, omit `.eq("is_available", true)`
  (and the moderation gate falls away via the owner RLS policy) so hidden and
  in-review products appear.
- When `isPreview`: render the sticky `PreviewBanner` (below); suppress
  `TrackView` (don't log a view) and the `ReportButton`; the soft-suspend /
  order-limit ordering gates are irrelevant because ordering is disabled.
- Pass `isPreview` to the product grid / link components so internal links
  (product detail, checkout) carry `?preview=1`.

### 3. Product detail — `src/app/s/[slug]/[productId]/page.tsx`

Same pattern: preview branch drops the merchant active filters and the
product's `is_available` filter (keep `deleted_at IS NULL`); ownership redirect;
render the banner; the add-to-cart / checkout links carry `?preview=1`. Add
`user_id` to the merchant select.

### 4. Checkout — `src/app/checkout/[slug]/page.tsx` + `checkout-form.tsx`

- Page: same preview branch + ownership redirect (add `user_id` to the merchant
  select); render the banner; pass a new `preview` boolean prop to
  `CheckoutForm`.
- `checkout-form.tsx`: when `preview`, replace the "Place Order" button with a
  disabled control labelled **"Preview — ordering disabled"**, and short-circuit
  `handleSubmit` (no `place_order` call). Everything else (totals, delivery,
  payment instructions, proof UI) renders normally so the merchant can verify
  it.

### 5. Preview banner — `src/components/storefront/preview-banner.tsx` (new)

A sticky top banner shown on all three routes in preview: "Preview mode — only
you can see this. This is how customers see your store. Ordering is disabled."
with a link back to the dashboard. Pure presentational.

### 6. Entry point — dashboard "Preview store" link

`src/app/(dashboard)/dashboard/page.tsx`: change the "Preview store" link
(line ~184) from `/s/{slug}` to `/s/{slug}?preview=1` so it works even when the
store is inactive. (Other `storeUrl` usages — share/copy links — stay the
public URL.)

## Security

Preview only ever reveals the caller's own store: the filter bypass relies on
RLS owner policies (a non-owner querying another slug without the active filter
gets either the public-active row or nothing), and each route additionally
redirects to the public URL when `previewRequested` and the user isn't the
owner. Anonymous visitors adding `?preview=1` get redirected to the normal
store. No new privileged (service-client) path is introduced.

## Non-goals

- No real/test order, no `place_order`/`is_test`/analytics/stock changes.
- No new preview of admin or order-tracking flows.
- Cart still works in preview (localStorage) so the merchant can reach a
  populated checkout; only final submission is disabled.

## Verification

- `npx tsc --noEmit` + `npm run build` clean.
- As the owner (logged in), `/s/{slug}?preview=1` renders the store even when
  `store_status != 'active'`, shows in-review/hidden products, and displays the
  banner; product links and the checkout link carry `?preview=1`.
- `/checkout/{slug}?preview=1` renders the checkout with a disabled
  "Preview — ordering disabled" control; no order is created.
- A different logged-in merchant (or anonymous) hitting `?preview=1` on a store
  they don't own is redirected to the public `/s/{slug}` (404 if inactive) —
  no leakage of an inactive store or hidden products.
- The public `/s/{slug}` (no preview) behaves exactly as before.
- Verified on the QA merchant (store_status currently 'suspended'): preview
  shows the store; public URL still 404s.
