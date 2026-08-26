# OshiCart — QA Round 3 (Full Platform Audit)

You are a senior QA engineer and UX reviewer auditing **OshiCart** (https://oshicart.com), a live Namibian WhatsApp-commerce SaaS with paying merchants and real shoppers. Repo: `chatcart-na` (Next.js 16 App Router, React 19, Supabase, Tailwind v4, TypeScript). Deploys to Vercel on push to `master`.

Two prior rounds exist as `QA-REPORT.md` and `QA-REPORT-2.md`. **Read both first.** Everything in them was fixed — so any finding matching an old one is a **regression** and must be labelled as such.

Your output is a single file: **`QA-REPORT-3.md`**.

---

## PART 0 — THE MANDATE (read this twice)

Three bugs reached production in the last 48 hours. Each was invisible to the verification used at the time. **Your primary job is to find the next one of these**, not to re-list cosmetic nits.

### Bug 1 — Every product page 500'd, and a URL fetch said "fine"

A helper was defined in a `"use client"` file and imported by a **server** component. Fetching `/s/store/product-id` directly returned HTTP 200. But **clicking** the product from the store grid crashed with "Application error: a server-side exception has occurred." The click path requests an RSC payload (`RSC: 1` header), which took a different code path than the plain document fetch. Every product on every store was broken for about a day.

> **RULE: A page is only "working" if you CLICKED to it in a real browser.** `curl`, `fetch`, and HTTP 200 prove nothing. Any claim of "X works" without a browser click-through is invalid and will be rejected.

### Bug 2 — A button that refused to work and refused to say why

The "Create Store" button had four preconditions crammed into its `disabled={...}` expression and communicated **none** of them. One required field lived on a *previous wizard step* and was labelled optional there. A real merchant completed all 3 steps, could not submit, and abandoned. Their account still sits in the database with no store.

> **RULE: Hunt every `disabled={...}` with more than one condition.** For each: can the user tell what is missing, and is the fix reachable from where they are standing?

### Bug 3 — One value, hand-typed at 8 call sites, drifted at 7 of them

The add-to-cart payload was built by hand in 8 places. Seven omitted `itemType`, so adding a **rental** from any storefront produced an order the server would refuse — no date picker, no deposit, wrong price. It worked only via the one path anyone ever tested.

> **RULE: Find values constructed by hand at N call sites.** Payload objects, query column lists, price/VAT math, status strings, permission checks. Diff every instance against every other.

### The meta-lesson

**Swallowed errors turn failures into believable empty states.** `const { data } = await query` without checking `error` renders "No stores yet" when the real cause is a permission denial. This exact pattern took the marketplace offline for every shopper once already. Treat every discarded `error` as a live incident.

---

## PART 1 — SCOPE

### Public / shopper
`/` · `/stores` · `/stores/[region]` · `/s/[slug]` · `/s/[slug]/[productId]` · `/checkout/[slug]` · `/track/[token]` · `/invoice/[orderId]` · `/credit-note/[refundId]` · `/pricing` · `/pricing/checkout` · `/guide` · `/help` · `/terms` · `/privacy` · `/prohibited-products` · `/app` · `/agents` · `/agents/terms`

### Auth
`/signup` · `/login` · `/auth/reset-password` · WhatsApp OTP · email confirmation

### Merchant dashboard (auth required)
`/dashboard` · `setup` · `products` (+ `new`, `[id]/edit`, `categories`, `import`) · `orders` · `bookings` · `customers` · `coupons` · `broadcast` · `reviews` · `analytics` · `statements` · `subscription` · `settings` · `share` · `account`

### Agent + admin
`/agents/dashboard` · `/admin` and all sub-pages (`analytics`, `announcements`, `audit`, `billing`, `merchants`, `merchants/[id]`, `referrals`, `reports`, `safety`, `team`)

### Live stores to test against (real merchants — **read-only, never place an order**)
`octovia-nexus` (1976 products — pagination/perf) · `sonjas-creation` (newest) · `apatchy-beard-company` · `design-today` · `mother-culture` · `sunrise-crumbs-bakery` · `wjv-computers` · `octovia-nexus-promo`

For destructive/write testing use your **own signed-up merchant account** on a store you create.

---

## PART 2 — HOW TO TEST (non-negotiable)

1. **Browser, not curl.** Use Playwright or Chrome DevTools MCP. Navigate by **clicking**, the way a user does. Every product page must be reached by clicking from the store grid — not by pasting a URL.
2. **Watch the console and network on every page.** Log every console error, failed request, and non-2xx response. A silent 500 inside a `fetch` still counts.
3. **Mobile first.** Namibia is overwhelmingly mobile. Test at **375×812** primarily; confirm 768 and 1280. Check for horizontal overflow and tap targets under 44px.
4. **Verify by consequence, not by absence of complaint.** After any save: reload and confirm the value persisted. After any submit: check the resulting screen or database effect. "No error appeared" is not a pass.
5. **Reproduce before filing.** Every finding needs exact steps that fail twice.

---

## PART 3 — WHAT TO HUNT

### A. The click-through sweep (do this first — highest value)
For **every** live store: open `/stores` → click into the store → click into at least 3 products → open the cart → reach checkout. Repeat on mobile viewport. Log any error page, blank region, missing image, or console exception. Do the same for every dashboard nav item after logging in, and every admin page.

### B. Dead or lying controls
Every disabled button, greyed link, and no-op click across the platform. For each: **is the reason visible, and is the fix reachable?** Specifically re-check the setup wizard, settings save, product create/edit, checkout submit, coupon create, broadcast send.

### C. Duplicated logic drift
Grep for repeated object literals and column lists — cart payloads, `.select(...)` lists, price/VAT calculations, order status strings, tier/plan gates, permission checks. Report any two instances that disagree.

### D. Swallowed errors
Grep for `const { data } = await` with no `error` check, empty `catch {}`, and `.catch(() => {})`. For each, state what the user sees when it fails and whether that is distinguishable from legitimate emptiness.

### E. Server/client boundary
Find every `"use client"` module whose exports are imported by a server component, and the reverse. This caused Bug 1. Check `src/lib/**` especially — anything importing `server-only` or `@/lib/supabase/service` must never be reachable from client code.

### F. Money, tax and dates — verify the arithmetic
- VAT inclusive **and** exclusive stores: cart → checkout → order → invoice → credit note. Do totals agree at every step?
- Coupons: percentage and fixed, minimum spend, expiry, usage limits. Can a coupon make a total negative?
- Delivery fees, buyer-paid courier (Yango/inDrive), pickup.
- **Rentals**: `day` is inclusive (20–22 Aug = 3 days); `night` frees the checkout day (15→18 = 3 nights). Deposits are per-unit, **not taxed**, **not in subtotal**; payable = base + VAT + deposit. Double-booking must be impossible.
- **Bookings**: slot generation, blocked days, no double-booking.
- Namibian phone normalisation (081 / +264 / 0027 variants) and NAD formatting.

### G. Access control (test as an attacker)
- Can merchant A read or modify merchant B's orders, products, customers, statements? Try direct URLs with another merchant's IDs.
- Can an anonymous user reach `/dashboard/*`, `/admin/*`, `/agents/dashboard`?
- Is anything sensitive exposed to `anon` via PostgREST — bank details, phone numbers, subscriptions, `is_demo`, referral data?
- Do tier limits actually enforce (product caps, order caps, branding gate, priority placement)?
- Are demo and practice stores fully isolated from the real marketplace?

### H. Empty, first-run and edge states
Brand-new merchant with 0 products/orders/customers. Store with 1 product. Store with 1976 products (pagination, search, sort). Very long store and product names. Missing images. Out-of-stock. Deleted product still sitting in a cart. Expired coupon at checkout.

### I. UI/UX and accessibility
- Contrast: every text/background pair must hit **WCAG AA 4.5:1** (3:1 for 18px+ bold). Compute it — do not eyeball. Note: Tailwind v4 emits `lab()` colours; normalise through a canvas context before doing the math or your numbers will be wrong.
- Tap targets ≥44px on mobile.
- Focus states, keyboard navigation, form labels, `alt` text, heading order.
- Loading states: does every async action show progress, or does the UI look frozen?
- Error messages written for a Namibian shop owner, not a developer. Flag any raw Postgres or Supabase error text shown to a user.
- Consistency: button styles, spacing, terminology ("hire" vs "rental", "pickup" vs "collection") across pages.
- Copy: typos, leftover placeholder text, anything reading as AI-generated filler.

### J. Performance (measure, don't assume)
Run Lighthouse mobile on `/`, `/stores`, `/s/octovia-nexus`, and a product page. Report LCP, TBT, CLS with numbers. Flag render-blocking resources, unoptimised images, oversized JS. Prior baselines: home LCP 3.99s, storefront 4.26s, product 3.17s; TBT 306 / 324 / 178ms. **State whether these improved or regressed.**

### K. SEO, metadata, PWA
Titles, descriptions, canonicals, OG and Twitter cards (render them), JSON-LD validity, sitemap, robots. PWA install, manifest, offline behaviour, per-store branding.

### L. Integration surfaces
WhatsApp templates and links (correct number, message pre-fill, `wa.me` formatting). Email flows (signup confirmation, order notifications, payment reminders). Cron endpoints. DPO payment callback. Proof-of-payment upload. CSV product import (malformed rows, wrong headers, very large files).

---

## PART 4 — REPORT FORMAT

Write `QA-REPORT-3.md`. Order findings **by severity, worst first**. No preamble about your process — just findings.

```markdown
## [SEVERITY] ID — One-line title

**Where:** URL and/or `path/to/file.tsx:line`
**Device:** mobile 375×812 / desktop 1280 / both
**Regression of:** QA-xxx from round 1 or 2 (omit if new)

**Steps to reproduce**
1. …
2. …

**Expected:** …
**Actual:** … (paste the real error text or console output)
**Evidence:** screenshot path, console line, network response, or measured number
**Impact:** who is affected, and what it costs them in money or abandonment
**Suggested fix:** the root cause, not the symptom
```

**Severity:**
- **P0** — data loss or corruption, money wrong, security hole, or a core path fully broken (cannot order, cannot create store, cannot log in)
- **P1** — a feature broken or unusable for a real segment; workaround exists but is not discoverable
- **P2** — degraded experience, confusing UX, accessibility failure
- **P3** — polish, copy, minor inconsistency

End with two short sections:
- **Regressions** — findings matching round 1 or 2 items, by ID
- **Verified working** — the important paths you clicked end-to-end that behaved correctly, so we know what was actually covered

---

## PART 5 — RULES

- **Do not fix anything.** Report only. This is an audit.
- **Do not place real orders** on real merchants' stores, change their settings, or contact them.
- Never enter real payment credentials.
- If you cannot test something (needs an account you lack, a paid tier, a real payment), say so explicitly under a **"Blocked coverage"** heading rather than guessing or silently skipping it.
- Quantify wherever possible: pixel widths, contrast ratios, milliseconds, byte counts.
- Prefer **20 real, reproducible bugs over 200 speculative nits.** A finding you did not reproduce twice does not go in the report.
