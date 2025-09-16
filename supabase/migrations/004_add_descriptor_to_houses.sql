-- Add descriptor field to houses table
ALTER TABLE houses 
ADD COLUMN descriptor TEXT;

-- Add comment
COMMENT ON COLUMN houses.descriptor IS 'Human-friendly name for the house (e.g., "Main Office", "Client House A")';
