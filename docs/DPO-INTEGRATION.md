# DPO Payment Gateway Integration — Implementation Tracker

**Started:** 2026-03-19
**Status:** Built — awaiting env vars in Vercel for testing
**Scope:** Subscription payments only (not storefront orders)
**Test Company Token:** 8D3DA73D-9D7F-4E09-96D4-3D44E7A83EA3
**Test Service Type:** 3854
**Test Cards:** 5436886269848367 / 4012888888881881 (Expiry: 12/24, CVV: 123)

---

## Architecture

**Flow (Option A — Hosted Payment Page for Subscriptions):**
1. Merchant goes to /pricing/checkout?tier=oshi_basic (or grow/pro)
2. Clicks "Pay N$199 Now" button
3. Server calls DPO `createToken` → gets `TransToken`
4. Merchant redirected to `https://secure.3gdirectpay.com/payv2.php?ID={TransToken}`
5. Merchant pays on DPO's hosted page (card/mobile money)
6. DPO redirects to our callback URL
7. Server calls `verifyToken` → confirms payment
8. If paid: subscription auto-activated (tier upgraded, status=active, 30-day period)
9. If failed: redirect to failure page, subscription unchanged

**Key decisions:**
- DPO is for **subscription payments only** (Oshi-Basic, Oshi-Grow, Oshi-Pro)
- Storefront customer orders keep using EFT, COD, MoMo, etc.
- `CompanyRefUnique=1`: prevents double payments for same reference
- PTL: 30 minutes token expiry
- Auto-activation: successful payment immediately upgrades the subscription
- EFT option kept alongside DPO (merchants can choose either)

---

## Implementation Tasks

### 1. Database Migration (025)
- [x] Add 'dpo' to payment_method enum
- [x] Add dpo_transaction_token column to orders
- [x] Add dpo_transaction_token column to subscriptions
- [x] Index for callback lookups
- **Files:** `supabase/migrations/025_dpo_payment.sql` + applied via MCP
- **Status:** DONE

### 2. DPO API Client
- [x] createToken function (XML build + POST + parse)
- [x] verifyToken function
- [x] XML helper functions (xmlTag, parseXmlValue)
- [x] Amount cents→NAD conversion
- [x] isDpoEnabled() feature flag
- **File:** `src/lib/dpo.ts`
- **Status:** DONE

### 3. TypeScript Types
- [x] Add "dpo" to PaymentMethod union
- **File:** `src/types/database.ts`
- **Status:** DONE

### 4. Tracking Events
- [x] Add dpo_payment_initiated, dpo_payment_success, dpo_payment_failed
- **File:** `src/lib/track.ts`
- **Status:** DONE

### 5. Create Token API Route
- [x] POST /api/payments/dpo/create
- [x] Validates user auth and merchant ownership
- [x] Gets tier price from TIER_LIMITS
- [x] Calls createToken, stores token on subscription
- [x] Returns payment URL
- **File:** `src/app/api/payments/dpo/create/route.ts`
- **Status:** DONE

### 6. Callback API Route
- [x] GET /api/payments/dpo/callback
- [x] Handles redirect from DPO after payment
- [x] Calls verifyToken
- [x] On success: auto-activates subscription (tier, status, period)
- [x] On failure: redirects to failure page
- **File:** `src/app/api/payments/dpo/callback/route.ts`
- **Status:** DONE

### 7. Payment Result Page
- [x] Success state (green checkmark, approval code, dashboard link)
- [x] Cancelled state (amber warning, back to pricing)
- [x] Declined state (red X, try again)
- [x] Pending/error states
- **File:** `src/app/pricing/checkout/payment-result/page.tsx`
- **Status:** DONE

### 8. Subscription Checkout Page Updates
- [x] DPO "Pay Online with Card" section (blue gradient header)
- [x] DpoPayButton client component
- [x] "or pay via EFT" divider
- [x] Existing EFT flow preserved below
- [x] DPO only shown when DPO_ENABLED=true AND merchant is logged in
- **Files:** `src/app/pricing/checkout/page.tsx`, `dpo-pay-button.tsx`
- **Status:** DONE

### 9. Environment Variables
- [ ] DPO_COMPANY_TOKEN
- [ ] DPO_SERVICE_TYPE
- [ ] DPO_ENABLED=true
- **Where:** Vercel Dashboard
- **Status:** NEEDS TO BE ADDED

### 10. End-to-End Test
- [ ] Visit /pricing/checkout?tier=oshi_basic
- [ ] Click "Pay N$199 Now"
- [ ] Redirect to DPO payment page
- [ ] Pay with test card (5436886269848367, 12/24, 123)
- [ ] Redirect back to success page
- [ ] Subscription auto-activated in Supabase
- [ ] Test cancel flow
- [ ] Test declined card
- **Status:** PENDING (needs env vars first)

---

## Env Vars to Add in Vercel

| Variable | Test Value | Production |
|---|---|---|
| DPO_COMPANY_TOKEN | 8D3DA73D-9D7F-4E09-96D4-3D44E7A83EA3 | From DPO after verification |
| DPO_SERVICE_TYPE | 3854 | From DPO after verification |
| DPO_ENABLED | true | true (after DPO verifies) |

## Files Created/Modified

| File | Action |
|---|---|
| `src/lib/dpo.ts` | NEW — DPO API client |
| `src/app/api/payments/dpo/create/route.ts` | NEW — create token endpoint |
| `src/app/api/payments/dpo/callback/route.ts` | NEW — callback/verify endpoint |
| `src/app/pricing/checkout/page.tsx` | MODIFIED — added DPO pay option |
| `src/app/pricing/checkout/dpo-pay-button.tsx` | NEW — client pay button |
| `src/app/pricing/checkout/payment-result/page.tsx` | NEW — success/failure page |
| `src/types/database.ts` | MODIFIED — added "dpo" to PaymentMethod |
| `src/lib/track.ts` | MODIFIED — added DPO tracking events |
| `supabase/migrations/025_dpo_payment.sql` | NEW — DB migration |

## Changelog

| Date | Task | Status |
|---|---|---|
| 2026-03-19 | Plan created | Done |
| 2026-03-19 | DB migration applied (enum + columns) | Done |
| 2026-03-19 | DPO API client (createToken, verifyToken) | Done |
| 2026-03-19 | Types + tracking events updated | Done |
| 2026-03-19 | Create token API route | Done |
| 2026-03-19 | Callback API route with auto-activation | Done |
| 2026-03-19 | Payment result page (success/fail/cancel) | Done |
| 2026-03-19 | Subscription checkout page + DpoPayButton | Done |
| 2026-03-19 | Build verified — passes | Done |
| — | Add env vars to Vercel | Pending |
| — | End-to-end test with DPO test credentials | Pending |
