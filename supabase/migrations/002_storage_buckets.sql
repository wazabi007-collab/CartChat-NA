-- ChatCart NA — Storage Buckets
-- Run after storage service is up

INSERT INTO storage.buckets (id, name, public)
VALUES ('merchant-assets', 'merchant-assets', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('order-proofs', 'order-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Policies (skip if already exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Merchant assets: public read') THEN
    CREATE POLICY "Merchant assets: public read" ON storage.objects FOR SELECT USING (bucket_id = 'merchant-assets');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Merchant assets: owner upload') THEN
    CREATE POLICY "Merchant assets: owner upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'merchant-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Merchant assets: owner delete') THEN
    CREATE POLICY "Merchant assets: owner delete" ON storage.objects FOR DELETE USING (bucket_id = 'merchant-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Order proofs: anyone upload') THEN
    CREATE POLICY "Order proofs: anyone upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'order-proofs');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Order proofs: authenticated read') THEN
    CREATE POLICY "Order proofs: authenticated read" ON storage.objects FOR SELECT USING (bucket_id = 'order-proofs' AND auth.role() = 'authenticated');
  END IF;
END $$;
