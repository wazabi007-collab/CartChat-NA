-- Travel charged when a booked service is delivered at the customer's place.
--
-- Kept in its own column rather than folded into delivery_fee_nad so a
-- plumber's call-out is not reported as product delivery on invoices and
-- statements.
--
-- Populated by place_order, which must derive it server-side from the ordered
-- products' service_mode. That function change is NOT in this migration --
-- see 064_place_order_callout.sql, which is written but not yet applied.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS callout_fee_nad integer NOT NULL DEFAULT 0
  CHECK (callout_fee_nad >= 0);

COMMENT ON COLUMN public.orders.callout_fee_nad IS
  'Cents charged for merchant travel when any ordered service is at_client.';
