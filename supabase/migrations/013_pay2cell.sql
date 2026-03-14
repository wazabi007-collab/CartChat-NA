-- Migration 013: Add FNB Pay2Cell payment method

-- 1. Add pay2cell to payment_method enum
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'pay2cell';

-- 2. Add pay2cell_number column to merchants
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS pay2cell_number text DEFAULT NULL;
