-- 038_pop_required.sql
-- Per-merchant toggle: require proof of payment at checkout for EFT orders.
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS pop_required boolean NOT NULL DEFAULT false;
