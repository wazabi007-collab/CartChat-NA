-- Merchant-controlled delivery couriers + PayToday as its own payment method.
ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS enabled_delivery_providers text[] NOT NULL DEFAULT '{store,yango,indrive}',
  ADD COLUMN IF NOT EXISTS paytoday_number text DEFAULT NULL;

-- Backfill: merchants who used PayToday-as-eWallet move to the new method.
UPDATE public.merchants
SET paytoday_number = ewallet_number,
    accepted_payment_methods = array_replace(accepted_payment_methods, 'ewallet', 'paytoday'),
    ewallet_provider = NULL,
    ewallet_number = NULL
WHERE ewallet_provider = 'paytoday';
