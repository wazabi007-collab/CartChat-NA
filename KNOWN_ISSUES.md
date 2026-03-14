# Known Issues — QA/Fix Cycle (FINAL)

## Current Status (2026-03-14)
- **Build**: PASS (43 routes, 0 TS errors, 0 ESLint errors)
- **Platform**: Vercel + Supabase Pro
- **All P0/P1 resolved.**

## Fixed This Cycle (10 bugs)

| Bug ID | Severity | Description | Iteration |
|--------|----------|-------------|-----------|
| BUG-001 | P0 | Legacy RLS allowed suspended stores visible | Prior |
| BUG-002 | P1 | Product detail missing store_status check | 1 |
| BUG-003 | P1 | Checkout missing store_status check | 1 |
| BUG-004 | P0 | Invoice VAT label wrong for exclusive | 2 |
| BUG-005 | P0 | File upload accepts any extension/MIME | 2 |
| BUG-007 | P1 | Analytics endpoint no merchant validation | 2 |
| BUG-008 | P1 | Analytics sync unauthenticated | 2 |
| BUG-009 | P1 | CRON secret timing attack vulnerable | 3 |
| BUG-010 | P1 | Check-email no input validation | 3 |
| BUG-011 | P1 | Coupon errors leak validation details | 3 |

## Code Quality Improvements
- 12 ESLint errors eliminated (iter 1)
- 8 unused imports removed (iter 4)
- Final: 0 errors, 6 warnings (all cosmetic P2)

## Remaining P2 (future hardening, not blockers)

| Item | Risk Level |
|------|------------|
| Rate limiting on public endpoints (lookup, reports, check-email) | Low |
| Content Security Policy headers | Low |
| ISR/caching for storefronts | Low |
| Category image upload UI | Low |
| `<img>` vs `<Image>` for Supabase URLs | Low |
| Order status server-side validation | Low (UI enforces) |

## Ops Tasks (manual)
- Add `CRON_SECRET` env var in Vercel Dashboard
- Add `SMD_BEARER_TOKEN` + `SMD_CLIENT_ACCESS_KEY` in Vercel
- Clean up "Playwright Test Store" from production DB

## Feature Gaps (future sprints)
- Customer list + order history
- Product variants (size/color)
- Payment gateway integration
