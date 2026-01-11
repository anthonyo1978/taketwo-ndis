-- ============================================================================
-- CREATE HOUSE_SUPPLIERS JUNCTION TABLE
-- ============================================================================
-- Links suppliers to houses/properties with optional notes about their involvement.
-- Many-to-many relationship: a house can have multiple suppliers, and a supplier
-- can serve multiple houses.
-- ============================================================================

-- Create house_suppliers table
CREATE TABLE IF NOT EXISTS public.house_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Notes about supplier's involvement with this property
  notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_house_suppliers_organization_id ON public.house_suppliers(organization_id);
CREATE INDEX IF NOT EXISTS idx_house_suppliers_house_id ON public.house_suppliers(house_id);
CREATE INDEX IF NOT EXISTS idx_house_suppliers_supplier_id ON public.house_suppliers(supplier_id);

-- Unique constraint: prevent duplicate supplier links to same house
CREATE UNIQUE INDEX IF NOT EXISTS idx_house_suppliers_unique ON public.house_suppliers(house_id, supplier_id);

-- Comments for documentation
COMMENT ON TABLE public.house_suppliers IS 'Junction table linking suppliers to houses with notes about their involvement';
COMMENT ON COLUMN public.house_suppliers.notes IS 'Notes about this supplier''s involvement with this specific property';

-- Enable Row Level Security
ALTER TABLE public.house_suppliers ENABLE ROW LEVEL SECURITY;

-- RLS Policies (tenant isolation)
-- SELECT: Users can view house-supplier links from their organization
CREATE POLICY house_suppliers_select ON public.house_suppliers
  FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
  ));

-- INSERT: Users can create house-supplier links in their organization
CREATE POLICY house_suppliers_insert ON public.house_suppliers
  FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
  ));

-- UPDATE: Users can update house-supplier links in their organization
CREATE POLICY house_suppliers_update ON public.house_suppliers
  FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
  ));

-- DELETE: Users can delete house-supplier links from their organization
CREATE POLICY house_suppliers_delete ON public.house_suppliers
  FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
  ));

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER house_suppliers_set_updated_at
  BEFORE UPDATE ON public.house_suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

