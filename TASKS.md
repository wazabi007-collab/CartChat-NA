# OshiCart Tasks

## Infrastructure Migration (2026-03-13)
- [ ] **INFRA-01** Create Supabase Pro project
- [ ] **INFRA-02** Run migrations 001-010 on Supabase Pro DB
- [ ] **INFRA-03** Migrate data (merchants, products, orders, coupons) via pg_dump/restore
- [ ] **INFRA-04** Move product images to Supabase Storage
- [ ] **INFRA-05** Connect GitHub repo to Vercel, configure env vars
- [ ] **INFRA-06** Deploy to Vercel preview URL and test all flows
- [ ] **INFRA-07** Swap Cloudflare DNS to Vercel
- [ ] **INFRA-08** Verify: auth, checkout, dashboard, images, WhatsApp links
- [ ] **INFRA-09** Set up `send.oshicart.com` on Resend (DKIM/SPF in Cloudflare)
- [ ] **INFRA-10** Update SMTP sender to `noreply@send.oshicart.com`

## P2 Backlog
- [ ] **P2-01** Customer list + order history (data exists, needs UI)
- [ ] **P2-02** Product variants (size/color)
- [ ] **P2-03** Payment gateway (PayToday/PayFast/mPay)

## Completed (Session 8)
- [x] **DOM-01** Migrate domain to oshicart.com (Cloudflare DNS + nginx + docker-compose)
- [x] **DOM-02** Update all source code references from octovianexus to oshicart.com
- [x] **HERO-01** Update hero image with new Namibian merchant photo
- [x] **HERO-02** Mobile-optimized hero (portrait crop + stacked layout)
- [x] **LP-01 to LP-18** Landing page UI refresh (all deployed)
