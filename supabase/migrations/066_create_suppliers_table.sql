-- ============================================================================
-- CREATE SUPPLIERS TABLE
-- ============================================================================
-- Suppliers are maintenance and service providers that support properties.
-- This is a simple reference directory (NOT a work order or expense system).
-- ============================================================================

-- Create suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Basic information
  name TEXT NOT NULL,
  supplier_type TEXT CHECK (supplier_type IN ('General Maintenance', 'Plumber', 'Electrician', 'Cleaning', 'Landscaping', 'HVAC', 'Security', 'Other')),
  
  -- Contact details
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  
  -- Additional information
  notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_suppliers_organization_id ON public.suppliers(organization_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_type ON public.suppliers(supplier_type);

-- Comments for documentation
COMMENT ON TABLE public.suppliers IS 'Maintenance and service provider directory for properties';
COMMENT ON COLUMN public.suppliers.supplier_type IS 'Type of service: General Maintenance, Plumber, Electrician, Cleaning, Landscaping, HVAC, Security, or Other';
COMMENT ON COLUMN public.suppliers.contact_name IS 'Primary contact person at the supplier';

-- Enable Row Level Security
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- RLS Policies (tenant isolation)
-- SELECT: Users can view suppliers from their organization
CREATE POLICY suppliers_select ON public.suppliers
  FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
  ));

-- INSERT: Users can create suppliers in their organization
CREATE POLICY suppliers_insert ON public.suppliers
  FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
  ));

-- UPDATE: Users can update suppliers in their organization
CREATE POLICY suppliers_update ON public.suppliers
  FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
  ));

-- DELETE: Users can delete suppliers from their organization
CREATE POLICY suppliers_delete ON public.suppliers
  FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
  ));

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER suppliers_set_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

