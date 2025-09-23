-- Add automation fields to funding_contracts table for automated batch drawdown
-- This migration adds the necessary fields for automated billing functionality

-- Add automation-related fields
ALTER TABLE funding_contracts 
ADD COLUMN IF NOT EXISTS auto_billing_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS next_run_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS first_run_date TIMESTAMP WITH TIME ZONE;

-- Rename drawdown_rate to automated_drawdown_frequency for clarity
-- Note: This is a breaking change, so we'll add the new column and migrate data
ALTER TABLE funding_contracts 
ADD COLUMN IF NOT EXISTS automated_drawdown_frequency TEXT DEFAULT 'monthly' 
CHECK (automated_drawdown_frequency IN ('daily', 'weekly', 'fortnightly'));

-- Migrate existing drawdown_rate data to the new field
UPDATE funding_contracts 
SET automated_drawdown_frequency = CASE 
  WHEN drawdown_rate = 'daily' THEN 'daily'
  WHEN drawdown_rate = 'weekly' THEN 'weekly'
  WHEN drawdown_rate = 'monthly' THEN 'fortnightly' -- Map monthly to fortnightly as closest equivalent
  ELSE 'fortnightly'
END
WHERE automated_drawdown_frequency IS NULL;

-- Add comment to explain the automation fields
COMMENT ON COLUMN funding_contracts.auto_billing_enabled IS 'Whether automated billing is enabled for this contract';
COMMENT ON COLUMN funding_contracts.next_run_date IS 'Next scheduled date for automated billing run';
COMMENT ON COLUMN funding_contracts.first_run_date IS 'First scheduled date for automated billing run';
COMMENT ON COLUMN funding_contracts.automated_drawdown_frequency IS 'Frequency of automated billing: daily, weekly, or fortnightly';
