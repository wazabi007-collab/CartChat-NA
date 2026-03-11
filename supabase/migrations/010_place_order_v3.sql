-- Migration 010: place_order v3 — payment method + coupon/discount support
-- Replaces the 12-arg v2 function with a 15-arg v3

-- Drop old function first (12-arg v2)
DROP FUNCTION IF EXISTS public.place_order(uuid, text, text, text, integer, text, date, text, text, text, jsonb, integer);

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
  p_discount_nad      integer DEFAULT 0  -- ignored, calculated server-side
)
RETURNS TABLE(order_id uuid, order_number integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_order_id     uuid;
  v_order_num    integer;
  v_item         jsonb;
  v_product      record;
  v_prev_qty     integer;
  v_coupon       record;
  v_coupon_id    uuid    := NULL;
  v_discount     integer := 0;
BEGIN
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

    -- Check expiry
    IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
      RAISE EXCEPTION 'Coupon "%" has expired', v_coupon.code;
    END IF;

    -- Check start date
    IF v_coupon.starts_at IS NOT NULL AND v_coupon.starts_at > now() THEN
      RAISE EXCEPTION 'Coupon "%" is not yet active', v_coupon.code;
    END IF;

    -- Check max uses
    IF v_coupon.max_uses IS NOT NULL AND v_coupon.current_uses >= v_coupon.max_uses THEN
      RAISE EXCEPTION 'Coupon "%" has reached its usage limit', v_coupon.code;
    END IF;

    -- Check minimum order
    IF v_coupon.min_order_nad > 0 AND p_subtotal_nad < v_coupon.min_order_nad THEN
      RAISE EXCEPTION 'Order subtotal does not meet the minimum for coupon "%"', v_coupon.code;
    END IF;

    -- Calculate discount server-side (never trust client)
    IF v_coupon.discount_type = 'percentage' THEN
      v_discount := LEAST(p_subtotal_nad, (p_subtotal_nad * v_coupon.discount_value) / 100);
    ELSE
      v_discount := LEAST(p_subtotal_nad, v_coupon.discount_value);
    END IF;

    v_coupon_id := v_coupon.id;

    -- Increment usage
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

  RETURN QUERY SELECT v_order_id, v_order_num;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.place_order TO anon, authenticated;
