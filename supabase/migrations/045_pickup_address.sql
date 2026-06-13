ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS pickup_address text DEFAULT NULL;
