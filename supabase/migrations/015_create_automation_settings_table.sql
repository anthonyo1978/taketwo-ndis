-- Create automation_settings table for organization-level automation configuration
-- This table stores global automation settings like run time, email notifications, etc.

CREATE TABLE automation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL, -- For multi-tenant support
  enabled BOOLEAN DEFAULT false,
  run_time TIME DEFAULT '02:00:00', -- Default 2 AM
  timezone TEXT DEFAULT 'Australia/Sydney',
  admin_emails TEXT[] DEFAULT '{}', -- Array of admin emails for notifications
  notification_settings JSONB DEFAULT '{
    "frequency": "endOfRun",
    "includeLogs": true
  }'::jsonb,
  error_handling JSONB DEFAULT '{
    "continueOnError": true
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient querying by organization
CREATE INDEX idx_automation_settings_organization ON automation_settings(organization_id);

-- Add comment to explain the table purpose
COMMENT ON TABLE automation_settings IS 'Organization-level automation configuration settings';
COMMENT ON COLUMN automation_settings.organization_id IS 'Organization identifier for multi-tenant support';
COMMENT ON COLUMN automation_settings.enabled IS 'Whether automation is globally enabled for this organization';
COMMENT ON COLUMN automation_settings.run_time IS 'Time of day when automation should run (24-hour format)';
COMMENT ON COLUMN automation_settings.timezone IS 'Timezone for automation execution';
COMMENT ON COLUMN automation_settings.admin_emails IS 'Array of admin email addresses for notifications';
COMMENT ON COLUMN automation_settings.notification_settings IS 'JSON object containing notification preferences';
COMMENT ON COLUMN automation_settings.error_handling IS 'JSON object containing error handling configuration';

-- Note: For automatic updated_at timestamp updates, you can either:
-- 1. Enable the moddatetime extension: CREATE EXTENSION IF NOT EXISTS moddatetime;
-- 2. Or handle updated_at updates in your application code
-- 3. Or create a custom trigger function if needed
