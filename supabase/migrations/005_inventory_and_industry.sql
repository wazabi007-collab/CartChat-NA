-- Migration 005: Inventory tracking, Industry field, Delivery fee

-- 1. Add inventory fields to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS track_inventory boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_quantity integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS low_stock_threshold integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS allow_backorder boolean DEFAULT false;

-- 2. Constraint: stock can't go negative unless backorder allowed
ALTER TABLE products
  ADD CONSTRAINT stock_quantity_non_negative
  CHECK (allow_backorder = true OR stock_quantity >= 0);

-- 3. Add industry to merchants
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS industry text DEFAULT 'other';

-- 4. Add delivery fee to merchants (default store-wide flat rate in cents)
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS delivery_fee_nad integer DEFAULT 0;

-- 5. Add delivery fee snapshot to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_fee_nad integer DEFAULT 0;

-- 6. Stock adjustments audit trail
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

-- 7. RLS for stock_adjustments
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can read own stock adjustments"
  ON stock_adjustments FOR SELECT
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY "Merchants can insert own stock adjustments"
  ON stock_adjustments FOR INSERT
  WITH CHECK (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

-- 8. Index for low stock queries
CREATE INDEX IF NOT EXISTS idx_products_low_stock
  ON products (merchant_id, stock_quantity)
  WHERE track_inventory = true;

-- 9. Index for stock adjustments by product
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_product
  ON stock_adjustments (product_id, created_at DESC);

-- 10. Grants for new table
GRANT ALL ON stock_adjustments TO anon, authenticated, service_role;
