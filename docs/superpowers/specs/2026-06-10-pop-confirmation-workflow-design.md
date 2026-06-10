# Merchant POP Confirmation Workflow + POP-Required Setting — Design

**Date:** 2026-06-10
**Scope:** chatcart-na (Next.js + Supabase)

## Problem

Proof-of-payment (POP) upload exists on the buyer side — checkout uploads to the
private `order-proofs` bucket via `/api/orders/upload-pop`, stores the storage
path in `orders.proof_of_payment_url`, and alerts the merchant on WhatsApp
(`proof_uploaded_merchant`). But:

1. The merchant orders dashboard never displays the proof — no indicator, no
   preview, nothing to act on.
2. Checkout labels the upload "Proof of Payment (optional)" for every store,
   even ones whose whole flow depends on receiving proof (EFT-heavy Namibian
   sellers).

## Decisions (made with user)

- **Confirm model:** Reuse the existing order Confirm (`pending → confirmed`
  via `append_order_status` RPC). Confirming the order IS confirming payment.
  No separate `payment_status` column. The existing `order_confirmed` WhatsApp
  template to the customer fires unchanged; no new template.
- **Enforcement model:** Soft-require. Keep the order-then-upload flow; "POP
  required" blocks checkout submission client-side until a file is attached and
  changes the copy. Orders are still created first; the upload attaches to the
  order ID as today.
- **EFT only:** The requirement applies ONLY to `eft` (bank transfer). Instant
  mobile-wallet methods — `pay2cell`, `ewallet`, `momo` (FNB eWallet/Pay2Cell,
  Bank Windhoek, Nedbank mobile payments) — notify the merchant directly, so
  they are exempt, as are `cod` and `dpo`. For exempt methods the upload stays
  available as "(optional)" exactly as today.

## Design

### 1. Database — migration `supabase/migrations/038_pop_required.sql`

- `ALTER TABLE merchants ADD COLUMN pop_required boolean NOT NULL DEFAULT false;`
- No changes to `orders` (`proof_of_payment_url` already exists).
- Update `src/types/database.ts` merchant type with `pop_required`.
- Ensure the storefront/checkout merchant-config query selects `pop_required`.

### 2. Merchant settings toggle

In `src/app/(dashboard)/dashboard/settings/page.tsx`, payments section, add a
"Require proof of payment for EFT" toggle following the existing
`vat_inclusive` pattern. Helper copy: customers paying by bank transfer (EFT)
must upload proof before completing checkout; instant mobile payments
(eWallet, Pay2Cell, MoMo) and Cash on Delivery are not affected. Persisted
with the existing settings save path.

### 3. Checkout enforcement — `src/app/checkout/[slug]/checkout-form.tsx`

When `merchant.pop_required` is true AND selected payment method is `eft`:

- Upload label reads **"Proof of Payment (required)"**; remove "optional"
  phrasing for this store.
- Block order submission until a file is attached (client-side validation;
  existing server-side file validation in `/api/orders/upload-pop` unchanged).
- If order creation succeeds but the proof upload fails, show a retry prompt
  for the upload; do not proceed to the success state silently. The order
  remains visible to the merchant as awaiting proof.

When the toggle is off, or the method is anything other than EFT, behavior is
identical to today (upload offered as optional where it is offered now).

**Implementation deviation (verified during build):** the `order-proofs`
bucket has no INSERT policy (RLS hardening, migration 033), so the original
direct client upload at checkout always failed with 400 — a pre-existing
production bug that aborted any order with a proof attached. Checkout now
places the order first, then uploads via the service-backed
`/api/orders/upload-pop` route (the same path the tracking page uses), and
shows a warning on the success screen if the upload fails. Switching to COD
clears a previously selected proof file. Proof inputs accept `image/*,.pdf`.

### 4. Merchant orders dashboard — proof preview + one-click confirm

`src/app/(dashboard)/dashboard/orders/page.tsx` + `order-actions.tsx`:

- **Badge per order:**
  - Green "Proof uploaded" when `proof_of_payment_url` is set.
  - Amber "Awaiting proof" when the store has `pop_required`, the order's
    payment method is `eft`, and no proof is attached.
  - No badge otherwise.
- **Proof preview** in order detail: server-side signed URL (short-lived)
  generated from the stored path for the owning merchant. Images render as an
  inline thumbnail that opens full-size in a new tab; PDFs render as a labeled
  "View proof (PDF)" link. Missing/expired storage objects render a
  "Proof unavailable" state, never a broken image.
- **One-click confirm:** the existing Confirm action; when a proof is attached
  the button label reads **"Confirm payment"** (same transition, same dialog,
  same `order_confirmed` WhatsApp to the customer).

### 5. Security & error handling

- `order-proofs` bucket stays private; RLS already scopes objects to the
  owning merchant. Signed URLs are generated server-side only.
- Signed URL TTL: 1 hour (preview is generated per page load; no long-lived
  links in HTML).
- Upload route validation (file type/size, WhatsApp match) unchanged.

## Non-goals

- No separate payment_status lifecycle.
- No new WhatsApp templates.
- No admin-side POP review, no buyer-side proof replacement UI.
- No hard pre-order proof gate.

## Verification

- Build + typecheck clean.
- Manual Playwright pass on local dev:
  1. Toggle on in settings → persists after reload.
  2. Checkout (EFT) shows "required" label and blocks submit without a file.
  3. Checkout with COD, eWallet, Pay2Cell, or MoMo ignores the requirement
     (still shows "(optional)" where offered).
  4. Place order with proof → merchant order shows green badge + preview;
     image opens full-size.
  5. "Confirm payment" moves order to confirmed; `whatsapp_messages` row for
     `order_confirmed` is created.
  6. Toggle off → checkout shows "(optional)" as today.
