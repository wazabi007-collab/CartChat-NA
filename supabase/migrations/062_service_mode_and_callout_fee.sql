-- Where a service actually happens, and what travel costs.
--
-- Services were treated like goods: the only fulfilment choice was delivery or
-- pickup. That fits a bakery, not a web designer (nothing to deliver), a
-- hairdresser (client comes in), or a plumber (merchant travels).
--
-- Set per service rather than per merchant, so a salon can offer in-salon cuts
-- and online consultations side by side.
--
--   at_store  - the client comes to the merchant
--   at_client - the merchant travels to the client
--   online    - delivered remotely; no address, no travel
--
-- NULL means "not a service", which is every existing row. Nullable on purpose:
-- unlike products.item_type (NOT NULL DEFAULT 'product'), an unset value here
-- stays distinguishable from a deliberate choice.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS service_mode text
  CHECK (service_mode IS NULL OR service_mode IN ('at_store', 'at_client', 'online'));

COMMENT ON COLUMN public.products.service_mode IS
  'Where a service is delivered: at_store, at_client, or online. NULL for goods.';

-- Travel charged when the merchant goes to the client. Kept separate from
-- delivery_fee_nad so a plumber's call-out is not reported as product delivery
-- on invoices and statements.
ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS callout_fee_nad integer NOT NULL DEFAULT 0
  CHECK (callout_fee_nad >= 0);

COMMENT ON COLUMN public.merchants.callout_fee_nad IS
  'Cents charged once per order when any booked service is delivered at_client.';

-- Storefronts filter by service mode when deciding what checkout must collect.
CREATE INDEX IF NOT EXISTS products_service_mode_idx
  ON public.products (merchant_id, service_mode)
  WHERE service_mode IS NOT NULL;
