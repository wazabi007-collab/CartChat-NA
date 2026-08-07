# Coupon Templates — Design

**Date:** 2026-08-07
**Status:** Approved

## Goal

Give merchants four ready-made coupons they can start from, instead of facing an
empty form and having to invent a code, a discount, and an expiry date.

## Scope

No migration and no tier gating. The `coupons` table already holds every field
these templates need, and `coupons: true` on all four tiers — including the free
one — so this is available to every merchant.

## The four templates

| Template | Type | Value | Min order | Max uses | Expires | Suggested code |
|---|---|---|---|---|---|---|
| Welcome offer | percentage | 10% | — | — | +30 days | `WELCOME10` |
| Spend and save | fixed | N$20 | N$200 | — | +30 days | `SAVE20` |
| Launch promo | percentage | 20% | — | 50 | +14 days | `LAUNCH20` |
| Delivery on us | fixed | N$30 | N$250 | — | +30 days | `DELIVERY30` |

**"Delivery on us" is an approximation.** The `discount_type` enum has only
`percentage` and `fixed`, so there is no free-delivery discount. It is a flat
N$30 off, and merchants whose delivery fee differs will over- or under-discount.
A true free-delivery coupon needs a new enum value and checkout changes — out of
scope here, and it should not be smuggled in as a template.

## Architecture

**`src/lib/coupon-templates.ts`** — the templates as data, plus a pure
`templateToForm(template, usedCodes, today)` returning the page's existing
`CouponForm` shape. All conversion to display strings happens here, not in the
component, so it can be tested without a browser.

**`src/app/(dashboard)/dashboard/coupons/page.tsx`** — a "Start from a template"
strip of four cards, shown above the coupon list and inside the empty state.
Clicking one calls the existing `openCreate(template)` with seeded values instead
of `emptyForm`.

Nothing is written to the database until the merchant presses Save, so a misclick
costs nothing. Templates are offered on create only, never when editing.

## Two details that would otherwise break it

- **Code collisions.** The page already holds the merchant's coupons in state, so
  `templateToForm` takes the used codes and suffixes on conflict:
  `WELCOME10` → `WELCOME10-2` → `WELCOME10-3`. Without this, applying the same
  template twice produces a duplicate-code save error with no explanation.
- **Expiry dates** use the existing `namibianDateString()` helper, not
  `new Date()`. On Vercel the latter resolves to UTC, so a template applied late
  at night would compute an expiry a day early — the same class of bug fixed in
  the order-quota work.

## Error handling

| Case | Behaviour |
|---|---|
| Template applied twice | Second gets a `-2` suffix on the code |
| All suffixes somehow taken | Falls back to the plain code; the existing save validation surfaces the duplicate |
| Merchant edits values after applying | Normal form behaviour; the template is only a starting point |
| Merchant is editing an existing coupon | Template strip is not shown |

## Verification

- `scripts/check-coupon-templates.ts` — code suffixing, cents-to-display
  conversion, expiry arithmetic, and that every template maps to a valid
  `discount_type`
- Browser: apply a template, save, confirm the coupon appears in the list with
  the right values; apply the same template again and confirm the suffixed code

## Out of scope

- A free-delivery discount type
- Industry-specific templates
- Editing or saving custom templates
