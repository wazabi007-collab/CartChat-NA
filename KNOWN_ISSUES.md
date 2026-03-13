# Known Issues

All P0 + P1 + Admin Dashboard + Themed Storefronts deployed to production.

## Current Status
- **Hosting**: Vercel (auto-deploy from GitHub `master`)
- **Database**: Supabase Pro (EU West), migration 012 applied
- **Domain**: oshicart.com (Cloudflare DNS → Vercel)
- P0 features: All deployed
- P1 features: All deployed
- Admin Dashboard: **DEPLOYED & LIVE** at /admin
- Industry-Themed Storefronts: **DEPLOYED** (6 layout variants)
- WhatsApp Industry Templates: **DEPLOYED** (per-archetype order messages)

## Pending Manual Steps
- Add `CRON_SECRET` env var in Vercel Dashboard (value: `c9f94e874701a3e9beda02390fda2725`)

## Open Items
- Themed storefronts QA: test each archetype visually in browser
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

## Deployment Notes

### Current: Vercel + Supabase Pro
- Push to `master` → Vercel auto-deploys
- DB changes: run SQL in Supabase Dashboard SQL Editor
- Env vars: managed in Vercel Dashboard > Settings > Environment Variables

### Previous: Docker on VPS (deprecated)

## Resolved

### Admin Dashboard Post-Deploy Fixes
- Middleware auth fix (only checked ADMIN_EMAILS, not admin_users table) — FIXED
- Merchants page empty (wrong column name) — FIXED
- Subscription action buttons missing — FIXED
- React hydration error #418 — FIXED (UTC date formatting)
- Old stores pages + API + dead TIER_LIMITS code — CLEANED UP

### BUG-001 through BUG-009 — All FIXED & DEPLOYED
### P0 + P1 Feature Gaps — All DEPLOYED
