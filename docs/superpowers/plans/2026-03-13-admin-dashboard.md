# Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full admin dashboard with subscription billing, merchant management, analytics, role-based access, and tier enforcement for OshiCart.

**Architecture:** Extend the existing `(admin)` route group in the Next.js app. New database tables (admin_users, subscriptions, payments, admin_actions, tier_limits) managed via migration 012. Subscription lifecycle enforced via daily Vercel Cron job. Charts via Recharts library.

**Tech Stack:** Next.js 16 (App Router), Supabase (service client for admin), Recharts, Tailwind CSS v4, Zod v4, Vercel Cron Jobs

**Spec:** `docs/superpowers/specs/2026-03-13-admin-dashboard-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `supabase/migrations/012_admin_dashboard.sql` | All schema changes: enums, tables, indexes, RLS, tier_limits seed, place_order v5, cron function, backfill |
| `src/lib/tier-limits.ts` | TIER_LIMITS constant, helper functions (getTierLimits, canAddProduct, canPlaceOrder, hasTierFeature) |
| `src/lib/admin-permissions.ts` | Role permission matrix, hasPermission() helper, ADMIN_ROLES constant |
| `src/components/admin/stat-card.tsx` | Reusable stat card component with icon, value, label, optional trend |
| `src/components/admin/data-table.tsx` | Reusable filterable/searchable/sortable table |
| `src/components/admin/role-guard.tsx` | Role-based visibility wrapper component |
| `src/components/admin/chart.tsx` | Recharts wrapper (BarChart, LineChart, PieChart) |
| `src/app/(admin)/admin/page.tsx` | Enhanced overview with 6 stats, 2 charts, 3 lists (replaces existing) |
| `src/app/(admin)/admin/merchants/page.tsx` | Merchant list with filters, search, tier/status badges |
| `src/app/(admin)/admin/merchants/[id]/page.tsx` | Merchant detail with 6 tabs |
| `src/app/(admin)/admin/merchants/[id]/merchant-tabs.tsx` | Client component for tab switching |
| `src/app/(admin)/admin/billing/page.tsx` | Billing overview, payments table, overdue list |
| `src/app/(admin)/admin/billing/record-payment-modal.tsx` | Client component: payment recording form modal |
| `src/app/(admin)/admin/analytics/page.tsx` | Platform analytics with charts and top-10 tables |
| `src/app/(admin)/admin/team/page.tsx` | Admin team management (super_admin only) |
| `src/app/(admin)/admin/team/team-actions.tsx` | Client component: invite/remove/change role |
| `src/app/(admin)/admin/audit/page.tsx` | Audit log with filters |
| `src/app/api/admin/merchants/[id]/route.ts` | GET merchant detail, PATCH status/tier changes |
| `src/app/api/admin/billing/route.ts` | GET payments list, POST record payment |
| `src/app/api/admin/team/route.ts` | GET admins, POST invite, PATCH role, DELETE remove |
| `src/app/api/admin/subscriptions/route.ts` | PATCH change tier/status |
| `src/app/api/cron/check-subscriptions/route.ts` | Daily cron: expire trials, grace, suspend |
| `vercel.json` | Cron job schedule configuration |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/admin/nav.tsx` | Add Merchants/Billing/Analytics/Team/Audit nav items, role-based visibility |
| `src/app/(admin)/layout.tsx` | Replace ADMIN_EMAILS with admin_users DB lookup (keep fallback) |
| `src/app/(dashboard)/layout.tsx` | Add subscription status check, soft-suspend read-only enforcement |
| `src/app/(dashboard)/dashboard/page.tsx` | Add subscription warning banners (expiring, grace, suspended) |
| `src/app/(dashboard)/dashboard/products/new/page.tsx` | Add product limit check against tier |
| `src/app/(dashboard)/dashboard/products/[id]/edit/page.tsx` | Hide inventory fields for Start/Basic tiers |
| `src/app/s/[slug]/page.tsx` | Soft-suspend checkout disable, OshiCart branding for Start tier |
| `src/app/page.tsx` | Update pricing section with new 4-tier structure |
| `src/lib/constants.ts` | Add SUBSCRIPTION_STATUS_LABELS, TIER_LABELS constants |
| `package.json` | Add recharts dependency |

### Removed Files

| File | Reason |
|------|--------|
| `src/app/(admin)/admin/stores/page.tsx` | Replaced by `/admin/merchants` |
| `src/app/(admin)/admin/stores/store-actions.tsx` | Merged into merchant detail |

---

## Chunk 1: Database Migration & Foundation

### Task 1: Install Recharts dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install recharts**

```bash
cd "C:\Users\Elton Nicanor\Downloads\Octovia Nexus website V2\Cart Chat NA\chatcart-na"
npm install recharts
```

- [ ] **Step 2: Verify installation**

```bash
cd "C:\Users\Elton Nicanor\Downloads\Octovia Nexus website V2\Cart Chat NA\chatcart-na"
node -e "require('recharts'); console.log('recharts OK')"
```
Expected: `recharts OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add recharts for admin dashboard charts"
```

---

### Task 2: Write migration 012 — Admin Dashboard Schema

**Files:**
- Create: `supabase/migrations/012_admin_dashboard.sql`

**Dependencies:** Migration 011 must be applied first (store_status enum, reports table).

- [ ] **Step 1: Write migration file**

Write `supabase/migrations/012_admin_dashboard.sql` with the following sections in order:

**Section A — New enum types:**
```sql
-- Subscription tiers
CREATE TYPE subscription_tier AS ENUM ('oshi_start', 'oshi_basic', 'oshi_grow', 'oshi_pro');

-- Subscription lifecycle status
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'grace', 'soft_suspended', 'hard_suspended');

-- Admin roles
CREATE TYPE admin_role AS ENUM ('super_admin', 'support', 'finance');
```

**Section B — tier_limits table (single source of truth):**
```sql
CREATE TABLE tier_limits (
  tier subscription_tier PRIMARY KEY,
  max_products INTEGER NOT NULL,
  max_orders_per_month INTEGER NOT NULL,
  has_inventory BOOLEAN NOT NULL DEFAULT false,
  has_coupons BOOLEAN NOT NULL DEFAULT false,
  has_branding BOOLEAN NOT NULL DEFAULT true,
  price_nad INTEGER NOT NULL DEFAULT 0
);

INSERT INTO tier_limits VALUES
  ('oshi_start', 10,  20,  false, false, true,  0),
  ('oshi_basic', 30,  200, false, false, false, 19900),
  ('oshi_grow',  200, 500, true,  true,  false, 49900),
  ('oshi_pro',   -1,  -1,  true,  true,  false, 120000);
```

**Section C — admin_users table:**
```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role admin_role NOT NULL,
  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_users_user_id ON admin_users(user_id);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
-- service_role only (no user-facing access)
```

**Section D — subscriptions table:**
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL UNIQUE REFERENCES merchants(id) ON DELETE CASCADE,
  tier subscription_tier NOT NULL DEFAULT 'oshi_start',
  status subscription_status NOT NULL DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  grace_ends_at TIMESTAMPTZ,
  soft_suspended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_subscriptions_merchant ON subscriptions(merchant_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_period_end ON subscriptions(current_period_end);
CREATE INDEX idx_subscriptions_grace ON subscriptions(grace_ends_at) WHERE status = 'grace';
CREATE INDEX idx_subscriptions_soft_suspended ON subscriptions(soft_suspended_at) WHERE status = 'soft_suspended';

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Merchants can read their own subscription
CREATE POLICY "Subscriptions: merchant reads own"
  ON subscriptions FOR SELECT
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));
```

**Section E — payments table:**
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount_nad INTEGER NOT NULL,
  payment_method TEXT NOT NULL,
  reference TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  voided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_merchant ON payments(merchant_id);
CREATE INDEX idx_payments_created ON payments(created_at);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Merchants can read their own payments
CREATE POLICY "Payments: merchant reads own"
  ON payments FOR SELECT
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));
```

**Section F — admin_actions audit table:**
```sql
CREATE TABLE admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_actions_created ON admin_actions(created_at);
CREATE INDEX idx_admin_actions_target ON admin_actions(target_type, target_id);

ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
-- service_role only
```

**Section G — Modify merchants table:**
```sql
-- Drop old tier column and enum
ALTER TABLE merchants DROP COLUMN IF EXISTS tier;
DROP TYPE IF EXISTS merchant_tier;

-- Add suspension reason
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS suspended_reason TEXT;
```

**Section H — Backfill existing merchants with fresh 30-day trial:**
```sql
INSERT INTO subscriptions (merchant_id, tier, status, trial_ends_at)
SELECT id, 'oshi_start', 'trial', now() + interval '30 days'
FROM merchants
WHERE id NOT IN (SELECT merchant_id FROM subscriptions);
```

**Section I — Seed first super_admin:**
```sql
INSERT INTO admin_users (user_id, email, role)
SELECT id, email, 'super_admin'
FROM auth.users
WHERE lower(email) = 'info@octovianexus.com'
ON CONFLICT (user_id) DO NOTHING;
```

**Section J — Updated place_order v5 with tier enforcement:**

This builds on the existing v4 from migration 011. CRITICAL: preserves exact parameter names, column names, `SET search_path = public`, `GRANT EXECUTE`, and all existing logic. Only adds subscription/tier checks at the top.

```sql
-- Drop existing v4 (exact signature from migration 011)
DROP FUNCTION IF EXISTS public.place_order(uuid, text, text, text, integer, text, date, text, text, text, jsonb, integer, text, text, integer);

CREATE OR REPLACE FUNCTION public.place_order(
  p_merchant_id       uuid,
  p_customer_name     text,
  p_customer_whatsapp text,
  p_delivery_method   text,
  p_subtotal_nad      integer,
  p_delivery_address  text    DEFAULT NULL,
  p_delivery_date     date    DEFAULT NULL,
  p_delivery_time     text    DEFAULT NULL,
  p_notes             text    DEFAULT NULL,
  p_proof_url         text    DEFAULT NULL,
  p_items             jsonb   DEFAULT '[]',
  p_delivery_fee      integer DEFAULT 0,
  p_payment_method    text    DEFAULT 'eft',
  p_coupon_code       text    DEFAULT NULL,
  p_discount_nad      integer DEFAULT 0
)
RETURNS TABLE(order_id uuid, order_number integer, payment_reference text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_order_id     uuid;
  v_order_num    integer;
  v_payment_ref  text;
  v_item         jsonb;
  v_product      record;
  v_prev_qty     integer;
  v_coupon       record;
  v_coupon_id    uuid    := NULL;
  v_discount     integer := 0;
  v_merchant     record;
  v_subscription record;
  v_tier_limit   record;
  v_monthly_count integer;
BEGIN
  -- 1. Check merchant status
  SELECT m.store_status, m.created_at INTO v_merchant
  FROM merchants m WHERE m.id = p_merchant_id;

  IF v_merchant IS NULL THEN
    RAISE EXCEPTION 'Merchant not found';
  END IF;

  IF v_merchant.store_status <> 'active' THEN
    RAISE EXCEPTION 'This store is not currently accepting orders';
  END IF;

  -- 2. NEW: Check subscription status + tier limits
  SELECT s.status, s.tier INTO v_subscription
  FROM subscriptions s WHERE s.merchant_id = p_merchant_id;

  IF v_subscription IS NOT NULL THEN
    IF v_subscription.status NOT IN ('trial', 'active', 'grace') THEN
      RAISE EXCEPTION 'This store is not currently accepting orders';
    END IF;

    SELECT * INTO v_tier_limit
    FROM tier_limits WHERE tier = v_subscription.tier;

    -- 3. NEW: Check monthly order limit from tier_limits
    IF v_tier_limit IS NOT NULL AND v_tier_limit.max_orders_per_month > 0 THEN
      SELECT COUNT(*) INTO v_monthly_count
      FROM orders
      WHERE merchant_id = p_merchant_id
        AND created_at >= date_trunc('month', now())
        AND status <> 'cancelled';

      IF v_monthly_count >= v_tier_limit.max_orders_per_month THEN
        RAISE EXCEPTION 'This store has reached its monthly order limit. Please try again next month.';
      END IF;
    END IF;
  END IF;

  -- 4. Validate and apply coupon if provided
  -- NEW: Only process coupons if tier allows them (or no subscription row yet)
  IF p_coupon_code IS NOT NULL AND p_coupon_code <> '' THEN
    IF v_tier_limit IS NULL OR v_tier_limit.has_coupons THEN
      SELECT * INTO v_coupon
      FROM coupons
      WHERE merchant_id = p_merchant_id
        AND code = UPPER(TRIM(p_coupon_code))
        AND is_active = true
      FOR UPDATE;

      IF v_coupon IS NULL THEN
        RAISE EXCEPTION 'Invalid or inactive coupon code: %', p_coupon_code;
      END IF;

      IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
        RAISE EXCEPTION 'Coupon "%" has expired', v_coupon.code;
      END IF;

      IF v_coupon.starts_at IS NOT NULL AND v_coupon.starts_at > now() THEN
        RAISE EXCEPTION 'Coupon "%" is not yet active', v_coupon.code;
      END IF;

      IF v_coupon.max_uses IS NOT NULL AND v_coupon.current_uses >= v_coupon.max_uses THEN
        RAISE EXCEPTION 'Coupon "%" has reached its usage limit', v_coupon.code;
      END IF;

      IF v_coupon.min_order_nad > 0 AND p_subtotal_nad < v_coupon.min_order_nad THEN
        RAISE EXCEPTION 'Order subtotal does not meet the minimum for coupon "%"', v_coupon.code;
      END IF;

      IF v_coupon.discount_type = 'percentage' THEN
        v_discount := LEAST(p_subtotal_nad, (p_subtotal_nad * v_coupon.discount_value) / 100);
      ELSE
        v_discount := LEAST(p_subtotal_nad, v_coupon.discount_value);
      END IF;

      v_coupon_id := v_coupon.id;
      UPDATE coupons SET current_uses = current_uses + 1 WHERE id = v_coupon_id;
    END IF;
  END IF;

  -- 5. Create order (same columns as v4)
  INSERT INTO orders (
    merchant_id, customer_name, customer_whatsapp,
    delivery_method, delivery_address, delivery_date, delivery_time,
    subtotal_nad, delivery_fee_nad, notes, proof_of_payment_url,
    payment_method, coupon_id, discount_nad
  ) VALUES (
    p_merchant_id, p_customer_name, p_customer_whatsapp,
    p_delivery_method::delivery_method,
    p_delivery_address, p_delivery_date, p_delivery_time,
    p_subtotal_nad, p_delivery_fee, p_notes, p_proof_url,
    p_payment_method::payment_method,
    v_coupon_id,
    v_discount
  )
  RETURNING id, orders.order_number INTO v_order_id, v_order_num;

  -- 6. Generate payment reference (TRUST-06)
  v_payment_ref := 'OSHI-' || UPPER(SUBSTRING(v_order_id::text FROM 1 FOR 8));
  UPDATE orders SET payment_reference = v_payment_ref WHERE id = v_order_id;

  -- 7. Insert order items + deduct stock where tracked
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT id, name, track_inventory, stock_quantity, allow_backorder
    INTO v_product
    FROM products
    WHERE id = (v_item->>'productId')::uuid
    FOR UPDATE;

    IF v_product IS NULL THEN
      RAISE EXCEPTION 'Product not found: %', v_item->>'productId';
    END IF;

    IF v_product.track_inventory THEN
      IF v_product.stock_quantity < (v_item->>'quantity')::integer
         AND NOT v_product.allow_backorder THEN
        RAISE EXCEPTION 'Insufficient stock for "%". Available: %, Requested: %',
          v_product.name, v_product.stock_quantity, (v_item->>'quantity')::integer;
      END IF;

      v_prev_qty := v_product.stock_quantity;
      UPDATE products
      SET stock_quantity = stock_quantity - (v_item->>'quantity')::integer,
          updated_at = now()
      WHERE id = v_product.id;

      INSERT INTO stock_adjustments (
        product_id, merchant_id, previous_quantity, new_quantity,
        change, reason, order_id
      ) VALUES (
        v_product.id, p_merchant_id, v_prev_qty,
        v_prev_qty - (v_item->>'quantity')::integer,
        -(v_item->>'quantity')::integer, 'order', v_order_id
      );
    END IF;

    INSERT INTO order_items (
      order_id, product_id, product_name, product_price, quantity, line_total
    ) VALUES (
      v_order_id,
      (v_item->>'productId')::uuid,
      v_item->>'name',
      (v_item->>'price')::integer,
      (v_item->>'quantity')::integer,
      ((v_item->>'price')::integer * (v_item->>'quantity')::integer)
    );
  END LOOP;

  RETURN QUERY SELECT v_order_id, v_order_num, v_payment_ref;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.place_order TO anon, authenticated;
```

> **Changes from v4:** Added subscription status check (step 2), tier-based monthly order limit from `tier_limits` table (step 3), and coupon tier-gating (step 4). Removed the hardcoded TRUST-07 new-store limits (replaced by tier-based limits). Preserved all column names, parameter names, `SET search_path`, and `GRANT EXECUTE`.

**Section K — Cron function for subscription expiry:**
```sql
CREATE OR REPLACE FUNCTION check_expired_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Trial expired → grace
  UPDATE subscriptions
  SET status = 'grace',
      grace_ends_at = trial_ends_at + interval '7 days',
      updated_at = now()
  WHERE status = 'trial'
    AND trial_ends_at < now();

  -- Active expired → grace
  UPDATE subscriptions
  SET status = 'grace',
      grace_ends_at = current_period_end + interval '7 days',
      updated_at = now()
  WHERE status = 'active'
    AND current_period_end < now();

  -- Grace expired → soft_suspended
  UPDATE subscriptions
  SET status = 'soft_suspended',
      soft_suspended_at = now(),
      updated_at = now()
  WHERE status = 'grace'
    AND grace_ends_at < now();

  -- Soft suspended 30+ days → hard_suspended
  UPDATE subscriptions s
  SET status = 'hard_suspended',
      updated_at = now()
  WHERE s.status = 'soft_suspended'
    AND s.soft_suspended_at + interval '30 days' < now();

  -- Sync hard_suspended to merchants table
  UPDATE merchants m
  SET store_status = 'suspended',
      suspended_reason = 'non_payment',
      updated_at = now()
  FROM subscriptions s
  WHERE s.merchant_id = m.id
    AND s.status = 'hard_suspended'
    AND m.store_status <> 'suspended';
END;
$$;
```

- [ ] **Step 2: Review migration file for completeness**

Verify the migration includes all 11 sections (A through K). Cross-reference with spec at `docs/superpowers/specs/2026-03-13-admin-dashboard-design.md`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/012_admin_dashboard.sql
git commit -m "feat: add migration 012 — admin dashboard schema, subscriptions, tier limits, place_order v5"
```

---

### Task 3: Create tier-limits and admin-permissions libraries

**Files:**
- Create: `src/lib/tier-limits.ts`
- Create: `src/lib/admin-permissions.ts`

- [ ] **Step 1: Write tier-limits.ts**

```typescript
export type SubscriptionTier = "oshi_start" | "oshi_basic" | "oshi_grow" | "oshi_pro";
export type SubscriptionStatus = "trial" | "active" | "grace" | "soft_suspended" | "hard_suspended";

export interface TierLimit {
  products: number;       // -1 = unlimited
  orders_per_month: number; // -1 = unlimited
  inventory: boolean;
  coupons: boolean;
  branding: boolean;      // true = OshiCart branding shown
  price_nad: number;      // monthly price in cents
}

// Static fallback — must match tier_limits DB table
export const TIER_LIMITS: Record<SubscriptionTier, TierLimit> = {
  oshi_start: { products: 10,  orders_per_month: 20,  inventory: false, coupons: false, branding: true,  price_nad: 0 },
  oshi_basic: { products: 30,  orders_per_month: 200, inventory: false, coupons: false, branding: false, price_nad: 19900 },
  oshi_grow:  { products: 200, orders_per_month: 500, inventory: true,  coupons: true,  branding: false, price_nad: 49900 },
  oshi_pro:   { products: -1,  orders_per_month: -1,  inventory: true,  coupons: true,  branding: false, price_nad: 120000 },
};

export const TIER_LABELS: Record<SubscriptionTier, string> = {
  oshi_start: "Oshi-Start",
  oshi_basic: "Oshi-Basic",
  oshi_grow: "Oshi-Grow",
  oshi_pro: "Oshi-Pro",
};

export const TIER_COLORS: Record<SubscriptionTier, string> = {
  oshi_start: "bg-gray-100 text-gray-800",
  oshi_basic: "bg-blue-100 text-blue-800",
  oshi_grow: "bg-green-100 text-green-800",
  oshi_pro: "bg-purple-100 text-purple-800",
};

export const STATUS_LABELS: Record<SubscriptionStatus, { label: string; color: string }> = {
  trial: { label: "Trial", color: "bg-yellow-100 text-yellow-800" },
  active: { label: "Active", color: "bg-green-100 text-green-800" },
  grace: { label: "Grace Period", color: "bg-orange-100 text-orange-800" },
  soft_suspended: { label: "Suspended", color: "bg-red-100 text-red-800" },
  hard_suspended: { label: "Offline", color: "bg-gray-100 text-gray-800" },
};

export function canAddProduct(tier: SubscriptionTier, currentCount: number): boolean {
  const limit = TIER_LIMITS[tier].products;
  return limit === -1 || currentCount < limit;
}

export function hasTierFeature(tier: SubscriptionTier, feature: "inventory" | "coupons"): boolean {
  return TIER_LIMITS[tier][feature];
}

export function showBranding(tier: SubscriptionTier): boolean {
  return TIER_LIMITS[tier].branding;
}

export function formatTierPrice(tier: SubscriptionTier): string {
  const price = TIER_LIMITS[tier].price_nad;
  if (price === 0) return "Free";
  return `N$${(price / 100).toLocaleString()}/mo`;
}

export function isSubscriptionActive(status: SubscriptionStatus): boolean {
  return status === "trial" || status === "active" || status === "grace";
}

export function isReadOnly(status: SubscriptionStatus): boolean {
  return status === "soft_suspended" || status === "hard_suspended";
}
```

- [ ] **Step 2: Write admin-permissions.ts**

```typescript
export type AdminRole = "super_admin" | "support" | "finance";

export interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  role: AdminRole;
  created_at: string;
}

type Permission =
  | "view_overview"
  | "view_merchants"
  | "view_merchant_detail"
  | "manage_merchants"       // suspend, ban, approve
  | "view_billing"
  | "manage_billing"         // record payments
  | "view_analytics"
  | "view_reports"
  | "manage_reports"         // resolve reports
  | "view_team"
  | "manage_team"            // invite, remove, change role
  | "view_audit";

const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  super_admin: [
    "view_overview", "view_merchants", "view_merchant_detail", "manage_merchants",
    "view_billing", "manage_billing", "view_analytics",
    "view_reports", "manage_reports",
    "view_team", "manage_team", "view_audit",
  ],
  support: [
    "view_overview", "view_merchants", "view_merchant_detail",
    "view_billing", "view_analytics",
    "view_reports", "manage_reports",
  ],
  finance: [
    "view_overview",
    "view_merchants",
    "view_billing", "manage_billing",
  ],
};

export function hasPermission(role: AdminRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getVisibleNavItems(role: AdminRole) {
  const items = [
    { label: "Overview", href: "/admin", permission: "view_overview" as Permission },
    { label: "Merchants", href: "/admin/merchants", permission: "view_merchants" as Permission },
    { label: "Billing", href: "/admin/billing", permission: "view_billing" as Permission },
    { label: "Analytics", href: "/admin/analytics", permission: "view_analytics" as Permission },
    { label: "Reports", href: "/admin/reports", permission: "view_reports" as Permission },
    { label: "Admin Team", href: "/admin/team", permission: "view_team" as Permission },
    { label: "Audit Log", href: "/admin/audit", permission: "view_audit" as Permission },
  ];
  return items.filter((item) => hasPermission(role, item.permission));
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/tier-limits.ts src/lib/admin-permissions.ts
git commit -m "feat: add tier limits and admin permissions libraries"
```

---

### Task 4: Update constants.ts with new subscription labels

**Files:**
- Modify: `src/lib/constants.ts`

- [ ] **Step 1: Re-export subscription status labels from tier-limits.ts**

Append after the existing `STORE_STATUS_LABELS` at the end of the file:

```typescript
// Re-export from tier-limits for convenience (single source of truth is tier-limits.ts)
export { STATUS_LABELS as SUBSCRIPTION_STATUS_LABELS } from "@/lib/tier-limits";
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/constants.ts
git commit -m "feat: add subscription status labels to constants"
```

---

### Task 5: Create vercel.json with cron configuration

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Write vercel.json**

```json
{
  "crons": [
    {
      "path": "/api/cron/check-subscriptions",
      "schedule": "0 0 * * *"
    }
  ]
}
```

This runs the subscription expiry check daily at midnight UTC.

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "chore: add vercel.json with daily subscription cron job"
```

---

### Task 6: Create cron endpoint with CRON_SECRET auth

**Files:**
- Create: `src/app/api/cron/check-subscriptions/route.ts`

- [ ] **Step 1: Write cron route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { error } = await supabase.rpc("check_expired_subscriptions");

  if (error) {
    console.error("Cron error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/cron/check-subscriptions/route.ts
git commit -m "feat: add cron endpoint for subscription expiry checks"
```

---

## Chunk 2: Reusable Admin Components

### Task 7: Create stat-card component

**Files:**
- Create: `src/components/admin/stat-card.tsx`

- [ ] **Step 1: Write stat-card.tsx**

```typescript
import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  highlight?: boolean;
}

export function StatCard({ label, value, icon: Icon, trend, highlight }: StatCardProps) {
  return (
    <div className={`bg-white rounded-lg border p-6 ${highlight ? "ring-2 ring-orange-400" : ""}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trend && (
            <p className={`text-sm mt-1 ${trend.positive ? "text-green-600" : "text-red-600"}`}>
              {trend.value}
            </p>
          )}
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <Icon className="h-6 w-6 text-gray-600" />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/stat-card.tsx
git commit -m "feat: add reusable stat card component for admin dashboard"
```

---

### Task 8: Create role-guard component

**Files:**
- Create: `src/components/admin/role-guard.tsx`

- [ ] **Step 1: Write role-guard.tsx**

```typescript
import { type AdminRole, hasPermission } from "@/lib/admin-permissions";

interface RoleGuardProps {
  role: AdminRole;
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGuard({ role, permission, children, fallback = null }: RoleGuardProps) {
  if (!hasPermission(role, permission as Parameters<typeof hasPermission>[1])) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/role-guard.tsx
git commit -m "feat: add role-guard component for permission-based rendering"
```

---

### Task 9: Create chart wrapper component

**Files:**
- Create: `src/components/admin/chart.tsx`

- [ ] **Step 1: Write chart.tsx**

```typescript
"use client";

import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = ["#2B5EA7", "#4A9B3E", "#EAB308", "#9333EA", "#EF4444", "#06B6D4"];

interface ChartProps {
  data: Record<string, unknown>[];
  height?: number;
}

interface BarChartProps extends ChartProps {
  xKey: string;
  bars: { key: string; color?: string; name?: string }[];
  stacked?: boolean;
}

export function AdminBarChart({ data, xKey, bars, stacked, height = 300 }: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        {bars.map((bar, i) => (
          <Bar
            key={bar.key}
            dataKey={bar.key}
            fill={bar.color || COLORS[i % COLORS.length]}
            name={bar.name || bar.key}
            stackId={stacked ? "stack" : undefined}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

interface LineChartProps extends ChartProps {
  xKey: string;
  lines: { key: string; color?: string; name?: string }[];
}

export function AdminLineChart({ data, xKey, lines, height = 300 }: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        {lines.map((line, i) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            stroke={line.color || COLORS[i % COLORS.length]}
            name={line.name || line.key}
            strokeWidth={2}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

interface PieChartProps extends ChartProps {
  dataKey: string;
  nameKey: string;
}

export function AdminPieChart({ data, dataKey, nameKey, height = 300 }: PieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey={dataKey}
          nameKey={nameKey}
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/chart.tsx
git commit -m "feat: add chart wrapper components (bar, line, pie) for admin analytics"
```

---

### Task 10: Update admin nav with new pages and role-based visibility

**Files:**
- Modify: `src/components/admin/nav.tsx`

- [ ] **Step 1: Update nav.tsx**

Replace the hardcoded nav items with role-based items from `getVisibleNavItems()`. The nav component needs:
1. Accept `adminRole` prop (in addition to existing `userEmail`)
2. Import `getVisibleNavItems` from `@/lib/admin-permissions`
3. Use Lucide icons: `LayoutDashboard`, `Users`, `CreditCard`, `BarChart3`, `Flag`, `Shield`, `FileText`
4. Map nav items to icons by href
5. Filter based on role

Key changes to the component:
- Props: `{ userEmail: string; adminRole: AdminRole }`
- Replace static `navItems` array with `getVisibleNavItems(adminRole)`
- Add icon mapping: `/admin` → LayoutDashboard, `/admin/merchants` → Users, `/admin/billing` → CreditCard, `/admin/analytics` → BarChart3, `/admin/reports` → Flag, `/admin/team` → Shield, `/admin/audit` → FileText

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/nav.tsx
git commit -m "feat: update admin nav with role-based visibility and new pages"
```

---

### Task 11: Update admin layout with DB-based auth

**Files:**
- Modify: `src/app/(admin)/layout.tsx`

- [ ] **Step 1: Update layout.tsx**

Replace the `ADMIN_EMAILS` check with a database lookup to `admin_users`, keeping ADMIN_EMAILS as fallback:

```typescript
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ADMIN_EMAILS } from "@/lib/constants";
import { AdminNav } from "@/components/admin/nav";
import type { AdminRole } from "@/lib/admin-permissions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (!user.email) redirect("/dashboard");

  // Check admin_users table first
  const service = createServiceClient();
  const { data: adminUser } = await service
    .from("admin_users")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  // Fallback to ADMIN_EMAILS env var (transition period)
  let role: AdminRole = "super_admin";
  if (adminUser) {
    role = adminUser.role as AdminRole;
  } else if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNav userEmail={user.email} adminRole={role} />
      <main className="md:ml-56 max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(admin)/layout.tsx
git commit -m "feat: update admin layout with DB-based auth and role-based nav"
```

---

## Chunk 3: Admin API Routes

### Task 12: Create merchant detail API route

**Files:**
- Create: `src/app/api/admin/merchants/[id]/route.ts`

- [ ] **Step 1: Write route with GET and PATCH**

GET returns full merchant detail with subscription, orders, products count.
PATCH handles: change status, change tier, update subscription.

Follow the existing pattern from `src/app/api/admin/stores/route.ts`:
- Auth check via `createClient()` + admin_users lookup
- Use `createServiceClient()` for data operations
- Log all actions to `admin_actions` table
- Return `{ success: true }` or error

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/merchants/[id]/route.ts
git commit -m "feat: add merchant detail API route with status and tier management"
```

---

### Task 13: Create billing API route

**Files:**
- Create: `src/app/api/admin/billing/route.ts`

- [ ] **Step 1: Write route with GET and POST**

GET: List payments with optional filters (merchant_id, month, method).
POST: Record a new payment. Must:
1. Validate admin has `manage_billing` permission
2. Create payment record
3. Update subscription: set `status: 'active'`, `tier` to selected tier, `current_period_start: now()`, `current_period_end: now() + 30 days`
4. Update merchant: `store_status: 'active'`, clear `suspended_reason`
5. Log to `admin_actions`

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/billing/route.ts
git commit -m "feat: add billing API route for payment recording and listing"
```

---

### Task 14: Create admin team API route

**Files:**
- Create: `src/app/api/admin/team/route.ts`

- [ ] **Step 1: Write route with GET, POST, PATCH, DELETE**

GET: List all admin users.
POST: Invite new admin (lookup user by email in auth.users, create admin_users row).
PATCH: Change role (cannot change own role).
DELETE: Remove admin (cannot remove self).
All operations require `manage_team` permission (super_admin only).
Log all actions to `admin_actions`.

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/team/route.ts
git commit -m "feat: add admin team management API route"
```

---

### Task 15: Create subscriptions API route

**Files:**
- Create: `src/app/api/admin/subscriptions/route.ts`

- [ ] **Step 1: Write route with PATCH**

PATCH: Change tier or manually set subscription status.
Must update both `subscriptions` table and potentially `merchants.store_status`.
Log to `admin_actions` with before/after state.

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/subscriptions/route.ts
git commit -m "feat: add subscription management API route"
```

---

## Chunk 4: Admin Dashboard Pages

### Task 16: Build enhanced overview page

**Files:**
- Modify: `src/app/(admin)/admin/page.tsx` (replace existing 120 lines)

- [ ] **Step 1: Rewrite overview page**

The new overview needs:
- 6 stat cards (MRR, Active Merchants, New Signups, Pending Approvals, Overdue Payments, Open Reports)
- 2 charts (Revenue trend 6mo bar chart, Signups trend 6mo line chart) — use `AdminBarChart` and `AdminLineChart`
- 3 lists (Expiring trials, Overdue subscriptions, Recent activity feed)

Data queries (all via `createServiceClient()`):
- MRR: `SELECT SUM(tl.price_nad) FROM subscriptions s JOIN tier_limits tl ON s.tier = tl.tier WHERE s.status IN ('active', 'trial', 'grace')`
- Active merchants: count from subscriptions where status is active/trial/grace
- New signups: count from merchants where created_at > 7 days ago
- Pending: count from merchants where store_status = 'pending'
- Overdue: count from subscriptions where status in ('grace', 'soft_suspended')
- Open reports: count from reports where status = 'open'
- Revenue trend: aggregate payments by month for last 6 months
- Signups trend: aggregate merchants by month for last 6 months
- Expiring trials: subscriptions where status = 'trial' and trial_ends_at < now() + 7 days
- Overdue list: subscriptions where status in ('grace', 'soft_suspended') with merchant info
- Activity feed: last 20 admin_actions with admin email

- [ ] **Step 2: Commit**

```bash
git add src/app/(admin)/admin/page.tsx
git commit -m "feat: enhanced admin overview with stats, charts, and activity feed"
```

---

### Task 17: Build merchants list page

**Files:**
- Create: `src/app/(admin)/admin/merchants/page.tsx`

- [ ] **Step 1: Write merchants page**

Replaces the old `/admin/stores` page. Includes:
- Filter buttons: All, Trial, Active, Grace, Suspended + tier filter dropdown
- Search input (name, slug, email, WhatsApp)
- Table with columns: Name, Tier badge, Store Status badge, Subscription Status badge, Orders (month), Revenue, Sub End Date, Days Active
- Row click → `/admin/merchants/[id]`

Query: `createServiceClient()` → merchants join subscriptions, aggregate orders.

- [ ] **Step 2: Delete old stores page and actions**

Remove `src/app/(admin)/admin/stores/page.tsx` and `src/app/(admin)/admin/stores/store-actions.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/app/(admin)/admin/merchants/page.tsx
git rm src/app/(admin)/admin/stores/page.tsx src/app/(admin)/admin/stores/store-actions.tsx
git commit -m "feat: add merchants list page, remove old stores page"
```

---

### Task 18: Build merchant detail page

**Files:**
- Create: `src/app/(admin)/admin/merchants/[id]/page.tsx`
- Create: `src/app/(admin)/admin/merchants/[id]/merchant-tabs.tsx`

- [ ] **Step 1: Write server page component**

Fetches all merchant data server-side:
- Merchant record
- Subscription record
- Payment history
- Product count
- Order stats (this month + all time)
- Admin actions for this merchant

Passes data to `<MerchantTabs>` client component.

Header: store name, status badge, tier badge, quick action buttons (wrapped in `<RoleGuard>`).

- [ ] **Step 2: Write merchant-tabs client component**

6 tabs: Overview, Subscription, Performance, Products, Orders, Activity.
- Use URL search params for active tab (`?tab=subscription`)
- Each tab renders the relevant data passed as props
- Performance tab uses `AdminLineChart` for orders over time
- Activity tab renders timeline from admin_actions

- [ ] **Step 3: Commit**

```bash
git add src/app/(admin)/admin/merchants/[id]/page.tsx src/app/(admin)/admin/merchants/[id]/merchant-tabs.tsx
git commit -m "feat: add merchant detail page with 6-tab layout"
```

---

### Task 19: Build billing page

**Files:**
- Create: `src/app/(admin)/admin/billing/page.tsx`
- Create: `src/app/(admin)/admin/billing/record-payment-modal.tsx`

- [ ] **Step 1: Write billing page**

Top: 4 stat cards (MRR, Total Revenue, Outstanding, Collected This Month).
"Record Payment" button (wrapped in `<RoleGuard permission="manage_billing">`).
Payments table: filterable by month, merchant, method.
Overdue list: merchants past renewal, sorted by days overdue.
Expiring soon: trials/subscriptions ending in 14 days.

- [ ] **Step 2: Write record-payment-modal client component**

Modal form with:
- Searchable merchant dropdown (fetches from API)
- Amount field (auto-filled from tier price)
- Tier selector (which plan they're paying for)
- Payment method dropdown (EFT, MoMo, eWallet, Cash)
- Reference number text input
- Period covered (date range picker or month selector)
- Notes textarea
- Submit → POST `/api/admin/billing`
- On success: `router.refresh()` + close modal

- [ ] **Step 3: Commit**

```bash
git add src/app/(admin)/admin/billing/page.tsx src/app/(admin)/admin/billing/record-payment-modal.tsx
git commit -m "feat: add billing page with payment recording modal"
```

---

### Task 20: Build analytics page

**Files:**
- Create: `src/app/(admin)/admin/analytics/page.tsx`

- [ ] **Step 1: Write analytics page**

Charts and metrics:
1. Revenue by month (stacked bar by tier) — `AdminBarChart`
2. Merchant growth (signups line) — `AdminLineChart`
3. Platform GMV — stat card
4. Order volume (bar chart) — `AdminBarChart`
5. Tier distribution — `AdminPieChart`
6. Industry breakdown — `AdminBarChart` horizontal
7. Payment method breakdown — `AdminPieChart`
8. Top 10 merchants by orders — table
9. Top 10 merchants by revenue — table

All data from `createServiceClient()` queries against orders, merchants, subscriptions, payments, store_analytics.

- [ ] **Step 2: Commit**

```bash
git add src/app/(admin)/admin/analytics/page.tsx
git commit -m "feat: add platform analytics page with charts and top-10 tables"
```

---

### Task 21: Enhance reports page

**Files:**
- Modify: `src/app/(admin)/admin/reports/page.tsx`
- Modify: `src/app/(admin)/admin/reports/report-actions.tsx`

- [ ] **Step 1: Update reports page**

Add:
- Link to merchant detail page from each report card (clickable store name → `/admin/merchants/[id]`)
- Resolution tracking display (show what action was taken)
- Wrap action buttons in `<RoleGuard permission="manage_reports">`

- [ ] **Step 2: Commit**

```bash
git add src/app/(admin)/admin/reports/page.tsx src/app/(admin)/admin/reports/report-actions.tsx
git commit -m "feat: enhance reports page with merchant links and role guards"
```

---

### Task 22: Build admin team page

**Files:**
- Create: `src/app/(admin)/admin/team/page.tsx`
- Create: `src/app/(admin)/admin/team/team-actions.tsx`

- [ ] **Step 1: Write team page**

List current admins: email, role badge, date added, added by.
"Invite Admin" button → modal with email input + role picker.
Per-admin: role change dropdown, remove button (cannot remove self).
All data from `createServiceClient()` → `admin_users`.

- [ ] **Step 2: Write team-actions client component**

Handles:
- Invite: POST `/api/admin/team` with email + role
- Change role: PATCH `/api/admin/team` with admin_id + new role
- Remove: DELETE `/api/admin/team` with admin_id
- Confirmation dialogs for destructive actions

- [ ] **Step 3: Commit**

```bash
git add src/app/(admin)/admin/team/page.tsx src/app/(admin)/admin/team/team-actions.tsx
git commit -m "feat: add admin team management page"
```

---

### Task 23: Build audit log page

**Files:**
- Create: `src/app/(admin)/admin/audit/page.tsx`

- [ ] **Step 1: Write audit page**

Chronological list of admin_actions.
Filters: admin user dropdown, action type dropdown, date range, target merchant search.
Each entry: who (admin email), what (action), target (merchant name + link), when (relative time), details (expandable JSON).
Pagination: show 50 per page with "Load more" button.

- [ ] **Step 2: Commit**

```bash
git add src/app/(admin)/admin/audit/page.tsx
git commit -m "feat: add audit log page with filtering"
```

---

## Chunk 5: Merchant-Side Enforcement

### Task 24: Add subscription status banners to merchant dashboard

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Add subscription warning banners**

After the existing status banners (pending/suspended), add subscription-aware banners:
- **Grace period:** Orange banner: "Your trial/subscription has ended. You have X days to renew before your store is paused."
- **Soft suspended:** Red banner: "Your subscription has expired. Renew to continue accepting orders." + "Renew Now" button showing payment instructions.
- **Expiring soon (< 7 days):** Yellow banner: "Your subscription expires in X days."

Fetch subscription from `createServiceClient()` using merchant_id.

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/dashboard/page.tsx
git commit -m "feat: add subscription status banners to merchant dashboard"
```

---

### Task 25: Add soft-suspend read-only enforcement to dashboard layout

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Update dashboard layout**

After fetching the merchant, also fetch their subscription status. If `soft_suspended` or `hard_suspended`:
- For `hard_suspended`: redirect to a suspended page (show "Contact support" message)
- For `soft_suspended`: pass `readOnly: true` flag via context or a data attribute that child pages can check

The simplest approach: add a persistent banner at the top of the layout when suspended, and pass subscription data to child pages.

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/layout.tsx
git commit -m "feat: add soft-suspend read-only enforcement to dashboard layout"
```

---

### Task 26: Add product limit enforcement

**Files:**
- Modify: `src/app/(dashboard)/dashboard/products/new/page.tsx`
- Modify: `src/app/(dashboard)/dashboard/products/[id]/edit/page.tsx`

- [ ] **Step 1: Update new product page**

Before the form renders, check if merchant can add more products:
- Fetch subscription tier
- Fetch current product count
- If `!canAddProduct(tier, count)`: show "You've reached your product limit (X/Y). Upgrade to add more." with link to pricing.

Also: hide inventory fields if `!hasTierFeature(tier, "inventory")`.

- [ ] **Step 2: Update edit product page**

Hide inventory tracking fields (track_inventory, stock_quantity, etc.) if tier doesn't have inventory feature.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/dashboard/products/new/page.tsx src/app/(dashboard)/dashboard/products/[id]/edit/page.tsx
git commit -m "feat: enforce product limits and tier-gate inventory fields"
```

---

### Task 27: Hide coupons for Start/Basic tiers

**Files:**
- Modify: `src/components/admin/nav.tsx` — not applicable here
- The merchant dashboard nav needs updating. Check `src/app/(dashboard)/` for the merchant nav component.

- [ ] **Step 1: Find and update merchant dashboard nav**

Locate the merchant-side nav component (check `src/components/nav.tsx` or `src/components/dashboard/nav.tsx`). Conditionally hide the "Coupons" nav link if the merchant's subscription tier doesn't have coupons (`!hasTierFeature(tier, "coupons")`). The nav component will need to receive the subscription tier as a prop from the dashboard layout.

- [ ] **Step 2: Commit**

```bash
git add src/components/nav.tsx src/app/(dashboard)/layout.tsx
git commit -m "feat: hide coupons nav link for Start/Basic tiers"
```

---

### Task 28: Add storefront enforcement (soft suspend + branding)

**Files:**
- Modify: `src/app/s/[slug]/page.tsx`

- [ ] **Step 1: Update storefront page**

Two changes:
1. **Soft suspend:** If merchant's subscription is `soft_suspended`, show products but disable all "Add to Cart" buttons. Show banner: "This store is temporarily unavailable for orders."
2. **Branding:** If merchant's tier is `oshi_start` (branding = true), show "Powered by OshiCart" footer link.

Fetch subscription via service client join or separate query.

- [ ] **Step 2: Commit**

```bash
git add src/app/s/[slug]/page.tsx
git commit -m "feat: add soft-suspend checkout disable and OshiCart branding to storefronts"
```

---

### Task 29: Add checkout page soft-suspend guard

**Files:**
- Modify: `src/app/checkout/[slug]/checkout-form.tsx` or `src/app/checkout/[slug]/page.tsx`

- [ ] **Step 1: Add subscription check to checkout page**

A customer with items in localStorage could navigate directly to `/checkout/[slug]` and bypass the storefront block. Add a server-side check:
- Fetch merchant's subscription status
- If `soft_suspended` or `hard_suspended`: redirect to `/s/[slug]` with a message, or show "This store is not accepting orders" instead of the checkout form.

- [ ] **Step 2: Commit**

```bash
git add src/app/checkout/[slug]/page.tsx
git commit -m "feat: block checkout for soft-suspended merchants"
```

---

### Task 30: Add subscription creation on merchant signup

**Files:**
- Modify: merchant signup/setup flow (check `src/app/(dashboard)/dashboard/setup/page.tsx` or wherever new merchants are created)

- [ ] **Step 1: Add subscription row creation**

When a new merchant record is created, also INSERT a subscription record:
```sql
INSERT INTO subscriptions (merchant_id, tier, status, trial_ends_at)
VALUES (new_merchant_id, 'oshi_start', 'trial', now() + interval '30 days');
```

This can be done either:
- In the setup page after merchant INSERT (application code)
- Or as a database trigger on merchants INSERT

Application code is preferred (consistent with existing patterns).

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/dashboard/setup/page.tsx
git commit -m "feat: create subscription record on merchant signup"
```

---

### Task 31: Update landing page pricing section

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace pricing section**

Replace the existing 3-tier pricing (Free Trial N$0, Pro N$99, Business N$249) with the new 4-tier structure:

| Oshi-Start | Oshi-Basic | Oshi-Grow | Oshi-Pro |
|------------|------------|-----------|----------|
| N$0 / 30 days | N$199/mo | N$499/mo | N$1,200/mo |
| 10 products | 30 products | 200 products | Unlimited |
| 20 orders/mo | 200 orders/mo | 500 orders/mo | Unlimited |

Highlight Oshi-Basic as the recommended tier (green ring, "Most Popular" badge).
Update the `PricingCard` component and its data array.

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: update landing page with new 4-tier pricing structure"
```

---

## Chunk 6: Final Integration & Cleanup

### Task 32: Test build locally

- [ ] **Step 1: Run build**

```bash
cd "C:\Users\Elton Nicanor\Downloads\Octovia Nexus website V2\Cart Chat NA\chatcart-na"
npm run build
```

Note: Build may fail on Windows due to Tailwind CSS v4 oxide binary. If so, verify no TypeScript errors by running:
```bash
npx tsc --noEmit
```

- [ ] **Step 2: Fix any build errors**

Address any TypeScript errors, missing imports, or type mismatches.

- [ ] **Step 3: Commit fixes if any**

```bash
git add -A
git commit -m "fix: resolve build errors for admin dashboard"
```

---

### Task 33: Deploy

- [ ] **Step 1: Deploy migration 011 first**

In Supabase Dashboard > SQL Editor, paste and run `supabase/migrations/011_trust_phase1.sql`.

- [ ] **Step 2: Deploy migration 012**

In Supabase Dashboard > SQL Editor, paste and run `supabase/migrations/012_admin_dashboard.sql`.

- [ ] **Step 3: Set environment variables in Vercel**

Add to Vercel Dashboard > Settings > Environment Variables:
- `ADMIN_EMAILS=info@octovianexus.com`
- `CRON_SECRET=` (generate a random 32-char string)

- [ ] **Step 4: Push to master**

```bash
git push origin master
```

Vercel auto-deploys. Verify at https://oshicart.com/admin.

- [ ] **Step 5: Verify admin access**

1. Log in with admin email
2. Navigate to `/admin`
3. Verify all 7 nav items appear
4. Check overview stats load correctly
5. Check merchants list shows existing merchants with trial status
6. Test recording a payment in billing
7. Verify cron job is configured in Vercel dashboard

---

## Summary

| Chunk | Tasks | Description |
|-------|-------|-------------|
| 1 | 1-6 | Database migration, libraries, vercel.json, cron endpoint |
| 2 | 7-11 | Reusable components (stat-card, role-guard, charts, nav, layout) |
| 3 | 12-15 | API routes (merchants, billing, team, subscriptions) |
| 4 | 16-23 | Admin pages (overview, merchants, billing, analytics, reports, team, audit) |
| 5 | 24-31 | Merchant-side enforcement (banners, limits, checkout guard, signup, storefront, pricing) |
| 6 | 32-33 | Build verification and deployment |

**Total: 33 tasks across 6 chunks.**
