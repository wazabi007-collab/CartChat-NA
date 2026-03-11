# Session State — Active Working Memory

## 2026-03-11 — All Bugs Fixed, Deployed, Verified

### Test Results: 24/24 PASS
All E2E tests green against production `https://oshicart.octovianexus.com`.

### All Systems In Sync
| Location | Commit | Status |
|----------|--------|--------|
| Local | `d06b0d3` | In sync |
| GitHub | `d06b0d3` | In sync |
| Server | `d06b0d3` | In sync |

### Bugs Fixed & Deployed This Session

| Bug | Root Cause | Fix | Status |
|-----|-----------|-----|--------|
| BUG-001: Checkout fails | `JSON.stringify()` on p_items | Removed stringify | Deployed |
| BUG-002: Auth cookie name | Wrong cookie name `supabase.auth.token` | Compute `sb-oshicart-auth-token` dynamically | Deployed |
| BUG-003: Kong key mismatch | Stale JWT keys in kong.prod.yml | Synced with server .env | Deployed |
| BUG-004: Images 401 | Kong required apikey for public storage | Added open route for `/storage/v1/object/public/` | Deployed |
| BUG-005: OTP expires too fast | Default 60s expiry | Set `GOTRUE_MAILER_OTP_EXP=300` + `GOTRUE_SMS_OTP_EXP=300` | Deployed |
| Deploy script wrong compose | Used dev compose instead of prod | Fixed `deploy.sh` to use `-f docker-compose.prod.yml` | Fixed on server |
| Login page missing OTP timer | No countdown or resend button | Added 5-min countdown + resend button | Deployed |
| GitHub Actions deploy failing | Missing SSH key secret | Removed workflow — manual deploys only | Done |

### Test Env Vars for Production
```
PLAYWRIGHT_BASE_URL=https://oshicart.octovianexus.com
SUPABASE_URL=https://oshicart.octovianexus.com/supabase
NEXT_PUBLIC_SUPABASE_URL=https://oshicart.octovianexus.com/supabase
SUPABASE_SERVICE_ROLE_KEY=eyJ...service_role...F3q5
TEST_MERCHANT_EMAIL=playwright-e2e@oshicart.test
TEST_STORE_SLUG=playwright-test-store
```

### Current Work: Feature Gap Analysis & P0 Planning (2026-03-11)

**Completed**: Full competitive gap analysis (OshiCart vs TakeApp)

**Deliverables Created**:
- `GAP_ANALYSIS.md` — 70-feature comparison table with priority, impact, complexity
- `INDUSTRY_DROPDOWN_NA.md` — 28 Namibia industries + personalization defaults
- `INVENTORY_SPEC.md` — Full stock tracking system spec (deduction, restock, concurrency)
- `IMPLEMENTATION_TASKS.md` — Checklist: 11 P0 tasks (7-day), 6 P1 tasks (30-day)
- `MIGRATION_PLAN.md` — 3 SQL migrations (005, 006, 007) + deployment steps

**P0 Features (Ship in 7 Days)**:
1. Stock quantity tracking + auto-deduct on order
2. Industry selection at signup (28 Namibia categories)
3. Flat-rate delivery fee
4. Storefront stock badges + checkout validation
5. Cancel order → auto restock

**P1 Features (Ship in 30 Days)**:
1. Discount/coupon codes
2. Cash on delivery
3. Customer list + order history
4. Product variants
5. Payment gateway (PayToday/PayFast)

**Key Decision**: Stock deducted on order creation (not confirmation) to prevent overselling. Uses PostgreSQL FOR UPDATE row locks for concurrency.

### Pending: Approval to Begin Implementation
