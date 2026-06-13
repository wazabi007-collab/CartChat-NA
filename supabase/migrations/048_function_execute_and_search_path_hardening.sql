-- Migration 048: lock down maintenance/trigger/helper functions.
--
-- (A) Revoke the default PUBLIC EXECUTE grant (which is what exposed these to anon /
--     authenticated via /rest/v1/rpc/...) on functions that should never be callable from
--     the public API. place_order (anon checkout) and append_order_status (merchant
--     dashboard) are intentionally left callable. Trigger functions fire as the table owner
--     regardless of grants; the two maintenance functions invoked by service-role cron
--     routes are re-granted to service_role so they keep working.
--
-- (B) Pin search_path on the functions the linter flagged as role-mutable
--     (0011_function_search_path_mutable).

-- (A) EXECUTE grants ----------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.check_expired_subscriptions()      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_otp_codes()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_order_number()           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_subscription_update()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_orders_update()             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restock_on_cancel()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reject_unapproved_order_item()     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_merchant_safety_scan()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_product_safety_scan()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_merchant_safety_review()   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_product_safety_review()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.safety_scan_values(text[])         FROM PUBLIC, anon, authenticated;

-- Keep the service-role cron paths working.
GRANT EXECUTE ON FUNCTION public.check_expired_subscriptions() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_otp_codes()   TO service_role;

-- (B) Pin search_path on the role-mutable functions ---------------------------
ALTER FUNCTION public.cleanup_expired_otp_codes()      SET search_path = public;
ALTER FUNCTION public.guard_orders_update()            SET search_path = public;
ALTER FUNCTION public.reject_unapproved_order_item()   SET search_path = public;
ALTER FUNCTION public.apply_merchant_safety_scan()     SET search_path = public;
ALTER FUNCTION public.apply_product_safety_scan()      SET search_path = public;
ALTER FUNCTION public.enqueue_merchant_safety_review() SET search_path = public;
ALTER FUNCTION public.enqueue_product_safety_review()  SET search_path = public;
ALTER FUNCTION public.safety_scan_values(text[])       SET search_path = public;
