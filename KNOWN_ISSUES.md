# Known Issues

All issues from 2026-03-11 session have been resolved and deployed.

## Resolved

### BUG-001: Checkout order creation — FIXED & DEPLOYED
- Removed `JSON.stringify()` from p_items in checkout-form.tsx

### BUG-002: Auth cookie injection in tests — FIXED & DEPLOYED
- Cookie name dynamically computed as `sb-{ref}-auth-token` from NEXT_PUBLIC_SUPABASE_URL

### BUG-003: kong.prod.yml key mismatch — FIXED & DEPLOYED
- Local file synced with production server keys

### BUG-004: Public storage images 401 — FIXED & DEPLOYED
- Added open Kong route for `/storage/v1/object/public/`

### BUG-005: OTP code expiry too short — FIXED & DEPLOYED
- Set to 5 minutes via GOTRUE_MAILER_OTP_EXP and GOTRUE_SMS_OTP_EXP

## P0 Features — Built, Pending Deploy

### GAP-001: Inventory/stock tracking — BUILT (commit `66dfbb6`)
- Migrations 005-007 ready, frontend complete
- Needs: deploy to server + apply migrations

### GAP-002: Industry selection at signup — BUILT (commit `66dfbb6`)
- 28 Namibia industries in dropdown
- Needs: deploy to server + apply migration 005

### GAP-003: Delivery fee — BUILT (commit `66dfbb6`)
- Flat rate in settings, shown at checkout
- Needs: deploy to server + apply migration 005

## Open Feature Gaps (P1 — 30-day backlog)

### GAP-004: No discount/coupon codes
- TakeApp has this on Business plan; OshiCart has none
- Proven conversion driver

### GAP-005: No cash on delivery option
- Many Namibian customers prefer COD
- Only EFT currently supported

### GAP-006: No customer list or order history
- No way for merchant to see repeat customers
- Data exists in orders table, just no UI

### GAP-007: No product variants
- Size/color options not supported
- Needed for fashion, food customization

### GAP-008: No payment gateway
- Only manual EFT; no card/mobile money
- PayToday/PayFast for Namibia

## Previous Bugs — All Resolved
24/24 E2E tests passing. All stores visible, images loading, checkout working, auth working.
