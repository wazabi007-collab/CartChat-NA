-- Oshi-Automate drops from 1,000 to 300 orders a month.
--
-- 1,000 was a ceiling no store on the platform approaches, which made Pro's
-- "no order limit" worthless as an upsell. At 300 a genuinely busy shop still
-- fits (10 orders a day); one that outgrows it has a real reason to move up.
--
-- Checked before applying: no merchant is on oshi_grow, so nobody's limit
-- changes underneath them. TIER_LIMITS in the app changed together with this.
UPDATE public.tier_limits
SET max_orders_per_month = 300
WHERE tier = 'oshi_grow';
