-- ============================================================================
-- CREATE PROPERTY UTILITY SNAPSHOTS TABLE
-- ============================================================================
-- Time-series log for utility meter readings and on-charge status.
-- Each snapshot is a point-in-time record (append-only journal approach).
-- This is metadata/visibility only - NO billing automation or transactions.
-- ============================================================================

-- Add electricity NMI to houses table (static identifier)
ALTER TABLE public.houses 
ADD COLUMN IF NOT EXISTS electricity_nmi TEXT;

COMMENT ON COLUMN public.houses.electricity_nmi IS 'Electricity National Meter Identifier - static property metadata';

-- Create property_utility_snapshots table
CREATE TABLE IF NOT EXISTS public.property_utility_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  
  utility_type TEXT NOT NULL CHECK (utility_type IN ('electricity', 'water')),
  on_charge BOOLEAN NOT NULL DEFAULT false,
  
  meter_reading NUMERIC(12,2) NULL,
  reading_unit TEXT NULL,
  reading_at TIMESTAMPTZ NULL,
  
  notes TEXT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_meter_reading CHECK (meter_reading IS NULL OR meter_reading >= 0)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_utility_snapshots_org ON public.property_utility_snapshots(organization_id);
CREATE INDEX IF NOT EXISTS idx_utility_snapshots_property_created ON public.property_utility_snapshots(property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_utility_snapshots_property_type_created ON public.property_utility_snapshots(property_id, utility_type, created_at DESC);

-- Add comments
COMMENT ON TABLE public.property_utility_snapshots IS 'Time-series log of utility meter readings and on-charge status per property';
COMMENT ON COLUMN public.property_utility_snapshots.utility_type IS 'Type of utility: electricity or water';
COMMENT ON COLUMN public.property_utility_snapshots.on_charge IS 'Whether this utility is on-charged to residents/NDIS';
COMMENT ON COLUMN public.property_utility_snapshots.meter_reading IS 'Meter reading value at this snapshot';
COMMENT ON COLUMN public.property_utility_snapshots.reading_unit IS 'Unit of measurement (e.g., kWh, kL) - optional';
COMMENT ON COLUMN public.property_utility_snapshots.reading_at IS 'User-specified timestamp when reading was taken (optional, defaults to created_at)';

-- Enable RLS
ALTER TABLE public.property_utility_snapshots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view utility snapshots in their organization" ON public.property_utility_snapshots;
DROP POLICY IF EXISTS "Users can create utility snapshots in their organization" ON public.property_utility_snapshots;
DROP POLICY IF EXISTS "Users can update utility snapshots in their organization" ON public.property_utility_snapshots;
DROP POLICY IF EXISTS "Users can delete utility snapshots in their organization" ON public.property_utility_snapshots;

-- RLS Policies (mirror existing tenant isolation pattern)
CREATE POLICY "Users can view utility snapshots in their organization"
  ON public.property_utility_snapshots
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create utility snapshots in their organization"
  ON public.property_utility_snapshots
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update utility snapshots in their organization"
  ON public.property_utility_snapshots
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete utility snapshots in their organization"
  ON public.property_utility_snapshots
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );

-- Add updated_at trigger (if you use this pattern elsewhere)
CREATE OR REPLACE FUNCTION update_property_utility_snapshots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_property_utility_snapshots_updated_at ON public.property_utility_snapshots;
CREATE TRIGGER set_property_utility_snapshots_updated_at
  BEFORE UPDATE ON public.property_utility_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_property_utility_snapshots_updated_at();

