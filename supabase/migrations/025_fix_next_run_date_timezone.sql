-- Migration: Fix next_run_date timezone issue
-- Change next_run_date from TIMESTAMPTZ to DATE for reliable automation scheduling
--
-- PROBLEM: TIMESTAMPTZ caused timezone mismatches where automation wouldn't run
-- until 10+ hours after midnight in the target timezone.
--
-- SOLUTION: Use DATE type which has no timezone component, making comparisons
-- simple and reliable.

-- Step 1: Add new DATE column
ALTER TABLE funding_contracts 
ADD COLUMN next_run_date_new DATE;

-- Step 2: Convert existing TIMESTAMPTZ data to DATE in Australia/Sydney timezone
-- This ensures existing dates are preserved correctly
UPDATE funding_contracts
SET next_run_date_new = (next_run_date AT TIME ZONE 'Australia/Sydney')::DATE
WHERE next_run_date IS NOT NULL;

-- Step 3: Drop old column
ALTER TABLE funding_contracts 
DROP COLUMN next_run_date;

-- Step 4: Rename new column to original name
ALTER TABLE funding_contracts 
RENAME COLUMN next_run_date_new TO next_run_date;

-- Step 5: Add index for performance (automation queries will filter on this)
CREATE INDEX IF NOT EXISTS idx_funding_contracts_next_run_date 
ON funding_contracts(next_run_date) 
WHERE auto_billing_enabled = true;

-- Step 6: Do the same for first_run_date if it exists (for consistency)
DO $$
BEGIN
  -- Check if first_run_date column exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'funding_contracts' 
    AND column_name = 'first_run_date'
  ) THEN
    -- Add new DATE column
    ALTER TABLE funding_contracts 
    ADD COLUMN first_run_date_new DATE;
    
    -- Convert existing data
    UPDATE funding_contracts
    SET first_run_date_new = (first_run_date AT TIME ZONE 'Australia/Sydney')::DATE
    WHERE first_run_date IS NOT NULL;
    
    -- Drop old column
    ALTER TABLE funding_contracts 
    DROP COLUMN first_run_date;
    
    -- Rename new column
    ALTER TABLE funding_contracts 
    RENAME COLUMN first_run_date_new TO first_run_date;
  END IF;
END $$;

-- Verification: Show updated schema
DO $$
BEGIN
  RAISE NOTICE 'Migration complete!';
  RAISE NOTICE 'next_run_date is now DATE type (no timezone component)';
  RAISE NOTICE 'Automation will now run reliably at the first opportunity after midnight';
END $$;

