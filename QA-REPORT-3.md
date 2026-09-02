## [P1] R3-001 — Production dependencies contain high-severity framework, image, build, and WebSocket advisories

**Where:** `package.json:16-26`, `package-lock.json`, `src/middleware.ts:1-11`  
**Device:** both

**Steps to reproduce**
1. At commit `59341e83dcd365a2bc88d4d66935f36fad22905a`, run `npm audit --omit=dev --json` against the installed lockfile.
2. Record the vulnerable dependency roots and affected package counts.
3. Run the same audit again without changing the lockfile.

**Expected:** A production release has no known high-severity vulnerabilities in its web framework, image pipeline, CSS pipeline, or realtime transport.  
**Actual:** Both runs identify the same five vulnerable roots: `next@16.1.6`, `sharp@0.34.5`, `postcss@8.4.31/8.5.8`, `nanoid@3.3.11`, and `ws@8.19.0`. The current audit totals **10 affected package entries: 7 high and 3 moderate**. Relevant high advisories include unauthenticated Next.js RSC denial of service, App Router middleware/proxy bypass, SSRF, `sharp`/libvips flaws, PostCSS file disclosure, and `ws` memory-exhaustion denial of service. The app globally runs Next middleware, uses React Server Components and `next/image`, so these are not unused packages; exploitability of each individual advisory on Vercel was not probed destructively.  
**Evidence:** Two identical `npm audit --omit=dev --json` reproductions; installed dependency tree from `npm ls next sharp ws postcss nanoid --all --depth=4`; direct versions at `package.json:16-26`.  
**Impact:** An attacker may be able to degrade availability or exploit framework/proxy behavior before application code runs. Even where a specific advisory is not reachable in this deployment, the release cannot make a clean dependency-security claim.  
**Suggested fix:** Upgrade Next.js to a release outside all reported ranges (the audit ranges require at least `16.2.11`; use the current supported patched release), upgrade `sharp` to `>=0.35.0`, and update/override parent packages until PostCSS is `>8.5.22`, nanoid is `>=3.3.18`, and `ws` is `>=8.21.0`. Regenerate the lockfile, then rerun build, audit, security regression, image, RSC-click, and middleware-access tests.

## [P1] R3-002 — Database errors make the monthly order quota fail open

**Where:** `src/lib/order-limit.ts:45-81`, consumed by `/s/[slug]`, `/s/[slug]/[productId]`, `/checkout/[slug]`, and dashboard quota views  
**Device:** both

**Steps to reproduce**
1. Run `npx tsx output/qa-round3/error-masking-audit.ts`.
2. The harness injects `{ error: "subscription read timed out" }` into the subscription lookup and `{ error: "order count timed out", count: null }` into the order-count lookup.
3. Observe the returned quota, then let the harness repeat the same fault a second time.

**Expected:** A quota query failure is distinguishable from a real count of zero and does not allow a capped store to appear able to accept another order.  
**Actual:** Both reproductions return `quotaCount: 0` and `quotaReached: false`. `resolveBillingPeriod()` discards the subscription `error`; `countOrdersInPeriod()` discards the order-count `error` and converts `null` into zero via `return count || 0`. For merchants older than 30 days, the current `place_order` function's separate trust check does not enforce the tier allowance, so this is not merely a cosmetic dashboard error.  
**Evidence:** `output/qa-round3/error-masking-audit.ts`; repeated output: `{"round":1,"injected":{"quotaError":true},"observed":{"quotaCount":0,"quotaReached":false}}` and the identical round-2 result. Source locations: `src/lib/order-limit.ts:45`, `:73`, and `:81`.  
**Impact:** During a database timeout, permission regression, or schema mismatch, a capped store can remain orderable and exceed the paid plan allowance. This weakens monetisation controls and also shows merchants a believable but false zero-order/reset state.  
**Suggested fix:** Destructure and check `error` in both queries. Use a typed unavailable/error result and fail closed at storefront/checkout enforcement, while showing merchants and shoppers a retryable service-unavailable message rather than “0 used.” Enforce the same billing-cycle tier limit atomically inside `place_order` so UI and database decisions cannot diverge.

## [P2] R3-003 — Mobile LCP regressed on home, storefront, and product pages

**Where:** `https://oshicart.com/`, `/stores`, `/s/octovia-nexus`, `/s/apatchy-beard-company/b286db96-3e62-4c1a-8969-0525faf812b5`  
**Device:** mobile 375×812  
**Regression of:** QA-014 from round 1/2

**Steps to reproduce**
1. Run Lighthouse mobile against all four URLs with the same throttled profile.
2. Record LCP, TBT, and CLS.
3. Repeat the four-page run and compare the two-run averages with the round-2 baselines.

**Expected:** LCP moves toward the **≤2.5 s** target and does not regress from 3.99 s home, 4.26 s storefront, and 3.17 s product.  
**Actual:**

| Page | LCP run 1 | LCP run 2 | Average | Prior baseline | TBT average | CLS run 1 / 2 |
|---|---:|---:|---:|---:|---:|---:|
| Home | 5.06 s | 4.96 s | **5.01 s** | 3.99 s | 281 ms | 0 / 0 |
| Stores directory | 6.02 s | 5.89 s | **5.95 s** | n/a | 261 ms | .115 / .115 |
| Octovia storefront | 6.36 s | 9.03 s | **7.69 s** | 4.26 s | 240 ms | 0 / 0 |
| Product | 4.55 s | 4.15 s | **4.35 s** | 3.17 s | 151 ms | 0 / 0 |

TBT improved against the three prior baselines, but LCP regressed by approximately **26% home, 81% storefront, and 37% product**. Octovia's server response was only 72 ms in run 2; its LCP description text then incurred a 3.37 s element-render delay. Lighthouse also estimates 627 KiB of avoidable storefront image transfer. The product's LCP image is discoverable but lacks `fetchpriority=high`. A locally injected Kaspersky script appears in both current and prior Lighthouse evidence and adds noise to absolute render-blocking estimates; the regression comparison is therefore made against the equally affected prior runs, not against an uncontaminated lab.  
**Evidence:** `output/lighthouse-round3-{home,stores,octovia,product}.json` and `output/lighthouse-round3-r2-{home,stores,octovia,product}.json`.  
**Impact:** Mobile shoppers on slower Namibian connections wait materially longer for meaningful content, increasing bounce and product-view abandonment; the 1,976-product storefront is the worst core browsing path.  
**Suggested fix:** Profile the storefront's post-TTFB render/hydration sequence, reduce work before the description can paint, serve correctly sized store/logo/product thumbnails, and mark genuine above-fold LCP images as priority/high fetch. Re-measure with a clean Lighthouse runtime and use a median of at least three runs as the release gate.

## [P2] R3-004 — WCAG AA contrast failures returned across core public pages

**Where:** `https://oshicart.com/`, `/stores`, `/s/octovia-nexus`; examples at `src/components/landing/how-it-works.tsx:189` and `src/components/storefront/store-list-card.tsx:34-66`  
**Device:** mobile 375×812  
**Regression of:** QA-012 from round 1/2

**Steps to reproduce**
1. Run Lighthouse accessibility on the three URLs at the mobile profile.
2. Expand the `color-contrast` audit and record computed foreground/background colours.
3. Repeat the three audits.

**Expected:** Normal text meets WCAG AA **4.5:1** in every core page state.  
**Actual:** Both runs fail contrast on all three pages. Examples include home mini-card labels at **2.64:1** (`#97a0ac` on white), step numbers at **1.81:1**, store directory industry/product counts and “Visit Store” at **3.23:1**, and storefront “Store owner? Sign in” / “Report Store” at **2.60:1**. Home “WhatsApp preview” is **4.42:1**, narrowly below AA.  
**Evidence:** The `color-contrast` audit in both rounds of `output/lighthouse-round3-*.json`; selectors and computed ratios are embedded in each JSON result.  
**Impact:** Low-vision shoppers and merchants cannot reliably read store metadata, navigation/support links, and explanatory content. This reopens the accessibility category previously signed off as fixed.  
**Suggested fix:** Replace opacity-derived light text tokens with explicit AA-safe foreground tokens per background, including branded/storefront contexts. Add automated axe/Lighthouse contrast assertions for home, directory, storefront, and footer states so new token usage cannot reintroduce sub-4.5:1 text.

## [P2] R3-005 — Primary mobile navigation targets are smaller than 44×44 px

**Where:** Public navbar on `/` and `/stores`; `src/components/public-navbar.tsx:81-98`  
**Device:** mobile 375×812

**Steps to reproduce**
1. Open `/` at 375×812 and measure the rendered bounding boxes of the “Create Store” link and “Toggle menu” button.
2. Repeat the measurement on `/stores`.
3. Repeat both pages in a fresh browser context.

**Expected:** Frequently used touch controls are at least **44×44 px**.  
**Actual:** All four page/run combinations measure “Create Store” at **129×40 px** and the menu button at **34×34 px**. The broader 17-page mobile sweep also found multiple 40–42 px CTAs and form controls, but this finding is limited to the consistently repeated global navigation controls.  
**Evidence:** `output/playwright/round3/tap-target-results.json`; source uses `py-2.5` for the CTA and `p-1.5` around a 22 px menu icon at `src/components/public-navbar.tsx:84,94-98`.  
**Impact:** The global menu and signup CTA are harder to hit accurately for users with limited dexterity or low-precision touchscreens, causing navigation errors on every public page.  
**Suggested fix:** Give the menu button `min-h-11 min-w-11` and centre its icon; give the navbar CTA a minimum 44 px height. Audit the remaining 40–42 px inputs/CTAs and preserve visual compactness with internal alignment rather than undersized hit areas.

## [P3] R3-006 — Store cards skip from the page H1 to H3 headings

**Where:** `https://oshicart.com/stores`; `src/components/storefront/store-list-card.tsx:34`  
**Device:** mobile 375×812  
**Regression of:** QA-018 from round 1/2

**Steps to reproduce**
1. Run Lighthouse accessibility on `/stores` at the mobile profile.
2. Inspect the `heading-order` failure for the first store card (“Octovia Nexus Promo”).
3. Repeat the audit.

**Expected:** Page headings form a sequential outline that screen-reader users can navigate predictably.  
**Actual:** Both runs report `Heading order invalid`: the directory's H1 is followed by store-name `<h3>` elements without an intervening H2.  
**Evidence:** `heading-order` in `output/lighthouse-round3-stores.json` and `output/lighthouse-round3-r2-stores.json`; source at `src/components/storefront/store-list-card.tsx:34`.  
**Impact:** Screen-reader heading navigation misrepresents the directory hierarchy. The earlier footer heading-order regression is fixed, but the same accessibility class has reappeared in store cards.  
**Suggested fix:** Add a real H2 for the results section and use H3 cards beneath it, or make store names H2 if the cards are direct sections of the page. Add a heading-outline check to the directory route.

## [P3] R3-007 — The repository lint gate fails with seven React correctness errors

**Where:** `src/app/(dashboard)/dashboard/bookings/page.tsx:111`, `dashboard/broadcast/broadcast-client.tsx:72`, `dashboard/broadcast/page.tsx:53`, `src/components/industry-icon.tsx:104-120`, `src/components/pwa/get-the-app-row.tsx:20`, `src/components/pwa/install-bar.tsx:65`, `src/components/storefront/month-calendar.tsx:45`  
**Device:** both

**Steps to reproduce**
1. Run `npm run lint` at the audited commit.
2. Record the exit code and problem summary.
3. Run the command again unchanged.

**Expected:** The release branch passes its configured lint command.  
**Actual:** Both runs exit **1** with **40 problems: 7 errors and 33 warnings**. Errors include synchronous state changes inside effects, impure `Date.now()` calls during render, and a component factory invoked during render. `npm run build` still passes, so these are not currently enforced by the build.  
**Evidence:** Repeated ESLint terminal output with `✖ 40 problems (7 errors, 33 warnings)`.  
**Impact:** CI/release validation is red, and the reported patterns can cause avoidable rerenders, unstable audience calculations, or component state resets even though the production bundle compiles.  
**Suggested fix:** Derive state instead of synchronously setting it in mount effects, calculate time boundaries outside render or pass a stable reference time, and return a stable icon component mapping rather than creating a component during render. Make lint a required release check after the current errors are cleared.

## Regressions

- **R3-003 → QA-014:** mobile LCP is again slower on home, storefront, and product; TBT improved.
- **R3-004 → QA-012:** contrast failures returned on new home/directory/storefront elements.
- **R3-006 → QA-018:** heading order is invalid again, now in `/stores` result cards.
- **Not regressed:** the product RSC click crash, hidden setup blockers, rental cart payload drift, R2-001 invoice helper implementation, and QA-016 PDF clipping all pass the available regression evidence.

## Verified working

- **Real browser store/product sweep, twice at 375×812:** `/stores` was clicked into all eight live stores. Three products were clicked in each store where at least three were published: Octovia Nexus, Apatchy, Sunrise Crumbs, W.J.V Computers, and Octovia Nexus Promo. The promo category exposed 100 product links and three clicks succeeded in both focused rounds. Sonja's Creation exposed 1 product, Design Today 2, and Mother Culture 1; every available product was clicked twice. No clicked product produced the prior RSC 500, page error, console error, failed request, or HTTP 5xx.
- **Cart to checkout without ordering:** Apatchy Beard Company was traversed from `/stores` to a product, Add to Cart, cart, and `/checkout/apatchy-beard-company` twice. The cart remained non-empty and the order summary rendered; checkout was not submitted. Paused stores clearly displayed “Ordering is paused”; quote/request-only stores did not present a false checkout path.
- **Public breadth/responsiveness:** 17 public/auth/legal/error routes were rendered at 375, 768, and 1280 px (51 combinations) with zero horizontal overflow and no unexpected console or HTTP 5xx failures. Home → Stores → Khomas and Agents → Agent Terms were clicked at all three widths. Invalid invoice/credit-note UUIDs returned expected generic 404s without data.
- **Anonymous guards, twice:** `/dashboard` and `/dashboard/orders` ended at `/login`; `/admin` and `/admin/merchants` ended at `/admin/login`; `/agents/dashboard` displayed its sign-in gate. Security regression tests passed unauthenticated WhatsApp/order endpoints; bogus order lookup pairs returned no customer data.
- **Production anonymous RLS, twice:** public merchant identity and product samples were readable; merchant private columns were denied with `42501`; anonymous `orders`, `customers`, and `subscriptions` returned no rows.
- **SEO/social/PWA, twice:** robots and sitemap returned 200; the sitemap contained Octovia; store/product titles, descriptions, canonicals, OG/Twitter metadata were present in the browser; four JSON-LD blocks parsed; store/product OG images returned PNG 200. Manifest and service worker returned 200 with valid install metadata/icons. The service worker intentionally caches static shell assets only, not live HTML/API data.
- **Guides/PDFs:** both live PDFs were byte-identical to the local generated files, all 8 pages of each were rendered and visually inspected, and `scripts/check-guide-pagination.mjs` passed. Merchant-guide page 8 now begins with the complete first instruction, so QA-016 is fixed.
- **Regression/build checks:** `npm run build` passed and generated 109 pages. All 18 `scripts/check-*.ts` checks passed, including cart payload centralisation, server-safe cart-item boundaries, setup submit messaging, grants/RLS assumptions, rentals, VAT/statements, PWA, plans, navigation, and demo isolation. The existing Playwright security/marketing/share selection produced 10 passes and 2 authenticated skips; its sole failure is a stale strict locator that matches both the improved “Store Not Found” heading and title, while the actual not-found UI renders.
- **Invoice fix in source:** invoice fulfilment and COD copy now use shared `fulfilmentNoun`, `cashMethodLabel`, and `cashInstruction`; goods-only “Pickup from store” is suppressed for stays/online services. The original QA2 invoice rows no longer exist, so this is not claimed as a fresh live record verification.
- **Safety:** no real order, account, merchant setting, status, message, email, payment, upload, or database mutation was made in round 3.

## Blocked coverage

- No usable confirmed merchant session or inbox was available. Authenticated dashboard navigation, setup persistence, product/category/import writes, settings/VAT round-trips, coupons, bookings, broadcasts, order status/payment/return actions, statements, and merchant-A-versus-merchant-B direct-ID attacks could not be exercised live.
- No admin or approved-agent credentials were available, so authenticated admin sub-pages, agent practice-store creation, paid-tier gates, and role-to-role access attempts remain blocked. Anonymous guards were tested instead.
- Email confirmation-link completion, real WhatsApp OTP/template delivery, cron side effects, DPO callback/payment completion, payment reminders, proof upload, and malformed/large CSV import require external credentials, inboxes, approved templates, scheduled execution, or production writes; none were guessed or triggered.
- A complete checkout could not be reached on every real merchant: some stores are paused, some publish request/quote-only items, and three stores expose fewer than three products. Only Apatchy's cartable checkout was opened; no order was placed anywhere.
- The prior round's demo invoice orders #1 and #4 have been removed, so R2-001 could only be verified from the deployed source/shared helpers, not against the same live records. No replacement order was created. A valid credit-note lifecycle likewise requires a real refund and was not fabricated.
- Browser install prompts depend on device/browser eligibility and cannot be forced reliably in headless Chromium. Manifest, icons, registration endpoint, and static-cache implementation were verified; an actual add-to-home-screen lifecycle was not.
