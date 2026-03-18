-- place_order v5: adds tracking_token generation and status_history initialization

DROP FUNCTION IF EXISTS public.place_order(uuid, text, text, text, integer, text, date, text, text, text, jsonb, integer, text, text, integer, text);

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
  p_discount_nad      integer DEFAULT 0,
  p_payment_ref       text    DEFAULT NULL
)
RETURNS TABLE(order_id uuid, order_number integer, payment_reference text, tracking_token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_order_id       uuid;
  v_order_num      integer;
  v_payment_ref    text;
  v_tracking_token text;
  v_item           jsonb;
  v_product        record;
  v_prev_qty       integer;
  v_coupon         record;
  v_coupon_id      uuid    := NULL;
  v_discount       integer := 0;
  v_merchant       record;
  v_monthly_count  integer;
  v_monthly_value  integer;
  v_store_prefix   text;
  v_token_attempts integer := 0;
BEGIN
  -- Check merchant status
  SELECT m.store_status, m.created_at, m.store_name INTO v_merchant
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

    IF v_monthly_value + p_subtotal_nad + p_delivery_fee > 500000 THEN
      RAISE EXCEPTION 'New store monthly value limit reached (N$5,000). Contact support to increase your limit.';
    END IF;
  END IF;

  -- Generate unique tracking token (8 chars, alphanumeric-ish via md5)
  LOOP
    v_tracking_token := substr(md5(random()::text || clock_timestamp()::text), 1, 8);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM orders WHERE orders.tracking_token = v_tracking_token);
    v_token_attempts := v_token_attempts + 1;
    IF v_token_attempts > 10 THEN
      RAISE EXCEPTION 'Failed to generate unique tracking token';
    END IF;
  END LOOP;

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

  -- Create order (with tracking_token and status_history)
  INSERT INTO orders (
    merchant_id, customer_name, customer_whatsapp,
    delivery_method, delivery_address, delivery_date, delivery_time,
    subtotal_nad, delivery_fee_nad, notes, proof_of_payment_url,
    payment_method, coupon_id, discount_nad,
    tracking_token, status_history
  ) VALUES (
    p_merchant_id, p_customer_name, p_customer_whatsapp,
    p_delivery_method::delivery_method,
    p_delivery_address, p_delivery_date, p_delivery_time,
    p_subtotal_nad, p_delivery_fee, p_notes, p_proof_url,
    p_payment_method::payment_method,
    v_coupon_id,
    v_discount,
    v_tracking_token,
    jsonb_build_array(jsonb_build_object('status', 'pending', 'at', now()))
  )
  RETURNING id, orders.order_number INTO v_order_id, v_order_num;

  -- Generate payment reference
  IF p_payment_ref IS NOT NULL AND p_payment_ref <> '' THEN
    v_payment_ref := p_payment_ref;
  ELSE
    v_store_prefix := UPPER(REGEXP_REPLACE(v_merchant.store_name, '[^A-Za-z]', '', 'g'));
    v_store_prefix := SUBSTRING(v_store_prefix FROM 1 FOR 4);
    IF LENGTH(v_store_prefix) < 3 THEN
      v_store_prefix := v_store_prefix || REPEAT('X', 3 - LENGTH(v_store_prefix));
    END IF;
    v_payment_ref := v_store_prefix || '-' || UPPER(SUBSTRING(v_order_id::text FROM 1 FOR 8));
  END IF;

  UPDATE orders SET payment_reference = v_payment_ref WHERE id = v_order_id;

  -- Insert order items + deduct stock
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

  RETURN QUERY SELECT v_order_id, v_order_num, v_payment_ref, v_tracking_token;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.place_order TO anon, authenticated;
