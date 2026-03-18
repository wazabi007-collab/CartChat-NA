-- 1. Add 'ready' to order_status enum
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'ready' BEFORE 'completed';

-- 2. Add tracking_token column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_token TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_orders_tracking_token ON orders(tracking_token);

-- 3. Add status_history column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_history JSONB NOT NULL DEFAULT '[]';

-- 4. Backfill tracking_tokens for existing orders
UPDATE orders SET tracking_token = substr(md5(id::text || random()::text), 1, 8)
WHERE tracking_token IS NULL;

-- 5. Backfill status_history for existing orders
UPDATE orders SET status_history = json_build_array(
  json_build_object('status', status::text, 'at', created_at)
)::jsonb
WHERE status_history = '[]'::jsonb;

-- 6. Create append_order_status RPC (atomically updates status + appends history)
CREATE OR REPLACE FUNCTION append_order_status(p_order_id uuid, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE orders
  SET status = p_status::order_status,
      status_history = status_history || jsonb_build_array(
        jsonb_build_object('status', p_status, 'at', now())
      )
  WHERE id = p_order_id;
END;
$$;
