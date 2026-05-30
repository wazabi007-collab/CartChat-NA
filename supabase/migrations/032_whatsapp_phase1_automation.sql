-- WhatsApp Phase 1 automation metadata and announcement records

ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS event_key TEXT;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS recipient_type TEXT;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS category TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_messages_event_key
  ON whatsapp_messages(event_key)
  WHERE event_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wa_messages_template
  ON whatsapp_messages(template_name);

CREATE TABLE IF NOT EXISTS merchant_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  template_name TEXT NOT NULL,
  audience_filter TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sending', 'sent', 'failed')),
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_merchant_announcements_created
  ON merchant_announcements(created_at DESC);

ALTER TABLE merchant_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "merchant_announcements_service_role" ON merchant_announcements;
CREATE POLICY "merchant_announcements_service_role" ON merchant_announcements
  FOR ALL USING ((select auth.role()) = 'service_role');
