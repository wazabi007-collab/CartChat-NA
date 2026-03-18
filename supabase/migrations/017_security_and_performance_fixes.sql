-- ============================================================
-- 1. ADMIN TABLES: Add RLS policies (service_role only)
-- ============================================================

CREATE POLICY "admin_users_service_role_only" ON public.admin_users
  FOR ALL USING ((select auth.role()) = 'service_role');

CREATE POLICY "admin_actions_service_role_only" ON public.admin_actions
  FOR ALL USING ((select auth.role()) = 'service_role');

-- ============================================================
-- 2. FIX MUTABLE SEARCH_PATH on functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_expired_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.subscriptions
  SET status = 'grace',
      grace_ends_at = trial_ends_at + interval '7 days',
      updated_at = now()
  WHERE status = 'trial'
    AND trial_ends_at < now();

  UPDATE public.subscriptions
  SET status = 'grace',
      grace_ends_at = current_period_end + interval '7 days',
      updated_at = now()
  WHERE status = 'active'
    AND current_period_end < now();

  UPDATE public.subscriptions
  SET status = 'soft_suspended',
      soft_suspended_at = now(),
      updated_at = now()
  WHERE status = 'grace'
    AND grace_ends_at < now();

  UPDATE public.subscriptions s
  SET status = 'hard_suspended',
      updated_at = now()
  WHERE s.status = 'soft_suspended'
    AND s.soft_suspended_at + interval '30 days' < now();

  UPDATE public.merchants m
  SET store_status = 'suspended',
      suspended_reason = 'non_payment',
      updated_at = now()
  FROM public.subscriptions s
  WHERE s.merchant_id = m.id
    AND s.status = 'hard_suspended'
    AND m.store_status <> 'suspended';
END;
$$;

-- ============================================================
-- 3. FIX TIER_LIMITS: Remove overlapping ALL policy
-- ============================================================

DROP POLICY "tier_limits_modify_service_role" ON public.tier_limits;

CREATE POLICY "tier_limits_insert_service_role" ON public.tier_limits
  FOR INSERT WITH CHECK ((select auth.role()) = 'service_role');

CREATE POLICY "tier_limits_update_service_role" ON public.tier_limits
  FOR UPDATE USING ((select auth.role()) = 'service_role');

CREATE POLICY "tier_limits_delete_service_role" ON public.tier_limits
  FOR DELETE USING ((select auth.role()) = 'service_role');

-- ============================================================
-- 4. FIX RLS POLICIES: Wrap auth.uid() in (select ...) for performance
-- ============================================================

DROP POLICY "Categories: owner full access" ON public.categories;
CREATE POLICY "Categories: owner full access" ON public.categories
  FOR ALL
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid())))
  WITH CHECK (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid())));

DROP POLICY "Products: owner full access" ON public.products;
CREATE POLICY "Products: owner full access" ON public.products
  FOR ALL
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid())))
  WITH CHECK (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid())));

DROP POLICY "Order Items: owner read" ON public.order_items;
CREATE POLICY "Order Items: owner read" ON public.order_items
  FOR SELECT
  USING (order_id IN (SELECT id FROM public.orders WHERE merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid()))));

DROP POLICY "Orders: owner read and update" ON public.orders;
CREATE POLICY "Orders: owner read and update" ON public.orders
  FOR SELECT
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid())));

DROP POLICY "Orders: owner update status" ON public.orders;
CREATE POLICY "Orders: owner update status" ON public.orders
  FOR UPDATE
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid())));

DROP POLICY "Analytics: owner full access" ON public.store_analytics;
CREATE POLICY "Analytics: owner full access" ON public.store_analytics
  FOR ALL
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid())))
  WITH CHECK (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid())));

DROP POLICY "Merchants can insert own stock adjustments" ON public.stock_adjustments;
CREATE POLICY "Merchants can insert own stock adjustments" ON public.stock_adjustments
  FOR INSERT
  WITH CHECK (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid())));

DROP POLICY "Merchants can read own stock adjustments" ON public.stock_adjustments;
CREATE POLICY "Merchants can read own stock adjustments" ON public.stock_adjustments
  FOR SELECT
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid())));

DROP POLICY "Coupons: owner full access" ON public.coupons;
CREATE POLICY "Coupons: owner full access" ON public.coupons
  FOR ALL
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid())))
  WITH CHECK (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid())));

DROP POLICY "Merchants: owner full access" ON public.merchants;
CREATE POLICY "Merchants: owner full access" ON public.merchants
  FOR ALL
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY "Users can view own merchant" ON public.merchants;
CREATE POLICY "Users can view own merchant" ON public.merchants
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()) OR (is_active = true AND store_status = 'active'::store_status));

DROP POLICY "Payments: merchant reads own" ON public.payments;
CREATE POLICY "Payments: merchant reads own" ON public.payments
  FOR SELECT
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid())));

DROP POLICY "Subscriptions: merchant creates own" ON public.subscriptions;
CREATE POLICY "Subscriptions: merchant creates own" ON public.subscriptions
  FOR INSERT
  WITH CHECK (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid())));

DROP POLICY "Subscriptions: merchant reads own" ON public.subscriptions;
CREATE POLICY "Subscriptions: merchant reads own" ON public.subscriptions
  FOR SELECT
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid())));

DROP POLICY "Subscriptions: merchant updates pending tier" ON public.subscriptions;
CREATE POLICY "Subscriptions: merchant updates pending tier" ON public.subscriptions
  FOR UPDATE
  USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid())))
  WITH CHECK (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (select auth.uid())));

-- ============================================================
-- 5. ADD MISSING FOREIGN KEY INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_user_id ON public.admin_actions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_created_by ON public.admin_users(created_by);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_coupon_id ON public.orders(coupon_id);
CREATE INDEX IF NOT EXISTS idx_payments_recorded_by ON public.payments(recorded_by);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON public.payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_merchant_id ON public.stock_adjustments(merchant_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_order_id ON public.stock_adjustments(order_id);
