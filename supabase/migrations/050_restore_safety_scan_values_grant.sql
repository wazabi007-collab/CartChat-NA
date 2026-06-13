-- Migration 050: corrective. Migration 048 revoked EXECUTE on safety_scan_values from
-- anon/authenticated, but this helper is called BY the merchant/product safety-scan triggers
-- (apply_merchant_safety_scan, enqueue_merchant_safety_review, apply_product_safety_scan),
-- which are SECURITY INVOKER and therefore run as the inserting user. Revoking it broke
-- merchant store creation and product creation ("permission denied for function
-- safety_scan_values"). safety_scan_values is a STABLE, side-effect-free text scanner that
-- calls no other functions, so granting EXECUTE back to the app roles is safe. The other
-- revokes in 048 (pure trigger functions + service-role maintenance funcs) remain correct.

GRANT EXECUTE ON FUNCTION public.safety_scan_values(text[]) TO anon, authenticated;
