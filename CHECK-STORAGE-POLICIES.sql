-- ============================================================================
-- CHECK STORAGE POLICIES FOR EXPORTS BUCKET
-- ============================================================================

-- Check if policies exist for exports bucket
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%export%'
ORDER BY policyname;

-- If no results, the policies weren't created!
-- You need to run the policy creation part of migration 023

-- ============================================================================
-- QUICK FIX: Create policies if missing
-- ============================================================================

-- Run this if the above query returns 0 rows:

-- Policy: Allow authenticated users to upload PDFs
DROP POLICY IF EXISTS "Authenticated users can upload exports" ON storage.objects;
CREATE POLICY "Authenticated users can upload exports"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'exports' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'contracts'
);

-- Policy: Allow authenticated users to read their organization's PDFs
DROP POLICY IF EXISTS "Users can read their organization exports" ON storage.objects;
CREATE POLICY "Users can read their organization exports"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'exports' 
  AND auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to update their exports
DROP POLICY IF EXISTS "Authenticated users can update exports" ON storage.objects;
CREATE POLICY "Authenticated users can update exports"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'exports' 
  AND auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to delete their exports
DROP POLICY IF EXISTS "Authenticated users can delete exports" ON storage.objects;
CREATE POLICY "Authenticated users can delete exports"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'exports' 
  AND auth.role() = 'authenticated'
);

-- ============================================================================
-- ALTERNATIVE: Make bucket temporarily public for testing
-- ============================================================================

-- If policies are complex, you can make the bucket public temporarily:
-- (NOT RECOMMENDED for production - PDFs should be private!)

UPDATE storage.buckets
SET public = true
WHERE id = 'exports';

-- After testing, set it back to private:
-- UPDATE storage.buckets SET public = false WHERE id = 'exports';

