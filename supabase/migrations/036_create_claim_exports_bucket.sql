-- Migration: Create claim-exports storage bucket
-- Description: Storage bucket for CSV export files from claims

-- Create the storage bucket for claim exports
INSERT INTO storage.buckets (id, name, public)
VALUES ('claim-exports', 'claim-exports', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on the bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload claim exports"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'claim-exports' AND
  auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to read their own organization's claim exports
CREATE POLICY "Allow authenticated users to read claim exports"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'claim-exports' AND
  auth.role() = 'authenticated'
);

-- Policy: Allow service role full access (for backend operations)
CREATE POLICY "Allow service role full access to claim exports"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'claim-exports')
WITH CHECK (bucket_id = 'claim-exports');

-- Add comment for documentation
COMMENT ON TABLE storage.buckets IS 'Storage buckets for file uploads. claim-exports bucket stores CSV export files for claims.';

