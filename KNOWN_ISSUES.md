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

## Open Feature Gaps (P0 — Identified 2026-03-11)

### GAP-001: No inventory/stock tracking
- Products only have `is_available` boolean toggle
- No quantity, no auto-deduct, no low-stock alerts
- Risk: overselling, customer distrust
- **Spec**: `INVENTORY_SPEC.md` | **Migration**: 005, 006, 007

### GAP-002: No industry selection at signup
- Merchants get generic onboarding with no personalization
- Risk: slower time-to-value, lower activation
- **Spec**: `INDUSTRY_DROPDOWN_NA.md` | **Migration**: 005

### GAP-003: No delivery fee
- Merchants can't charge for delivery (all free by default)
- Risk: merchants lose money on deliveries
- **Migration**: 005

### GAP-004: No discount/coupon codes (P1)
- TakeApp has this on Business plan; OshiCart has none
- Proven conversion driver

### GAP-005: No cash on delivery option (P1)
- Many Namibian customers prefer COD
- Only EFT currently supported

## Previous Bugs — All Resolved
24/24 E2E tests passing. All stores visible, images loading, checkout working, auth working.
