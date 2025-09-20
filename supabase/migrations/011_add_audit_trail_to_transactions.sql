-- Add audit trail support to transactions table
-- This migration adds fields to track transaction modifications and creates an audit log table

-- Add audit fields to transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_modified_by TEXT;

-- Create transaction audit trail table
CREATE TABLE IF NOT EXISTS transaction_audit_trail (
    id TEXT PRIMARY KEY DEFAULT 'AUDIT-' || to_char(now(), 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 8),
    transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'validated', 'posted', 'voided', 'balance_updated')),
    field TEXT,
    old_value TEXT,
    new_value TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    user_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    comment TEXT NOT NULL CHECK (length(comment) >= 10), -- Enforce minimum 10 character comment
    changed_fields TEXT[], -- Array of field names that were changed
    previous_values JSONB, -- Snapshot of values before change
    new_values JSONB, -- Snapshot of values after change
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transaction_audit_trail_transaction_id ON transaction_audit_trail(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_audit_trail_timestamp ON transaction_audit_trail(timestamp);
CREATE INDEX IF NOT EXISTS idx_transaction_audit_trail_action ON transaction_audit_trail(action);
CREATE INDEX IF NOT EXISTS idx_transaction_audit_trail_user_id ON transaction_audit_trail(user_id);

-- Add trigger to automatically update last_modified_at and last_modified_by
CREATE OR REPLACE FUNCTION update_transaction_audit_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if this is not an initial insert
    IF TG_OP = 'UPDATE' THEN
        NEW.last_modified_at = NOW();
        NEW.last_modified_by = COALESCE(NEW.last_modified_by, 'system'); -- Fallback if not set
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for transaction updates
DROP TRIGGER IF EXISTS trigger_update_transaction_audit_fields ON transactions;
CREATE TRIGGER trigger_update_transaction_audit_fields
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_transaction_audit_fields();

-- Add RLS policies for audit trail table
ALTER TABLE transaction_audit_trail ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read audit trail
CREATE POLICY "Allow authenticated users to read audit trail" ON transaction_audit_trail
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert audit trail entries
CREATE POLICY "Allow authenticated users to insert audit trail" ON transaction_audit_trail
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Audit trail entries should never be updated or deleted (immutable)
-- No policies for UPDATE or DELETE to ensure immutability

COMMENT ON TABLE transaction_audit_trail IS 'Immutable audit trail for tracking all changes to transactions';
COMMENT ON COLUMN transaction_audit_trail.comment IS 'Required comment explaining the change (minimum 10 characters)';
COMMENT ON COLUMN transaction_audit_trail.previous_values IS 'JSON snapshot of transaction values before the change';
COMMENT ON COLUMN transaction_audit_trail.new_values IS 'JSON snapshot of transaction values after the change';
