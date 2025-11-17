# N8N Notifications Panel

## Quick Start

To enable the notifications panel for testing:

1. **Add to `.env.local`**:
   ```bash
   NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true
   ```

2. **Restart your dev server**:
   ```bash
   pnpm dev
   ```

3. **View the panel**: Look for the bell icon on the right side of the screen

4. **To disable**: Remove the env var or set to `false`, then restart

The panel uses **mock data** initially - no backend required for front-end testing.

## Overview

A collapsible notifications panel on the right-hand side of Haven, similar to the left sidebar but dedicated to displaying notifications from various sources (N8N workflows, system events, etc.).

## Design Goals

1. **Right-side panel** - Mirrors the left sidebar pattern but on the right
2. **Collapsible/Expandable** - Similar toggle behavior to left sidebar
3. **Smaller footprint** - Slightly narrower than left sidebar when expanded
4. **Modular design** - Easy to remove if feature doesn't work out
5. **Front-end first** - Start with mock data, then connect to real sources

## User Experience

### Visual Design
- **Collapsed state**: ~48px wide, shows bell icon with unread count badge
- **Expanded state**: ~320px wide (smaller than left sidebar's 256px)
- **Position**: Fixed on right side, doesn't interfere with main content
- **Styling**: Matches left sidebar aesthetic (white background, gray borders)

### Interaction
- Click bell icon to expand/collapse
- Notifications grouped by:
  - **Unread** (top)
  - **Today**
  - **This Week**
  - **Older**
- Each notification shows:
  - Icon (type indicator)
  - Title
  - Preview text (truncated)
  - Timestamp (relative: "2m ago", "1h ago", etc.)
  - Action buttons (if applicable)
- Click notification to mark as read / view details
- "Mark all as read" button when expanded

### Notification Types

#### N8N Workflows
- Automation completed
- Automation failed
- Workflow triggered
- Data sync completed

#### System Events
- Transaction generated
- Claim submitted
- Resident status changed
- Contract expiring soon

#### User Actions
- User invited
- Settings changed
- Bulk operation completed

## Technical Implementation

### Component Structure

```
components/
  notifications/
    NotificationsPanel.tsx      # Main panel component
    NotificationItem.tsx        # Individual notification
    NotificationBadge.tsx       # Unread count badge
    useNotifications.ts         # Hook for notification state
    mockNotifications.ts        # Mock data for initial testing
```

### State Management

- **Local state** for panel collapse/expand
- **LocalStorage** for collapse preference
- **Mock data** initially, then:
  - API endpoint: `/api/notifications`
  - WebSocket/SSE for real-time updates (future)
  - Polling fallback

### Integration Points

1. **AdminLayoutContent.tsx**
   - Add `<NotificationsPanel />` to layout
   - Wrap in feature flag for easy removal

2. **API Endpoints** (future)
   - `GET /api/notifications` - Fetch notifications
   - `POST /api/notifications/:id/read` - Mark as read
   - `POST /api/notifications/read-all` - Mark all as read
   - `POST /api/notifications` - Create notification (for N8N)

3. **N8N Integration** (future)
   - N8N workflows can POST to `/api/notifications`
   - Include metadata: type, title, message, actionUrl, etc.

### Database Schema (future)

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID REFERENCES users(id), -- NULL = all users in org
  type VARCHAR(50) NOT NULL, -- 'n8n', 'system', 'user'
  category VARCHAR(50), -- 'automation', 'transaction', 'claim', etc.
  title VARCHAR(255) NOT NULL,
  message TEXT,
  action_url TEXT, -- Optional link to relevant page
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB -- Additional data (workflow ID, transaction ID, etc.)
);

CREATE INDEX idx_notifications_org_user ON notifications(organization_id, user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(organization_id, user_id, read_at) WHERE read_at IS NULL;
```

## Feature Flag

Use environment variable to enable/disable:

```typescript
const NOTIFICATIONS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS === 'true'
```

This allows easy removal by:
1. Setting flag to `false`
2. Removing component from layout
3. No other code changes needed

## Mock Data Structure

```typescript
interface Notification {
  id: string
  type: 'n8n' | 'system' | 'user'
  category: string
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
  icon?: string
}
```

## Removal Strategy

If feature doesn't work out:

1. **Set feature flag to false** - Hides panel immediately
2. **Remove from AdminLayoutContent** - One line deletion
3. **Delete notification components** - Clean removal
4. **No database changes needed** - If not yet implemented

## Future Enhancements

1. **Real-time updates** - WebSocket/SSE connection
2. **Sound notifications** - Optional audio alerts
3. **Desktop notifications** - Browser notification API
4. **Filtering** - Filter by type, category, date
5. **Search** - Search notification content
6. **Grouping** - Group similar notifications
7. **Actions** - Quick actions from notifications (approve, view, dismiss)

## Accessibility

- Keyboard navigation (Tab, Enter, Escape)
- ARIA labels for screen readers
- Focus management when expanding/collapsing
- High contrast mode support

## Mobile Considerations

- On mobile, panel becomes a bottom sheet or modal
- Swipe gestures for expand/collapse
- Touch-friendly target sizes (min 44x44px)

