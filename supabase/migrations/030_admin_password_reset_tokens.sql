-- Admin-only password reset tokens.
-- Tokens are stored hashed and consumed server-side before updating Supabase Auth.

CREATE TABLE IF NOT EXISTS admin_password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_password_reset_tokens_lookup
  ON admin_password_reset_tokens (token_hash, expires_at)
  WHERE used_at IS NULL;

ALTER TABLE admin_password_reset_tokens ENABLE ROW LEVEL SECURITY;
