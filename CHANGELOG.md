# Changelog

## 2026-03-14 (QA Cycle — Iteration 4) — Code Cleanup

### Cleanup
- Removed unused imports: `Image` from login + signup pages, `Link` from privacy page
- Removed unused import: `STATUS_LABELS`, `TIER_LABELS`, `SubscriptionStatus`, `SubscriptionTier` from dashboard page
- Renamed destructured `pendingResult` to skip-pattern in admin overview
- ESLint warnings: 14 → 6 (remaining are `<img>` tags for Supabase URLs and 1 interface contract prop)

---

## 2026-03-14 (QA Cycle — Iteration 3) — Security Hardening

### Security
- **BUG-009** (P1): CRON secret endpoints now use `crypto.timingSafeEqual` instead of `===` (prevents timing attacks) — 2 endpoints: check-subscriptions, smd-sync
- **BUG-010** (P1): Check-email endpoint validates email format + length before processing
- **BUG-011** (P1): Coupon RPC error messages now return generic "Invalid or expired coupon code" instead of leaking specific validation failures

---

## 2026-03-14 (QA Cycle — Iteration 2) — Critical Bug Fixes

### Bug Fixes
- **BUG-004** (P0): Invoice VAT label showed "incl. VAT" for both inclusive and exclusive modes — fixed to show "excl. VAT" for exclusive
- **BUG-005** (P0): File upload (proof-of-payment) accepted ANY file extension with client-supplied MIME type — now validates whitelist (jpg/png/gif/webp/pdf) and uses server-determined MIME
- **BUG-007** (P1): Analytics page-view endpoint accepted arbitrary merchant_id without validation — now validates UUID format and verifies merchant exists + is active
- **BUG-008** (P1): Analytics sync endpoint was unauthenticated — now requires user auth + merchant ownership

### Security Hardening
- WhatsApp number normalization in upload-pop: `.replace(/\s+/g, "")` → `.replace(/\D/g, "")` (strips all non-digits)

---

## 2026-03-14 (QA Cycle — Iteration 1) — Security Fixes + Lint Cleanup

### Bug Fixes
- **BUG-002** (P1): Product detail page `/s/[slug]/[productId]` now checks `store_status='active'` — previously only checked `is_active`, allowing suspended/pending store products to be visible via direct URL
- **BUG-003** (P1): Checkout page `/checkout/[slug]` now checks `store_status='active'` — previously only checked `is_active`, potentially allowing orders on pending stores

### Code Quality (12 ESLint errors → 0)
- Cart provider: Eliminated `setState` in `useEffect` by using `useState` initializer for localStorage hydration
- Admin overview: Extracted `Date.now()` calls to pre-computed variables (React compiler purity)
- Admin billing: Same `Date.now()` extraction
- Dashboard: Same `Date.now()` extraction
- SMD sync: `let` → `const` for arrays that are never reassigned

---

## 2026-03-14 (Session 15) — SMD Sync, Category Folders, Search/Sort, Analytics

### SMD Technologies Product Sync
- Full sync: 3,033 products created, 10 updated, 3,033 images compressed
- 22 categories auto-created from SMD data
- Category images auto-assigned from top product per category
- Pricing markup: 46% under N$500, 36% above N$500
- Stock levels synced (SOH), track_inventory enabled
- SKU column added to products table
- Sync script: `scripts/smd-sync.js`
- API endpoint: `POST /api/sync/smd` (admin-only, supports dry_run, skip_images, max)
- `api-auth.ts` helper for future API key auth

### Category Folder View on Storefront
- Stores with 3+ categories / 20+ products show category card grid
- Cards: image, name, product count with hover effects
- Click -> filtered view with breadcrumb ("All Categories / Audio")
- Empty category fallback with link back
- Pagination preserves category filter

### Storefront Pagination
- 100 products per page, server-side with Supabase range()
- Previous/Next + numbered page links (smart 7-page window)
- Theme accent color on active page
- Total product count

### Product Search + Sort
- Dashboard: search by name/SKU/category + sort by name/price/stock/newest
- Storefront: search by name/description + sort by name/price
- Instant client-side filtering

### Marketplace Category Filters (/stores)
- 10 industry categories as filter pills
- 28 industries mapped to display categories
- Store cards show industry label
- Filters preserve search query

### Soft Delete + Bulk Delete
- Products soft-deleted (deleted_at) instead of hard-deleted
- Deleted products still count toward tier product limit
- Select mode with checkbox overlay + Select All + bulk delete
- Confirmation warns about billing impact

### Vercel Speed Insights + Analytics
- @vercel/speed-insights: Core Web Vitals (LCP, FID, CLS, TTFB, INP)
- @vercel/analytics: page views, visitors, referrers, countries, devices

### Database Schema Changes
- `products.sku` — TEXT, indexed
- `products.deleted_at` — TIMESTAMPTZ, indexed where NULL
- `merchants.api_key` — TEXT, unique indexed
- `categories.image_url` — TEXT
- `subscriptions.pending_tier` — TEXT
- `subscriptions.payment_reference` — TEXT

---

## 2026-03-13 (Session 14) — Invoices, VAT, Checkout, Logo Upload, UX Polish

### Modern Invoice Redesign
- Dark gradient header with store logo/initial + invoice number
- Status pill badges (Awaiting/Confirmed/Paid/Cancelled)
- Payment reference in mono font
- Alternating row colors, right-aligned summary
- Payment details in gradient card
- Print-optimized flat layout (no gradients, borders only)
- Client-side PrintButton component (SSR compatibility)

### VAT Support
- `vat_number` and `vat_inclusive` columns on merchants table
- Settings > VAT Registration section with number input + inclusive toggle
- Invoice shows VAT breakdown: inclusive extracts from price, exclusive adds on top
- Namibia VAT rate: 15%

### Store Logo Upload
- Settings > Store Details: upload/change/remove logo
- Compressed via Sharp, saved to merchants.logo_url
- Shows on storefront header, invoices, store directory
- Available to all tiers

### Subscription Checkout Page (/pricing/checkout)
- Plan summary with features + tier switcher
- Nedbank payment details (Octovia Nexus Investment CC, 11991049349, 461-089)
- Auto-generated payment reference (OSHI-BASIC-{merchant_id})
- Copy button for reference
- 3-step "how it works" guide
- WhatsApp CTA to send proof of payment
- Saves pending_tier + payment_reference to subscription for admin visibility

### Signup-to-Checkout Flow
- Paid plan pricing cards route to /signup?tier=oshi_basic
- Signup page detects logged-in users + redirects to checkout or setup
- Setup page passes tier param, redirects to checkout after store creation
- Middleware preserves tier param for logged-in users

### Admin WhatsApp Notifications
- 4 pre-filled WhatsApp templates on merchant Subscription tab:
  Payment Received, Upgrade Confirmed, Payment Reminder, Subscription Expiring

### Pricing Cards Redesign
- Modern rounded cards with uppercase tier labels
- Oshi-Basic highlighted with green ring + "Most Popular" badge
- Dark CTA buttons, proper spacing, hover shadows
- "See current stores on OshiCart" button added to hero section

### Admin Pending Upgrade Visibility
- pending_tier + payment_reference columns on subscriptions
- Merchants list: amber badge showing requested upgrade
- Merchant detail header: amber banner with upgrade request + reference
- Subscription tab: Pending Upgrade + Payment Ref rows

### Bug Fixes
- Orders page: removed dropped merchants.tier column (caused redirect to setup)
- Invoice page: same fix + extracted print button to client component
- Signup/setup: Suspense boundary for useSearchParams (Next.js 16 prerender)
- Pricing card routing: proper flow for logged-in vs new users
- Most Popular badge clipping (removed overflow-hidden, added pt-4)

---

## 2026-03-13 (Session 13) — Admin Post-Deploy Fixes + Cleanup + Themed Storefronts

### Admin Dashboard Post-Deploy Fixes
- **Middleware auth fix**: Middleware was checking `ADMIN_EMAILS` env var only, blocking DB-based admin users. Now middleware only checks login; role check happens in admin layout via `admin_users` table.
- **Merchants page empty**: Query used non-existent `slug` column instead of `store_slug`. Fixed.
- **Subscription action buttons**: Added tier upgrade (Start/Basic/Grow/Pro), status change (Trial/Active/Grace/Suspended/Offline), and "Activate Subscription" shortcut to merchant detail Subscription tab.
- **React hydration error #418**: Date formatting used locale-dependent methods causing server/client mismatch. Fixed with UTC formatting.

### Cleanup
- Removed dead `TIER_LIMITS` (free/pro/business) from `src/lib/utils.ts`
- Deleted old `/admin/stores` pages (replaced by `/admin/merchants`)
- Deleted old `/api/admin/stores` route
- Added `.playwright-mcp/` and `.superpowers/` to `.gitignore`

### Industry-Themed Storefronts (In Progress)
- ThemeConfig + getThemeConfig() in `industry.ts` — DONE
- Theme props on ProductCard (accentColor, accentHover, ctaText) — DONE
- ProductSection variant switcher component — DONE
- Storefront page wired with theme integration — DONE
- Layout components (6 files) — NOT YET CREATED (blocking themed rendering)

---

## 2026-03-13 (Session 12) — Admin Dashboard + Subscription Tier System

### Migration 012: Admin Dashboard Schema
- New enum types: `subscription_tier`, `subscription_status`, `admin_role`
- New tables: `tier_limits`, `subscriptions`, `payments`, `admin_users`, `admin_actions`
- `place_order` v5: subscription status check + tier-based order limits + coupon tier-gating
- `check_expired_subscriptions()` function for daily cron
- Backfill: existing merchants get 30-day trial subscriptions
- Dropped old `tier` column from merchants

### 4-Tier Subscription System
| Tier | Price | Products | Orders/mo |
|------|-------|----------|-----------|
| Oshi-Start | N$0 (30-day trial) | 10 | 20 |
| Oshi-Basic | N$199/mo | 30 | 200 |
| Oshi-Grow | N$499/mo | 200 | 500 |
| Oshi-Pro | N$1,200/mo | Unlimited | Unlimited |

### Subscription Lifecycle
Trial (30 days) → Grace (7 days) → Soft Suspend → Hard Suspend (after 30 days)

### Admin Dashboard Pages
- **Overview**: 6 stat cards (MRR, active merchants, new this week, pending, overdue, reports), revenue/signup charts, expiring trials, recent activity
- **Merchants**: List with filters (All/Trial/Active/Grace/Suspended/Pending), search, tier/status badges
- **Merchant Detail**: 6-tab view (Overview, Subscription, Performance, Products, Orders, Activity) with tier upgrade + status change actions
- **Billing**: MRR stats, overdue/expiring lists, payment recording modal, payment history table
- **Analytics**: Platform GMV, tier distribution, payment methods, industry breakdown, revenue by month, top 10 merchants
- **Admin Team**: Invite/remove admins, role management (Super Admin/Support/Finance)
- **Audit Log**: All admin actions with expandable details

### Admin API Routes
- `PATCH /api/admin/merchants/[id]` — update merchant status
- `GET/POST /api/admin/billing` — payments list + record payment
- `GET/POST/DELETE /api/admin/team` — admin team CRUD
- `PATCH /api/admin/subscriptions` — change tier/status with period management

### Merchant-Side Enforcement
- Subscription banners on dashboard (grace/suspended/expiring warnings)
- Hard-suspend block in dashboard layout
- Product limit enforcement on new/edit pages with upgrade prompt
- Inventory fields tier-gated (Oshi-Grow+ only)
- Coupons nav hidden for Start/Basic tiers
- Storefront soft-suspend banner + disabled "Add to Cart"
- OshiCart branding conditional (Start tier only)
- Checkout soft-suspend guard + new tier-based order limits
- Subscription auto-creation on merchant signup (30-day trial)
- Landing page pricing section updated (4-tier)

### Cron Job
- `vercel.json` configured for daily midnight UTC cron
- `/api/cron/check-subscriptions` endpoint with `CRON_SECRET` auth
- Transitions: trial→grace→soft_suspended→hard_suspended

### Libraries
- `src/lib/tier-limits.ts` — Tier constants, helpers (canAddProduct, hasTierFeature, isReadOnly, showBranding)
- `src/lib/admin-permissions.ts` — Role permission matrix, getVisibleNavItems()
- `src/lib/admin-auth.ts` — Shared admin authentication helper
- `recharts` added as dependency for admin charts

### Deployment
- Migration 012 applied to Supabase Pro
- Super admin seeded: `wazabi007@gmail.com`
- All admin pages verified working in production
- Build: `tsc --noEmit` + `next build` — 0 errors, 38 routes

---

## 2026-03-13 (Session 11) — QA Validation + Security Hotfix

### BUG-009 HOTFIX: Legacy RLS Policy Bypass (P0)
- Dropped legacy policy "Merchants: public read active stores" that only checked `is_active=true`
- This policy allowed suspended/banned stores to remain publicly visible
- Fix: `DROP POLICY` via Supabase migration `fix_legacy_rls_merchants`
- Verified: 3 correct policies remain, all enforce `store_status='active'`

### Investigation: Industry-Aware Features (design complete, build pending)
- Mapped 29 industries to 6 archetypes: Food Prepared, Food Fresh, Retail, Beauty, Services, Gifting
- Designed WhatsApp order templates per archetype (confirm, ready, cancel, payment reminder)
- Designed storefront theming per archetype (colors, layout, CTAs, product card styles)
- No code changes yet — build starts next session

### Production QA Validation
- Executed 30 tests across 6 phases (pre-flight, security, functional, performance, build, trust)
- All 30 tests PASS after BUG-009 fix
- Sub-1s load times on all key pages
- Admin API endpoints properly return 403 for non-admin users
- Report system fully functional (submit, validate, block reads)
- RLS policies verified for merchants, reports, orders

---

## 2026-03-13 (Session 10) — TRUST Phase 1: Anti-Fraud Basic Protection

### TRUST-03: Store Status System
- Added `store_status` enum: `pending`, `active`, `suspended`, `banned`
- New merchants start as `pending` — must be approved by admin
- Existing merchants default to `active`
- Public storefront and store directory only show `active` stores
- Dashboard shows status banners for pending/suspended stores

### TRUST-04: Admin Dashboard
- New admin panel at `/admin` (dark sidebar, separate from merchant dashboard)
- `/admin/stores` — view all merchants with status, orders, revenue, report counts
- Filter by status (pending/active/suspended/banned) + search by name
- Approve, suspend, or ban stores with one click
- `/admin/reports` — view and resolve customer reports
- Protected by `ADMIN_EMAILS` environment variable

### TRUST-05: Report Store Button
- "Report Store" button on every storefront footer
- Modal with reason dropdown (scam, fake products, no delivery, etc.)
- Optional details, name, and contact fields
- Reports saved to `reports` table, visible in admin panel

### TRUST-06: Unique Payment References
- `place_order` RPC generates `OSHI-XXXXXXXX` payment reference per order
- Displayed on checkout success screen in blue reference card
- Included in WhatsApp order notification message
- Helps merchants match EFT payments to specific orders

### TRUST-07: Transaction Limits for New Stores
- Stores less than 30 days old: max 10 orders/month, N$5,000 monthly value
- Enforced server-side in `place_order` RPC (cannot be bypassed)
- Clear error messages explaining limits

### TRUST-08: Fake POP Education Banner
- Blue safety banner on merchant dashboard homepage
- "Always verify payments by checking your actual bank balance"
- Warns that proof-of-payment screenshots can be faked

### TRUST-09: Merchant Terms of Service
- Updated `/terms` with platform role definition (OshiCart is platform, not seller)
- Added prohibited items list (counterfeit, weapons, drugs, etc.)
- Added prohibited conduct (payment fraud, fake POPs, multiple accounts)
- Added consequences section (suspension, ban, reporting to authorities)
- Added new store limits section

### Database Migration (011)
- `store_status` enum + column on merchants
- `tos_accepted_at` column on merchants
- `payment_reference` column on orders
- `reports` table with RLS
- `place_order` v4 with status check, order limits, payment reference generation
- Updated RLS policies for public merchant visibility

### New Files
- `src/app/(admin)/layout.tsx` — admin layout with auth guard
- `src/app/(admin)/admin/page.tsx` — admin overview
- `src/app/(admin)/admin/stores/page.tsx` — store management
- `src/app/(admin)/admin/stores/store-actions.tsx` — approve/suspend/ban
- `src/app/(admin)/admin/reports/page.tsx` — report queue
- `src/app/(admin)/admin/reports/report-actions.tsx` — review/dismiss
- `src/components/admin/nav.tsx` — admin sidebar navigation
- `src/components/storefront/report-button.tsx` — report store modal
- `src/app/api/admin/stores/route.ts` — admin store status API
- `src/app/api/admin/reports/route.ts` — admin report resolution API
- `src/app/api/reports/route.ts` — public report submission API

---

## 2026-03-13 (Session 9) — Supabase Pro + Vercel Migration + Resend Setup + Email Fix

### Supabase Auth Email Templates Fixed (INFRA-10 COMPLETE)
- Configured custom SMTP in Supabase Auth: `smtp.resend.com:465`, sender `noreply@send.oshicart.com`
- **BUG-008**: Email templates missing OTP code — emails only contained magic link, no `{{ .Token }}`
  - Fixed "Confirm sign up" template: added `<p>Or enter this OTP code: <strong>{{ .Token }}</strong></p>`
  - Fixed "Magic link" template: added `<p>Or enter this OTP code: <strong>{{ .Token }}</strong></p>`
  - Changed Email OTP length from 8 digits to 6 digits (Auth > Providers > Email)
  - Users now receive both a clickable link AND a 6-digit OTP code in auth emails

### Resend Email Domain Setup (COMPLETE)
- Deleted old Resend domains: `octovianexus.com` and `send.octovianexus.com`
- Added new domain: `send.oshicart.com` (eu-west-1 Ireland) in Resend
- Added 4 DNS records in Cloudflare: DKIM (TXT), MX, SPF (TXT), DMARC (TXT)
- Fixed MX and SPF record names from `send` to `send.send` (Resend expects `send.send.oshicart.com`)
- All records verified in Resend (DKIM, MX, SPF)

### Vercel Billing
- Added payment method to Vercel account (card on file, trial secured)

### Project Documentation Overhaul
- README.md: replaced Next.js boilerplate with OshiCart project docs
- TASKS.md: moved completed INFRA-01–08 to Completed section
- ARCHITECTURE.md: updated stack, auth, security, infrastructure, directory structure
- PROJECT.md: updated infrastructure from VPS to Vercel/Supabase Pro
- SESSION_STATE.md: rewritten for current state + Resend DNS records reference
- CHANGELOG.md: added Session 9 entry
- KNOWN_ISSUES.md: updated status, marked VPS-era bugs as deprecated
- MIGRATION_PLAN.md: updated deployment steps for Supabase Pro
- PRD.md: renamed to OshiCart, updated domain refs and auth method
- GO_TO_MARKET.md: renamed all ChatCart → OshiCart
- IMPLEMENTATION_TASKS.md: marked P0/P1 as complete

### Infrastructure Migration: VPS → Managed Services (COMPLETE)
- Migrated from self-hosted Docker Supabase on VPS to **Supabase Pro** (EU West/Ireland)
- Migrated from Docker Next.js container to **Vercel** (auto-deploy from GitHub)
- Cloudflare DNS updated: A records (`@` and `www`) → Vercel IP `216.198.79.1` (DNS only, no proxy)

### Database Migration
- Ran combined migration (001-010) on Supabase Pro SQL Editor
- Migrated all data: 6 merchants, 17 products, 23 orders, 24 order_items, 1 coupon, 2 stock_adjustments, 4 store_analytics
- All RLS policies, SECURITY DEFINER functions, triggers active

### Storage Migration
- Extracted product images from Docker storage volume (`/var/lib/storage/stub/stub/merchant-assets/`)
- Uploaded to Supabase Pro Storage via REST API with service role key
- Updated image URLs in products table to new Supabase Pro domain
- Created storage buckets: `merchant-assets` (public), `order-proofs` (private) with RLS policies

### Vercel Deployment
- Connected GitHub repo `wazabi007-collab/CartChat-NA` to Vercel project "oshicart"
- Configured 4 environment variables (SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY, SITE_URL)
- Build succeeded, deployed at `oshicart.vercel.app` + custom domain `oshicart.com`

### Code Changes for Migration
- `next.config.ts`: removed `output: "standalone"`, removed Docker image patterns, added Supabase Pro hostname
- `src/lib/supabase/server.ts`: removed Docker URL rewriting
- `src/lib/supabase/service.ts`: removed Docker URL rewriting
- `src/lib/supabase/middleware.ts`: removed Docker URL rewriting
- `.env.local`: updated to Supabase Pro credentials

### Verification (INFRA-08)
- Landing page, login, signup, store directory, individual stores, product images, cart, checkout, WhatsApp links — all verified working at https://oshicart.com

### Files Created
- `supabase/migrations/FULL_MIGRATION_FOR_SUPABASE_PRO.sql` — combined migrations 001-010
- `supabase/migrations/STORAGE_BUCKETS_FOR_SUPABASE_PRO.sql` — storage bucket setup
- `.env.production.example` — template for Vercel env vars

---

## 2026-03-12 (Session 8) — Domain Migration + Hero Update

### Domain Migration: oshicart.octovianexus.com → oshicart.com (DEPLOYED)
- Purchased `oshicart.com` domain on Cloudflare
- Cloudflare DNS: A records for `@` and `www` → 187.124.15.31 (proxied)
- SSL/TLS mode: Full (Cloudflare → self-signed cert on server)
- Nginx: new config at `/etc/nginx/sites-enabled/oshicart.com.conf`
- Self-signed cert: `/etc/ssl/{certs,private}/oshicart.com.{crt,key}` (10-year)
- `www.oshicart.com` redirects to `oshicart.com`
- Old `oshicart.octovianexus.conf` nginx config removed
- Updated `docker-compose.prod.yml`: all 6 URL references changed
- Updated `src/app/privacy/page.tsx`, `dashboard/setup/page.tsx`, `tests/e2e/helpers/auth.ts`
- GoTrue `GOTRUE_SITE_URL` + `API_EXTERNAL_URL` updated to `oshicart.com`
- SMTP sender (`noreply@send.octovianexus.com`) kept as-is (Resend domain unchanged — TODO later)

### Hero Image Update (DEPLOYED)
- Replaced hero with new Namibian merchant image (craft shop + OshiCart on phone + Namibia flag map)
- Desktop: 1920x700 WebP, 75KB (was 154KB)
- Mobile: new `hero-main-mobile.webp` — 800x900 portrait crop, 55KB
- Mobile layout: stacked (image top, text below) instead of overlay
- Desktop layout: unchanged wide banner with gradient overlay

### Landing Page Deployed (Session 7 work committed)
- Committed and deployed full landing page rewrite from previous session
- All SVG assets, video modal, optimized images pushed to production

### Infrastructure Planning
- Evaluated scaling to 1,000 merchants
- Decision: migrate to **Supabase Pro ($25/mo) + Vercel ($20/mo)** — planned for 2026-03-13
- VPS will become dev/staging server only

---

## 2026-03-12 (Session 7) — Landing Page UI Refresh

### Landing Page Complete Rebuild (DONE)
- Full visual overhaul matching reference design with real photography and illustrations
- **Navbar**: Sticky header with backdrop blur, logo, Browse Stores / Sign in links, green Create Free Store button
- **Hero**: Full-width banner with real Namibian merchant photo (`hero-main.webp`), gradient text overlay, headline "Your Namibian Business, Online in 5 Minutes", 2 CTAs
- **Hero Video**: "Watch How It Works" button opens video modal with embedded MP4, autoplay, close on Escape/click-outside
- **How It Works**: Full-width banner image (`how-it-works-banner.webp`) showing 3 steps — CREATE YOUR CATALOG, SHARE YOUR LINK, GET ORDERS & PAYMENTS
- **Built for Namibian businesses**: 4-feature grid (Product Catalog, EFT Payment Proof, WhatsApp Notifications, Sales Analytics)
- **Simple pricing**: 3-tier pricing cards (Free Trial N$0, Pro N$99/mo, Business N$249/mo) — Pro highlighted with green ring
- **Key Solutions**: 3-card grid — WhatsApp Integration (real WhatsApp icon), Local Payment Focus (EFT/PayToday/eWallet/Cash on Delivery SVG badges), Mobile-First Design (device illustration)
- **WhatsApp CTA**: "Ready to grow your WhatsApp business?" + Create Your Free Store green button
- **Footer**: Dark bg, OshiCart logo (inverted), About Us, Contact links, "Empowering Local Commerce in Namibia"

### Image Assets Created
- `public/hero-main.webp` — hero banner (compressed 7.1MB PNG → 150KB WebP)
- `public/how-it-works-banner.webp` — 3-step banner (compressed 7.2MB PNG → 104KB WebP)
- `public/how-it-works.mp4` — explainer video (2.2MB)
- `public/whatsapp-icon.webp` — official WhatsApp logo (7KB WebP)
- `public/step-create.svg`, `step-share.svg`, `step-sell.svg` — hand illustration SVGs
- `public/payment-eft.svg`, `payment-paytoday.svg`, `payment-ewallet.svg`, `payment-cod.svg` — payment method logos
- `public/mobile-devices.svg` — device mockup illustration
- `public/namibia-map.svg` — Namibia outline

### Color Scheme
- Changed from teal to green (matching OshiCart brand "Cart" green)
- All buttons, accents, highlights use green-600/green-700

### Section Order
1. Hero (full-width banner)
2. How It Works (full-width banner)
3. Built for Namibian businesses
4. Simple pricing
5. Key Solutions for Namibian Merchants
6. Ready to grow your WhatsApp business?
7. Footer

### Performance
- All PNG images compressed to WebP via Sharp (total savings: ~20MB → ~300KB)
- Video: 2.2MB MP4, loaded on-demand via modal (not preloaded)
- Next.js Image component with automatic optimization

### Files Modified
- `src/app/page.tsx` — complete rewrite (10 components)
- `src/components/video-modal.tsx` — new client component for video playback modal

---

## 2026-03-11 (Session 6) — Logo + Branding

### OshiCart SVG Logo (CREATED & DEPLOYED)
- Recreated logo as high-quality SVG from low-res PNG (357x162 → infinite resolution)
- Speech bubble + shopping cart icon in blue `#2B5EA7`
- Text: "Oshi" in blue + "Cart" in green `#4A9B3E`
- **logo.svg** — full horizontal logo (icon + text) for headers/nav
- **icon.svg** — icon-only version for favicon/app icon
- Replaced text "OshiCart" with logo image on: landing page, login, signup, dashboard sidebar, mobile nav, stores page
- Set favicon to `icon.svg` via layout.tsx metadata
- **Files**: `public/logo.svg`, `public/icon.svg`, `page.tsx`, `login/page.tsx`, `signup/page.tsx`, `nav.tsx`, `stores/page.tsx`, `layout.tsx`

---

## 2026-03-11 (Session 5) — P1 Deployed to Production

### Invoice Page Complete
- Tfoot: subtotal → discount (coupon code) → delivery fee → total
- Payment details: EFT/COD/MoMo/eWallet sections with correct merchant info
- Fallback for pre-migration orders without payment_method

### BUG-007: place_order v3 RPC — `v_coupon` record not assigned (FIXED & DEPLOYED)
- **Root cause**: PL/pgSQL `v_coupon.id` raised error when no coupon code provided (record unassigned)
- **Fix**: Added separate `v_coupon_id uuid := NULL` variable, assign only when coupon validated
- **File**: `supabase/migrations/010_place_order_v3.sql`

### P1 Deployment
- Migrations 008-010 applied to production
- App rebuilt and restarted via deploy.sh
- Kong keys verified, env vars verified
- 24/24 E2E tests passing

---

## 2026-03-11 (Session 4) — P1 Payment Methods + Coupons

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
