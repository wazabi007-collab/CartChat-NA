-- Oshi-Storefront drops from 300 to 50 orders a month.
--
-- TIER_LIMITS in the app calls itself a static fallback that must match this
-- table, so changing one without the other would let the storefront and the
-- dashboard disagree about when a merchant runs out of orders.
--
-- Checked before applying: no merchant is on oshi_basic, so nobody is cut off
-- mid-cycle by the lower limit.
UPDATE public.tier_limits
SET max_orders_per_month = 50
WHERE tier = 'oshi_basic';
