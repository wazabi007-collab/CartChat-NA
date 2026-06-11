-- 043_delivery_estimate.sql
-- Optional merchant-set delivery/prep estimate shown to buyers (free text).
ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS delivery_estimate text DEFAULT NULL;
