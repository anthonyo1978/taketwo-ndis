-- ============================================================================
-- ADD SNAPSHOT FIELDS TO HOUSE EXPENSES
-- ============================================================================
-- Allows utility expenses to optionally carry a meter reading snapshot,
-- turning them into point-in-time measurement records alongside the charge.
-- ============================================================================

ALTER TABLE public.house_expenses
ADD COLUMN IF NOT EXISTS is_snapshot BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS meter_reading NUMERIC(12, 2) NULL,
ADD COLUMN IF NOT EXISTS reading_unit TEXT NULL;

COMMENT ON COLUMN public.house_expenses.is_snapshot IS 'Whether this expense is a point-in-time snapshot/reading (visually distinct)';
COMMENT ON COLUMN public.house_expenses.meter_reading IS 'Meter reading value at time of expense (e.g., kWh, kL)';
COMMENT ON COLUMN public.house_expenses.reading_unit IS 'Unit of measurement for meter reading (e.g., kWh, kL, GB)';

-- Constraint: meter_reading must be non-negative if provided
ALTER TABLE public.house_expenses
ADD CONSTRAINT valid_meter_reading CHECK (meter_reading IS NULL OR meter_reading >= 0);

