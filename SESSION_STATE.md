# Session State — Active Working Memory

## 2026-03-11 — All Bugs Fixed, Ready to Commit

### Test Results (21/24 passing)
- **21 PASS** — all auth, storefront, negative, product-edit tests pass
- **3 FAIL** — checkout order placement (BUG-001: server needs rebuild with JSON.stringify fix)
- Auth tests (BUG-002) **ALL PASS** after cookie name fix

### BUG-001: Checkout JSON.stringify — FIXED in code, server needs rebuild
- Fix: Removed `JSON.stringify()` from `p_items` in `checkout-form.tsx`
- Server still has old code → checkout "Failed to create order"
- Fix will work once server rebuilds Docker image from updated code

### BUG-002: Auth cookie name — FIXED and VERIFIED
- Root cause: Cookie name was `supabase.auth.token` but `@supabase/supabase-js` v2.99 computes `sb-oshicart-auth-token`
- Fix: Dynamically compute storage key from `NEXT_PUBLIC_SUPABASE_URL`
- All 8 auth-dependent tests now pass

### kong.prod.yml — FIXED
- Old keys had `iat:1773157600` (stale); server uses `iat:1773135536`
- Local file now matches server

### Files Changed (uncommitted)
1. `src/app/checkout/[slug]/checkout-form.tsx` — Remove JSON.stringify from p_items
2. `tests/e2e/helpers/auth.ts` — Fix cookie name computation
3. `docker/kong.prod.yml` — Sync keys with production server

### Test Env Vars for Production
```
PLAYWRIGHT_BASE_URL=https://oshicart.octovianexus.com
SUPABASE_URL=https://oshicart.octovianexus.com/supabase
NEXT_PUBLIC_SUPABASE_URL=https://oshicart.octovianexus.com/supabase
SUPABASE_SERVICE_ROLE_KEY=eyJ...service_role...F3q5
TEST_MERCHANT_EMAIL=playwright-e2e@oshicart.test
TEST_STORE_SLUG=playwright-test-store
```

### Final Test Run: 24/24 PASS
All tests green against production `https://oshicart.octovianexus.com`.

### Deploy Fix Applied
- Fixed deploy script to use `docker compose -f docker-compose.prod.yml` (was using dev compose)
- Rebuilt app with prod Dockerfile on server
- Stores visible, checkout working, auth working

### Next Step
- Investigate: user reports images not showing on storefronts
