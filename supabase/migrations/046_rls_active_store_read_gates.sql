-- Migration 046: gate public (anon + authenticated) reads on products, coupons and
-- categories to the OWNING STORE being publicly visible (is_active = true AND
-- store_status = 'active'), mirroring the already-correct merchants and
-- product_variants policies.
--
-- Why: the products/coupons/categories public-read policies only checked the row's
-- own flags (is_available/moderation_status/is_active) and never bound to the parent
-- store's visibility. A suspended/banned/deactivated store's catalog therefore stayed
-- readable by the anon role via direct PostgREST (GET /rest/v1/products?...), defeating
-- the storefront 404 and the moderation takedown. The owner branch is preserved so
-- merchants keep seeing their own rows in the dashboard regardless of store state.

-- ── PRODUCTS ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Products: anon read available" ON public.products;
CREATE POLICY "Products: anon read available" ON public.products
  FOR SELECT TO anon
  USING (
    is_available = true
    AND moderation_status = 'approved'
    AND deleted_at IS NULL
    AND merchant_id IN (
      SELECT id FROM public.merchants
      WHERE is_active = true AND store_status = 'active'
    )
  );

DROP POLICY IF EXISTS "Products: authenticated read" ON public.products;
CREATE POLICY "Products: authenticated read" ON public.products
  FOR SELECT TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM public.merchants WHERE user_id = (select auth.uid())
    )
    OR (
      is_available = true
      AND moderation_status = 'approved'
      AND deleted_at IS NULL
      AND merchant_id IN (
        SELECT id FROM public.merchants
        WHERE is_active = true AND store_status = 'active'
      )
    )
  );

-- ── COUPONS ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Coupons: anon read active" ON public.coupons;
CREATE POLICY "Coupons: anon read active" ON public.coupons
  FOR SELECT TO anon
  USING (
    is_active = true
    AND merchant_id IN (
      SELECT id FROM public.merchants
      WHERE is_active = true AND store_status = 'active'
    )
  );

DROP POLICY IF EXISTS "Coupons: authenticated read" ON public.coupons;
CREATE POLICY "Coupons: authenticated read" ON public.coupons
  FOR SELECT TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM public.merchants WHERE user_id = (select auth.uid())
    )
    OR (
      is_active = true
      AND merchant_id IN (
        SELECT id FROM public.merchants
        WHERE is_active = true AND store_status = 'active'
      )
    )
  );

-- ── CATEGORIES ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Categories: anon read" ON public.categories;
CREATE POLICY "Categories: anon read" ON public.categories
  FOR SELECT TO anon
  USING (
    merchant_id IN (
      SELECT id FROM public.merchants
      WHERE is_active = true AND store_status = 'active'
    )
  );

DROP POLICY IF EXISTS "Categories: authenticated public read" ON public.categories;
CREATE POLICY "Categories: authenticated public read" ON public.categories
  FOR SELECT TO authenticated
  USING (
    merchant_id IN (
      SELECT id FROM public.merchants WHERE user_id = (select auth.uid())
    )
    OR merchant_id IN (
      SELECT id FROM public.merchants
      WHERE is_active = true AND store_status = 'active'
    )
  );
