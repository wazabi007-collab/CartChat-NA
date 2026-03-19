-- Migration 025: DPO payment gateway support

-- 1. Add 'dpo' to payment_method enum
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'dpo';

-- 2. Store DPO transaction token on the order for verification/callback lookups
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dpo_transaction_token text DEFAULT NULL;

-- 3. Index for fast callback lookups by DPO token
CREATE INDEX IF NOT EXISTS idx_orders_dpo_token ON orders (dpo_transaction_token) WHERE dpo_transaction_token IS NOT NULL;
