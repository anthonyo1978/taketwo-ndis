# Implementation Plan: User in Session

## Overview
Implement persistent user session awareness throughout Haven with profile display, action logging, and auto-logout functionality.

## Phase 1: Database & Backend

### 1.1 Create System Logs Table
**File**: `supabase/migrations/029_create_system_logs_table.sql`

```sql
CREATE TABLE system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,  -- 'house', 'resident', 'transaction', 'contract', etc.
  entity_id UUID,
  action TEXT NOT NULL,  -- 'create', 'update', 'delete', 'view', etc.
  details JSONB,  -- Additional context (before/after values, etc.)
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX idx_system_logs_entity ON system_logs(entity_type, entity_id);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX idx_system_logs_action ON system_logs(action);

-- RLS
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow server to manage logs"
  ON system_logs FOR ALL
  USING (true)
  WITH CHECK (true);
```

### 1.2 Create Session Context API
**File**: `lib/contexts/SessionContext.tsx`
- React Context to hold current user data
- Fetch user on mount from `/api/auth/session`
- Provide user data to all components
- Handle logout
- Track activity for auto-logout

### 1.3 Create Session API Route
**File**: `app/api/auth/session/route.ts`
- GET: Return current user from Supabase Auth + users table
- Includes: id, first_name, last_name, email, phone, job_title, role

### 1.4 Create Logout API Route
**File**: `app/api/auth/logout/route.ts`
- POST: Sign out from Supabase Auth
- Log logout action to system_logs
- Clear session

## Phase 2: UI Components

### 2.1 User Profile Icon Component
**File**: `components/layout/UserProfileIcon.tsx`
- Circle with initials (e.g., "AO")
- Blue background (#4f46e5)
- White text
- Hover effect
- Click opens dropdown

### 2.2 User Profile Dropdown
**File**: `components/layout/UserProfileDropdown.tsx`
- Shows user info (read-only):
  - Full name
  - Email
  - Phone (if set)
  - Job title (if set)
  - Role badge
- "Log Out" button at bottom
- Clean, professional design

### 2.3 Activity Tracker Hook
**File**: `lib/hooks/useActivityTracker.ts`
- Track user interactions (clicks, keyboard, etc.)
- Reset 10-minute timer on activity
- Show warning at 9 minutes
- Auto-logout at 10 minutes
- Warning modal component

### 2.4 Update Admin Layout
**File**: `app/(admin)/layout.tsx`
- Add UserProfileIcon to top-right of header
- Wrap in SessionProvider
- Add activity tracker
- Add logout warning modal

## Phase 3: Action Logging Service

### 3.1 Create Audit Logger Service
**File**: `lib/services/audit-logger.ts`
- `logAction(userId, entityType, entityId, action, details?)` function
- Automatically captures IP and user agent
- Used throughout the app for all mutations

### 3.2 Integrate Logging into Existing APIs
Update these API routes to log actions:
- `app/api/houses/**` - Create/Update/Delete houses
- `app/api/residents/**` - Create/Update/Delete residents
- `app/api/transactions/**` - Create/Update/Delete/Void transactions
- `app/api/contracts/**` - Create/Renew/Expire contracts
- `app/api/settings/**` - Update settings
- `app/api/users/**` - User management actions

## Phase 4: Testing & Polish

### 4.1 Test Session Flow
- ✅ Login shows profile icon
- ✅ Profile dropdown displays correct info
- ✅ Logout works and redirects to login
- ✅ Auto-logout after 10 min inactivity
- ✅ Warning shows at 9 minutes

### 4.2 Test Action Logging
- ✅ All CRUD operations logged
- ✅ User ID correctly associated
- ✅ Logs queryable in database
- ✅ No performance degradation

### 4.3 Polish
- ✅ Loading states
- ✅ Error handling
- ✅ Smooth animations
- ✅ Mobile responsive

## Implementation Order

1. **Database**: Create system_logs table (migration)
2. **Backend**: Session and logout API routes
3. **Context**: SessionProvider with user data
4. **UI**: Profile icon and dropdown components
5. **Activity**: Inactivity tracker and warning
6. **Integration**: Add to admin layout
7. **Logging**: Audit logger service
8. **Integration**: Add logging to all API routes
9. **Testing**: End-to-end verification

## Files to Create (12 new files)
1. `supabase/migrations/029_create_system_logs_table.sql`
2. `lib/contexts/SessionContext.tsx`
3. `app/api/auth/session/route.ts`
4. `app/api/auth/logout/route.ts`
5. `components/layout/UserProfileIcon.tsx`
6. `components/layout/UserProfileDropdown.tsx`
7. `components/layout/InactivityWarningModal.tsx`
8. `lib/hooks/useActivityTracker.ts`
9. `lib/hooks/useInactivityTimer.ts`
10. `lib/services/audit-logger.ts`
11. `lib/services/session-service.ts`
12. Update `app/(admin)/layout.tsx`

## Files to Modify (15+ API routes)
All API routes that perform CRUD operations to add logging

## Estimated Complexity
- **Database**: Simple (1 table)
- **Session Management**: Medium (context, APIs, hooks)
- **UI Components**: Medium (profile icon, dropdown, modal)
- **Action Logging**: High (touch many API routes)
- **Total**: ~50-70 tool calls

Ready to proceed? 🚀

