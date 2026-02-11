-- Migration: Add photo_url column to residents table
-- This migrates resident photos from base64 (stored in photo_base64 TEXT column)
-- to Supabase Storage URLs (stored in photo_url TEXT column).
-- 
-- The photo_base64 column is kept for backward compatibility during transition.
-- Existing residents with base64 photos will continue to work until migrated.

-- Add the new photo_url column
ALTER TABLE residents ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add a comment explaining the migration
COMMENT ON COLUMN residents.photo_url IS 'URL to resident photo in Supabase Storage (resident-photos bucket). Replaces photo_base64.';
COMMENT ON COLUMN residents.photo_base64 IS 'DEPRECATED: Legacy base64-encoded photo. Use photo_url instead. Will be removed in a future migration.';

