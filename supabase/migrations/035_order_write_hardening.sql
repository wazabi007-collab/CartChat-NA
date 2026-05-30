-- ============================================================
-- 035 — Order write hardening (residual H5 + C1)
--
-- H5 residual: 033 added WITH CHECK to the orders owner-UPDATE policy, which
-- stops tenant reassignment, but an authenticated merchant could still raw-PATCH
-- other columns of their OWN orders via PostgREST (rewrite subtotal_nad /
-- discount_nad / delivery_fee_nad / customer fields / proof_of_payment_url /
-- payment_reference, etc.). This adds a BEFORE UPDATE trigger that blocks every
-- direct end-user update to orders, forcing all changes through the hardened
-- SECURITY DEFINER RPCs (place_order, append_order_status) or the service role.
--
-- C1 residual: 033 added ownership + EXECUTE lockdown to append_order_status but
-- did not validate status transitions in SQL. This adds a server-side state
-- machine so direct RPC calls cannot jump to invalid statuses.
-- ============================================================

-- ------------------------------------------------------------
-- H5: block direct end-user UPDATEs on orders.
--
-- The trigger function is SECURITY INVOKER (default) so current_user reflects
-- the role that actually executed the UPDATE:
--   * direct PostgREST PATCH by a merchant -> current_user = 'authenticated'/'anon'  -> BLOCK
--   * inside place_order / append_order_status (SECURITY DEFINER, owned by the
--     migration role) -> current_user = the function owner (e.g. 'postgres')        -> ALLOW
--   * service role (cron auto-cancel, upload-pop proof URL, admin ops)
--     -> current_user = 'service_role'                                              -> ALLOW
-- All legitimate order writes go through one of the allowed paths, so no real
-- flow is affected; only raw end-user tampering is rejected.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_orders_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    RAISE EXCEPTION 'Orders cannot be modified directly. Use the order status action.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_guard_update ON public.orders;
CREATE TRIGGER orders_guard_update
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.guard_orders_update();

-- ------------------------------------------------------------
-- C1: enforce valid status transitions inside append_order_status.
--
-- Mirrors the client VALID_TRANSITIONS state machine:
--   pending   -> confirmed | cancelled
--   confirmed -> ready | completed | cancelled
--   ready     -> completed | cancelled
--   completed -> (terminal)
--   cancelled -> (terminal)
-- The ::order_status cast also rejects any value outside the enum.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.append_order_status(p_order_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current order_status;
  v_new     order_status;
  v_allowed boolean;
BEGIN
  -- Reject non-enum statuses with a clean error.
  BEGIN
    v_new := p_status::order_status;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'Invalid order status: %', p_status;
  END;

  -- Ownership check + fetch current status in one query: the caller must own
  -- the merchant that owns this order.
  SELECT o.status INTO v_current
  FROM orders o
  JOIN merchants m ON m.id = o.merchant_id
  WHERE o.id = p_order_id
    AND m.user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not authorized to update this order';
  END IF;

  -- Server-side transition validation.
  v_allowed := CASE v_current
    WHEN 'pending'   THEN v_new IN ('confirmed', 'cancelled')
    WHEN 'confirmed' THEN v_new IN ('ready', 'completed', 'cancelled')
    WHEN 'ready'     THEN v_new IN ('completed', 'cancelled')
    ELSE false  -- 'completed' and 'cancelled' are terminal
  END;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Invalid order status transition: % -> %', v_current, v_new;
  END IF;

  UPDATE orders
  SET status = v_new,
      status_history = status_history || jsonb_build_array(
        jsonb_build_object('status', p_status, 'at', now())
      )
  WHERE id = p_order_id;
END;
$$;

-- Preserve the 033 EXECUTE lockdown (authenticated only).
REVOKE EXECUTE ON FUNCTION public.append_order_status(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.append_order_status(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.append_order_status(uuid, text) TO authenticated;
