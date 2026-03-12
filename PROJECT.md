# ChatCart NA — Project Brief

## Vision
The default WhatsApp commerce platform for Namibian SMEs — turning every WhatsApp seller into a professional online store in under 5 minutes.

## Problem Statement
Thousands of Namibian SMEs sell products via WhatsApp using a painful manual loop: post product photos → receive messages → negotiate price → share bank details → receive EFT proof-of-payment screenshot → manually verify → arrange delivery. This process is slow, error-prone, unscalable, and leaves no data trail for the seller.

No existing tool solves this for Namibia. TakeApp, Shopify, and WooCommerce are built for markets with mature payment APIs. Namibia's payment rails (FNB eWallet, PayToday, NamPay, MTC Maris, manual EFT) are unsupported. The result: SMEs stay manual, lose orders, and can't grow.

---

## Landing Page UI Refresh (Reference-Matched)

### Scope
Complete visual overhaul of the OshiCart landing page to match reference design with:
- Green color scheme (matching OshiCart brand green)
- Namibia-localized content, real photography, and messaging
- Payment method badges (EFT, PayToday, eWallet, Cash on Delivery)
- Mobile-first responsive design
- Full-width hero and How It Works banner images
- Embedded "How It Works" video modal

### Acceptance Criteria
- [x] Navbar: logo, Browse Stores / Sign in links, Create Free Store button
- [x] Hero: full-width banner with real merchant photo, headline, subtitle, 2 CTAs
- [x] Hero video: "Watch How It Works" opens video modal with embedded MP4
- [x] How It Works: full-width banner image (CREATE / SHARE / SELL)
- [x] Built for Namibian businesses: 4-feature grid (Catalog, EFT Proof, WhatsApp, Analytics)
- [x] Simple pricing: 3-tier cards (Free Trial, Pro N$99, Business N$249)
- [x] Key Solutions: 3 cards (WhatsApp Integration, Local Payment Focus, Mobile-First Design)
- [x] Local Payment Focus badges: EFT, PayToday, eWallet, Cash on Delivery
- [x] WhatsApp CTA: "Ready to grow your WhatsApp business?"
- [x] Footer: OshiCart logo, About Us, Contact, "Empowering Local Commerce in Namibia"
- [x] Responsive: mobile/tablet/desktop
- [x] Semantic HTML + accessible structure
- [x] Smooth hover interactions
- [x] Images optimized to WebP (7MB → 150KB hero, 104KB banner)
- [x] Build passes without errors

---

## Ideal Customer Profile (ICP)
- **Primary**: Solo or micro-business (1-5 people) selling physical goods via WhatsApp in Namibia
- **Examples**: Fashion resellers, home bakers, cosmetics sellers, phone accessory shops, farm produce sellers

## Infrastructure (Current → Planned)

### Current (VPS self-hosted)
- Server: `root@187.124.15.31` shared VPS (2 CPU, 8GB RAM)
- Domain: `oshicart.com` (Cloudflare proxied, SSL Full)
- Self-hosted Supabase (Postgres + GoTrue + PostgREST + Kong + Storage)
- Next.js in Docker container behind nginx

### Planned (Managed — migration 2026-03-13)
- **Vercel** ($20/mo) — hosts Next.js app, auto-deploys from GitHub
- **Supabase Pro** ($25/mo) — managed DB, auth, storage with CDN
- **Cloudflare** (free) — DNS only
- **VPS** — retained for dev/staging only
- Total: ~$46/mo for 1,000+ merchant capacity

## Constraints
- **Budget**: Bootstrap. Infrastructure ~$46/mo with managed services
- **Team**: Solo founder + AI tools (Claude, Ralph)
- **Timeline**: MVP in 6 weeks, revenue in 8 weeks
