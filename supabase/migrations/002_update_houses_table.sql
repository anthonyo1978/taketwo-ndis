-- Add missing fields to houses table to match frontend schema
ALTER TABLE houses 
ADD COLUMN unit TEXT,
ADD COLUMN country TEXT DEFAULT 'AU',
ADD COLUMN status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Vacant', 'Under maintenance')),
ADD COLUMN notes TEXT,
ADD COLUMN go_live_date DATE,
ADD COLUMN resident TEXT;

-- Update the comment
COMMENT ON TABLE houses IS 'NDIS supported accommodation houses with full schema';
