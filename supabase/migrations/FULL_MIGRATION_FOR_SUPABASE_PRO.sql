-- ============================================================
-- OshiCart — Full Migration for Supabase Pro
-- Run this in Supabase Dashboard > SQL Editor
-- Project: pcseqiaqeiiaiqxqtfmw
-- ============================================================
-- This combines migrations 001-010 into a single script.
-- NOTE: Storage buckets (002) are separate — run after this.
-- ============================================================

-- ============================================
-- 001: Initial Schema
-- ============================================

-- Enums
CREATE TYPE merchant_tier AS ENUM ('free', 'pro', 'business');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
CREATE TYPE delivery_method AS ENUM ('pickup', 'delivery');

-- Merchants
CREATE TABLE merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  store_slug TEXT NOT NULL UNIQUE,
  description TEXT,
  whatsapp_number TEXT NOT NULL,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_holder TEXT,
  bank_branch_code TEXT,
  logo_url TEXT,
  tier merchant_tier NOT NULL DEFAULT 'free',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_user UNIQUE (user_id)
);

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_nad INTEGER NOT NULL CHECK (price_nad >= 0),
  images TEXT[] NOT NULL DEFAULT '{}',
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  order_number INTEGER NOT NULL,
  customer_name TEXT NOT NULL,
  customer_whatsapp TEXT NOT NULL,
  delivery_method delivery_method NOT NULL DEFAULT 'pickup',
  delivery_address TEXT,
  status order_status NOT NULL DEFAULT 'pending',
  subtotal_nad INTEGER NOT NULL CHECK (subtotal_nad >= 0),
  proof_of_payment_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_order_per_merchant UNIQUE (merchant_id, order_number)
);

-- Order Items
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  product_price INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total INTEGER NOT NULL CHECK (line_total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Store Analytics
CREATE TABLE store_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  page_views INTEGER NOT NULL DEFAULT 0,
  orders_placed INTEGER NOT NULL DEFAULT 0,
  orders_confirmed INTEGER NOT NULL DEFAULT 0,
  revenue_nad INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_analytics_per_day UNIQUE (merchant_id, date)
);

-- Indexes
CREATE INDEX idx_products_merchant ON products(merchant_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_available ON products(merchant_id, is_available);
CREATE INDEX idx_orders_merchant ON orders(merchant_id);
CREATE INDEX idx_orders_status ON orders(merchant_id, status);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_categories_merchant ON categories(merchant_id);
CREATE INDEX idx_store_analytics_merchant_date ON store_analytics(merchant_id, date);
CREATE INDEX idx_merchants_slug ON merchants(store_slug);

-- Function: auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER merchants_updated_at BEFORE UPDATE ON merchants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_analytics ENABLE ROW LEVEL SECURITY;

-- Merchants
CREATE POLICY "Merchants: owner full access"
  ON merchants FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Merchants: public read active stores"
  ON merchants FOR SELECT
  USING (is_active = true);

-- Categories
CREATE POLICY "Categories: owner full access"
  ON categories FOR ALL
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()))
  WITH CHECK (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY "Categories: public read"
  ON categories FOR SELECT
  USING (true);

-- Products
CREATE POLICY "Products: owner full access"
  ON products FOR ALL
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()))
  WITH CHECK (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY "Products: public read available"
  ON products FOR SELECT
  USING (is_available = true);

-- Orders
CREATE POLICY "Orders: owner read and update"
  ON orders FOR SELECT
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY "Orders: owner update status"
  ON orders FOR UPDATE
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY "Orders: anyone can place"
  ON orders FOR INSERT
  WITH CHECK (true);

-- Order Items
CREATE POLICY "Order Items: owner read"
  ON order_items FOR SELECT
  USING (order_id IN (
    SELECT id FROM orders WHERE merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Order Items: anyone can insert"
  ON order_items FOR INSERT
  WITH CHECK (true);

-- Store Analytics
CREATE POLICY "Analytics: owner full access"
  ON store_analytics FOR ALL
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()))
  WITH CHECK (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

-- ============================================
-- 003: Delivery Scheduling
-- ============================================

ALTER TABLE merchants ADD COLUMN IF NOT EXISTS delivery_slots JSONB DEFAULT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_date TEXT DEFAULT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_time TEXT DEFAULT NULL;

-- ============================================
-- 005: Inventory, Industry, Delivery Fee
-- ============================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS track_inventory boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_quantity integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS low_stock_threshold integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS allow_backorder boolean DEFAULT false;

ALTER TABLE products
  ADD CONSTRAINT stock_quantity_non_negative
  CHECK (allow_backorder = true OR stock_quantity >= 0);

ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS industry text DEFAULT 'other';

ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS delivery_fee_nad integer DEFAULT 0;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_fee_nad integer DEFAULT 0;

-- Stock Adjustments audit trail
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  previous_quantity integer NOT NULL,
  new_quantity integer NOT NULL,
  change integer NOT NULL,
  reason text NOT NULL DEFAULT 'manual',
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can read own stock adjustments"
  ON stock_adjustments FOR SELECT
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY "Merchants can insert own stock adjustments"
  ON stock_adjustments FOR INSERT
  WITH CHECK (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_products_low_stock
  ON products (merchant_id, stock_quantity)
  WHERE track_inventory = true;

CREATE INDEX IF NOT EXISTS idx_stock_adjustments_product
  ON stock_adjustments (product_id, created_at DESC);

-- ============================================
-- 008: Payment Methods
-- ============================================

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('eft', 'cod', 'momo', 'ewallet');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS accepted_payment_methods text[] DEFAULT '{eft}',
  ADD COLUMN IF NOT EXISTS momo_number text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ewallet_number text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ewallet_provider text DEFAULT NULL;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_method payment_method DEFAULT 'eft';

-- ============================================
-- 009: Coupons
-- ============================================

DO $$ BEGIN
  CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  code text NOT NULL,
  discount_type discount_type NOT NULL DEFAULT 'fixed',
  discount_value integer NOT NULL CHECK (discount_value > 0),
  min_order_nad integer DEFAULT 0,
  max_uses integer DEFAULT NULL,
  current_uses integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz DEFAULT NULL,
  expires_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_code_per_merchant UNIQUE (merchant_id, code)
);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_nad integer DEFAULT 0;

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coupons: owner full access"
  ON coupons FOR ALL
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()))
  WITH CHECK (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY "Coupons: public read active"
  ON coupons FOR SELECT
  USING (is_active = true);

CREATE TRIGGER coupons_updated_at BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_coupons_merchant ON coupons(merchant_id);
CREATE INDEX IF NOT EXISTS idx_coupons_lookup ON coupons(merchant_id, code);

-- ============================================
-- 004/010: Order Number Trigger + place_order v3 RPC
-- ============================================

-- Auto-increment order number per merchant (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.generate_order_number()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $func$
BEGIN
  SELECT COALESCE(MAX(order_number), 0) + 1
    INTO NEW.order_number
    FROM orders
   WHERE merchant_id = NEW.merchant_id;
  RETURN NEW;
END;
$func$;

CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL OR NEW.order_number = 0)
  EXECUTE FUNCTION generate_order_number();

-- place_order v3: payment method + coupon/discount + stock deduction
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

-- ============================================
-- 007: Auto-restock on cancel trigger
-- ============================================

CREATE OR REPLACE FUNCTION restock_on_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item record;
  v_product record;
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    FOR v_item IN
      SELECT oi.product_id, oi.quantity
      FROM order_items oi
      WHERE oi.order_id = NEW.id
    LOOP
      SELECT id, track_inventory, stock_quantity
      INTO v_product
      FROM products
      WHERE id = v_item.product_id
      FOR UPDATE;

      IF v_product IS NOT NULL AND v_product.track_inventory THEN
        UPDATE products
        SET stock_quantity = stock_quantity + v_item.quantity,
            updated_at = now()
        WHERE id = v_product.id;

        INSERT INTO stock_adjustments (
          product_id, merchant_id, previous_quantity, new_quantity,
          change, reason, order_id
        ) VALUES (
          v_product.id, NEW.merchant_id, v_product.stock_quantity,
          v_product.stock_quantity + v_item.quantity,
          v_item.quantity, 'cancel', NEW.id
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restock_on_cancel ON orders;
CREATE TRIGGER trg_restock_on_cancel
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION restock_on_cancel();

-- ============================================
-- GRANTS (managed Supabase already has these roles)
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
