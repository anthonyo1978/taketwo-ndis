-- ============================================================================
-- CREATE ORGANIZATION SETTINGS TABLE
-- Stores organization-level configuration for PDF generation and branding
-- ============================================================================

CREATE TABLE IF NOT EXISTS organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  
  -- Organization Details
  organization_name TEXT NOT NULL DEFAULT 'TakeTwo NDIS Services',
  abn TEXT,
  
  -- Contact Information
  email TEXT,
  phone TEXT,
  website TEXT,
  
  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  suburb TEXT,
  state TEXT,
  postcode TEXT,
  country TEXT DEFAULT 'Australia',
  
  -- Branding
  logo_url TEXT,
  primary_color TEXT DEFAULT '#4f46e5',
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT DEFAULT 'system',
  updated_by TEXT DEFAULT 'system',
  
  -- Ensure one row per organization
  CONSTRAINT organization_settings_unique_org UNIQUE (organization_id)
);

-- Create index
CREATE INDEX idx_organization_settings_org_id ON organization_settings(organization_id);

-- Insert default organization settings
INSERT INTO organization_settings (
  organization_id,
  organization_name,
  abn,
  email,
  phone,
  address_line1,
  suburb,
  state,
  postcode,
  country
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'TakeTwo NDIS Services',
  '12 345 678 901',
  'admin@taketwo.com.au',
  '1300 123 456',
  '123 Example Street',
  'Sydney',
  'NSW',
  '2000',
  'Australia'
) ON CONFLICT (organization_id) DO NOTHING;

-- Add comments
COMMENT ON TABLE organization_settings IS 'Organization-level settings for branding and PDF generation';
COMMENT ON COLUMN organization_settings.organization_name IS 'Legal name of the organization';
COMMENT ON COLUMN organization_settings.abn IS 'Australian Business Number';
COMMENT ON COLUMN organization_settings.logo_url IS 'URL to organization logo for PDFs and branding';

