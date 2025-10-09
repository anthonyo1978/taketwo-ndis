-- ============================================================================
-- CREATE PDF TEMPLATES TABLE
-- Tracks available contract PDF templates and their versions
-- ============================================================================

CREATE TABLE IF NOT EXISTS pdf_templates (
  id TEXT PRIMARY KEY, -- e.g., 'ndis_service_agreement'
  name TEXT NOT NULL, -- e.g., 'NDIS Service Agreement'
  description TEXT,
  version TEXT NOT NULL, -- e.g., 'v1'
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deprecated')),
  template_path TEXT NOT NULL, -- e.g., 'contracts/templates/ndis_service_agreement/v1'
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT DEFAULT 'system',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT DEFAULT 'system',
  
  -- Ensure unique template + version combination
  CONSTRAINT pdf_templates_unique_version UNIQUE (id, version)
);

-- Create indexes
CREATE INDEX idx_pdf_templates_status ON pdf_templates(status);
CREATE INDEX idx_pdf_templates_id ON pdf_templates(id);

-- Insert default NDIS Service Agreement template
INSERT INTO pdf_templates (
  id,
  name,
  description,
  version,
  status,
  template_path
) VALUES (
  'ndis_service_agreement',
  'NDIS Service Agreement',
  'Standard service agreement for NDIS participants',
  'v1',
  'active',
  'contracts/templates/ndis_service_agreement/v1'
) ON CONFLICT (id, version) DO NOTHING;

-- Add comments
COMMENT ON TABLE pdf_templates IS 'Registry of available PDF contract templates';
COMMENT ON COLUMN pdf_templates.id IS 'Unique identifier for the template type';
COMMENT ON COLUMN pdf_templates.version IS 'Template version (e.g., v1, v2)';
COMMENT ON COLUMN pdf_templates.status IS 'Whether template is active or deprecated';
COMMENT ON COLUMN pdf_templates.template_path IS 'Path to template component in codebase';

