-- ============================================================================
-- place_order — CANONICAL SOURCE (two overloads)
-- ============================================================================
-- The migration files that touched place_order are comment stubs; until this
-- file existed, the only complete source of the function that takes every
-- order on the platform was the database itself. Whoever edits place_order
-- next: change THIS file, apply with CREATE OR REPLACE, commit both together.
--
-- Overload 1 (16 params) is the core: server-side price computation, variant
-- and inventory handling, coupon validation, call-out fee, VAT, new-store
-- limits, and booking conflicts (one appointment per slot, merchant
-- block-outs) under an advisory lock.
--
-- Overload 2 (17 params, +p_delivery_provider) wraps the core for courier
-- orders: Yango/inDrive orders carry no delivery fee because the customer
-- pays the driver directly.
--
-- Snapshot 9 Aug 2026 — each overload's md5 below is of the exact
-- pg_get_functiondef text, verified against production after writing.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.place_order(p_merchant_id uuid, p_customer_name text, p_customer_whatsapp text, p_delivery_method text, p_subtotal_nad integer, p_delivery_address text DEFAULT NULL::text, p_delivery_date date DEFAULT NULL::date, p_delivery_time text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_proof_url text DEFAULT NULL::text, p_items jsonb DEFAULT '[]'::jsonb, p_delivery_fee integer DEFAULT 0, p_payment_method text DEFAULT 'eft'::text, p_coupon_code text DEFAULT NULL::text, p_discount_nad integer DEFAULT 0, p_payment_ref text DEFAULT NULL::text)
 RETURNS TABLE(order_id uuid, order_number integer, payment_reference text, tracking_token text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order_id uuid; v_order_num integer; v_payment_ref text; v_tracking_token text;
  v_item jsonb; v_product record; v_variant record; v_prev_qty integer;
  v_coupon record; v_coupon_id uuid := NULL; v_discount integer := 0;
  v_merchant record; v_monthly_count integer; v_monthly_value integer;
  v_store_prefix text; v_token_attempts integer := 0; v_line_price integer;
  v_variant_id uuid; v_variant_attrs jsonb; v_variant_sku text;
  v_computed_subtotal integer := 0; v_delivery_fee integer := 0;
  v_callout_fee integer := 0;
  v_is_booking boolean := false;
  -- RENTAL (1)
  v_rental_start date; v_rental_end date; v_rental_days integer;
  v_rental_out integer; v_line_total integer; v_deposit_total integer := 0;
  v_taxable_total integer := 0; v_vat_nad integer := 0;
  v_vat_rate_bps integer := 1500; v_has_vat boolean := false;
BEGIN
  SELECT m.store_status, m.is_active, m.created_at, m.store_name, m.delivery_fee_nad,
         COALESCE(m.callout_fee_nad, 0) AS callout_fee_nad,
         m.vat_number, COALESCE(m.vat_inclusive, false) AS vat_inclusive
  INTO v_merchant FROM merchants m WHERE m.id = p_merchant_id;

  IF v_merchant IS NULL THEN RAISE EXCEPTION 'Merchant not found'; END IF;
  IF v_merchant.store_status <> 'active' OR v_merchant.is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'This store is not currently accepting orders';
  END IF;

  IF p_delivery_method = 'delivery' THEN
    v_delivery_fee := COALESCE(v_merchant.delivery_fee_nad, 0);
  ELSE
    v_delivery_fee := 0;
  END IF;

  v_has_vat := COALESCE(TRIM(v_merchant.vat_number), '') <> '';

  IF v_merchant.created_at > (now() - interval '30 days') THEN
    SELECT COUNT(*), COALESCE(SUM(subtotal_nad + delivery_fee_nad - discount_nad + CASE WHEN vat_inclusive THEN 0 ELSE COALESCE(vat_nad, 0) END), 0)
    INTO v_monthly_count, v_monthly_value
    FROM orders
    WHERE merchant_id = p_merchant_id
      AND created_at >= date_trunc('month', now())
      AND status <> 'cancelled';
    IF v_monthly_count >= 10 THEN
      RAISE EXCEPTION 'New store order limit reached (10 orders per month). Contact support to increase your limit.';
    END IF;
  END IF;

  LOOP
    v_tracking_token := replace(gen_random_uuid()::text, '-', '');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM orders WHERE orders.tracking_token = v_tracking_token);
    v_token_attempts := v_token_attempts + 1;
    IF v_token_attempts > 10 THEN RAISE EXCEPTION 'Failed to generate unique tracking token'; END IF;
  END LOOP;

  INSERT INTO orders (
    merchant_id, customer_name, customer_whatsapp,
    delivery_method, delivery_address, delivery_date, delivery_time,
    subtotal_nad, delivery_fee_nad, notes, proof_of_payment_url,
    payment_method, coupon_id, discount_nad,
    vat_nad, vat_rate_bps, vat_inclusive, vat_number,
    tracking_token, status_history
  ) VALUES (
    p_merchant_id, p_customer_name, p_customer_whatsapp,
    p_delivery_method::delivery_method,
    p_delivery_address, p_delivery_date, p_delivery_time,
    0, v_delivery_fee, p_notes, p_proof_url,
    p_payment_method::payment_method,
    NULL, 0, 0, 0, false, NULL,
    v_tracking_token,
    jsonb_build_array(jsonb_build_object('status', 'pending', 'at', now()))
  )
  RETURNING id, orders.order_number INTO v_order_id, v_order_num;

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

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT id, name, track_inventory, stock_quantity, allow_backorder, price_nad,
           item_type, rental_min_days, rental_max_days,
           rental_unit, rental_buffer_days, deposit_nad
    INTO v_product FROM products
    WHERE id = (v_item->>'productId')::uuid
      AND merchant_id = p_merchant_id AND is_available = true AND deleted_at IS NULL
    FOR UPDATE;

    IF v_product IS NULL THEN
      RAISE EXCEPTION 'Product not found: %', v_item->>'productId';
    END IF;

    v_variant_id := NULL; v_variant_attrs := '{}'::jsonb; v_variant_sku := NULL;
    v_line_price := v_product.price_nad;

    IF v_item ? 'variantId' AND COALESCE(v_item->>'variantId', '') <> '' THEN
      SELECT id, sku, price_nad, attributes, track_inventory, stock_quantity, allow_backorder, is_available
      INTO v_variant FROM product_variants
      WHERE id = (v_item->>'variantId')::uuid AND product_id = v_product.id
      FOR UPDATE;

      IF v_variant IS NULL THEN
        RAISE EXCEPTION 'Product variant not found: %', v_item->>'variantId';
      END IF;
      IF v_variant.is_available <> true THEN
        RAISE EXCEPTION 'Selected variant is unavailable: %', v_variant.sku;
      END IF;
      IF v_variant.track_inventory THEN
        IF v_variant.stock_quantity < (v_item->>'quantity')::integer AND NOT v_variant.allow_backorder THEN
          RAISE EXCEPTION 'Insufficient stock for "%". Available: %, Requested: %', v_variant.sku, v_variant.stock_quantity, (v_item->>'quantity')::integer;
        END IF;
        UPDATE product_variants
        SET stock_quantity = stock_quantity - (v_item->>'quantity')::integer, updated_at = now()
        WHERE id = v_variant.id;
      END IF;
      v_variant_id := v_variant.id; v_variant_attrs := v_variant.attributes;
      v_variant_sku := v_variant.sku; v_line_price := v_variant.price_nad;
    ELSIF EXISTS (SELECT 1 FROM product_variants WHERE product_id = v_product.id AND is_available = true) THEN
      RAISE EXCEPTION 'Please select product options for "%"', v_product.name;
    END IF;

    -- RENTAL (2): validate the range, price as rate x days, and refuse when
    -- every unit is already out over those dates. The UI speaks inclusive
    -- first/last day; storage is end-exclusive so touching ranges never clash.
    v_rental_start := NULL; v_rental_end := NULL; v_rental_days := NULL;
    IF v_product.item_type = 'rental' THEN
      IF COALESCE(v_item->>'rentalStart', '') = '' OR COALESCE(v_item->>'rentalEnd', '') = '' THEN
        RAISE EXCEPTION 'Please choose hire dates for "%"', v_product.name;
      END IF;
      v_rental_start := (v_item->>'rentalStart')::date;
      -- 'day' counts inclusively (first and last day both hired days);
      -- 'night' takes the second date as CHECK-OUT, itself not occupied, so
      -- ranges may touch and 15th-18th is 3 nights.
      IF COALESCE(v_product.rental_unit, 'day') = 'night' THEN
        v_rental_end := (v_item->>'rentalEnd')::date;
      ELSE
        v_rental_end := (v_item->>'rentalEnd')::date + 1;
      END IF;
      IF v_rental_start < CURRENT_DATE THEN
        RAISE EXCEPTION 'The hire for "%" cannot start in the past', v_product.name;
      END IF;
      IF v_rental_end <= v_rental_start THEN
        RAISE EXCEPTION 'The return day for "%" is before the first day', v_product.name;
      END IF;
      v_rental_days := v_rental_end - v_rental_start;
      IF v_rental_days < COALESCE(v_product.rental_min_days, 1) THEN
        RAISE EXCEPTION 'Minimum hire for "%" is % day(s)', v_product.name, v_product.rental_min_days;
      END IF;
      IF v_rental_days > COALESCE(v_product.rental_max_days, 30) THEN
        RAISE EXCEPTION 'Maximum hire for "%" is % day(s)', v_product.name, v_product.rental_max_days;
      END IF;
      IF COALESCE(v_product.stock_quantity, 0) < 1 THEN
        RAISE EXCEPTION '"%" is not available for hire right now', v_product.name;
      END IF;

      -- Serialise per product so two carts cannot both take the last unit.
      PERFORM pg_advisory_xact_lock(hashtext('rental|' || v_product.id::text));

      SELECT COALESCE(SUM(oi.quantity), 0) INTO v_rental_out
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.product_id = v_product.id
        AND o.id <> v_order_id
        AND o.status <> 'cancelled'
        AND oi.rental_start IS NOT NULL
        -- Buffer: each hire blocks its turnaround days after return, so a
        -- car gets cleaned and a dress gets washed before going out again.
        AND oi.rental_start < v_rental_end + COALESCE(v_product.rental_buffer_days, 0)
        AND oi.rental_end_exclusive + COALESCE(v_product.rental_buffer_days, 0) > v_rental_start;

      IF v_rental_out + (v_item->>'quantity')::integer > v_product.stock_quantity THEN
        RAISE EXCEPTION 'Only % of "%" available for those dates',
          GREATEST(v_product.stock_quantity - v_rental_out, 0), v_product.name;
      END IF;

      -- Deposit: per unit hired, refundable, NOT revenue and NOT taxed.
      v_deposit_total := v_deposit_total
        + COALESCE(v_product.deposit_nad, 0) * (v_item->>'quantity')::integer;
    END IF;

    -- RENTAL (3): rentals come back, so they never consume stock.
    IF v_variant_id IS NULL AND v_product.track_inventory AND v_product.item_type <> 'rental' THEN
      IF v_product.stock_quantity < (v_item->>'quantity')::integer AND NOT v_product.allow_backorder THEN
        RAISE EXCEPTION 'Insufficient stock for "%". Available: %, Requested: %', v_product.name, v_product.stock_quantity, (v_item->>'quantity')::integer;
      END IF;
      v_prev_qty := v_product.stock_quantity;
      UPDATE products
      SET stock_quantity = stock_quantity - (v_item->>'quantity')::integer, updated_at = now()
      WHERE id = v_product.id;
      INSERT INTO stock_adjustments (product_id, merchant_id, previous_quantity, new_quantity, change, reason, order_id)
      VALUES (v_product.id, p_merchant_id, v_prev_qty, v_prev_qty - (v_item->>'quantity')::integer, -(v_item->>'quantity')::integer, 'order', v_order_id);
    END IF;

    v_line_total := v_line_price * (v_item->>'quantity')::integer * COALESCE(v_rental_days, 1);
    v_computed_subtotal := v_computed_subtotal + v_line_total;

    INSERT INTO order_items (order_id, product_id, product_variant_id, product_name, product_price, quantity, line_total, variant_sku, variant_attributes, rental_start, rental_end_exclusive, rental_days)
    VALUES (v_order_id, (v_item->>'productId')::uuid, v_variant_id, v_item->>'name', v_line_price, (v_item->>'quantity')::integer, v_line_total, v_variant_sku, v_variant_attrs, v_rental_start, v_rental_end, v_rental_days);
  END LOOP;

  -- BOOKING (2): this order books a service if any validated item is one and
  -- the customer chose a date and time.
  IF p_delivery_date IS NOT NULL AND COALESCE(p_delivery_time, '') <> '' THEN
    SELECT EXISTS (
      SELECT 1 FROM order_items oi
      JOIN products pr ON pr.id = oi.product_id
      WHERE oi.order_id = v_order_id AND pr.item_type = 'service'
    ) INTO v_is_booking;
  END IF;

  IF v_is_booking THEN
    PERFORM pg_advisory_xact_lock(
      hashtext(p_merchant_id::text || '|' || p_delivery_date::text || '|' || p_delivery_time)
    );

    -- BOOKING (3b): the merchant has blocked this day or this slot.
    IF EXISTS (
      SELECT 1 FROM booking_blocks b
      WHERE b.merchant_id = p_merchant_id
        AND b.block_date = p_delivery_date::text
        AND (b.block_time IS NULL OR b.block_time = p_delivery_time)
    ) THEN
      RAISE EXCEPTION 'That time is not available. Please choose another slot.';
    END IF;

    -- BOOKING (3): one appointment per slot.
    IF EXISTS (
      SELECT 1 FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products pr ON pr.id = oi.product_id
      WHERE o.merchant_id = p_merchant_id
        AND o.id <> v_order_id
        AND o.delivery_date = p_delivery_date::text
        AND o.delivery_time = p_delivery_time
        AND o.status <> 'cancelled'
        AND pr.item_type = 'service'
    ) THEN
      RAISE EXCEPTION 'That time has just been booked. Please choose another slot.';
    END IF;
  END IF;

  IF p_coupon_code IS NOT NULL AND p_coupon_code <> '' THEN
    SELECT * INTO v_coupon FROM coupons
    WHERE merchant_id = p_merchant_id AND code = UPPER(TRIM(p_coupon_code)) AND is_active = true
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
    IF v_coupon.min_order_nad > 0 AND v_computed_subtotal < v_coupon.min_order_nad THEN
      RAISE EXCEPTION 'Order subtotal does not meet the minimum for coupon "%"', v_coupon.code;
    END IF;

    IF v_coupon.discount_type = 'percentage' THEN
      v_discount := LEAST(v_computed_subtotal, (v_computed_subtotal * v_coupon.discount_value) / 100);
    ELSE
      v_discount := LEAST(v_computed_subtotal, v_coupon.discount_value);
    END IF;

    v_coupon_id := v_coupon.id;
    UPDATE coupons SET current_uses = current_uses + 1 WHERE id = v_coupon_id;
  END IF;

  SELECT CASE WHEN EXISTS (
           SELECT 1 FROM order_items oi
           JOIN products pr ON pr.id = oi.product_id
           WHERE oi.order_id = v_order_id AND pr.service_mode = 'at_client'
         ) THEN COALESCE(v_merchant.callout_fee_nad, 0) ELSE 0 END
  INTO v_callout_fee;

  v_taxable_total := GREATEST(0, v_computed_subtotal - v_discount + v_delivery_fee + v_callout_fee);

  IF v_has_vat THEN
    IF v_merchant.vat_inclusive THEN
      v_vat_nad := ROUND((v_taxable_total::numeric * v_vat_rate_bps) / (10000 + v_vat_rate_bps))::integer;
    ELSE
      v_vat_nad := ROUND((v_taxable_total::numeric * v_vat_rate_bps) / 10000)::integer;
    END IF;
  ELSE
    v_vat_rate_bps := 0; v_vat_nad := 0;
  END IF;

  IF v_merchant.created_at > (now() - interval '30 days') THEN
    IF (v_monthly_value + v_taxable_total + CASE WHEN v_merchant.vat_inclusive THEN 0 ELSE v_vat_nad END) > 1000000 THEN
      RAISE EXCEPTION 'New store monthly value limit reached (N$10,000). Contact support to increase your limit.';
    END IF;
  END IF;

  UPDATE orders
  SET subtotal_nad = v_computed_subtotal,
      discount_nad = v_discount,
      coupon_id = v_coupon_id,
      callout_fee_nad = v_callout_fee,
      deposit_nad = v_deposit_total,
      vat_nad = v_vat_nad,
      vat_rate_bps = v_vat_rate_bps,
      vat_inclusive = CASE WHEN v_has_vat THEN v_merchant.vat_inclusive ELSE false END,
      vat_number = CASE WHEN v_has_vat THEN v_merchant.vat_number ELSE NULL END
  WHERE id = v_order_id;

  RETURN QUERY SELECT v_order_id, v_order_num, v_payment_ref, v_tracking_token;
END;
$function$

CREATE OR REPLACE FUNCTION public.place_order(p_merchant_id uuid, p_customer_name text, p_customer_whatsapp text, p_delivery_method text, p_subtotal_nad integer, p_delivery_provider text, p_delivery_address text DEFAULT NULL::text, p_delivery_date date DEFAULT NULL::date, p_delivery_time text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_proof_url text DEFAULT NULL::text, p_items jsonb DEFAULT '[]'::jsonb, p_delivery_fee integer DEFAULT 0, p_payment_method text DEFAULT 'eft'::text, p_coupon_code text DEFAULT NULL::text, p_discount_nad integer DEFAULT 0, p_payment_ref text DEFAULT NULL::text)
 RETURNS TABLE(order_id uuid, order_number integer, payment_reference text, tracking_token text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_provider text := lower(coalesce(nullif(trim(p_delivery_provider), ''), 'store'));
  v_order_id uuid;
  v_order_number integer;
  v_payment_reference text;
  v_tracking_token text;
BEGIN
  IF p_delivery_method <> 'delivery' THEN
    v_provider := 'store';
  END IF;

  IF v_provider NOT IN ('store', 'yango', 'indrive') THEN
    RAISE EXCEPTION 'Invalid delivery provider: %', p_delivery_provider;
  END IF;

  IF p_delivery_method = 'delivery' AND v_provider IN ('yango', 'indrive') THEN
    SELECT po.order_id, po.order_number, po.payment_reference, po.tracking_token
    INTO v_order_id, v_order_number, v_payment_reference, v_tracking_token
    FROM public.place_order(
      p_merchant_id,
      p_customer_name,
      p_customer_whatsapp,
      'pickup',
      p_subtotal_nad,
      NULL,
      NULL,
      NULL,
      p_notes,
      p_proof_url,
      p_items,
      0,
      p_payment_method,
      p_coupon_code,
      p_discount_nad,
      p_payment_ref
    ) AS po;

    UPDATE public.orders
    SET delivery_method = 'delivery'::delivery_method,
        delivery_address = p_delivery_address,
        delivery_date = p_delivery_date,
        delivery_time = p_delivery_time,
        delivery_fee_nad = 0,
        delivery_provider = v_provider
    WHERE id = v_order_id;
  ELSE
    SELECT po.order_id, po.order_number, po.payment_reference, po.tracking_token
    INTO v_order_id, v_order_number, v_payment_reference, v_tracking_token
    FROM public.place_order(
      p_merchant_id,
      p_customer_name,
      p_customer_whatsapp,
      p_delivery_method,
      p_subtotal_nad,
      p_delivery_address,
      p_delivery_date,
      p_delivery_time,
      p_notes,
      p_proof_url,
      p_items,
      p_delivery_fee,
      p_payment_method,
      p_coupon_code,
      p_discount_nad,
      p_payment_ref
    ) AS po;

    UPDATE public.orders
    SET delivery_provider = 'store'
    WHERE id = v_order_id;
  END IF;

  RETURN QUERY SELECT v_order_id, v_order_number, v_payment_reference, v_tracking_token;
END;
$function$
