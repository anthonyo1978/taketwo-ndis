-- ============================================================================
-- CREATE RENDERED DOCUMENTS TABLE
-- Audit trail for all generated PDF contracts
-- ============================================================================

CREATE TABLE IF NOT EXISTS rendered_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  contract_id UUID NOT NULL, -- References funding_contracts(id)
  resident_id UUID NOT NULL, -- References residents(id)
  
  -- Template Information
  template_id TEXT NOT NULL,
  template_version TEXT NOT NULL,
  
  -- Storage
  storage_path TEXT NOT NULL,
  signed_url_last TEXT, -- Last generated signed URL (expires after 15 min)
  signed_url_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit & Metadata
  data_hash_sha256 TEXT NOT NULL, -- SHA256 hash of the contract data used
  render_ms INTEGER, -- Render time in milliseconds
  file_size_bytes INTEGER,
  
  -- User tracking
  rendered_by_user_id TEXT NOT NULL DEFAULT 'system',
  rendered_by_user_email TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign keys
  CONSTRAINT fk_rendered_documents_contract FOREIGN KEY (contract_id) REFERENCES funding_contracts(id) ON DELETE CASCADE,
  CONSTRAINT fk_rendered_documents_resident FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE
);

-- Create indexes for efficient querying
CREATE INDEX idx_rendered_documents_org_id ON rendered_documents(organization_id);
CREATE INDEX idx_rendered_documents_contract_id ON rendered_documents(contract_id);
CREATE INDEX idx_rendered_documents_resident_id ON rendered_documents(resident_id);
CREATE INDEX idx_rendered_documents_created_at ON rendered_documents(created_at DESC);
CREATE INDEX idx_rendered_documents_template ON rendered_documents(template_id, template_version);

-- Add comments
COMMENT ON TABLE rendered_documents IS 'Audit trail of all generated PDF contracts';
COMMENT ON COLUMN rendered_documents.storage_path IS 'Path to PDF file in Supabase Storage';
COMMENT ON COLUMN rendered_documents.signed_url_last IS 'Last generated signed URL (15 min expiry)';
COMMENT ON COLUMN rendered_documents.data_hash_sha256 IS 'SHA256 hash of contract data for audit trail';
COMMENT ON COLUMN rendered_documents.render_ms IS 'PDF render time in milliseconds';
COMMENT ON COLUMN rendered_documents.rendered_by_user_id IS 'User who generated the PDF';

