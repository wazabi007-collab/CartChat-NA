-- ============================================================
-- 033 — Pre-launch security fixes
-- Addresses launch blockers C1, C3, C4, C7, H5 from
-- LAUNCH_READINESS_REVIEW.md. Idempotent where practical.
-- ============================================================

-- ------------------------------------------------------------
-- C1: append_order_status — enforce merchant ownership.
-- The RPC is SECURITY DEFINER (bypasses orders RLS), was callable
-- by any authenticated/anon user, and had no ownership check —
-- a cross-tenant IDOR write. Add an ownership guard and lock down
-- EXECUTE to authenticated only.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.append_order_status(p_order_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owns boolean;
BEGIN
  -- Caller must own the merchant that owns this order.
  SELECT EXISTS (
    SELECT 1
    FROM orders o
    JOIN merchants m ON m.id = o.merchant_id
    WHERE o.id = p_order_id
      AND m.user_id = auth.uid()
  ) INTO v_owns;

  IF NOT v_owns THEN
    RAISE EXCEPTION 'Not authorized to update this order';
  END IF;

  -- The ::order_status cast rejects any value outside the enum.
  UPDATE orders
  SET status = p_status::order_status,
      status_history = status_history || jsonb_build_array(
        jsonb_build_object('status', p_status, 'at', now())
      )
  WHERE id = p_order_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.append_order_status(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.append_order_status(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.append_order_status(uuid, text) TO authenticated;

-- ------------------------------------------------------------
-- C4: DPO subscription columns + schema drift.
-- These columns are read/written by the DPO checkout/create/callback
-- and admin UI but were never created by a migration. Adding them
-- here makes a clean deploy reproducible (IF NOT EXISTS = no-op in
-- the live DB where they were added out-of-band).
-- ------------------------------------------------------------
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS pending_tier          subscription_tier,
  ADD COLUMN IF NOT EXISTS pending_months        integer,
  ADD COLUMN IF NOT EXISTS pending_amount_cents  integer,
  ADD COLUMN IF NOT EXISTS dpo_transaction_token text,
  ADD COLUMN IF NOT EXISTS payment_reference     text;

CREATE INDEX IF NOT EXISTS idx_subscriptions_dpo_token
  ON public.subscriptions(dpo_transaction_token);

-- ------------------------------------------------------------
-- C3: subscriptions self-upgrade.
-- The merchant UPDATE RLS policy only checks ownership; RLS cannot
-- restrict columns, so a merchant could set tier/status/period
-- directly and unlock paid features for free. A BEFORE UPDATE
-- trigger restricts logged-in end users to non-entitlement columns
-- (payment_reference / updated_at). Service-role (DPO callback) and
-- pg_cron (suspension job) run with auth.uid() = NULL and are
-- intentionally exempt.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_subscription_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only restrict authenticated end users (real JWT with a subject).
  -- service_role and pg_cron/direct DB callers have auth.uid() = NULL.
  IF auth.uid() IS NOT NULL THEN
    IF NEW.merchant_id          IS DISTINCT FROM OLD.merchant_id
       OR NEW.tier                 IS DISTINCT FROM OLD.tier
       OR NEW.status               IS DISTINCT FROM OLD.status
       OR NEW.trial_ends_at        IS DISTINCT FROM OLD.trial_ends_at
       OR NEW.current_period_start IS DISTINCT FROM OLD.current_period_start
       OR NEW.current_period_end   IS DISTINCT FROM OLD.current_period_end
       OR NEW.grace_ends_at        IS DISTINCT FROM OLD.grace_ends_at
       OR NEW.soft_suspended_at    IS DISTINCT FROM OLD.soft_suspended_at
       OR NEW.pending_tier         IS DISTINCT FROM OLD.pending_tier
       OR NEW.pending_months       IS DISTINCT FROM OLD.pending_months
       OR NEW.pending_amount_cents IS DISTINCT FROM OLD.pending_amount_cents
       OR NEW.dpo_transaction_token IS DISTINCT FROM OLD.dpo_transaction_token
    THEN
      RAISE EXCEPTION 'Subscription entitlement fields can only be changed by the system';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS subscriptions_guard_update ON public.subscriptions;
CREATE TRIGGER subscriptions_guard_update
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.guard_subscription_update();

-- ------------------------------------------------------------
-- H5: owner UPDATE policies missing WITH CHECK.
-- Without WITH CHECK, an owner could UPDATE a row they own and
-- reassign merchant_id/user_id to another tenant, or rewrite order
-- financial fields. Re-create each owner UPDATE policy with a
-- matching WITH CHECK so the NEW row must still belong to the caller.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Orders: owner update status" ON public.orders;
CREATE POLICY "Orders: owner update status" ON public.orders
  FOR UPDATE
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid())))
  WITH CHECK (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Categories: owner update" ON public.categories;
CREATE POLICY "Categories: owner update" ON public.categories
  FOR UPDATE TO authenticated
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid())))
  WITH CHECK (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Products: owner update" ON public.products;
CREATE POLICY "Products: owner update" ON public.products
  FOR UPDATE TO authenticated
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid())))
  WITH CHECK (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Coupons: owner update" ON public.coupons;
CREATE POLICY "Coupons: owner update" ON public.coupons
  FOR UPDATE TO authenticated
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid())))
  WITH CHECK (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Merchants: owner update" ON public.merchants;
CREATE POLICY "Merchants: owner update" ON public.merchants
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ------------------------------------------------------------
-- C7: order-proofs storage cross-tenant read.
-- The SELECT policy granted read of the whole private bucket to any
-- authenticated user. Files live under `${merchant_id}/...`, so scope
-- reads to the owning merchant. All app uploads/signed URLs go through
-- the service-role server route (which bypasses RLS), so the broad
-- anon INSERT policy is unnecessary and is removed.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Order proofs: authenticated read" ON storage.objects;
DROP POLICY IF EXISTS "Order proofs: anyone upload" ON storage.objects;

CREATE POLICY "Order proofs: owner read" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'order-proofs'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.merchants WHERE user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- H7: revoke an admin's sessions on password reset.
-- supabase auth.admin.updateUserById does not invalidate existing
-- refresh tokens/sessions, and admin.signOut only accepts a JWT (not a
-- user id). This SECURITY DEFINER helper lets the service role terminate
-- ALL sessions for a user by id, so a password reset forces re-auth
-- everywhere (the account may be compromised at reset time).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_revoke_user_sessions(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.refresh_tokens WHERE user_id = p_user_id::text;
  DELETE FROM auth.sessions WHERE user_id = p_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_revoke_user_sessions(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_revoke_user_sessions(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_revoke_user_sessions(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_user_sessions(uuid) TO service_role;

-- ------------------------------------------------------------
-- H1 (constraint half): forbid negative delivery fees on orders.
-- The amount-reconciliation half is in 034 (place_order v6).
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_delivery_fee_non_negative'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_delivery_fee_non_negative CHECK (delivery_fee_nad >= 0);
  END IF;
END $$;
