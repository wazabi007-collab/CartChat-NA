-- ============================================================
-- 037 - Buyer-paid delivery providers
--
-- Adds a delivery_provider snapshot on orders and a provider-aware
-- place_order overload for buyer-arranged courier options such as
-- Yango and inDrive. Store delivery keeps the merchant delivery fee;
-- buyer-arranged courier delivery stores the address/provider but does
-- not add a delivery fee to the OshiCart order total.
-- ============================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_provider text NOT NULL DEFAULT 'store';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_delivery_provider_valid'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_delivery_provider_valid
      CHECK (delivery_provider IN ('store', 'yango', 'indrive'));
  END IF;
END $$;

UPDATE public.orders
SET delivery_provider = 'store'
WHERE delivery_provider IS NULL OR delivery_provider = '';

CREATE OR REPLACE FUNCTION public.place_order(
  p_merchant_id       uuid,
  p_customer_name     text,
  p_customer_whatsapp text,
  p_delivery_method   text,
  p_subtotal_nad      integer,
  p_delivery_provider text,
  p_delivery_address  text    DEFAULT NULL,
  p_delivery_date     date    DEFAULT NULL,
  p_delivery_time     text    DEFAULT NULL,
  p_notes             text    DEFAULT NULL,
  p_proof_url         text    DEFAULT NULL,
  p_items             jsonb   DEFAULT '[]',
  p_delivery_fee      integer DEFAULT 0,
  p_payment_method    text    DEFAULT 'eft',
  p_coupon_code       text    DEFAULT NULL,
  p_discount_nad      integer DEFAULT 0,
  p_payment_ref       text    DEFAULT NULL
)
RETURNS TABLE(order_id uuid, order_number integer, payment_reference text, tracking_token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_provider text := lower(coalesce(nullif(trim(p_delivery_provider), ''), 'store'));
  v_order_id uuid;
  v_order_number integer;
  v_payment_reference text;
  v_tracking_token text;
BEGIN
  IF p_delivery_method <> 'delivery' THEN
    v_provider := 'store';
  END IF;

  IF v_provider NOT IN ('store', 'yango', 'indrive') THEN
    RAISE EXCEPTION 'Invalid delivery provider: %', p_delivery_provider;
  END IF;

  IF p_delivery_method = 'delivery' AND v_provider IN ('yango', 'indrive') THEN
    SELECT po.order_id, po.order_number, po.payment_reference, po.tracking_token
    INTO v_order_id, v_order_number, v_payment_reference, v_tracking_token
    FROM public.place_order(
      p_merchant_id,
      p_customer_name,
      p_customer_whatsapp,
      'pickup',
      p_subtotal_nad,
      NULL,
      NULL,
      NULL,
      p_notes,
      p_proof_url,
      p_items,
      0,
      p_payment_method,
      p_coupon_code,
      p_discount_nad,
      p_payment_ref
    ) AS po;

    UPDATE public.orders
    SET delivery_method = 'delivery'::delivery_method,
        delivery_address = p_delivery_address,
        delivery_date = p_delivery_date,
        delivery_time = p_delivery_time,
        delivery_fee_nad = 0,
        delivery_provider = v_provider
    WHERE id = v_order_id;
  ELSE
    SELECT po.order_id, po.order_number, po.payment_reference, po.tracking_token
    INTO v_order_id, v_order_number, v_payment_reference, v_tracking_token
    FROM public.place_order(
      p_merchant_id,
      p_customer_name,
      p_customer_whatsapp,
      p_delivery_method,
      p_subtotal_nad,
      p_delivery_address,
      p_delivery_date,
      p_delivery_time,
      p_notes,
      p_proof_url,
      p_items,
      p_delivery_fee,
      p_payment_method,
      p_coupon_code,
      p_discount_nad,
      p_payment_ref
    ) AS po;

    UPDATE public.orders
    SET delivery_provider = 'store'
    WHERE id = v_order_id;
  END IF;

  RETURN QUERY SELECT v_order_id, v_order_number, v_payment_reference, v_tracking_token;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.place_order(
  uuid, text, text, text, integer, text, text, date, text, text, text, jsonb, integer, text, text, integer, text
) TO anon, authenticated;
