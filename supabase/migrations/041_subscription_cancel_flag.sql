-- 041_subscription_cancel_flag.sql
-- Merchant self-service cancel: flag the sub to not renew. The existing
-- lifecycle cron lapses it (grace -> suspended) at period end; no tier change.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;
