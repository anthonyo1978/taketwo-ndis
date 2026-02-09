-- ============================================================================
-- STORAGE SECURITY FIX
-- Organization-Based File Isolation for Storage Buckets
-- ============================================================================
-- RUN THIS IN SUPABASE SQL EDITOR TO FIX STORAGE BUCKET SECURITY
-- 
-- WHAT THIS FIXES:
-- - Prevents users from Org A accessing files uploaded by Org B
-- - Enforces organization_id-based folder structure
-- - Applies to: house-images, exports, claim-exports buckets
-- 
-- MIGRATION STRATEGY:
-- - Backwards compatible: Existing files at root level remain readable
-- - New uploads MUST use {organization_id}/{filename} path structure
-- 
-- IMPORTANT: Update your upload code to use organization_id in path:
--   OLD: `house-images/property-123.jpg`
--   NEW: `house-images/{organization_id}/property-123.jpg`
-- ============================================================================

-- ============================================================================
-- 1. HOUSE-IMAGES BUCKET
-- ============================================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow authenticated uploads to house-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to house-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes in house-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates in house-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Access to House Images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload house images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete house images" ON storage.objects;

-- SELECT: Users can only read files in their organization's folder
CREATE POLICY "Users can read own org images in house-images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'house-images' 
  AND (
    -- Allow access to files in user's org folder
    (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM public.users WHERE auth_user_id = auth.uid()
    )
    -- OR allow root level for backwards compatibility (TEMPORARY)
    OR (storage.foldername(name))[1] IS NULL
  )
);

-- INSERT: Users can only upload to their organization's folder
CREATE POLICY "Users can upload to own org folder in house-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'house-images' 
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.users WHERE auth_user_id = auth.uid()
  )
);

-- UPDATE: Users can only update files in their organization's folder
CREATE POLICY "Users can update own org images in house-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'house-images' 
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.users WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'house-images' 
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.users WHERE auth_user_id = auth.uid()
  )
);

-- DELETE: Users can only delete files in their organization's folder
CREATE POLICY "Users can delete own org images in house-images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'house-images' 
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.users WHERE auth_user_id = auth.uid()
  )
);

-- ============================================================================
-- 2. EXPORTS BUCKET (PDF contracts, etc.)
-- ============================================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload exports" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their organization exports" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update exports" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete exports" ON storage.objects;

-- SELECT: Users can only read exports in their organization's folder
CREATE POLICY "Users can read own org exports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'exports' 
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.users WHERE auth_user_id = auth.uid()
  )
);

-- INSERT: Users can only upload to their organization's folder
CREATE POLICY "Users can upload to own org folder in exports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exports' 
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.users WHERE auth_user_id = auth.uid()
  )
);

-- UPDATE: Users can only update files in their organization's folder
CREATE POLICY "Users can update own org exports"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'exports' 
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.users WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'exports' 
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.users WHERE auth_user_id = auth.uid()
  )
);

-- DELETE: Users can only delete files in their organization's folder
CREATE POLICY "Users can delete own org exports"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'exports' 
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.users WHERE auth_user_id = auth.uid()
  )
);

-- ============================================================================
-- 3. CLAIM-EXPORTS BUCKET
-- ============================================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow authenticated uploads to claim exports" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to claim exports" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes in claim exports" ON storage.objects;

-- SELECT: Users can only read claim exports in their organization's folder
CREATE POLICY "Users can read own org claim exports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'claim-exports' 
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.users WHERE auth_user_id = auth.uid()
  )
);

-- INSERT: Users can only upload to their organization's folder
CREATE POLICY "Users can upload to own org folder in claim-exports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'claim-exports' 
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.users WHERE auth_user_id = auth.uid()
  )
);

-- UPDATE: Users can only update files in their organization's folder
CREATE POLICY "Users can update own org claim exports"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'claim-exports' 
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.users WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'claim-exports' 
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.users WHERE auth_user_id = auth.uid()
  )
);

-- DELETE: Users can only delete files in their organization's folder
CREATE POLICY "Users can delete own org claim exports"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'claim-exports' 
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.users WHERE auth_user_id = auth.uid()
  )
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- View all storage policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
ORDER BY policyname;

-- Count files per bucket (helps identify existing files)
SELECT 
  bucket_id,
  COUNT(*) as file_count,
  COUNT(DISTINCT (storage.foldername(name))[1]) as org_folders
FROM storage.objects
WHERE bucket_id IN ('house-images', 'exports', 'claim-exports')
GROUP BY bucket_id;

-- ============================================================================
-- POST-MIGRATION TODO
-- ============================================================================

-- After running this SQL, you need to update your upload code:
--
-- 1. components/houses/HouseImageUpload.tsx
--    Update upload path to: `${organizationId}/${filename}`
--
-- 2. app/api/claims/[id]/export/route.ts
--    Update file path to: `exports/${organizationId}/${filename}`
--
-- 3. Any other file upload components
--    Always prefix path with organization_id
--
-- Example code change:
--
-- BEFORE:
-- const { data, error } = await supabase.storage
--   .from('house-images')
--   .upload(`property-${houseId}.jpg`, file)
--
-- AFTER:
-- const organizationId = await getCurrentUserOrganizationId()
-- const { data, error } = await supabase.storage
--   .from('house-images')
--   .upload(`${organizationId}/property-${houseId}.jpg`, file)
--
-- ============================================================================

-- ✅ Migration complete!
-- Storage buckets are now isolated by organization.
-- Users can only access files in their organization's folder.

