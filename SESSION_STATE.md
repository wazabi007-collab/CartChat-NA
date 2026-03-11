# Session State — Active Working Memory

## 2026-03-11 — P1 Deployed + Branding

### Sync Status
| Location | Commit | Status |
|----------|--------|--------|
| Local | `ca7a7ff` | P1 deployed + logo |
| GitHub | `ca7a7ff` | All pushed |
| Server | `ca7a7ff` | P1 + logo deployed, 24/24 tests passing |

### P0 Features (All Deployed)
All P0 features deployed and verified. See CHANGELOG.md for details.

### P1 Features (All Deployed)

| Feature | Files Created/Modified | Status |
|---------|----------------------|--------|
| Multiple payment methods (COD, MoMo, eWallet) | migration 008, settings, checkout-form, checkout page, orders page | Deployed |
| Discount/coupon codes | migration 009, coupons page (CRUD), checkout-form, nav | Deployed |
| place_order v3 RPC | migration 010 (payment_method + coupon validation) | Deployed |
| Invoice updates (discount + delivery fee + payment method) | invoice page | Deployed |
| OshiCart SVG logo + favicon | logo.svg, icon.svg, 6 pages updated | Deployed |

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
- Write E2E tests for new payment methods + coupons
- GAP-006: Customer list + order history (UI only, data exists)
- GAP-007: Product variants (size/color)
- GAP-008: Payment gateway (PayToday/PayFast)

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
