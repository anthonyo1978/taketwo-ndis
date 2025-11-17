-- ============================================================================
-- CREATE TODOS TABLE
-- Multi-tenant to-do list system, can be linked to notifications
-- ============================================================================

-- Create todos table
CREATE TABLE IF NOT EXISTS todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- User who owns the todo (null = org-wide)
  
  -- Todo content
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high')),
  
  -- Status and due date
  status TEXT NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'done')),
  due_date DATE,
  
  -- Link to notification (if created from notification)
  notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX idx_todos_organization_id ON todos(organization_id);
CREATE INDEX idx_todos_user_id ON todos(organization_id, user_id);
CREATE INDEX idx_todos_status ON todos(organization_id, user_id, status);
CREATE INDEX idx_todos_due_date ON todos(organization_id, user_id, due_date);
CREATE INDEX idx_todos_notification_id ON todos(notification_id);

-- Enable RLS
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view todos in their organization (their own or org-wide if user_id is null)
CREATE POLICY "Users can view todos in their organization"
  ON todos
  FOR SELECT
  TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND (
      user_id IS NULL -- Org-wide todos
      OR user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1) -- User's own todos
    )
  );

-- Users can create todos in their organization
CREATE POLICY "Users can create todos in their organization"
  ON todos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND (
      user_id IS NULL
      OR user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
    )
  );

-- Users can update todos in their organization (their own or org-wide)
CREATE POLICY "Users can update todos in their organization"
  ON todos
  FOR UPDATE
  TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND (
      user_id IS NULL
      OR user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
    )
  )
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND (
      user_id IS NULL
      OR user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
    )
  );

-- Users can delete todos in their organization (their own or org-wide)
CREATE POLICY "Users can delete todos in their organization"
  ON todos
  FOR DELETE
  TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND (
      user_id IS NULL
      OR user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
    )
  );

-- Add comment
COMMENT ON TABLE todos IS 'Organization-scoped to-do list items, can be user-specific or org-wide';

