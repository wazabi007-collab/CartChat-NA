-- ============================================================
-- Fix multiple permissive SELECT policies per role/table.
-- Split ALL policies into per-command policies scoped to authenticated,
-- and ensure each role hits exactly ONE select policy.
-- ============================================================

-- CATEGORIES
DROP POLICY "Categories: owner full access" ON public.categories;
DROP POLICY "Categories: public read" ON public.categories;

CREATE POLICY "Categories: anon read" ON public.categories
  FOR SELECT TO anon USING (true);

CREATE POLICY "Categories: authenticated public read" ON public.categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Categories: owner insert" ON public.categories
  FOR INSERT TO authenticated
  WITH CHECK (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid())));

CREATE POLICY "Categories: owner update" ON public.categories
  FOR UPDATE TO authenticated
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid())));

CREATE POLICY "Categories: owner delete" ON public.categories
  FOR DELETE TO authenticated
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid())));

-- PRODUCTS
DROP POLICY "Products: owner full access" ON public.products;
DROP POLICY "Products: public read available" ON public.products;

CREATE POLICY "Products: anon read available" ON public.products
  FOR SELECT TO anon USING (is_available = true);

CREATE POLICY "Products: authenticated read" ON public.products
  FOR SELECT TO authenticated
  USING (
    merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid()))
    OR is_available = true
  );

CREATE POLICY "Products: owner insert" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid())));

CREATE POLICY "Products: owner update" ON public.products
  FOR UPDATE TO authenticated
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid())));

CREATE POLICY "Products: owner delete" ON public.products
  FOR DELETE TO authenticated
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid())));

-- COUPONS
DROP POLICY "Coupons: owner full access" ON public.coupons;
DROP POLICY "Coupons: public read active" ON public.coupons;

CREATE POLICY "Coupons: anon read active" ON public.coupons
  FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "Coupons: authenticated read" ON public.coupons
  FOR SELECT TO authenticated
  USING (
    merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid()))
    OR is_active = true
  );

CREATE POLICY "Coupons: owner insert" ON public.coupons
  FOR INSERT TO authenticated
  WITH CHECK (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid())));

CREATE POLICY "Coupons: owner update" ON public.coupons
  FOR UPDATE TO authenticated
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid())));

CREATE POLICY "Coupons: owner delete" ON public.coupons
  FOR DELETE TO authenticated
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid())));

-- MERCHANTS
DROP POLICY "Merchants: owner full access" ON public.merchants;

CREATE POLICY "Merchants: owner insert" ON public.merchants
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Merchants: owner update" ON public.merchants
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Merchants: owner delete" ON public.merchants
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));
