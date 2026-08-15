# OshiCart QA Round 2 Report

**Audit date:** 2026-08-15  
**Target:** Production (`https://oshicart.com`) plus local source review  
**Source:** `master` at `ba322ef`  
**Round-1 baseline:** `510dd3e` / `QA-REPORT.md`  
**Viewports/tools:** Headed Chromium, Playwright, mobile Lighthouse emulation, rendered PDF pages, Supabase production RLS/grant probes  
**Safety:** All five submitted orders were placed only in `oshicart-demo`. Every created identity, application, customer and order is labelled `QA2 (delete me)`. Email was sent only to `delivered@resend.dev`. No real merchant settings or data were changed; no confirmation bypass, destructive cleanup, load test, CAPTCHA bypass, secret commit or push was performed.

## 1. Executive summary

**Verdict: not ready for unconditional full-platform sign-off.** No P0 or P1 regression was found in the production paths that could be safely exercised. Twenty-two of the previous 25 findings are fixed, two are partial, and one remains broken. Core public commerce is materially healthier: day/night rental calculations, capacity, turnaround buffers, dates, deposits, online-service fulfilment, referral trial copy, password-recovery dispatch, product share cards and accessibility regressions all passed.

One new P2 defect is reproducible on two distinct order types: invoices derive the correct cash-payment label and fulfilment noun, but the instruction below still assumes store collection. An online invoice says “Online — nothing to collect” and then tells the customer to collect from the store; a room invoice says “Stay at the property” and then does the same. The merchant guide page-8 clipping defect also remains.

The highest-risk coverage limitation is explicit: Resend's documented test recipient accepts mail but provides no inbox. Signup dispatch, resend, duplicate handling, unconfirmed-user state, pre-confirmation login and password recovery were verified live, and the confirmation redirect was observed carrying both `tier=oshi_grow` and `ref=rehabeam`; the link itself could not be opened. A proposed database confirmation bypass was rejected and no production auth state was altered. Consequently, authenticated merchant route sweeps, VAT setting round-trips, hirer-ID/return UI, payment/status mutations, and approved-agent practice-store states could not be exercised end-to-end with the new account. Static, regression and least-privilege database evidence is reported separately rather than presented as live coverage.

### Top five issues / release risks

1. **R2-001 (P2): invoices contradict online-service and accommodation fulfilment.** The correct heading is followed by a store-collection payment instruction.
2. **QA-016 (P3): merchant guide page 8 is still clipped.** The live PDF is byte-identical to the rendered local copy.
3. **High-risk auth continuation is only partially verified.** Dispatch and preservation in the confirmation redirect pass; confirmation-link click/session/setup landing is blocked by the no-inbox test address.
4. **Authenticated new-work coverage is incomplete.** Dashboard route sweep, VAT persistence, hirer-ID lifecycle, return/payment/status feedback, and approved practice-store creation require a confirmed throwaway merchant/agent.
5. **Performance is mixed.** Home/product LCP improved, but storefront LCP and all three TBT readings regressed in this single-run comparison.

### Automated and live result snapshot

- `npm run build`: **PASS** — Next.js 16.1.6, 108 pages. Non-fatal warnings: middleware convention deprecation and Edge Runtime static-generation limitation.
- All **16** `scripts/check-*.ts`: **ALL PASS** (`billing-period`, `branding-gate`, `coupon-templates`, `dashboard-nav`, `demo-store-isolation`, `merchant-column-grants`, `payment-methods`, `payment-reminders`, `plan-features`, `public-tier-reads`, `pwa-helpers`, `rentals`, `select-star`, `service-mode`, `setup-redirects`, `statements`).
- Safe production Playwright subset: **11 passed, 3 intentionally skipped** because no authenticated store fixture was supplied. The formerly stale marketing assertion now passes.
- Regression outcome: **22 fixed, 2 partial, 1 not fixed**.
- New defects: **0 P0, 0 P1, 1 P2, 0 new P3**. QA-016 is a known unresolved P3, not counted as new.
- Production writes: one unconfirmed auth user, one pending agent application, five demo-store orders, five order items and five derived demo customers.

## 2. Regression table — previous 25 findings

| ID | Status | Round-2 evidence |
|---|---|---|
| QA-001 | **PARTIAL** | Checkout and WhatsApp now correctly say `Cash`, `Online — nothing to collect`, and no delivery/collection UI. Orders #4/#5 preserved the selected schedule (order #5: 18 Aug, 10:00). Invoice fulfilment heading is correct, but its cash instruction still says “Please pay when you collect your order from the store” — R2-001. |
| QA-002 | **FIXED** | Signup returned `Check your email`, API 200, no session. Production `auth.users` row `423449f9-...` remained `email_confirmed_at=null`, `last_sign_in_at=null`, with no merchant. Pre-confirmation login showed a confirmation/resend panel. Confirmation-link click is separately blocked by the no-inbox test recipient. |
| QA-003 | **FIXED, post-approval E2E blocked** | `/agents/dashboard` exists and signed-out users get a purpose-built sign-in state. Application succeeded and persisted pending/inactive. Source implements not-linked, pending, rejected, approved and practice-store states with owner-scoped RPCs. Approved creation/idempotency could not be exercised without approval/linking. |
| QA-004 | **FIXED** | Storefront card and product page both render `N$300.00 / night`. |
| QA-005 | **FIXED** | Night checkout shows `Your stay`, Check-in/Check-out, `Cash at check-in`, a static property address and no pickup/delivery selector. A 17→18 Aug stay submitted successfully. The invoice instruction defect is tracked under R2-001/QA-001. |
| QA-006 | **FIXED** | Cart drawer contains one `Subtotal` row; captured in `output/playwright/round2/QA-006-cart-single-subtotal.png`. |
| QA-007 | **FIXED** | `/guide` has 24 H2 sections and 24 contents links; every `#step-N` target resolves to its own matching heading. |
| QA-008 | **FIXED** | Selecting Khomas reveals `All towns`, `Windhoek`, and `Other (Khomas)`. A stale `?region=khomas&town=swakopmund` pair safely falls back to region results with no invalid town selected. URL normalization remains a UX improvement below. |
| QA-009 | **FIXED** | No-photo and photo product share-card endpoints both returned `image/png`, HTTP 200, exactly 1200×630. Tested demo Phone Charger and live photo product `847349fb-...` read-only. |
| QA-010 | **FIXED** | Valid approved referral code `rehabeam` validates and referred signup displays `35-day free trial`; ordinary/invalid referral signup displays 30 days. |
| QA-011 | **FIXED** | The authoritative call number `+264 81 238 4424` is shared by constants, guide and both PDF sources. WhatsApp support and sales numbers are now explicitly role-labelled rather than presented as conflicting generic support numbers. |
| QA-012 | **FIXED** | Live CTA computes to white on `rgb(0,137,56)` (`#008938`), contrast **4.53:1**. Low-stock badge uses `orange-900` on `orange-100`, replacing the failing light orange combination. |
| QA-013 | **FIXED** | Storefront image links expose `View <product>` accessible names; sort select exposes `Sort products`. |
| QA-014 | **PARTIAL** | Home LCP improved 4.8→3.99s and product 3.8→3.17s. Storefront regressed 4.1→4.26s. All three TBT readings increased. Full table in section 4. |
| QA-015 | **FIXED** | Past 14→16 Aug stay displays `The hire cannot start in the past` and disables Place Order; it no longer reports Available. |
| QA-016 | **NOT FIXED** | Live/local SHA-256 matched (`77003AD...195B45`). Rendered page 8 still starts mid-sentence at “...en Subscription to see your plan...”, omitting the beginning of item 1. Evidence: `output/pdf/round2/merchant-guide-8.png`. |
| QA-017 | **FIXED** | Agent handbook uses a plain `<a>`; no Next RSC-prefetch/prefetch-404. Direct PDF is valid and all eight pages rendered cleanly. |
| QA-018 | **FIXED** | Footer no longer contributes stale H4 outline entries; the production accessibility/marketing suite passes. |
| QA-019 | **FIXED** | The previously stale marketing assertion now passes in the 11-pass safe production suite. |
| QA-020 | **FIXED in source/regression; live round-trip blocked** | Settings loads `merchant.vat_inclusive`, exposes explicit exclude/include choices, and sends `form.vat_inclusive` when a VAT number exists. Migration 083 grants the column and all 16 regression checks pass. A live inclusive→unrelated-save→reload test requires a confirmed QA merchant and was not faked. |
| QA-021 | **FIXED** | Night WhatsApp/invoice show `1 night · 17 Aug – 18 Aug`. Day WhatsApp/invoice show `3 days · 24 Aug – 26 Aug`; invoice shows N$450 subtotal + N$500 refundable deposit = N$950 and `deposit refundable on return`. |
| QA-022 | **FIXED / original false positive** | `delivered@resend.dev` password recovery reached `Reset link sent!`; no HTTP 500. Reset-link click is unavailable for the same no-inbox reason as confirmation. |
| QA-023 | **FIXED in source; live form blocked** | New/edit forms branch helper and label text on `rentalUnit` for day/night. The public day/night cards and checkout wording agree. Authenticated create/edit live round-trip could not be repeated. |
| QA-024 | **FIXED in migration/regression; live route sweep blocked** | Migration 083 grants `uses_ready_step`; `check-merchant-column-grants`, `check-dashboard-nav`, and `check-setup-redirects` all pass. Build emits every required dashboard page. A live fully configured merchant sweep requires confirmation. |
| QA-025 | **FIXED in source; authenticated 375px view blocked** | Account cards now have `min-w-0`; email/user ID use `break-all` at `account/page.tsx:123-153`. Live 375px account verification requires a confirmed session. |

## 3. New bugs

### R2-001 — P2 — Invoice cash instruction contradicts actual fulfilment

**Component:** Public invoice / service-mode wording  
**Frequency:** 2/2 independent reproductions (night stay and online service)

**Reproduction A — night stay**

1. Add `Demo Guest Room (per night)` in `oshicart-demo`.
2. Checkout for 17→18 Aug and submit `QA2 (delete me) Night Stay 2026-08-15`.
3. Open invoice #1.
4. Observe `Stay at the property` followed by `Pickup from store`, then `How to pay — Cash at check-in` followed by `Please pay when you collect your order from the store.`

**Reproduction B — online service**

1. Add `Demo Logo Design (online)` and schedule 17 Aug.
2. Submit `QA2 (delete me) Online Service 2026-08-15`.
3. Open invoice #4.
4. Observe `Online — nothing to collect` followed by `How to pay — Cash`, then `Please pay when you collect your order from the store.`

**Expected:** The payment instruction matches the already-correct mode-specific label: online → merchant arranges payment on WhatsApp; room → cash at check-in. No pickup/collection language appears for either.

**Actual:** The invoice's title/fulfilment noun uses the new shared model, but the COD paragraph falls back to goods collection whenever `delivery_method !== delivery`.

**Evidence:**

- `output/playwright/round2/R2-001-night-invoice-wrong-pickup-copy.png`
- `output/playwright/round2/R2-001-online-invoice-wrong-collection-copy.png`

**Suggested fix:** `src/app/invoice/[orderId]/page.tsx:455-467`. Import/use `cashInstruction(fulfilment, order.delivery_method ?? "pickup")` from `src/lib/service-mode.ts:178-200`, just as lines 168-171 already use `cashMethodLabel`. Remove the invoice-local goods-only ternary. Also remove/replace the extra `Pickup from store` subline for stays at `invoice/[orderId]/page.tsx:230-270`, deriving all record vocabulary from `fulfilmentNoun`.

## 4. Performance and perceived responsiveness

### Mobile Lighthouse — before → after

Single production mobile runs were repeated with the same Lighthouse category. Scores are lab results and should be interpreted with normal run-to-run variance.

| Page | Perf | LCP | TBT | CLS | LCP element |
|---|---:|---:|---:|---:|---|
| Home | 70 → **70** | 4.8s → **3.99s** | 120ms → **306ms** | 0 → **0** | Hero storefront phone image: `A real OshiCart storefront — Octovia Nexus Home & Lifestyle` |
| Storefront `/s/oshicart-demo` | 72 → **68** | 4.1s → **4.26s** | 160ms → **324ms** | 0.057 → **0** | Store description paragraph: `A practice store for OshiCart referral agents...` |
| Product (demo T-shirt) | 80 → **85** | 3.8s → **3.17s** | 140ms → **178ms** | 0 → **0** | Product description paragraph: `A practice product with a bigger price...` |

**Verdict:** LCP improvement is real enough to be encouraging on home (-0.81s) and product (-0.63s), and storefront CLS is now zero. The 2.5s LCP target is still missed everywhere. Storefront did not improve in this run, and TBT regressed on all three pages. QA-014 is therefore only partially fixed.

**LCP diagnosis:**

- Home TTFB was only ~173ms; most LCP time was resource-load delay (~1.86s) before the hero phone image. The image is the priority target, not the cached count query now.
- Storefront TTFB was ~175ms, but element-render delay was ~2.73s for plain description text, indicating hydration/font/main-thread sequencing rather than a heavy LCP image.
- Product LCP is text and improved, but still waits ~3.17s in the throttled lab profile.

### Perceived responsiveness

| Interaction | Result |
|---|---|
| Public add-to-cart, cart open/close, date availability, appointment selection and Place Order | **PASS:** immediate visible state; submission remains on the form until the confirmed state replaces it; no duplicate order from one click was observed. |
| Route loading | **STATIC/PUBLIC PASS:** route skeletons exist for dashboard, orders, products, storefront and Browse Stores. Browse Stores/storefront navigation showed loading content rather than a frozen old route. |
| Dashboard tab timing | **BLOCKED:** no confirmed throwaway merchant session. Presence of `dashboard/loading.tsx`, `orders/loading.tsx`, and `products/loading.tsx` is not a substitute for a measured live tab sweep. |
| Quick order-status pill | **STATIC PASS, live blocked:** `quick-status.tsx:57-93,168-214` keeps loading/transition state through `router.refresh()` and renders a pending control while either state is active. No merchant-owned order was available. |
| Settings/product/payment/return double-submit | **STATIC PASS, live blocked:** save buttons are disabled and change to `Saving…`; product uses `Saving…`; record payment/return disable while saving. Live timing and >300ms acknowledgement could not be measured. |

No exercised public control took >300ms with no visual acknowledgement. That statement does **not** extend to the blocked authenticated controls.

## 5. Ranked UI/UX improvements

1. **Use the shared fulfilment model for invoice instructions, not only labels.** Evidence: R2-001. Replace the final invoice COD ternary with `cashInstruction`; add snapshots for goods delivery, goods pickup, at-store service, at-client service, online service, day hire and night stay.
2. **Disable resend actions during the provider cooldown and show a countdown.** An immediate confirmation resend was allowed, returned 429, and surfaced “you can only request this after 17 seconds”; waiting 20 seconds then succeeded. Show `Send again in 17s` and avoid a predictable error path.
3. **Normalize stale town filters in the URL.** `region=khomas&town=swakopmund` safely falls back, but the stale URL remains and no town is selected. Replace/remove the invalid `town` parameter and announce that region results are being shown.
4. **Finish the PDF layout fix with a hard page break or section grouping test.** `break-inside: avoid` on list items did not prevent Chromium from clipping section 22 item 1. Add an explicit break before section 22 or keep the heading plus first list item together, then pixel-review every page in CI.
5. **Make confirmation and reset QA observable without weakening production auth.** Keep the secure email gate, but provide a staging inbox/test-domain workflow or an Auth-admin test harness so confirmation callbacks and tier/referral preservation can be validated end-to-end without direct database edits.
6. **Keep performance work focused on main-thread/render delay.** TTFB is already fast in these runs. Prioritize the home phone-image discovery path and storefront hydration/font work; track medians of three runs rather than a single score.

## 6. Security findings

| Probe | Method/scope | Result |
|---|---|---|
| Signup does not pre-confirm email | Live signup + production auth-row read | **PASS:** no session; `email_confirmed_at` and `last_sign_in_at` null; no merchant row. |
| Confirmation redirect preserves acquisition context | Live signup/resend network | **PASS BEFORE CLICK:** resend target was `/auth/confirm?tier=oshi_grow&ref=rehabeam`. Link click/setup write blocked by no inbox. |
| Pre-confirmation login | Correct throwaway credentials | **PASS:** no session; explicit `Confirm your email first` and `Send the link again`. |
| Duplicate signup enumeration/handling | Same email submitted twice | **PASS UX:** friendly account-exists/sign-in message and no second auth row. This intentionally reveals that the email exists on a signup form; acceptable product decision, not a tenant-data leak. |
| Password recovery | `delivered@resend.dev` only | **PASS:** provider accepted and UI showed `Reset link sent!`; no 500. |
| Anonymous referral-table read | Direct REST, safe columns then private columns | **PASS:** both denied 401/SQL 42501; no row data. |
| Authenticated unlinked-user referral read | Transaction-local `authenticated` role with QA2 user JWT claims; read-only | **PASS:** safe-column count was 0. Private `payout_number`, `whatsapp`, `email`, `notes` projection failed 42501. No role/row persisted. |
| Cross-agent access | RLS/grant regression + unlinked-user probe | **PASS WITH LIMITATION:** policies hard-filter on `auth.uid()` and private columns are not granted. A second confirmed linked agent REST session was unavailable. |
| Demo/practice-store browse isolation | Live `/stores` + regression/source | **PASS:** `OshiCart Demo Store` absent; seven real cards sampled. `check-demo-store-isolation` passes. |
| Demo/practice automation isolation | Source/regression; no 24-hour wait | **PASS:** payment reminders, auto-cancel, stale-order alerts, low-stock and cart recovery exclude demo merchants; >30-day practice-order purge is covered by the isolation regression. |
| Hirer ID customer exposure | Source/migration + actual invoices/WhatsApp without flag | **STATIC PASS / live capture blocked:** value lives only on `order_items`, anonymous table read is revoked, customer-facing selects exclude it, record-return defaults deletion. A flagged product/order could not be created without a confirmed merchant. |
| Server-side rental capacity/buffer | Two orders occupied both demo tents, then UI/API availability queried | **PASS:** 23 Aug and 27 Aug (one-day buffers around 24–26 Aug) returned 0 available; 28 Aug returned available. Touching night stay 18→19 remained available after 17→18. |
| Guessed/private endpoints | Safe production Playwright security/negative specs | **PASS:** 11 total public/security/negative assertions passed; three auth-fixture cases skipped. |

The attempted production-auth confirmation bypass was rejected before execution. The QA2 auth row remains unconfirmed. No private agent value, service-role key, real merchant credential or customer record was read.

## 7. Coverage checklist

### Part 1 — regression

| Area | Status | Evidence / limitation |
|---|---|---|
| All 25 previous findings | **COMPLETE** | 22 fixed, 2 partial (QA-001/014), 1 not fixed (QA-016). Items with blocked live authentication are explicitly labelled and supported only by source/regression. |

### Part 2 — new work

| Area | Status | Evidence / untested reason |
|---|---|---|
| A. Email confirmation | **PARTIAL PASS** | Check-email, no session, auth row, resend cooldown/success, wrong-address reset, duplicate handling, pre-confirm login and `tier/ref` redirect all pass. Confirmation link click/session/setup landing blocked because `delivered@resend.dev` has no inbox. |
| B. Dashboard reachability | **BLOCKED LIVE / STATIC PASS** | All routes build; grants/setup-redirect/nav regressions pass. No confirmed fully configured QA merchant session; no other credentials were requested or used. |
| C. Day hire lifecycle | **PASS for buyer flow** | 24–26 Aug = 3 days, N$450; N$500 deposit outside subtotal/tax; invoice total N$950; dates and refund note match. |
| C. Night stay lifecycle | **PASS with invoice-copy defect** | 17→18 = one night; correct checkout/payment label; touching 18→19 allowed; no delivery UI. Invoice fails R2-001. |
| C. Turnaround buffer | **PASS** | Both units booked 24–26; 23 and 27 blocked, 28 free. |
| C. Hirer ID capture/privacy | **BLOCKED LIVE / STATIC PASS** | Demo tent advertises required documents but has `requires_id_number=false`. Creating a flagged QA product requires confirmed merchant. Migration/RPC/source enforce trim, required value, 40-char cap and private projection. |
| C. Record return / late fee | **BLOCKED LIVE / STATIC PASS** | No merchant-owned order; return UI/source contains unit tag, date/notes, suggested late fee, refund guidance and default ID deletion. No live 12th/15th calculation asserted. |
| D. Agent application/rules/pending | **PASS** | QA2 application persisted `pending`, inactive, unlinked; confirmation copy names the proposed link. |
| D. Agent dashboard states | **PARTIAL** | Signed-out live and all branches source-reviewed. Not-linked/pending/rejected/approved UI needs confirmed/linked fixtures. |
| D. Practice store | **BLOCKED LIVE / REGRESSION PASS** | Approval/linking unavailable. Isolation/idempotency/existing-store branches are covered by source and `check-demo-store-isolation`. |
| D. Agent security | **PASS WITH LIMITATION** | Anonymous and unlinked-authenticated probes expose zero/private denied. Two linked agents were unavailable. |
| E. Demo/practice isolation | **PASS** | Absent from Browse Stores; all automation exclusions and 30-day purge regression pass. |
| F. VAT | **BLOCKED LIVE / STATIC PASS** | Inclusive state load/save and both arithmetic modes are implemented; `place_order` keeps deposit outside taxable base; statement checks cover inclusive/exclusive totals. No live merchant setting or dual-mode checkout/invoice was mutated. |
| G. Town filter | **PASS** | Dependent towns render; stale pair safely falls back. URL self-healing is an improvement. |
| G. Share cards | **PASS** | Photo/no-photo both 1200×630 PNG. |
| G. Contrast/accessibility | **PASS for prior named defects** | CTA 4.53:1; low-stock token corrected; accessible links/select; footer outline fixed. |
| G. Skeletons | **STATIC/PUBLIC PASS** | Five route loading files; authenticated timing blocked. |
| G. Guide/PDFs | **FAIL** | Web guide and handbook pass; merchant PDF QA-016 remains. |

### Part 3 — speed/responsiveness

| Area | Status | Evidence / limitation |
|---|---|---|
| Three mobile Lighthouse runs | **COMPLETE / MIXED** | JSON in `output/playwright/round2`; section 4 table. |
| Public interaction acknowledgement | **PASS** | Cart, availability, scheduling and order submits showed immediate state. |
| Dashboard tab/status/form timing | **BLOCKED LIVE / STATIC PASS** | No confirmed merchant; source pending/disabled states inspected. |

## 8. Cleanup list

Remove in dependency order after triage. Deleting each order should cascade its order item; customer rows and the two top-level identity/application rows require explicit cleanup. Demo aggregate analytics for 2026-08-15 was recomputed by checkout sync and may contain non-QA traffic; do not delete that shared daily row solely for this test.

| Type/table | Identifier | QA2 value / cleanup |
|---|---|---|
| `auth.users` | `423449f9-7101-41a7-8979-b32f333531f9` | `delivered@resend.dev`; unconfirmed, no merchant. Delete after the pending referrer is removed. |
| `referrers` | `0ce09f7f-1c0c-4dcd-ac47-412c1060fe56` | `QA2 (delete me) Agent 2026-08-15`, code `qa2delete20260815`, pending/inactive/unlinked. Delete. |
| `orders` #1 | `b3a1a23a-b94a-4813-bf91-efba291a82c6` | `QA2 (delete me) Night Stay 2026-08-15`, N$300, 17→18 Aug. Delete; item below should cascade. |
| `order_items` #1 | `1a9671f5-77b1-4da0-83dd-ba731f2deb58` | Guest room line. Verify cascade. |
| `customers` #1 | `f2661b29-b5fb-4d2d-ae5b-66a4a305dfc8` | `+264819908261`. Delete. |
| `orders` #2 | `b6a4c59c-e1be-45e7-b3de-d4d04848c6ea` | `QA2 (delete me) Day Hire 2026-08-15`, N$950, 24–26 Aug. Delete. |
| `order_items` #2 | `0a80ae22-3cb4-4d70-8e97-cc0819d8a70d` | Tent line. Verify cascade. |
| `customers` #2 | `db23ed29-aa80-4e2d-8205-7e428cdb427e` | `+264819908262`. Delete. |
| `orders` #3 | `304a9efb-fd5a-496b-a277-7b693f8ad911` | `QA2 (delete me) Day Hire Unit 2 2026-08-15`, N$950, 24–26 Aug. Delete. |
| `order_items` #3 | `f50104ac-5ebc-4e3f-b91c-81fdea1a22d6` | Second tent line. Verify cascade. |
| `customers` #3 | `3f7a73cb-92f6-4fa6-a076-9e267ef82673` | `+264819908263`. Delete. |
| `orders` #4 | `8e2c034d-a021-49c8-a142-55c179bb2f31` | `QA2 (delete me) Online Service 2026-08-15`, N$850, 17 Aug. Delete. |
| `order_items` #4 | `e544bb8c-4a4a-4d99-8a4e-253c3fcedc85` | Logo design line. Verify cascade. |
| `customers` #4 | `03dfbc1c-6710-4dc7-b25c-31edaa5080db` | `+264819908264`. Delete. |
| `orders` #5 | `a7de381d-f699-441c-8f42-e9b8237010b2` | `QA2 (delete me) Online Service Time 2026-08-15`, N$850, 18 Aug 10:00. Delete. |
| `order_items` #5 | `6b1b437f-2473-4574-99e6-4b0b2800b59c` | Logo design line. Verify cascade. |
| `customers` #5 | `8e113e3e-d925-476d-94ff-f0f403ce5c00` | `+264819908265`. Delete. |

No QA2 merchant, product, coupon, booking block, payment proof, recorded payment, refund, credit note, statement, return record, hirer ID or practice store was created. No cleanup was performed during the audit so the evidence remains reproducible.

## Test artefacts

- Round-2 browser evidence and Lighthouse JSON: `output/playwright/round2/`
- Rendered PDF pages: `output/pdf/round2/`
- Safe public regression helper: `output/playwright/round2/qa2-public-regression.js`
- Round-1 baseline: `QA-REPORT.md`
- Round-2 brief: `docs/qa/2026-08-15-qa-round-2-prompt.md`

No application source was modified, no secret was committed, and nothing was pushed.
