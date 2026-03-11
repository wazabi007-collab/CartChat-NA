# Session State — Active Working Memory

## 2026-03-11 — P1 Features In Progress

### Sync Status
| Location | Commit | Status |
|----------|--------|--------|
| Local | `c79f2e7` + P1 WIP | P1 code in progress (not committed) |
| GitHub | `c79f2e7` | P0 + deploy fix pushed |
| Server | `c79f2e7` | P0 deployed, 24/24 tests passing |

### P0 Features (All Deployed)
All P0 features deployed and verified. See CHANGELOG.md for details.

### P1 Features In Progress

| Feature | Files Created/Modified | Status |
|---------|----------------------|--------|
| Multiple payment methods (COD, MoMo, eWallet) | migration 008, settings, checkout-form, checkout page, orders page | Code ~90% complete |
| Discount/coupon codes | migration 009, coupons page (CRUD), checkout-form, nav | Code ~90% complete |
| place_order v3 RPC | migration 010 (payment_method + coupon validation) | Code complete |
| Invoice updates (discount + delivery fee + payment method) | invoice page | ~70% — select updated, tfoot NOT yet updated |

### What's Done
- **Migration 008** (`008_payment_methods.sql`) — payment_method enum, merchant payment config columns, orders.payment_method
- **Migration 009** (`009_coupons.sql`) — coupons table, RLS, orders.coupon_id + discount_nad
- **Migration 010** (`010_place_order_v3.sql`) — v3 RPC with coupon validation + payment_method (drops old v2)
- **Types** (`database.ts`) — added PaymentMethod, DiscountType, EwalletProvider
- **Constants** (`constants.ts`) — PAYMENT_METHODS, EWALLET_PROVIDERS arrays
- **Settings page** — payment methods checkboxes, MoMo number, eWallet provider/number fields
- **Checkout form** — full rewrite: payment method selector, coupon code input/apply, payment instruction panels per method, updated RPC call, WhatsApp message with payment + discount info
- **Checkout page** — passes new merchant payment props to CheckoutForm
- **Coupons dashboard** (`/dashboard/coupons`) — full CRUD page (create, edit, delete, list)
- **Nav** — added Coupons link with Ticket icon
- **Orders page** — shows payment method badge, total with discount/delivery breakdown

### What's Remaining
- **Invoice page tfoot** — needs discount/delivery fee/total calculation in tfoot (edit was interrupted)
- **Invoice payment details section** — should show payment method-specific info (COD note, MoMo, eWallet)
- **Invoice amount reference** — currently shows subtotal, should show total (subtotal - discount + delivery)
- Test the build locally
- Deploy to server (apply migrations 008-010, rebuild)
- Run E2E tests

### Key Architecture Decisions (P1)
- `payment_method` is a PostgreSQL enum: eft, cod, momo, ewallet
- `accepted_payment_methods` on merchants is text[] (not enum array) for simpler Supabase client handling
- Coupons validated server-side in place_order RPC (FOR UPDATE lock prevents race condition)
- Client sends coupon code, server calculates discount (never trusts client discount amount)
- Coupon codes stored uppercase, input auto-uppercased
- MoMo/eWallet: manual proof-of-payment workflow (no API integration — none available in Namibia)
- COD: no proof upload needed
- Bank of Namibia Instant Payment System expected Q3 2026 — may enable unified wallet API later

### Research Findings (MoMo + eWallet)
- MTC MoMo: NO public API in Namibia (unlike other MTN markets)
- Bank eWallets: FNB eWallet, PayPulse (Standard Bank), EasyWallet (Bank Windhoek), PayToday (Nedbank) — no public e-commerce APIs
- Best aggregator: mPay Namibia (mpay-namibia.com) has REST API — medium-term integration option
- V1 approach: manual payment + proof screenshot (same as existing EFT flow)

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
