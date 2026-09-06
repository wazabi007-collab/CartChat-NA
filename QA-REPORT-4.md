# OshiCart — QA Round 4: platform, UI/UX and growth audit

**Date:** 5 September 2026. **Target:** live https://oshicart.com plus local source at `502e774`. This is the new post-change audit; rounds 1–3 are preserved. Local HEAD is not proof that every deployed file is byte-identical.

**Implementation update:** The original QA fixes were released on 5 September, and the subsequent UI/UX follow-up was released on 6 September (see the production release entries below). Original findings describe the audited baseline; consult the dated appendices for implementation and acceptance status. The full platform audit is not closed.

**Verdict: address the commerce and messaging inconsistencies before a wider client-acquisition push.** The ordinary goods-order journey worked in the isolated QA store, including coupon arithmetic, invoice and cancellation/restocking. However, pickup-only configuration, quote-only services and customer messaging still have important gaps.

There are **nine reproduced live findings** below and **one separately identified, twice-reproduced local money-projection defect**. Additional source-review risks are explicitly separated. No P0 incident was demonstrated in production; that is not a security or payments certification.

## [P1] R4-001 — Pickup-only setup still enables free store delivery

**Where:** `/dashboard/setup`, `/checkout/qa-demo-20260905-do-not-order`; `src/app/(dashboard)/dashboard/setup/page.tsx:150`, `:155`, `:412`; `src/app/checkout/[slug]/checkout-form.tsx:1183`.  
**Device:** mobile 375×812. **Evidence class:** live configuration and checkout, repeated in anonymous and owner-preview contexts.

**Steps**

1. Create the QA store in Windhoek with Pickup selected and Delivery unselected.
2. Save; add a N$125 product and open its checkout.
3. Select Delivery; repeat in the separate browser context.

**Expected:** Only pickup is available.  
**Actual:** Delivery remains selectable, with Store delivery, Yango and inDrive. Store delivery adds N$0. The saved row contains `enabled_delivery_providers=["store","yango","indrive"]` and a zero delivery fee.

**Cause:** Default providers survive even when `offersDelivery=false`; `effectiveProviders` filters geography but not the delivery choice. The goods checkout also renders pickup/delivery without a corresponding explicit eligibility gate.

**Impact:** Merchants can receive fulfilment requests they never offered, and shoppers can infer free delivery. No delivery order was submitted during this test.

**Fix:** Persist explicit allowed fulfilment methods; exclude all delivery providers for pickup-only stores; enforce the same eligibility at checkout and order creation. Test pickup-only, delivery-only, both and town changes. Review existing store configurations before any corrective migration rather than assuming every zero-fee merchant is wrong.

**Evidence:** [Pickup-only checkout offering delivery](output/playwright/qa-2026-09-05/qa-pickup-only-delivery.png).

## [P1] R4-002 — “Request a Quote” becomes a N$0.00 shopping checkout

**Where:** `/s/design-today` → product `f1c07086-4b84-4fb4-9027-ff4e16d304e8` → checkout; `src/app/s/[slug]/[productId]/page.tsx:224`; `src/components/storefront/layouts/service-list.tsx:73`.  
**Device:** mobile. **Evidence class:** live, two passes.

**Steps**

1. Open Design Today from the marketplace.
2. Select “Digital Marketing and Growth Management”, advertised as “Request a Quote”.
3. Follow the product's Add to Cart and Checkout path; repeat without submitting.

**Expected:** A quote enquiry with scope/contact information, not a zero-price order.  
**Actual:** Product detail displays N$0.00 and Add to Cart. Checkout shows Total N$0.00, pickup/delivery and cash collection language; it also reports no delivery slots over the next 14 days. The listing's quote intent is lost.

**Cause:** Quote-aware list pricing and unconditional product-detail/cart behaviour disagree. The service-list action directly adds a cart item. The digital-service description does not itself enforce an online-service fulfilment mode.

**Impact:** A service business appears to sell work for free and customers reach an irrelevant or blocked fulfilment form. **Server acceptance of a free order was not tested.**

**Fix:** Use an explicit shared pricing mode: fixed price versus quote required. A quote action should create an enquiry, later convertible into an accepted quote/deposit/order. Apply service-mode rules consistently in listings, detail, cart, checkout and notifications.

**Evidence:** [Product detail](output/playwright/qa-2026-09-05/product-f1c07086-4b84-4fb4-9027-ff4e16d304e8.png), [checkout pass 1](output/playwright/qa-2026-09-05/quote-checkout-1.png), [pass 2](output/playwright/qa-2026-09-05/quote-checkout-2.png).

## [P1] R4-003 — A valid local phone number silently breaks the welcome notification

**Where:** `src/app/(dashboard)/dashboard/setup/page.tsx:449`; `src/app/api/whatsapp/notify/route.ts:60`.  
**Device:** mobile; server-side comparison affects all devices. **Evidence class:** live request and authenticated replay.

**Steps**

1. Create the QA store with the authorised Namibian local-format phone number beginning 081.
2. Observe the post-creation welcome notification request.
3. Repeat the same request for this QA merchant with the local-format recipient.

**Expected:** The saved +264 number and equivalent local number match.  
**Actual:** Both requests return HTTP 403, `{"ok":false,"error":"Recipient not allowed"}`. Store creation succeeds, with no visible notification warning.

**Cause:** Setup passes the raw form phone; recipient authorisation strips punctuation but does not canonicalise the local prefix. `081…` therefore differs from stored `26481…`. The caller catches network rejection but does not check unsuccessful HTTP responses.

**Impact:** New merchants miss an expected onboarding message without knowing why. This is the same defect class as the recently corrected phone-normalisation work, not proof that that particular fixed endpoint regressed.

**Fix:** Reuse the canonical phone helper before comparisons and at every notification caller. Inspect response status; show a retryable notification failure without undoing the successfully created store. Add local/international-format tests around recipient authorisation, not just the helper.

**Evidence:** Original browser console POST 403 and authenticated replay response above. No notification was delivered by the failed replay.

## [P1] R4-004 — Announcement totals omit rental deposits and call-out fees

**Where:** `src/app/api/orders/announce/route.ts:39`, `:58`; `src/lib/vat.ts:83`.  
**Device:** all. **Evidence class: local source-derived fixture, repeated twice; live delivery NOT tested.**

**Reproduction:** Run `npx tsx output/playwright/qa-2026-09-05/announcement-total-repro.ts`. It reads the actual announcement SELECT, projects two fixture orders onto those columns, and invokes the production total helper.

| Fixture | Correct payable | Announcement projection | Omitted |
|---|---:|---:|---:|
| N$300 rental + N$45 VAT + N$500 deposit | N$845 | N$345 | N$500 deposit |
| N$300 service + N$50 call-out | N$350 | N$300 | N$50 call-out |

Both repetitions produced identical results.

**Cause:** The total helper supports `deposit_nad` and `callout_fee_nad`, but the announcement query selects neither. Shared arithmetic does not prevent drift when callers supply incomplete records.

**Impact:** Automated order messages can understate the amount due for affected order types.

**Fix:** Centralise a typed payable-order projection and require every component of the total. Add route-level tests covering deposits, call-out, exclusive/inclusive VAT, discount and delivery, plus an approved delivery test. Do not “fix” this by taxing refundable deposits.

**Evidence:** [Read-only fixture](output/playwright/qa-2026-09-05/announcement-total-repro.ts). No rental payment or real WhatsApp send was made.

## [P2] R4-005 — Marketplace “open” claims include stores with ordering paused

**Where:** `/stores`, homepage store gallery; `src/lib/storefront/store-list.ts:90`; `src/app/stores/page.tsx:201`; `src/components/landing/storefront-gallery.tsx`.  
**Device:** mobile; directory layout also checked at 768 and 1280. **Evidence class:** live; focused repeat on Sunrise.

**Steps:** Browse the 12 listed stores; enter Mother Culture, Sunrise Crumbs Bakery and W.J.V Computers. Return to the directory and repeat Sunrise.

**Expected:** “Open”/orderable claims reflect whether a customer can actually order.  
**Actual:** These three stores show ordering paused after being presented in the open-store marketplace. Homepage copy also invites visitors to place orders in its live-store examples.

**Cause:** Listing eligibility and order eligibility are different checks. Active/listed status alone does not account for suspension or order quota.

**Impact:** Three of twelve directory destinations end in an orderability dead end, weakening the platform's demonstration to prospective clients.

**Fix:** Distinguish “Browse catalogue” from “Accepting orders”. Show paused badges, offer an accepting-orders filter and select genuinely orderable demonstration stores. Keep browsing available where appropriate.

**Evidence:** [Directory](output/playwright/qa-2026-09-05/stores-mobile.png), [Sunrise](output/playwright/qa-2026-09-05/sunrise-crumbs-bakery-mobile.png), [Mother Culture](output/playwright/qa-2026-09-05/mother-culture-mobile.png), [W.J.V](output/playwright/qa-2026-09-05/wjv-computers-mobile.png).

## [P2] R4-006 — Paused ordering is incorrectly labelled “Sold out”

**Where:** Sunrise menu; `src/components/storefront/layouts/menu-list.tsx:62` and analogous compact-grid branch.  
**Device:** mobile. **Evidence class:** live, two passes.

**Steps:** Open Sunrise and inspect stocked products while ordering is paused; reload and repeat.

**Expected:** “Ordering paused”, distinct from stock availability.  
**Actual:** Products show quantities such as 1, 4, 16 and 10 remaining alongside “Sold out”.

**Cause:** `isOutOfStock || disabled` maps two different reasons to the same label.

**Impact:** Customers are misinformed about inventory and merchants may investigate the wrong problem.

**Fix:** Preserve structured disable reasons and map them to accurate customer language across every storefront layout.

**Evidence:** [Sunrise screenshot](output/playwright/qa-2026-09-05/sunrise-crumbs-bakery-mobile.png).

## [P2] R4-007 — Checkout says “Order Confirmed!” before merchant confirmation

**Where:** `src/app/checkout/[slug]/checkout-form.tsx:931`; QA orders #1 and #2.  
**Device:** mobile. **Evidence class:** two complete live QA orders and database verification.

**Steps:** Submit a valid cash/pickup QA order; compare the success screen with the merchant order state. Repeat with a second order.

**Expected:** “Order received — awaiting store confirmation” while pending.  
**Actual:** Both success screens say “Order Confirmed!”; both saved rows are `pending` and offer the merchant a Confirm action.

**Impact:** Customers may travel to collect or believe availability has been accepted when it has not.

**Fix:** Derive success wording from actual status. Add prominent Track order and View invoice actions, expected next steps and a merchant-contact fallback. A receipt URL buried in a WhatsApp prefill is not an adequate visible receipt action.

**Evidence:** [Order #1](output/playwright/qa-2026-09-05/qa-order-success.png), [order #2](output/playwright/qa-2026-09-05/qa-order-success-repeat.png). Both orders were subsequently cancelled as cleanup.

## [P2] R4-008 — Directory footer still fails normal-text contrast

**Where:** `/stores`, “Made in Namibia”; `src/app/stores/page.tsx:303`.  
**Device:** Lighthouse mobile. **Regression/persistence of:** QA-012 / R3-004.

**Reproduction:** Run the two directory Lighthouse checks and inspect the colour-contrast failure.

**Expected:** At least 4.5:1 for this 14px normal-weight text.  
**Actual:** `#6a7282` on `#101828` is approximately **3.66:1**. Both runs score accessibility 96 and flag this text.

**Fix:** Use a tested lighter footer text token; apply automated contrast checks to all alternate footer/theme variants.

**Evidence:** [Run 1](output/playwright/qa-2026-09-05/lighthouse-stores.json), [run 2](output/playwright/qa-2026-09-05/lighthouse-repeat-stores.json). Home, sampled storefront and product scored 100 in these automated scans; that is not proof of complete accessibility.

## [P2] R4-009 — Track Inventory has no programmatic accessible name

**Where:** Product create and edit; `src/app/(dashboard)/dashboard/products/new/page.tsx:775`; `src/app/(dashboard)/dashboard/products/[id]/edit/page.tsx:831`.  
**Device:** mobile accessibility tree and keyboard. **Evidence class:** observed independently on both forms.

**Steps:** Open product creation, inspect the inventory checkbox's accessible name; repeat in product edit.

**Expected:** Assistive technology announces “Track Inventory” and its checked state.  
**Actual:** The checkbox is unnamed. Visible explanatory text is outside the wrapping label and is not connected with `aria-labelledby` or `for/id`.

**Impact:** Screen-reader users cannot reliably identify the stock-tracking control.

**Fix:** Connect the visible label and description to the input; retain keyboard operation and visible focus, and enlarge the interactive target. Keyboard focus plus Space worked; a test driver's inability to click the hidden native input is not itself a user-facing defect.

**Evidence:** Create/edit accessibility snapshots and the two source locations. The inventory value itself persisted successfully.

## [P2] R4-010 — Large-catalogue storefront remains slow on simulated mobile

**Where:** homepage, directory, Octovia storefront and sampled Apatchy product.  
**Evidence class:** two Lighthouse mobile runs per URL, version 13.4.1.

| Page | Performance /100, runs 1 / 2 | LCP seconds, runs 1 / 2 | TBT ms, runs 1 / 2 | CLS, runs 1 / 2 |
|---|---:|---:|---:|---:|
| Home | 78 / 65 | 3.28 / 5.08 | 289 / 318 | 0 / 0 |
| Stores | 66 / 70 | 4.41 / 4.38 | 149 / 185 | .115 / .115 |
| Octovia Nexus | 55 / 57 | 6.72 / 7.17 | 229 / 221 | 0 / .061 |
| Apatchy product | 93 / 83 | 2.09 / 3.26 | 110 / 307 | 0 / 0 |

**Expected:** Target LCP ≤2.5s and CLS ≤.1 in controlled lab checks, then validate field experience.  
**Actual:** Octovia is consistently the weakest sampled page. Directory layout shift also exceeds .1.

**Diagnosis:** Octovia's LCP element is descriptive text, not simply a product photo. Its repeat trace reports roughly 4 seconds of element render delay. Image optimisation remains useful, but blaming only image size would miss the critical path.

**Fix:** Profile server rendering, streamed-content visibility, fonts/hydration and above-fold catalogue work. Limit initial catalogue payload; preserve category browsing/search. Reserve directory layout space and measure the shift source. Establish repeatable CI and real-user monitoring.

**Method limits:** These are simulated lab results, not Namibian field measurements. Kaspersky-injected requests were explicitly blocked; they still appear as zero-byte failed entries and are not app network failures. Host/TLS inspection and shared CPU can affect results. Earlier rounds used different harness conditions, including unblocked injection and older Lighthouse versions. Current numbers are numerically better than several round-3 averages, but a defensible longitudinal “fixed/regressed” verdict needs a clean matched baseline.

**Evidence:** Eight `lighthouse-*.json` / `lighthouse-repeat-*.json` files in [the artifact directory](output/playwright/qa-2026-09-05/). Product URL: `/s/apatchy-beard-company/b286db96-3e62-4c1a-8969-0525faf812b5`.

## Additional source-review risks — not reproduced production incidents

| Priority | Risk and evidence | Recommended acceptance test |
|---|---|---|
| P1 | **Tier quota enforcement remains outside the order transaction.** R3-002's query-error handling is fixed and the fail-closed check passes. However, `src/lib/order-limit.ts:89` acknowledges tier enforcement is outside `place_order`. Inspected deployed overloads apply the first-30-days trust cap, not the full subscription billing-cycle allowance. | In staging, two concurrent requests for the final available plan order must not both succeed. Check a previously opened checkout and direct RPC submission. Enforce allowance atomically; preserve a useful retry/error state. No production quota bypass was attempted. |
| P1 | **Replies to platform WhatsApp notifications route to platform admins, not the relevant merchant.** `src/app/api/whatsapp/webhook/route.ts:74` forwards inbound messages through `adminWhatsAppNumbers()`. | Send approved test replies for two merchants; prove each reaches only its intended business with order context. Near term, expose a clear Contact store action. No customer reply was sent here. |
| P2 | **Demo marking is not a universal outbound-message safeguard.** Announcement selection and sending have no demonstrated central `is_demo` suppression gate. Public listing isolation and several scheduled guards exist. | Exercise every outbound event for a demo store against a test transport. Centralise suppression or recipient allowlisting. This audit intercepted its own order/announcement/status sends explicitly. |
| P2 | **Funnel-event persistence is not demonstrated.** `src/app/api/analytics/event/route.ts` logs to stdout and returns success even on caught failures. An external log drain may exist; its configuration was not verified. | Trace a known signup→first product→first order event into durable reporting; validate schema and monitor ingestion loss. Existing merchant sales analytics are separate and should not be described as absent. |

The first-month trust allowance can also be stricter than the advertised plan allowance. Explain anti-abuse limits visibly during onboarding; do not surprise merchants with a smaller usable allowance.

## UI/UX improvements, ranked by likely client impact

1. **Make the first successful sale the centre of onboarding.** Prefill already collected contact details, then show one short checklist: store details → first product → fulfilment/payment → preview/practice order → share. Keep advanced industry presets available without making every new seller scan them. Measure time to first product and first shared link.
2. **Shorten the mobile sales pitch and explain the trial.** The measured homepage is about 15,226px tall at 375×812; pricing begins around 10,080px, over twelve viewport heights down. Lead with one real store example, the main outcome, simple price/trial explanation and CTA. Put exhaustive feature lists behind comparison controls. Explain “Create Free Store”, the 30-day trial and what happens afterwards consistently.
3. **Use customer-facing language.** Replace operational phrases such as “setup flow healthy”, “data rows” and long command-centre explanations with the task or outcome. “What needs my attention?” is more useful than a score without an obvious next action. Replace internally focused marketing language with merchant benefits.
4. **Make fulfilment status trustworthy.** Fix R4-001/005/006/007 together: available methods, orderability, stock and acceptance are different states. Show next steps, receipt and tracking without requiring WhatsApp to understand an order.
5. **Improve mobile editing and accessibility.** Use progressive disclosure for inventory, variants, rentals and service settings; make labels explicit and focus visible. The service-list CTA declares a 40px minimum height, below the brief's 44px target; standardise target sizing and audit it across themes rather than declaring every control compliant.
6. **Strengthen credible social proof.** Feature consenting, orderable merchants with clear photos and industry examples. Distinguish total registered/active stores from currently listed stores; a “20+ stores” headline and 12 listed destinations need explanatory labels, not necessarily changed numbers.

**Activation evidence:** The read-only database snapshot found 38 non-demo merchants, including 20 active; 14 had no undeleted products and 27 had no orders. These are cross-sectional counts, **not** cohort conversion or churn rates, and include inactive accounts. They suggest measuring activation before prioritising more feature breadth. The two large Octovia catalogues account for most of the public product count, so thousands of products should not be presented as evidence of equally broad merchant adoption.

## New features that could make OshiCart more attractive

These are prioritised proposals, not implementation commitments or promises of revenue. S/M/L are relative effort estimates. Existing CRM, coupons, reviews, variants, rentals, bookings, statements, broadcast and cart-recovery capabilities are not being presented as new.

| Rank | Addition or meaningful extension | Who benefits / why it fits | Effort | Success measure |
|---|---|---|---|---|
| 1 | **Quote → approval → deposit → order** with scope, expiry and customer acceptance | Designers, services, custom gifts and made-to-order sellers. Directly resolves the quote-flow gap rather than forcing zero prices. | M–L | Quote-to-accepted-order rate; response time |
| 2 | **Required personalisation and paid add-ons**: text, options, reference-image upload, surcharges | Bakeries, gifting, embroidery and beauty packages. Reduces manual WhatsApp clarification and supports larger baskets. | M | Incomplete-order rate; add-on attachment; basket value |
| 3 | **Delivery zones and rules**: areas, minimum basket, fees, lead time and capacity | Local food and retail. Extend existing delivery scheduling, rather than rebuilding it. State buyer-paid courier costs clearly. | M | Checkout abandonment; delivery-related cancellations |
| 4 | **Merchant staff accounts and permissions**, followed by simple counter-sale/POS entry | Shops with more than one operator need separate access and one inventory for in-person and online sales. Include audit history. | M–L | Team activation; stock discrepancies; retained multi-user stores |
| 5 | **Own-brand WhatsApp communications / merchant reply routing** | Customers expect replies to reach the business they purchased from. Start with correct routing/contact links; own-number onboarding is a larger paid capability. | L | Reply resolution time; merchant adoption; cost per order |
| 6 | **Back-in-stock subscriptions and targeted repeat buying** | Retail and repeat-purchase merchants. Extend existing reorder/recovery features with explicit opt-in and suppression controls; avoid a duplicate generic broadcast feature. | M | Opt-in to purchase conversion; repeat-order rate |
| 7 | **Branded domain and focused campaign pages** | More established sellers need a business identity beyond a marketplace link and a share page for one promotion. | M | Domain activation; campaign checkout conversion |

**Benchmark evidence, checked during this audit:** Take App documents [product options and personalisation](https://www.take.app/help/products-options), [delivery capabilities](https://www.take.app/products/delivery) and [area-based delivery](https://www.take.app/help/delivery-by-area). Bumpa documents [staff-account management](https://support.getbumpa.com/support/solutions/articles/150000041611-managing-staff-account), [in-store POS](https://www.getbumpa.com/blog/bumpa-pos-for-businesses-in-nigeria) and [back-in-stock extensions](https://www.getbumpa.com/blog/your-online-store-your-way-introducing-bumpa-website-extensions). [Shopstar's feature comparison](https://www.shopstar.co.za/pricing-and-features) provides a regional reference for domains, staff and commerce packaging. These demonstrate established feature patterns, not verified Namibian availability or guaranteed local demand.

WhatsApp automation requires consent, correct message classification and sustainable unit economics. [Meta's current pricing overview](https://whatsappbusiness.com/products/platform-pricing/) bases charges on delivered messages, category and market, with specified free-message conditions. Verify the current rate card before pricing a bundle; do not rely on an unverified future billing-date claim. Own-number integration is a known product pattern in [Take App's integration documentation](https://intercom.help/takeapp/en/articles/11568325-what-is-whatsapp-business-integration).

**Recommended sequence:** fix the P1 flows and atomic quota gap → streamline activation and truthful storefront state → build quotes/personalisation/delivery rules → add team/POS and deeper messaging. AI-assisted product drafts may help later, but should require merchant review and should not precede reliable orders and fulfilment.

## Regressions and previously fixed areas

| Earlier item | Current conclusion |
|---|---|
| R3-001 production dependency advisories | Current `npm audit --omit=dev`: zero reported vulnerabilities. This is a dependency scan, not a security certification. |
| R3-002 query failures interpreted as zero usage | Fail-closed regression check passes; atomic tier enforcement is still a separate unresolved gap. |
| R3-003 / QA-014 performance | Current large-store LCP remains poor. Exact before/after classification is limited by changed measurement conditions. |
| R3-004 / QA-012 contrast | Directory-footer failure persists/recurs; R4-008. Other sampled public pages scored 100 automated accessibility. |
| R3-007 lint errors | Lint now exits successfully: 0 errors, 33 warnings. |
| Prior product RSC crash | Not reproduced in current store-to-product click-throughs. |
| QA-002 email ownership / QA-024 Orders access | Fresh signup required email confirmation; after the user confirmed it, setup and Orders worked. |
| QA-025 account overflow | Long QA email did not create horizontal overflow in the current 375px dashboard sweep. |
| Prior service vocabulary issues | R4-002 is a related cross-layout quote/service inconsistency. It is not claimed as an exact reproduction of the earlier submitted online-service invoice bug. |
| R2-001 invoice cash instructions | QA goods/pickup invoice says Cash on Collection and “Please pay when collecting your order.” Other service/rental invoice variants were not retested end-to-end. |

## Verified working and actual coverage

### Public and customer journeys

- Clicked all **12** current directory stores: Octovia Nexus, Octovia Nexus Promo, Apatchy Beard Company, Gift Edit, Tunga's Crochet Corner, Iknows Loops, Traeger Farm Products, Sonja's Creation, Design Today, Mother Culture, Sunrise Crumbs Bakery and W.J.V Computers.
- Clicked sampled product details from store listings, including category navigation for the large Octovia catalogues. Where a store had fewer than three products, tested the available sample. No sampled click reproduced the previous application/RSC crash. The initial product sweep covered 23 product pages; the separate category sweep added six Octovia pages.
- Reached checkout on seven ordinary cartable stores: both Octovia stores, Apatchy, Gift Edit, Tunga, Sonja and Iknows; additionally reproduced Design Today's quote checkout. Three stores were paused; Traeger items were out of stock. **No order was placed with a real merchant.**
- Iknows variant selection carried Ladies / Black / Medium and the N$400 price into checkout. Unavailable option combinations were disabled. A VAT-exclusive sample showed N$7.21 + N$1.08 VAT = N$8.29.
- Home and directory had no horizontal overflow at 375, 768 and 1280px. The 12 storefronts and sampled product views were checked at 375px. Public Help, Guide, App, Agents, Terms, Privacy and Prohibited Products rendered.
- Anonymous direct-route checks: Dashboard and Orders redirected to `/login`; Admin and Admin Merchants redirected to `/admin/login`. Agent Dashboard displayed its sign-in gate. These are route-guard checks, not authenticated role-isolation certification.

### Merchant and controlled transactions

- Existing-email signup was refused without altering the existing account. A Gmail alias QA account was created and confirmed by the user, then logged in and completed setup.
- Fourteen dashboard sections loaded: Dashboard, Products, Share, Orders, Bookings, Customers, Broadcast, Reviews, Coupons, Analytics, Statements, Account, Subscription and Settings. Mobile 375px sweep found no horizontal overflow. Page visibility is not a claim that every action inside each page was tested.
- Product creation and editing persisted N$100 → N$125, inventory enabled and quantity five after reload.
- Welcome coupon template saved as `QA10SEP05`, 10%, and persisted after reload.
- Anonymous QA order #1: N$125 − N$12.50 discount = **N$112.50**, zero delivery/VAT/deposit. Database values and coupon use count agreed; stock decreased to four.
- Anonymous QA order #2: **N$125**, no coupon. Stock decreased to three. Merchant-linked invoice #2 displayed N$125 and correct pickup/cash instructions.
- Both cancellations used the normal merchant UI and persisted after reload. Database verification: both `cancelled`, **stock restored to five**, zero pending/active orders.
- Owner-preview ordering is disabled. New-account paid Statements gate was visible.

### Engineering checks

- `npm run build`: pass; Next.js 16.3.3, 109 generated pages. Non-fatal middleware/proxy and Edge Runtime warnings remain.
- `npm run lint`: pass, 0 errors / 33 warnings.
- All **23** `scripts/check-*.ts` scripts passed: billing-contact, billing-period, branding-gate, cart-payload, coupon-templates, dashboard-nav, demo-store-isolation, low-stock-digest, merchant-column-grants, order-quota-fail-closed, payment-methods, payment-reminders, phone-canonical-form, plan-features, public-tier-reads, pwa-helpers, rentals, select-star, server-safe-cart-item, service-mode, setup-redirects, setup-submit-gate and statements.
- Production dependency audit: zero reported vulnerabilities. Full audit including development tooling: **7 affected package entries — 5 high, 1 moderate, 1 low**. These are not seven distinct root vulnerabilities and were not represented as deployed production vulnerabilities. No automatic audit fixes were applied.
- Eight fresh mobile Lighthouse measurements; separate twice-repeated announcement-total fixture. Browser console/network observation identified the welcome 403. Expected first-run/slug lookup responses and injected antivirus requests were not inflated into platform defects.

## Blocked or unexercised coverage — not a full-platform certification

- Authenticated admin pages, approved-agent operations, merchant staff roles and paid-tier actions lack the relevant credentials/entitlements. Anonymous admin and agent sign-in gates were observed; this is not full authorisation testing.
- Cross-merchant direct-ID read/write attempts and a complete current RLS/permission matrix were not freshly exercised. Earlier-round evidence and passing static grant checks are not substitutes.
- Real WhatsApp delivery/OTP, reply routing, email order notifications, cron side effects and payment reminders were not exercised. Order-related sends for the QA account were intercepted deliberately. Email signup confirmation did complete.
- DPO checkout/callback, real payment collection, proof-of-payment upload, refunds/credit notes and rental return/deposit refund were not completed.
- Full rental/night-stay and service-booking lifecycles, overlapping capacity/concurrency, blocked-date writes, VAT-inclusive settings round-trips and every invoice variant remain untested live in this round.
- Fixed/expired/minimum-spend/usage-limit coupon edge cases, malicious or very large CSV imports, category mutations, all settings saves and campaign broadcasts were not fully exercised.
- Native phone/PWA installation and offline behaviour, exhaustive keyboard/focus/44px target checks, every theme, full SEO/social-image rendering and regenerated PDF pagination were not freshly validated. Browser viewports are not physical-device tests.
- A script that initially returned a loading shell was rerun with content waits. Automation timeouts caused by hidden custom controls or an admin heading hidden at mobile width were not counted as application defects.

## QA records and handoff

- QA store: `qa-demo-20260905-do-not-order`; merchant ID `163d2e7e-cedd-43b9-8cb9-d47d560abddc`.
- Login email: `wazabi007+oshicartqa20260905@gmail.com`. Password intentionally omitted from this report.
- Supabase-assisted verification was used to mark this newly created, clearly labelled store `is_demo=true` and verify persisted results. No schema or access-policy changes were made. The Playwright workflow supplied the real click-through and mobile evidence.
- Retained for follow-up: one QA product, one coupon, two cancelled QA orders and the demo account. The store remains active but demo-marked, excluding it from the public marketplace; a person with its direct URL may still open it. Demo marking alone should not be assumed to suppress every notification.
- QA orders: #1 `644317b7-2ef6-40d9-a1a9-d63b8903c4fa`; #2 `a735055a-4fc4-4ee6-a4f4-c49fd10fd955`. No real payments; no real merchant records modified. [Cancellation evidence](output/playwright/qa-2026-09-05/qa-orders-cancelled.png).
- Artifacts and read-only reproduction scripts: `output/playwright/qa-2026-09-05/`. Local browser logs may contain account details; do not distribute raw logs without redaction.
- **No application fixes, deployment, commit or push were performed.** Prior QA reports were not overwritten.

## Fix implementation and verification — 5 September 2026

### Scope and release status

The user requested the QA fixes and an end to repeated low-stock WhatsApps. The original audit above is retained unchanged apart from this status pointer/addendum. Code and an additive database migration are now present locally; no production migration, deployment, commit or push has been performed in this implementation pass. The larger feature proposals remain a product roadmap, not completed functionality.

**Important:** Daily stock messages can continue from the currently deployed code until the new sender/cron code goes live. This report does not certify that production messaging has already stopped.

### Low-stock WhatsApp policy implemented

- One automatic low-stock alert attempt **per store, ever**, not one per day, product, or restocking cycle.
- The sender uses the permanent key `low_stock_alert:<merchant-id>`; a unique database key arbitrates simultaneous first attempts.
- Any existing low-stock message history consumes the allowance, including older product/day keys. Queued, failed, sent, delivered and read records all prevent another automatic attempt.
- Changes in quantity, product or calendar day never reset the allowance. Merchant eligibility/history lookup errors suppress sending rather than risk duplicates.
- No dashboard stock tracking is disabled. Only the automatic low-stock WhatsApp repetition changes. Other reminder categories retain their existing cadence.
- Retain the historical `whatsapp_messages` rows: deleting the deduplication history can re-arm a store. There is intentionally no automatic retry of a failed stock-alert attempt.

### Finding-to-fix matrix

| Finding | Local implementation | Verification / remaining acceptance |
|---|---|---|
| R4-001 fulfilment | Persist `pickup_enabled`; pickup-only saves an empty provider list; settings and checkout respect explicit eligibility; deferred database guard checks the final courier provider. Pure services do not acquire a hidden goods-delivery requirement. | Isolated PostgreSQL tests pass for pickup-only, delivery-only, courier final update and service exemption. Existing merchants retain pickup by default; no speculative correction of their delivery settings. Live settings/checkout round-trip needs migration. |
| R4-002 quote-only checkout | Shared server-safe quote predicate; quote actions across all layouts; product detail shows an enquiry and hides purchase controls; checkout rejects stale zero-price cart entries; database rejects zero-price order lines. Variant parents remain selectable. | Local storefront-to-detail browser interaction passes; no Add to Cart, cart remains empty, quote CTA 48px at 375px viewport. PostgreSQL rejection and rollback pass. This is a manual WhatsApp enquiry, not a stored quote/approval/deposit system. Social-image/metadata price wording remains a follow-up. |
| R4-003 welcome notification | Canonicalise recipient comparison and send target; return HTTP 502 for failed transport; setup checks the response and normal dashboard landing displays a non-blocking failure notice. Signup phone prefills setup. | Route-level fixtures accept local/international forms, reject unrelated recipients/cross-owner requests and surface failure. No live welcome send performed. A retry control and preserving the warning through the selected-plan checkout redirect remain follow-ups. |
| R4-004 announcement totals | Announcement projection now includes refundable deposits and call-out fees before shared payable-total arithmetic. | Rental, call-out, VAT-inclusive/exclusive, discount and delivery projection fixtures pass. Real template delivery remains untested; no new tax treatment of deposits. |
| R4-005 marketplace truth | Shared eligible-store source for directory/gallery/roster; explicit ordering badge; featured demo candidates must be orderable; no hardcoded fallback pretending to be live; service-only availability RPC accounts for suspension, billing-cycle quota and first-month count/value caps. | Isolated database availability tests pass. New RPC is not installed in production yet, so live list acceptance is blocked. Availability is a point-in-time indication, not a reservation of quota. Accepting-orders filter remains optional polish. |
| R4-006 paused vs sold out | Menu/compact views now distinguish ordering paused from actual stock exhaustion. | Source/type checks pass; all-theme rendered regression remains pending. |
| R4-007 premature confirmation | Success reads “Order received” and “Awaiting store confirmation”; visible tracking/invoice links use the returned tracking token. Next-step copy is service-safe. | Type/build checks; new controlled order lifecycle after migration is still required. |
| R4-008 footer contrast | Lighter directory-footer text token. | Source change checked; rerun Lighthouse contrast audit on the released page before closing. |
| R4-009 inventory accessibility | Accessible name/description, 44px label target, visible keyboard focus styling on create/edit inventory switches. | Source/type/lint checks; authenticated assistive-technology/focus regression still required. |
| R4-010 catalogue performance | First page reduced from 100 to 24 products; skip invisible product/variant queries on category-folder and order tabs; parallelise independent queries; reserve directory logo dimensions. | Build/type checks only. No matched post-deployment Lighthouse/field measurement yet; **performance acceptance remains open**. |

### Additional source-review fixes and UI work

- **Atomic tier allowance:** A merchant-row lock and BEFORE INSERT order trigger enforce the billing-cycle tier limit, excluding cancelled orders; unlimited and suspended states are covered. Both canonical `place_order` overloads are included in the migration, with the core lock moved before the legacy trust checks. Read-only production function-body hashes matched the pre-change canonical bodies. Sequential/rollback PostgreSQL tests pass; a two-connection final-slot race and the complete RPC lifecycle must still be exercised in staging.
- **Merchant reply routing:** Signed quoted replies route using the original message's customer, merchant and order context; no “latest order” guess. Two-merchant route fixtures pass, including recipient mismatch and invalid signature. Ambiguous/contextless replies retain platform-admin fallback. Transport/database failure returns 503; message claims remain idempotent. A transport failure after a claim is recorded needs operational recovery, not a blind resend. Actual Meta delivery remains untested.
- **Demo outbound isolation:** Merchant-scoped sends through the shared event sender are centrally suppressed; order-notification email also checks demo status. Mock transport and existing demo-isolation checks pass. This does not certify every legacy direct-send or email path across the entire platform.
- **Durable funnel events:** Validated event names, UUID sessions, bounded bodies/paths, stripped query strings/receipt capabilities, service-only storage and a per-session 30/minute limit replace success-only stdout logging. PostgreSQL persistence/rate/access checks pass. A retention policy, global abuse controls, operational dashboard and browser-to-storage acceptance remain follow-ups; client events are not a trusted financial ledger.
- **Activation and sales copy:** Signup phone reuse, visible first-month safety allowance, “Store setup complete” wording, pricing moved higher, trial copy clarified and longer feature lists collapsed. Four alternate layout CTA minimums increased to 44px. Unapproved testimonial content was removed. Broader onboarding redesign and the seven proposed growth features were not built in this defect pass.

### Verification evidence

- `node scripts/check-qa-round4.mjs`: **14 groups passed**, including inventory accessible-name/focus wiring, mocked transport concurrency/history suppression, route authorisation, two-merchant reply context, money projections, quote/fulfilment constraints, cancellation-aware quota, trust-cap display, month-end billing and private funnel persistence. The inventory focus test was observed failing before the missing CSS wiring was corrected. The logged webhook error is the intentional failed-transport fixture; the expected response is 503. No external messages or production database writes are made by this script.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with **0 errors / 28 warnings**; warnings are retained, not described as a warning-free result.
- Focused ESLint on the final inventory-form edits and the new regression script: passed without warnings.
- Fresh final sweep of all **23** existing `scripts/check-*.ts` checks: passed, exit 0.
- Fresh `npm run build`: passed compilation/type generation and **109 pages**, exit 0. Middleware/Edge deprecation notices remain. The caught `Could not verify store ordering availability` error confirms the unapplied RPC prerequisite; build success is not a marketplace runtime pass. Rebuild after the migration, rather than deploying this pre-migration output.
- Embedded PostgreSQL runtime: PGlite, installed only under ignored `output/qa-runtime`. To reproduce: `npm install --prefix output/qa-runtime --no-save --package-lock=false @electric-sql/pglite`, then run the `.mjs` script. It applies the entire migration to disposable fixture tables. This is not a substitute for the complete production schema, RLS matrix or independent concurrent connections.

### Rendered flow check

**Flow:** local `/s/design-today` → Request a Quote → Digital Marketing and Growth Management → visible merchant enquiry, without adding a free item to cart.

| Check | Result |
|---|---|
| Page identity | Correct local storefront and product title/URL |
| Meaningful content / no framework overlay | Passed after server content loaded |
| Console health | No warning/error entries for this interaction |
| Interaction | Quote listing navigated to detail; cart remained empty; no Add to Cart button |
| Mobile | 375×812 viewport; 48px quote action; measured content width did not exceed viewport |
| Screenshot | `output/playwright/qa-2026-09-05/quote-fixed-local-mobile.png`; additional in-app browser screenshot emitted in the task |

The earlier local screenshot used Playwright CLI; the resumed final check used the now-available in-app Browser workflow. No merchant WhatsApp link was sent/submitted. Local share links inherit the development `SITE_URL` (`localhost:3000`); production URL configuration was not changed. The local dev server was stopped after inspection.

### Release order and remaining gate

1. Production database/application rollout was approved by the user after staging verification passes. Creating paid staging infrastructure still requires separate cost confirmation.
2. Apply `supabase/migrations/20260905062808_qa_round4_commerce_guards.sql` to an isolated full-schema staging environment first; exercise both order overloads, two-client final-quota race, cancellation/restock, service/rental/VAT flows and authenticated column grants.
3. Apply the approved additive migration before deploying the app. The app references `pickup_enabled`, `get_store_orderability` and `record_funnel_event`; shipping it against the old schema breaks those boundaries. Do not close the marketplace test merely because the build finishes with a caught “Could not verify store ordering availability” error.
4. Rebuild/deploy, verify directory/homepage contain eligible stores, run isolated QA checkout/cancellation and remeasure mobile Lighthouse twice under matched conditions.
5. Verify low-stock history and stable event keys without sending an extra alert to already-contacted merchants. Exercise other messaging only against approved test recipients.

The verification workflow deliberately leaves the migration-dependent boundary open. React/Next.js guidance informed parallel reads, reduced initial payload, server-safe shared helpers and derived service fulfilment state; the database workflow supplied isolated transaction/privilege tests. **Local implementation is not production sign-off.**

### Approved rollout: infrastructure preflight

The user approved staging verification followed by migration/deployment. Read-only preflight found only the production OshiCart Supabase project (`pcseqiaqeiiaiqxqtfmw`) and no development branches. Docker Desktop is installed but its database engine is not running, so a local full-schema staging environment is not currently available either.

The repository is linked to Vercel project `prj_VqSo6W70W0CLeP53klmsopfSaFlC` under team `team_VJaCAvT9ERTK5tX8FjWbUPAX`. The connected Vercel integration returns **403 Forbidden** for this project and an empty team list. A non-escalated CLI availability attempt was blocked by local npm-cache permissions; no deployment was attempted through it.

**Rollout paused before production changes:** choose/enable staging (a temporary Supabase branch requires organisation selection and explicit cost confirmation), and restore Vercel access to the existing OshiCart team/project. No new paid branch, production migration or deployment was created by this preflight. The stock-alert change is still local.

### 5 September 2026 — local staging verification update

This supersedes the earlier Docker-unavailable preflight. Docker Desktop is running. OshiCart now has a separate local PostgreSQL 17.6 staging database, Auth, PostgREST and Mailpit email capture. Existing Otjetu/WordPress containers were left untouched. No paid infrastructure was created.

**Isolation:** all QA container ports were verified bound to `127.0.0.1`; the app runs at `http://127.0.0.1:3100`. Supabase CLI startup was replaced by an explicit QA Compose file after it ignored the desired localhost binding; that empty CLI database was stopped before loading application schema. The app launcher overrides environment-file credentials with local keys, disables WhatsApp/DPO/Resend, and blocks external server fetches. Browser external HTTPS requests were also blocked. A quote link opened an unsent WhatsApp draft before the browser block was installed; it was closed without sending. No production customer rows or credentials were copied into staging.

**Baseline parity:** a read-only catalog export reproduced production's public schema, not the incomplete historical migration stubs. Before applying the QA migration, parity checks passed for all 32 tables/columns/defaults/RLS settings, 27 application function definitions and owners (newline normalization only), 61 policies, 809 table grants, 103 additional column grants, 84 function ACL entries, 128 constraints, 79 indexes, 16 triggers and 8 enums. Public tier configuration was copied; users, stores and orders were synthetic. This is public-schema parity, not a clone of cloud Auth settings, Storage, Realtime, cron scheduling or external providers.

The QA migration applied successfully **to local staging only**.

#### Acceptance evidence

| Boundary | Result and evidence |
|---|---|
| Full database RPCs | Both complete `place_order` overloads executed; server-computed prices and buyer-booked courier fees matched expected values. |
| Quote/fulfilment rollback | A zero-price item and disallowed delivery/pickup failed without leaving an order or consuming stock. Courier-only fulfilment succeeded after the deferred guard saw the final provider. |
| Real concurrent order allowance | Two independent PostgreSQL connections competed for the last Oshi-Start allowance. The second backend was observed waiting on the merchant lock; exactly one order succeeded. Cancellation restored the allowance; marketplace availability reflected exhaustion. |
| Real concurrent stock | Two independent connections competed for one remaining item. One order succeeded, one failed for insufficient stock, and stock never went negative. Cancellation restored one unit; repeated cancellation did not restore twice. |
| Service/rental totals | Service callout plus exclusive VAT matched expected totals. Multi-day rental price, untaxed deposit and overlapping rental capacity passed through the complete RPC. |
| Privileges | Anonymous funnel-table reads were denied. An authenticated merchant could update their own pickup flag but not another merchant's. |
| Stock-alert deduplication | Real Supabase client -> local PostgREST -> real PostgreSQL, with only the Meta transport mocked: eight concurrent attempts produced exactly one transport call and one stable event key. Later days/restock and legacy queued/sent/delivered/read/failed history produced no additional sends; demo stores were suppressed. |
| Browser pickup checkout | Synthetic order #1 saved as `pending`, pickup, N$100.00; confirmation said “Order received / Awaiting store confirmation”. Tracking and invoice loaded with the correct amount. Stock moved from 5 to 4. |
| Browser settings -> mobile checkout | Authenticated merchant disabled pickup and enabled store delivery; UI reported success and SQL confirmed `false / {store}`. Mobile checkout then offered delivery only, required an address, and saved synthetic order #2 as pending, delivery, N$100.00. |
| Funnel browser -> storage | Staging exposed a real origin-validation bug (403). Fixed the handler to compare with the configured public site origin rather than an internal proxy URL, with no trust in forwarded headers. Regression tests cover proxy/local origins, attacker origins and malformed config. Local origin returned 200, attacker origin 403; subsequent browser login/checkout events persisted. |
| Inventory accessibility | Authenticated create-product checkbox exposed the name “Track Inventory”; Space toggled it, retained focus and produced a 2px outline. At 375x812, document width equalled viewport width (375px). This is keyboard/DOM evidence, not a full screen-reader certification. |

**Fresh checks:** `scripts/check-qa-round4.mjs` now passes 15 regression groups; `scripts/check-qa-postgres.mjs` passes 7 real-PostgreSQL integration groups; `scripts/check-qa-stock-postgres.mjs` passes the real-storage stock-alert race/history test. TypeScript, focused ESLint and `git diff --check` passed. Git emitted newline-conversion warnings, not whitespace errors. A fresh production-mode build against staging passed all 109 pages, with no missing-orderability-RPC error. Middleware/Edge deprecation warnings remain. **This build embeds local QA configuration: do not deploy its artifacts; rebuild with the verified production environment.**

Local browser console errors after request isolation were the deliberately blocked external Vercel debug scripts. The earlier first-checkout analytics 403 was a real bug and was fixed, not dismissed. A dashboard logo aspect-ratio warning remains.

Read-only production history check found 130 existing low-stock records (7 delivered, 55 read, 68 failed). The new sender honors legacy history, including failed attempts, so rollout must not send a fresh stock alert to those previously attempted stores. Do not delete this history: it is the once-only eligibility record. **No live message was sent, and the production sender has not yet changed.**

#### Remaining gates / newly observed UI follow-ups

- Vercel CLI access was restored on 5 September after user login (see release preflight below). The earlier integration/token failure is superseded; no replacement project was created.
- Apply the approved production migration only as part of the ordered release, then rebuild with production configuration and verify the released app. No production migration, deployment, commit or push has occurred.
- Storage uploads, live Meta delivery, broader authenticated lifecycle coverage and matched mobile Lighthouse measurements remain open; this local stack does not yet run Storage or Realtime. The full platform audit is **not** marked closed.
- Tracking currently shows the “Ready” timeline step even when the merchant uses the simple order flow; pickup details show “pickup” rather than the configured collection address. These are newly observed presentation follow-ups, not fixed in this staging pass.
- The standard-grid zero-price product opens an enquiry without adding to cart, but its WhatsApp draft calls a physical product a “service”. Standardize that copy. Also resolve the dashboard logo aspect-ratio warning and consider collapsing the long mobile variation-preset list.
- Earlier report follow-ups (quote social-preview wording, onboarding notification-retry UX, performance/contrast certification and proposed growth features) remain explicit follow-ups rather than silently marked complete.

#### Local test workspace

Ignored local configuration/snapshot/launcher files are under `output/qa-local`; the pinned `pg@8.16.3` test driver is under `output/qa-postgres-runtime`. The reproducible integration scripts are in `scripts/`. The browser uses the synthetic account `qa-browser@example.test` (local-only password `LocalQa2026!Only`), store `/s/local-qa-demo`. Its two browser orders and all integration fixtures exist only in local QA. Demo-store WhatsApp log count was verified zero.

Start dependencies with `docker compose -f output/qa-local/compose.yaml up -d`, and start the isolated app/gateway with `node output/qa-local/start-app.mjs`. Run the three QA scripts above while that stack is running. Use `node output/qa-local/start-app.mjs --build` for a staging-configured build while the gateway is running. Do not run the old root Compose configuration for this test: it contains unrelated server/provider settings.

The Supabase and verification workflows drove schema-parity, concurrency and boundary checks; the Next.js/environment guidance informed the proxy-safe origin correction and isolation of local credentials. Playwright supplied browser, keyboard and mobile evidence.

### 5 September 2026 — production release preflight after authorization

- Vercel CLI authenticated as `wazabi007-collab`; inspection confirmed the existing `octovia-nexus/oshicart` project, ID `prj_VqSo6W70W0CLeP53klmsopfSaFlC`. Production site and Supabase project references matched OshiCart. Production secrets were inspected only in an ignored local preflight file; values were not printed or copied into staging.
- Recorded current production deployment as rollback reference: `dpl_6AUvnTbxcvtSwKTDXGQqRDHqEEym`, `https://oshicart-cseswwv2t-octovia-nexus.vercel.app`, serving `https://oshicart.com` before this attempted release.
- Read-only database drift checks confirmed the migration was absent and both production order RPC bodies still matched the staging baseline. Re-ran all 15 regression groups, all 7 real PostgreSQL integration groups, and the real PostgREST once-only stock-alert test: all passed; Meta transport remained mocked, with zero external messages.
- The production migration tool rejected `qa_round4_commerce_guards` before execution. Its safety review requires more explicit approval because the migration adds tables, triggers and permissions and replaces both live order-processing RPCs. These changes can affect checkout availability and data integrity despite passing isolated staging tests. No alternate execution path was attempted.
- **Release paused: no production migration or application deployment occurred. The once-only stock-alert fix is not live yet.** Explicit approval of this exact migration on production project `pcseqiaqeiiaiqxqtfmw`, followed by a fresh production build/deployment, is required. Do not deploy the schema-dependent application before the migration succeeds and is verified.
- Existing Supabase security-advisor findings remain; this preflight is not a clean security certification. The full-audit follow-ups above remain open. No commit or push was made.

The deployment skills informed the ordered database/application release and fresh-build requirement; the safety review stopped the release before any production mutation.

### 5 September 2026 — production migration applied; app release awaiting scope approval

This supersedes the preceding no-production-mutation status. After explicit user approval, `qa_round4_commerce_guards` applied successfully to production project `pcseqiaqeiiaiqxqtfmw`. Supabase recorded migration version `20260905191859` (the tested local source remains `20260905062808_qa_round4_commerce_guards.sql`; do not replay it).

Read-only post-migration checks passed: both order guards exist; the core RPC contains the merchant row lock; `get_store_orderability` returned results for 38 active non-demo stores; authenticated pickup-column update privilege exists; funnel RLS is enabled; anonymous funnel reads and event-recording execution are denied; service-role event recording is allowed.

Security advisors changed from 18 to 19 findings. The only new item is the informational [RLS enabled without policies notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) for `funnel_events`. This table is intentionally service-only, with anonymous/authenticated access revoked; no permissive policy was added merely to silence the notice. Existing advisor findings remain.

The subsequent production Vercel deployment command was rejected before execution by the safety review: the working-tree release spans more than the stock-alert fix and needs explicit full-scope approval. No workaround was attempted. The application still serves the previous deployment; the once-only stock-alert sender is **not live**. No live notification test, commit or push occurred.

Release scope awaiting approval: all current QA implementation changes covering once-only low-stock alerts, demo-message suppression, WhatsApp webhook/notification handling, checkout totals and confirmation, pickup/delivery settings, quote-only products across storefront layouts, marketplace ordering eligibility, funnel analytics, onboarding feedback, inventory accessibility, and landing/pricing/gallery UI changes; plus their shared helpers, regression scripts, migration source and documentation. Git reports 34 modified tracked files plus the previously listed new QA helpers/scripts/report/migration and generated agent guidance. `git diff --check` passes with newline-conversion warnings only. Ignored local credentials, test output and staging build artifacts must remain excluded from deployment.

The Supabase skill drove post-DDL privilege and advisor verification. The deployment safety review is the current blocker; broader platform-audit follow-ups remain open.

### 5 September 2026 — full QA change set released to production

This supersedes the preceding deployment-blocked status. The user explicitly approved the entire current QA change set after its scope was listed. The existing OshiCart project was deployed successfully through Vercel CLI; no replacement project, git commit or push was created.

| Release field | Verified result |
|---|---|
| Live URL | https://oshicart.com |
| Target / status | Production / READY; deployment inspection confirmed the live alias |
| Deployment | `dpl_Af7WF5b6GJxNSmPXcfQ5to1ELrGU` |
| Immutable deployment URL | https://oshicart-5gosyna4c-octovia-nexus.vercel.app |
| Created | 5 September 2026, 21:23:38 Africa/Windhoek |
| Source | Local QA working tree based on `502e774`, including approved uncommitted changes; HEAD alone does not reproduce this release |
| Framework / build | Next.js 16.3.3; fresh remote production build, not local staging artifacts; build completed in 27 seconds |
| Build checks | Compilation and TypeScript passed; all 109 pages generated successfully |
| Database | Production migration `20260905191859` / `qa_round4_commerce_guards` applied and verified before deployment |
| Initial error scan | Deployment-specific `--level error --since 15m --no-branch` returned no logs; this brief scan is not sustained monitoring or end-to-end sign-off |

**The once-only low-stock sender is now deployed.** Existing stock-alert history consumes eligibility, so already-attempted stores should not receive another automatic stock alert on later days or after restocking. Failed attempts also consume eligibility, as tested. No live cron or real WhatsApp send was triggered to demonstrate this; the eight-way race and history behavior were verified against isolated real PostgreSQL/PostgREST with mocked Meta transport before release.

Build warnings remain: middleware and Edge Runtime deprecations, an `unrs-resolver` install-script approval notice, and detection of an `.env` file with a recommendation to use Vercel environment handling. The deployment did not change production environment settings. Upload-file exclusion was not independently audited in this release verification; inspect explicit deployment exclusions/environment-file handling before the next release rather than treating the build warning as resolved.

The previous application deployment `dpl_6AUvnTbxcvtSwKTDXGQqRDHqEEym` remains the recorded rollback reference; rolling back the app would also restore its old stock-alert behavior and would not undo the database migration. No rollback was performed.

The deployment skills guided the fresh build, status/alias inspection and initial error-log scan. No post-release browser checkout, real payment or live message was performed in this release step. Broader authenticated lifecycle, Storage uploads, matched mobile performance measurements and the outstanding UI/UX/growth follow-ups remain open. Log drains and sustained monitoring were not inspected or configured. **Release completion does not close the entire platform audit.**

### 5 September 2026 — UI/UX follow-up implementation (local, not deployed)

Implemented at the user's request after the production release above. Existing uncommitted QA changes were preserved. No new production mutation, migration, deployment, commit or push occurred in this pass.

| Item | Implementation and evidence |
|---|---|
| Tracking timeline | Reads `uses_ready_step` on initial load and polling. Simple flow omits Ready, but keeps an actual historical/current Ready milestone if the merchant changes settings later. Local browser order #1 showed Placed → Confirmed → Completed. Upcoming labels no longer use faint 40% opacity. |
| Collection address | Tracking reads and displays the merchant's configured pickup address, with a contact-store fallback when absent. Local browser showed “QA Collection Desk, 12 Test Street”. Polling now normalizes the merchant relation just like the initial page. The address is current store configuration, not a historical order snapshot. |
| Quote wording and previews | Generic enquiry wording no longer calls physical products services. Metadata, portrait social cards and landscape link cards share quote/fixed/available-variant price labels. Zero-price items say “Request a quote”; valid variants use “From” pricing. The real local landscape PNG rendered correctly at 1200×630 and was visually inspected. |
| Welcome recovery | Dashboard and selected-plan checkout display a non-blocking notice. The warning survives the plan redirect and subsequent navigation in the same browser session; dismiss/success clears the URL flag and session marker. A new authenticated endpoint derives the merchant, number and message content server-side. One stable manual-retry key prevents repeated recovery sends; an already-failed recovery requires support. Existing successful/queued messages are not resent. Low-stock policy is unchanged. |
| Product variation presets | Native details/summary disclosure is collapsed initially. Browser Space opened and closed it, retained focus, and measured a 44px summary target. No product had to be saved to verify it. |
| Logo sizing | Dashboard desktop/mobile and plan checkout use reserved dimensions matching the source image's approximately 4.11:1 ratio, with contain sizing. Source image dimensions verified as 822×200. Dashboard browser showed no image-size warning during this pass. |
| Onboarding checklist | Extends the existing checklist with explicit fulfilment/payment review and safe owner-preview actions before sharing. Review confirmations are remembered in this browser session, not claimed as cross-device database state. No new practice-order system was built: preview does not submit orders. Sharing/dismissal errors are surfaced; share/add-item actions have 44px minimum height. |
| Marketplace filter | Adds “Accepting orders only”, preserving category/region/town/search filters, with a clear empty result and “Include paused stores” recovery. Local browser search retained the accepting flag; document width was 375px at a 375px viewport. |
| Directory rendering | New local change streams store results under Suspense so the heading/search need not wait for the catalogue. The install offer now appears below the catalogue in reserved space rather than inserting above the heading. This targets the measured shift; a matched measurement of the new release is still required. |

**Verification:** `scripts/check-qa-ui-followups.mjs` passes four groups covering timeline/history, social prices, retry authorization/history/transport failures and component/query wiring. The existing 15-group QA regression suite passed, as did setup redirect and setup-submit-gate checks. TypeScript and focused ESLint passed. Production-mode local build generated 110 pages successfully, using isolated QA credentials and disabled external messaging/payments. Final small markup refinements were additionally type/lint checked. Existing middleware/Edge deprecation warnings remain.

Browser evidence: `output/playwright/qa-2026-09-05/ui-followup-tracking.png`, `ui-followup-quote-preview.png`, and timestamped local browser snapshots. The local retry returned a visible failure with WhatsApp disabled; no real send occurred. Opening local plan checkout updated only that synthetic subscription's payment-reference field through existing page behavior. The local demo's simple-flow flag and test collection address were retained as fixtures. External Vercel debug scripts remained deliberately blocked in the local browser.

**Two fresh measurements of the already-released directory (not the new local UI code):** Lighthouse 13.4.1 mobile simulation with `*kaspersky*` blocked, matching the earlier recorded settings: performance **68 / 68**, accessibility **100 / 100**, LCP **4.71s / 4.70s**, CLS **0.115 / 0.115**, contrast pass in both. Artifacts: `ui-live-stores-1.json` and `ui-live-stores-2.json`. The prior footer-contrast defect passes these automated checks. The layout-shift trace identified the title block moving, consistent with the above-heading install prompt; this motivated the local relocation. Performance is still below target on the released version and is not marked closed.

**Remaining acceptance:** deploy this follow-up code separately, repeat matched performance checks (including large catalogues), and complete broader theme/assistive-technology/physical-device, upload and customer lifecycle testing. The current local stack lacks Storage; full upload and real payment/message acceptance was not simulated as a pass. A stored quote-approval system and the larger growth roadmap remain outside this UI pass.

Next.js/React guidance informed the server-rendered result boundary, small interactive notice and native disclosure; the Supabase workflow kept retry authorization server-derived without schema/permission changes. Playwright supplied the keyboard/mobile/browser evidence.

### 6 September 2026 — UI/UX follow-up deployed to production

The user requested live deployment. This supersedes the preceding local-only status: tracking/pickup fixes, quote wording and social previews, welcome-message retry/notice, collapsible presets, logo sizing, onboarding checklist, accepting-orders filter and directory rendering changes are now deployed.

| Release field | Verified result |
|---|---|
| Live URL | https://oshicart.com |
| Target / status | Production / READY; inspection confirmed the live alias |
| Deployment ID | `dpl_H8AT1btef6GfBB9Mupk3QH4PB1gf` |
| Deployment URL | https://oshicart-d2sh0loy7-octovia-nexus.vercel.app |
| Created | 6 September 2026, 06:43:43 Africa/Windhoek |
| Build | Next.js 16.3.3; fresh remote production build completed in 32 seconds; TypeScript and all 110 generated pages passed |
| Preflight | Four UI regression groups and all 15 earlier QA regression groups passed again; transport mocked, no production writes from tests |
| Initial error scan | Deployment-specific error logs over the last 15 minutes returned no logs; not a sustained monitoring certification |
| Rollback reference | Previous release `dpl_Af7WF5b6GJxNSmPXcfQ5to1ELrGU`; no rollback performed |

Added `.vercelignore` to explicitly exclude environment files, local QA output/data, build artifacts, tooling caches and scratch assets. The remote build downloaded 683 files and no longer reported the previous detected-`.env` warning. Existing middleware/Edge deprecations and the dependency install-script approval notice remain. Production environment settings were not changed.

No additional database migration was needed or applied. The once-only stock-alert behavior remains included. No commit or push was made; this deployment contains the approved working-tree changes, not just HEAD `502e774`.

The deployment skills guided the fresh build, status/alias inspection and error-log scan. This release step did not trigger live messages, payments, cron jobs or customer orders. Matched post-release performance measurements, broader device/theme/accessibility checks and upload/lifecycle acceptance remain open; the earlier directory measurements are not measurements of this new deployment. Monitoring drains were not inspected or configured.
