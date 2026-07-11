-- Migration 052: Store location (region + town)
-- Sellers declare where they sell from so customers can see the town and
-- filter the Browse page by region. Both columns nullable (existing stores).

ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS region text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS town   text DEFAULT NULL;

-- Region filter on the public Browse page (active stores only)
CREATE INDEX IF NOT EXISTS idx_merchants_region
  ON merchants (region)
  WHERE is_active = true AND store_status = 'active';
