# Session State — Active Working Memory

## 2026-03-13 — QA Production Validation Complete

### QA Cycle 1 — Full Production Validation
- **Timestamp**: 2026-03-13T14:30Z
- **Cycle**: QA-1 (post TRUST Phase 1 deploy)
- **Features tested**: All core + TRUST Phase 1 (30 tests)
- **Bug found**: BUG-009 (P0) — Legacy RLS policy "Merchants: public read active stores" bypassed store_status filter
- **Root cause (confirmed)**: Migration 011 added new policies but didn't drop old one. Supabase permissive RLS = OR between policies, so old policy created bypass.
- **Fix applied**: `DROP POLICY "Merchants: public read active stores" ON merchants;` via Supabase migration
- **Files changed**: DB only (Supabase migration `fix_legacy_rls_merchants`)
- **Tests run**: 30 total — 30 PASS, 0 FAIL
- **Remaining risk**: LOW — lint warnings (P2), no E2E test env for Vercel yet
- **Next action**: Commit updated docs, consider E2E test setup for Vercel

### TRUST Phase 1 — DEPLOYED & VALIDATED
- DB migration applied via Supabase MCP
- ADMIN_EMAILS env var added to Vercel
- Code pushed to master (commit 9884a27)
- Vercel deployment: READY (verified on dashboard)
- BUG-009 hotfix applied to DB directly

### Next Up: Industry-Aware Storefronts + WhatsApp Order Templates
**Status: INVESTIGATION COMPLETE — Ready to build**

Investigation found that the current order flow has a gap: when merchants change order status (confirm/complete/cancel), no notification is sent to the customer. The "WhatsApp customer" button only sends a generic message.

**Two features to build (in order):**

**Part 1: WhatsApp Order Templates (quick win)**
- Add pre-filled WhatsApp messages per status change (confirm, ready, complete, cancel, payment reminder)
- Templates vary by industry group (6 archetypes)
- Modify `OrderActions` component to open WhatsApp with contextual template
- Files: `src/lib/industry.ts` (new), `src/lib/constants.ts`, `src/app/(dashboard)/dashboard/orders/order-actions.tsx`

**Part 2: Industry-Themed Storefronts (bigger change)**
- 6 industry archetypes: Food Prepared, Food Fresh, Retail, Beauty, Services, Gifting
- Each gets: color theme, layout variant, CTA labels, product card style
- Industry column already exists in DB — no migration needed
- Files: `src/app/s/[slug]/page.tsx`, `src/components/storefront/product-card.tsx`, `src/lib/industry.ts`

**Industry → Archetype mapping:**
- Food Prepared: restaurant, takeaway, cafe, bakery, catering
- Food Fresh: grocery, butchery, liquor, agriculture
- Retail: fashion, electronics, hardware, auto_parts, furniture, stationery, sports, toys, crafts, general_dealer
- Beauty: salon, cosmetics, pharmacy
- Services: cleaning, printing, services, gas_water
- Gifting: flowers, pet

---

## 2026-03-13 — Infrastructure Migration Complete + Email Templates Fixed

### Current State
- **Domain**: `oshicart.com` — LIVE on Vercel
- **Hosting**: Vercel (auto-deploys from GitHub `master`)
- **Database**: Supabase Pro — EU West (Ireland)
- **DNS**: Cloudflare → Vercel (DNS only, no proxy)
- **Email**: Resend account `wazabi007` — domain `send.oshicart.com` VERIFIED
- **SMTP**: Configured in Supabase Auth (smtp.resend.com:465, sender: noreply@send.oshicart.com)
- **Email Templates**: Updated with OTP token (`{{ .Token }}`) — Confirm sign up + Magic link
- **OTP Length**: 6 digits (changed from default 8)
- **Old VPS**: `187.124.15.31` — no longer serving production traffic

### INFRA-10 Progress: Supabase Auth Email Configuration
**Status: COMPLETE — SMTP configured + email templates fixed**

1. [x] SMTP configured in Supabase Auth (smtp.resend.com:465, username: resend)
2. [x] Sender set to `noreply@send.oshicart.com`, sender name: OshiCart
3. [x] Fixed "Confirm sign up" template — added `{{ .Token }}` OTP code
4. [x] Fixed "Magic link" template — added `{{ .Token }}` OTP code
5. [x] Min interval: 60 seconds per user

**Issue found**: Email templates were using default Supabase templates with only `{{ .ConfirmationURL }}` (magic link). No `{{ .Token }}` (OTP code) was included, so users received emails with a login link but no visible OTP code.

### INFRA-09 Progress: Resend Email Setup
**Status: COMPLETE — domain verified in Resend**

1. [x] Logged into Resend (account: wazabi007)
2. [x] Deleted old domains: `octovianexus.com` and `send.octovianexus.com`
3. [x] Added new domain: `send.oshicart.com` (region: eu-west-1 Ireland)
4. [x] Added all 4 DNS records in Cloudflare (DKIM, MX, SPF, DMARC)
5. [x] Fixed MX and SPF record names: `send` → `send.send` (Resend expects `send.send.oshicart.com`)
6. [x] Domain fully verified in Resend (all records: DKIM, MX, SPF)

**DNS records to add in Cloudflare for oshicart.com:**

| # | Type | Name | Content | Priority |
|---|------|------|---------|----------|
| 1 | TXT | `resend._domainkey.send` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDQJ6TyHn8Stk+B0oXtZI9cQdcT62WIdAV76zp+FBDm+yCc7n5R6OYa4ssd8iHejGV6S7NYLfAuTrAdzTaRvjrjuFSESHEhGetcosrliwWfjbG5QbCxpeCQRdclOnvzr3F7juBPyhF4LmvdamZY/Y5bUTb3KGxrATA32P/P0VU1FQIDAQAB` | — |
| 2 | MX | `send.send` | `feedback-smtp.eu-west-1.amazonses.com` | 10 |
| 3 | TXT | `send.send` | `v=spf1 include:amazonses.com ~all` | — |
| 4 | TXT | `_dmarc` | `v=DMARC1; p=none;` | — |

**After DNS verification, Resend SMTP credentials to configure in Supabase Auth:**
- Host: `smtp.resend.com`
- Port: `465`
- Username: `resend`
- Password: (Resend API key — get from Resend dashboard > API Keys)
- Sender: `noreply@send.oshicart.com`

### INFRA-10: Update SMTP Sender
- After INFRA-09 is done, update Supabase Auth SMTP settings in Supabase Dashboard:
  - Go to Authentication > Email Templates > SMTP Settings
  - Enter Resend SMTP credentials
  - Set sender to `noreply@send.oshicart.com`

### TRUST-1 Anti-Fraud Phase 1 — BUILT (Pending Deploy)
- [x] TRUST-03: Store status enum (`pending`/`active`/`suspended`/`banned`)
- [x] TRUST-04: Admin dashboard at `/admin` (stores, reports)
- [x] TRUST-05: Report Store button on storefronts
- [x] TRUST-06: Payment references (`OSHI-XXXXXXXX`)
- [x] TRUST-07: New store limits (10 orders/mo, N$5,000)
- [x] TRUST-08: POP education banner on merchant dashboard
- [x] TRUST-09: Updated Terms of Service
- [ ] TRUST-01: Phone OTP (needs Twilio — deferred)
- [ ] TRUST-02: Email verification (deferred)

**To deploy TRUST-1:**
1. Run `supabase/migrations/011_trust_phase1.sql` in Supabase SQL Editor
2. Add `ADMIN_EMAILS=info@octovianexus.com` in Vercel env vars
3. Push to `master` → Vercel auto-deploys

### Remaining Tasks
- **TRUST-01/02** — OTP + email verification (needs Twilio setup)
- **TRUST-2** — Trust Tier System (Month 2-3)
- **PWA** — Progressive Web App
- **APP** — App Store submission

### Completed (2026-03-13)
1. [x] INFRA-01 through INFRA-10 — full migration + email setup
2. [x] TRUST-03 through TRUST-09 — anti-fraud phase 1 (code complete)

### Environment Variables (Vercel)
```
NEXT_PUBLIC_SUPABASE_URL=https://pcseqiaqeiiaiqxqtfmw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...(anon key)
SUPABASE_SERVICE_ROLE_KEY=eyJ...(service role key)
NEXT_PUBLIC_SITE_URL=https://oshicart.com
ADMIN_EMAILS=info@octovianexus.com
```

### Deploy Process (Current — Vercel)
1. Push to `master` branch on GitHub
2. Vercel auto-deploys
3. For DB changes: run migrations in Supabase SQL Editor

### Cloudflare DNS Dashboard
- URL: `https://dash.cloudflare.com/dce0c92ffafcd2c42959b7382beabce2/oshicart.com/dns/records`
- Current records: 2x A (@ and www → 216.198.79.1), 1x MX (send.send → amazonses), 3x TXT (DKIM @ resend._domainkey.send, SPF @ send.send, DMARC @ _dmarc)

### Resend Dashboard
- URL: `https://resend.com/domains`
- Domain: `send.oshicart.com` (VERIFIED)
