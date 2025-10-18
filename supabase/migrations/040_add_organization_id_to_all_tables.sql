-- ============================================================================
-- ADD ORGANIZATION_ID TO ALL TABLES
-- Core multi-tenancy data isolation
-- ============================================================================

-- Add organization_id column to all core tables
-- Default to '00000000-0000-0000-0000-000000000000' for existing data

-- Houses
ALTER TABLE houses 
ADD COLUMN IF NOT EXISTS organization_id UUID 
NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_houses_organization_id ON houses(organization_id);

-- Residents
ALTER TABLE residents 
ADD COLUMN IF NOT EXISTS organization_id UUID 
NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_residents_organization_id ON residents(organization_id);

-- Funding Contracts
ALTER TABLE funding_contracts 
ADD COLUMN IF NOT EXISTS organization_id UUID 
NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_funding_contracts_organization_id ON funding_contracts(organization_id);

-- Transactions
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS organization_id UUID 
NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_transactions_organization_id ON transactions(organization_id);

-- Transaction Audit Trail (only if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'transaction_audit_trail') THEN
    ALTER TABLE transaction_audit_trail 
    ADD COLUMN IF NOT EXISTS organization_id UUID 
    NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
    REFERENCES organizations(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_transaction_audit_trail_organization_id ON transaction_audit_trail(organization_id);
  END IF;
END $$;

-- Resident Audit Trail (only if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'resident_audit_trail') THEN
    ALTER TABLE resident_audit_trail 
    ADD COLUMN IF NOT EXISTS organization_id UUID 
    NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
    REFERENCES organizations(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_resident_audit_trail_organization_id ON resident_audit_trail(organization_id);
  END IF;
END $$;

-- Contacts
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS organization_id UUID 
NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_contacts_organization_id ON contacts(organization_id);

-- Resident Contacts (junction table)
ALTER TABLE resident_contacts 
ADD COLUMN IF NOT EXISTS organization_id UUID 
NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_resident_contacts_organization_id ON resident_contacts(organization_id);

-- Claims
ALTER TABLE claims 
ADD COLUMN IF NOT EXISTS organization_id UUID 
NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_claims_organization_id ON claims(organization_id);

-- Claim Reconciliations
ALTER TABLE claim_reconciliations 
ADD COLUMN IF NOT EXISTS organization_id UUID 
NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_claim_reconciliations_organization_id ON claim_reconciliations(organization_id);

-- Automation Logs
ALTER TABLE automation_logs 
ADD COLUMN IF NOT EXISTS organization_id UUID 
NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_automation_logs_organization_id ON automation_logs(organization_id);

-- System Logs
ALTER TABLE system_logs 
ADD COLUMN IF NOT EXISTS organization_id UUID 
NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_system_logs_organization_id ON system_logs(organization_id);

-- System Settings
ALTER TABLE system_settings 
ADD COLUMN IF NOT EXISTS organization_id UUID 
NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_system_settings_organization_id ON system_settings(organization_id);

-- Rendered Documents
ALTER TABLE rendered_documents 
ADD COLUMN IF NOT EXISTS organization_id UUID 
NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_rendered_documents_organization_id ON rendered_documents(organization_id);

-- Password Reset Tokens
ALTER TABLE password_reset_tokens 
ADD COLUMN IF NOT EXISTS organization_id UUID 
NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_organization_id ON password_reset_tokens(organization_id);

-- Update automation_settings (already has organization_id, just ensure it's properly constrained)
ALTER TABLE automation_settings 
DROP CONSTRAINT IF EXISTS automation_settings_organization_id_fkey;

ALTER TABLE automation_settings 
ADD CONSTRAINT automation_settings_organization_id_fkey 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Update organization_settings (already has organization_id, just ensure it's properly constrained)
ALTER TABLE organization_settings 
DROP CONSTRAINT IF EXISTS organization_settings_organization_id_fkey;

ALTER TABLE organization_settings 
ADD CONSTRAINT organization_settings_organization_id_fkey 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Add comments
COMMENT ON COLUMN houses.organization_id IS 'Organization that owns this house';
COMMENT ON COLUMN residents.organization_id IS 'Organization that manages this resident';
COMMENT ON COLUMN funding_contracts.organization_id IS 'Organization that owns this contract';
COMMENT ON COLUMN transactions.organization_id IS 'Organization that owns this transaction';
COMMENT ON COLUMN claims.organization_id IS 'Organization that owns this claim';
COMMENT ON COLUMN system_logs.organization_id IS 'Organization this log entry belongs to';

