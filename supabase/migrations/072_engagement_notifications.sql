-- One row per engagement message ever sent, so the cron can never nag.
-- Kinds: activation_day1/3, win_back (one per merchant), booking_reminder
-- (one per order). The cron INSERTs a claim BEFORE sending; a unique
-- violation means another run already sent it. Claim-then-send means a
-- crashed run can at worst send nothing, never twice.
-- Service-role only: RLS enabled with no policies, all grants revoked.
CREATE TABLE IF NOT EXISTS public.engagement_notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES public.merchants(id) ON DELETE CASCADE,
  order_id    uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  kind        text NOT NULL,
  sent_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS engagement_once_per_merchant
  ON public.engagement_notifications (merchant_id, kind) WHERE order_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS engagement_once_per_order
  ON public.engagement_notifications (order_id, kind) WHERE order_id IS NOT NULL;
ALTER TABLE public.engagement_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.engagement_notifications FROM anon, authenticated;
