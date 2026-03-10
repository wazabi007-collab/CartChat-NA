-- ChatCart NA — Delivery Scheduling + Invoicing columns
-- Run after 001_initial_schema.sql

-- Merchant: delivery slot configuration (JSON)
-- Shape: { enabled: bool, days: int[], times: string[] }
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS delivery_slots JSONB DEFAULT NULL;

-- Orders: chosen delivery date and time slot
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_date TEXT DEFAULT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_time TEXT DEFAULT NULL;
