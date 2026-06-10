-- 040_tier_canonicalization.sql
-- 1. Oshi-Pro: correct the stale price (was 120000 / N$1,200) to the public N$799.
UPDATE public.tier_limits SET price_nad = 79900 WHERE tier = 'oshi_pro';

-- 2. Free trial (oshi_start): full-featured, volume-capped.
--    Unlock inventory + coupons, remove OshiCart branding, lift caps to 20/50.
UPDATE public.tier_limits
SET max_products         = 20,
    max_orders_per_month = 50,
    has_inventory        = true,
    has_coupons          = true,
    has_branding         = false
WHERE tier = 'oshi_start';
