-- ============================================================================
-- DROP OLD USERS POLICIES (Pre-multi-tenancy)
-- ============================================================================

-- These old policies allow ALL authenticated users to access ALL users
-- They were created before multi-tenancy and bypass organization filtering

DROP POLICY IF EXISTS "Allow read access to users" ON users;
DROP POLICY IF EXISTS "Allow insert for users" ON users;
DROP POLICY IF EXISTS "Allow update for users" ON users;

-- The new org-filtered policies already exist from migration 043:
-- - "Users can view users in own org" (SELECT)
-- - "Users can create users in own org" (INSERT)
-- - "Users can update users in own org" (UPDATE)
-- - "Users can delete users in own org" (DELETE)
-- - "Service role full access to users" (ALL for service_role)

-- After dropping the old policies, only the org-filtered ones remain!
