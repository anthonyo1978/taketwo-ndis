-- ============================================================================
-- CREATE CLAIMS TABLE AND UPDATE TRANSACTIONS FOR CLAIMING MODULE
-- ============================================================================

-- STEP 1: Update transactions table first (migrate status values)
-- Drop old status check constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_status_check;

-- Update transaction status enum to support claiming workflow
-- Old: draft, posted, voided
-- New: draft, picked_up, submitted, paid, rejected
ALTER TABLE transactions 
  ALTER COLUMN status TYPE TEXT;

-- Update existing transactions to use new status values FIRST
-- Map old values to new values:
-- 'posted' → 'paid' (already processed and paid)
-- 'voided' → 'rejected' (cancelled/rejected)
-- 'draft' → 'draft' (unchanged)
UPDATE transactions
SET status = CASE
  WHEN status = 'posted' THEN 'paid'
  WHEN status = 'voided' THEN 'rejected'
  ELSE status
END
WHERE status IN ('posted', 'voided');

-- NOW add new check constraint (after data is migrated)
ALTER TABLE transactions
  ADD CONSTRAINT transactions_status_check 
  CHECK (status IN ('draft', 'picked_up', 'submitted', 'paid', 'rejected'));

-- STEP 2: Create claims table (so we can reference it in foreign key)
CREATE TABLE IF NOT EXISTS claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number TEXT NOT NULL UNIQUE,  -- Human-readable ID (CLM-0000001)
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  filters_json JSONB,  -- Stores filter parameters used (date range, resident id, etc.)
  transaction_count INTEGER DEFAULT 0,
  total_amount NUMERIC(10, 2) DEFAULT 0,  -- Sum of all transaction amounts
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'paid', 'rejected')),
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX idx_claims_claim_number ON claims(claim_number);
CREATE INDEX idx_claims_created_by ON claims(created_by);
CREATE INDEX idx_claims_created_at ON claims(created_at DESC);
CREATE INDEX idx_claims_status ON claims(status);

-- Function to generate next claim number
-- Format: CLM-0000001 (sequential)
CREATE OR REPLACE FUNCTION generate_claim_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
  claim_num TEXT;
BEGIN
  -- Get the highest existing claim number
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(claim_number FROM 'CLM-(\d+)') AS INTEGER
      )
    ), 0
  ) + 1
  INTO next_num
  FROM claims;
  
  -- Format with leading zeros (7 digits)
  claim_num := 'CLM-' || LPAD(next_num::TEXT, 7, '0');
  
  RETURN claim_num;
END;
$$;

-- Function to update claim totals when transactions change
CREATE OR REPLACE FUNCTION update_claim_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update the claim's transaction count and total amount
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.claim_id IS NOT NULL THEN
      UPDATE claims
      SET 
        transaction_count = (
          SELECT COUNT(*)
          FROM transactions
          WHERE claim_id = NEW.claim_id
        ),
        total_amount = (
          SELECT COALESCE(SUM(amount), 0)
          FROM transactions
          WHERE claim_id = NEW.claim_id
        ),
        updated_at = NOW()
      WHERE id = NEW.claim_id;
    END IF;
  END IF;
  
  -- If transaction was removed from a claim
  IF TG_OP = 'UPDATE' AND OLD.claim_id IS NOT NULL AND OLD.claim_id != NEW.claim_id THEN
    UPDATE claims
    SET 
      transaction_count = (
        SELECT COUNT(*)
        FROM transactions
        WHERE claim_id = OLD.claim_id
      ),
      total_amount = (
        SELECT COALESCE(SUM(amount), 0)
        FROM transactions
        WHERE claim_id = OLD.claim_id
      ),
      updated_at = NOW()
    WHERE id = OLD.claim_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Enable RLS
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated users to read claims"
  ON claims FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow server to manage claims"
  ON claims FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comments
COMMENT ON TABLE claims IS 'Bulk claims for submitting transactions to funding agencies';
COMMENT ON COLUMN claims.claim_number IS 'Sequential claim ID: CLM-0000001, CLM-0000002, etc.';
COMMENT ON COLUMN claims.filters_json IS 'JSON object storing the filters used to create this claim (resident_id, date_from, date_to, etc.)';
COMMENT ON COLUMN claims.transaction_count IS 'Auto-calculated count of transactions linked to this claim';
COMMENT ON COLUMN claims.total_amount IS 'Auto-calculated sum of all transaction amounts in this claim';
COMMENT ON COLUMN claims.status IS 'Claim status: draft (created), submitted (sent to funder), paid (received), rejected (denied)';

-- ============================================================================
-- STEP 3: Add claim_id to transactions (now that claims table exists)
-- ============================================================================

-- Add claim_id field to link transactions to claims
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS claim_id UUID REFERENCES claims(id) ON DELETE SET NULL;

-- Add indexes for fast claim lookups
CREATE INDEX IF NOT EXISTS idx_transactions_claim_id ON transactions(claim_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- Add comments
COMMENT ON COLUMN transactions.status IS 'Transaction claiming status: draft (eligible for claiming), picked_up (included in claim), submitted (claim sent), paid (payment received), rejected (claim denied)';
COMMENT ON COLUMN transactions.claim_id IS 'Links transaction to a claim record if part of a bulk claim';

-- ============================================================================
-- STEP 4: Create trigger (now that claim_id exists)
-- ============================================================================

-- Trigger to auto-update claim totals when transactions change
CREATE TRIGGER update_claim_totals_trigger
  AFTER INSERT OR UPDATE OF claim_id, amount ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_claim_totals();
