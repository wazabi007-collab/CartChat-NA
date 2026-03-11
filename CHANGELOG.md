# Changelog

## 2026-03-11

### BUG-001: Checkout "Failed to create order" (FIXED & DEPLOYED)
- **Root cause**: `JSON.stringify()` on `p_items` passed a scalar string instead of JSONB array to `place_order` RPC
- **Fix**: Removed `JSON.stringify()` — pass JS array directly
- **File**: `src/app/checkout/[slug]/checkout-form.tsx`

### BUG-002: Auth cookie injection fails — middleware redirects to /login (FIXED & DEPLOYED)
- **Root cause**: Cookie name was `supabase.auth.token` but `@supabase/supabase-js` v2.99 computes `sb-oshicart-auth-token`
- **Fix**: Dynamically compute storage key from `NEXT_PUBLIC_SUPABASE_URL`
- **File**: `tests/e2e/helpers/auth.ts`

### BUG-003: Kong key-auth 401 (FIXED & DEPLOYED)
- **Root cause**: `kong.prod.yml` had stale JWT keys not matching server `.env`
- **Fix**: Synced `docker/kong.prod.yml` keys with production server `.env`
- **File**: `docker/kong.prod.yml`

### BUG-004: Public storage images 401 (FIXED & DEPLOYED)
- **Root cause**: Kong required `apikey` for all `/storage/v1/` routes, but `<img>` tags can't send headers
- **Fix**: Added open route for `/storage/v1/object/public/` in `kong.prod.yml` (no auth required)
- **File**: `docker/kong.prod.yml`

### BUG-005: OTP code expires too fast (FIXED & DEPLOYED)
- **Root cause**: GoTrue default OTP expiry was 60 seconds
- **Fix**: Set `GOTRUE_MAILER_OTP_EXP=300` and `GOTRUE_SMS_OTP_EXP=300` (5 minutes)
- **Files**: `docker-compose.prod.yml`, `docker-compose.yml`

### Login page OTP timer (ADDED & DEPLOYED)
- Added 5-minute countdown timer and "Resend code" button to login OTP screen
- Matches existing signup page behavior
- **File**: `src/app/(auth)/login/page.tsx`

### Invoice page TypeScript error (FIXED)
- **Root cause**: Supabase join returns array type, cast to object was invalid
- **Fix**: Changed `as { ... }` to `as unknown as { ... }` in two places
- **File**: `src/app/invoice/[orderId]/page.tsx`

### Deploy script using wrong compose file (FIXED)
- **Root cause**: `deploy.sh` used `docker compose` (dev) instead of `docker compose -f docker-compose.prod.yml`
- **Fix**: Updated deploy script on server to use prod compose file

### GitHub Actions auto-deploy removed
- SSH key secret was never configured; workflow kept failing
- Removed `.github/workflows/deploy.yml` — deploys are manual via SSH

### place_order RPC (CREATED)
- **Purpose**: Bypass anon RLS restriction on INSERT...RETURNING
- **File**: `supabase/migrations/004_place_order_rpc.sql`
- **Applied**: Directly on production DB + migration file in repo
