-- ============================================================================
-- FIX CLAIM NUMBER UNIQUE CONSTRAINT - Per Organization
-- ============================================================================

-- ISSUE: Claim number is globally unique, preventing Org 2 from using CLM-0000001
-- even though Org 1 already has it

-- SOLUTION: Make uniqueness per-organization, not global
-- Each org can have CLM-0000001, CLM-0000002, etc.

-- Drop the global unique constraint
ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_claim_number_key;

-- Create a composite unique constraint (claim_number + organization_id)
ALTER TABLE claims 
  ADD CONSTRAINT claims_claim_number_org_unique 
  UNIQUE (claim_number, organization_id);

-- Now each organization can have its own CLM-0000001!
-- But within each org, claim numbers are still unique

COMMENT ON CONSTRAINT claims_claim_number_org_unique ON claims IS 
  'Claim numbers are unique per organization (allows CLM-0000001 in multiple orgs)';
