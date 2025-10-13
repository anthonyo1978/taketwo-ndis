-- Migration: Add file export fields to claims table and update status enum
-- Description: Supports Uplift A - CSV export functionality for claims

-- Step 1: Add new fields to claims table
ALTER TABLE claims
ADD COLUMN IF NOT EXISTS file_path TEXT,
ADD COLUMN IF NOT EXISTS file_generated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS file_generated_by UUID REFERENCES users(id);

-- Step 2: Update the status enum to include 'in_progress'
-- First, drop the existing constraint
ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_status_check;

-- Add the new constraint with in_progress status
ALTER TABLE claims
ADD CONSTRAINT claims_status_check 
CHECK (status IN ('draft', 'in_progress', 'submitted', 'paid', 'rejected'));

-- Step 3: Create index on file_generated_at for performance
CREATE INDEX IF NOT EXISTS idx_claims_file_generated_at ON claims(file_generated_at);

-- Step 4: Add comments for documentation
COMMENT ON COLUMN claims.file_path IS 'Path to the latest generated CSV export file in Supabase Storage';
COMMENT ON COLUMN claims.file_generated_at IS 'Timestamp when the claim file was last generated';
COMMENT ON COLUMN claims.file_generated_by IS 'User ID who generated the claim file';

