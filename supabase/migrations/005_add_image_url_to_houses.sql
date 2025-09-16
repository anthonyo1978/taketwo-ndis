-- Add image_url field to houses table
ALTER TABLE houses
ADD COLUMN image_url TEXT;

-- Add comment
COMMENT ON COLUMN houses.image_url IS 'URL of the house image stored in Supabase Storage';
