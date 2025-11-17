# n8n Integration Guide for Haven

This guide explains how to connect n8n to your Haven application for automation workflows.

## Overview

Haven uses **Supabase authentication** with JWT tokens. Most API endpoints require authentication via session cookies. For n8n integration, you have several options:

## Option 1: Use Cron Endpoint (Recommended for Automation)

The `/api/automation/cron` endpoint is designed for automated triggers and supports Bearer token authentication.

### Setup Steps:

1. **Set CRON_SECRET in Haven** (if not already set):
   ```bash
   # In your Vercel environment variables or .env.local
   CRON_SECRET=your-secure-random-secret-here
   ```

2. **Create n8n HTTP Request Node**:
   - **Method**: `GET`
   - **URL**: `https://your-haven-app.vercel.app/api/automation/cron`
   - **Authentication**: 
     - Type: `Generic Credential Type`
     - Header Name: `Authorization`
     - Header Value: `Bearer your-secure-random-secret-here`

3. **Example n8n Workflow**:
   ```
   Trigger (Schedule/Cron) → HTTP Request → Process Response
   ```

### What This Endpoint Does:
- Processes ALL organizations with automation enabled
- Generates transactions for eligible contracts
- Sends email notifications to admins
- Returns detailed execution logs

### Response Format:
```json
{
  "success": true,
  "executionDate": "2025-11-17T00:00:00.000Z",
  "organizationsProcessed": 3,
  "totalTransactionsCreated": 15,
  "summary": {
    "totalContracts": 20,
    "eligibleContracts": 15,
    "successfulTransactions": 15,
    "failedTransactions": 0
  }
}
```

---

## Option 2: Supabase JWT Authentication (For Full API Access)

For accessing other endpoints (residents, houses, transactions, etc.), you'll need a Supabase JWT token.

### Setup Steps:

1. **Create a Service Account User in Haven**:
   - Go to your Haven app → Settings → Users
   - Create a new user account for n8n
   - Note the email and password

2. **Get Supabase JWT Token**:
   
   **Option A: Via n8n HTTP Request** (Login once, save token):
   ```http
   POST https://your-haven-app.vercel.app/api/auth/login
   Content-Type: application/json
   
   {
     "email": "n8n-service@yourdomain.com",
     "password": "your-password"
   }
   ```
   
   Response includes session cookie. Extract the JWT from the cookie or use cookie-based auth.

   **Option B: Direct Supabase Auth** (More complex):
   - Use Supabase client to authenticate
   - Extract JWT token from response
   - Store in n8n credentials

3. **Use JWT in n8n Requests**:
   - **Header Name**: `Authorization`
   - **Header Value**: `Bearer <your-jwt-token>`
   - **OR** use cookie-based authentication (set cookies from login response)

### Available API Endpoints:

#### Automation Endpoints:
- `GET /api/automation/settings` - Get automation settings
- `POST /api/automation/settings` - Update automation settings
- `GET /api/automation/eligible-contracts` - Get eligible contracts
- `POST /api/automation/generate-transactions` - Generate transactions
- `GET /api/automation/logs/today` - Get today's automation logs

#### Data Endpoints:
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/residents` - List all residents
- `GET /api/houses` - List all houses
- `GET /api/transactions` - List transactions
- `GET /api/claims` - List claims

#### Example n8n Workflow:
```
HTTP Request (Login) → Extract Token → HTTP Request (Get Data) → Process
```

---

## Option 3: Create Custom API Key Endpoint (Advanced)

If you need a simpler authentication method, you can create a custom API key endpoint in Haven.

### Implementation (Add to Haven):

Create `/app/api/webhooks/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server"

const API_KEYS = {
  'n8n-key-123': {
    organizationId: '00000000-0000-0000-0000-000000000000',
    permissions: ['read', 'write']
  }
}

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key')
  
  if (!apiKey || !API_KEYS[apiKey]) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  // Your logic here
  return NextResponse.json({ success: true })
}
```

Then use `x-api-key` header in n8n.

---

## Recommended n8n Workflows

### 1. **Daily Automation Trigger**
```
Schedule Trigger (Daily 2:00 AM AEST)
  → HTTP Request (POST /api/automation/cron)
  → If Error → Send Email Alert
  → Log Results
```

### 2. **Monitor Dashboard Stats**
```
Schedule Trigger (Every Hour)
  → HTTP Request (GET /api/dashboard/stats)
  → Extract Key Metrics
  → If Threshold Exceeded → Send Alert
  → Store in Database
```

### 3. **Transaction Webhook**
```
Webhook Trigger (from Haven)
  → Process Transaction Data
  → Update External System
  → Send Notification
```

### 4. **Resident Status Monitoring**
```
Schedule Trigger (Daily)
  → HTTP Request (GET /api/residents)
  → Filter by Status
  → If Status Changed → Send Alert
```

---

## Environment Variables for n8n

Set these in n8n's environment or credential store:

```bash
HAVEN_BASE_URL=https://your-haven-app.vercel.app
HAVEN_CRON_SECRET=your-secure-random-secret
HAVEN_API_EMAIL=n8n-service@yourdomain.com
HAVEN_API_PASSWORD=your-secure-password
```

---

## Security Best Practices

1. **Use Strong Secrets**: Generate secure random strings for `CRON_SECRET`
2. **Rotate Credentials**: Regularly update API keys and passwords
3. **Limit Permissions**: Create service accounts with minimal required permissions
4. **Use HTTPS**: Always use HTTPS for API calls
5. **Monitor Access**: Review n8n execution logs regularly
6. **Rate Limiting**: Be mindful of API rate limits

---

## Troubleshooting

### "Unauthorized" Error
- Check that `CRON_SECRET` matches in both Haven and n8n
- Verify JWT token is valid and not expired
- Ensure service account user is active

### "User organization not found"
- Service account must be associated with an organization
- Check user status in Haven admin panel

### Connection Timeout
- Verify Haven app URL is correct
- Check if app is deployed and accessible
- Review Vercel function logs

### Rate Limiting
- Add delays between requests in n8n
- Use batch endpoints where available
- Consider caching responses

---

## Example n8n Node Configuration

### HTTP Request Node (Cron Endpoint):
```json
{
  "method": "GET",
  "url": "https://your-haven-app.vercel.app/api/automation/cron",
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [
      {
        "name": "Authorization",
        "value": "Bearer {{ $env.HAVEN_CRON_SECRET }}"
      }
    ]
  }
}
```

### HTTP Request Node (With JWT):
```json
{
  "method": "GET",
  "url": "https://your-haven-app.vercel.app/api/dashboard/stats",
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [
      {
        "name": "Authorization",
        "value": "Bearer {{ $json.accessToken }}"
      }
    ]
  }
}
```

---

## Next Steps

1. **Choose your authentication method** (Option 1 is simplest for automation)
2. **Set up credentials in n8n**
3. **Test with a simple workflow**
4. **Build your automation workflows**
5. **Monitor and iterate**

---

## Support

For issues or questions:
- Check Haven API logs in Vercel
- Review n8n execution logs
- Verify environment variables are set correctly
- Test endpoints directly with `curl` or Postman first

