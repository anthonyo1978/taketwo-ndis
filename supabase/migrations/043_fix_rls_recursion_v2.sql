-- ============================================================================
-- FIX RLS RECURSION - Recreate function and all policies
-- ============================================================================

-- The issue: Any policy on users that queries users causes infinite recursion
-- Solution: The function was already SECURITY DEFINER, but we need to recreate
-- it properly and ensure all policies use it correctly

-- Drop the existing function (CASCADE will drop all dependent policies)
DROP FUNCTION IF EXISTS public.current_user_organization_id() CASCADE;

-- Recreate with SECURITY DEFINER to bypass RLS when called
CREATE OR REPLACE FUNCTION public.current_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id 
  FROM public.users 
  WHERE auth_user_id = auth.uid()
  LIMIT 1
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- This function runs with definer's privileges (bypasses RLS)
-- So when called from ANY policy, it won't trigger users RLS = no recursion!

COMMENT ON FUNCTION public.current_user_organization_id() IS 
  'Returns the organization_id of the currently authenticated user (SECURITY DEFINER to avoid RLS recursion)';

-- Now we need to recreate ALL the policies that were dropped by CASCADE
-- (Copy from migration 041, but all at once here)

-- HOUSES
CREATE POLICY "Users can view houses in own org" ON houses
  FOR SELECT USING (organization_id = public.current_user_organization_id());
CREATE POLICY "Users can create houses in own org" ON houses
  FOR INSERT WITH CHECK (organization_id = public.current_user_organization_id());
CREATE POLICY "Users can update houses in own org" ON houses
  FOR UPDATE USING (organization_id = public.current_user_organization_id());
CREATE POLICY "Users can delete houses in own org" ON houses
  FOR DELETE USING (organization_id = public.current_user_organization_id());

-- RESIDENTS
CREATE POLICY "Users can view residents in own org" ON residents
  FOR SELECT USING (organization_id = public.current_user_organization_id());
CREATE POLICY "Users can create residents in own org" ON residents
  FOR INSERT WITH CHECK (organization_id = public.current_user_organization_id());
CREATE POLICY "Users can update residents in own org" ON residents
  FOR UPDATE USING (organization_id = public.current_user_organization_id());
CREATE POLICY "Users can delete residents in own org" ON residents
  FOR DELETE USING (organization_id = public.current_user_organization_id());

-- FUNDING CONTRACTS
CREATE POLICY "Users can view contracts in own org" ON funding_contracts
  FOR SELECT USING (organization_id = public.current_user_organization_id());
CREATE POLICY "Users can create contracts in own org" ON funding_contracts
  FOR INSERT WITH CHECK (organization_id = public.current_user_organization_id());
CREATE POLICY "Users can update contracts in own org" ON funding_contracts
  FOR UPDATE USING (organization_id = public.current_user_organization_id());
CREATE POLICY "Users can delete contracts in own org" ON funding_contracts
  FOR DELETE USING (organization_id = public.current_user_organization_id());

-- TRANSACTIONS
CREATE POLICY "Users can view transactions in own org" ON transactions
  FOR SELECT USING (organization_id = public.current_user_organization_id());
CREATE POLICY "Users can create transactions in own org" ON transactions
  FOR INSERT WITH CHECK (organization_id = public.current_user_organization_id());
CREATE POLICY "Users can update transactions in own org" ON transactions
  FOR UPDATE USING (organization_id = public.current_user_organization_id());
CREATE POLICY "Users can delete transactions in own org" ON transactions
  FOR DELETE USING (organization_id = public.current_user_organization_id());

-- CONTACTS
CREATE POLICY "Users can view contacts in own org" ON contacts
  FOR SELECT USING (organization_id = public.current_user_organization_id());
CREATE POLICY "Users can create contacts in own org" ON contacts
  FOR INSERT WITH CHECK (organization_id = public.current_user_organization_id());
CREATE POLICY "Users can update contacts in own org" ON contacts
  FOR UPDATE USING (organization_id = public.current_user_organization_id());
CREATE POLICY "Users can delete contacts in own org" ON contacts
  FOR DELETE USING (organization_id = public.current_user_organization_id());

-- RESIDENT CONTACTS
CREATE POLICY "Users can view resident contacts in own org" ON resident_contacts
  FOR SELECT USING (organization_id = public.current_user_organization_id());
CREATE POLICY "Users can create resident contacts in own org" ON resident_contacts
  FOR INSERT WITH CHECK (organization_id = public.current_user_organization_id());
CREATE POLICY "Users can update resident contacts in own org" ON resident_contacts
  FOR UPDATE USING (organization_id = public.current_user_organization_id());
CREATE POLICY "Users can delete resident contacts in own org" ON resident_contacts
  FOR DELETE USING (organization_id = public.current_user_organization_id());

-- CLAIMS
CREATE POLICY "Users can view claims in own org" ON claims
  FOR SELECT USING (organization_id = public.current_user_organization_id());
CREATE POLICY "Users can create claims in own org" ON claims
  FOR INSERT WITH CHECK (organization_id = public.current_user_organization_id());
CREATE POLICY "Users can update claims in own org" ON claims
  FOR UPDATE USING (organization_id = public.current_user_organization_id());
CREATE POLICY "Users can delete claims in own org" ON claims
  FOR DELETE USING (organization_id = public.current_user_organization_id());

-- CLAIM RECONCILIATIONS
CREATE POLICY "Users can view claim reconciliations in own org" ON claim_reconciliations
  FOR SELECT USING (organization_id = public.current_user_organization_id());
CREATE POLICY "Users can create claim reconciliations in own org" ON claim_reconciliations
  FOR INSERT WITH CHECK (organization_id = public.current_user_organization_id());

-- AUTOMATION LOGS
CREATE POLICY "Users can view automation logs in own org" ON automation_logs
  FOR SELECT USING (organization_id = public.current_user_organization_id());

-- SYSTEM LOGS
CREATE POLICY "Users can view system logs in own org" ON system_logs
  FOR SELECT USING (organization_id = public.current_user_organization_id());
CREATE POLICY "Users can create system logs in own org" ON system_logs
  FOR INSERT WITH CHECK (organization_id = public.current_user_organization_id());

-- SYSTEM SETTINGS
CREATE POLICY "Users can view system settings in own org" ON system_settings
  FOR SELECT USING (organization_id = public.current_user_organization_id());
CREATE POLICY "Users can modify system settings in own org" ON system_settings
  FOR ALL 
  USING (organization_id = public.current_user_organization_id())
  WITH CHECK (organization_id = public.current_user_organization_id());

-- RENDERED DOCUMENTS
CREATE POLICY "Users can view rendered documents in own org" ON rendered_documents
  FOR SELECT USING (organization_id = public.current_user_organization_id());
CREATE POLICY "Users can create rendered documents in own org" ON rendered_documents
  FOR INSERT WITH CHECK (organization_id = public.current_user_organization_id());

-- PASSWORD RESET TOKENS
CREATE POLICY "Users can manage own org password resets" ON password_reset_tokens
  FOR ALL
  USING (organization_id = public.current_user_organization_id())
  WITH CHECK (organization_id = public.current_user_organization_id());

-- AUTOMATION SETTINGS
CREATE POLICY "Users can view automation settings in own org" ON automation_settings
  FOR SELECT USING (organization_id = public.current_user_organization_id());
CREATE POLICY "Users can modify automation settings in own org" ON automation_settings
  FOR ALL
  USING (organization_id = public.current_user_organization_id())
  WITH CHECK (organization_id = public.current_user_organization_id());

-- ORGANIZATION SETTINGS
CREATE POLICY "Users can view organization settings in own org" ON organization_settings
  FOR SELECT USING (organization_id = public.current_user_organization_id());
CREATE POLICY "Users can modify organization settings in own org" ON organization_settings
  FOR ALL
  USING (organization_id = public.current_user_organization_id())
  WITH CHECK (organization_id = public.current_user_organization_id());

-- USERS (Simple policies without recursion)
CREATE POLICY "Users can view users in own org" ON users
  FOR SELECT USING (organization_id = public.current_user_organization_id());
CREATE POLICY "Users can create users in own org" ON users
  FOR INSERT WITH CHECK (organization_id = public.current_user_organization_id());
CREATE POLICY "Users can update users in own org" ON users
  FOR UPDATE USING (organization_id = public.current_user_organization_id());
CREATE POLICY "Users can delete users in own org" ON users
  FOR DELETE USING (organization_id = public.current_user_organization_id());

-- AUDIT TRAILS (only if tables exist - wrapped in DO blocks from migration 041)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'transaction_audit_trail') THEN
    EXECUTE 'CREATE POLICY "Users can view audit trail in own org" ON transaction_audit_trail
      FOR SELECT USING (organization_id = public.current_user_organization_id())';
    EXECUTE 'CREATE POLICY "Users can create audit entries in own org" ON transaction_audit_trail
      FOR INSERT WITH CHECK (organization_id = public.current_user_organization_id())';
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'resident_audit_trail') THEN
    EXECUTE 'CREATE POLICY "Users can view resident audit in own org" ON resident_audit_trail
      FOR SELECT USING (organization_id = public.current_user_organization_id())';
    EXECUTE 'CREATE POLICY "Users can create resident audit in own org" ON resident_audit_trail
      FOR INSERT WITH CHECK (organization_id = public.current_user_organization_id())';
  END IF;
END $$;
