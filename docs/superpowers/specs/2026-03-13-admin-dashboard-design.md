# OshiCart Admin Dashboard — Full Design Spec

**Date:** 2026-03-13
**Status:** Approved
**Author:** Claude + Elton

---

## 1. Overview

Build a comprehensive admin dashboard for OshiCart that enables the platform owner to monitor all merchant accounts, track platform revenue, manage subscriptions, control store access based on payment status, and moderate the marketplace — with role-based access for team members.

### Architecture Decision

**Extend the existing `/admin` route group** within the current Next.js app. No separate app or domain. Reuses existing auth guard, service client, and admin nav patterns.

### Key Design Decisions

- **Manual payment recording** for now (admin logs when merchant pays via EFT/cash/MoMo), designed to support future payment gateway integration
- **No permanent free tier** — Oshi-Start is a 30-day trial only
- **Role-based admin access** with 3 roles: Super Admin, Support, Finance
- **Subscription lifecycle:** trial → active → grace (7 days) → soft suspend → hard suspend (after 30 days)
- **Tier limits enforced server-side** in `place_order` RPC and product creation

---

## 2. Pricing Tiers

| Tier | Price | Products | Orders/mo | Inventory | Coupons | Branding | Notes |
|------|-------|----------|-----------|-----------|---------|----------|-------|
| **Oshi-Start** | N$0 (30-day trial) | 10 | 20 | No | No | OshiCart branding | Full feature experience: all payment methods, dashboard, analytics |
| **Oshi-Basic** | N$199/mo | 30 | 200 | No | No | No branding | Clean professional storefront |
| **Oshi-Grow** | N$499/mo | 200 | 500 | Yes | Yes | No branding | Inventory management + discount codes |
| **Oshi-Pro** | N$1,200/mo | Unlimited | Unlimited | Yes | Yes | No branding | Priority support, first access to new features |

### Feature Access by Tier

| Feature | Start | Basic | Grow | Pro |
|---------|:-----:|:-----:|:----:|:---:|
| All payment methods (EFT/COD/MoMo/eWallet) | Yes | Yes | Yes | Yes |
| Order management dashboard | Yes | Yes | Yes | Yes |
| Sales analytics | Yes | Yes | Yes | Yes |
| WhatsApp order notifications | Yes | Yes | Yes | Yes |
| OshiCart branding removed | No | Yes | Yes | Yes |
| Inventory tracking (auto stock deduction) | No | No | Yes | Yes |
| Discount/coupon codes | No | No | Yes | Yes |
| Priority support | No | No | No | Yes |
| Early access to new features | No | No | No | Yes |

---

## 3. Database Schema

### New Enum Types

```sql
CREATE TYPE subscription_tier AS ENUM ('oshi_start', 'oshi_basic', 'oshi_grow', 'oshi_pro');
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'grace', 'soft_suspended', 'hard_suspended');
CREATE TYPE admin_role AS ENUM ('super_admin', 'support', 'finance');

-- Clean up old enum (after dropping merchants.tier column)
DROP TYPE IF EXISTS merchant_tier;
```

> **Note:** The `cancelled` status was removed — there is no cancellation flow in V1. If needed later, add it with a migration.

### New Tables

#### `admin_users` — Role-based admin access

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | DEFAULT gen_random_uuid() |
| user_id | UUID FK → auth.users | UNIQUE |
| email | TEXT NOT NULL | |
| role | admin_role NOT NULL | |
| created_by | UUID FK → admin_users | Nullable, ON DELETE SET NULL (first admin is self-created) |
| created_at | TIMESTAMPTZ | DEFAULT now() |

#### `subscriptions` — Merchant billing state

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | DEFAULT gen_random_uuid() |
| merchant_id | UUID FK → merchants | UNIQUE (one active sub per merchant) |
| tier | subscription_tier | DEFAULT 'oshi_start' |
| status | subscription_status | DEFAULT 'trial' |
| trial_ends_at | TIMESTAMPTZ | Signup + 30 days |
| current_period_start | TIMESTAMPTZ | Set when payment recorded |
| current_period_end | TIMESTAMPTZ | period_start + 30 days |
| grace_ends_at | TIMESTAMPTZ | period_end + 7 days |
| soft_suspended_at | TIMESTAMPTZ | When soft suspend started (for 30-day countdown) |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| updated_at | TIMESTAMPTZ | DEFAULT now() (with `update_updated_at()` trigger) |

#### `payments` — Ledger of all payments received

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | DEFAULT gen_random_uuid() |
| merchant_id | UUID FK → merchants | |
| subscription_id | UUID FK → subscriptions | |
| amount_nad | INTEGER NOT NULL | Cents |
| payment_method | TEXT NOT NULL | eft, momo, ewallet, cash, gateway |
| reference | TEXT | Bank ref, MoMo ref, etc. |
| notes | TEXT | Admin notes |
| recorded_by | UUID FK → admin_users | |
| period_start | DATE NOT NULL | Which month this covers |
| period_end | DATE NOT NULL | |
| voided_at | TIMESTAMPTZ | NULL — set if payment is voided/corrected |
| created_at | TIMESTAMPTZ | DEFAULT now() |

> **Payments are immutable.** Corrections should be made by voiding the original (set `voided_at`) and creating a new adjustment entry, not by deleting rows.

#### `admin_actions` — Full audit trail

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | DEFAULT gen_random_uuid() |
| admin_user_id | UUID FK → admin_users | |
| action | TEXT NOT NULL | approve_store, suspend_store, record_payment, change_tier, etc. |
| target_type | TEXT NOT NULL | merchant, subscription, report |
| target_id | UUID NOT NULL | |
| details | JSONB | { before: {...}, after: {...}, reason: "..." } |
| created_at | TIMESTAMPTZ | DEFAULT now() |

#### `tier_limits` — Single source of truth for tier enforcement (used by both SQL and TypeScript)

| Column | Type | Notes |
|--------|------|-------|
| tier | subscription_tier PK | |
| max_products | INTEGER NOT NULL | -1 = unlimited |
| max_orders_per_month | INTEGER NOT NULL | -1 = unlimited |
| has_inventory | BOOLEAN NOT NULL | DEFAULT false |
| has_coupons | BOOLEAN NOT NULL | DEFAULT false |
| has_branding | BOOLEAN NOT NULL | DEFAULT true (OshiCart branding shown) |
| price_nad | INTEGER NOT NULL | Monthly price in cents |

Seeded with:
```sql
INSERT INTO tier_limits VALUES
  ('oshi_start', 10,  20,  false, false, true,  0),
  ('oshi_basic', 30,  200, false, false, false, 19900),
  ('oshi_grow',  200, 500, true,  true,  false, 49900),
  ('oshi_pro',   -1,  -1,  true,  true,  false, 120000);
```

> **Why a table instead of just TypeScript constants?** The `place_order` RPC runs as a PostgreSQL function (SECURITY DEFINER) and cannot access TypeScript. A DB table is the single source of truth that both SQL functions and the app read from. The TypeScript `TIER_LIMITS` constant is derived from this table at build time or fetched at runtime.

### Changes to Existing Tables

#### `merchants` — Modifications

```sql
-- Remove old tier column (tier now lives on subscriptions table)
ALTER TABLE merchants DROP COLUMN tier;

-- Add suspension reason tracking
ALTER TABLE merchants ADD COLUMN suspended_reason TEXT;
-- Values: non_payment, fraud, reports, manual
```

### Foreign Key Cascade Behavior

| FK | On Delete |
|----|-----------|
| subscriptions.merchant_id → merchants | CASCADE (merchant deleted = subscription deleted) |
| payments.merchant_id → merchants | RESTRICT (cannot delete merchant with payment history) |
| payments.subscription_id → subscriptions | SET NULL |
| payments.recorded_by → admin_users | SET NULL |
| admin_actions.admin_user_id → admin_users | SET NULL |
| admin_users.created_by → admin_users | SET NULL |

### Indexes

```sql
CREATE INDEX idx_subscriptions_merchant ON subscriptions(merchant_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_period_end ON subscriptions(current_period_end);
CREATE INDEX idx_payments_merchant ON payments(merchant_id);
CREATE INDEX idx_payments_created ON payments(created_at);
CREATE INDEX idx_admin_actions_created ON admin_actions(created_at);
CREATE INDEX idx_admin_actions_target ON admin_actions(target_type, target_id);
CREATE INDEX idx_admin_users_user_id ON admin_users(user_id);

-- Partial indexes for cron job performance
CREATE INDEX idx_subscriptions_grace ON subscriptions(grace_ends_at) WHERE status = 'grace';
CREATE INDEX idx_subscriptions_soft_suspended ON subscriptions(soft_suspended_at) WHERE status = 'soft_suspended';
```

### RLS Policies

| Table | Policy | Access |
|-------|--------|--------|
| admin_users | All operations | service_role only |
| subscriptions | SELECT own | Merchant can read their own subscription |
| subscriptions | All operations | service_role full access |
| payments | SELECT own | Merchant can read their own payments |
| payments | INSERT/UPDATE | service_role only |
| admin_actions | All operations | service_role only |

### Tier Limits (TypeScript Mirror)

The `tier_limits` DB table is the source of truth (see above). The TypeScript helper in `src/lib/tier-limits.ts` fetches from the DB at runtime or provides a static fallback:

```typescript
// Static fallback (must match tier_limits table)
export const TIER_LIMITS = {
  oshi_start: { products: 10,  orders_per_month: 20,  inventory: false, coupons: false, branding: true,  price_nad: 0 },
  oshi_basic: { products: 30,  orders_per_month: 200, inventory: false, coupons: false, branding: false, price_nad: 19900 },
  oshi_grow:  { products: 200, orders_per_month: 500, inventory: true,  coupons: true,  branding: false, price_nad: 49900 },
  oshi_pro:   { products: -1,  orders_per_month: -1,  inventory: true,  coupons: true,  branding: false, price_nad: 120000 },
  // -1 = unlimited, price in cents
};
```

---

## 4. Admin Pages & Navigation

### Sidebar Navigation

```
OSHI ADMIN
─────────────────
Overview          /admin
Merchants         /admin/merchants
Billing           /admin/billing
Analytics         /admin/analytics
Reports           /admin/reports
Admin Team        /admin/team        (super_admin only)
Audit Log         /admin/audit       (super_admin only)
─────────────────
Back to Dashboard
Sign Out
```

### Page Specifications

#### 4.1 Overview (`/admin`)

**Purpose:** Command center — everything at a glance.

**Top row — 6 stat cards:**
- MRR (Monthly Recurring Revenue)
- Total Active Merchants (with tier breakdown tooltip)
- New Signups This Week
- Pending Approvals
- Overdue Payments
- Open Reports

**Middle row — 2 charts:**
- Revenue trend (last 6 months, bar chart)
- Signups trend (last 6 months, line chart)

**Bottom row — 3 lists:**
- Expiring trials (next 7 days) — name, days left, "Remind" action
- Overdue subscriptions — name, days overdue, amount owed, "Record Payment" action
- Recent activity feed — last 20 admin actions (who did what, when)

#### 4.2 Merchants (`/admin/merchants`)

**Purpose:** View and manage all merchants on the platform.

**Table columns:** Name, Tier, Status, Subscription Status, Orders (this month), Revenue (all time), Subscription End Date, Days Active

**Filters:** By tier, by store status, by subscription status (trial/active/grace/suspended)

**Search:** By name, slug, email, WhatsApp number

**Row click:** Navigate to Merchant Detail page

#### 4.3 Merchant Detail (`/admin/merchants/[id]`)

**Purpose:** Complete profile and management for a single merchant.

**Header:** Store name, status badge, tier badge, quick action buttons (Change Tier, Record Payment, Suspend, Ban)

**Tabs:**
- **Overview:** Store info (name, slug, industry, WhatsApp, bank details, signup date)
- **Subscription:** Current tier, status, payment history, next renewal date, upgrade/downgrade buttons
- **Performance:** Orders this month, total revenue, product count, orders-over-time chart
- **Products:** Read-only list of merchant's products
- **Orders:** Read-only list of merchant's orders
- **Activity:** Timeline of all events (signup, approvals, payments, suspensions, tier changes)

#### 4.4 Billing (`/admin/billing`)

**Purpose:** Track and manage all platform revenue.

**Top row — 4 stat cards:**
- MRR (current)
- Total Revenue (all time)
- Outstanding / Overdue
- Collected This Month

**"Record Payment" button** → Modal:
- Select merchant (searchable dropdown)
- Amount (auto-filled based on tier)
- Payment method (EFT, MoMo, eWallet, Cash)
- Reference number
- Period covered (month)
- Notes

**Payments table:** All payments, filterable by month, merchant, method, with export capability

**Overdue list:** Merchants past renewal date, sorted by days overdue

**Expiring soon:** Trials and subscriptions ending in next 14 days

#### 4.5 Analytics (`/admin/analytics`)

**Purpose:** Platform-wide performance metrics.

**Charts and metrics:**
- Revenue by month (stacked bar by tier)
- Merchant growth (signups vs churn, net growth line)
- Platform GMV (Gross Merchandise Value — total order value across all stores)
- Order volume (daily/weekly/monthly toggle)
- Tier distribution (pie chart)
- Industry breakdown (horizontal bar chart)
- Payment method breakdown (pie chart — across all stores)
- Top 10 merchants by orders and by revenue (tables)

#### 4.6 Reports (`/admin/reports`)

**Purpose:** Customer reports and moderation. Extends existing reports page.

**Enhancements over current:**
- Resolution tracking (what action was taken)
- Link to merchant detail page from each report
- Report count badge in nav

#### 4.7 Admin Team (`/admin/team`) — Super Admin Only

**Purpose:** Manage who has admin access and what they can do.

- List current admins: email, role, date added, added by
- "Invite Admin" button → modal (email + role picker)
- Change role dropdown
- Remove admin button (cannot remove self)

#### 4.8 Audit Log (`/admin/audit`) — Super Admin Only

**Purpose:** Full accountability trail.

- Chronological list of all admin actions
- Filter by: admin user, action type, date range, target merchant
- Each entry shows: who, what action, target, timestamp, details (expandable JSON)

### Role Permissions Matrix

| Page | Super Admin | Support | Finance |
|------|:-----------:|:-------:|:-------:|
| Overview | Full | Full | Revenue cards only |
| Merchants | Full + suspend/ban | View + view detail | View only |
| Merchant Detail | All tabs + actions | All tabs, no actions | Subscription tab only |
| Billing | Full | View only | Full |
| Analytics | Full | Full | Revenue metrics only |
| Reports | Full + suspend store | Resolve reports only (mark reviewed/dismissed, no store actions) | View only |
| Admin Team | Full | Hidden | Hidden |
| Audit Log | Full | Hidden | Hidden |

---

## 5. Subscription Lifecycle & Enforcement

### Lifecycle State Machine

```
SIGNUP
  → tier: oshi_start, status: trial
  → trial_ends_at: signup + 30 days
  → Full access within tier limits

TRIAL EXPIRES (day 31)
  → status: grace
  → grace_ends_at: trial_ends_at + 7 days
  → Warning banner on merchant dashboard
  → Store still works fully

GRACE EXPIRES (day 38)
  → status: soft_suspended
  → soft_suspended_at: now()
  → Storefront: visible, browse products, checkout DISABLED
  → Dashboard: READ-ONLY, all edits blocked
  → Persistent "Renew" banner with payment instructions

SOFT SUSPEND + 30 DAYS (day 68)
  → status: hard_suspended
  → merchants.store_status: 'suspended'
  → Storefront: OFFLINE ("Store unavailable")
  → Dashboard: single "Contact support" page

PAYMENT RECEIVED (at any point)
  → Admin records payment in billing
  → status: active
  → tier: paid tier selected
  → current_period_end: payment date + 30 days
  → Store fully unlocked immediately
```

### Renewal Cycle (Paid Merchants)

```
Payment recorded → status: active
  → current_period_end: payment + 30 days

7 days before expiry:
  → Dashboard warning: "Subscription renews in X days"

Period ends, no payment:
  → status: grace (7 days) → soft_suspended → hard_suspended
  → Same flow as trial expiry
```

### Feature Enforcement

#### Product Limits
Enforced on product creation (`/dashboard/products/new`):
- Count existing products for merchant
- Compare against `TIER_LIMITS[tier].products`
- If at limit → block with "Upgrade to add more products" message
- `-1` (unlimited) bypasses check

#### Order Limits
Enforced in `place_order` RPC:
- Count merchant's orders in current calendar month
- Compare against `TIER_LIMITS[tier].orders_per_month`
- If at limit → reject: "This store has reached its monthly order limit"
- `-1` (unlimited) bypasses check

#### Inventory & Coupons (Tier-Gated)
- **Oshi-Start / Oshi-Basic:** Inventory tracking hidden (product forms don't show stock fields), coupons page hidden from nav, `place_order` ignores coupon codes
- **Oshi-Grow / Oshi-Pro:** Full inventory + coupon access

#### OshiCart Branding
- **Oshi-Start:** "Powered by OshiCart" footer on public storefront
- **All paid tiers:** No branding

### Soft Suspend Behavior

**Public storefront (`/s/[slug]`):**
- Products visible, prices visible, images visible
- "Add to Cart" → message: "This store is temporarily unavailable for orders"
- Checkout page inaccessible

**Merchant dashboard:**
- All pages show data in read-only mode
- All create/edit/delete buttons disabled
- All settings locked
- Persistent top banner: "Your subscription has expired. Renew to continue accepting orders."
- "Renew Now" button shows payment instructions (admin's bank details, MoMo, etc.)

### Hard Suspend Behavior

**Public storefront:** Redirect to page: "This store is currently unavailable"
**Merchant dashboard:** Single page: "Your store has been suspended. Contact support@oshicart.com to reactivate."

### Billing Cycle Note

Subscription periods use **rolling 30-day cycles** (payment date + 30 days), not calendar months. This means a payment on Jan 15 expires Feb 14, next payment expires Mar 16, etc. This is simpler to implement and standard for SaaS billing. The `payments.period_start/end` DATE fields are for admin reference ("which month does this cover") and do not drive enforcement — `subscriptions.current_period_end` does.

### Automated Jobs (Daily Cron)

**`check_expired_subscriptions`** — runs daily at 00:00 UTC:
1. `trial` past `trial_ends_at` → set `status: grace`, `grace_ends_at: trial_ends_at + 7 days`
2. `active` past `current_period_end` → set `status: grace`, `grace_ends_at: current_period_end + 7 days`
3. `grace` past `grace_ends_at` → set `status: soft_suspended`, `soft_suspended_at: now()`
4. `soft_suspended` where `soft_suspended_at + 30 days < now()` → set `status: hard_suspended`, update `merchants.store_status: 'suspended'`, `merchants.suspended_reason: 'non_payment'`

---

## 6. Migration Strategy

### Migration 012: Admin Dashboard Schema

Single migration file `supabase/migrations/012_admin_dashboard.sql` containing:
1. New enum types (subscription_tier, subscription_status, admin_role)
2. New tables (admin_users, subscriptions, payments, admin_actions, tier_limits)
3. Seed tier_limits rows
4. Indexes (including partial indexes for cron)
5. RLS policies
6. FK cascade behaviors
7. `updated_at` trigger on subscriptions
8. Drop old `tier` column + `merchant_tier` type from merchants, add `suspended_reason`
9. Backfill existing merchants (see below)
10. Seed first super_admin (see below)
11. Updated `place_order` RPC with tier enforcement (joins tier_limits table)
12. Cron job function for subscription expiry checks

### Existing Merchant Backfill (CRITICAL)

All existing merchants get a **fresh 30-day trial from migration date** — not from their original signup. This prevents immediately suspending live stores:

```sql
INSERT INTO subscriptions (merchant_id, tier, status, trial_ends_at)
SELECT id, 'oshi_start', 'trial', now() + interval '30 days'
FROM merchants;
```

This gives you 30 days to communicate the new pricing to existing merchants before any enforcement kicks in.

### Admin Bootstrap

The first super_admin is seeded from a hardcoded email (your email) to solve the chicken-and-egg problem. The `ADMIN_EMAILS` env var is kept as a **fallback** in the layout auth check during the transition period, then removed once admin_users is verified working:

```sql
INSERT INTO admin_users (user_id, email, role)
SELECT id, email, 'super_admin'
FROM auth.users
WHERE lower(email) = 'info@octovianexus.com'
ON CONFLICT DO NOTHING;
```

### Dependency: Migration 011

Migration 011 (TRUST Phase 1) must be run first — it adds `store_status` enum and `reports` table that the admin dashboard depends on.

Deploy order:
1. Run migration 011 in Supabase SQL Editor
2. Run migration 012 in Supabase SQL Editor
3. Set `ADMIN_EMAILS` env var in Vercel
4. Push code to master → auto-deploy

---

## 7. Tech Stack Additions

- **Charts:** Recharts (lightweight, React-native, already compatible with Next.js)
- **Date handling:** Native `Date` + `Intl.DateTimeFormat` (no new dependency)
- **Cron:** Vercel Cron Jobs (free tier includes daily crons) OR Supabase pg_cron
- **Cron security:** The `/api/cron/check-subscriptions` endpoint must validate `Authorization: Bearer ${CRON_SECRET}` header and return 401 if missing/invalid. Add `CRON_SECRET` to Vercel env vars. Configure in `vercel.json` under `crons` field.

---

## 8. Files to Create/Modify

### New Files

**Admin Pages:**
- `src/app/(admin)/admin/page.tsx` — Enhanced overview (replace existing)
- `src/app/(admin)/admin/merchants/page.tsx` — Merchant list (replace existing stores)
- `src/app/(admin)/admin/merchants/[id]/page.tsx` — Merchant detail
- `src/app/(admin)/admin/billing/page.tsx` — Billing & payments
- `src/app/(admin)/admin/billing/record-payment-modal.tsx` — Payment recording modal
- `src/app/(admin)/admin/analytics/page.tsx` — Platform analytics
- `src/app/(admin)/admin/team/page.tsx` — Admin team management
- `src/app/(admin)/admin/audit/page.tsx` — Audit log

**API Routes:**
- `src/app/api/admin/merchants/[id]/route.ts` — Merchant detail + actions
- `src/app/api/admin/billing/route.ts` — Record payment, list payments
- `src/app/api/admin/team/route.ts` — Invite/remove/change admin role
- `src/app/api/admin/subscriptions/route.ts` — Change tier, manage subscription
- `src/app/api/cron/check-subscriptions/route.ts` — Daily cron endpoint

**Components:**
- `src/components/admin/stat-card.tsx` — Reusable stat card
- `src/components/admin/chart.tsx` — Chart wrapper (Recharts)
- `src/components/admin/data-table.tsx` — Reusable filterable/searchable table
- `src/components/admin/role-guard.tsx` — Role-based visibility wrapper

**Shared:**
- `src/lib/tier-limits.ts` — TIER_LIMITS constant + helper functions
- `src/lib/admin-permissions.ts` — Role permission matrix

**Database:**
- `supabase/migrations/012_admin_dashboard.sql` — Full migration

### Modified Files

- `src/components/admin/nav.tsx` — Add new nav items, role-based visibility
- `src/app/(admin)/layout.tsx` — Replace ADMIN_EMAILS check with admin_users DB lookup
- `src/app/(dashboard)/dashboard/products/new/page.tsx` — Product limit enforcement
- `src/app/(dashboard)/dashboard/products/[id]/edit/page.tsx` — Product limit enforcement
- `src/app/(dashboard)/dashboard/page.tsx` — Subscription status banner
- `src/app/(dashboard)/layout.tsx` — Soft suspend read-only enforcement
- `src/app/s/[slug]/page.tsx` — Soft suspend checkout disable + branding
- `src/app/page.tsx` — Update pricing section with new tiers
- `src/lib/constants.ts` — Update tier-related constants
- `supabase/migrations/010_place_order_v3.sql` — Reference only; new place_order v5 in migration 012

### Removed Files

- `src/app/(admin)/admin/stores/page.tsx` — Replaced by `/admin/merchants`
- `src/app/(admin)/admin/stores/store-actions.tsx` — Merged into merchant detail
