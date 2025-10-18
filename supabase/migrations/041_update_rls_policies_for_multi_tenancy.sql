-- ============================================================================
-- UPDATE RLS POLICIES FOR MULTI-TENANCY
-- ⚠️ CRITICAL FOR SECURITY - Prevents cross-tenant data access
-- ============================================================================

-- Helper function to get current user's organization_id
CREATE OR REPLACE FUNCTION auth.current_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id 
  FROM public.users 
  WHERE auth_user_id = auth.uid()
  LIMIT 1
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

COMMENT ON FUNCTION auth.current_user_organization_id() IS 'Returns the organization_id of the currently authenticated user';

-- ============================================================================
-- HOUSES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Allow all operations on houses" ON houses;

CREATE POLICY "Users can view houses in own org" ON houses
  FOR SELECT
  USING (organization_id = auth.current_user_organization_id());

CREATE POLICY "Users can create houses in own org" ON houses
  FOR INSERT
  WITH CHECK (organization_id = auth.current_user_organization_id());

CREATE POLICY "Users can update houses in own org" ON houses
  FOR UPDATE
  USING (organization_id = auth.current_user_organization_id());

CREATE POLICY "Users can delete houses in own org" ON houses
  FOR DELETE
  USING (organization_id = auth.current_user_organization_id());

CREATE POLICY "Service role full access to houses" ON houses
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- RESIDENTS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Allow all operations on residents" ON residents;

CREATE POLICY "Users can view residents in own org" ON residents
  FOR SELECT
  USING (organization_id = auth.current_user_organization_id());

CREATE POLICY "Users can create residents in own org" ON residents
  FOR INSERT
  WITH CHECK (organization_id = auth.current_user_organization_id());

CREATE POLICY "Users can update residents in own org" ON residents
  FOR UPDATE
  USING (organization_id = auth.current_user_organization_id());

CREATE POLICY "Users can delete residents in own org" ON residents
  FOR DELETE
  USING (organization_id = auth.current_user_organization_id());

CREATE POLICY "Service role full access to residents" ON residents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- FUNDING CONTRACTS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "Allow all operations on funding_contracts" ON funding_contracts;

CREATE POLICY "Users can view contracts in own org" ON funding_contracts
  FOR SELECT
  USING (organization_id = auth.current_user_organization_id());

CREATE POLICY "Users can create contracts in own org" ON funding_contracts
  FOR INSERT
  WITH CHECK (organization_id = auth.current_user_organization_id());

CREATE POLICY "Users can update contracts in own org" ON funding_contracts
  FOR UPDATE
  USING (organization_id = auth.current_user_organization_id());

CREATE POLICY "Users can delete contracts in own org" ON funding_contracts
  FOR DELETE
  USING (organization_id = auth.current_user_organization_id());

CREATE POLICY "Service role full access to contracts" ON funding_contracts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- TRANSACTIONS TABLE
-- ============================================================================
-- Note: transactions table already has RLS enabled but no policies set
-- This is actually good - we'll create organization-aware policies

CREATE POLICY "Users can view transactions in own org" ON transactions
  FOR SELECT
  USING (organization_id = auth.current_user_organization_id());

CREATE POLICY "Users can create transactions in own org" ON transactions
  FOR INSERT
  WITH CHECK (organization_id = auth.current_user_organization_id());

CREATE POLICY "Users can update transactions in own org" ON transactions
  FOR UPDATE
  USING (organization_id = auth.current_user_organization_id());

CREATE POLICY "Users can delete transactions in own org" ON transactions
  FOR DELETE
  USING (organization_id = auth.current_user_organization_id());

CREATE POLICY "Service role full access to transactions" ON transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- TRANSACTION AUDIT TRAIL
-- ============================================================================
DROP POLICY IF EXISTS "Allow authenticated users to read audit trail" ON transaction_audit_trail;
DROP POLICY IF EXISTS "Allow authenticated users to insert audit trail" ON transaction_audit_trail;

CREATE POLICY "Users can view audit trail in own org" ON transaction_audit_trail
  FOR SELECT
  USING (organization_id = auth.current_user_organization_id());

CREATE POLICY "Users can create audit entries in own org" ON transaction_audit_trail
  FOR INSERT
  WITH CHECK (organization_id = auth.current_user_organization_id());

CREATE POLICY "Service role full access to transaction audit" ON transaction_audit_trail
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- RESIDENT AUDIT TRAIL
-- ============================================================================
DROP POLICY IF EXISTS "Allow all operations on resident_audit_trail" ON resident_audit_trail;

CREATE POLICY "Users can view resident audit in own org" ON resident_audit_trail
  FOR SELECT
  USING (organization_id = auth.current_user_organization_id());

CREATE POLICY "Users can create resident audit in own org" ON resident_audit_trail
  FOR INSERT
  WITH CHECK (organization_id = auth.current_user_organization_id());

CREATE POLICY "Service role full access to resident audit" ON resident_audit_trail
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- CONTACTS TABLE
-- ============================================================================
CREATE POLICY "Users can view contacts in own org" ON contacts
  FOR SELECT
  USING (organization_id = auth.current_user_organization_id());

CREATE POLICY "Users can create contacts in own org" ON contacts
  FOR INSERT
  WITH CHECK (organization_id = auth.current_user_organization_id());

CREATE POLICY "Users can update contacts in own org" ON contacts
  FOR UPDATE
  USING (organization_id = auth.current_user_organization_id());

CREATE POLICY "Users can delete contacts in own org" ON contacts
  FOR DELETE
  USING (organization_id = auth.current_user_organization_id());

CREATE POLICY "Service role full access to contacts" ON contacts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- RESIDENT CONTACTS (Junction Table)
-- ============================================================================
CREATE POLICY "Users can view resident contacts in own org" ON resident_contacts
  FOR SELECT
  USING (organization_id = auth.current_user_organization_id());

CREATE POLICY "Users can create resident contacts in own org" ON resident_contacts
  FOR INSERT
  WITH CHECK (organization_id = auth.current_user_organization_id());

CREATE POLICY "Users can update resident contacts in own org" ON resident_contacts
  FOR UPDATE
  USING (organization_id = auth.current_user_organization_id());

CREATE POLICY "Users can delete resident contacts in own org" ON resident_contacts
  FOR DELETE
  USING (organization_id = auth.current_user_organization_id());

CREATE POLICY "Service role full access to resident contacts" ON resident_contacts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- CLAIMS TABLE
-- ============================================================================
CREATE POLICY "Users can view claims in own org" ON claims
  FOR SELECT
  USING (organization_id = auth.current_user_organization_id());

CREATE POLICY "Users can create claims in own org" ON claims
  FOR INSERT
  WITH CHECK (organization_id = auth.current_user_organization_id());

CREATE POLICY "Users can update claims in own org" ON claims
  FOR UPDATE
  USING (organization_id = auth.current_user_organization_id());

CREATE POLICY "Users can delete claims in own org" ON claims
  FOR DELETE
  USING (organization_id = auth.current_user_organization_id());

CREATE POLICY "Service role full access to claims" ON claims
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- CLAIM RECONCILIATIONS TABLE
-- ============================================================================
CREATE POLICY "Users can view claim reconciliations in own org" ON claim_reconciliations
  FOR SELECT
  USING (organization_id = auth.current_user_organization_id());

CREATE POLICY "Users can create claim reconciliations in own org" ON claim_reconciliations
  FOR INSERT
  WITH CHECK (organization_id = auth.current_user_organization_id());

CREATE POLICY "Service role full access to claim reconciliations" ON claim_reconciliations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- AUTOMATION LOGS TABLE
-- ============================================================================
CREATE POLICY "Users can view automation logs in own org" ON automation_logs
  FOR SELECT
  USING (organization_id = auth.current_user_organization_id());

CREATE POLICY "Service role full access to automation logs" ON automation_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- SYSTEM LOGS TABLE
-- ============================================================================
CREATE POLICY "Users can view system logs in own org" ON system_logs
  FOR SELECT
  USING (organization_id = auth.current_user_organization_id());

CREATE POLICY "Users can create system logs in own org" ON system_logs
  FOR INSERT
  WITH CHECK (organization_id = auth.current_user_organization_id());

CREATE POLICY "Service role full access to system logs" ON system_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- SYSTEM SETTINGS TABLE
-- ============================================================================
CREATE POLICY "Users can view system settings in own org" ON system_settings
  FOR SELECT
  USING (organization_id = auth.current_user_organization_id());

CREATE POLICY "Users can modify system settings in own org" ON system_settings
  FOR ALL
  USING (organization_id = auth.current_user_organization_id())
  WITH CHECK (organization_id = auth.current_user_organization_id());

CREATE POLICY "Service role full access to system settings" ON system_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- RENDERED DOCUMENTS TABLE
-- ============================================================================
CREATE POLICY "Users can view rendered documents in own org" ON rendered_documents
  FOR SELECT
  USING (organization_id = auth.current_user_organization_id());

CREATE POLICY "Users can create rendered documents in own org" ON rendered_documents
  FOR INSERT
  WITH CHECK (organization_id = auth.current_user_organization_id());

CREATE POLICY "Service role full access to rendered documents" ON rendered_documents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PASSWORD RESET TOKENS TABLE
-- ============================================================================
CREATE POLICY "Users can manage own org password resets" ON password_reset_tokens
  FOR ALL
  USING (organization_id = auth.current_user_organization_id())
  WITH CHECK (organization_id = auth.current_user_organization_id());

CREATE POLICY "Service role full access to password resets" ON password_reset_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- AUTOMATION SETTINGS TABLE (already has organization_id)
-- ============================================================================
-- Ensure RLS is enabled
ALTER TABLE automation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view automation settings in own org" ON automation_settings
  FOR SELECT
  USING (organization_id = auth.current_user_organization_id());

CREATE POLICY "Users can modify automation settings in own org" ON automation_settings
  FOR ALL
  USING (organization_id = auth.current_user_organization_id())
  WITH CHECK (organization_id = auth.current_user_organization_id());

CREATE POLICY "Service role full access to automation settings" ON automation_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- ORGANIZATION SETTINGS TABLE (already has organization_id)
-- ============================================================================
-- Ensure RLS is enabled
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view organization settings in own org" ON organization_settings
  FOR SELECT
  USING (organization_id = auth.current_user_organization_id());

CREATE POLICY "Users can modify organization settings in own org" ON organization_settings
  FOR ALL
  USING (organization_id = auth.current_user_organization_id())
  WITH CHECK (organization_id = auth.current_user_organization_id());

CREATE POLICY "Service role full access to organization settings" ON organization_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

