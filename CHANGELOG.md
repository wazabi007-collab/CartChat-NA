# Changelog

## 2026-03-11 (Session 4) — P1 Payment Methods + Coupons (WIP)

### Multiple Payment Methods (IN PROGRESS)
- Added `payment_method` enum: `eft`, `cod`, `momo`, `ewallet`
- Merchant settings: checkboxes for accepted methods, MoMo number, eWallet provider/number
- Checkout: payment method selector with instruction panels per method
  - **EFT**: bank details + proof upload (existing)
  - **COD**: cash on delivery note, no proof needed
  - **MoMo**: merchant's MoMo number + proof upload
  - **eWallet**: FNB eWallet / PayPulse / EasyWallet / PayToday + proof upload
- Orders page: payment method badge, total with discount/delivery breakdown
- **Files**: migration 008, settings page, checkout-form, checkout page, orders page

### Discount/Coupon Codes (IN PROGRESS)
- New `coupons` table with RLS, indexes, grants
- Coupon types: fixed amount (NAD cents) or percentage
- Validation: expiry, start date, max uses, min order amount
- Server-side coupon validation in place_order RPC (FOR UPDATE lock for concurrency)
- New `/dashboard/coupons` CRUD page (create, edit, delete, list with status badges)
- Checkout: coupon code input, apply/remove, discount in order summary
- WhatsApp message includes discount + payment method info
- **Files**: migration 009, coupons page, checkout-form, nav

### place_order v3 RPC (IN PROGRESS)
- Adds `p_payment_method`, `p_coupon_code`, `p_discount_nad` parameters
- Server calculates discount (never trusts client), validates coupon, increments usage
- Drops old v2 function
- **File**: migration 010

### Invoice Updates (COMPLETE)
- SELECT updated to include delivery_fee_nad, discount_nad, payment_method, coupons(code), momo_number, ewallet_number, ewallet_provider
- Tfoot: subtotal → discount (with coupon code) → delivery fee → total breakdown
- Payment details: EFT (bank details), COD (cash due), MoMo (number + ref), eWallet (provider + number + ref)
- Fallback for pre-migration orders without payment_method
- Build verified locally — no errors

### Research: Namibia Mobile Money & eWallet Landscape
- MTC MoMo: no public API in Namibia; manual proof-of-payment workflow for V1
- Bank eWallets: FNB eWallet, PayPulse, EasyWallet, PayToday — no e-commerce APIs
- mPay Namibia (mpay-namibia.com) has REST API — potential medium-term integration
- Bank of Namibia Instant Payment System expected Q3 2026

---

## 2026-03-11 (Session 3) — P0 Deployed to Production

### P0 Features Deployed & Verified (24/24 E2E passing)
- Inventory tracking, industry selection, delivery fee, stock badges, low stock alerts, checkout validation
- Migrations 005, 006, 007 applied to production DB
- Old 11-arg `place_order` function dropped; 12-arg v2 active

### Deploy Script Fix (deploy.sh)
- **Root cause**: `deploy.sh` used bare `docker compose` instead of `docker compose -f docker-compose.prod.yml`
- This caused Kong to load `docker/kong.yml` (dev keys) instead of `docker/kong.prod.yml` (prod keys)
- Symptom: storefront "Store Not Found" — Kong 401 → Supabase query returned nothing
- **Fix**: Updated all `docker compose` calls in `deploy.sh` to include `-f docker-compose.prod.yml`

### Migration Apply Method Documented
- Migration files are NOT volume-mounted in DB container (only 001, 002 are)
- Apply via stdin: `cat supabase/migrations/XXX.sql | docker compose -f docker-compose.prod.yml exec -T supabase-db psql -U postgres -d postgres`

---

## 2026-03-11 (Session 2) — P0 Feature Sprint

### Inventory Tracking System (BUILT & DEPLOYED)
- Added `track_inventory`, `stock_quantity`, `low_stock_threshold`, `allow_backorder` to products
- `place_order()` v2: FOR UPDATE row locks + stock deduction per item
- `restock_on_cancel()` trigger: auto-restocks when order cancelled
- `stock_adjustments` audit table tracks every stock change with reason
- **Files**: migrations 005, 006, 007

### Industry Selection at Signup (BUILT & DEPLOYED)
- 28 Namibia-relevant industries (grocery, butchery, salon, takeaway, etc.)
- Dropdown added to store setup Step 1
- Stored as `industry` column on merchants
- **Files**: `src/lib/constants.ts`, `src/app/(dashboard)/dashboard/setup/page.tsx`

### Flat-Rate Delivery Fee (BUILT & DEPLOYED)
- Merchant sets delivery fee in Settings (NAD)
- Fee displayed at checkout when customer selects delivery
- Fee snapshot stored on order record
- WhatsApp message includes fee + total
- **Files**: `settings/page.tsx`, `checkout-form.tsx`, `checkout/page.tsx`

### Storefront Stock Display (BUILT & DEPLOYED)
- Product cards show "Out of Stock" (red) / "Only X left!" (orange) badges
- Out-of-stock products have disabled Add to Cart button
- Product detail page shows stock status badge
- **Files**: `product-card.tsx`, storefront pages

### Dashboard Low Stock Alerts (BUILT & DEPLOYED)
- Dashboard home shows orange alert card when products are low/out of stock
- Lists top 5 lowest-stock products with current quantity
- Link to products page to update stock
- **File**: `src/app/(dashboard)/dashboard/page.tsx`

### Product Form Inventory Controls (BUILT & DEPLOYED)
- Track Inventory toggle on new/edit product forms
- When enabled: stock quantity, low stock threshold, allow backorder fields
- **Files**: `products/new/page.tsx`, `products/[id]/edit/page.tsx`

### Gap Analysis & Planning Docs (CREATED)
- `GAP_ANALYSIS.md` — 70-feature OshiCart vs TakeApp comparison
- `INDUSTRY_DROPDOWN_NA.md` — Namibia industry taxonomy + personalization spec
- `INVENTORY_SPEC.md` — Full stock tracking system specification
- `IMPLEMENTATION_TASKS.md` — P0 + P1 task checklist
- `MIGRATION_PLAN.md` — SQL migrations + deploy/rollback steps

---

## 2026-03-11 (Session 1)

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
