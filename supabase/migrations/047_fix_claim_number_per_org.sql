-- ============================================================================
-- FIX CLAIM NUMBER GENERATION - Organization-Scoped
-- ============================================================================

-- ISSUE: Claim numbers are global, causing duplicates across organizations
-- Each org should have its own sequence: CLM-0000001, CLM-0000002, etc.

-- Drop the old function
DROP FUNCTION IF EXISTS generate_claim_number();

-- Create new version that takes organization_id parameter
CREATE OR REPLACE FUNCTION generate_claim_number(org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
  claim_num TEXT;
BEGIN
  -- Get the highest existing claim number FOR THIS ORGANIZATION
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(claim_number FROM 'CLM-(\d+)') AS INTEGER
      )
    ), 0
  ) + 1
  INTO next_num
  FROM claims
  WHERE organization_id = org_id;  -- Filter by organization!
  
  -- Format with leading zeros (7 digits)
  claim_num := 'CLM-' || LPAD(next_num::TEXT, 7, '0');
  
  RETURN claim_num;
END;
$$;

COMMENT ON FUNCTION generate_claim_number(UUID) IS 
  'Generates sequential claim numbers per organization (CLM-0000001, CLM-0000002, etc.)';
