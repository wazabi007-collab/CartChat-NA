-- Migration 055: Stop public harvesting of merchant payment details
--
-- PROBLEM: the `anon` and `authenticated` roles held SELECT on all 43 columns of
-- `merchants`, and the RLS policy "Public can view active stores" filters only
-- ROWS (is_active AND store_status='active'), never COLUMNS. The anon key ships
-- publicly in the site's JavaScript, so anyone could enumerate every active
-- merchant's bank account number, account holder, branch code and every payment
-- phone number in a single REST call.
--
-- FIX: column-level grants. anon/authenticated may read only the columns the
-- public storefront actually needs. Payment credentials are readable solely by
-- the service role (checkout + invoice render server-side) and by the owning
-- merchant via get_my_merchant() below.
--
-- NOTE: INSERT/UPDATE grants are deliberately left intact — the setup wizard and
-- settings page must still write these columns. RLS continues to restrict which
-- rows may be written.

-- ─── 1. SELECT: replace blanket access with an explicit public column set ────
REVOKE SELECT ON merchants FROM anon;
REVOKE SELECT ON merchants FROM authenticated;

-- Public storefront/browse columns. Deliberately EXCLUDES:
--   bank_account_number, bank_account_holder, bank_branch_code,
--   momo_number, ewallet_number, pay2cell_number, paytoday_number,
--   api_key, safety_notes, prohibited_policy_accepted_ip,
--   referred_by_code, is_demo
GRANT SELECT (
  id, user_id, store_name, store_slug, description, whatsapp_number,
  bank_name, logo_url, is_active, created_at, updated_at, delivery_slots,
  industry, delivery_fee_nad, accepted_payment_methods, ewallet_provider,
  store_status, vat_number, vat_inclusive, pickup_address,
  getting_started_dismissed, store_link_shared, pop_required,
  delivery_estimate, enabled_delivery_providers, region, town,
  tos_accepted_at, suspended_reason,
  prohibited_policy_accepted_at, prohibited_policy_version
) ON merchants TO anon, authenticated;

-- ─── 2. Owner escape hatch ──────────────────────────────────────────────────
-- Column grants are role-wide and cannot vary per row, so a merchant reading
-- their OWN payment details needs a definer function. Returns exactly one row
-- (the caller's own merchant record) or nothing.
CREATE OR REPLACE FUNCTION get_my_merchant()
RETURNS SETOF merchants
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT * FROM merchants WHERE user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION get_my_merchant() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_my_merchant() TO authenticated;

COMMENT ON FUNCTION get_my_merchant() IS
  'Returns the calling user''s own merchant row with all columns, including payment credentials that column-level grants hide from direct table SELECT. Safe: hard-filtered on auth.uid().';
