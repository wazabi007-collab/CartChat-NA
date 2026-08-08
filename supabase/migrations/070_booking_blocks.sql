-- Times a merchant is not taking bookings: a day off, a lunch hour, a slot
-- held for a walk-in.
--
-- block_time NULL means the whole day. block_date is text to match
-- orders.delivery_date (legacy). Enforced inside place_order's booking section
-- alongside the double-booking check, under the same advisory lock -- greying
-- slots out in the picker is cosmetic, and a customer with a stale page must
-- still be rejected ("That time is not available.").
--
-- Verified against production with the test store, then fully reverted:
--   whole-day block  -> booking rejected
--   single-slot block-> that slot rejected, neighbouring slot accepted
CREATE TABLE IF NOT EXISTS public.booking_blocks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  block_date  text NOT NULL CHECK (block_date ~ '^\d{4}-\d{2}-\d{2}$'),
  block_time  text,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, block_date, block_time)
);

CREATE INDEX IF NOT EXISTS booking_blocks_merchant_date_idx
  ON public.booking_blocks (merchant_id, block_date);

ALTER TABLE public.booking_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY booking_blocks_owner_select ON public.booking_blocks
  FOR SELECT TO authenticated
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()));
CREATE POLICY booking_blocks_owner_insert ON public.booking_blocks
  FOR INSERT TO authenticated
  WITH CHECK (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()));
CREATE POLICY booking_blocks_owner_delete ON public.booking_blocks
  FOR DELETE TO authenticated
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()));

REVOKE ALL ON public.booking_blocks FROM anon;
GRANT SELECT, INSERT, DELETE ON public.booking_blocks TO authenticated;
