-- Add is_orphaned field to transactions table
-- This field indicates if a transaction is outside the contract date boundaries

ALTER TABLE transactions 
ADD COLUMN is_orphaned BOOLEAN DEFAULT false;

-- Add comment to explain the field
COMMENT ON COLUMN transactions.is_orphaned IS 'Indicates if transaction is outside contract date boundaries and will not draw down from contract balance';
