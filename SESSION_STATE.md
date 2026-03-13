# Session State — Active Working Memory

## 2026-03-13 — Admin Dashboard Design & Plan Complete

### CURRENT STATUS: Ready to Implement Admin Dashboard

**Design spec:** `docs/superpowers/specs/2026-03-13-admin-dashboard-design.md` (APPROVED)
**Implementation plan:** `docs/superpowers/plans/2026-03-13-admin-dashboard.md` (APPROVED)

### What Was Done This Session
1. Investigated production readiness for 1000+ clients (score: 6.5/10)
2. Designed full admin dashboard through collaborative brainstorming
3. Wrote and reviewed design spec (passed code review with all fixes applied)
4. Wrote and reviewed implementation plan (33 tasks, 6 chunks — all critical issues fixed)

### Resume Instructions
To continue, execute the implementation plan at `docs/superpowers/plans/2026-03-13-admin-dashboard.md`.
- Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` skill
- Start from **Chunk 1, Task 1** (install recharts)
- Migration 011 is already deployed to production (confirmed via QA cycle)
- Migration 012 is in the plan (not yet written as a file)

### New Pricing Tiers (Replaces Old Free/Pro/Business)

| Tier | Price | Products | Orders/mo | Key Differentiator |
|------|-------|----------|-----------|-------------------|
| Oshi-Start | N$0 (30-day trial) | 10 | 20 | Full experience, OshiCart branding |
| Oshi-Basic | N$199/mo | 30 | 200 | No branding |
| Oshi-Grow | N$499/mo | 200 | 500 | + Inventory, coupons |
| Oshi-Pro | N$1,200/mo | Unlimited | Unlimited | + Priority support |

### Subscription Lifecycle
```
Trial (30 days) → Grace (7 days) → Soft Suspend → Hard Suspend (after 30 days)
Payment at any point → Active
```

### Admin Roles
- Super Admin: full control (you)
- Support: view merchants, resolve reports, no billing/team
- Finance: billing + payments, no moderation/team

### Key Design Decisions
- Manual payment recording now, gateway later
- No permanent free tier — trial only, must upgrade
- `tier_limits` DB table as single source of truth (SQL + TypeScript)
- Existing merchants get fresh 30-day trial from migration date
- `place_order` v5 preserves exact v4 signature, adds subscription/tier checks
- Vercel Cron for daily subscription expiry checks (CRON_SECRET auth)

### Files Created This Session
- `docs/superpowers/specs/2026-03-13-admin-dashboard-design.md` — full design spec
- `docs/superpowers/plans/2026-03-13-admin-dashboard.md` — 33-task implementation plan

### Implementation Plan Summary (33 Tasks, 6 Chunks)
| Chunk | Tasks | Description |
|-------|-------|-------------|
| 1 | 1-6 | Database migration, libraries, vercel.json, cron endpoint |
| 2 | 7-11 | Reusable components (stat-card, role-guard, charts, nav, layout) |
| 3 | 12-15 | API routes (merchants, billing, team, subscriptions) |
| 4 | 16-23 | Admin pages (overview, merchants, billing, analytics, reports, team, audit) |
| 5 | 24-31 | Merchant-side enforcement (banners, limits, checkout guard, signup, pricing) |
| 6 | 32-33 | Build verification and deployment |

---

## Previous State (2026-03-13)

### QA Cycle 1 — TRUST Phase 1 Validated
- 30/30 tests PASS
- BUG-009 hotfix applied (legacy RLS policy bypass)
- TRUST Phase 1 deployed and validated

### Current Infrastructure
- **Domain**: `oshicart.com` — LIVE on Vercel
- **Hosting**: Vercel (auto-deploys from GitHub `master`)
- **Database**: Supabase Pro — EU West (Ireland)
- **DNS**: Cloudflare → Vercel (DNS only, no proxy)
- **Email**: Resend SMTP via `send.oshicart.com` (VERIFIED)
- **ADMIN_EMAILS**: `info@octovianexus.com` in Vercel env vars

### Environment Variables (Vercel)
```
NEXT_PUBLIC_SUPABASE_URL=https://pcseqiaqeiiaiqxqtfmw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...(anon key)
SUPABASE_SERVICE_ROLE_KEY=eyJ...(service role key)
NEXT_PUBLIC_SITE_URL=https://oshicart.com
ADMIN_EMAILS=info@octovianexus.com
```
**To add for admin dashboard deploy:**
```
CRON_SECRET=<generate random 32-char string>
```

### Deploy Process
1. Push to `master` → Vercel auto-deploys
2. DB changes: run migrations in Supabase SQL Editor
