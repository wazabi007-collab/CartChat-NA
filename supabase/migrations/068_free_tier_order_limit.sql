-- Oshi-Start drops from 50 to 20 orders a month.
--
-- Paired with migration 067, which took Oshi-Storefront to 50. With both at
-- 50 the first paid tier bought only 30 extra products and the removal of the
-- "Powered by OshiCart" badge, so the number a merchant actually compares did
-- not move. This restores a visible gap between free and paid.
--
-- TIER_LIMITS in the app must match this table; both were changed together.
--
-- Checked before applying: the busiest free store has 3 orders in its current
-- cycle, so no merchant is cut off by the lower limit.
UPDATE public.tier_limits
SET max_orders_per_month = 20
WHERE tier = 'oshi_start';
