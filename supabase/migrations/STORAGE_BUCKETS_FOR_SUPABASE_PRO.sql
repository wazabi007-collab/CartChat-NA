-- ============================================================
-- OshiCart — Storage Buckets for Supabase Pro
-- Run AFTER the main migration in SQL Editor
-- ============================================================

-- Create buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('merchant-assets', 'merchant-assets', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('order-proofs', 'order-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Merchant assets: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'merchant-assets');

CREATE POLICY "Merchant assets: owner upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'merchant-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Merchant assets: owner delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'merchant-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Order proofs: anyone upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'order-proofs');

CREATE POLICY "Order proofs: authenticated read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'order-proofs' AND auth.role() = 'authenticated');
