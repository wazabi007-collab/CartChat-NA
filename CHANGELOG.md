# Changelog

## 2026-03-11

### BUG-001: Checkout "Failed to create order" (FIXED)
- **Root cause**: `JSON.stringify()` on `p_items` passed a scalar string instead of JSONB array to `place_order` RPC
- **Fix**: Removed `JSON.stringify()` in `src/app/checkout/[slug]/checkout-form.tsx` — pass JS array directly
- **File**: `src/app/checkout/[slug]/checkout-form.tsx`

### BUG-002: Auth cookie injection fails — middleware redirects to /login (FIXED)
- **Root cause**: Cookie name was `supabase.auth.token` but `@supabase/supabase-js` v2.99 computes `sb-oshicart-auth-token`
- **Fix**: Dynamically compute storage key from `NEXT_PUBLIC_SUPABASE_URL`
- **File**: `tests/e2e/helpers/auth.ts`

### Kong key-auth 401 (FIXED — server only)
- **Root cause**: `kong.prod.yml` had stale JWT keys not matching `.env`
- **Fix**: Replaced keys on server via `sed`, restarted Kong
- **Pending**: Local `docker/kong.prod.yml` needs sync with `.env` keys

### Invoice page TypeScript error (FIXED)
- **Root cause**: Supabase join returns array type, cast to object was invalid
- **Fix**: Changed `as { ... }` to `as unknown as { ... }` in two places
- **File**: `src/app/invoice/[orderId]/page.tsx`

### Public storage images 401 (FIXED)
- **Root cause**: Kong required `apikey` for all `/storage/v1/` routes, but `<img>` tags can't send headers
- **Fix**: Added open route for `/storage/v1/object/public/` in `kong.prod.yml` (no auth required)
- **File**: `docker/kong.prod.yml`

### Deploy script using wrong compose file (FIXED)
- **Root cause**: `deploy.sh` used `docker compose` (dev) instead of `docker compose -f docker-compose.prod.yml`
- **Fix**: Updated deploy script on server to use prod compose file

### place_order RPC (CREATED)
- **Purpose**: Bypass anon RLS restriction on INSERT...RETURNING
- **File**: `supabase/migrations/004_place_order_rpc.sql`
- **Applied**: Directly on production DB + migration file in repo
