-- Migration 007: Auto-restock on order cancellation

CREATE OR REPLACE FUNCTION restock_on_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item record;
  v_product record;
BEGIN
  -- Only fire when status changes TO 'cancelled'
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    FOR v_item IN
      SELECT oi.product_id, oi.quantity
      FROM order_items oi
      WHERE oi.order_id = NEW.id
    LOOP
      -- Check if product still exists and tracks inventory
      SELECT id, track_inventory, stock_quantity
      INTO v_product
      FROM products
      WHERE id = v_item.product_id
      FOR UPDATE;

      IF v_product IS NOT NULL AND v_product.track_inventory THEN
        -- Restock
        UPDATE products
        SET stock_quantity = stock_quantity + v_item.quantity,
            updated_at = now()
        WHERE id = v_product.id;

        -- Audit trail
        INSERT INTO stock_adjustments (
          product_id, merchant_id, previous_quantity, new_quantity,
          change, reason, order_id
        ) VALUES (
          v_product.id, NEW.merchant_id, v_product.stock_quantity,
          v_product.stock_quantity + v_item.quantity,
          v_item.quantity, 'cancel', NEW.id
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restock_on_cancel ON orders;
CREATE TRIGGER trg_restock_on_cancel
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION restock_on_cancel();
