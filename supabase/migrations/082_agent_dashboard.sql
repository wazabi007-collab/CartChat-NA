-- Migration 082: Referral agents can read their own referral data
--
-- PROBLEM: a `referrers` row has no auth identity. An application is inserted
-- by the service role from /api/agents/apply and keyed on the WhatsApp number,
-- so an approved agent has nothing to sign in to and every fact about their own
-- referrals — code, referred stores, commission owed — lives behind the admin
-- console. A successful application is a dead end (QA-003).
--
-- FIX: link a referrer to an auth.users row, then let THAT user read its own
-- referral data. Row scoping is RLS and column scoping is column grants,
-- mirroring merchants (011 + 055). The page query is never the security
-- boundary; it can only ever re-filter what the database already returned.
--
-- ─── READ THIS BEFORE ADDING A SELF-SERVICE CLAIM ───────────────────────────
-- user_id is set deliberately by an admin, never derived from anything the
-- signed-in user asserts. /api/auth/signup creates accounts through
-- auth.admin.createUser({ email_confirm: true }), so a "confirmed" email in
-- this project proves nothing about who controls the mailbox: matching
-- referrers.email against the caller's email would let anyone who registers an
-- agent's address take over that agent's dashboard and payout history.
-- referrers.whatsapp has the same problem — it is self-declared on the public
-- application form and never verified.
--
-- To link an approved agent (service role only; RLS below grants the caller no
-- write path to this column):
--   UPDATE public.referrers SET user_id = '<auth.users.id>' WHERE code = '<code>';
-- The unique index makes a mislink loud instead of silent: one auth user can
-- own at most one agent code.

-- ─── 0. Drop the blanket grants FIRST, or none of the below scopes anything ─
-- Both tables still carried Supabase's default GRANT ALL to anon and
-- authenticated; 053 never revoked it. That was inert only while the tables
-- had zero policies. The moment the "agent reads own row" policy below exists,
-- a table-wide SELECT grant hands a linked agent every column of their row —
-- payout_number (bank account), whatsapp, email, admin notes — and the
-- INSERT/UPDATE/DELETE grants sit one permissive policy away from writable.
-- A column allow-list is only an allow-list once the table-wide grant is gone.
-- (Same failure mode as order_items in 081.) Every other reader of these
-- tables is the service client, which bypasses grants, so nothing else breaks.
REVOKE ALL ON public.referrers FROM anon, authenticated;
REVOKE ALL ON public.referral_payouts FROM anon, authenticated;

ALTER TABLE public.referrers
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_referrers_user_id
  ON public.referrers (user_id) WHERE user_id IS NOT NULL;

-- ─── 1. referrers: the agent may read their own row, and only their own ─────
-- The table has had RLS on with zero policies since 053 (service-role island).
-- This is the first policy, so nothing that works today changes: an unlinked
-- row still matches no policy for anon/authenticated and stays invisible.
DROP POLICY IF EXISTS "Agents read own referrer row" ON public.referrers;
CREATE POLICY "Agents read own referrer row" ON public.referrers
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Column grants are role-wide, so this list is the hard ceiling on what any
-- signed-in user can ever pull out of `referrers` — deliberately excluding
-- payout_number (bank account), whatsapp, email and notes (admin-only review
-- notes). user_id is granted because the referral_payouts policy below
-- subqueries it; RLS still pins it to the caller's own uid.
-- No INSERT/UPDATE/DELETE grant: an agent cannot approve themselves by
-- flipping status/is_active, nor rewrite the bank account they get paid into.
GRANT SELECT (
  id, code, name, status, is_active, created_at, accepted_terms_at, user_id
) ON public.referrers TO authenticated;

-- ─── 2. referral_payouts: the agent's own commission ledger ─────────────────
DROP POLICY IF EXISTS "Agents read own payouts" ON public.referral_payouts;
CREATE POLICY "Agents read own payouts" ON public.referral_payouts
  FOR SELECT TO authenticated
  USING (
    referrer_code IN (
      SELECT code FROM public.referrers WHERE user_id = (SELECT auth.uid())
    )
  );

-- admin_note and paid_by are internal finance workflow, not the agent's
-- business; they stay unreadable at the column level.
GRANT SELECT (
  id, referrer_code, merchant_id, commission_nad, paid_reference, paid_at
) ON public.referral_payouts TO authenticated;

-- ─── 3. Referred merchants: definer function, because grants can't do this ──
-- An agent needs milestone state for stores that are NOT publicly visible yet
-- (a merchant who signed up but has not gone live), and both the
-- merchants.referred_by_code column and the whole subscriptions table are
-- unreadable to them — 055 deliberately withheld referred_by_code from every
-- non-service role, and subscriptions RLS is merchant-owner-only. Same
-- situation as get_my_merchant():
-- per-row visibility that role-wide column grants cannot express, so the
-- function IS the projection.
--
-- What comes back is the whole contract: store name, whether it is live, when
-- it joined, and its plan. No whatsapp_number, no bank or wallet fields, no
-- address, no orders, no buyers — an agent learns that their store is trading,
-- never who it trades with. Bounty is NOT computed here on purpose:
-- REFERRAL_BOUNTY_NAD in src/lib/constants.ts is the single source of truth and
-- a copy of the tier table in SQL would drift the moment prices move.
CREATE OR REPLACE FUNCTION public.get_my_referred_merchants()
RETURNS TABLE (
  merchant_id uuid,
  store_name  text,
  store_live  boolean,
  joined_at   timestamptz,
  tier        text,
  sub_status  text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  -- Every column below stays alias-qualified: in a SQL-language function the
  -- RETURNS TABLE names are substituted into the body, so a bare `store_name`
  -- or `merchant_id` would collide with the output parameter of that name.
  SELECT
    m.id,
    m.store_name,
    (m.is_active AND m.store_status = 'active'),
    m.created_at,
    COALESCE(s.tier::text, 'oshi_start'),
    COALESCE(s.status::text, 'trial')
  FROM merchants m
  JOIN referrers r ON r.code = m.referred_by_code
  LEFT JOIN subscriptions s ON s.merchant_id = m.id
  WHERE r.user_id = auth.uid()
  ORDER BY m.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_my_referred_merchants() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_referred_merchants() TO authenticated;

COMMENT ON FUNCTION public.get_my_referred_merchants() IS
  'Milestone state of the stores referred by the calling agent: store name, live flag, join date and plan only. Safe: hard-filtered on referrers.user_id = auth.uid(), and the projection carries no merchant contact, payment or customer data.';
