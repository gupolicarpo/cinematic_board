-- ============================================================
--  STORAGE MIGRATION — run this in Supabase SQL Editor
--  Makes the cinematic-assets bucket public so stored files
--  can be served via permanent public URLs (no expiry).
-- ============================================================

-- 1. Make the bucket public
UPDATE storage.buckets
SET public = true
WHERE id = 'cinematic-assets';

-- 2. Allow public reads on the bucket (anyone with the URL can read)
DROP POLICY IF EXISTS "public read cinematic-assets" ON storage.objects;
CREATE POLICY "public read cinematic-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cinematic-assets');

-- 3. Users can upload/delete only inside their own folder ({user_id}/...)
DROP POLICY IF EXISTS "owner write cinematic-assets" ON storage.objects;
CREATE POLICY "owner write cinematic-assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'cinematic-assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "owner delete cinematic-assets" ON storage.objects;
CREATE POLICY "owner delete cinematic-assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'cinematic-assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 4. Service role can write anywhere (veo-cache folder, etc.)
--    The service role key bypasses RLS automatically — no extra policy needed.

-- Done! The bucket is now public with per-user write restrictions.
