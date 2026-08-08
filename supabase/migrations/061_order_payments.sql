-- Customer payments against orders.
--
-- Until now OshiCart recorded that an order existed, never that it was paid.
-- Statements could therefore report what was invoiced but not what arrived,
-- which is not enough to tick a line off a bank statement.
--
-- A table rather than paid_at/amount columns on orders, because reconciliation
-- follows bank lines: one order can be settled by a deposit and then a balance,
-- and one transfer can cover two orders. Columns cannot express either. The
-- ordinary case -- paid once, in full -- is still a single row.
--
-- NOTE: `payments` already exists and means something else entirely (merchants
-- paying OshiCart for their subscription). This is customers paying merchants.
CREATE TABLE IF NOT EXISTS public.order_payments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid NOT NULL REFERENCES public.orders(id)    ON DELETE CASCADE,
  merchant_id  uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,

  -- Cents, like every other money column. Must be positive: a refund is a
  -- different thing and is not modelled here.
  amount_nad   integer NOT NULL CHECK (amount_nad > 0),

  -- The day the money actually landed, entered by the merchant from their bank
  -- statement. Deliberately a date, not a timestamp: bank statements are daily,
  -- and asking a merchant for a time would invite guesses.
  paid_at      date NOT NULL,

  method       text,
  reference    text,
  note         text,

  -- Mis-keyed payments are voided, never deleted, so the audit trail survives.
  -- Mirrors the voided_at pattern on the subscription payments table.
  voided_at    timestamptz,
  recorded_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_payments_merchant_paid_idx
  ON public.order_payments (merchant_id, paid_at);
CREATE INDEX IF NOT EXISTS order_payments_order_idx
  ON public.order_payments (order_id);

ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;

-- A merchant may only ever see or touch payments belonging to their own store.
DROP POLICY IF EXISTS order_payments_select_own ON public.order_payments;
CREATE POLICY order_payments_select_own ON public.order_payments
  FOR SELECT TO authenticated
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS order_payments_insert_own ON public.order_payments;
CREATE POLICY order_payments_insert_own ON public.order_payments
  FOR INSERT TO authenticated
  WITH CHECK (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS order_payments_update_own ON public.order_payments;
CREATE POLICY order_payments_update_own ON public.order_payments
  FOR UPDATE TO authenticated
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()))
  WITH CHECK (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()));

-- Buyers never read payment records.
REVOKE ALL ON public.order_payments FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.order_payments TO authenticated;
