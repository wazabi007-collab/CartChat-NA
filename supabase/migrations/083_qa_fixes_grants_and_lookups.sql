-- QA audit follow-ups, applied to production 15 Aug 2026.

-- ─── 1. The Orders page could not load for any merchant (QA-024) ────────────
-- Migration 055 locked `merchants` to an explicit column allow-list so bank
-- details could not be selected by a signed-in user. uses_ready_step was
-- added later and never added to that list, so the Orders page's SELECT
-- returned 42501, the page read any error as "this user has no store", and
-- every configured merchant was redirected to Setup.
--
-- It is a workflow preference the merchant sets themselves, in the same class
-- as pop_required and cart_recovery_enabled, which are already granted.
-- scripts/check-merchant-column-grants.ts now fails the build if a merchant
-- SELECT names a column outside the grant.
grant select (uses_ready_step) on merchants to authenticated;

-- ─── 2. Looking a user up by email was a table download ─────────────────────
-- /api/auth/signup fetched a 1000-row page of users and compared in
-- JavaScript, so past 1000 users duplicate emails stop being detected — and
-- every signup paid for the fetch. /api/check-email was worse: it asked for
-- perPage:1 and checked whether that one arbitrary user matched the address,
-- so it answered "does not exist" for nearly every real address. The
-- forgot-password identity check had the same shape.
--
-- auth.users.email is uniquely indexed, so this is an index probe. Returns
-- only what the sign-in flows need — never the password hash, never another
-- user. service_role only, so no client role can enumerate accounts.
create or replace function public.auth_user_lookup(p_email text)
returns table (user_id uuid, email_confirmed boolean, providers text[])
language sql
security definer
set search_path = public, auth
stable
as $$
  select
    u.id,
    u.email_confirmed_at is not null,
    coalesce(
      (select array_agg(distinct i.provider) from auth.identities i where i.user_id = u.id),
      '{}'::text[]
    )
  from auth.users u
  where lower(u.email) = lower(p_email)
  limit 1;
$$;

revoke all on function public.auth_user_lookup(text) from public, anon, authenticated;
grant execute on function public.auth_user_lookup(text) to service_role;

-- Same problem on the WhatsApp sign-in path: it scanned a 1000-row page and
-- matched user_metadata in JavaScript, so a merchant registered past that page
-- was told "no account found with this WhatsApp number" and could not sign in.
create or replace function public.auth_user_lookup_by_phone(
  p_normalized text,
  p_raw text default null
)
returns table (user_id uuid, email text)
language sql
security definer
set search_path = public, auth
stable
as $$
  select u.id, u.email::text
  from auth.users u
  where u.raw_user_meta_data ->> 'whatsapp_number' = p_normalized
     or (p_raw is not null and u.phone = p_raw)
  limit 1;
$$;

revoke all on function public.auth_user_lookup_by_phone(text, text) from public, anon, authenticated;
grant execute on function public.auth_user_lookup_by_phone(text, text) to service_role;

-- ─── 3. A backup table was world-readable over the REST API ─────────────────
-- _backup_product_descriptions_20260807 sits in the PostgREST-exposed public
-- schema with RLS off, so anyone could GET it and read all 243 rows.
-- Descriptions are public on a live storefront, but a backup also holds text a
-- merchant has since edited or had removed by moderation.
--
-- Deliberately NOT dropped — it is someone's backup. RLS on with no policies
-- hides it from anon and authenticated while service_role can still restore.
alter table public._backup_product_descriptions_20260807 enable row level security;
revoke all on public._backup_product_descriptions_20260807 from anon, authenticated;
