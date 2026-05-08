-- Align stored subscription limits with public Storefront and Automate pricing.

UPDATE public.tier_limits
SET
  max_products = 50,
  max_orders_per_month = 300,
  price_nad = 14900,
  has_inventory = false,
  has_coupons = false
WHERE tier = 'oshi_basic';

UPDATE public.tier_limits
SET
  max_products = 200,
  max_orders_per_month = 1000,
  price_nad = 39900,
  has_inventory = true,
  has_coupons = true
WHERE tier = 'oshi_grow';
