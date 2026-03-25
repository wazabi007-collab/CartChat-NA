-- 026_phone_otp_codes.sql
-- Stores WhatsApp OTP codes for phone-based authentication
-- OTP codes are SHA-256 hashed before storage for security

CREATE TABLE phone_otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by phone + unexpired
CREATE INDEX idx_phone_otp_lookup ON phone_otp_codes (phone, expires_at DESC)
  WHERE verified = FALSE;

-- RLS: service-role only (no direct client access)
ALTER TABLE phone_otp_codes ENABLE ROW LEVEL SECURITY;

-- Auto-cleanup: delete expired codes older than 1 hour
CREATE OR REPLACE FUNCTION cleanup_expired_otp_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM phone_otp_codes
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup every 30 minutes via pg_cron (if available)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('cleanup-otp-codes', '*/30 * * * *', 'SELECT cleanup_expired_otp_codes()');
  END IF;
END $$;
