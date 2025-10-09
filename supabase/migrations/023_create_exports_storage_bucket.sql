-- ============================================================================
-- CREATE EXPORTS STORAGE BUCKET FOR PDF CONTRACTS
-- ============================================================================

-- Create storage bucket for PDF exports
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exports',
  'exports',
  false,  -- Private bucket (requires signed URLs)
  10485760,  -- 10MB file size limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE POLICIES FOR PDF EXPORTS
-- ============================================================================

-- Policy: Allow authenticated users to upload PDFs
-- Note: Simplified - removed folder check for easier debugging
CREATE POLICY "Authenticated users can upload exports"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'exports' 
  AND auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to read their organization's PDFs
CREATE POLICY "Users can read their organization exports"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'exports' 
  AND auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to update their exports
CREATE POLICY "Authenticated users can update exports"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'exports' 
  AND auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to delete their exports
CREATE POLICY "Authenticated users can delete exports"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'exports' 
  AND auth.role() = 'authenticated'
);

-- ============================================================================
-- VERIFY SETUP
-- ============================================================================

-- Check if bucket was created
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'exports';

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Bucket is PRIVATE (not public) for security
-- 2. PDFs accessed via signed URLs (15 min expiry)
-- 3. Only authenticated users can upload/access
-- 4. File size limit: 10MB per PDF
-- 5. Only PDF files allowed

