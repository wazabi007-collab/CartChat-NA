# Known Issues

All P0 + P1 features deployed. Infrastructure migrated to Supabase Pro + Vercel.

## Current Status
- **Hosting**: Vercel (auto-deploy from GitHub `master`)
- **Database**: Supabase Pro (EU West)
- **Domain**: oshicart.com (Cloudflare DNS → Vercel)
- P0 features: All deployed (inventory, industry, delivery fee)
- P1 features: All deployed (payment methods, coupons, invoice updates)
- Branding: SVG logo deployed across all pages + favicon
- No E2E tests for new payment methods or coupons yet (existing 24 tests all pass on VPS — E2E test env not yet configured for Vercel)

## Open Items
- E2E test environment needs reconfiguration for Vercel/Supabase Pro (tests were written for self-hosted Docker setup)
- "Playwright Test Store" exists in production DB — consider cleaning up test data
- ESLint: 2 non-blocking errors (Date.now() in render, setState in effect) — P2

## QA Validation (2026-03-13)
- **30 tests executed**, **30 passed**, **0 failed**
- **1 P0 bug found and fixed** (BUG-009: Legacy RLS policy)
- Full report: TEST_REPORT.md | Matrix: TEST_MATRIX.md

## Open Feature Gaps (P2 — future sprints)
- GAP-006: Customer list + order history
- GAP-007: Product variants (size/color)
- GAP-008: Payment gateway (PayToday/PayFast)

## Deployment Notes

### Current: Vercel + Supabase Pro
- Push to `master` → Vercel auto-deploys
- DB changes: run SQL in Supabase Dashboard SQL Editor
- Env vars: managed in Vercel Dashboard > Settings > Environment Variables

### Previous: Docker on VPS (deprecated)
- VPS `187.124.15.31` is no longer serving production traffic
- Docker deployment warnings (Kong keys, compose file) no longer apply

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
- **Root cause**: Supabase Auth email templates ("Confirm sign up" and "Magic link") only contained `{{ .ConfirmationURL }}` (magic link) but no `{{ .Token }}` (OTP code)
- **Symptom**: Users received emails with a clickable login link but no visible 6-digit OTP code
- **Fix**: Added `<p>Or enter this OTP code: <strong>{{ .Token }}</strong></p>` to both templates via Supabase Dashboard

### BUG-009: Legacy RLS policy bypasses store_status — FIXED (2026-03-13)
- **BUG-ID**: BUG-009
- **Severity**: P0 (security — suspended/banned stores visible to public)
- **Status**: Fixed & Verified
- **Repro steps**: 1) Suspend a store via admin (store_status='suspended') 2) Store still has is_active=true 3) Legacy policy "Merchants: public read active stores" only checked is_active, not store_status 4) Suspended store remained visible on /stores and /s/{slug}
- **Root cause**: Migration 011 added new policies with store_status check but did NOT drop the old policy that only checked is_active=true. Supabase RLS is permissive (OR between policies), so the old policy created a bypass.
- **Fix**: `DROP POLICY "Merchants: public read active stores" ON merchants;` — applied via Supabase migration
- **Regression**: Verified 6 active stores still visible on /stores after fix. Only 3 policies remain, all enforce dual check.
- **Owner**: Claude QA
- **Last updated**: 2026-03-13

### P0 Features — All Deployed
- GAP-001: Inventory/stock tracking
- GAP-002: Industry selection at signup
- GAP-003: Delivery fee

### Completed Feature Gaps
- GAP-004: Discount/coupon codes — DEPLOYED
- GAP-005: Cash on delivery + MoMo + eWallet — DEPLOYED
