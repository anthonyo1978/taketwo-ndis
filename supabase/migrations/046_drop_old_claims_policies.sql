-- ============================================================================
-- DROP OLD CLAIMS POLICIES (Pre-multi-tenancy)
-- ============================================================================

-- These old policies allow ALL authenticated users to access ALL claims
-- They were created before multi-tenancy and bypass organization filtering

DROP POLICY IF EXISTS "Allow authenticated users to read claims" ON claims;
DROP POLICY IF EXISTS "Allow server to manage claims" ON claims;

-- The new org-filtered policies already exist from migration 043:
-- - "Users can view claims in own org" (SELECT)
-- - "Users can create claims in own org" (INSERT)
-- - "Users can update claims in own org" (UPDATE)
-- - "Users can delete claims in own org" (DELETE)
-- - "Service role full access to claims" (ALL for service_role)

-- After dropping the old policies, only the org-filtered ones remain!
