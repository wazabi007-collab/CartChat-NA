-- Product variants for synced WooCommerce catalogues.

CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'woocommerce',
  source_variation_id text,
  sku text NOT NULL,
  price_nad integer NOT NULL CHECK (price_nad >= 0),
  images text[] NOT NULL DEFAULT '{}',
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_available boolean NOT NULL DEFAULT true,
  stock_status text,
  track_inventory boolean NOT NULL DEFAULT false,
  stock_quantity integer NOT NULL DEFAULT 0,
  allow_backorder boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_variants_source_unique UNIQUE (product_id, source, source_variation_id),
  CONSTRAINT product_variants_sku_unique UNIQUE (product_id, sku),
  CONSTRAINT product_variants_stock_non_negative CHECK (allow_backorder = true OR stock_quantity >= 0)
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_available ON public.product_variants(product_id, is_available);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON public.product_variants(sku);

DROP TRIGGER IF EXISTS product_variants_updated_at ON public.product_variants;
CREATE TRIGGER product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Product variants: public read available" ON public.product_variants;
CREATE POLICY "Product variants: public read available"
  ON public.product_variants FOR SELECT
  USING (
    product_id IN (
      SELECT id FROM public.products
      WHERE is_available = true
        AND deleted_at IS NULL
        AND merchant_id IN (
          SELECT id FROM public.merchants
          WHERE is_active = true AND store_status = 'active'
        )
    )
  );

DROP POLICY IF EXISTS "Product variants: owner full access" ON public.product_variants;
CREATE POLICY "Product variants: owner full access"
  ON public.product_variants FOR ALL
  USING (
    product_id IN (
      SELECT p.id
      FROM public.products p
      JOIN public.merchants m ON m.id = p.merchant_id
      WHERE m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    product_id IN (
      SELECT p.id
      FROM public.products p
      JOIN public.merchants m ON m.id = p.merchant_id
      WHERE m.user_id = auth.uid()
    )
  );

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS product_variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variant_sku text,
  ADD COLUMN IF NOT EXISTS variant_attributes jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_order_items_product_variant_id ON public.order_items(product_variant_id);

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
  v_variant        record;
  v_prev_qty       integer;
  v_coupon         record;
  v_coupon_id      uuid    := NULL;
  v_discount       integer := 0;
  v_merchant       record;
  v_monthly_count  integer;
  v_monthly_value  integer;
  v_store_prefix   text;
  v_token_attempts integer := 0;
  v_line_price     integer;
  v_variant_id     uuid;
  v_variant_attrs  jsonb;
  v_variant_sku    text;
BEGIN
  SELECT m.store_status, m.created_at, m.store_name INTO v_merchant
  FROM merchants m WHERE m.id = p_merchant_id;

  IF v_merchant IS NULL THEN
    RAISE EXCEPTION 'Merchant not found';
  END IF;

  IF v_merchant.store_status <> 'active' THEN
    RAISE EXCEPTION 'This store is not currently accepting orders';
  END IF;

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

    IF v_monthly_value + p_subtotal_nad + p_delivery_fee > 1000000 THEN
      RAISE EXCEPTION 'New store monthly value limit reached (N$10,000). Contact support to increase your limit.';
    END IF;
  END IF;

  LOOP
    v_tracking_token := substr(md5(random()::text || clock_timestamp()::text), 1, 8);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM orders WHERE orders.tracking_token = v_tracking_token);
    v_token_attempts := v_token_attempts + 1;
    IF v_token_attempts > 10 THEN
      RAISE EXCEPTION 'Failed to generate unique tracking token';
    END IF;
  END LOOP;

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
    SELECT id, name, track_inventory, stock_quantity, allow_backorder, price_nad
    INTO v_product
    FROM products
    WHERE id = (v_item->>'productId')::uuid
      AND merchant_id = p_merchant_id
      AND is_available = true
      AND deleted_at IS NULL
    FOR UPDATE;

    IF v_product IS NULL THEN
      RAISE EXCEPTION 'Product not found: %', v_item->>'productId';
    END IF;

    v_variant_id := NULL;
    v_variant_attrs := '{}'::jsonb;
    v_variant_sku := NULL;
    v_line_price := v_product.price_nad;

    IF v_item ? 'variantId' AND COALESCE(v_item->>'variantId', '') <> '' THEN
      SELECT id, sku, price_nad, attributes, track_inventory, stock_quantity, allow_backorder, is_available
      INTO v_variant
      FROM product_variants
      WHERE id = (v_item->>'variantId')::uuid
        AND product_id = v_product.id
      FOR UPDATE;

      IF v_variant IS NULL THEN
        RAISE EXCEPTION 'Product variant not found: %', v_item->>'variantId';
      END IF;

      IF v_variant.is_available <> true THEN
        RAISE EXCEPTION 'Selected variant is unavailable: %', v_variant.sku;
      END IF;

      IF v_variant.track_inventory THEN
        IF v_variant.stock_quantity < (v_item->>'quantity')::integer
           AND NOT v_variant.allow_backorder THEN
          RAISE EXCEPTION 'Insufficient stock for "%". Available: %, Requested: %',
            v_variant.sku, v_variant.stock_quantity, (v_item->>'quantity')::integer;
        END IF;

        UPDATE product_variants
        SET stock_quantity = stock_quantity - (v_item->>'quantity')::integer,
            updated_at = now()
        WHERE id = v_variant.id;
      END IF;

      v_variant_id := v_variant.id;
      v_variant_attrs := v_variant.attributes;
      v_variant_sku := v_variant.sku;
      v_line_price := v_variant.price_nad;
    ELSIF EXISTS (SELECT 1 FROM product_variants WHERE product_id = v_product.id AND is_available = true) THEN
      RAISE EXCEPTION 'Please select product options for "%"', v_product.name;
    END IF;

    IF v_variant_id IS NULL AND v_product.track_inventory THEN
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
      order_id, product_id, product_variant_id, product_name, product_price,
      quantity, line_total, variant_sku, variant_attributes
    ) VALUES (
      v_order_id,
      (v_item->>'productId')::uuid,
      v_variant_id,
      v_item->>'name',
      v_line_price,
      (v_item->>'quantity')::integer,
      (v_line_price * (v_item->>'quantity')::integer),
      v_variant_sku,
      v_variant_attrs
    );
  END LOOP;

  RETURN QUERY SELECT v_order_id, v_order_num, v_payment_ref, v_tracking_token;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.place_order TO anon, authenticated;
