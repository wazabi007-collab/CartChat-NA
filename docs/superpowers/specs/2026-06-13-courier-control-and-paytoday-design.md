# Merchant Courier Control, PayToday Method & Courier Copy — Design

**Date:** 2026-06-13
**Scope:** chatcart-na (Next.js 16 + Supabase). Three related enhancements to the
checkout/settings surface, sharing `src/lib/constants.ts`, the settings page,
`checkout-form.tsx`, the checkout page loader, and the `merchants` table.

## Features

### 1. Merchant-side delivery courier control
Today checkout always shows all three delivery providers (Store / Yango /
inDrive), hardcoded in `DELIVERY_PROVIDERS` (`checkout-form.tsx:113`). Merchants
can't opt out of a courier. Add a per-merchant enabled set.

- **Storage:** new column `merchants.enabled_delivery_providers text[]` default
  `'{store,yango,indrive}'` (all enabled → existing merchants unchanged).
- **Settings** (`settings/page.tsx`): a new "Delivery options" block beneath the
  Delivery Fee card — three checkboxes (Store delivery / Yango / inDrive) bound
  to the array. **Guard:** at least one must remain checked; saving with zero
  selected is blocked (inline error, no save).
- **Checkout loader** (`checkout/[slug]/page.tsx`): add
  `enabled_delivery_providers` to the merchant `.select(...)`, pass to
  `CheckoutForm` as `enabledDeliveryProviders` (default `["store","yango","indrive"]`).
- **Checkout form** (`checkout-form.tsx`): filter `DELIVERY_PROVIDERS` to the
  enabled set before rendering the Delivery Handling radios. The default
  `deliveryProvider` state becomes the first enabled provider (not always
  `"store"`); if the currently-selected provider is filtered out, fall back to
  the first enabled one. Pickup is unaffected — this controls only the delivery
  courier choices. (No "offer delivery at all" master toggle — out of scope.)
- **No orders-table change.** `orders.delivery_provider` still snapshots the
  buyer's choice.

### 2. Tighten "buyer books courier" copy (code-only, no Meta re-approval)
Make the merchant-facing wording explicit that the merchant only prepares the
parcel; the buyer books AND pays the courier.

- **WhatsApp `deliveryLine`** (`api/orders/announce/route.ts`): the
  `deliveryProviderLabel` map values change to:
  - `yango: "Yango (buyer books & pays courier)"`
  - `indrive: "inDrive (buyer books & pays courier)"`
  (store/pickup unchanged.) This is a template *variable value* — no WhatsApp
  template re-approval needed.
- **Dashboard order label** (`(dashboard)/dashboard/orders/page.tsx`): the
  `deliveryProviderLabel` map values change to
  `"Yango — buyer books & pays courier"` / `"inDrive — buyer books & pays courier"`.
- **Order notes** (`checkout-form.tsx` `courierNote`, ~line 277): append
  `" Prepare the parcel for courier pickup."` to the existing note.
- The buyer-facing blue info box (`checkout-form.tsx:977`) already states this
  correctly — leave it.
- The invoice label (`invoice/[orderId]/page.tsx`) already reads
  "Yango courier - paid by buyer directly" — leave it (already clear).

### 3. Promote PayToday to its own top-level payment method
PayToday is a standalone app, currently buried as an eWallet provider option.
Make it a first-class method with its own number, mirroring the Pay2Cell
pattern.

- **Constants** (`constants.ts`):
  - Add to `PAYMENT_METHODS`: `{ value: "paytoday", label: "PayToday", icon: "⚡" }`
    (placed after `pay2cell`).
  - Remove the `paytoday` entry from `EWALLET_PROVIDERS` (no longer a dropdown
    option).
- **Types** (`types/database.ts`): add `"paytoday"` to the `PaymentMethod`
  union; remove `"paytoday"` from the `EwalletProvider` union.
- **Storage:** new column `merchants.paytoday_number text` default null.
- **Settings** (`settings/page.tsx`): form field `paytoday_number` (load/save
  like `pay2cell_number`); a conditional input shown when `paytoday` is in
  `accepted_payment_methods` ("PayToday Number", same styling as Pay2Cell).
- **Checkout loader**: add `paytoday_number` to `.select(...)`, pass
  `paytodayNumber={merchant.paytoday_number ?? null}`.
- **Checkout form**: prop `paytodayNumber`; a payment-instructions block when
  `paymentMethod === "paytoday"` mirroring the Pay2Cell block ("Send {total} via
  PayToday to: {paytodayNumber}", with a "Contact the merchant…" fallback when
  null; proof upload applies as for other instant methods).

## Migration (one file, needs explicit prod approval)

`supabase/migrations/044_delivery_providers_and_paytoday.sql`:
```sql
ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS enabled_delivery_providers text[] NOT NULL DEFAULT '{store,yango,indrive}',
  ADD COLUMN IF NOT EXISTS paytoday_number text DEFAULT NULL;

-- Backfill: move merchants who used PayToday-as-eWallet to the new method.
UPDATE public.merchants
SET paytoday_number = ewallet_number,
    accepted_payment_methods = array_replace(accepted_payment_methods, 'ewallet', 'paytoday'),
    ewallet_provider = NULL,
    ewallet_number = NULL
WHERE ewallet_provider = 'paytoday';
```
Applied to prod by the orchestrator after user approval (subagents must NOT
apply it). `src/types/database.ts` merchants Row/Insert/Update gain
`enabled_delivery_providers: string[]` and `paytoday_number: string | null`.

## Non-goals
- No "disable delivery entirely / pickup-only" toggle.
- No change to how `delivery_provider` is stored on orders.
- No change to the WhatsApp template structure (only a variable value string).
- `dpo` (existing unused `PaymentMethod`) left as-is.

## Verification
- `npx tsc --noEmit` + `npm run build` clean.
- Migration applied to prod (column exists; backfill ran — verify via SQL).
- QA merchant (Playwright `loginAsMerchant`):
  - Settings shows the 3 delivery-option checkboxes and the PayToday field
    (when PayToday enabled); unchecking all couriers blocks save.
  - Disable Yango in settings → checkout (preview) shows only Store + inDrive.
  - Enable PayToday + set a number → checkout shows PayToday method with the
    number in instructions.
- Place a QA delivery order with Yango → dashboard label + (if testable)
  WhatsApp line read "buyer books & pays courier".
- Reset QA state afterward.
