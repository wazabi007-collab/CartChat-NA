# Known Issues

## BUG-001: Checkout order creation — FIXED
- **Status**: Code fix applied locally, needs server deploy
- **Fix**: Removed `JSON.stringify()` from p_items in checkout-form.tsx

## BUG-002: Auth cookie injection in tests — FIXED
- **Status**: Code fix applied locally, needs test verification
- **Fix**: Changed cookie name from `supabase.auth.token` to dynamically computed `sb-{ref}-auth-token`

## BUG-003: kong.prod.yml local/server key mismatch — FIXED
- **Status**: Local file synced with production server keys
- **File**: `docker/kong.prod.yml`

## DEPLOY NEEDED: Server rebuild for checkout fix
- The checkout JSON.stringify fix is committed but server still runs old Docker image
- 3 checkout tests will fail until: `git pull && docker compose -f docker-compose.prod.yml build app && docker compose -f docker-compose.prod.yml up -d app`
