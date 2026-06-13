# Courier Pickup Address — Design

**Date:** 2026-06-13
**Scope:** chatcart-na. Extends the just-built courier-control feature. With
Yango/inDrive the BUYER books the courier, so they need the merchant's **pickup
address** to tell the driver where to collect. Add a merchant pickup-address
field and surface it at checkout.

## Storage
New column `merchants.pickup_address text` default NULL — migration `045`.
Types: merchants Row `pickup_address: string | null`, Insert/Update optional.
No backfill (no address data exists). No orders-table change (it's the
merchant's static address; checkout reads `merchant.pickup_address`).

## Merchant side — settings + setup wizard
- A **"Pickup address"** `<textarea>` shown when `enabled_delivery_providers`
  includes `"yango"` OR `"indrive"` (i.e. a buyer-booked courier is offered).
  Helper text: "Where Yango/inDrive couriers collect orders. Buyers see this to
  book the driver."
- **Required when a courier is enabled** (decision): on save, if
  (`yango` or `indrive` enabled) AND pickup address is blank → block with an
  inline error ("Add a pickup address so Yango/inDrive couriers know where to
  collect."), alongside the existing "≥1 delivery option" guard.
  - **Settings** (`(dashboard)/dashboard/settings/page.tsx`): form state
    `pickup_address: ""`; load `merchant.pickup_address || ""`; save
    `pickup_address: form.pickup_address.trim() || null`; field inside the
    Delivery Fee card under the courier checkboxes; guard before `.update`.
  - **Setup wizard** (`(dashboard)/dashboard/setup/page.tsx`): form default
    `pickup_address: ""`; `.insert` `pickup_address: form.pickup_address.trim() || null`;
    field in the delivery step (gated by `offersDelivery` + a courier enabled);
    gate the final submit so it can't complete with a courier enabled and a
    blank pickup address (match the existing submit `disabled=` / validation).

## Buyer side — checkout
- **Loader** (`checkout/[slug]/page.tsx`): add `pickup_address` to the merchant
  `.select(...)`; pass `pickupAddress={merchant.pickup_address ?? null}`.
- **Checkout form** (`checkout-form.tsx`): new prop `pickupAddress: string | null`.
  Show a pickup-address block in the delivery section when:
  - **buyer-paid courier** (`deliveryMethod === "delivery"` and provider is
    yango/indrive): a highlighted block —
    *"Pickup address — give this to your {Yango|inDrive} driver:"* + the address.
    If `pickupAddress` is null (e.g. a merchant who hasn't set it yet — existing
    merchants default to couriers enabled with no address), show the graceful
    fallback *"Contact the merchant for the pickup address."*
  - **pickup method** (`deliveryMethod === "pickup"`): if `pickupAddress` is set,
    show *"Collect from:"* + the address; if null, omit the block (no fallback
    noise — pickup-only merchants aren't required to set it).
  - Also surface it in the order-success confirmation view for buyer-paid
    courier orders (the buyer references it to book the courier after ordering),
    using the same address text.

## Non-goals
- No orders/invoice/WhatsApp-template changes (the address is shown live at
  checkout + on the success view; no template re-approval).
- No separate "store address" concept — this single field serves courier pickup
  and the Pickup method.

## Verification
- `npx tsc --noEmit` + `npm run build` clean.
- Migration 045 applied to prod (column exists).
- QA merchant (temporarily active): set a pickup address with Yango enabled →
  checkout with Yango selected shows the pickup address + driver instruction;
  Pickup method shows "Collect from"; settings/setup block save when a courier
  is enabled but the address is blank. Reset QA state after.
