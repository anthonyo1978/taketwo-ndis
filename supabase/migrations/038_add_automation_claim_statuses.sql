-- Add new automation-related claim statuses
-- This migration adds 'automation_in_progress' and 'auto_processed' to the claim status enum

-- First, drop the existing constraint
ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_status_check;

-- Add the new constraint with additional statuses
ALTER TABLE claims ADD CONSTRAINT claims_status_check 
CHECK (status IN (
  'draft', 
  'in_progress', 
  'processed', 
  'submitted', 
  'paid', 
  'rejected', 
  'partially_paid',
  'automation_in_progress',
  'auto_processed'
));
