# Phase 2: UX Optimization Plan — OshiCart

## 1. Executive Summary

Phase 1 established visual consistency. Phase 2 targets **conversion behavior** — reducing friction in signup, onboarding, and checkout to increase completion rates.

**Key changes implemented in this commit:**
- Smart `PhoneInput` component with real-time Namibian format guidance (signup, setup, checkout)
- Visual `StepProgress` bar for onboarding wizard
- Funnel event tracking system (`track()` utility + `/api/analytics/event` endpoint)
- Tracking instrumented across: signup, onboarding, checkout
- Shared UI styles applied to setup page (was missed in Phase 1)
- Error alerts upgraded to icon+bg pattern on setup page

**Estimated impact:**
| Funnel | Current est. | Target | Lever |
|--------|-------------|--------|-------|
| Signup start → complete | ~40% | 55% | Phone format hints, inline errors |
| Onboarding start → complete | ~60% | 80% | Progress bar, clearer steps |
| Checkout start → complete | ~50% | 65% | Phone hints, inline validation |

---

## 2. Funnel Diagnostics

### 2.1 Signup Flow

| Friction Point | Severity | Screen | Detail |
|---|---|---|---|
| Phone format confusion | **P0** | signup | Users type `081...` but placeholder was `+264...`. No guidance on auto-conversion. |
| Error only shows on submit | **P1** | signup | "Account exists" error appears after full form fill + API call. |
| OTP not auto-focused | **P2** | signup (OTP step) | User has to manually tap the OTP field after step transition. |
| No email validation preview | **P2** | signup | No inline check that email format is valid before submit. |

**Implemented:** PhoneInput with real-time format hints (P0 fix).

### 2.2 Onboarding (Setup)

| Friction Point | Severity | Screen | Detail |
|---|---|---|---|
| No visual progress indicator | **P0** | setup | "Step 1 of 3" text insufficient — no bar or stepper. |
| Phone format same issue | **P0** | setup step 1 | Same as signup. |
| Error shown at bottom of card | **P1** | setup all steps | Error can be below fold on mobile. |
| Bank fields have no context | **P1** | setup step 3 | No helper text explaining why bank details matter. |
| No skip option for bank details | **P2** | setup step 3 | Users must fill bank if EFT selected, even if they want COD first. |
| Old UI styles (not Phase 1) | **P1** | setup all steps | Setup page was not updated in Phase 1 visual pass. |

**Implemented:** StepProgress component (P0), PhoneInput (P0), shared UI styles (P1), error moved to within each step (P1).

### 2.3 Checkout

| Friction Point | Severity | Screen | Detail |
|---|---|---|---|
| Customer phone format confusion | **P0** | checkout | Same as signup — customers unfamiliar with +264 format. |
| All validation on submit only | **P1** | checkout | User fills entire form, submits, then sees error at bottom. |
| No cart item count in header | **P2** | checkout | No confirmation of how many items before scrolling. |
| Proof of payment not clearly optional | **P2** | checkout | Label says "(optional)" but upload area looks required. |

**Implemented:** PhoneInput with format hints (P0), tracking on submit/complete.

### 2.4 Dashboard First-Run

| Friction Point | Severity | Detail |
|---|---|---|
| No guided first steps | **P1** | New merchants land on dashboard with 0 products, no clear "what to do next" beyond quick actions. |
| Quick actions are passive | **P2** | "Add your first product" card doesn't explain what a good first product looks like. |

### 2.5 Orders

| Friction Point | Severity | Detail |
|---|---|---|
| No confirmation dialog on status change | **P1** | Clicking "Confirm" or "Mark Ready" changes status instantly — risky on mobile where taps can be accidental. |
| No undo for accidental status change | **P2** | Status machine is forward-only by design, but accidental taps happen. |

---

## 3. UX Redesign by Screen

### 3.1 Signup

**User intent:** Create a store as fast as possible.

**Changes made:**
- `PhoneInput` component: accepts `081...`, `+264...`, or `264...` — shows real-time "Will be saved as +264..." guidance
- Placeholder changed from `+264811234567` to `081 234 5678` (local format most users type)
- Error alerts use icon+bg pattern (from Phase 1 system)
- Tracking: `signup_started`, `signup_otp_sent`, `signup_completed`

**Future improvements (not yet implemented):**
- Auto-focus OTP input on step transition
- Inline email duplicate check on blur (debounced)
- OTP auto-submit when 6 digits entered

### 3.2 Onboarding Setup

**User intent:** Get store configured quickly, start selling.

**Changes made:**
- `StepProgress` visual stepper with green checkmarks for completed steps
- PhoneInput for all phone fields (WhatsApp, MoMo, Pay2Cell)
- Shared UI styles from Phase 1 applied (was inconsistent)
- Error alerts within each step (not at bottom of entire form)
- Tracking: `onboarding_step_completed` (per step), `onboarding_completed`

**Future improvements:**
- Add "Skip for now" link on step 3 bank details section
- Auto-populate bank branch code when bank selected (Namibian banks have known codes)
- Show store preview link after creation ("Your store is live!")

### 3.3 Checkout

**User intent:** Complete purchase quickly, trust the process.

**Changes made:**
- `PhoneInput` for customer WhatsApp with format guidance
- Tracking: `checkout_submitted`, `checkout_completed`

**Future improvements:**
- Inline field validation on blur (name, phone)
- Sticky "Place Order" button on mobile
- Cart item count badge in checkout header
- "Secure checkout" trust badge near submit button

### 3.4 Dashboard (first-run)

**Future improvements:**
- Empty state checklist: "1. Add your first product, 2. Share your store link, 3. Set up payment methods"
- Celebration animation on first order received
- Contextual tips in stat cards ("0 products — add one to start selling")

---

## 4. Event Tracking Plan

### 4.1 Implementation

**Client utility:** `src/lib/track.ts`
- Uses `navigator.sendBeacon()` (non-blocking)
- Falls back to `fetch()` with `keepalive: true`
- Auto-includes: session_id, pathname, timestamp
- Never blocks UI or throws errors

**Server endpoint:** `POST /api/analytics/event`
- Logs structured JSON to stdout (picked up by Vercel log drains)
- Returns 200 even on bad input (never fails client)

### 4.2 Event Schema

| Event | Trigger | Payload Fields | File |
|---|---|---|---|
| `landing_cta_clicked` | "Create Free Store" CTA click | `{ cta_location }` | public-navbar.tsx (future) |
| `signup_started` | Signup form submitted | `{ method: "email"\|"google" }` | signup/page.tsx |
| `signup_otp_sent` | OTP sent successfully | `{ method }` | signup/page.tsx |
| `signup_completed` | OTP verified, redirecting | `{ method, had_merchant }` | signup/page.tsx |
| `login_started` | Login form submitted | `{ method }` | login/page.tsx (future) |
| `login_otp_sent` | Login OTP sent | `{ method }` | login/page.tsx (future) |
| `login_completed` | Login verified | `{ method }` | login/page.tsx (future) |
| `onboarding_step_completed` | Step "Next" clicked | `{ step_index, step_label }` | setup/page.tsx |
| `onboarding_completed` | Store created | `{ industry, payment_methods }` | setup/page.tsx |
| `product_created` | Product saved | `{ item_type, has_images }` | products/new/page.tsx (future) |
| `checkout_started` | Checkout page loaded | `{ merchant_id, item_count }` | checkout page (future) |
| `checkout_submitted` | "Place Order" clicked | `{ merchant_id, item_count, total_nad, payment_method }` | checkout-form.tsx |
| `checkout_completed` | Order created successfully | `{ merchant_id, order_number, total_nad, payment_method }` | checkout-form.tsx |
| `order_status_changed` | Merchant changes order status | `{ order_id, from_status, to_status }` | order-actions.tsx (future) |
| `coupon_applied` | Coupon accepted | `{ merchant_id, code, discount_type }` | checkout-form.tsx (future) |
| `proof_uploaded` | POP file selected | `{ merchant_id, file_size }` | checkout-form.tsx (future) |

**Already instrumented:** signup_started, signup_otp_sent, signup_completed, onboarding_step_completed, onboarding_completed, checkout_submitted, checkout_completed.

---

## 5. A/B Tests

### Test 1: Signup CTA Copy
- **Hypothesis:** "Start Selling — Free" converts better than "Get Started — It's Free" because it's more specific about the outcome.
- **Variant A (control):** "Get Started — It's Free"
- **Variant B:** "Start Selling — Free"
- **Metric:** signup_started → signup_completed rate
- **Risk:** Low

### Test 2: Phone Input Placeholder
- **Hypothesis:** Local format `081 234 5678` gets fewer format errors than `+264 81 123 4567`.
- **Variant A (control):** `+264 81 123 4567`
- **Variant B:** `081 234 5678`
- **Metric:** Form submission error rate, signup_otp_sent rate
- **Risk:** Low

### Test 3: Onboarding Step Count
- **Hypothesis:** Showing "Takes under 2 minutes" instead of "Step X of 3" reduces abandonment by framing effort as time, not steps.
- **Variant A (control):** "Step 1 of 3"
- **Variant B:** "Under 2 minutes left"
- **Metric:** onboarding_completed rate
- **Risk:** Low

### Test 4: Checkout Trust Signal
- **Hypothesis:** Adding "Secure order — your info stays between you and {storeName}" above the submit button increases checkout completion.
- **Variant A (control):** No trust text
- **Variant B:** Trust microcopy above button
- **Metric:** checkout_submitted → checkout_completed rate
- **Risk:** Low

### Test 5: One-Step vs Multi-Step Onboarding
- **Hypothesis:** A single scrollable form completes faster than 3-step wizard for experienced merchants.
- **Variant A (control):** 3-step wizard
- **Variant B:** Single long form with sections
- **Metric:** onboarding_completed rate, time-to-complete
- **Risk:** Medium — may reduce completion for less tech-savvy users

### Test 6: OTP Auto-Submit
- **Hypothesis:** Auto-submitting when 6 digits are entered removes a click and speeds up verification.
- **Variant A (control):** Manual submit button
- **Variant B:** Auto-submit on 6th digit
- **Metric:** signup_otp_sent → signup_completed rate, error rate
- **Risk:** Medium — auto-submit on typo would trigger unnecessary API calls

### Test 7: Checkout Button Copy
- **Hypothesis:** "Pay & Order via WhatsApp" converts better than "Place Order" because it sets clear expectation of the WhatsApp flow.
- **Variant A (control):** "Place Order"
- **Variant B:** "Pay & Order via WhatsApp"
- **Metric:** checkout_completed rate
- **Risk:** Low

### Test 8: Dashboard Empty State CTA
- **Hypothesis:** "Add your first product (takes 30 seconds)" with time estimate gets more clicks than plain "Add your first product".
- **Variant A (control):** "Add your first product"
- **Variant B:** "Add your first product — takes 30 seconds"
- **Metric:** product_created rate from new merchants
- **Risk:** Low

---

## 6. Engineering Backlog

### P0 — Implemented in this commit

| Ticket | Type | Description | AC |
|---|---|---|---|
| UX-001 | Frontend | PhoneInput component with format guidance | Accepts 081..., +264..., 264... formats; shows real-time conversion preview; works in signup, setup, checkout |
| UX-002 | Frontend | Onboarding StepProgress visual stepper | Shows 3-step progress bar with completed checkmarks; current step highlighted |
| UX-003 | Frontend + Backend | Funnel event tracking system | track() utility fires events via sendBeacon; /api/analytics/event logs structured JSON; events instrumented in signup, setup, checkout |
| UX-004 | Frontend | Setup page shared UI styles | Card, input, label, button, alert styles match Phase 1 system |

### P1 — Next sprint

| Ticket | Type | Description | AC |
|---|---|---|---|
| UX-005 | Frontend | Login page shared UI + tracking | Apply Phase 1 styles to login page; add PhoneInput if applicable; instrument login_started, login_completed |
| UX-006 | Frontend | Inline field validation on blur (checkout) | Name, phone validated on blur; error shows immediately below field; submit button disabled until fixed |
| UX-007 | Frontend | Auto-focus OTP input on step transition | After OTP sent, focus cursor into OTP field; keyboard should be visible on mobile |
| UX-008 | Frontend | Order status confirmation dialog | Show "Are you sure?" modal before status change; include order# and new status in dialog |
| UX-009 | Frontend | Product created tracking | Fire product_created event with item_type, has_images, category in products/new submit |
| UX-010 | Frontend | Dashboard first-run checklist | Show numbered checklist for new merchants: add product → share link → configure payments |
| UX-011 | Backend | Event persistence to database | Create funnel_events table; insert from /api/analytics/event; add dashboard query for funnel metrics |

### P2 — Future sprint

| Ticket | Type | Description | AC |
|---|---|---|---|
| UX-012 | Frontend | OTP auto-submit on 6 digits | Auto-submit form when 6th digit entered; debounce 300ms to handle paste; A/B testable |
| UX-013 | Frontend | Inline email duplicate check (signup) | Check email on blur with debounce; show "Account exists — sign in instead" inline; prevent unnecessary OTP send |
| UX-014 | Frontend | Sticky checkout button on mobile | "Place Order" button fixed to bottom of viewport on screens < 768px; only visible when form section is above fold |
| UX-015 | Frontend | Celebration animation on first order | Confetti or green checkmark animation when merchant receives first order; shown once per merchant |
| UX-016 | Frontend | Auto-populate bank branch code | Map BANKS_NAMIBIA to their branch codes; auto-fill branch_code when bank selected |
| UX-017 | QA | A/B test framework setup | Edge Config or feature flag system for serving variants; integrate with tracking system |
| UX-018 | Analytics | Funnel dashboard for merchants | New dashboard page showing signup → order funnel metrics from tracked events |

---

## 7. QA Checklist

### PhoneInput Component
- [ ] Typing `081 234 5678` shows "Will be saved as +264812345678"
- [ ] Typing `+264 81 234 5678` shows no hint (already correct)
- [ ] Typing `264812345678` shows "Will be saved as +264812345678"
- [ ] Typing `+27` shows "International number — will be saved as entered"
- [ ] Short input (< 9 chars) shows "Keep typing..." hint
- [ ] Empty input shows static helper text
- [ ] Error prop overrides all hints
- [ ] Brand variant uses blue focus ring
- [ ] Green variant uses green focus ring
- [ ] 44px+ tap target on mobile

### Onboarding StepProgress
- [ ] Step 1: first circle green with ring, others gray
- [ ] Step 2: first circle green checkmark, second green with ring, third gray
- [ ] Step 3: first two green checkmarks, third green with ring
- [ ] Connector lines turn green as steps complete
- [ ] Labels show correct text for each step

### Event Tracking
- [ ] `signup_started` fires on form submit (check Vercel logs)
- [ ] `signup_otp_sent` fires after successful OTP send
- [ ] `signup_completed` fires after OTP verify
- [ ] `onboarding_step_completed` fires on each "Next" click with correct step_index
- [ ] `onboarding_completed` fires on store creation
- [ ] `checkout_submitted` fires with correct total_nad and payment_method
- [ ] `checkout_completed` fires with order_number
- [ ] Events use sendBeacon (check Network tab — should be `beacon` type)
- [ ] Failed tracking never shows error to user

### Regression
- [ ] Signup: Google OAuth still works
- [ ] Signup: OTP send, verify, redirect all work
- [ ] Setup: All 3 steps complete and create merchant
- [ ] Setup: WhatsApp duplicate check still fires on blur
- [ ] Checkout: Full order flow works (pickup + delivery)
- [ ] Checkout: Coupon code still works
- [ ] Checkout: Proof of payment upload still works
- [ ] Checkout: WhatsApp message opens correctly after order

---

## 8. Risk + Rollback Plan

### What changed and how to revert

| Change | Files | Rollback |
|---|---|---|
| PhoneInput component | `src/components/phone-input.tsx` (new) | Delete file; revert signup, setup, checkout to raw `<input>` |
| StepProgress component | Inline in `setup/page.tsx` | Revert setup/page.tsx to previous commit |
| Track utility | `src/lib/track.ts` (new) | Delete file; remove `track()` calls from signup, setup, checkout |
| Analytics event endpoint | `src/app/api/analytics/event/route.ts` (new) | Delete file |
| Setup page UI overhaul | `setup/page.tsx` | `git checkout HEAD~1 -- src/app/(dashboard)/dashboard/setup/page.tsx` |

### Risk assessment

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| PhoneInput format hint confuses users | Low | Low | Hint only appears while typing; disappears when correct |
| Tracking endpoint adds latency | Very Low | None | Uses sendBeacon (non-blocking); endpoint returns immediately |
| Setup page regression | Low | Medium | All business logic unchanged; only UI + tracking added |
| Event payload too large for sendBeacon | Very Low | None | Payloads are <1KB; sendBeacon limit is 64KB |

### Monitoring

After deploy, check:
1. Vercel runtime logs for `funnel_event` JSON lines
2. Build status (already verified — passes)
3. Signup, setup, checkout flows manually on mobile
4. No console errors on any modified page
