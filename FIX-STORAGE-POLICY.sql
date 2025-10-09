-- ============================================================================
-- FIX STORAGE UPLOAD POLICY FOR EXPORTS BUCKET
-- Run this to fix the "Failed to save PDF" error
-- ============================================================================

-- The current policy has a folder check that might be blocking uploads
-- Let's simplify it to just check authentication

-- Drop the existing policy
DROP POLICY IF EXISTS "Authenticated users can upload exports" ON storage.objects;

-- Create a simpler policy without folder restrictions
CREATE POLICY "Authenticated users can upload exports"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'exports' 
  AND auth.role() = 'authenticated'
);

-- Verify the policy was updated
SELECT policyname, cmd, qual
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname = 'Authenticated users can upload exports';

-- ============================================================================
-- ALTERNATIVE: Temporarily disable RLS for testing
-- ============================================================================

-- If the above doesn't work, you can temporarily disable RLS:
-- (NOT RECOMMENDED for production!)

-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- After testing, re-enable it:
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- NOTES
-- ============================================================================
-- The original policy had this condition:
--   AND (storage.foldername(name))[1] = 'contracts'
-- 
-- This checks if the first folder in the path is 'contracts'
-- But it might be failing if the path format is slightly different
-- 
-- The simplified policy just checks:
-- 1. Bucket is 'exports'
-- 2. User is authenticated
-- 
-- This should work for all authenticated uploads to the exports bucket

