-- Add duration_days field to funding_contracts table
-- This field stores the calculated duration in days between start_date and end_date

ALTER TABLE funding_contracts 
ADD COLUMN IF NOT EXISTS duration_days INTEGER;

-- Add comment to explain the field
COMMENT ON COLUMN funding_contracts.duration_days IS 'Contract duration in days, calculated from start_date to end_date (inclusive)';

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_funding_contracts_duration_days ON funding_contracts(duration_days);

-- Update existing contracts with duration calculation
UPDATE funding_contracts 
SET duration_days = CASE 
  WHEN start_date IS NOT NULL AND end_date IS NOT NULL THEN
    (end_date::date - start_date::date)::INTEGER + 1
  ELSE NULL
END
WHERE duration_days IS NULL;
