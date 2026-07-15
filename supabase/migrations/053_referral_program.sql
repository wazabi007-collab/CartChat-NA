-- Migration 053: Referral program (Phase 1)
-- Admin-created promoters refer merchants; bounty tracked for manual payout.

CREATE TABLE IF NOT EXISTS referrers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text NOT NULL UNIQUE,
  name          text NOT NULL,
  whatsapp      text,
  payout_number text,
  is_active     boolean NOT NULL DEFAULT true,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_referrers_code_active ON referrers (code) WHERE is_active = true;

ALTER TABLE merchants ADD COLUMN IF NOT EXISTS referred_by_code text DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_merchants_referred_by ON merchants (referred_by_code) WHERE referred_by_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS referral_payouts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_code  text NOT NULL,
  merchant_id    uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  commission_nad integer NOT NULL,
  paid_reference text,
  admin_note     text,
  paid_by        uuid,
  paid_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (merchant_id)
);

-- Service-role / admin only: enable RLS but add NO policies, so anon/authenticated
-- clients get nothing and only the service_role key can read/write.
ALTER TABLE referrers ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_payouts ENABLE ROW LEVEL SECURITY;
GRANT ALL ON referrers TO service_role;
GRANT ALL ON referral_payouts TO service_role;
