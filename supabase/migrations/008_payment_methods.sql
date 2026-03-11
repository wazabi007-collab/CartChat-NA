-- Migration 008: Payment methods — COD, MoMo, eWallet support
-- Adds payment_method to orders and payment config to merchants

-- 1. Payment method enum
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('eft', 'cod', 'momo', 'ewallet');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add payment config to merchants
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS accepted_payment_methods text[] DEFAULT '{eft}',
  ADD COLUMN IF NOT EXISTS momo_number text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ewallet_number text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ewallet_provider text DEFAULT NULL;

-- 3. Add payment_method to orders (existing orders default to 'eft')
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_method payment_method DEFAULT 'eft';
