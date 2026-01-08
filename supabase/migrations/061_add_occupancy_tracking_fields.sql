-- ============================================================================
-- ADD OCCUPANCY TRACKING FIELDS
-- ============================================================================
-- Adds bedroom count to houses and move-in/move-out dates to residents
-- to enable occupancy tracking and visualization
-- ============================================================================

-- Add bedroom_count to houses table
ALTER TABLE houses 
ADD COLUMN IF NOT EXISTS bedroom_count INTEGER DEFAULT 1 CHECK (bedroom_count > 0);

COMMENT ON COLUMN houses.bedroom_count IS 'Number of bedrooms in the house for occupancy tracking';

-- Add move-in and move-out dates to residents table
ALTER TABLE residents
ADD COLUMN IF NOT EXISTS move_in_date DATE,
ADD COLUMN IF NOT EXISTS move_out_date DATE;

COMMENT ON COLUMN residents.move_in_date IS 'Date when resident moved into the house';
COMMENT ON COLUMN residents.move_out_date IS 'Date when resident moved out of the house (NULL if currently residing)';

-- Add constraint: move_out_date must be after move_in_date
ALTER TABLE residents
ADD CONSTRAINT check_move_dates CHECK (
  move_out_date IS NULL OR move_in_date IS NULL OR move_out_date >= move_in_date
);

-- Create index for occupancy queries
CREATE INDEX IF NOT EXISTS idx_residents_move_dates ON residents(move_in_date, move_out_date);
CREATE INDEX IF NOT EXISTS idx_residents_house_status ON residents(house_id, status);

