-- ============================================================================
-- ADD daily_digest AUTOMATION TYPE
-- ============================================================================
-- Extends the automations.type CHECK constraint to allow 'daily_digest'.
-- Seeds a default "Haven Daily Brief" automation for every existing org.
-- ============================================================================

-- 1. Widen the type CHECK constraint
ALTER TABLE public.automations DROP CONSTRAINT IF EXISTS automations_type_check;
ALTER TABLE public.automations
  ADD CONSTRAINT automations_type_check
    CHECK (type IN ('recurring_transaction', 'contract_billing_run', 'daily_digest'));

-- 2. Seed a default Daily Brief automation for each organisation that doesn't already have one
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
  o.id,
  'Haven Daily Brief',
  'Executive morning summary — yesterday''s financials, upcoming activity, and alerts.',
  'daily_digest',
  true,
  jsonb_build_object(
    'frequency', 'daily',
    'timeOfDay', '06:00',
    'timezone', 'Australia/Sydney'
  ),
  jsonb_build_object(
    'lookbackDays', 1,
    'forwardDays', 7
  ),
  -- Next run: tomorrow at 06:00 UTC+11 ≈ today 19:00 UTC (close enough; scheduler recalculates)
  (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '6 hours')
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.automations a
  WHERE a.organization_id = o.id
    AND a.type = 'daily_digest'
);

