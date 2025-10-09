-- ============================================================================
-- SUPABASE STORAGE SETUP FOR IMAGE UPLOADS
-- Run this in Supabase SQL Editor to create storage buckets
-- ============================================================================

-- Create storage bucket for house images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'house-images',
  'house-images',
  true,  -- Public bucket (images accessible via URL)
  5242880,  -- 5MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for resident photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resident-photos',
  'resident-photos',
  true,  -- Public bucket (photos accessible via URL)
  5242880,  -- 5MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE POLICIES (Allow public read, authenticated write)
-- ============================================================================

-- Policy: Allow anyone to read house images (public bucket)
CREATE POLICY "Public Access to House Images"
ON storage.objects FOR SELECT
USING (bucket_id = 'house-images');

-- Policy: Allow authenticated users to upload house images
CREATE POLICY "Authenticated users can upload house images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'house-images' AND auth.role() = 'authenticated');

-- Policy: Allow authenticated users to update house images
CREATE POLICY "Authenticated users can update house images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'house-images' AND auth.role() = 'authenticated');

-- Policy: Allow authenticated users to delete house images
CREATE POLICY "Authenticated users can delete house images"
ON storage.objects FOR DELETE
USING (bucket_id = 'house-images' AND auth.role() = 'authenticated');

-- Policy: Allow anyone to read resident photos (public bucket)
CREATE POLICY "Public Access to Resident Photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'resident-photos');

-- Policy: Allow authenticated users to upload resident photos
CREATE POLICY "Authenticated users can upload resident photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'resident-photos' AND auth.role() = 'authenticated');

-- Policy: Allow authenticated users to update resident photos
CREATE POLICY "Authenticated users can update resident photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'resident-photos' AND auth.role() = 'authenticated');

-- Policy: Allow authenticated users to delete resident photos
CREATE POLICY "Authenticated users can delete resident photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'resident-photos' AND auth.role() = 'authenticated');

-- ============================================================================
-- VERIFY SETUP
-- ============================================================================

-- Check if buckets were created
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id IN ('house-images', 'resident-photos');

-- Check if policies were created
SELECT * FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Run this SQL in your Supabase project's SQL Editor
-- 2. Buckets are created with public read access
-- 3. Only authenticated users can upload/modify images
-- 4. File size limit is 5MB per image
-- 5. Only image file types are allowed

-- IMPORTANT: If you've already created buckets via the Supabase dashboard,
-- this SQL will skip them (ON CONFLICT DO NOTHING). You can verify your
-- existing buckets using the SELECT query above.

