-- ============================================================================
-- FIX RLS RECURSION - Use SECURITY DEFINER function
-- ============================================================================

-- The issue: Any policy on users that queries users causes infinite recursion
-- Solution: Make the helper function SECURITY DEFINER so it bypasses RLS

-- Drop the existing function
DROP FUNCTION IF EXISTS public.current_user_organization_id();

-- Recreate with SECURITY DEFINER to bypass RLS when called
CREATE OR REPLACE FUNCTION public.current_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id 
  FROM public.users 
  WHERE auth_user_id = auth.uid()
  LIMIT 1
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- This function runs with definer's privileges (bypasses RLS)
-- So when RLS policies call it, it doesn't trigger the users RLS policy

COMMENT ON FUNCTION public.current_user_organization_id() IS 
  'Returns the organization_id of the currently authenticated user (SECURITY DEFINER to avoid RLS recursion)';

-- Now update users policies to be even simpler
DROP POLICY IF EXISTS "Users can view users in own org" ON users;
DROP POLICY IF EXISTS "Users can create users in own org" ON users;
DROP POLICY IF EXISTS "Users can update users in own org" ON users;

-- Simple policies using the SECURITY DEFINER function (no recursion!)
CREATE POLICY "Users can view users in own org" ON users
  FOR SELECT
  USING (organization_id = public.current_user_organization_id());

CREATE POLICY "Users can create users in own org" ON users
  FOR INSERT
  WITH CHECK (organization_id = public.current_user_organization_id());

CREATE POLICY "Users can update users in own org" ON users
  FOR UPDATE
  USING (organization_id = public.current_user_organization_id());

-- DELETE policy
CREATE POLICY "Users can delete users in own org" ON users
  FOR DELETE
  USING (organization_id = public.current_user_organization_id());
