-- ============================================================================
-- CREATE ORGANIZATIONS TABLE
-- Core multi-tenancy infrastructure
-- ============================================================================

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Information
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- for subdomain/URL (e.g., acme-corp)
  
  -- Subscription & Billing
  subscription_status TEXT NOT NULL DEFAULT 'active' 
    CHECK (subscription_status IN ('trial', 'active', 'past_due', 'canceled', 'suspended')),
  subscription_plan TEXT NOT NULL DEFAULT 'free' 
    CHECK (subscription_plan IN ('free', 'starter', 'pro', 'enterprise')),
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  
  -- Stripe Integration (for future paid plans)
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  
  -- Limits (for free tier)
  max_houses INTEGER DEFAULT 5, -- Free tier: 5 houses
  max_residents INTEGER DEFAULT 20, -- Free tier: 20 residents
  max_users INTEGER DEFAULT 2, -- Free tier: 2 users
  
  -- Features (for plan differentiation)
  features JSONB DEFAULT '{
    "automation_enabled": true,
    "pdf_generation_enabled": true,
    "claims_enabled": true,
    "api_access": false,
    "white_label": false
  }'::jsonb,
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT DEFAULT 'system',
  updated_by TEXT DEFAULT 'system'
);

-- Create indexes
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_subscription_status ON organizations(subscription_status);
CREATE INDEX idx_organizations_created_at ON organizations(created_at);

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
-- Users can only see their own organization
CREATE POLICY "Users can view own organization" ON organizations
  FOR SELECT
  USING (
    id IN (
      SELECT organization_id 
      FROM users 
      WHERE auth_user_id = auth.uid()
    )
  );

-- Only service role can create organizations (via signup API)
CREATE POLICY "Service role can manage organizations" ON organizations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comments
COMMENT ON TABLE organizations IS 'Multi-tenant organizations/companies using the platform';
COMMENT ON COLUMN organizations.slug IS 'URL-safe identifier (e.g., acme-corp for acme-corp.haven.app)';
COMMENT ON COLUMN organizations.subscription_status IS 'Current subscription state';
COMMENT ON COLUMN organizations.subscription_plan IS 'Pricing tier (free, starter, pro, enterprise)';
COMMENT ON COLUMN organizations.max_houses IS 'Maximum houses allowed on this plan';
COMMENT ON COLUMN organizations.max_residents IS 'Maximum residents allowed on this plan';
COMMENT ON COLUMN organizations.max_users IS 'Maximum team members allowed on this plan';

-- Insert the default organization (for existing data)
INSERT INTO organizations (
  id,
  name,
  slug,
  subscription_status,
  subscription_plan,
  max_houses,
  max_residents,
  max_users,
  features
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Default Organization',
  'default',
  'active',
  'enterprise', -- Existing org gets enterprise features
  999999, -- Unlimited
  999999, -- Unlimited
  999999, -- Unlimited
  '{
    "automation_enabled": true,
    "pdf_generation_enabled": true,
    "claims_enabled": true,
    "api_access": true,
    "white_label": true
  }'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Add organization_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Update existing users to belong to default org
UPDATE users 
SET organization_id = '00000000-0000-0000-0000-000000000000'
WHERE organization_id IS NULL;

-- Make organization_id required
ALTER TABLE users ALTER COLUMN organization_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE users ADD CONSTRAINT fk_users_organization 
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);

-- Update users RLS policies to be organization-aware
DROP POLICY IF EXISTS "Allow authenticated users to read users" ON users;
DROP POLICY IF EXISTS "Allow service role full access to users" ON users;

-- Users can only see users in their own organization
CREATE POLICY "Users can view users in own org" ON users
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM users 
      WHERE auth_user_id = auth.uid()
    )
  );

-- Users can only create users in their own organization (invitations)
CREATE POLICY "Users can create users in own org" ON users
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM users 
      WHERE auth_user_id = auth.uid()
    )
  );

-- Users can update users in their own organization
CREATE POLICY "Users can update users in own org" ON users
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM users 
      WHERE auth_user_id = auth.uid()
    )
  );

-- Service role full access
CREATE POLICY "Service role full access to users" ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON COLUMN users.organization_id IS 'Organization this user belongs to';

