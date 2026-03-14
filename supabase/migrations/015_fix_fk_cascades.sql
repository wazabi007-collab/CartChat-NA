-- Migration 015: Fix foreign key constraints to allow merchant deletion

-- order_items.product_id: SET NULL on product delete (preserves order history)
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;
ALTER TABLE order_items ADD CONSTRAINT order_items_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

-- payments.merchant_id: CASCADE on merchant delete
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_merchant_id_fkey;
ALTER TABLE payments ADD CONSTRAINT payments_merchant_id_fkey
  FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE;

-- stock_adjustments.merchant_id: CASCADE on merchant delete
ALTER TABLE stock_adjustments DROP CONSTRAINT IF EXISTS stock_adjustments_merchant_id_fkey;
ALTER TABLE stock_adjustments ADD CONSTRAINT stock_adjustments_merchant_id_fkey
  FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE;
