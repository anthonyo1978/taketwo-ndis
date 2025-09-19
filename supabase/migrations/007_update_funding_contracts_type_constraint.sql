-- Update funding_contracts type constraint to support new funding models
-- Drop the existing constraint
ALTER TABLE funding_contracts DROP CONSTRAINT IF EXISTS funding_contracts_type_check;

-- Add the new constraint with updated funding model values
ALTER TABLE funding_contracts ADD CONSTRAINT funding_contracts_type_check 
CHECK (type IN ('Draw Down', 'Capture & Invoice', 'Hybrid'));

-- Update any existing records to use the new funding model values
-- Map old values to new values
UPDATE funding_contracts 
SET type = CASE 
  WHEN type = 'NDIS' THEN 'Draw Down'
  WHEN type = 'Government' THEN 'Capture & Invoice'
  WHEN type = 'Private' THEN 'Hybrid'
  WHEN type = 'Family' THEN 'Hybrid'
  WHEN type = 'Other' THEN 'Hybrid'
  ELSE 'Draw Down' -- Default fallback
END
WHERE type IN ('NDIS', 'Government', 'Private', 'Family', 'Other');
