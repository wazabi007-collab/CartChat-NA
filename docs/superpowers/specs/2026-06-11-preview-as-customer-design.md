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
- Reuse the existing routes (not a duplicated route), since the storefront
  render logic is heavy and not cleanly extractable.
- Persist preview with a **short-lived cookie**, not a `?preview=1` param
  threaded through links. Reason: the param drops on any link that isn't
  updated (category filter, pagination); a cookie persists across every
  navigation with zero per-link threading. Security does not rely on the
  cookie — every route re-verifies ownership per render with the authed
  session, so a forged cookie reveals nothing.

## Design

### 1. Enter/exit route handlers + shared resolver

- **`src/app/api/preview/enter/route.ts`** (GET `?slug=X`): authenticate the
  user, confirm they own the store (`merchants.store_slug = slug AND user_id =
  user.id`); set an httpOnly cookie `oshicart_preview=1`
  (`path=/`, `SameSite=Lax`, `maxAge` 3600s); redirect to `/s/{slug}`. If not
  the owner / not authed, redirect to `/dashboard`.
- **`src/app/api/preview/exit/route.ts`** (GET): clear the cookie; redirect to
  `/dashboard`.
- **`src/lib/preview.ts`** (new): a helper that reads the cookie + current user
  once, so each route resolves preview consistently:

```ts
// Reads the preview cookie and the signed-in user. The route then activates
// preview only when previewCookie is set AND merchant.user_id === userId.
export async function readPreviewState(
  supabase: SupabaseServerClient
): Promise<{ previewCookie: boolean; userId: string | null }>
```

Each route computes `isPreview = previewCookie && !!userId &&
merchant.user_id === userId`, drops the `is_active`/`store_status` (and product
`is_available`) filters from its fetch **only when `previewCookie`** is set, and
includes `user_id` in the merchant select. Because RLS scopes the authed
client to public-active rows + the owner's own rows, dropping the filters can
never surface another merchant's inactive store.

### 2. Storefront — `src/app/s/[slug]/page.tsx`

- Read preview state via `readPreviewState(supabase)` → `{ previewCookie,
  userId }`.
- Merchant fetch: when `previewCookie`, omit `.eq("is_active", true)` and
  `.eq("store_status", "active")`. (Storefront already selects `*`, so
  `user_id` is present.)
- `isPreview = previewCookie && !!userId && merchant.user_id === userId`. When
  `previewCookie` is set but the merchant turns out inactive AND not owned
  (RLS makes this null → already `notFound`), or owned-but-cookie-mismatch
  isn't possible since the cookie is just a flag — no redirect needed; a
  non-owner simply gets `isPreview = false` and the normal public gating.
- Product/count queries: when `isPreview`, omit `.eq("is_available", true)`
  (the moderation gate falls away via the owner RLS policy) so hidden and
  in-review products appear.
- When `isPreview`: render the sticky `PreviewBanner` (below); suppress
  `TrackView` (don't log a view) and the `ReportButton`. Ordering UI stays
  enabled (cart works) but final submission is blocked at checkout.

### 3. Product detail — `src/app/s/[slug]/[productId]/page.tsx`

Same pattern via `readPreviewState`: when `previewCookie`, drop the merchant
active filters and the product's `is_available` filter (keep `deleted_at IS
NULL`); compute `isPreview`; render the banner when preview. Add `user_id` to
the merchant select.

### 4. Checkout — `src/app/checkout/[slug]/page.tsx` + `checkout-form.tsx`

- Page: same `readPreviewState` branch (add `user_id` to the merchant select,
  drop active filters when `previewCookie`); render the banner when preview;
  pass a new `preview` boolean prop to `CheckoutForm`.
- `checkout-form.tsx`: when `preview`, replace the "Place Order" button with a
  disabled control labelled **"Preview — ordering disabled"**, and short-circuit
  `handleSubmit` (no `place_order` call). Everything else (totals, delivery,
  payment instructions, proof UI) renders normally so the merchant can verify
  it.

### 5. Preview banner — `src/components/storefront/preview-banner.tsx` (new)

A sticky top banner shown on all three routes in preview: "Preview mode — only
you can see this. This is how customers see your store. Ordering is disabled."
with an **"Exit preview"** link to `/api/preview/exit` and a link back to the
dashboard. Pure presentational.

### 6. Entry point — dashboard "Preview store" link

`src/app/(dashboard)/dashboard/page.tsx`: change the "Preview store" link
(line ~184) from `/s/{slug}` to `/api/preview/enter?slug={slug}` so it sets the
preview cookie and lands on the (possibly inactive) store. (Other `storeUrl`
usages — share/copy links — stay the public URL.)

## Security

Preview never reveals anything but the caller's own store. The cookie is only a
boolean intent flag; activation requires `merchant.user_id === userId` computed
per render from the authed session, so a forged/copied cookie does nothing.
Dropping the active filters is safe because the authed client's RLS returns
only public-active rows plus the owner's own rows — a non-owner querying another
slug gets the public-active row or nothing. The enter route verifies ownership
before setting the cookie; the cookie self-expires after 1 hour. No new
privileged (service-client) path is introduced.

## Non-goals

- No real/test order, no `place_order`/`is_test`/analytics/stock changes.
- No new preview of admin or order-tracking flows.
- Cart still works in preview (localStorage) so the merchant can reach a
  populated checkout; only final submission is disabled.

## Verification

- `npx tsc --noEmit` + `npm run build` clean.
- As the owner (logged in), hitting `/api/preview/enter?slug={slug}` sets the
  cookie and lands on `/s/{slug}`, which renders the store even when
  `store_status != 'active'`, shows in-review/hidden products, and displays the
  banner. Navigating to a category/product/checkout keeps preview (cookie).
- `/checkout/{slug}` in preview renders with a disabled
  "Preview — ordering disabled" control; no order is created.
- "Exit preview" (`/api/preview/exit`) clears the cookie; the store then
  behaves as the public view again (404 if inactive).
- A different logged-in merchant (or anonymous) with the cookie set, viewing a
  store they don't own, gets `isPreview = false` — normal public gating (404 if
  inactive); no leakage of an inactive store or hidden products.
- The public `/s/{slug}` (no cookie) behaves exactly as before.
- Verified on the QA merchant (store_status currently 'suspended'): preview
  shows the store; public URL still 404s.
