-- Create house-images storage bucket with proper RLS policies

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('house-images', 'house-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated uploads to house-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to house-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes in house-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates in house-images" ON storage.objects;

-- Allow authenticated users to upload images
CREATE POLICY "Allow authenticated uploads to house-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'house-images');

-- Allow public read access to images
CREATE POLICY "Allow public read access to house-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'house-images');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Allow authenticated deletes in house-images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'house-images');

-- Allow authenticated users to update their uploads
CREATE POLICY "Allow authenticated updates in house-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'house-images')
WITH CHECK (bucket_id = 'house-images');

