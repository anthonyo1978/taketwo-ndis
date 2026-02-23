-- ============================================================================
-- ADD SCOPE AND DIRECTION TO HOUSE_EXPENSES
-- ============================================================================
-- Extends house_expenses to support organisation-level expenses alongside
-- property-level expenses. This enables a unified financial transaction model.
--
-- Key changes:
--   1. Add `scope` column: 'property' (default) or 'organisation'
--   2. Make `house_id` nullable (org expenses have no house)
--   3. Expand category CHECK to include organisation categories
--   4. Add `supplier` optional text field
-- ============================================================================

-- 1. Add scope column with default 'property' (all existing rows are property-level)
ALTER TABLE public.house_expenses
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'property'
    CHECK (scope IN ('property', 'organisation'));

-- 2. Make house_id nullable (organisation expenses don't belong to a house)
ALTER TABLE public.house_expenses
  ALTER COLUMN house_id DROP NOT NULL;

-- 3. Add supplier field
ALTER TABLE public.house_expenses
  ADD COLUMN IF NOT EXISTS supplier TEXT;

-- 4. Expand category check constraint to include organisation categories
-- First drop the old constraint, then add the new one
ALTER TABLE public.house_expenses DROP CONSTRAINT IF EXISTS house_expenses_category_check;
ALTER TABLE public.house_expenses
  ADD CONSTRAINT house_expenses_category_check
    CHECK (category IN (
      -- Property categories
      'head_lease', 'utilities', 'maintenance', 'cleaning', 'insurance',
      'compliance', 'repairs', 'other',
      -- Organisation categories
      'salaries', 'software', 'office_rent', 'marketing', 'accounting',
      'corporate_insurance', 'vehicles',
      -- Legacy (keep for backward compat)
      'rent', 'rates', 'management_fee'
    ));

-- 5. Add check: property expenses must have house_id, org expenses must not
-- (Implemented as a partial check — we allow null house_id only when scope = 'organisation')
-- Note: We use a trigger instead of a check constraint for better error messages

CREATE OR REPLACE FUNCTION check_expense_scope_house_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.scope = 'property' AND NEW.house_id IS NULL THEN
    RAISE EXCEPTION 'Property-scoped expenses must have a house_id';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_expense_scope_house_id_trigger ON public.house_expenses;
CREATE TRIGGER check_expense_scope_house_id_trigger
  BEFORE INSERT OR UPDATE ON public.house_expenses
  FOR EACH ROW
  EXECUTE FUNCTION check_expense_scope_house_id();

-- 6. Index on scope for filtering
CREATE INDEX IF NOT EXISTS idx_house_expenses_scope ON public.house_expenses(scope);

-- 7. Comments
COMMENT ON COLUMN public.house_expenses.scope IS 'Whether this expense is property-level or organisation-level';
COMMENT ON COLUMN public.house_expenses.supplier IS 'Optional supplier/vendor name for the expense';

