-- Money returned to customers.
--
-- order_payments records money in; this records money back out. Without it a
-- refunded order showed its payment as "received" forever, so Received
-- stopped matching the bank -- defeating the reconciliation feature -- and a
-- VAT-registered merchant had no credit note against the tax invoice the
-- order already issued.
--
-- Mirrors order_payments exactly: positive cents (the direction lives in the
-- table, not the sign), the merchant's bank-statement date rather than now(),
-- voided not deleted, one row per bank line. Each row is also a credit note,
-- numbered CN-<order>-<seq> and rendered at /credit-note/[id].
CREATE TABLE IF NOT EXISTS public.order_refunds (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid NOT NULL REFERENCES public.orders(id)    ON DELETE CASCADE,
  merchant_id  uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  amount_nad   integer NOT NULL CHECK (amount_nad > 0),
  refunded_at  date NOT NULL,
  method       text,
  reference    text,
  note         text,
  voided_at    timestamptz,
  recorded_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_refunds_merchant_refunded_idx
  ON public.order_refunds (merchant_id, refunded_at);
CREATE INDEX IF NOT EXISTS order_refunds_order_idx
  ON public.order_refunds (order_id);
ALTER TABLE public.order_refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY order_refunds_select_own ON public.order_refunds
  FOR SELECT TO authenticated
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()));
CREATE POLICY order_refunds_insert_own ON public.order_refunds
  FOR INSERT TO authenticated
  WITH CHECK (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()));
CREATE POLICY order_refunds_update_own ON public.order_refunds
  FOR UPDATE TO authenticated
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()))
  WITH CHECK (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()));
REVOKE ALL ON public.order_refunds FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.order_refunds TO authenticated;
