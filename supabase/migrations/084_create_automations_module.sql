-- ============================================================================
-- AUTOMATIONS MODULE - Database Foundation
-- ============================================================================
-- Creates the automations and automation_runs tables.
-- Adds source/automation tracking fields to transactions and house_expenses.
-- ============================================================================

-- 1. Automations table
CREATE TABLE IF NOT EXISTS public.automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  type TEXT NOT NULL CHECK (type IN ('recurring_transaction', 'contract_billing_run')),
  is_enabled BOOLEAN NOT NULL DEFAULT true,

  -- Schedule (JSON)
  schedule JSONB NOT NULL DEFAULT '{
    "frequency": "monthly",
    "timeOfDay": "02:00",
    "timezone": "Australia/Sydney"
  }'::jsonb,

  -- Runner-specific config (JSON)
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Tracking
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  last_run_status TEXT CHECK (last_run_status IN ('success', 'failed') OR last_run_status IS NULL),

  -- Audit
  created_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_automations_org ON public.automations(organization_id);
CREATE INDEX IF NOT EXISTS idx_automations_type ON public.automations(type);
CREATE INDEX IF NOT EXISTS idx_automations_enabled ON public.automations(is_enabled);
CREATE INDEX IF NOT EXISTS idx_automations_next_run ON public.automations(next_run_at) WHERE is_enabled = true;

-- RLS
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY automations_org_policy ON public.automations
  FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM public.users WHERE id = auth.uid()
  ));

-- Updated_at trigger
CREATE TRIGGER update_automations_updated_at
  BEFORE UPDATE ON public.automations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- 2. Automation Runs table
CREATE TABLE IF NOT EXISTS public.automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,

  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,

  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
  summary TEXT,
  metrics JSONB DEFAULT '{}'::jsonb,
  error JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_automation_runs_automation ON public.automation_runs(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_org ON public.automation_runs(organization_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_started ON public.automation_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_runs_status ON public.automation_runs(status);

-- RLS
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY automation_runs_org_policy ON public.automation_runs
  FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM public.users WHERE id = auth.uid()
  ));


-- 3. Add automation source fields to transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'automation')),
  ADD COLUMN IF NOT EXISTS automation_id UUID REFERENCES public.automations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS automation_run_id_v2 UUID REFERENCES public.automation_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS template_transaction_id TEXT;

CREATE INDEX IF NOT EXISTS idx_transactions_source ON public.transactions(source);
CREATE INDEX IF NOT EXISTS idx_transactions_automation_id ON public.transactions(automation_id);

-- Backfill: mark existing automated transactions
UPDATE public.transactions
SET source = 'automation'
WHERE is_automated = true AND source IS NULL;

UPDATE public.transactions
SET source = 'manual'
WHERE source IS NULL;


-- 4. Add automation source fields to house_expenses
ALTER TABLE public.house_expenses
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'automation')),
  ADD COLUMN IF NOT EXISTS automation_id UUID REFERENCES public.automations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS automation_run_id UUID REFERENCES public.automation_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS template_expense_id UUID;

CREATE INDEX IF NOT EXISTS idx_house_expenses_source ON public.house_expenses(source);
CREATE INDEX IF NOT EXISTS idx_house_expenses_automation_id ON public.house_expenses(automation_id);


-- 5. Comments
COMMENT ON TABLE public.automations IS 'Organisation-scoped automation definitions (recurring transactions, billing runs, etc.)';
COMMENT ON TABLE public.automation_runs IS 'Execution log for each automation run';
COMMENT ON COLUMN public.automations.type IS 'Type of automation: recurring_transaction or contract_billing_run';
COMMENT ON COLUMN public.automations.schedule IS 'JSON schedule config: { frequency, timeOfDay, timezone, dayOfWeek?, dayOfMonth? }';
COMMENT ON COLUMN public.automations.parameters IS 'Runner-specific parameters (e.g. templateTransactionId, notifyEmails)';
COMMENT ON COLUMN public.transactions.source IS 'How this transaction was created: manual or automation';
COMMENT ON COLUMN public.transactions.automation_id IS 'The automation that generated this transaction';

