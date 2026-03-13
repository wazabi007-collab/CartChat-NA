# Session State — Active Working Memory

## 2026-03-13 — All Features DEPLOYED

### CURRENT STATUS: Admin Dashboard + Themed Storefronts + Subscription Checkout + VAT + Invoices — ALL LIVE

---

### What Was Built & Deployed Today

**Admin Dashboard** — Full admin panel at /admin
- Merchant management, billing, analytics, team, audit log
- Tier upgrade + status change actions with WhatsApp notify buttons
- Pending upgrade visibility (amber badges + payment references)

**Subscription Tier System** — 4-tier (Oshi-Start/Basic/Grow/Pro)
- Product limits, inventory tier-gating, soft-suspend, branding control
- Subscription lifecycle cron (trial -> grace -> suspend -> hard suspend)
- Subscription creation on merchant signup (30-day trial)

**Subscription Checkout** — /pricing/checkout?tier=...
- Nedbank payment details (Octovia Nexus Investment CC, 11991049349, 461-089)
- Auto-generated payment reference saved to subscription
- WhatsApp CTA to send proof of payment
- Seamless signup flow: pricing card -> signup -> setup -> checkout

**Industry-Themed Storefronts** — 6 layout variants
- menu-list (Food Prepared, orange), compact-grid (Food Fresh, green)
- product-grid (Retail, green), horizontal-card (Beauty, slate)
- service-list (Services, blue), visual-gallery (Gifting, gold)

**WhatsApp Industry Templates** — Per-archetype order messages (confirmed/completed/cancelled)

**Modern Invoice** — /invoice/[orderId]
- Dark gradient header with store logo, status badges, payment reference
- VAT support (15% inclusive or exclusive)
- Print-optimized flat layout for mobile PDF save
- Client-side PrintButton component

**VAT Support** — Settings > VAT Registration
- Optional VAT number + inclusive/exclusive toggle
- Invoice shows VAT breakdown when merchant has VAT number

**Store Logo Upload** — Settings > Store Details
- Upload/change/remove logo, compressed via Sharp
- Shows on storefront, invoices, store directory

**UX Improvements**
- Dashboard stat cards clickable -> Products, Orders, Analytics
- Product cards clickable -> edit page
- Admin stat cards clickable -> relevant pages
- OshiCart logo in nav links back to dashboard
- "See current stores on OshiCart" button on homepage hero
- Pricing cards: modern design, Oshi-Basic highlighted with "Most Popular" badge
- Admin WhatsApp buttons: Payment Received, Upgrade Confirmed, Reminder, Expiring

---

### Post-Deploy Fixes Applied
- Middleware admin auth (DB check, not just env var)
- Merchants page column name (slug -> store_slug)
- Orders page + invoice page: removed dropped merchants.tier column
- Invoice: extracted print button to client component (SSR fix)
- Signup/setup: Suspense boundary for useSearchParams
- Pricing cards: signup flow routing for logged-in users
- Most Popular badge clipping fix

### Pending Manual Steps
- Add `CRON_SECRET` env var in Vercel Dashboard (value: c9f94e874701a3e9beda02390fda2725)

### Current Infrastructure
- **Domain**: oshicart.com — LIVE on Vercel
- **Hosting**: Vercel (auto-deploys from GitHub `master`)
- **Database**: Supabase Pro — EU West (Ireland)
- **Admin**: wazabi007@gmail.com as super_admin
