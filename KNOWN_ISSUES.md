# Known Issues

Full platform deployed. 3,043 products synced from SMD Technologies.

## Current Status
- **Hosting**: Vercel (auto-deploy from GitHub `master`)
- **Database**: Supabase Pro (EU West), all migrations applied
- **Domain**: oshicart.com
- All features deployed: Admin, Subscriptions, Themed Storefronts, Invoices, VAT, Checkout, SMD Sync
- Vercel Speed Insights + Analytics active
- 3,043 products synced across 22 categories in Octovia Nexus store

## Pending Manual Steps
- Add `CRON_SECRET` env var in Vercel Dashboard
- Add `SMD_BEARER_TOKEN` + `SMD_CLIENT_ACCESS_KEY` in Vercel for automated re-sync

## Open Items
- SMD sync should be automated (daily cron or manual trigger from admin)
- Category images could be improved (currently auto-assigned from first product)
- E2E test environment needs reconfiguration
- "Playwright Test Store" in production DB — consider cleanup
- ESLint: 2 non-blocking errors — P2

## Open Feature Gaps (P2 — future sprints)
- GAP-006: Customer list + order history
- GAP-007: Product variants (size/color)
- GAP-008: Payment gateway (PayToday/PayFast)
- CSV product import for merchants
- PWA (manifest, service worker, install prompt)
- WhatsApp Business API
- Multi-language support

## Resolved (Sessions 13-14)
- All admin post-deploy fixes
- Orders/invoice pages: removed dropped merchants.tier column
- Invoice SSR print button fix
- Signup/setup Suspense boundary
- Pricing card routing
- Most Popular badge clipping
- Hydration errors on dates
- Old stores pages + dead code cleanup
