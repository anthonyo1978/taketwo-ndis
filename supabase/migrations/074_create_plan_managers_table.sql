-- Migration: Create plan_managers table
-- Description: Reference directory for Plan Managers (PM) contact details
-- This is reference data only and does NOT drive automated invoicing or claims logic

-- Create plan_managers table
CREATE TABLE IF NOT EXISTS plan_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NULL,
  phone TEXT NULL,
  billing_email TEXT NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_plan_managers_provider_id ON plan_managers(provider_id);
CREATE INDEX IF NOT EXISTS idx_plan_managers_name ON plan_managers(name);

-- Add comments
COMMENT ON TABLE plan_managers IS 'Reference directory for Plan Managers. Used for linking residents with Plan Managed funding.';
COMMENT ON COLUMN plan_managers.provider_id IS 'Organization/tenant ID for multi-tenancy isolation';
COMMENT ON COLUMN plan_managers.name IS 'Plan Manager organization or contact name';
COMMENT ON COLUMN plan_managers.email IS 'Primary email contact';
COMMENT ON COLUMN plan_managers.phone IS 'Primary phone contact';
COMMENT ON COLUMN plan_managers.billing_email IS 'Email address for billing/invoicing correspondence';
COMMENT ON COLUMN plan_managers.notes IS 'Optional notes about the Plan Manager';

-- Create updated_at trigger
CREATE TRIGGER update_plan_managers_updated_at
  BEFORE UPDATE ON plan_managers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE plan_managers ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Mirror existing tenant isolation pattern
-- SELECT: Users can only see plan managers for their organization
CREATE POLICY "Users can view plan managers from their organization"
  ON plan_managers
  FOR SELECT
  USING (
    provider_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- INSERT: Users can only create plan managers for their organization
CREATE POLICY "Users can create plan managers for their organization"
  ON plan_managers
  FOR INSERT
  WITH CHECK (
    provider_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- UPDATE: Users can only update plan managers from their organization
CREATE POLICY "Users can update plan managers from their organization"
  ON plan_managers
  FOR UPDATE
  USING (
    provider_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    provider_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- DELETE: Users can only delete plan managers from their organization
CREATE POLICY "Users can delete plan managers from their organization"
  ON plan_managers
  FOR DELETE
  USING (
    provider_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

