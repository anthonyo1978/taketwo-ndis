-- ============================================================================
-- CREATE HOUSE EXPENSES TABLE
-- ============================================================================
-- House expenses represent business outgoings/costs associated with a property.
-- These are distinct from resident-level transactions (income from NDIS).
-- Together, income transactions + house expenses form the house balance sheet.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.house_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Core relationships
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  head_lease_id UUID REFERENCES head_leases(id) ON DELETE SET NULL, -- Optional link to originating lease

  -- Expense details
  category TEXT NOT NULL CHECK (category IN ('rent', 'maintenance', 'insurance', 'utilities', 'rates', 'management_fee', 'other')),
  description TEXT NOT NULL,
  reference TEXT, -- Invoice number, receipt reference, etc.

  -- Financial
  amount NUMERIC(12, 2) NOT NULL,
  frequency TEXT CHECK (frequency IN ('one_off', 'weekly', 'fortnightly', 'monthly', 'quarterly', 'annually')),
  
  -- Dates
  occurred_at DATE NOT NULL, -- When the expense occurred / invoice date
  due_date DATE, -- Payment due date
  paid_at DATE, -- When it was actually paid

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid', 'overdue', 'cancelled')),

  -- Additional info
  notes TEXT,
  document_url TEXT, -- Link to invoice/receipt

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_house_expenses_organization_id ON public.house_expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_house_expenses_house_id ON public.house_expenses(house_id);
CREATE INDEX IF NOT EXISTS idx_house_expenses_head_lease_id ON public.house_expenses(head_lease_id);
CREATE INDEX IF NOT EXISTS idx_house_expenses_category ON public.house_expenses(category);
CREATE INDEX IF NOT EXISTS idx_house_expenses_status ON public.house_expenses(status);
CREATE INDEX IF NOT EXISTS idx_house_expenses_occurred_at ON public.house_expenses(occurred_at);

-- Comments
COMMENT ON TABLE public.house_expenses IS 'Business outgoings/expenses associated with a house (rent, maintenance, etc.)';
COMMENT ON COLUMN public.house_expenses.category IS 'Expense category: rent, maintenance, insurance, utilities, rates, management_fee, other';
COMMENT ON COLUMN public.house_expenses.frequency IS 'Recurrence frequency if this is a recurring expense';
COMMENT ON COLUMN public.house_expenses.head_lease_id IS 'Optional link to the head lease that generated this expense (e.g. rent)';

-- Enable Row Level Security
ALTER TABLE public.house_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY house_expenses_select ON public.house_expenses
  FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY house_expenses_insert ON public.house_expenses
  FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY house_expenses_update ON public.house_expenses
  FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY house_expenses_delete ON public.house_expenses
  FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
  ));

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER house_expenses_set_updated_at
  BEFORE UPDATE ON public.house_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

