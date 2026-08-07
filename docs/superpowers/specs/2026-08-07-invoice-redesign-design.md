# Invoice Redesign — Design

**Date:** 2026-08-07
**Status:** Shipped
**Mockup:** https://claude.ai/code/artifact/a79ea155-9930-40d2-a5e0-5b923598a46d

## Goal

Make the customer invoice read as a document a merchant can hand to a buyer or an
accountant, rather than an app screen. Fix two defects found while reading the
page.

## Two defects fixed

**The invoice date was computed in UTC.** `getUTCDate()` / `getUTCMonth()` /
`getUTCFullYear()` meant an order placed between midnight and 02:00 Namibian time
printed the previous day — on a document treated as the date of supply. A New
Year order would have been dated into the previous tax year.

No existing order was affected: checked against production, every order's UTC and
Namibian calendar dates currently agree. The fix is preventive. The boundary is
pinned in `scripts/check-billing-period.ts`.

**VAT was calculated twice.** The page computed `vatAmount`, `totalExclVat` and
`total` from the merchant's live settings, then immediately recomputed all three
from the order's snapshot, leaving the first block dead. Two competing sums of the
same money on a financial document is where a rounding discrepancy eventually
appears. Collapsed to the single `calculateVatBreakdown` path.

The surviving path was traced against all three cases — not registered, VAT
inclusive, VAT exclusive — and produces identical figures. Verified live: order #7
still shows N$293.32 + N$44.00 VAT = N$337.32, unchanged.

## Design

**One document, printed as-is.** The page previously maintained two copies of the
header and status line — a screen version and a `hidden print:block` version —
which can silently drift apart. There is now one set of markup that prints
directly.

- White sheet, 820px (A4 at 96dpi), on a slate ground. No gradients.
- Masthead: logo (or initial tile), store name, town, WhatsApp number and VAT
  number on the left; document kind, number, issue date and status on the right,
  under a 2px rule.
- **"Tax Invoice"** when the supplier is VAT registered, **"Invoice"** otherwise.
- Billed to / Delivery as labelled blocks.
- Items table with hairline rules and **no zebra striping** — alternating row
  shading is the strongest "web table" signal.
- Totals right-aligned, grand total at 22px above a 2px rule, ex-VAT amount as a
  quiet note beneath.
- "How to pay" in a bordered block, payment reference called out in monospace,
  because an unmatched payment becomes a support problem for the merchant.
- `@page { margin: 14mm }` in `globals.css`; without it the browser stamps its
  own header and footer across the document.

All figures use `tabular-nums` so columns align.

## Not changed

The URL, the data shown, and every payment-method branch (EFT, cash, MTC Maris,
Pay2Cell, PayToday, eWallet). Customers already hold links to these invoices.

## Verification

- `scripts/check-billing-period.ts` — the 00:00–02:00 boundary, month rollover,
  and the year rollover
- Live render of a non-VAT invoice (#1003) and a VAT-registered one (#7), at
  375px and 1280px, with totals compared against the database
- Single `<h1>` (was two), no zebra striping, no horizontal overflow

## Known open question

The footer shows "Powered by OshiCart" on every invoice, including for paid tiers
whose plan removes OshiCart branding elsewhere. Left as-is pending a decision —
see the note raised to the product owner.
