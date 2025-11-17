# Notifications & Todos Database Setup

## ✅ What's Been Created

### 1. Database Migrations

**`056_create_notifications_table.sql`**
- Creates `notifications` table with:
  - Organization-scoped (multi-tenant)
  - Fields: title, message, icon, category, priority, actionUrl, read status, metadata
  - Categories: system, automation, billing, n8n, user, other
  - Priorities: low, medium, high
  - Full RLS policies for organization isolation

**`057_create_todos_table.sql`**
- Creates `todos` table with:
  - Organization-scoped (multi-tenant)
  - User-specific or org-wide todos
  - Fields: title, description, priority, status (todo/done), dueDate
  - Can link to notifications
  - Full RLS policies for organization isolation

### 2. API Endpoints

**Notifications:**
- `GET /api/notifications` - List notifications (supports `?filter=unread` and `?category=...`)
- `POST /api/notifications` - Create notification (user context)
- `PATCH /api/notifications/[id]` - Update notification (mark as read, etc.)
- `DELETE /api/notifications/[id]` - Delete notification

**Todos:**
- `GET /api/todos` - List todos (supports `?status=todo` and `?view=today|next7days|all`)
- `POST /api/todos` - Create todo
- `PATCH /api/todos/[id]` - Update todo (status, priority, etc.)
- `DELETE /api/todos/[id]` - Delete todo

### 3. Service Helper

**`lib/services/notification-service.ts`**
- `createNotification()` - For n8n/automation to create notifications using service role
- `createNotifications()` - Batch create notifications

## 🚀 Deployment Steps

### 1. Run Migrations

In Supabase Dashboard:
1. Go to SQL Editor
2. Run `056_create_notifications_table.sql`
3. Run `057_create_todos_table.sql`

Or via Supabase CLI:
```bash
supabase db push
```

### 2. Verify RLS

Test that RLS is working:
- Users in Org A should only see Org A notifications
- Users in Org B should only see Org B notifications
- Service role can create notifications for any org

### 3. Test API Endpoints

```bash
# Get notifications
curl -X GET https://your-app.vercel.app/api/notifications \
  -H "Cookie: your-session-cookie"

# Create notification (from n8n - use service role)
# See n8n example below
```

## 🔌 n8n Integration Example

### Creating Notifications from n8n

Use the notification service in a Vercel serverless function or directly from n8n HTTP request:

**Option 1: Via API Endpoint (if authenticated)**
```javascript
// n8n HTTP Request node
POST https://your-app.vercel.app/api/notifications
Headers: {
  "Authorization": "Bearer YOUR_SERVICE_TOKEN",
  "Content-Type": "application/json"
}
Body: {
  "title": "Automation Complete",
  "message": "Successfully processed 5 transactions",
  "category": "automation",
  "priority": "medium",
  "actionUrl": "/transactions",
  "metadata": {
    "workflowId": "{{ $workflow.id }}",
    "runId": "{{ $execution.id }}"
  }
}
```

**Option 2: Direct Database (using service role)**
```javascript
// In n8n Code node or Vercel function
import { createNotification } from 'lib/services/notification-service'

await createNotification({
  organizationId: 'org-uuid-here',
  title: 'Automation Complete',
  message: 'Successfully processed transactions',
  category: 'n8n',
  priority: 'high',
  actionUrl: '/transactions',
  metadata: {
    workflowId: 'workflow-123',
    runId: 'run-456'
  }
})
```

## 📊 Database Schema

### Notifications Table
```sql
- id (UUID, PK)
- organization_id (UUID, FK to organizations)
- title (TEXT, required)
- message (TEXT, required)
- icon (TEXT, optional)
- category (TEXT: system|automation|billing|n8n|user|other)
- priority (TEXT: low|medium|high)
- action_url (TEXT, optional)
- read (BOOLEAN, default false)
- metadata (JSONB, default {})
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
- created_by (UUID, FK to users)
```

### Todos Table
```sql
- id (UUID, PK)
- organization_id (UUID, FK to organizations)
- user_id (UUID, FK to users, nullable for org-wide todos)
- title (TEXT, required)
- description (TEXT, optional)
- priority (TEXT: low|medium|high)
- status (TEXT: todo|done)
- due_date (DATE, optional)
- notification_id (UUID, FK to notifications, optional)
- metadata (JSONB, default {})
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
- created_by (UUID, FK to users)
```

## 🔒 Security (RLS)

All tables have Row Level Security enabled:
- Users can only see notifications/todos in their organization
- Service role can create notifications for any org (for n8n)
- Users can only update/delete their own todos (or org-wide todos)

## 🎯 Next Steps

1. **Run migrations** in Supabase
2. **Update frontend** to use real API instead of mock data
3. **Set up n8n workflows** to create notifications
4. **Test end-to-end** flow

## 📝 Notes

- Notifications are org-scoped (all users in an org see the same notifications)
- Todos are user-scoped by default (user_id set), but can be org-wide (user_id = null)
- Metadata field allows storing n8n workflow IDs, automation run IDs, etc.
- Service role client is needed for n8n to create notifications (bypasses RLS)

