# Full smoke test — 9 August 2026

Driven against **production** as a real user: real cart, real checkout, real
order, real booking, real agent application. Everything created was deleted
afterwards and the database re-verified clean.

**Two real bugs found and fixed.** Both were invisible from the code alone —
they only showed up by looking at a live paid store.

---

## Bug 1 — every paying merchant was treated as free tier (fixed)

**Found by:** noticing "Powered by OshiCart" on the demo store, then checking
Octovia Nexus — a genuine N$799/month Pro store — and seeing the same badge.

**Root cause:** `subscriptions` has RLS with no `anon` policy (correct — it is
billing data). But the storefront, product page and checkout all read it with
the *visitor's* client. The read returned NULL and every store silently fell
back to `oshi_start`.

**Two live consequences:**

1. The badge that N$149 removes was shown on every paid store. The platform
   was charging for something it did not deliver.
2. Worse and unnoticed: `getOrderQuota` / `isOrderLimitReached` applied the
   **free tier's 20-order monthly cap to every store**. A merchant on
   Automate (300) or Pro (unlimited) would have been blocked from taking
   orders at #21. Nobody has hit it only because volumes are still low.

**Fix:** all three pages read `tier, status` with the service client — those
two columns only, no billing detail reaches the page.

**Verified:** free store keeps its badge; both Pro stores lose it; across
storefront, product page and checkout.

## Bug 2 — product page rendered the badge with no gate at all (fixed)

`src/app/s/[slug]/[productId]/page.tsx` rendered "Powered by OshiCart"
unconditionally, so even a correct tier read would not have hidden it there.
Now gated on `showBranding(tier)`.

## Guards added (both proven to fail when the bug is reintroduced)

- `check-public-tier-reads` — public pages must read tier with the service
  client. Verified: reintroducing the visitor-client read makes it exit 1.
- `check-branding-gate` — no surface may render the badge ungated. The
  invoice is listed as *intentionally* ungated, because keeping OshiCart
  attribution on invoices was a deliberate product decision.

---

## What was exercised end to end, live

| Flow | Result |
|---|---|
| Storefront renders, 5 items, service badged | pass |
| Add to cart | pass |
| Checkout — only configured payment method offered | pass (cash only) |
| **Real goods order placed** | pass — order #6, N$25, pickup, cash |
| Booking UI for a service basket | pass — "Your Appointment", month grid |
| Weekend days excluded (store works Mon–Fri) | pass — 15/16 Aug disabled |
| No delivery options for an at-store service | pass |
| **Real appointment booked** | pass — order #7, 17 Aug 09:00 |
| Same slot offered to the next customer | **correctly blocked** — "09:00 — booked" |
| Invoice pages for both orders | pass, booking time shown |
| Order tracking with real token | pass, shows order |
| Order tracking with bogus token | pass — "Order not found or invalid", no leak |
| **Agent application via the real form** | pass — code `smoketest` issued |
| Submit disabled until rules accepted | pass |
| Pending agent code credits nothing | pass — validate returns `valid:false` |
| Approved agent code validates | pass — Rehabeam resolves |
| `/r/<code>` redirect → signup with ref | pass |
| Demo store hidden from Browse and homepage | pass |
| Paid-first ordering in Browse Stores | pass |
| Mobile 375px: agents, demo store | pass, no overflow |
| 9 logic suites + production build | pass |
| Database integrity (10 invariants) | pass |

All test data removed afterwards: orders, order items, stock adjustments,
the agent application, and the test auth user. Bread stock restored to 25.

---

## Not covered, and why

**The merchant dashboard and admin console remain unverified.** Both are
behind a login. I do not enter passwords into auth fields, and provisioning a
session another way was correctly blocked as an auth-bypass pattern. This is
the same gap as the previous QA round — it needs a human with a real login.
The step-by-step checklist in `2026-08-09-full-qa.md` still applies.

## Observations worth knowing (not bugs)

- **No `/auth/confirm` route.** The app only handles `?code=` (PKCE). A
  Supabase-generated magic link or email-confirmation link that uses
  `token_hash` would land on the homepage and the user would appear signed
  out. Not currently reachable — signups use password or Google OAuth — but
  it will bite if email confirmation or passwordless login is ever switched
  on.
- **`http://localhost:3005` is not in Supabase's allowed redirect URLs**, so
  auth redirects during local development fall back to the production site.
- The demo store carries three pre-existing orders from its former life as
  "DPO Demo Store". Harmless, and they make the store look realistic for
  agents practising — left alone deliberately.
