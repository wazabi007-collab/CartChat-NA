# OshiCart — Full Platform QA & UI/UX Audit

You are performing a complete QA and UI/UX audit of **OshiCart** (oshicart.com), a
WhatsApp-commerce SaaS for Namibian merchants. Test **every component** listed in
the inventory below, report every bug, and propose concrete UI/UX improvements.

## Context you need

- **Stack:** Next.js 16 App Router, Supabase (Postgres + RLS + SECURITY DEFINER
  RPCs), Tailwind v4, TypeScript. Deployed on Vercel from `master`.
- **Repo:** you have the full codebase. Build with `npm run build`. The repo has
  a regression-check suite: run every `npx tsx scripts/check-*.ts` — all must
  print `ALL PASS`.
- **Money:** all prices are integer cents (NAD). Server-side pricing is law:
  `place_order` (SECURITY DEFINER, canonical copy in `docs/db/place_order.sql`)
  recomputes every amount and ignores client values. VAT is 15%, merchants can
  be VAT-inclusive or exclusive. Rental deposits are payable but OUTSIDE the
  taxable base.
- **Item types:** `product` (stock, variants), `service` (booking calendar with
  session slots; service_mode = in-store / on-site / online), `rental` (date
  range; unit = per **day** [inclusive: 20–22 Aug = 3 days] or per **night**
  [check-out day free: 15→18 = 3 nights]; refundable deposit; turnaround buffer
  days; late fees; required documents; merchant records returns).
- **Tiers:** free trial → Oshi Start → Oshi Automate (300 orders) → Oshi Pro
  (N$799, 12-month statements) → Oshi Storefront (priority placement in Browse
  Stores). Branding/badge gates differ per tier.
- **WhatsApp automations:** order status messages (confirmed → ready [optional
  per merchant] → completed with invoice), payment reminders at 6h and 24h that
  MUST stop when payment is recorded or proof is uploaded, auto-cancel only
  after all reminders, cart recovery, booking reminders, activation/win-back
  nudges. Replies forward to an admin number.
- **Referrals:** agents sign up at /agents (rules acceptance), get `/r/[code]`
  links and a demo store; merchants can enter a code at setup; commissions
  N$75/200/400 by tier.

## Hard rules — this is PRODUCTION

1. **Never** place orders, change settings, or write data on any real merchant
   store. The ONLY store you may transact on is the demo store:
   `oshicart.com/s/oshicart-demo` (merchant "OshiCart Demo Store").
2. Any data you create must have a name containing **"QA (delete me)"** and you
   must list every created row at the end of your report for cleanup.
3. Create your own throwaway merchant account for dashboard testing (signup
   flow is part of the test). Do not use or ask for anyone else's credentials.
4. No load/stress testing, no destructive deletes, no CAPTCHA bypassing, no
   attempts to brute-force auth. Security probes must be read-only or use your
   own QA rows.
5. Do not commit secrets; do not push to `master`.

## Component inventory — test ALL of these

### A. Public marketing & discovery
1. Landing page (`/`): hero live counts, payment trust bar, how-it-works,
   "More than products" section (4 selling modes), storefront gallery, feature
   blocks, pricing, FAQ, CTA bar. Desktop + 375px mobile. Dark-mode artefacts,
   layout breaks, dead links, image weight.
2. `/stores` browse: region/town cascading filters, priority placement for paid
   tiers, store cards, SEO location pages, sitemap entries.
3. `/guide` (merchant guide web version, all ~24 sections) and both PDFs
   (`/oshicart-merchant-guide.pdf`, `/oshicart-referral-agent-handbook.pdf`):
   section numbering sequential, content matches live behaviour (especially
   rentals: day vs night, deposits, buffer, late fees, documents, returns).
4. Referral surfaces: `/r/[code]` redirect, agent signup + rules acceptance,
   agent dashboard, handbook access.
5. WhatsApp/OG share images: og:image on home, store, and product pages renders
   branded cards (no default background), correct dimensions, no WebP.

### B. Storefront & checkout (use demo store only)
6. Storefront `/s/oshicart-demo`: category icons, product cards (price suffix
   "/ day" & "/ night" on rentals), stock badges, cart drawer, add-to-home-screen
   PWA behaviour, store payment methods display.
7. Product pages: variants + SKUs, image gallery, out-of-stock handling,
   service booking entry, rental "You'll need: <documents>" line.
8. Checkout — **run one full order for each item type**:
   a. **Product**: quantity, variants, coupon apply/remove, VAT lines, delivery
      pickup vs store delivery vs Yango/inDrive (courier options must only show
      for Windhoek/Swakopmund/Walvis Bay stores), payment methods incl. proof
      upload and payment reference, WhatsApp submit message contents.
   b. **Service**: month-grid calendar, session slots, blocked days excluded,
      double-booking rejected, on-site vs online wording (online must never say
      "Cash on Delivery" or ask courier questions).
   c. **Rental (day)**: tent — first/last day pickers, live availability check,
      "3 days × N$150 = N$450" line maths, "Refundable deposit" in the summary,
      Total = base + VAT + deposit and identical to the invoice, bring-documents
      note, min/max hire validation, past dates refused.
   d. **Rental (night)**: guest room — "Your stay" / Check-in / Check-out
      wording, 15→18 charges 3 nights, touching stays allowed.
9. Overlap/stock honesty: try to hire more units than exist for overlapping
   dates — checkout must warn and `place_order` must refuse.
10. Order tracking page (token link), invoice page (`/invoice/[orderId]`):
    totals, VAT, deposit line + "refundable on return" footnote; credit note
    page after a refund.

### C. Merchant dashboard (your QA account)
11. Auth: signup, email confirm (`/auth/confirm`), login, logout, password
    reset, setup wizard (returning user must NOT be sent to setup again).
12. Setup: store details, logo upload, payment methods, delivery config,
    referral code entry field.
13. Orders: list + filters, quick status transitions pending → confirmed →
    ready (optional toggle) → completed, cancel + stock restoration, record
    payment, record refund (creates credit note), proof viewer, expandable
    items with hire ranges (day AND night formatting), **Record return** on
    rental lines: assigned unit, return date, condition notes, late-day count
    (day hire late from day after last day; night from day after check-out),
    suggested late fee, deposit-refund hint.
14. Products: create/edit each item type; product forms show correct fields per
    type; rental card: charged per day/night, deposit N$, days between hires,
    late fee, required documents — and values survive an edit round-trip.
    Booking/session settings wording appropriate for products vs services.
15. Bookings calendar: merchant month view, block-out days, session-time
    generator.
16. Analytics, Customers, Statements (12-month statement on Pro; deposit
    included in order totals), Coupons.
17. Settings: store, payments (bank details, eWallet providers), delivery fees
    and providers, VAT number + inclusive toggle, "Ready" step toggle.
18. Subscription/tier screens: correct pricing, caps (Automate 300 orders),
    upgrade paths, feature gating visible.
19. Mobile: the ENTIRE dashboard at 375px width — nav, tables, forms, modals.

### D. Cross-cutting
20. Security (non-destructive, QA data only):
    - Tamper with client-side price/total in a checkout request → stored order
      must show server-computed amounts.
    - As logged-out visitor and as your QA merchant, attempt to read another
      merchant's orders/customers/statements via the REST API → must fail.
    - Attempt UPDATE on `order_items` money columns as your merchant → must be
      rejected (only `assigned_unit`, `returned_at`, `return_notes` are
      writable, and only on your own orders).
    - Invoice and credit-note pages: confirm no PII leaks for guessed IDs.
21. Accessibility: keyboard navigation through checkout and product forms,
    focus states, alt text, contrast on primary buttons/badges.
22. Performance: Lighthouse on landing, storefront, and a product page (mobile);
    flag images > 300KB, CLS, and blocking scripts.
23. Copy: Namibian English consistency (N$ formatting, "licence", WhatsApp
    tone), no lorem ipsum, no dev artefacts.
24. Empty/edge states: brand-new store with zero products, order list empty
    state, expired coupon, deleted-product order lines, very long product
    names, 1-cent prices.

## Deliverable

Produce `QA-REPORT.md` with:

1. **Executive summary** — overall health, top 5 issues.
2. **Bug table** — for every bug: ID, severity (P0 data-loss/money/security,
   P1 broken flow, P2 degraded UX, P3 cosmetic), component, exact repro steps,
   expected vs actual, screenshot reference, suggested fix location
   (file:line where you can).
3. **UI/UX improvements** — ranked list; each with the problem, the evidence
   (heuristic or screenshot), and a concrete proposal. Cover: first-run
   merchant experience, checkout friction, mobile ergonomics, trust signals.
4. **Security findings** — every probe you ran and its result, including passes.
5. **Coverage checklist** — the full inventory above with pass/fail/blocked
   status per item. Nothing may be left untested without a stated reason.
6. **Cleanup list** — every QA row you created (store, products, orders,
   bookings) so it can be deleted.

Work through the inventory in order, keep screenshots for anything you flag,
and prefer facts over speculation: if you suspect a bug, reproduce it twice
before reporting.
