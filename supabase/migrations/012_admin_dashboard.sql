-- Migration 012: Admin Dashboard Schema
-- Depends on: 011_trust_phase1.sql (store_status enum, reports table)

-- ============================================================
-- Section A: New enum types
-- ============================================================

CREATE TYPE subscription_tier AS ENUM ('oshi_start', 'oshi_basic', 'oshi_grow', 'oshi_pro');
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'grace', 'soft_suspended', 'hard_suspended');
CREATE TYPE admin_role AS ENUM ('super_admin', 'support', 'finance');

-- ============================================================
-- Section B: tier_limits table (single source of truth)
-- ============================================================

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

-- ============================================================
-- Section C: admin_users table
-- ============================================================

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

-- ============================================================
-- Section D: subscriptions table
-- ============================================================

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

-- Merchants can create their own subscription (one per merchant, on signup)
CREATE POLICY "Subscriptions: merchant creates own"
  ON subscriptions FOR INSERT
  WITH CHECK (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

-- ============================================================
-- Section E: payments table
-- ============================================================

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

-- ============================================================
-- Section F: admin_actions audit table
-- ============================================================

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

-- ============================================================
-- Section G: Modify merchants table
-- ============================================================

-- Drop old tier column and enum
ALTER TABLE merchants DROP COLUMN IF EXISTS tier;
DROP TYPE IF EXISTS merchant_tier;

-- Add suspension reason
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS suspended_reason TEXT;

-- ============================================================
-- Section H: Backfill existing merchants with fresh 30-day trial
-- ============================================================

INSERT INTO subscriptions (merchant_id, tier, status, trial_ends_at)
SELECT id, 'oshi_start', 'trial', now() + interval '30 days'
FROM merchants
WHERE id NOT IN (SELECT merchant_id FROM subscriptions);

-- ============================================================
-- Section I: Seed first super_admin
-- ============================================================

INSERT INTO admin_users (user_id, email, role)
SELECT id, email, 'super_admin'
FROM auth.users
WHERE lower(email) = 'info@octovianexus.com'
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- Section J: Updated place_order v5 with tier enforcement
-- ============================================================

-- Drop existing function (exact signature from migration 011)
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

  -- 2. Check subscription status + tier limits
  SELECT s.status, s.tier INTO v_subscription
  FROM subscriptions s WHERE s.merchant_id = p_merchant_id;

  IF v_subscription IS NOT NULL THEN
    IF v_subscription.status NOT IN ('trial', 'active', 'grace') THEN
      RAISE EXCEPTION 'This store is not currently accepting orders';
    END IF;

    SELECT * INTO v_tier_limit
    FROM tier_limits WHERE tier = v_subscription.tier;

    -- 3. Check monthly order limit from tier_limits
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
  -- Only process coupons if tier allows them (or no subscription row yet)
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

  -- 6. Generate payment reference
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

-- ============================================================
-- Section K: Cron function for subscription expiry
-- ============================================================

CREATE OR REPLACE FUNCTION check_expired_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Trial expired -> grace
  UPDATE subscriptions
  SET status = 'grace',
      grace_ends_at = trial_ends_at + interval '7 days',
      updated_at = now()
  WHERE status = 'trial'
    AND trial_ends_at < now();

  -- Active expired -> grace
  UPDATE subscriptions
  SET status = 'grace',
      grace_ends_at = current_period_end + interval '7 days',
      updated_at = now()
  WHERE status = 'active'
    AND current_period_end < now();

  -- Grace expired -> soft_suspended
  UPDATE subscriptions
  SET status = 'soft_suspended',
      soft_suspended_at = now(),
      updated_at = now()
  WHERE status = 'grace'
    AND grace_ends_at < now();

  -- Soft suspended 30+ days -> hard_suspended
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
