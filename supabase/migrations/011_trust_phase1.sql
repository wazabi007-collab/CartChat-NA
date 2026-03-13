-- Migration 011: TRUST Phase 1 — Anti-Fraud Basic Protection
-- TRUST-03: store_status enum + column on merchants
-- TRUST-05: reports table
-- TRUST-06: payment_reference on orders
-- TRUST-07: order limits for new stores (enforced in place_order v4)

-- 1. Store status enum
CREATE TYPE store_status AS ENUM ('pending', 'active', 'suspended', 'banned');

-- 2. Add store_status to merchants (existing merchants default to 'active')
ALTER TABLE merchants ADD COLUMN store_status store_status NOT NULL DEFAULT 'active';

-- 3. New merchants should start as 'pending' — handled in application code
-- (We keep DB default as 'active' so existing rows are unaffected)

-- 4. Add tos_accepted_at to merchants (TRUST-09)
ALTER TABLE merchants ADD COLUMN tos_accepted_at timestamptz DEFAULT NULL;

-- 5. Add payment_reference to orders (TRUST-06)
ALTER TABLE orders ADD COLUMN payment_reference text DEFAULT NULL;

-- 6. Reports table (TRUST-05)
CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text DEFAULT NULL,
  reporter_name text DEFAULT NULL,
  reporter_contact text DEFAULT NULL,
  status text NOT NULL DEFAULT 'open',  -- open, reviewed, dismissed
  admin_notes text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for admin queries
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_merchant ON reports(merchant_id);

-- RLS for reports
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a report (anon)
CREATE POLICY "Anyone can submit reports"
  ON reports FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only service role (admin) can read/update reports
-- (Admin uses service client which bypasses RLS)

-- 7. Update place_order to v4: payment reference + new-store order limits
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
  v_monthly_count integer;
  v_monthly_value integer;
BEGIN
  -- Check merchant status
  SELECT m.store_status, m.created_at INTO v_merchant
  FROM merchants m WHERE m.id = p_merchant_id;

  IF v_merchant IS NULL THEN
    RAISE EXCEPTION 'Merchant not found';
  END IF;

  IF v_merchant.store_status <> 'active' THEN
    RAISE EXCEPTION 'This store is not currently accepting orders';
  END IF;

  -- TRUST-07: Order limits for new stores (< 30 days old)
  IF v_merchant.created_at > (now() - interval '30 days') THEN
    SELECT COUNT(*), COALESCE(SUM(subtotal_nad + delivery_fee_nad - discount_nad), 0)
    INTO v_monthly_count, v_monthly_value
    FROM orders
    WHERE merchant_id = p_merchant_id
      AND created_at >= date_trunc('month', now())
      AND status <> 'cancelled';

    IF v_monthly_count >= 10 THEN
      RAISE EXCEPTION 'New store order limit reached (10 orders per month). Contact support to increase your limit.';
    END IF;

    IF v_monthly_value + p_subtotal_nad + p_delivery_fee > 500000 THEN  -- N$5,000 in cents
      RAISE EXCEPTION 'New store monthly value limit reached (N$5,000). Contact support to increase your limit.';
    END IF;
  END IF;

  -- Validate and apply coupon if provided
  IF p_coupon_code IS NOT NULL AND p_coupon_code <> '' THEN
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

  -- Create order
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

  -- TRUST-06: Generate payment reference
  v_payment_ref := 'OSHI-' || UPPER(SUBSTRING(v_order_id::text FROM 1 FOR 8));
  UPDATE orders SET payment_reference = v_payment_ref WHERE id = v_order_id;

  -- Insert order items + deduct stock where tracked
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

-- 8. Update RLS on merchants: public can only see active stores
DROP POLICY IF EXISTS "Public can view active merchants" ON merchants;
CREATE POLICY "Public can view active stores"
  ON merchants FOR SELECT
  TO anon
  USING (is_active = true AND store_status = 'active');

-- Authenticated users can still see their own store regardless of status
DROP POLICY IF EXISTS "Users can view own merchant" ON merchants;
CREATE POLICY "Users can view own merchant"
  ON merchants FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR (is_active = true AND store_status = 'active'));
