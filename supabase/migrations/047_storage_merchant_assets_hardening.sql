-- Migration 047: harden the PUBLIC merchant-assets bucket.
--
-- (1) Drop the blanket public SELECT policy that let any anonymous client LIST/enumerate
--     every merchant's folder + filenames (Supabase lint 0025). Public object reads keep
--     working via the bucket's public=true flag (/storage/v1/object/public/...), which does
--     NOT depend on this RLS SELECT policy. An owner-scoped list policy is added so a
--     signed-in merchant can still list their OWN folder in the dashboard.
--
-- (2) Replace the INSERT policy (with_check was bucket_id only) with one that binds the
--     first path segment to the caller's auth.uid(), so a merchant can no longer write into
--     another merchant's {uid}/ folder. The client uploader already uses `${userId}/...`,
--     so legitimate uploads are unaffected; service-role routes (api/upload, sync/smd)
--     bypass RLS entirely and are unaffected.
--
-- NOTE: bucket-level allowed_mime_types/file_size_limit (advisor STOR-3) are intentionally
-- NOT set here to avoid breaking the service-role SMD image sync; tracked as a follow-up.

-- (1) Listing -----------------------------------------------------------------
DROP POLICY IF EXISTS "Merchant assets: public read" ON storage.objects;

CREATE POLICY "Merchant assets: owner list" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'merchant-assets'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- (2) Upload ownership --------------------------------------------------------
DROP POLICY IF EXISTS "Merchant assets: authenticated upload" ON storage.objects;

CREATE POLICY "Merchant assets: owner upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'merchant-assets'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );
