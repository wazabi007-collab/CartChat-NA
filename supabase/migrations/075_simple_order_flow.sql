-- Let a merchant choose a two-step order flow instead of three.
--
-- pending -> confirmed -> ready -> completed is right for a restaurant, where
-- "ready for collection" is a real moment the customer needs. For a home baker
-- delivering the same afternoon it is a step with no meaning, and each step
-- costs taps AND sends the customer another WhatsApp message.
--
-- Default true so no existing merchant's flow changes underneath them.
ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS uses_ready_step boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.merchants.uses_ready_step IS
  'When false the dashboard offers confirmed -> completed directly and the '
  'order_ready message is never sent. Fewer taps for the merchant, one less '
  'message for the customer.';
