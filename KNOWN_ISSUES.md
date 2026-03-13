# Known Issues

All P0 + P1 + Admin Dashboard deployed to production. Themed storefronts in progress.

## Current Status
- **Hosting**: Vercel (auto-deploy from GitHub `master`)
- **Database**: Supabase Pro (EU West), migration 012 applied
- **Domain**: oshicart.com (Cloudflare DNS → Vercel)
- P0 features: All deployed
- P1 features: All deployed
- Admin Dashboard: **DEPLOYED & LIVE** at /admin
- Industry-Themed Storefronts: **Partially implemented** — layout components not yet created

## In Progress — Themed Storefronts
- ThemeConfig, getThemeConfig(), ProductCard theming, ProductSection — all done
- Layout components (Tasks 3-8) — NOT created yet, ProductSection imports them
- 6 layouts needed: types.ts, menu-list, compact-grid, horizontal-card, service-list, visual-gallery

## Pending Manual Steps
- Add `CRON_SECRET` env var in Vercel Dashboard (value: `c9f94e874701a3e9beda02390fda2725`)

## Open Items
- E2E test environment needs reconfiguration for Vercel/Supabase Pro
- "Playwright Test Store" exists in production DB — consider cleaning up test data
- ESLint: 2 non-blocking errors (Date.now() in render, setState in effect) — P2

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

### Admin Dashboard Post-Deploy Fixes
- Middleware was blocking admin access (only checked ADMIN_EMAILS, not admin_users table) — FIXED
- Merchants page showed 0 merchants (wrong column name `slug` vs `store_slug`) — FIXED
- Merchant detail had no action buttons for tier/status changes — FIXED (added to Subscription tab)
- React hydration error #418 on date formatting — FIXED (UTC formatting)
- Old stores pages + API + dead TIER_LIMITS code — CLEANED UP

### BUG-001: Checkout order creation — FIXED & DEPLOYED
### BUG-002: Auth cookie injection in tests — FIXED & DEPLOYED
### BUG-003: kong.prod.yml key mismatch — FIXED (VPS-era)
### BUG-004: Public storage images 401 — FIXED (VPS-era)
### BUG-005: OTP code expiry too short — FIXED (VPS-era)
### BUG-006: deploy.sh wrong compose file — FIXED (VPS-era)
### BUG-008: Email templates missing OTP code — FIXED
### BUG-009: Legacy RLS policy bypasses store_status — FIXED

### Completed Feature Gaps
- GAP-001: Inventory/stock tracking — DEPLOYED
- GAP-002: Industry selection at signup — DEPLOYED
- GAP-003: Delivery fee — DEPLOYED
- GAP-004: Discount/coupon codes — DEPLOYED
- GAP-005: Cash on delivery + MoMo + eWallet — DEPLOYED
