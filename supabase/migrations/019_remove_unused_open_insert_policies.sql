-- Orders and order_items are only inserted via the place_order RPC
-- which is SECURITY DEFINER (bypasses RLS). These open INSERT policies
-- are unused and expose unnecessary attack surface.

DROP POLICY "Orders: anyone can place" ON public.orders;
DROP POLICY "Order Items: anyone can insert" ON public.order_items;
