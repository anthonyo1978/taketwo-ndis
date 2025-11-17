-- ============================================================================
-- CREATE NOTIFICATIONS TABLE
-- Multi-tenant notifications system for org events, n8n workflows, etc.
-- ============================================================================

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Notification content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  icon TEXT, -- Emoji or icon identifier (e.g., '🔔', 'automation', 'billing')
  
  -- Categorization
  category TEXT NOT NULL DEFAULT 'system' 
    CHECK (category IN ('system', 'automation', 'billing', 'n8n', 'user', 'other')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high')),
  
  -- Action/Interaction
  action_url TEXT, -- URL to navigate when clicking "View"
  read BOOLEAN DEFAULT false,
  
  -- Metadata (for n8n workflow IDs, automation run IDs, etc.)
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX idx_notifications_organization_id ON notifications(organization_id);
CREATE INDEX idx_notifications_read ON notifications(organization_id, read);
CREATE INDEX idx_notifications_created_at ON notifications(organization_id, created_at DESC);
CREATE INDEX idx_notifications_category ON notifications(organization_id, category);
CREATE INDEX idx_notifications_priority ON notifications(organization_id, priority);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see notifications for their organization
CREATE POLICY "Users can view notifications in their organization"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (organization_id = public.current_user_organization_id());

-- Users can update notifications in their organization (mark as read, etc.)
CREATE POLICY "Users can update notifications in their organization"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (organization_id = public.current_user_organization_id())
  WITH CHECK (organization_id = public.current_user_organization_id());

-- Service role can insert notifications (for n8n, automation, etc.)
CREATE POLICY "Service role can insert notifications"
  ON notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Service role can delete notifications
CREATE POLICY "Service role can delete notifications"
  ON notifications
  FOR DELETE
  TO service_role
  USING (true);

-- Add comment
COMMENT ON TABLE notifications IS 'Organization-scoped notifications from n8n, automation, and system events';

