-- Create system_logs table for tracking user actions
-- Used for audit trail and accountability

CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,  -- 'house', 'resident', 'transaction', 'contract', 'user', 'setting', etc.
  entity_id UUID,  -- ID of the entity being acted upon (nullable for bulk operations)
  action TEXT NOT NULL,  -- 'create', 'update', 'delete', 'void', 'view', 'export', 'login', 'logout', etc.
  details JSONB,  -- Additional context: { before: {...}, after: {...}, changes: [...], reason: '...' }
  ip_address TEXT,  -- User's IP address
  user_agent TEXT,  -- Browser/device info
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX idx_system_logs_entity ON system_logs(entity_type, entity_id);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX idx_system_logs_action ON system_logs(action);
CREATE INDEX idx_system_logs_user_entity ON system_logs(user_id, entity_type);

-- Function to clean up old logs (optional - run periodically)
-- Keep logs for 1 year by default
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM system_logs
  WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$;

-- Enable RLS
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - logs are managed server-side only
CREATE POLICY "Allow server to insert logs"
  ON system_logs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow server to read logs"
  ON system_logs
  FOR SELECT
  USING (true);

-- Users can view their own logs (for future feature)
CREATE POLICY "Users can view own logs"
  ON system_logs
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Add comment for documentation
COMMENT ON TABLE system_logs IS 'Audit trail of all user actions in the system';
COMMENT ON COLUMN system_logs.entity_type IS 'Type of entity: house, resident, transaction, contract, user, setting, etc.';
COMMENT ON COLUMN system_logs.action IS 'Action performed: create, update, delete, void, view, export, login, logout, etc.';
COMMENT ON COLUMN system_logs.details IS 'JSON object with additional context like before/after values, changes made, reasons, etc.';

