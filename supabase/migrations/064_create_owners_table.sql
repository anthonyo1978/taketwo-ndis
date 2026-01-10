-- ============================================================================
-- CREATE OWNERS TABLE
-- ============================================================================
-- Owners are property owners (landlords) who may lease properties to the
-- organization. Can be individuals, companies, trusts, or other entities.
-- ============================================================================

-- Create owners table
CREATE TABLE IF NOT EXISTS public.owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Basic information
  name TEXT NOT NULL,
  owner_type TEXT NOT NULL DEFAULT 'company' CHECK (owner_type IN ('individual', 'company', 'trust', 'other')),
  
  -- Contact details
  primary_contact_name TEXT,
  email TEXT,
  phone TEXT,
  
  -- Additional information
  notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_owners_organization_id ON public.owners(organization_id);
CREATE INDEX IF NOT EXISTS idx_owners_name ON public.owners(name);
CREATE INDEX IF NOT EXISTS idx_owners_owner_type ON public.owners(owner_type);

-- Comments for documentation
COMMENT ON TABLE public.owners IS 'Property owners (landlords) who may lease properties to the organization';
COMMENT ON COLUMN public.owners.owner_type IS 'Type of owner: individual, company, trust, or other';
COMMENT ON COLUMN public.owners.primary_contact_name IS 'Main contact person for this owner';

-- Enable Row Level Security
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;

-- RLS Policies (restrict by organization_id)
CREATE POLICY owners_select ON public.owners
  FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY owners_insert ON public.owners
  FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY owners_update ON public.owners
  FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY owners_delete ON public.owners
  FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
  ));

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER owners_set_updated_at
  BEFORE UPDATE ON public.owners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

