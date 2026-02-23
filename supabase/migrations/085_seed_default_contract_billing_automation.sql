-- ============================================================================
-- Seed default "Nightly Contract Billing" automation for each org
-- that already has automation_settings.enabled = true.
-- This migrates the existing nightly billing into the new automations system.
-- ============================================================================

INSERT INTO public.automations (
  organization_id,
  name,
  description,
  type,
  is_enabled,
  schedule,
  parameters,
  next_run_at
)
SELECT
  s.organization_id,
  'Nightly Contract Billing',
  'Scans funding contracts and generates NDIS drawdown transactions automatically.',
  'contract_billing_run',
  s.enabled,
  jsonb_build_object(
    'frequency', 'daily',
    'timeOfDay', COALESCE(to_char(s.run_time, 'HH24:MI'), '02:00'),
    'timezone', COALESCE(s.timezone, 'Australia/Sydney')
  ),
  jsonb_build_object(
    'notifyEmails', COALESCE(to_jsonb(s.admin_emails), '[]'::jsonb),
    'catchUpMode', true
  ),
  -- Next run: tomorrow at the configured time
  (CURRENT_DATE + INTERVAL '1 day' + COALESCE(s.run_time, '02:00:00'::TIME))
FROM public.automation_settings s
WHERE NOT EXISTS (
  -- Don't duplicate if already seeded
  SELECT 1 FROM public.automations a
  WHERE a.organization_id = s.organization_id
    AND a.type = 'contract_billing_run'
    AND a.name = 'Nightly Contract Billing'
);

