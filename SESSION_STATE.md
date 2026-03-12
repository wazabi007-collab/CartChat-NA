# Session State — Active Working Memory

## 2026-03-12 — Domain Migration + Infrastructure Planning

### Current State
- **Domain**: `oshicart.com` — LIVE (Cloudflare proxied, SSL Full)
- **Old domain**: `oshicart.octovianexus.com` — DISABLED (nginx config removed)
- **Hero**: Updated with new merchant image, mobile-optimized
- **All sessions 1-8 work**: committed and deployed

### Sync Status
| Location | Commit | Status |
|----------|--------|--------|
| Local | `9ce5676` | Domain migration committed |
| GitHub | `9ce5676` | All pushed |
| Server | `9ce5676` | Deployed, running on oshicart.com |

### Next Session (2026-03-13): Supabase Pro + Vercel Migration

**Goal**: Move from self-hosted Supabase + VPS to managed Supabase Pro + Vercel

**Steps**:
1. Create Supabase Pro project (pick region closest to Namibia — EU West or similar)
2. Run all migrations (001-010) against new DB
3. Migrate existing data (5 merchants + products/orders) via pg_dump/restore
4. Move product images to Supabase Storage
5. Connect GitHub repo to Vercel, set env vars
6. Deploy to Vercel preview URL and test everything
7. Swap Cloudflare DNS from VPS (187.124.15.31) to Vercel
8. Verify: auth, signup, checkout, dashboard, images, WhatsApp links
9. VPS becomes dev/staging only

**Cost**: ~$46/mo (Supabase Pro $25 + Vercel Pro $20 + domain ~$1)

### Known TODO
- Update SMTP sender from `noreply@send.octovianexus.com` to `noreply@send.oshicart.com` (requires Resend domain setup)
- Set up `send.oshicart.com` on Resend with DKIM/SPF records in Cloudflare

### Test Env Vars (updated for new domain)
```
PLAYWRIGHT_BASE_URL=https://oshicart.com
SUPABASE_URL=https://oshicart.com/supabase
NEXT_PUBLIC_SUPABASE_URL=https://oshicart.com/supabase
SUPABASE_SERVICE_ROLE_KEY=eyJ...service_role...F3q5
TEST_MERCHANT_EMAIL=playwright-e2e@oshicart.test
TEST_STORE_SLUG=playwright-test-store
```

### Deploy Checklist (current — pre-Vercel)
1. `ssh root@187.124.15.31 && cd /opt/oshicart`
2. `git pull origin master`
3. Apply any new migrations: `cat supabase/migrations/XXX.sql | docker compose -f docker-compose.prod.yml exec -T supabase-db psql -U postgres -d postgres`
4. `docker compose -f docker-compose.prod.yml build app && docker compose -f docker-compose.prod.yml up -d app`
5. **VERIFY**: Kong keys match `.env`, env vars correct
