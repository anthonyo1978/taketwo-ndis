-- ============================================================================
-- FIX AUTOMATIONS RLS POLICIES
-- ============================================================================
-- The original policies used `WHERE id = auth.uid()` on the users table,
-- but the users table uses `auth_user_id` for the Supabase auth UID.
-- Fix: use the existing `current_user_organization_id()` function.
-- Also add service_role full-access policies for cron/automation runners.
-- ============================================================================

-- ── Automations table ──

DROP POLICY IF EXISTS automations_org_policy ON public.automations;

CREATE POLICY "Users can view automations in own org" ON public.automations
  FOR SELECT
  USING (organization_id = public.current_user_organization_id());

CREATE POLICY "Users can create automations in own org" ON public.automations
  FOR INSERT
  WITH CHECK (organization_id = public.current_user_organization_id());

CREATE POLICY "Users can update automations in own org" ON public.automations
  FOR UPDATE
  USING (organization_id = public.current_user_organization_id());

CREATE POLICY "Users can delete automations in own org" ON public.automations
  FOR DELETE
  USING (organization_id = public.current_user_organization_id());

CREATE POLICY "Service role full access to automations" ON public.automations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ── Automation Runs table ──

DROP POLICY IF EXISTS automation_runs_org_policy ON public.automation_runs;

CREATE POLICY "Users can view automation_runs in own org" ON public.automation_runs
  FOR SELECT
  USING (organization_id = public.current_user_organization_id());

CREATE POLICY "Users can create automation_runs in own org" ON public.automation_runs
  FOR INSERT
  WITH CHECK (organization_id = public.current_user_organization_id());

CREATE POLICY "Users can update automation_runs in own org" ON public.automation_runs
  FOR UPDATE
  USING (organization_id = public.current_user_organization_id());

CREATE POLICY "Service role full access to automation_runs" ON public.automation_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

