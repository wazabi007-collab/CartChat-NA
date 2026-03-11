# Session State — Active Working Memory

## 2026-03-11 — P0 Implementation Complete, Pending Deploy

### Sync Status
| Location | Commit | Status |
|----------|--------|--------|
| Local | `66dfbb6` | P0 code committed |
| GitHub | `66dfbb6` | Pushed |
| Server | `3472351` | Behind — needs pull + migrations + rebuild |

### P0 Features Built (commit `66dfbb6`)

| Feature | Files Changed | Status |
|---------|--------------|--------|
| Inventory tracking (stock qty, deduct, restock) | migrations 005-007, product forms, products list | Code complete |
| Industry selection at signup (28 Namibia categories) | constants.ts, setup page | Code complete |
| Flat-rate delivery fee | settings, checkout-form, checkout page | Code complete |
| Storefront stock badges | product-card.tsx, storefront pages | Code complete |
| Dashboard low stock alerts | dashboard page | Code complete |
| Checkout stock validation + error handling | checkout-form.tsx | Code complete |

### Migrations to Apply on Deploy
```bash
# SSH to server, then:
cd /opt/oshicart && git pull origin master
docker compose -f docker-compose.prod.yml exec supabase-db psql -U postgres -d postgres -f /migrations/005_inventory_and_industry.sql
docker compose -f docker-compose.prod.yml exec supabase-db psql -U postgres -d postgres -f /migrations/006_place_order_v2.sql
docker compose -f docker-compose.prod.yml exec supabase-db psql -U postgres -d postgres -f /migrations/007_cancel_restock_trigger.sql
bash deploy.sh
```

### Key Architecture Decisions
- Stock deducted on order creation (not confirmation) — prevents overselling
- PostgreSQL `FOR UPDATE` row locks for concurrency safety
- `restock_on_cancel()` trigger auto-restocks when order cancelled
- `stock_adjustments` audit table tracks every stock change
- Delivery fee stored as snapshot on orders (not recalculated)

### Planning Docs Created
- `GAP_ANALYSIS.md` — 70-feature OshiCart vs TakeApp comparison
- `INDUSTRY_DROPDOWN_NA.md` — 28 Namibia industries + personalization spec
- `INVENTORY_SPEC.md` — Full stock system spec
- `IMPLEMENTATION_TASKS.md` — P0 (7-day) + P1 (30-day) checklist
- `MIGRATION_PLAN.md` — SQL migrations + deployment steps + rollback

### Previous Session: All Bugs Fixed & Deployed
24/24 E2E tests passing. BUG-001 through BUG-005 all resolved.

### Test Env Vars for Production
```
PLAYWRIGHT_BASE_URL=https://oshicart.octovianexus.com
SUPABASE_URL=https://oshicart.octovianexus.com/supabase
NEXT_PUBLIC_SUPABASE_URL=https://oshicart.octovianexus.com/supabase
SUPABASE_SERVICE_ROLE_KEY=eyJ...service_role...F3q5
TEST_MERCHANT_EMAIL=playwright-e2e@oshicart.test
TEST_STORE_SLUG=playwright-test-store
```

### Pending
- Deploy P0 to production (pull + migrations + rebuild)
- Run E2E tests after deploy to verify no regressions
- P1 features: discount codes, COD, customer list, variants, payment gateway
