# Known Issues

All P0 + P1 features deployed. Admin dashboard build complete — ready to deploy.

## Current Status
- **Hosting**: Vercel (auto-deploy from GitHub `master`)
- **Database**: Supabase Pro (EU West)
- **Domain**: oshicart.com (Cloudflare DNS → Vercel)
- P0 features: All deployed (inventory, industry, delivery fee)
- P1 features: All deployed (payment methods, coupons, invoice updates)
- Branding: SVG logo deployed across all pages + favicon
- Admin Dashboard: **All chunks complete, build verified (0 errors), ready to deploy**

## Deploy Checklist (Admin Dashboard)
1. Run migration 012 in Supabase SQL Editor
2. Set `CRON_SECRET` env var in Vercel Dashboard
3. Push to `master` → Vercel auto-deploys
4. Verify at https://oshicart.com/admin

## Cleanup TODO (post-deploy, non-blocking)
- Old `TIER_LIMITS` in `src/lib/utils.ts` (free/pro/business) — no longer imported, can remove
- Old stores pages: `src/app/(admin)/admin/stores/` — replaced by `/admin/merchants`
- Old stores API: `src/app/api/admin/stores/route.ts` — can remove after verifying merchants API

## Open Items
- E2E test environment needs reconfiguration for Vercel/Supabase Pro
- "Playwright Test Store" exists in production DB — consider cleaning up test data
- ESLint: 2 non-blocking errors (Date.now() in render, setState in effect) — P2
- Tailwind CSS v4: `next build` fails on Windows (oxide native binary), builds fine on Vercel

## Open Feature Gaps (P2 — future sprints)
- GAP-006: Customer list + order history
- GAP-007: Product variants (size/color)
- GAP-008: Payment gateway (PayToday/PayFast)

## QA Validation (2026-03-13)
- **30 tests executed**, **30 passed**, **0 failed**
- **1 P0 bug found and fixed** (BUG-009: Legacy RLS policy)
- Full report: TEST_REPORT.md | Matrix: TEST_MATRIX.md

## Deployment Notes

### Current: Vercel + Supabase Pro
- Push to `master` → Vercel auto-deploys
- DB changes: run SQL in Supabase Dashboard SQL Editor
- Env vars: managed in Vercel Dashboard > Settings > Environment Variables

### Previous: Docker on VPS (deprecated)
- VPS `187.124.15.31` is no longer serving production traffic

## Resolved

### BUG-001: Checkout order creation — FIXED & DEPLOYED
- Removed `JSON.stringify()` from p_items in checkout-form.tsx

### BUG-002: Auth cookie injection in tests — FIXED & DEPLOYED
- Cookie name dynamically computed as `sb-{ref}-auth-token` from NEXT_PUBLIC_SUPABASE_URL

### BUG-003: kong.prod.yml key mismatch — FIXED & DEPLOYED (VPS-era, no longer applicable)

### BUG-004: Public storage images 401 — FIXED & DEPLOYED (VPS-era, no longer applicable)

### BUG-005: OTP code expiry too short — FIXED & DEPLOYED (VPS-era, no longer applicable)

### BUG-006: deploy.sh wrong compose file — FIXED (VPS-era, no longer applicable)

### BUG-008: Email templates missing OTP code — FIXED (2026-03-13)
- Added `{{ .Token }}` to Supabase Auth email templates

### BUG-009: Legacy RLS policy bypasses store_status — FIXED (2026-03-13)
- Dropped old permissive policy that only checked is_active

### P0 Features — All Deployed
- GAP-001: Inventory/stock tracking
- GAP-002: Industry selection at signup
- GAP-003: Delivery fee

### Completed Feature Gaps
- GAP-004: Discount/coupon codes — DEPLOYED
- GAP-005: Cash on delivery + MoMo + eWallet — DEPLOYED
