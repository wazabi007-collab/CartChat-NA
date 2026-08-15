-- Rentals, phase 1: day-based hire (docs/design/rentals.md).
-- Products: rental_min_days / rental_max_days; price_nad is the PER-DAY rate
-- for rental items and stock_quantity means "how many units exist".
-- Order lines: the hire itself, stored [first, last+1) end-exclusive so
-- touching ranges never clash; rental_days computed server-side.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS rental_min_days integer NOT NULL DEFAULT 1
    CHECK (rental_min_days >= 1),
  ADD COLUMN IF NOT EXISTS rental_max_days integer NOT NULL DEFAULT 30
    CHECK (rental_max_days >= 1);
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS rental_start date,
  ADD COLUMN IF NOT EXISTS rental_end_exclusive date,
  ADD COLUMN IF NOT EXISTS rental_days integer;
CREATE INDEX IF NOT EXISTS order_items_rental_range_idx
  ON public.order_items (product_id, rental_start, rental_end_exclusive)
  WHERE rental_start IS NOT NULL;
