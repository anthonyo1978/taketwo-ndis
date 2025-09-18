-- Update resident status constraint to change 'Draft' to 'Prospect'
-- This aligns with the new status flow: Prospect -> Active -> Deactivated

-- First, drop the existing constraint
ALTER TABLE residents DROP CONSTRAINT IF EXISTS residents_status_check;

-- Add the new constraint with 'Prospect' instead of 'Draft'
ALTER TABLE residents ADD CONSTRAINT residents_status_check 
  CHECK (status IN ('Prospect', 'Active', 'Deactivated'));

-- Update any existing 'Draft' status to 'Prospect'
UPDATE residents SET status = 'Prospect' WHERE status = 'Draft';

-- Update the default value to 'Prospect'
ALTER TABLE residents ALTER COLUMN status SET DEFAULT 'Prospect';

-- Add comment
COMMENT ON COLUMN residents.status IS 'Resident status: Prospect (potential resident), Active (living in house), Deactivated (moved out)';
