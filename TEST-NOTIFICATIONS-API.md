# Testing Notifications & Todos API Endpoints

## Prerequisites

1. ✅ Migrations run successfully
2. ✅ You're logged into the app (to get session cookie)
3. ✅ You have an organization assigned

## Method 1: Browser DevTools (Easiest)

### Step 1: Open Browser DevTools
1. Log into your app at `http://localhost:3000` (or production URL)
2. Open DevTools (F12 or Cmd+Option+I)
3. Go to **Console** tab

### Step 2: Test GET Notifications
```javascript
// Get all notifications
fetch('/api/notifications')
  .then(r => r.json())
  .then(data => console.log('Notifications:', data))

// Get unread notifications only
fetch('/api/notifications?filter=unread')
  .then(r => r.json())
  .then(data => console.log('Unread:', data))
```

### Step 3: Test POST Notification
```javascript
// Create a test notification
fetch('/api/notifications', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Test Notification',
    message: 'This is a test notification from the browser',
    category: 'system',
    priority: 'medium',
    icon: '🔔'
  })
})
  .then(r => r.json())
  .then(data => console.log('Created:', data))
```

### Step 4: Test PATCH (Mark as Read)
```javascript
// First, get a notification ID from the GET request above
const notificationId = 'YOUR_NOTIFICATION_ID_HERE'

fetch(`/api/notifications/${notificationId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ read: true })
})
  .then(r => r.json())
  .then(data => console.log('Updated:', data))
```

### Step 5: Test Todos
```javascript
// Get all todos
fetch('/api/todos')
  .then(r => r.json())
  .then(data => console.log('Todos:', data))

// Create a todo
fetch('/api/todos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Test Todo',
    description: 'This is a test todo',
    priority: 'high',
    dueDate: '2025-12-31'
  })
})
  .then(r => r.json())
  .then(data => console.log('Created Todo:', data))
```

## Method 2: Using curl (Terminal)

### Step 1: Get Your Session Cookie
1. Log into the app in your browser
2. Open DevTools → Application/Storage → Cookies
3. Find the cookie named `sb-...-auth-token` (Supabase auth token)
4. Copy the entire cookie value

### Step 2: Test with curl
```bash
# Replace YOUR_COOKIE_HERE with your actual cookie
COOKIE="sb-xxxxx-auth-token=YOUR_COOKIE_HERE"

# Get notifications
curl -X GET "http://localhost:3000/api/notifications" \
  -H "Cookie: $COOKIE" \
  -H "Content-Type: application/json"

# Create notification
curl -X POST "http://localhost:3000/api/notifications" \
  -H "Cookie: $COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test from curl",
    "message": "This notification was created via curl",
    "category": "system",
    "priority": "medium"
  }'

# Get todos
curl -X GET "http://localhost:3000/api/todos" \
  -H "Cookie: $COOKIE" \
  -H "Content-Type: application/json"

# Create todo
curl -X POST "http://localhost:3000/api/todos" \
  -H "Cookie: $COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Todo from curl",
    "description": "Created via API",
    "priority": "high",
    "dueDate": "2025-12-31"
  }'
```

## Method 3: Using Postman/Insomnia

### Setup
1. Create a new request
2. Set URL: `http://localhost:3000/api/notifications`
3. Go to **Cookies** tab
4. Add cookie from your browser session
5. Or use **Headers** tab and add:
   ```
   Cookie: sb-xxxxx-auth-token=YOUR_TOKEN_HERE
   ```

### Test Requests

**GET Notifications:**
- Method: `GET`
- URL: `http://localhost:3000/api/notifications`
- Headers: `Content-Type: application/json`

**POST Notification:**
- Method: `POST`
- URL: `http://localhost:3000/api/notifications`
- Headers: `Content-Type: application/json`
- Body (JSON):
```json
{
  "title": "Test Notification",
  "message": "Created from Postman",
  "category": "system",
  "priority": "medium",
  "icon": "🔔",
  "actionUrl": "/dashboard"
}
```

**PATCH Notification (Mark as Read):**
- Method: `PATCH`
- URL: `http://localhost:3000/api/notifications/{notificationId}`
- Body (JSON):
```json
{
  "read": true
}
```

## Method 4: Direct Database Test (Service Role)

For testing n8n-style notifications (using service role):

```javascript
// In a Node.js script or browser console (if you have service role key)
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SERVICE_ROLE_KEY'
)

// Create notification (bypasses RLS)
const { data, error } = await supabase
  .from('notifications')
  .insert({
    organization_id: 'YOUR_ORG_ID',
    title: 'Test from Service Role',
    message: 'This bypasses RLS',
    category: 'n8n',
    priority: 'high'
  })
  .select()
  .single()

console.log('Created:', data)
```

## Expected Responses

### Success Response
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-here",
      "organization_id": "org-uuid",
      "title": "Notification Title",
      "message": "Notification message",
      "read": false,
      "category": "system",
      "priority": "medium",
      "created_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message here"
}
```

## Common Issues

### 401 Unauthorized
- **Cause**: Not logged in or session expired
- **Fix**: Log into the app again to refresh session

### 403 Forbidden
- **Cause**: Trying to access another organization's data
- **Fix**: Make sure you're testing with your own organization's data

### 404 Not Found
- **Cause**: Notification/Todo ID doesn't exist or belongs to another org
- **Fix**: Use an ID from your organization

### Empty Array Response
- **Cause**: No notifications/todos exist yet (this is normal!)
- **Fix**: Create some test data first

## Quick Test Checklist

- [ ] GET `/api/notifications` returns `{ success: true, data: [] }`
- [ ] POST `/api/notifications` creates a notification
- [ ] GET `/api/notifications?filter=unread` shows unread only
- [ ] PATCH `/api/notifications/[id]` marks as read
- [ ] GET `/api/todos` returns todos
- [ ] POST `/api/todos` creates a todo
- [ ] PATCH `/api/todos/[id]` updates todo status

## Next Steps

Once endpoints are working:
1. Update frontend to use real API (replace mock data)
2. Test end-to-end in the UI
3. Set up n8n workflows to create notifications

