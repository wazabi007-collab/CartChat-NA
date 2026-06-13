# Merchant Courier Control, PayToday Method, Courier Copy & Payment-Label Consistency — Design

**Date:** 2026-06-13
**Scope:** chatcart-na (Next.js 16 + Supabase). Four related enhancements to the
checkout / settings / onboarding / public surfaces, sharing
`src/lib/constants.ts`, the settings + setup pages, `checkout-form.tsx`, the
checkout + invoice loaders, the landing components, and the `merchants` table.

## Features

### 1. Merchant-side delivery courier control
Checkout always shows all three delivery providers (Store / Yango / inDrive),
hardcoded in `DELIVERY_PROVIDERS` (`checkout-form.tsx:113`). Add a per-merchant
enabled set.

- **Storage:** new column `merchants.enabled_delivery_providers text[]` default
  `'{store,yango,indrive}'` (all enabled → existing merchants unchanged).
- **Settings** (`(dashboard)/dashboard/settings/page.tsx`): a "Delivery options"
  block beneath the Delivery Fee card — three checkboxes (Store delivery /
  Yango / inDrive) bound to the array. **Guard:** at least one must stay checked;
  saving zero is blocked (inline error, no save).
- **Setup wizard** (`(dashboard)/dashboard/setup/page.tsx`): same three
  checkboxes in the delivery step (default all on), saved to the new column.
- **Checkout loader** (`checkout/[slug]/page.tsx`): add
  `enabled_delivery_providers` to the merchant `.select(...)`, pass to
  `CheckoutForm` as `enabledDeliveryProviders` (default all three).
- **Checkout form** (`checkout-form.tsx`): filter `DELIVERY_PROVIDERS` to the
  enabled set before rendering the Delivery Handling radios. The default
  `deliveryProvider` becomes the first enabled provider (not always `"store"`);
  if the selected provider isn't enabled, fall back to the first enabled. Pickup
  is unaffected (no "offer delivery at all" master toggle — out of scope).
- **No orders-table change.** `orders.delivery_provider` still snapshots choice.

### 2. Tighten "buyer books courier" copy (code-only, no Meta re-approval)
Make it explicit the merchant only prepares the parcel; the buyer books AND pays.

- **WhatsApp `deliveryLine`** (`api/orders/announce/route.ts`): map values →
  `yango: "Yango (buyer books & pays courier)"`,
  `indrive: "inDrive (buyer books & pays courier)"` (store/pickup unchanged). A
  template *variable value* — no WhatsApp template re-approval needed.
- **Dashboard order label** (`(dashboard)/dashboard/orders/page.tsx`): →
  `"Yango — buyer books & pays courier"` / `"inDrive — buyer books & pays courier"`.
- **Order notes** (`checkout-form.tsx` `courierNote`, ~line 277): append
  `" Prepare the parcel for courier pickup."`.
- Buyer-facing blue info box (`checkout-form.tsx:977`) already correct — leave.

### 3. Promote PayToday to its own top-level payment method
PayToday is a standalone app, currently buried as an eWallet provider option.
Make it first-class, mirroring the Pay2Cell pattern, end to end.

- **Constants** (`constants.ts`): add `{ value: "paytoday", label: "PayToday",
  icon: "⚡" }` to `PAYMENT_METHODS` (after `pay2cell`); remove the `paytoday`
  entry from `EWALLET_PROVIDERS`.
- **Types** (`types/database.ts`): add `"paytoday"` to `PaymentMethod`; remove
  `"paytoday"` from `EwalletProvider`; add merchants Row/Insert/Update
  `paytoday_number: string | null` and `enabled_delivery_providers: string[]`.
- **Storage:** new column `merchants.paytoday_number text` default null.
- **Settings + Setup wizard**: form field `paytoday_number` (load/save like
  `pay2cell_number`); conditional "PayToday Number" input shown when `paytoday`
  is in `accepted_payment_methods`.
- **Checkout loader**: add `paytoday_number` to `.select(...)`, pass
  `paytodayNumber={merchant.paytoday_number ?? null}`.
- **Checkout form**: prop `paytodayNumber`; a payment-instructions block when
  `paymentMethod === "paytoday"` mirroring Pay2Cell ("Send {total} via PayToday
  to: {number}", "Contact the merchant…" fallback when null; proof upload as for
  other instant methods).
- **Buyer invoice** (`invoice/[orderId]/page.tsx`): add `paytoday_number` to its
  `.select`, render a PayToday payment row when `payment_method === "paytoday"`.

### 4. Payment-label consistency (public site + shared helpers)
Several places hardcode their own payment-method / eWallet label maps, which is
why "MoMo" lingered and why pay2cell/paytoday render raw in some views. Add
shared helpers and use them; fix remaining public copy.

- **Shared helpers** in `constants.ts`:
  - `getPaymentMethodLabel(value: string): string` — from `PAYMENT_METHODS`.
  - `getEwalletProviderLabel(value: string | null): string` — from
    `EWALLET_PROVIDERS` (fallback `"eWallet"`).
- **Replace duplicated maps** with the helpers:
  - `invoice/[orderId]/page.tsx` `paymentMethodLabel` (missing pay2cell/paytoday)
    + `ewalletLabel` (missing bluewallet/nedbank_money).
  - `(dashboard)/dashboard/orders/page.tsx:188` ternary (currently maps
    pay2cell/paytoday → "EFT" wrongly).
  - `(dashboard)/dashboard/subscription/page.tsx:40` map.
  - `checkout-form.tsx` local `getEwalletLabel` → import the shared helper.
- **Complete the MTC Maris rename** in remaining copy (still says MoMo):
  - `landing/how-it-works.tsx:34`, `landing/faq.tsx:12`, `terms/page.tsx:40`,
    `layout.tsx` keyword `"MoMo Namibia"` → `"MTC Maris Namibia"`,
    `invoice` momo label (via helper).
- **Public payment trust bar** (`landing/payment-trust-bar.tsx`): add
  `MTC Maris` to the `METHODS` list so the public set is complete (currently
  PayToday / EFT / Pay2Cell / eWallet / COD). (Trust bar still uses lucide icons
  — the homepage icon revamp was reverted; do NOT reintroduce it here.)

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
apply it).

## Non-goals
- No "disable delivery entirely / pickup-only" toggle.
- No change to `orders.delivery_provider` storage.
- No WhatsApp template structure change (only a variable value string).
- No homepage icon/font revamp (reverted earlier — leave the trust bar's lucide
  icons).
- `dpo` (unused `PaymentMethod`) left as-is.

## Verification
- `npx tsc --noEmit` + `npm run build` clean.
- Migration applied to prod (both columns exist; backfill ran — verify via SQL).
- QA merchant (Playwright `loginAsMerchant`):
  - Settings + setup show the 3 delivery-option checkboxes and the PayToday
    field; unchecking all couriers blocks save.
  - Disable Yango → checkout (preview) shows only Store + inDrive.
  - Enable PayToday + set a number → checkout + invoice show PayToday with the
    number; a paytoday order's invoice renders the PayToday row.
  - Place a QA Yango delivery order → dashboard label + WhatsApp line read
    "buyer books & pays courier".
- Public site: how-it-works, FAQ, terms, trust bar show "MTC Maris" (no "MoMo");
  trust bar lists MTC Maris.
- Reset QA state afterward.
