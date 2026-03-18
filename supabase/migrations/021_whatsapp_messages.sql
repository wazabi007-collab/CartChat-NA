-- WhatsApp message log table
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  template_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'queued',
  -- status: queued, sent, delivered, read, failed
  meta_message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
);

CREATE INDEX idx_wa_messages_merchant ON whatsapp_messages(merchant_id);
CREATE INDEX idx_wa_messages_order ON whatsapp_messages(order_id);
CREATE INDEX idx_wa_messages_status ON whatsapp_messages(status);

-- Enable RLS (service_role only — all access via API routes)
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_messages_service_role" ON whatsapp_messages
  FOR ALL USING ((select auth.role()) = 'service_role');

-- Add reminder tracking columns to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS reminder_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ;
