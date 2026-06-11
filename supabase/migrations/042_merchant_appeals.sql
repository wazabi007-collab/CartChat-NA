-- 042_merchant_appeals.sql
-- Merchant-facing moderation appeals reuse the safety_reviews admin queue.
ALTER TABLE public.safety_reviews
  ADD COLUMN IF NOT EXISTS merchant_message text DEFAULT NULL;

ALTER TABLE public.safety_reviews
  DROP CONSTRAINT IF EXISTS safety_reviews_review_type_check;
ALTER TABLE public.safety_reviews
  ADD CONSTRAINT safety_reviews_review_type_check
  CHECK (review_type IN ('store_profile', 'product_listing', 'customer_report', 'merchant_appeal'));
