-- Migration: Create users table for Haven user management
-- Stores user profile data and links to Supabase Auth

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to Supabase Auth (when user accepts invite and sets password)
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- User details
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  job_title TEXT,
  role TEXT DEFAULT 'staff', -- 'admin', 'staff', 'manager', etc. (for future role-based access)
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'invited', -- 'invited', 'active', 'inactive'
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ, -- When user completes password setup
  last_login_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id),
  
  -- Constraints
  CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT users_status_check CHECK (status IN ('invited', 'active', 'inactive'))
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies: For now, allow all authenticated users (future: role-based)
CREATE POLICY "Allow authenticated users to read users"
  ON users
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to create users"
  ON users
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update users"
  ON users
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Don't allow delete via RLS (use deactivate instead)
-- This preserves audit trail

-- Create user_invites table to track invitation tokens
CREATE TABLE IF NOT EXISTS user_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_invites_token ON user_invites(token);
CREATE INDEX IF NOT EXISTS idx_user_invites_user_id ON user_invites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_invites_expires_at ON user_invites(expires_at);

-- Enable RLS on user_invites
ALTER TABLE user_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage invites"
  ON user_invites
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Function to generate secure invite token
CREATE OR REPLACE FUNCTION generate_invite_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired invite tokens (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_invites()
RETURNS void AS $$
BEGIN
  DELETE FROM user_invites
  WHERE expires_at < NOW()
    AND used_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Add helpful comments
COMMENT ON TABLE users IS 'Haven user management - stores user profiles and links to Supabase Auth';
COMMENT ON TABLE user_invites IS 'Tracks invitation tokens for new user password setup';
COMMENT ON COLUMN users.auth_user_id IS 'Links to auth.users when user completes password setup';
COMMENT ON COLUMN users.status IS 'invited: waiting for password setup, active: can login, inactive: deactivated';

