-- Phase 1 platform safety controls:
-- merchant prohibited-products acceptance, product moderation status,
-- review queue, and DB-side guardrails for obvious prohibited listings.

ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS prohibited_policy_accepted_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS prohibited_policy_version text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS prohibited_policy_accepted_ip inet DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS safety_notes text DEFAULT NULL;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS moderation_reasons text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS moderation_categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS moderation_checked_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS moderation_source text NOT NULL DEFAULT 'legacy';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_moderation_status_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_moderation_status_check
      CHECK (moderation_status IN ('approved', 'review_required', 'blocked'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_moderation_status
  ON public.products(moderation_status);

CREATE TABLE IF NOT EXISTS public.safety_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  review_type text NOT NULL CHECK (review_type IN ('store_profile', 'product_listing', 'customer_report')),
  severity text NOT NULL CHECK (severity IN ('review', 'block')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed')),
  categories text[] NOT NULL DEFAULT '{}',
  reasons text[] NOT NULL DEFAULT '{}',
  content_excerpt text DEFAULT NULL,
  admin_notes text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_safety_reviews_status
  ON public.safety_reviews(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_safety_reviews_merchant
  ON public.safety_reviews(merchant_id);

ALTER TABLE public.safety_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Safety reviews: merchant insert own" ON public.safety_reviews;
CREATE POLICY "Safety reviews: merchant insert own"
  ON public.safety_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM public.merchants WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Safety reviews: service role all" ON public.safety_reviews;
CREATE POLICY "Safety reviews: service role all"
  ON public.safety_reviews
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.safety_scan_values(p_values text[])
RETURNS TABLE(severity text, categories text[], reasons text[])
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_content text := lower(coalesce(array_to_string(p_values, ' '), ''));
  v_categories text[] := '{}';
  v_reasons text[] := '{}';
  v_severity text := 'approved';
BEGIN
  IF v_content ~ '(^|[^a-z])(porn|pornographic|xxx|escort|escorts|prostitute|prostitution|nude|nudity)([^a-z]|$)'
     OR v_content ~ '(^|[^a-z])(sexual service|sexual services|sex service|sex services|sex toy|sex toys)([^a-z]|$)' THEN
    v_categories := array_append(v_categories, 'adult_content');
    v_reasons := array_append(v_reasons, 'Adult or pornographic products and services are not allowed.');
    v_severity := 'blocked';
  END IF;

  IF v_content ~ '(^|[^a-z])(cocaine|heroin|meth|methamphetamine|mandrax|ecstasy|mdma|marijuana|cannabis|dagga)([^a-z]|$)'
     OR v_content ~ '(^|[^a-z])(illegal drug|illegal drugs|drug dealer|drug delivery|drug sales)([^a-z]|$)' THEN
    v_categories := array_append(v_categories, 'illegal_drugs');
    v_reasons := array_append(v_reasons, 'Illegal drugs and drug-related products are not allowed.');
    v_severity := 'blocked';
  END IF;

  IF v_content ~ '(^|[^a-z])(firearm|firearms|ammunition|gun|guns|knife|knives)([^a-z]|$)' THEN
    v_categories := array_append(v_categories, 'weapons');
    v_reasons := array_append(v_reasons, 'Weapons and controlled dangerous items require manual review.');
    IF v_severity <> 'blocked' THEN
      v_severity := 'review_required';
    END IF;
  END IF;

  IF v_content ~ '(^|[^a-z])(counterfeit|stolen)([^a-z]|$)'
     OR v_content ~ '(^|[^a-z])(fake id|fake passport|fake certificate|fake brand|fake designer|replica brand|replica designer)([^a-z]|$)' THEN
    v_categories := array_append(v_categories, 'counterfeit_or_fraud');
    v_reasons := array_append(v_reasons, 'Counterfeit goods and fraudulent offers require manual review.');
    IF v_severity <> 'blocked' THEN
      v_severity := 'review_required';
    END IF;
  END IF;

  severity := v_severity;
  categories := (SELECT array_agg(DISTINCT c) FROM unnest(v_categories) AS c);
  reasons := (SELECT array_agg(DISTINCT r) FROM unnest(v_reasons) AS r);
  categories := coalesce(categories, '{}');
  reasons := coalesce(reasons, '{}');
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_product_safety_scan()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_scan record;
BEGIN
  SELECT * INTO v_scan
  FROM public.safety_scan_values(ARRAY[NEW.name, NEW.description]);

  NEW.moderation_checked_at := now();
  NEW.moderation_source := 'rules_v1';

  IF v_scan.severity = 'blocked' THEN
    NEW.moderation_status := 'blocked';
    NEW.is_available := false;
  ELSIF v_scan.severity = 'review_required' THEN
    NEW.moderation_status := 'review_required';
    NEW.is_available := false;
  ELSE
    NEW.moderation_status := 'approved';
  END IF;

  NEW.moderation_categories := v_scan.categories;
  NEW.moderation_reasons := v_scan.reasons;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_safety_scan_before_write ON public.products;
CREATE TRIGGER products_safety_scan_before_write
  BEFORE INSERT OR UPDATE OF name, description, is_available
  ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_product_safety_scan();

CREATE OR REPLACE FUNCTION public.enqueue_product_safety_review()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.moderation_status IN ('blocked', 'review_required')
     AND (TG_OP = 'INSERT' OR OLD.moderation_status IS DISTINCT FROM NEW.moderation_status) THEN
    INSERT INTO public.safety_reviews (
      merchant_id,
      product_id,
      review_type,
      severity,
      categories,
      reasons,
      content_excerpt
    ) VALUES (
      NEW.merchant_id,
      NEW.id,
      'product_listing',
      CASE WHEN NEW.moderation_status = 'blocked' THEN 'block' ELSE 'review' END,
      NEW.moderation_categories,
      NEW.moderation_reasons,
      left(concat_ws(' ', NEW.name, NEW.description), 240)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_safety_review_after_write ON public.products;
CREATE TRIGGER products_safety_review_after_write
  AFTER INSERT OR UPDATE
  ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_product_safety_review();

CREATE OR REPLACE FUNCTION public.apply_merchant_safety_scan()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_scan record;
BEGIN
  SELECT * INTO v_scan
  FROM public.safety_scan_values(ARRAY[NEW.store_name, NEW.description, NEW.industry]);

  IF v_scan.severity IN ('blocked', 'review_required') THEN
    NEW.store_status := 'suspended';
    NEW.safety_notes := array_to_string(v_scan.reasons, ' ');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS merchants_safety_scan_before_write ON public.merchants;
CREATE TRIGGER merchants_safety_scan_before_write
  BEFORE INSERT OR UPDATE OF store_name, description, industry, store_status
  ON public.merchants
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_merchant_safety_scan();

CREATE OR REPLACE FUNCTION public.enqueue_merchant_safety_review()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_scan record;
BEGIN
  SELECT * INTO v_scan
  FROM public.safety_scan_values(ARRAY[NEW.store_name, NEW.description, NEW.industry]);

  IF v_scan.severity IN ('blocked', 'review_required')
     AND (TG_OP = 'INSERT' OR OLD.safety_notes IS DISTINCT FROM NEW.safety_notes) THEN
    INSERT INTO public.safety_reviews (
      merchant_id,
      review_type,
      severity,
      categories,
      reasons,
      content_excerpt
    ) VALUES (
      NEW.id,
      'store_profile',
      CASE WHEN v_scan.severity = 'blocked' THEN 'block' ELSE 'review' END,
      v_scan.categories,
      v_scan.reasons,
      left(concat_ws(' ', NEW.store_name, NEW.description, NEW.industry), 240)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS merchants_safety_review_after_write ON public.merchants;
CREATE TRIGGER merchants_safety_review_after_write
  AFTER INSERT OR UPDATE
  ON public.merchants
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_merchant_safety_review();

CREATE OR REPLACE FUNCTION public.reject_unapproved_order_item()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_status text;
  v_available boolean;
BEGIN
  SELECT moderation_status, is_available
  INTO v_status, v_available
  FROM public.products
  WHERE id = NEW.product_id;

  IF v_status IS DISTINCT FROM 'approved' OR v_available IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'This product is not available for purchase';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_items_reject_unapproved_before_insert ON public.order_items;
CREATE TRIGGER order_items_reject_unapproved_before_insert
  BEFORE INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_unapproved_order_item();

DROP POLICY IF EXISTS "Products: anon read available" ON public.products;
CREATE POLICY "Products: anon read available" ON public.products
  FOR SELECT TO anon
  USING (is_available = true AND moderation_status = 'approved');

DROP POLICY IF EXISTS "Products: authenticated read" ON public.products;
CREATE POLICY "Products: authenticated read" ON public.products
  FOR SELECT TO authenticated
  USING (
    merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid()))
    OR (is_available = true AND moderation_status = 'approved')
  );
