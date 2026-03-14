-- Migration 014: Add item_type to products (product vs service)

ALTER TABLE products ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'product';
-- Valid values: 'product', 'service'

-- price_nad = 0 for services means "Request a Quote"
