# OshiCart — QA Round 2: regression, new features, and perceived speed

You are re-auditing **OshiCart** (oshicart.com), a Namibian WhatsApp-commerce
SaaS. A full audit was run earlier today and produced 25 findings; most were
fixed and a large amount of new work shipped on top. This round has three
jobs, in priority order:

1. **Verify the 25 previous findings are actually fixed** (regression pass)
2. **Test everything built since**, listed below — much of it is untested by a human
3. **Measure whether the platform feels faster**, against the recorded baseline

Report bugs *and* UI/UX improvements, as before.

---

## Context you need

- Next.js 16 App Router, Supabase (RLS + column grants + SECURITY DEFINER RPCs),
  Tailwind v4, TypeScript. Deploys from `master` on Vercel.
- Build with `npm run build`. There are **16 regression check scripts**:
  run every `npx tsx scripts/check-*.ts` — all must print `ALL PASS`.
  Read a few; they encode real past incidents and explain the traps.
- **Money is integer cents.** Server-side pricing is law: `place_order`
  (SECURITY DEFINER, canonical copy `docs/db/place_order.sql`) recomputes every
  amount and ignores client values. VAT 15%, per-merchant inclusive or exclusive.
  Rental deposits are payable but **outside** the taxable base.
- **Item types:** `product`, `service` (booking calendar; in-store / on-site /
  online), `rental` (date range; **per day** = inclusive, 20–22 Aug is 3 days;
  **per night** = check-out day free, 15→18 is 3 nights).

### Safety rules — this is PRODUCTION

1. Transact **only** on the demo store `oshicart-demo`. Never place orders,
   change settings, or write data on any other merchant.
2. Name every row you create with **"QA2 (delete me)"** and list them all at the
   end for cleanup.
3. Create your own throwaway merchant account. **Never ask for or use anyone
   else's credentials.**
4. Email testing: the mail provider rejects `@example.com`. Use
   `delivered@resend.dev` (Resend's test address — accepted, delivered to nobody).
5. No load testing, no destructive deletes, no CAPTCHA bypass, no pushing to
   `master`, no committing secrets.
6. If you find something that would harm a real merchant or customer, stop and
   report it rather than exercising it.

---

## Part 1 — Regression pass on the previous 25 findings

For each, confirm fixed / still broken / partially fixed. Be specific.

| ID | What was wrong |
|---|---|
| QA-001 | Online services said "Cash on Delivery" and "Collection" in WhatsApp + invoice |
| QA-002 | Signup marked emails confirmed without proof (now: real confirmation flow) |
| QA-003 | Approved agents had no dashboard — application was a dead end |
| QA-004 | Night rentals showed "/ day" on storefront cards |
| QA-005 | Night-rental checkout asked pickup/delivery and "Collect from" |
| QA-006 | Cart drawer rendered two identical "Subtotal" rows |
| QA-007 | Guide contents list stale; links from entry 9 pointed at wrong sections |
| QA-008 | Browse Stores had no town filter |
| QA-009 | Product links unfurled as the store card or a raw photo at wrong dimensions |
| QA-010 | Referral trial length said 35 days in one place, 30 in another |
| QA-011 | Two different support phone numbers across the site |
| QA-012 | Brand green 3.70:1 on white (below WCAG AA); low-stock badge 2.89:1 |
| QA-013 | Image-only product links and the sort select had no accessible name |
| QA-014 | Mobile LCP 4.8s home / 4.1s storefront / 3.8s product |
| QA-015 | Past hire dates still reported "Available" with Place Order enabled |
| QA-016 | PDF guide page 8 clipped (reported; may not reproduce) |
| QA-017 | Next prefetched the handbook PDF and logged a 404 |
| QA-018 | Footer heading-order accessibility failure |
| QA-019 | Stale Playwright marketing assertions |
| QA-020 | **P0** Settings forced `vat_inclusive = false` on every save |
| QA-021 | Rental WhatsApp/invoice omitted hire dates; deposit note hidden for non-VAT |
| QA-022 | Password recovery 500 — **this was NOT a bug** (test used @example.com). Confirm recovery works with a real address |
| QA-023 | Rental form helper always said "per night"; price label always "per day" |
| QA-024 | **P1** Orders page redirected every configured merchant to Setup |
| QA-025 | Account page overflowed horizontally at 375px |

---

## Part 2 — New work, largely untested by a human

### A. Email confirmation (NEW — highest risk, it gates all signups)
- Sign up → you should get a **"Check your email"** screen, not a session.
- Confirm via the emailed link → session established, lands in setup.
- **Critical:** sign up via `/signup?ref=<code>&tier=oshi_grow`. After confirming,
  the tier AND referral code must still be attached. If the code is lost, agents
  lose commission silently.
- Try to sign in **before** confirming → must offer a resend, not a raw error.
- Resend button; wrong-address "Start again"; duplicate email → friendly 409.

### B. Dashboard reachability (regression-critical)
Every dashboard route previously redirected to Setup on any query error. Sign in
as a **fully configured** merchant and open **all** of: dashboard, orders,
products, products/import, analytics, customers, statements, reviews, share,
broadcast, subscription, coupons, bookings, settings, account. **None** may
bounce to Setup.

### C. Rentals — full lifecycle
- **Day hire**: first/last day inclusive, live availability, deposit line,
  total = base + VAT + deposit and identical to the invoice.
- **Night stay**: "Your stay", Check-in/Check-out, 15→18 = 3 nights, touching
  stays allowed, no delivery questions, "Cash at check-in".
- **Turnaround buffer**: a hire blocks its buffer days on both sides.
- **Deposits**: not taxed, not in subtotal, shown as refundable on the invoice.
- **Hirer ID capture (NEW)**: tick "Ask for the hirer's ID number" on a rental
  product → checkout demands it (whitespace must not pass, >40 chars refused),
  merchant sees it on the order line. It must appear **nowhere** customer-facing:
  not the invoice, tracking page, credit note, or WhatsApp message. Recording the
  return offers to delete it, ticked by default.
- **Record return (NEW)**: unit/asset tag, return date, condition notes,
  unit-aware late-day count, suggested late fee, deposit-refund guidance.
  A day hire due back the 12th returned on the 12th = 0 days late; on the 15th = 3.

### D. Referral agents (NEW)
- `/agents` application → rules → pending state.
- `/agents/dashboard`: signed-out, not-linked, pending, rejected, approved states.
- **Practice store**: an approved, linked agent taps "Create my practice store" →
  gets their own store seeded with a product, a service and a hire. Verify it is
  **absent from Browse Stores**, that pressing the button twice is idempotent,
  and that an agent who already owns a real store is told so instead.
- **Security (important):** an agent must see only their own referrals,
  commissions and stores. Try to read another agent's rows via the REST API.
  `referrers.payout_number` (bank account), `whatsapp`, `email` and `notes` must
  be unreadable. Confirm from the API, not just the UI.

### E. Demo/practice store isolation (NEW)
- Practice stores (`is_demo = true`) must not appear in Browse Stores.
- Their orders must never trigger payment reminders, auto-cancel, stale-order
  alerts, low-stock alerts or cart recovery. Inspect the cron code and reason
  about it; do not wait 24 hours.
- Practice orders older than 30 days are purged by the reminders cron.

### F. VAT (the P0 area — treat with suspicion)
- Settings now has an explicit **"Prices exclude VAT" / "Prices already include
  VAT"** choice. Set inclusive, save an **unrelated** setting, reload: the choice
  must survive. Then check a checkout and invoice in **both** modes and confirm
  the arithmetic differs correctly and totals match between the two documents.

### G. Everything else changed today
Town filter on Browse Stores (including a stale `?region=x&town=y` pair),
product share cards (1200x630, with and without a photo), contrast, route
loading skeletons, guide contents (24 sections, every link lands on its own
heading), both PDFs.

---

## Part 3 — Speed and perceived responsiveness

The previous audit recorded these on **mobile Lighthouse**. Re-run the same way
and report before → after:

| Page | Perf | LCP | TBT | CLS |
|---|---|---|---|---|
| Home | 70 | **4.8s** | 120ms | 0 |
| Storefront `/s/oshicart-demo` | 72 | **4.1s** | 160ms | 0.057 |
| Product page | 80 | **3.8s** | 140ms | 0 |

Changes made since: homepage counts cached (were two uncached DB queries before
first byte, one fetching every store just to count it); below-fold payment logos
lazy-loaded (preload count on home went 11 → 5, measured); route-level loading
skeletons added where there were **none**; a mutation button that dropped its
pending state early was fixed.

**Also test perceived responsiveness explicitly — this is a specific complaint
that buttons felt "clunky and buggy":**
1. Click between dashboard tabs. Does something appear immediately (a skeleton),
   or does the screen sit frozen on the old page? Time it.
2. Advance an order's status. The pill should stay in a pending state until the
   new status is really on screen — it must **not** flick back to the old status
   and then change again.
3. Submit forms (settings save, product save, record payment). Is there immediate
   feedback? Can you double-submit?
4. Note any control that responds in **>300ms with no visual acknowledgement** —
   that is the actual bug class being chased.

Report LCP honestly even if it did not improve. Identify the LCP element per page.

---

## Deliverable

`QA-REPORT-2.md`:

1. **Executive summary** — is it release-ready? Top 5 issues.
2. **Regression table** — all 25 prior findings: fixed / not fixed / partial, with evidence.
3. **New bugs** — ID, severity (P0 money/data/security, P1 broken flow, P2 degraded UX,
   P3 cosmetic), component, exact repro, expected vs actual, screenshot, suggested fix
   location (`file:line` where you can).
4. **Performance** — the before/after table, LCP element per page, and a verdict on
   whether interactions feel immediate now.
5. **UI/UX improvements** — ranked, each with problem, evidence, concrete proposal.
6. **Security findings** — every probe and its result, including passes.
7. **Coverage checklist** — Parts 1–3 with pass/fail/blocked. Nothing untested without a stated reason.
8. **Cleanup list** — every row you created.

Work in order, screenshot anything you flag, and reproduce a suspected bug twice
before reporting it. Where you cannot test something, say so plainly rather than
assuming it works.
