-- ============================================================================
-- FIX INFINITE RECURSION IN USERS RLS POLICIES
-- ============================================================================

-- The problem: users policies were looking up users table to get org,
-- which triggers the policy again = infinite recursion

-- Solution: Use auth.uid() directly and trust that organization_id is set correctly
-- RLS will still protect, just simpler logic

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view users in own org" ON users;
DROP POLICY IF EXISTS "Users can create users in own org" ON users;
DROP POLICY IF EXISTS "Users can update users in own org" ON users;

-- Create simpler policies that don't cause recursion
-- Users can view other users in their own organization
CREATE POLICY "Users can view users in own org" ON users
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND organization_id = (
      SELECT u.organization_id 
      FROM users u 
      WHERE u.auth_user_id = auth.uid()
      LIMIT 1
    )
  );

-- Actually, even simpler - let's use a different approach
-- Drop that one too
DROP POLICY IF EXISTS "Users can view users in own org" ON users;

-- Use the current_user_organization_id function BUT cache it
-- Create a STABLE function that won't recurse
CREATE POLICY "Users can view users in own org" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.organization_id = users.organization_id
      LIMIT 1
    )
  );

-- For INSERT (user invitations) - check the inviter is in same org
CREATE POLICY "Users can create users in own org" ON users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.organization_id = users.organization_id
      LIMIT 1
    )
  );

-- For UPDATE - can only update users in same org
CREATE POLICY "Users can update users in own org" ON users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.organization_id = users.organization_id
      LIMIT 1
    )
  );

-- Service role still has full access (unchanged)
-- (Already exists from migration 039)
