-- Agents apply themselves at /agents instead of being hand-created.
-- An application is a referrers row with status=pending, is_active=false;
-- the code cannot credit signups until approved in the admin console.
-- accepted_terms_at records rules acceptance, required at submission.
ALTER TABLE public.referrers
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS accepted_terms_at timestamptz,
  ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.referrers
  DROP CONSTRAINT IF EXISTS referrers_status_check;
ALTER TABLE public.referrers
  ADD CONSTRAINT referrers_status_check CHECK (status IN ('pending', 'active', 'rejected'));
