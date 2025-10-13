-- Create system_settings table for application-wide configuration
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_system_settings_key ON system_settings(setting_key);

-- Insert default logging setting
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES ('logging_enabled', 'true'::jsonb, 'Whether system action logging is enabled')
ON CONFLICT (setting_key) DO NOTHING;

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated users to read settings"
  ON system_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow server to manage settings"
  ON system_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE system_settings IS 'Application-wide configuration settings';

