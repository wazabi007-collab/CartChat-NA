# Known Issues

P0 + P1 deployed. Logo/branding deployed. 24/24 E2E passing.

## Current Status
- P0 features: All deployed (inventory, industry, delivery fee)
- P1 features: All deployed (payment methods, coupons, invoice updates)
- Branding: SVG logo deployed across all pages + favicon
- No E2E tests for new payment methods or coupons yet (existing 24 tests all pass)

## Open Feature Gaps (P2 — next sprint)
- GAP-006: Customer list + order history
- GAP-007: Product variants (size/color)
- GAP-008: Payment gateway (PayToday/PayFast)

## Deployment Warnings

### CRITICAL: Always verify env vars after deploy
- After every deploy, check that Kong keys match the app's anon key
- `docker exec oshicart-supabase-kong-1 cat /var/lib/kong/kong.yml | head -7`
- `docker compose -f docker-compose.prod.yml exec -T app env | grep SUPABASE`
- If keys don't match: Kong returns 401, Supabase queries silently fail, storefronts show "Store Not Found"
- Root cause discovered in Session 3: `deploy.sh` was using wrong compose file, loading dev Kong config with different JWT keys

### CRITICAL: Always use `-f docker-compose.prod.yml`
- Bare `docker compose` uses the default `docker-compose.yml` (dev config)
- Dev config has different Kong keys, different Dockerfile, different env vars
- `deploy.sh` has been fixed but always double-check

### Migration files not volume-mounted
- Only migrations 001 and 002 are volume-mounted into the DB container
- Apply new migrations via stdin: `cat supabase/migrations/XXX.sql | docker compose -f docker-compose.prod.yml exec -T supabase-db psql -U postgres -d postgres`

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

### BUG-006: deploy.sh wrong compose file — FIXED
- Was using bare `docker compose` → loaded dev Kong config with wrong keys
- Fixed to use `docker compose -f docker-compose.prod.yml` everywhere

### P0 Features — All Deployed
- GAP-001: Inventory/stock tracking
- GAP-002: Industry selection at signup
- GAP-003: Delivery fee

## Completed Feature Gaps

### GAP-004: Discount/coupon codes — DEPLOYED
### GAP-005: Cash on delivery + MoMo + eWallet — DEPLOYED
