# Migration Plan — Inventory + Industry + Delivery Fee

> Generated: 2026-03-11
> Originally for VPS Docker setup. Now applied to Supabase Pro (2026-03-13).
> All migrations 005-007 are included in `FULL_MIGRATION_FOR_SUPABASE_PRO.sql`.

---

## Migration 005: Inventory, Industry, Delivery Fee

**File**: `supabase/migrations/005_inventory_and_industry.sql`

```sql
-- ============================================================
-- Migration 005: Inventory tracking, Industry field, Delivery fee
-- ============================================================

-- 1. Add inventory fields to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS track_inventory boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_quantity integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS low_stock_threshold integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS allow_backorder boolean DEFAULT false;

-- 2. Constraint: stock can't go negative unless backorder allowed
ALTER TABLE products
  ADD CONSTRAINT stock_quantity_non_negative
  CHECK (allow_backorder = true OR stock_quantity >= 0);

-- 3. Add industry to merchants
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS industry text DEFAULT 'other';

-- 4. Add delivery fee to merchants (default store-wide flat rate in cents)
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS delivery_fee_nad integer DEFAULT 0;

-- 5. Add delivery fee snapshot to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_fee_nad integer DEFAULT 0;

-- 6. Stock adjustments audit trail
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  previous_quantity integer NOT NULL,
  new_quantity integer NOT NULL,
  change integer NOT NULL,
  reason text NOT NULL DEFAULT 'manual',
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- 7. RLS for stock_adjustments
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can read own stock adjustments"
  ON stock_adjustments FOR SELECT
  USING (merchant_id = auth.uid());

CREATE POLICY "Merchants can insert own stock adjustments"
  ON stock_adjustments FOR INSERT
  WITH CHECK (merchant_id = auth.uid());

-- Service role can do everything (for RPC functions)
CREATE POLICY "Service role full access to stock_adjustments"
  ON stock_adjustments FOR ALL
  USING (auth.role() = 'service_role');

-- 8. Index for low stock queries
CREATE INDEX IF NOT EXISTS idx_products_low_stock
  ON products (merchant_id, stock_quantity)
  WHERE track_inventory = true;

-- 9. Index for stock adjustments by product
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_product
  ON stock_adjustments (product_id, created_at DESC);
```

---

## Migration 006: Updated place_order() RPC with Stock Deduction

**File**: `supabase/migrations/006_place_order_v2.sql`

```sql
-- ============================================================
-- Migration 006: place_order v2 — with stock deduction + delivery fee
-- ============================================================

CREATE OR REPLACE FUNCTION place_order(
  p_merchant_id uuid,
  p_customer_name text,
  p_customer_whatsapp text,
  p_delivery_method delivery_method,
  p_delivery_address text DEFAULT NULL,
  p_delivery_date text DEFAULT NULL,
  p_delivery_time text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_proof_url text DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb,
  p_delivery_fee integer DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_subtotal integer := 0;
  v_item jsonb;
  v_product record;
  v_line_total integer;
  v_prev_qty integer;
BEGIN
  -- Calculate subtotal
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_subtotal := v_subtotal + ((v_item->>'price')::integer * (v_item->>'quantity')::integer);
  END LOOP;

  -- Create order
  INSERT INTO orders (
    merchant_id, customer_name, customer_whatsapp,
    delivery_method, delivery_address, delivery_date, delivery_time,
    notes, proof_of_payment_url, subtotal_nad, delivery_fee_nad, status
  ) VALUES (
    p_merchant_id, p_customer_name, p_customer_whatsapp,
    p_delivery_method, p_delivery_address, p_delivery_date, p_delivery_time,
    p_notes, p_proof_url, v_subtotal, p_delivery_fee, 'pending'
  ) RETURNING id INTO v_order_id;

  -- Insert order items + deduct stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Lock product row and check stock
    SELECT id, name, track_inventory, stock_quantity, allow_backorder
    INTO v_product
    FROM products
    WHERE id = (v_item->>'productId')::uuid
    FOR UPDATE;

    IF v_product IS NULL THEN
      RAISE EXCEPTION 'Product not found: %', v_item->>'productId';
    END IF;

    -- Stock check (only if tracking is enabled)
    IF v_product.track_inventory THEN
      IF v_product.stock_quantity < (v_item->>'quantity')::integer
         AND NOT v_product.allow_backorder THEN
        RAISE EXCEPTION 'Insufficient stock for "%". Available: %, Requested: %',
          v_product.name, v_product.stock_quantity, (v_item->>'quantity')::integer;
      END IF;

      -- Deduct stock
      v_prev_qty := v_product.stock_quantity;
      UPDATE products
      SET stock_quantity = stock_quantity - (v_item->>'quantity')::integer,
          updated_at = now()
      WHERE id = v_product.id;

      -- Audit trail
      INSERT INTO stock_adjustments (
        product_id, merchant_id, previous_quantity, new_quantity,
        change, reason, order_id
      ) VALUES (
        v_product.id, p_merchant_id, v_prev_qty,
        v_prev_qty - (v_item->>'quantity')::integer,
        -(v_item->>'quantity')::integer, 'order', v_order_id
      );
    END IF;

    -- Insert order item
    v_line_total := (v_item->>'price')::integer * (v_item->>'quantity')::integer;
    INSERT INTO order_items (
      order_id, product_id, product_name, product_price, quantity, line_total
    ) VALUES (
      v_order_id, (v_item->>'productId')::uuid,
      (v_item->>'name')::text, (v_item->>'price')::integer,
      (v_item->>'quantity')::integer, v_line_total
    );
  END LOOP;

  RETURN v_order_id;
END;
$$;
```

---

## Migration 007: Cancel Order Restock Trigger

**File**: `supabase/migrations/007_cancel_restock_trigger.sql`

```sql
-- ============================================================
-- Migration 007: Auto-restock on order cancellation
-- ============================================================

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

-- Attach trigger to orders table
DROP TRIGGER IF EXISTS trg_restock_on_cancel ON orders;
CREATE TRIGGER trg_restock_on_cancel
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION restock_on_cancel();
```

---

## Deployment Steps

### Current: Supabase Pro + Vercel (as of 2026-03-13)

All migrations (001-010) have been applied to Supabase Pro. For future migrations:

```bash
# 1. Write migration SQL file in supabase/migrations/
# 2. Run in Supabase Dashboard > SQL Editor
# 3. Push code changes to master → Vercel auto-deploys
```

### Previous: Docker on VPS (deprecated)

```bash
# These steps are no longer needed — kept for reference only
# ssh root@187.124.15.31
# cd /opt/oshicart && git pull origin master
# cat supabase/migrations/XXX.sql | docker compose -f docker-compose.prod.yml exec -T supabase-db psql -U postgres -d postgres
# bash deploy.sh
```

### Rollback Plan

```sql
-- Rollback 007 (trigger)
DROP TRIGGER IF EXISTS trg_restock_on_cancel ON orders;
DROP FUNCTION IF EXISTS restock_on_cancel();

-- Rollback 006 (restore original place_order from 004)
-- Re-apply: supabase/migrations/004_place_order_rpc.sql

-- Rollback 005 (columns + table)
ALTER TABLE products DROP COLUMN IF EXISTS track_inventory;
ALTER TABLE products DROP COLUMN IF EXISTS stock_quantity;
ALTER TABLE products DROP COLUMN IF EXISTS low_stock_threshold;
ALTER TABLE products DROP COLUMN IF EXISTS allow_backorder;
ALTER TABLE merchants DROP COLUMN IF EXISTS industry;
ALTER TABLE merchants DROP COLUMN IF EXISTS delivery_fee_nad;
ALTER TABLE orders DROP COLUMN IF EXISTS delivery_fee_nad;
DROP TABLE IF EXISTS stock_adjustments;
```

---

## Docker Compose Changes

**Mount new migration files** — add to `supabase-db-migrate` volumes in both `docker-compose.yml` and `docker-compose.prod.yml`:

```yaml
volumes:
  - ./supabase/migrations/001_initial_schema.sql:/migrations/001_initial_schema.sql:ro
  - ./supabase/migrations/002_storage_buckets.sql:/migrations/002_storage_buckets.sql:ro
  - ./supabase/migrations/005_inventory_and_industry.sql:/migrations/005_inventory_and_industry.sql:ro
  - ./supabase/migrations/006_place_order_v2.sql:/migrations/006_place_order_v2.sql:ro
  - ./supabase/migrations/007_cancel_restock_trigger.sql:/migrations/007_cancel_restock_trigger.sql:ro
```

Update the `supabase-db-migrate` command to run all migrations in order.

---

## Data Migration (Existing Products)

No data migration needed. All new columns have safe defaults:
- `track_inventory = false` → existing products unchanged, no stock tracking
- `stock_quantity = 0` → irrelevant when tracking disabled
- `industry = 'other'` → existing merchants get generic defaults
- `delivery_fee_nad = 0` → existing orders stay free delivery

Merchants opt-in to inventory tracking per product. Zero disruption.

---

## Assumptions

1. Migration files mounted into Docker container at `/migrations/` path
2. Production DB accessible via `docker compose exec supabase-db`
3. No existing migration 005/006/007 (numbers are available)
4. `place_order()` from migration 004 will be replaced by 006 (CREATE OR REPLACE)
5. Trigger fires AFTER UPDATE — no performance concern for order table size in V1
6. Stock adjustments table will grow — add retention/cleanup policy in V2 if needed
