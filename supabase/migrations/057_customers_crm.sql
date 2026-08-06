-- Migration 057: Customer records (merchant CRM)
--
-- Until now a buyer existed only as denormalised strings on each order row, so
-- a merchant could not see who their customers were, who came back, or what any
-- of them were worth. This adds a per-merchant customer identity.
--
-- Design notes:
--  * Customers are scoped PER MERCHANT, never global. Merchant A must not learn
--    anything about merchant B's buyers, so there is no shared customer table.
--  * Lifetime stats (order count, spend) are NOT stored here. They are derived
--    from `orders` at read time, which cannot drift when an order is cancelled,
--    edited or refunded. This table stores identity plus merchant-owned
--    metadata only.
--  * Buyers are anonymous (no auth user), so identity is the normalised
--    WhatsApp number, which is also how the merchant contacts them.

CREATE TABLE IF NOT EXISTS customers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id       uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  whatsapp          text NOT NULL,
  name              text,
  notes             text,
  -- Merchant-set flag for future bulk messaging; respected before any
  -- non-transactional send.
  marketing_opt_out boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, whatsapp)
);

CREATE INDEX IF NOT EXISTS idx_customers_merchant ON customers (merchant_id);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- A merchant may read and manage only their own customers.
DROP POLICY IF EXISTS "Merchants manage own customers" ON customers;
CREATE POLICY "Merchants manage own customers" ON customers
  FOR ALL TO authenticated
  USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = (SELECT auth.uid()))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON customers TO authenticated;
GRANT ALL ON customers TO service_role;

-- ─── Auto-create the customer when an order is placed ───────────────────────
-- A trigger (rather than app code) so every path creates the record: checkout,
-- admin tooling, imports. Keeps the newest non-empty name.
CREATE OR REPLACE FUNCTION upsert_customer_from_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.customer_whatsapp IS NULL OR btrim(NEW.customer_whatsapp) = '' THEN
    RETURN NEW;
  END IF;

  INSERT INTO customers (merchant_id, whatsapp, name)
  VALUES (NEW.merchant_id, btrim(NEW.customer_whatsapp), NULLIF(btrim(COALESCE(NEW.customer_name, '')), ''))
  ON CONFLICT (merchant_id, whatsapp) DO UPDATE
    SET name = COALESCE(EXCLUDED.name, customers.name),
        updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_upsert_customer_from_order ON orders;
CREATE TRIGGER trg_upsert_customer_from_order
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION upsert_customer_from_order();

-- ─── Backfill from existing orders ──────────────────────────────────────────
-- DISTINCT ON keeps the most recent non-empty name per (merchant, number).
INSERT INTO customers (merchant_id, whatsapp, name, created_at)
SELECT DISTINCT ON (o.merchant_id, btrim(o.customer_whatsapp))
       o.merchant_id,
       btrim(o.customer_whatsapp),
       NULLIF(btrim(COALESCE(o.customer_name, '')), ''),
       min(o.created_at) OVER (PARTITION BY o.merchant_id, btrim(o.customer_whatsapp))
FROM orders o
WHERE o.customer_whatsapp IS NOT NULL
  AND btrim(o.customer_whatsapp) <> ''
ORDER BY o.merchant_id,
         btrim(o.customer_whatsapp),
         (NULLIF(btrim(COALESCE(o.customer_name, '')), '') IS NULL),
         o.created_at DESC
ON CONFLICT (merchant_id, whatsapp) DO NOTHING;

-- ─── Applied as 057b/057c: aggregate RPC + phone normalisation ──────────────
-- See migrations 057b_merchant_customers_rpc and 057c_normalise_customer_phones
-- in the Supabase migration history. They add:
--   * get_merchant_customers(uuid) — customer list with lifetime stats
--     aggregated in Postgres (spend excludes cancelled orders, mirrors
--     getOrderPayableTotal); ownership-checked against auth.uid().
--   * normalize_na_phone(text) — mirrors normalizeNamibianPhone() so a buyer
--     who types 0811247930 one day and +264811247930 the next is ONE customer.
--     The trigger, the backfill and the stats join all use it.
