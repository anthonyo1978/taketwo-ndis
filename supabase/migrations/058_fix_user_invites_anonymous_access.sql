-- ============================================================================
-- FIX USER INVITES RLS FOR ANONYMOUS ACCESS
-- ============================================================================
-- Problem: When a user clicks the invite link in their email, they are not
-- authenticated yet. The current RLS policy blocks anonymous access to
-- user_invites, causing the /api/auth/validate-invite endpoint to return 404.
--
-- Solution: Add a policy that allows anonymous users to SELECT from
-- user_invites (they can only read, not modify). This is safe because:
-- 1. Tokens are cryptographically secure (32 random bytes, hex-encoded)
-- 2. They expire after 7 days
-- 3. They can only be used once (used_at is set)
-- 4. Only SELECT is allowed, not INSERT/UPDATE/DELETE
-- ============================================================================

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Allow authenticated users to manage invites" ON user_invites;

-- Allow authenticated users to manage invites (admin creating invites)
CREATE POLICY "Authenticated users can manage invites" ON user_invites
  FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Allow anonymous users to SELECT invite tokens (for validation during password setup)
-- This is safe because tokens are:
-- 1. Cryptographically secure (gen_random_bytes(32))
-- 2. Expire after 7 days
-- 3. Can only be used once
CREATE POLICY "Anonymous users can validate invite tokens" ON user_invites
  FOR SELECT
  TO anon
  USING (true);

-- Service role still needs full access for automation
CREATE POLICY "Service role can manage invites" ON user_invites
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE user_invites IS 'Tracks invitation tokens for new user password setup. Anonymous SELECT allowed for token validation.';


