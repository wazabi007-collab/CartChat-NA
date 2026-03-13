# OshiCart — Full Implementation Roadmap

## INFRA — Infrastructure Migration (2026-03-13)
- [x] **INFRA-09** Set up `send.oshicart.com` on Resend — domain fully verified (DKIM, MX, SPF)
- [ ] **INFRA-10** Update SMTP sender to `noreply@send.oshicart.com`
- [ ] **INFRA-11** Add `CRON_SECRET` env var in Vercel Dashboard

---

## ADMIN — Admin Dashboard + Subscription System (2026-03-13) — DEPLOYED
- [x] **ADMIN-01** Migration 012: tier_limits, subscriptions, payments, admin_users, admin_actions tables
- [x] **ADMIN-02** 4-tier subscription system (Oshi-Start/Basic/Grow/Pro)
- [x] **ADMIN-03** Admin overview page (stats, charts, expiring trials, activity)
- [x] **ADMIN-04** Merchant management (list, detail, 6-tab view, tier/status actions)
- [x] **ADMIN-05** Billing page (MRR stats, record payment modal, payment history)
- [x] **ADMIN-06** Platform analytics (GMV, tier distribution, industry breakdown, top 10)
- [x] **ADMIN-07** Admin team management (invite, remove, role change)
- [x] **ADMIN-08** Audit log (all admin actions with details)
- [x] **ADMIN-09** Subscription lifecycle cron (trial→grace→suspended→hard_suspended)
- [x] **ADMIN-10** Merchant-side enforcement (product limits, tier-gated inventory, suspend banners)
- [x] **ADMIN-11** Storefront enforcement (soft-suspend, conditional branding, checkout guard)
- [x] **ADMIN-12** Landing page 4-tier pricing section
- [x] **ADMIN-13** Subscription creation on merchant signup (30-day trial)

---

## THEME — Industry-Themed Storefronts (2026-03-13) — IN PROGRESS
- [x] **THEME-01** ThemeConfig + THEME_CONFIGS map + getThemeConfig() in industry.ts
- [x] **THEME-02** Theme props on ProductCard (accentColor, accentHover, ctaText)
- [ ] **THEME-03** Shared layout types (LayoutProduct, LayoutProps)
- [ ] **THEME-04** Menu-list layout (Food Prepared — orange, row-based)
- [ ] **THEME-05** Compact-grid layout (Food Fresh — green, dense grid)
- [ ] **THEME-06** Horizontal-card layout (Beauty — pink, horizontal cards)
- [ ] **THEME-07** Service-list layout (Services — blue, text list)
- [ ] **THEME-08** Visual-gallery layout (Gifting — gold, large images)
- [x] **THEME-09** ProductSection variant switcher component
- [x] **THEME-10** Storefront page wired with theme integration
- [ ] **THEME-11** Manual QA testing across all archetypes

---

## TRUST-1 — Anti-Fraud Phase 1: Basic Protection — COMPLETE
_Cost: $5-10/mo | Dev: 1-2 weeks_

- [ ] **TRUST-01** Phone/WhatsApp OTP verification for merchant signup (Supabase Auth + Twilio)
- [ ] **TRUST-02** Email verification — enable `confirm` in Supabase Auth, block disposable email domains
- [x] **TRUST-03** Store review queue — `store_status` enum on merchants (pending/active/suspended/banned)
- [x] **TRUST-04** Admin dashboard — rebuilt in Session 12 with full billing, analytics, team, audit
- [x] **TRUST-05** Report Store button on every storefront — inserts into `reports` table
- [x] **TRUST-06** Unique payment references — `OSHI-{order_id}` displayed at checkout
- [x] **TRUST-07** Transaction limits — replaced by subscription tier system (place_order v5 checks tier_limits table)
- [x] **TRUST-08** Fake POP education banner on merchant dashboard
- [x] **TRUST-09** Merchant Terms of Service

---

## TRUST-2 — Anti-Fraud Phase 2: Trust Tier System (Month 2-3)
_Cost: $0 | Dev: 2-3 weeks_

- [ ] **TRUST-10** Trust tier database schema — add `trust_tier`, `total_completed_orders`, `dispute_count`, `monthly_order_count`, `monthly_order_value`, `phone_verified`, `bipa_registration`, `id_document_url`, `id_verified` to merchants
- [ ] **TRUST-11** Tier 0 (New) — email + phone verified, 10 orders/mo, N$5,000 limit, "New Store" badge
- [ ] **TRUST-12** Tier 1 (Verified) — 30+ days, 10+ completed orders, <10% disputes, BIPA # provided → 50 orders/mo, N$25,000 limit, "Verified" badge
- [ ] **TRUST-13** Tier 2 (Established) — 90+ days, 50+ orders, <5% disputes, ID uploaded → 200 orders/mo, N$100,000 limit, priority support
- [ ] **TRUST-14** Tier 3 (Trusted) — 180+ days, 200+ orders, <3% disputes, full KYC → unlimited, "Trusted Merchant" badge, featured in store directory
- [ ] **TRUST-15** Tier evaluation function — pg_cron or Edge Function runs monthly, auto-promotes/demotes merchants
- [ ] **TRUST-16** Tier limit enforcement — `place_order` RPC checks monthly order count/value against tier limits
- [ ] **TRUST-17** Trust badge UI — display tier badge on storefront, store directory, and merchant dashboard
- [ ] **TRUST-18** BIPA registration field — optional input in merchant settings, unlocks Tier 1

---

## TRUST-3 — Anti-Fraud Phase 3: Customer Protection (Month 4-6)
_Cost: $0-50/mo | Dev: 1-2 weeks_

- [ ] **TRUST-19** Store ratings & reviews — post-order rating (1-5 stars + comment), displayed on storefront
- [ ] **TRUST-20** Dispute system — customer "I didn't receive my order" / "Item not as described" button on order
- [ ] **TRUST-21** Admin dispute queue — review disputes, freeze merchant, resolve
- [ ] **TRUST-22** POP image hashing — compute perceptual hash with Sharp on upload, reject duplicate POPs across orders
- [ ] **TRUST-23** Delivery confirmation — merchant uploads proof of delivery photo
- [ ] **TRUST-24** Dispute window — 7 days after delivery for customer to raise issue
- [ ] **TRUST-25** ID document upload — Supabase Storage private bucket, manual admin review
- [ ] **TRUST-26** "Verified Merchant" badge — visible on storefront for merchants with uploaded + reviewed ID

---

## TRUST-4 — Anti-Fraud Phase 4: Automated KYC (When Revenue Justifies)
_Cost: $50-200/mo | Dev: 1 week_

- [ ] **TRUST-27** Integrate Smile ID or Didit API — automated national ID + selfie + liveness verification
- [ ] **TRUST-28** AML/watchlist screening for high-volume merchants (>N$50,000/mo)
- [ ] **TRUST-29** Auto-trigger KYC for Tier 2+ upgrades or flagged accounts
- [ ] **TRUST-30** Behavioral fraud signals — pricing anomaly detection, duplicate product images, IP geolocation outside Namibia, same device multiple stores

---

## PWA — Progressive Web App (After Trust Phase 1)
_Cost: $0 | Dev: 1 day_

- [ ] **PWA-01** Add `manifest.json` — app name "OshiCart", icons (192px + 512px from icon.svg), theme color green `#4A9B3E`, background white
- [ ] **PWA-02** Add service worker — offline fallback page, cache static assets (images, CSS, JS)
- [ ] **PWA-03** Add "Install App" prompt/banner — detect if not installed, show install CTA on merchant dashboard
- [ ] **PWA-04** Splash screen — OshiCart logo on green/white background
- [ ] **PWA-05** iOS meta tags — `apple-mobile-web-app-capable`, status bar style, apple touch icons
- [ ] **PWA-06** Test installability — Lighthouse PWA audit score 100

## APP — App Store (1,000+ Merchants)
_Cost: Apple $99/yr + Google $25 one-time | Dev: 1-2 weeks_

- [ ] **APP-01** Capacitor setup — wrap Next.js app in native shell
- [ ] **APP-02** Push notifications — new order alerts for merchants (FCM + APNs)
- [ ] **APP-03** Android TWA build + Google Play Store submission
- [ ] **APP-04** iOS Capacitor build + App Store submission
- [ ] **APP-05** App Store assets — screenshots, description, keywords, privacy policy

---

## P2 — Feature Backlog
- [ ] **P2-01** Customer list + order history (data exists, needs UI)
- [ ] **P2-02** Product variants (size/color)
- [ ] **P2-03** Payment gateway (PayToday/PayFast/mPay)
- [ ] **P2-04** WhatsApp Business API integration (replace deep links with real messaging)
- [ ] **P2-05** Multi-language support (English + Oshiwambo + Afrikaans)

---

## Completed
- [x] **INFRA-01** Create Supabase Pro project (EU West region)
- [x] **INFRA-02** Run migrations 001-010 on Supabase Pro DB
- [x] **INFRA-03** Migrate data (merchants, products, orders, coupons) via pg_dump/restore
- [x] **INFRA-04** Move product images to Supabase Storage
- [x] **INFRA-05** Connect GitHub repo to Vercel, configure env vars
- [x] **INFRA-06** Deploy to Vercel preview URL and test all flows
- [x] **INFRA-07** Swap Cloudflare DNS to Vercel
- [x] **INFRA-08** Verify: auth, checkout, dashboard, images, WhatsApp links
- [x] **DOM-01** Migrate domain to oshicart.com (Cloudflare DNS + nginx + docker-compose)
- [x] **DOM-02** Update all source code references from octovianexus to oshicart.com
- [x] **HERO-01** Update hero image with new Namibian merchant photo
- [x] **HERO-02** Mobile-optimized hero (portrait crop + stacked layout)
- [x] **LP-01 to LP-18** Landing page UI refresh (all deployed)
- [x] **P0** Inventory tracking, industry selection, delivery fee, stock badges, low stock alerts
- [x] **P1** Payment methods (COD, MoMo, eWallet), coupons, place_order v3, invoices, logo
