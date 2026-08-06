-- Migration 054: Demo stores
-- Flags a merchant as an internal/reseller demo store so admin can tell it
-- apart from real customers (e.g. when reading revenue, merchant counts or
-- deciding who to chase for payment). Purely informational — it does not
-- change what the merchant can do, and demo stores stay fully functional.

ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN merchants.is_demo IS
  'True for internal/reseller demo stores. Excluded from real-customer reporting; admin-only flag.';

-- Partial index: demo stores are a tiny subset, so only index the true rows.
CREATE INDEX IF NOT EXISTS idx_merchants_is_demo
  ON merchants (is_demo) WHERE is_demo = true;
