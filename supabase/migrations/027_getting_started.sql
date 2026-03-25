-- 027_getting_started.sql
-- Add columns for Getting Started checklist state

ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS getting_started_dismissed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS store_link_shared BOOLEAN DEFAULT FALSE;
