-- ============================================================================
-- ENABLE RLS ON TRANSACTIONS TABLE
-- ============================================================================

-- CRITICAL: Transactions table has RLS disabled!
-- This means ALL users can see ALL transactions across ALL organizations

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- The policies already exist from migration 043, but they weren't active
-- because RLS was disabled on the table!

-- Verify policies exist (should already be there):
-- - "Users can view transactions in own org" (SELECT)
-- - "Users can create transactions in own org" (INSERT)
-- - "Users can update transactions in own org" (UPDATE)
-- - "Users can delete transactions in own org" (DELETE)
-- - "Service role full access to transactions" (ALL)

-- After enabling RLS, these policies will now be ENFORCED!
