-- Update house status from 'Under maintenance' to 'Maintenance'
-- This migration standardizes the status naming

-- Update existing data
UPDATE houses 
SET status = 'Maintenance' 
WHERE status = 'Under maintenance';

-- Update the check constraint
ALTER TABLE houses 
DROP CONSTRAINT IF EXISTS houses_status_check;

ALTER TABLE houses 
ADD CONSTRAINT houses_status_check 
CHECK (status IN ('Active', 'Vacant', 'Maintenance'));
