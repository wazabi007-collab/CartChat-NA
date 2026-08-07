# Merchant Statements — Design

**Date:** 2026-08-07
**Status:** Shipped (phase 1 of 2)

## Goal

Give higher-tier merchants a monthly record of every order they can file a VAT
return from, hand to a bookkeeper, or check against their bank.

## The constraint that shaped this

**OshiCart does not record that a payment was received.** `orders` has no
`paid_at`, no amount received, and no payment confirmation. What exists is:

- `status` — pending → confirmed → ready → completed → cancelled
- `status_history` — timestamped `{status, at}` entries
- `proof_of_payment_url` — buyer-uploaded and unverified

So a statement can report what was **invoiced**, not what was **received**.
Partial payments, overpayments, and one transfer covering two orders are all
invisible.

That is enough for VAT returns, business performance, and a bookkeeper pack. It
is **not** true bank reconciliation, so this phase does not claim to be. The
statement footer says so in plain words, and recording payments is phase 2:
a migration adding paid date and amount, plus a "Mark as paid" action in Orders.

Chosen deliberately over treating `completed` as "paid in full on the completion
date", which would produce numbers that look reconcilable and are not.

## Tier gating

`oshi_grow` and `oshi_pro`, matching `CART_RECOVERY_TIERS`. Lower tiers see an
upgrade prompt naming their current plan. Exposed as `hasStatements()` in
`src/lib/tier-limits.ts`.

## Architecture

**`src/lib/statements.ts`** — all the arithmetic, free of Supabase and React so
it can be tested. Exports `orderTotal`, `buildStatement`, `statementToCsv`.

The governing rule: **a statement total must equal the sum of the invoices behind
it.** `orderTotal()` therefore reproduces the invoice calculation exactly —
`subtotal − discount + delivery`, then `+ VAT` only when pricing is
VAT-*exclusive*. Adding VAT to an inclusive order would overstate that
merchant's turnover by 15%; deriving VAT independently here would let statements
and invoices drift apart by rounding.

Cancelled orders are excluded from every total and reported separately, matching
the order-quota rule. Orders with no recorded payment method are grouped as
"Not recorded" rather than dropped, so the payment breakdown still reconciles to
the statement total.

**`src/lib/date.ts`** — `namibianMonthKey`, `namibianMonthRange`,
`recentNamibianMonths`. Periods are Namibian calendar months: an order placed at
00:30 on the 1st belongs to the new month even though UTC still says the
previous one, which would otherwise put a month's takings on the wrong VAT
return.

**`src/app/(dashboard)/dashboard/statements/page.tsx`** — server component. Reads
orders through the service role, because a financial record must include every
order in the period regardless of row-level visibility.

**`statement-controls.tsx`** — month picker, print, and CSV download. The CSV is
generated in the browser from the same array the page rendered, so the
spreadsheet cannot disagree with what the merchant sees.

## The document

Styled to match the customer invoice: white sheet, 2px masthead rule, hairline
table rules, tabular numerals, and the same `@page` margin on print.

Sections: store identity and VAT number; period and generation date; four
summary figures (orders, sales excl. VAT, VAT, total invoiced); breakdowns by
status and by payment method; a totals block; then every order in the period.

## Verification

- `scripts/check-statements.ts` — 19 checks covering the VAT-inclusive vs
  exclusive split, cancelled-order exclusion, the invariant that both breakdowns
  sum to the statement total, null money fields, null payment method, the empty
  period, and CSV quote escaping
- `scripts/check-billing-period.ts` — month-key and range boundaries including
  the local-midnight and year rollovers
- Totals cross-checked against production for July 2026: Octovia Nexus Promo
  N$527.40 + 15% VAT N$79.11 = N$606.51 invoiced

## Not verified

The rendered page. It is behind merchant auth, which this environment cannot
enter, so the layout and the tier gate need a human pass.

## Phase 2 — payment recording

- Migration: `paid_at`, `amount_received_nad`, `payment_recorded_by` on orders
- "Mark as paid" in the order detail screen, capturing date and amount
- Statement gains a Received column and an outstanding balance
- Only then is the word "reconciliation" honest
