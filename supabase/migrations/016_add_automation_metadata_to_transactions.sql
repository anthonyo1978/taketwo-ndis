-- Add automation metadata fields to transactions table
-- This allows us to identify and track auto-generated transactions

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS is_automated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS automation_run_id UUID REFERENCES automation_logs(id),
ADD COLUMN IF NOT EXISTS automation_metadata JSONB DEFAULT '{}'::jsonb;

-- Create index for efficient querying of automated transactions
CREATE INDEX idx_transactions_is_automated ON transactions(is_automated);
CREATE INDEX idx_transactions_automation_run_id ON transactions(automation_run_id);

-- Add comments to explain the new fields
COMMENT ON COLUMN transactions.is_automated IS 'Whether this transaction was created by automation';
COMMENT ON COLUMN transactions.automation_run_id IS 'Reference to the automation log entry that created this transaction';
COMMENT ON COLUMN transactions.automation_metadata IS 'Additional metadata about the automation process (e.g., contract details, run date)';
