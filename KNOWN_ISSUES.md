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

## No Open Issues
24/24 E2E tests passing. All stores visible, images loading, checkout working, auth working.
