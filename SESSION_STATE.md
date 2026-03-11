# Session State — Active Working Memory

## 2026-03-11 — P0 Deployed & Verified

### Sync Status
| Location | Commit | Status |
|----------|--------|--------|
| Local | `cc4c96f` + deploy.sh fix | P0 code + deploy fix |
| GitHub | `cc4c96f` | Pushed (deploy.sh fix not yet pushed) |
| Server | `cc4c96f` | Deployed, migrations applied, 24/24 tests passing |

### P0 Features (All Deployed)

| Feature | Status |
|---------|--------|
| Inventory tracking (stock qty, deduct, restock) | Deployed |
| Industry selection at signup (28 Namibia categories) | Deployed |
| Flat-rate delivery fee | Deployed |
| Storefront stock badges | Deployed |
| Dashboard low stock alerts | Deployed |
| Checkout stock validation + error handling | Deployed |

### Migrations Applied on Server
- `005_inventory_and_industry.sql` — inventory columns, industry, delivery fee, stock_adjustments table
- `006_place_order_v2.sql` — place_order with stock deduction + FOR UPDATE locks (old 11-arg version dropped)
- `007_cancel_restock_trigger.sql` — auto-restock on order cancel

### Deploy Issue Found & Fixed
- `deploy.sh` was using bare `docker compose` (picks up default `docker-compose.yml`)
- This caused Kong to load `docker/kong.yml` with **wrong JWT keys** instead of `docker/kong.prod.yml`
- Symptom: storefront showed "Store Not Found" (401 from Kong → Supabase returned nothing)
- **Fix**: Updated `deploy.sh` to use `docker compose -f docker-compose.prod.yml` everywhere
- **Lesson**: After every deploy, verify Kong keys match app env vars

### Deploy Checklist (for future deploys)
1. `ssh root@187.124.15.31 && cd /opt/oshicart`
2. `git pull origin master`
3. Apply any new migrations: `cat supabase/migrations/XXX.sql | docker compose -f docker-compose.prod.yml exec -T supabase-db psql -U postgres -d postgres`
4. `bash deploy.sh` (uses `docker-compose.prod.yml`)
5. **VERIFY**: `docker exec oshicart-supabase-kong-1 cat /var/lib/kong/kong.yml | head -7` — keys must match `.env`
6. **VERIFY**: `docker compose -f docker-compose.prod.yml exec -T app env | grep SUPABASE` — env vars correct
7. Run E2E tests with full env vars

### Test Env Vars for Production
```
PLAYWRIGHT_BASE_URL=https://oshicart.octovianexus.com
SUPABASE_URL=https://oshicart.octovianexus.com/supabase
NEXT_PUBLIC_SUPABASE_URL=https://oshicart.octovianexus.com/supabase
SUPABASE_SERVICE_ROLE_KEY=eyJ...service_role...F3q5
TEST_MERCHANT_EMAIL=playwright-e2e@oshicart.test
TEST_STORE_SLUG=playwright-test-store
```

### Migration Note
- Migration files are NOT volume-mounted in the DB container (only 001 and 002 are)
- Apply new migrations via: `cat supabase/migrations/XXX.sql | docker compose -f docker-compose.prod.yml exec -T supabase-db psql -U postgres -d postgres`
- Do NOT use `-f /migrations/XXX.sql` inside the container — file won't exist

### Pending
- Push `deploy.sh` fix to GitHub
- P1 features: discount codes, COD, customer list, variants, payment gateway
