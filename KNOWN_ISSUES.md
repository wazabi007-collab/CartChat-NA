# Known Issues

All major features deployed to production.

## Current Status
- **Hosting**: Vercel (auto-deploy from GitHub `master`)
- **Database**: Supabase Pro (EU West), all migrations applied
- **Domain**: oshicart.com (Cloudflare DNS -> Vercel)
- P0 + P1 features: All deployed
- Admin Dashboard: DEPLOYED & LIVE at /admin
- Industry-Themed Storefronts: DEPLOYED (6 layout variants)
- WhatsApp Industry Templates: DEPLOYED
- Subscription Checkout: DEPLOYED at /pricing/checkout
- Modern Invoices: DEPLOYED with VAT support
- Store Logo Upload: DEPLOYED in Settings

## Pending Manual Steps
- Add `CRON_SECRET` env var in Vercel Dashboard

## Open Items
- E2E test environment needs reconfiguration for Vercel/Supabase Pro
- "Playwright Test Store" exists in production DB — consider cleanup
- ESLint: 2 non-blocking errors (Date.now() in render, setState in effect) — P2

## Open Feature Gaps (P2 — future sprints)
- GAP-006: Customer list + order history
- GAP-007: Product variants (size/color)
- GAP-008: Payment gateway (PayToday/PayFast)
- PWA: manifest, service worker, install prompt
- WhatsApp Business API (replace deep links)
- Multi-language (English + Oshiwambo + Afrikaans)

## Resolved (This Session)
- Orders page: removed dropped merchants.tier column
- Invoice page: removed dropped merchants.tier column + SSR print fix
- Middleware: admin auth uses DB, not just env var
- Merchants page: store_slug column name fix
- Signup/setup: Suspense boundary for useSearchParams
- Pricing cards: proper signup flow routing
- Most Popular badge clipping
- React hydration error #418 on dates
- Old stores pages + API + dead TIER_LIMITS cleanup
