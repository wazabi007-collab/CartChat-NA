-- Migration 056: Abandoned-checkout recovery
--
-- The cart lives only in the buyer's localStorage, so a classic "added to cart
-- then left" is unrecoverable — we hold no contact detail. What IS recoverable
-- is an abandoned CHECKOUT: the buyer typed their name and WhatsApp number on
-- the checkout form but never placed the order. That row is captured here and
-- a single reminder is sent an hour later if no order followed.
--
-- Privacy: this stores a name + phone number for someone who did not complete a
-- purchase, so rows are deleted after 30 days by the reminder cron and the
-- table is service-role only.

CREATE TABLE IF NOT EXISTS abandoned_checkouts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id        uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  customer_name      text NOT NULL,
  customer_whatsapp  text NOT NULL,
  cart_item_count    integer NOT NULL DEFAULT 0,
  cart_total_nad     integer NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  reminder_sent_at   timestamptz,
  recovered_at       timestamptz,
  recovered_order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  -- One open checkout per buyer per store: re-typing details upserts rather
  -- than queueing a second reminder.
  UNIQUE (merchant_id, customer_whatsapp)
);

-- Cron lookup: unreminded, unrecovered, old enough to chase.
CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_pending
  ON abandoned_checkouts (created_at)
  WHERE reminder_sent_at IS NULL AND recovered_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_merchant
  ON abandoned_checkouts (merchant_id);

-- Service-role only: enable RLS and add NO policies, so anon/authenticated
-- clients get nothing. All access goes through server routes.
ALTER TABLE abandoned_checkouts ENABLE ROW LEVEL SECURITY;
GRANT ALL ON abandoned_checkouts TO service_role;

-- Merchant opt-out. On by default; surfaced as a toggle in dashboard settings.
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS cart_recovery_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN merchants.cart_recovery_enabled IS
  'When true (default), buyers who abandon checkout receive one WhatsApp reminder after 1 hour. Requires a paid Oshi-Automate/Pro subscription.';

-- The toggle is merchant-editable, so it must be readable by the owner and
-- writable via the settings page.
GRANT SELECT (cart_recovery_enabled) ON merchants TO anon, authenticated;
