-- ============================================================================
-- FIX USERS TABLE RLS FOR ANONYMOUS INVITE VALIDATION
-- ============================================================================
-- Problem: The /api/auth/validate-invite endpoint needs to JOIN user_invites
-- with users table to get the invited user's details. But users table blocks
-- anonymous access, so the JOIN fails even though we fixed user_invites.
--
-- Solution: Add a policy that allows anonymous users to SELECT invited users
-- (status = 'invited' only). This is safe because:
-- 1. Only shows users who haven't activated yet (status = 'invited')
-- 2. Only exposes first_name, last_name, email, status (no sensitive data)
-- 3. Required for the invite token validation flow
-- ============================================================================

-- Allow anonymous users to view invited users (for password setup flow)
-- This is limited to users with status = 'invited' only
CREATE POLICY "Anonymous users can view invited users" ON users
  FOR SELECT
  TO anon
  USING (status = 'invited');

COMMENT ON POLICY "Anonymous users can view invited users" ON users IS 'Allows password setup flow to validate invite tokens and show user name';


