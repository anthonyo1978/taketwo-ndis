# Haven Notifications Integration Guide

This guide walks you through integrating Haven's notifications system with real data sources.

## Overview

The notifications system consists of:
- **Frontend**: Right-side panel with notifications and todos
- **Backend**: API endpoints (`/api/notifications`, `/api/todos`)
- **Database**: `notifications` and `todos` tables in Supabase
- **Integration Points**: n8n workflows, automation cron job, manual triggers

## Step 1: Verify Database Setup

Ensure your migrations have been run:

```bash
# Check if tables exist in Supabase
# Run these queries in Supabase SQL Editor:

SELECT * FROM notifications LIMIT 1;
SELECT * FROM todos LIMIT 1;
```

If tables don't exist, run the migrations:
- `supabase/migrations/056_create_notifications_table.sql`
- `supabase/migrations/057_create_todos_table.sql`

## Step 2: Switch Frontend to Real API (Optional - Test First)

The frontend currently uses mock data. To switch to real API calls:

1. **Set environment variable** (if not already set):
   ```bash
   NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true
   ```

2. **Update NotificationsPanel.tsx** to fetch from API (see Step 3)

3. **Update TodoContext.tsx** to fetch from API (see Step 3)

## Step 3: Update Frontend Components

### Option A: Gradual Migration (Recommended)

Keep mock data as fallback, but try API first:

```typescript
// In NotificationsPanel.tsx
const fetchNotifications = async () => {
  try {
    const response = await fetch('/api/notifications?read=false')
    const result = await response.json()
    if (result.success && result.data) {
      setNotifications(result.data)
    } else {
      // Fallback to mock data
      setNotifications(generateMockNotifications())
    }
  } catch (error) {
    console.error('Failed to fetch notifications:', error)
    // Fallback to mock data
    setNotifications(generateMockNotifications())
  }
}
```

### Option B: Full Migration

Replace all mock data with API calls (see code changes below).

## Step 4: Connect n8n to Create Notifications

### Method 1: Direct API Call (Recommended)

Create an n8n HTTP Request node:

**Configuration:**
- **Method**: `POST`
- **URL**: `https://your-haven-app.vercel.app/api/notifications`
- **Authentication**: Cookie-based (from user session) OR Bearer token

**Request Body:**
```json
{
  "title": "Automation Complete",
  "message": "Successfully generated 15 transactions for Organization XYZ",
  "icon": "check-circle",
  "category": "automation",
  "priority": "high",
  "actionUrl": "/dashboard/transactions"
}
```

**n8n Workflow Example:**
```
Schedule Trigger (Daily 2:00 AM)
  → HTTP Request (Call /api/automation/cron)
  → IF (transactions created > 0)
    → HTTP Request (POST /api/notifications)
      → Create notification for each org
```

### Method 2: Using Notification Service (Server-Side)

If calling from a Next.js API route or serverless function:

```typescript
import { createNotification } from 'lib/services/notification-service'

// In your API route or cron job
await createNotification({
  organizationId: 'org-id-here',
  title: 'Automation Complete',
  message: 'Successfully generated 15 transactions',
  icon: 'check-circle',
  category: 'automation',
  priority: 'high',
  actionUrl: '/dashboard/transactions'
})
```

## Step 5: Integrate with Automation Cron Job

Update the automation cron job to create notifications:

**File**: `app/api/automation/cron/route.ts`

Add notification creation after successful transaction generation:

```typescript
import { createNotification } from 'lib/services/notification-service'

// After generating transactions for an org
if (transactionsCreated > 0) {
  await createNotification({
    organizationId: org.id,
    title: 'Automation Run Complete',
    message: `Generated ${transactionsCreated} transactions for ${org.name}`,
    icon: 'zap',
    category: 'automation',
    priority: 'high',
    actionUrl: '/dashboard/transactions',
    metadata: {
      executionDate: executionDate.toISOString(),
      transactionsCreated,
      contractsProcessed: eligibleContracts.length
    }
  })
}
```

## Step 6: Create Notifications from Other Events

### Example: Transaction Created

**File**: `app/api/transactions/route.ts` (POST handler)

```typescript
// After successfully creating a transaction
await createNotification({
  organizationId: session.organizationId,
  title: 'Transaction Created',
  message: `Transaction ${transactionId} created for ${residentName}`,
  icon: 'receipt',
  category: 'billing',
  priority: 'medium',
  actionUrl: `/dashboard/transactions?id=${transactionId}`
})
```

### Example: Resident Status Changed

**File**: `app/api/residents/[id]/route.ts` (PATCH handler)

```typescript
// After updating resident status
if (statusChanged) {
  await createNotification({
    organizationId: session.organizationId,
    title: 'Resident Status Updated',
    message: `${residentName} status changed to ${newStatus}`,
    icon: 'user',
    category: 'system',
    priority: 'low',
    actionUrl: `/dashboard/residents/${residentId}`
  })
}
```

## Step 7: Testing

### Test API Endpoints

1. **Create a notification**:
   ```bash
   curl -X POST http://localhost:3000/api/notifications \
     -H "Content-Type: application/json" \
     -H "Cookie: your-session-cookie" \
     -d '{
       "title": "Test Notification",
       "message": "This is a test",
       "category": "system",
       "priority": "medium"
     }'
   ```

2. **List notifications**:
   ```bash
   curl http://localhost:3000/api/notifications?read=false
   ```

3. **Mark as read**:
   ```bash
   curl -X PATCH http://localhost:3000/api/notifications/{id} \
     -H "Content-Type: application/json" \
     -d '{"read": true}'
   ```

### Test n8n Integration

1. Create a simple n8n workflow:
   - **Trigger**: Manual (for testing)
   - **HTTP Request**: POST to `/api/notifications`
   - **Body**: JSON with notification data

2. Execute the workflow and verify:
   - Notification appears in database
   - Notification appears in frontend panel

## Step 8: Production Deployment

1. **Set environment variables in Vercel**:
   - `NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true`
   - `SUPABASE_SERVICE_ROLE_KEY` (for notification service)

2. **Deploy migrations** (if not already done):
   ```bash
   supabase db push
   ```

3. **Update n8n workflows** to use production URL:
   - Change `localhost:3000` to `your-haven-app.vercel.app`

4. **Test in production**:
   - Create a test notification via API
   - Verify it appears in the frontend
   - Test n8n workflow

## Common Issues & Solutions

### Issue: Notifications not appearing in frontend

**Solution**: 
- Check `NEXT_PUBLIC_ENABLE_NOTIFICATIONS` is set to `true`
- Verify API endpoints are returning data
- Check browser console for errors
- Ensure user is authenticated and has access to organization

### Issue: n8n can't create notifications

**Solution**:
- Verify authentication (cookie or Bearer token)
- Check `organizationId` is correct
- Ensure RLS policies allow inserts (service role bypasses RLS)
- Check Supabase logs for errors

### Issue: Notifications appear for wrong organization

**Solution**:
- Verify `organizationId` is correctly passed
- Check RLS policies filter by `organization_id`
- Ensure session context has correct organization

## Next Steps

1. ✅ Database tables created
2. ✅ API endpoints ready
3. ⏳ Update frontend to use real API (optional - can test with mock first)
4. ⏳ Integrate with automation cron job
5. ⏳ Set up n8n workflows
6. ⏳ Add notifications to other events (transactions, residents, etc.)

## Support

For issues or questions:
- Check API logs in Vercel
- Check Supabase logs
- Review RLS policies
- Test endpoints with curl/Postman first

