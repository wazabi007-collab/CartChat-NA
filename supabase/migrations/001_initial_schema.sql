-- ChatCart NA — Initial Database Schema
-- Run this in Supabase SQL Editor

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

-- Function: auto-increment order number per merchant
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  SELECT COALESCE(MAX(order_number), 0) + 1
  INTO NEW.order_number
  FROM orders
  WHERE merchant_id = NEW.merchant_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL OR NEW.order_number = 0)
  EXECUTE FUNCTION generate_order_number();

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

-- Merchants: owners manage their own store
CREATE POLICY "Merchants: owner full access"
  ON merchants FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Merchants: public read active stores"
  ON merchants FOR SELECT
  USING (is_active = true);

-- Categories: owners manage, public reads
CREATE POLICY "Categories: owner full access"
  ON categories FOR ALL
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()))
  WITH CHECK (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY "Categories: public read"
  ON categories FOR SELECT
  USING (true);

-- Products: owners manage, public reads available
CREATE POLICY "Products: owner full access"
  ON products FOR ALL
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()))
  WITH CHECK (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY "Products: public read available"
  ON products FOR SELECT
  USING (is_available = true);

-- Orders: owners read/update, anyone can insert
CREATE POLICY "Orders: owner read and update"
  ON orders FOR SELECT
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY "Orders: owner update status"
  ON orders FOR UPDATE
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY "Orders: anyone can place"
  ON orders FOR INSERT
  WITH CHECK (true);

-- Order Items: owners read, insert with order
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

-- Store Analytics: owners only
CREATE POLICY "Analytics: owner full access"
  ON store_analytics FOR ALL
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()))
  WITH CHECK (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

-- ============================================
-- GRANTS (for Docker / local Supabase)
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- ============================================
-- STORAGE BUCKETS
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('merchant-assets', 'merchant-assets', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('order-proofs', 'order-proofs', false);

CREATE POLICY "Merchant assets: public read" ON storage.objects FOR SELECT USING (bucket_id = 'merchant-assets');
CREATE POLICY "Merchant assets: owner upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'merchant-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Merchant assets: owner delete" ON storage.objects FOR DELETE USING (bucket_id = 'merchant-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Order proofs: anyone upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'order-proofs');
CREATE POLICY "Order proofs: authenticated read" ON storage.objects FOR SELECT USING (bucket_id = 'order-proofs' AND auth.role() = 'authenticated');
