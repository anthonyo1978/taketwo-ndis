-- ============================================================================
-- FIX USERS TABLE RLS - ALLOW USERS TO READ THEIR OWN RECORD
-- ============================================================================
-- Problem: After login, getCurrentUserOrganizationId() tries to fetch the
-- user's organization_id from the users table, but RLS blocks it because
-- the policies require users to already be in an organization context.
-- This creates a chicken-and-egg problem.
--
-- Flow that's breaking:
-- 1. User logs in → gets auth session
-- 2. App calls getCurrentUserOrganizationId()
-- 3. Query: SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
-- 4. RLS blocks because user isn't "in organization" yet
-- 5. Returns null → "User organization not found" error
--
-- Solution: Add a policy that allows authenticated users to read their OWN
-- user record (matched by auth_user_id) without requiring organization context.
-- This is the bootstrap query that establishes organization context.
-- ============================================================================

-- Allow authenticated users to read their own user record
-- This is needed to bootstrap organization context after login
CREATE POLICY "Users can read their own record" ON users
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

COMMENT ON POLICY "Users can read their own record" ON users IS 'Bootstrap policy: allows users to fetch their organization_id after login';


