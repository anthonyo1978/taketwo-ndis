-- ============================================================================
-- CREATE HEAD LEASES TABLE
-- ============================================================================
-- Head leases represent the primary lease agreement between an owner and
-- the organization for a property/house. This is MVP reference data only.
-- ============================================================================

-- Create head_leases table
CREATE TABLE IF NOT EXISTS public.head_leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Core relationships
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE RESTRICT,
  
  -- Lease details
  reference TEXT, -- Lease reference number or name
  start_date DATE NOT NULL,
  end_date DATE, -- NULL = open-ended/ongoing
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'upcoming', 'expired')),
  
  -- Financial terms
  rent_amount NUMERIC(12, 2),
  rent_frequency TEXT NOT NULL DEFAULT 'weekly', -- 'weekly', 'fortnightly', 'monthly', etc.
  review_date DATE, -- Next rent review date
  
  -- Additional information
  notes TEXT,
  document_url TEXT, -- Path to lease document in Supabase Storage or external URL
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_head_leases_organization_id ON public.head_leases(organization_id);
CREATE INDEX IF NOT EXISTS idx_head_leases_house_id ON public.head_leases(house_id);
CREATE INDEX IF NOT EXISTS idx_head_leases_owner_id ON public.head_leases(owner_id);
CREATE INDEX IF NOT EXISTS idx_head_leases_status ON public.head_leases(status);
CREATE INDEX IF NOT EXISTS idx_head_leases_start_date ON public.head_leases(start_date);

-- Unique constraint: Only one active lease per house
-- This prevents accidentally having multiple active leases for the same property
CREATE UNIQUE INDEX IF NOT EXISTS idx_head_leases_one_active_per_house
  ON public.head_leases(house_id)
  WHERE status = 'active';

-- Comments for documentation
COMMENT ON TABLE public.head_leases IS 'Head lease agreements between property owners and the organization';
COMMENT ON COLUMN public.head_leases.reference IS 'Lease reference number or identifier';
COMMENT ON COLUMN public.head_leases.status IS 'Lease status: active (current), upcoming (future), or expired (past)';
COMMENT ON COLUMN public.head_leases.rent_frequency IS 'How often rent is paid (e.g., weekly, fortnightly, monthly)';
COMMENT ON COLUMN public.head_leases.review_date IS 'Date when rent/terms are next reviewed';
COMMENT ON COLUMN public.head_leases.document_url IS 'URL or storage path to lease document PDF';

-- Enable Row Level Security
ALTER TABLE public.head_leases ENABLE ROW LEVEL SECURITY;

-- RLS Policies (restrict by organization_id)
CREATE POLICY head_leases_select ON public.head_leases
  FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY head_leases_insert ON public.head_leases
  FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY head_leases_update ON public.head_leases
  FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY head_leases_delete ON public.head_leases
  FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
  ));

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER head_leases_set_updated_at
  BEFORE UPDATE ON public.head_leases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

