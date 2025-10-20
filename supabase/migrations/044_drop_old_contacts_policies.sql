-- ============================================================================
-- DROP OLD CONTACTS POLICIES (Pre-multi-tenancy)
-- ============================================================================

-- These old policies allow ALL authenticated users to access ALL contacts
-- They were created before multi-tenancy and bypass organization filtering

DROP POLICY IF EXISTS "Allow authenticated users to read contacts" ON contacts;
DROP POLICY IF EXISTS "Allow server to manage contacts" ON contacts;

-- The new org-filtered policies already exist from migration 043:
-- - "Users can view contacts in own org" (SELECT)
-- - "Users can create contacts in own org" (INSERT)  
-- - "Users can update contacts in own org" (UPDATE)
-- - "Users can delete contacts in own org" (DELETE)
-- - "Service role full access to contacts" (ALL for service_role)

-- After dropping the old policies, only the org-filtered ones remain!
