-- Migration 009: Discount/coupon codes
-- Creates coupons table and adds discount columns to orders

-- 1. Discount type enum
DO $$ BEGIN
  CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Coupons table
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

-- 3. Add discount columns to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_nad integer DEFAULT 0;

-- 4. RLS
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coupons: owner full access"
  ON coupons FOR ALL
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()))
  WITH CHECK (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY "Coupons: public read active"
  ON coupons FOR SELECT
  USING (is_active = true);

-- 5. Updated_at trigger (reuse existing function)
CREATE TRIGGER coupons_updated_at BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_coupons_merchant ON coupons(merchant_id);
CREATE INDEX IF NOT EXISTS idx_coupons_lookup ON coupons(merchant_id, code);

-- 7. Grants
GRANT ALL ON coupons TO anon, authenticated, service_role;
