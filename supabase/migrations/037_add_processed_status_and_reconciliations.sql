-- Migration: Add 'processed' status to claims and 'error' to transactions, create reconciliations table
-- Description: Supports Phase 2 - Response file upload and claim reconciliation

-- Step 1: Update transaction status enum to include 'error'
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_status_check;

ALTER TABLE transactions
ADD CONSTRAINT transactions_status_check 
CHECK (status IN ('draft', 'picked_up', 'submitted', 'paid', 'rejected', 'error'));

-- Step 2: Update claim status enum to include 'processed'
ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_status_check;

ALTER TABLE claims
ADD CONSTRAINT claims_status_check 
CHECK (status IN ('draft', 'in_progress', 'processed', 'submitted', 'paid', 'rejected'));

-- Step 3: Create claim_reconciliations table
CREATE TABLE IF NOT EXISTS claim_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  file_name TEXT NOT NULL,
  file_path TEXT,
  results_json JSONB NOT NULL,
  total_processed INTEGER NOT NULL DEFAULT 0,
  total_paid INTEGER NOT NULL DEFAULT 0,
  total_rejected INTEGER NOT NULL DEFAULT 0,
  total_errors INTEGER NOT NULL DEFAULT 0,
  total_unmatched INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_claim_reconciliations_claim_id ON claim_reconciliations(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_reconciliations_created_at ON claim_reconciliations(created_at);

-- Step 5: Enable RLS
ALTER TABLE claim_reconciliations ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies
CREATE POLICY "Allow authenticated users to read reconciliations"
ON claim_reconciliations
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to create reconciliations"
ON claim_reconciliations
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow service role full access to reconciliations"
ON claim_reconciliations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Step 7: Add comments for documentation
COMMENT ON TABLE claim_reconciliations IS 'Records of claim response file uploads and reconciliation results';
COMMENT ON COLUMN claim_reconciliations.results_json IS 'Detailed results including success/error counts and transaction-level outcomes';
COMMENT ON COLUMN claim_reconciliations.total_processed IS 'Total number of transactions processed from response file';
COMMENT ON COLUMN claim_reconciliations.total_paid IS 'Number of transactions marked as paid/approved';
COMMENT ON COLUMN claim_reconciliations.total_rejected IS 'Number of transactions marked as rejected/denied';
COMMENT ON COLUMN claim_reconciliations.total_errors IS 'Number of transactions with processing errors';
COMMENT ON COLUMN claim_reconciliations.total_unmatched IS 'Number of transactions in response file that could not be matched';

