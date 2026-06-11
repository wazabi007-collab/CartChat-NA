# Batch UX Wins (Coupon Copy · Bulk Hide/Show · Delivery Estimate) — Design

**Date:** 2026-06-11
**Scope:** chatcart-na (Next.js + Supabase). Three small, independent merchant
UX improvements in one spec.

## 1. Coupon copy-to-clipboard

**Problem:** Merchants must manually select a coupon code to share it.

**Design:**
- Extract the existing clipboard logic from
  `src/app/(dashboard)/dashboard/copy-store-link.tsx` (the `navigator.clipboard`
  call with a hidden-`textarea` + `execCommand` fallback) into
  `src/lib/clipboard.ts` as `export async function copyToClipboard(text: string):
  Promise<void>`. Refactor `copy-store-link.tsx` to use it (no behavior change).
- In `src/app/(dashboard)/dashboard/coupons/page.tsx` (already a client
  component), add a small **Copy** button beside each coupon code
  (`{coupon.code}` at ~line 434). It calls `copyToClipboard(coupon.code)` and
  shows "Copied!" with a `Check` icon for 2s, mirroring the store-link button.
  Track the just-copied code in component state (`copiedCode: string | null`)
  so only the clicked row shows feedback.
- No backend.

## 2. Bulk hide / show products

**Problem:** The product list has Select mode + bulk delete, but no bulk
availability toggle — hiding several products means editing each.

**Design:**
- **API:** add a `PATCH` handler to `src/app/api/products/route.ts` that mirrors
  the existing bulk `DELETE`: read `ids` from the query string and
  `{ is_available: boolean }` from the JSON body; authenticate; resolve the
  merchant; run
  `supabase.from("products").update({ is_available }).in("id", ids)
  .eq("merchant_id", merchant.id).is("deleted_at", null)`. Returns 400 on
  missing ids / non-boolean, 401/404 on auth/merchant, 500 on failure.
- **UI:** in `src/app/(dashboard)/dashboard/products/product-actions.tsx` Select
  mode, alongside the existing "Delete {n}" button add **two** buttons when
  `selected.size > 0`: **Hide {n}** (`is_available=false`) and **Show {n}**
  (`is_available=true`). A shared `handleBulkAvailability(ids, isAvailable)`
  posts to the new PATCH route, then clears selection, exits select mode, and
  `router.refresh()`. Two explicit actions (not a toggle) because a selection
  may mix hidden and visible products.
- Only `is_available` changes — moderation state is untouched.

## 3. Delivery / prep estimate

**Problem:** Buyers have no sense of how long an order takes; merchants can't
set an ETA.

**Design:**
- **Migration `043_delivery_estimate.sql`:**
  `ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS delivery_estimate text
  DEFAULT NULL;` Update `src/types/database.ts` merchants Row/Insert/Update with
  `delivery_estimate` (`string | null`, optional on Insert/Update).
- **Settings:** in `src/app/(dashboard)/dashboard/settings/page.tsx`, add an
  optional "Delivery estimate" field in/after the Delivery Fee card. Label
  "Usually ready in…", placeholder "e.g. 1–2 days, same-day, 30 min",
  `maxLength={40}`. Add `delivery_estimate: ""` to the form state init + load
  (`merchant.delivery_estimate ?? ""`), and `delivery_estimate:
  form.delivery_estimate.trim() || null` to the save payload.
- **Buyer surfaces (only when non-empty):**
  - Storefront: the merchant query (`select("*")`) already returns it; pass it
    into `src/components/storefront/store-header-card.tsx` and render a small
    clock-icon badge under the tagline ("🕒 Usually ready in {estimate}") when
    present.
  - Checkout: the checkout page's merchant select must add `delivery_estimate`;
    pass it as a `deliveryEstimate` prop to `CheckoutForm`, which renders a line
    in the Delivery Method block ("Usually ready in {estimate}") when set.
- Pure display; no change to order placement, totals, or analytics.

## Non-goals

- No structured/parsed estimate (free text only); no per-product estimate.
- No new bulk action beyond hide/show; bulk delete unchanged.
- No change to coupon data or sharing beyond the copy button.

## Verification

- `npx tsc --noEmit` + `npm run build` clean.
- Migration applied; `merchants.delivery_estimate` exists (nullable).
- Coupons: Copy button copies the code and shows "Copied!" for 2s on the
  correct row.
- Products: select several → Hide makes them `is_available=false` (verify via
  SQL); Show reverses it; selection clears and list refreshes; delete still
  works.
- Delivery estimate: set "1–2 days" in settings → it persists; storefront header
  shows the badge and checkout shows the line; clearing it removes both.
- Ownership: the PATCH route only affects the caller's own products (scoped by
  merchant_id), mirroring the bulk-delete guarantee.
