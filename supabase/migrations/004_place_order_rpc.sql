-- Fix: make generate_order_number SECURITY DEFINER so its internal SELECT
-- runs as the function owner (postgres) and is not subject to anon RLS.
CREATE OR REPLACE FUNCTION public.generate_order_number()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $func$
BEGIN
  SELECT COALESCE(MAX(order_number), 0) + 1
    INTO NEW.order_number
    FROM orders
   WHERE merchant_id = NEW.merchant_id;
  RETURN NEW;
END;
$func$;

-- New RPC for anonymous order placement.
-- SECURITY DEFINER bypasses the anon SELECT policy that would block
-- INSERT ... RETURNING on the orders table (PostgreSQL 15+ enforces this).
CREATE OR REPLACE FUNCTION public.place_order(
  p_merchant_id       uuid,
  p_customer_name     text,
  p_customer_whatsapp text,
  p_delivery_method   text,
  p_subtotal_nad      integer,
  p_delivery_address  text    DEFAULT NULL,
  p_delivery_date     date    DEFAULT NULL,
  p_delivery_time     text    DEFAULT NULL,
  p_notes             text    DEFAULT NULL,
  p_proof_url         text    DEFAULT NULL,
  p_items             jsonb   DEFAULT '[]'
)
RETURNS TABLE(order_id uuid, order_number integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_order_id  uuid;
  v_order_num integer;
BEGIN
  INSERT INTO orders (
    merchant_id, customer_name, customer_whatsapp,
    delivery_method, delivery_address, delivery_date, delivery_time,
    subtotal_nad, notes, proof_of_payment_url
  ) VALUES (
    p_merchant_id, p_customer_name, p_customer_whatsapp,
    p_delivery_method::delivery_method,
    p_delivery_address, p_delivery_date, p_delivery_time,
    p_subtotal_nad, p_notes, p_proof_url
  )
  RETURNING id, orders.order_number INTO v_order_id, v_order_num;

  INSERT INTO order_items (
    order_id, product_id, product_name, product_price, quantity, line_total
  )
  SELECT
    v_order_id,
    (item->>'productId')::uuid,
    item->>'name',
    (item->>'price')::integer,
    (item->>'quantity')::integer,
    ((item->>'price')::integer * (item->>'quantity')::integer)
  FROM jsonb_array_elements(p_items) AS item;

  RETURN QUERY SELECT v_order_id, v_order_num;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.place_order TO anon, authenticated;
