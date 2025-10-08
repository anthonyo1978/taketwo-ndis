# Testing the Automated Batch Processing System

## 🎯 Test Plan

This document outlines how to test if the batch processing system is working correctly.

---

## ✅ Pre-requisites Check

Before testing, verify these are in place:

### 1. Database Tables Exist
Run these SQL queries in Supabase:

```sql
-- Check if automation tables exist
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'automation_settings'
);

SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'automation_logs'
);

-- Check funding_contracts has automation fields
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'funding_contracts' 
AND column_name IN (
  'auto_billing_enabled',
  'automated_drawdown_frequency', 
  'next_run_date',
  'first_run_date',
  'daily_support_item_cost'
);
```

### 2. Automation Settings Configured
```sql
-- Check automation settings
SELECT * FROM automation_settings 
WHERE organization_id = '00000000-0000-0000-0000-000000000000';
```

Should show:
- `enabled = true`
- `run_time` set (e.g., '02:00:00')
- Admin emails configured

### 3. Test Data Exists
```sql
-- Check for contracts with automation enabled
SELECT 
  fc.id,
  fc.auto_billing_enabled,
  fc.automated_drawdown_frequency,
  fc.next_run_date,
  fc.daily_support_item_cost,
  fc.current_balance,
  r.first_name || ' ' || r.last_name as resident_name
FROM funding_contracts fc
JOIN residents r ON r.id = fc.resident_id
WHERE fc.auto_billing_enabled = true;
```

---

## 🧪 Test Scenarios

### Test 1: Check Contract Eligibility

**Goal**: Verify the eligibility checker can find contracts

**Steps**:
1. Go to `/settings/automation` in your live app
2. Click "Preview Next 3 Days" button
3. Verify contracts are shown grouped by date

**Expected Result**:
- Should show contracts scheduled to run in next 3 days
- Each contract should show:
  - Resident name
  - Transaction amount
  - Current balance
  - Balance after transaction
  - Next run date

**What to Check**:
- Are the amounts correct?
- Are the dates correct?
- Are the balances sufficient?

---

### Test 2: Preview Transaction Generation

**Goal**: Test transaction generation without actually creating them

**Steps**:
1. Go to `/settings/automation`
2. Click "Preview Transactions" button
3. Review the preview

**Expected Result**:
- Shows list of transactions that would be created
- Shows total amount
- Shows frequency breakdown
- No actual transactions created

**What to Check**:
- Are the transaction amounts correct?
- Are the descriptions meaningful?
- Are there any errors shown?

---

### Test 3: Manual Transaction Generation

**Goal**: Actually generate transactions manually

**Steps**:
1. Go to `/settings/automation`
2. Click "Generate Transactions" button
3. Confirm the action
4. Wait for result

**Expected Result**:
- Success message with count of created transactions
- Contracts' next_run_date updated
- Contracts' current_balance reduced
- Transactions visible in transactions page

**What to Verify**:
```sql
-- Check generated transactions
SELECT 
  t.id,
  t.resident_id,
  t.contract_id,
  t.amount,
  t.status,
  t.description,
  t.created_at,
  t.created_by
FROM transactions t
WHERE t.created_by = 'automation-system'
ORDER BY t.created_at DESC
LIMIT 10;

-- Check updated contracts
SELECT 
  id,
  next_run_date,
  last_drawdown_date,
  current_balance
FROM funding_contracts
WHERE auto_billing_enabled = true
ORDER BY updated_at DESC;
```

---

### Test 4: Check Automation Logs

**Goal**: Verify logging is working

**Steps**:
Run this SQL:
```sql
SELECT 
  run_date,
  status,
  contracts_processed,
  contracts_skipped,
  contracts_failed,
  execution_time_ms,
  summary
FROM automation_logs
ORDER BY run_date DESC
LIMIT 5;
```

**Expected Result**:
- Log entries for each run
- Human-readable summaries
- Accurate counts and totals

---

### Test 5: Test Cron Endpoint Directly

**Goal**: Manually trigger the cron endpoint

**Steps**:
1. Get your CRON_SECRET from Vercel environment variables
2. Use curl or Postman to call the endpoint:

```bash
curl -X GET "https://your-app.vercel.app/api/automation/cron" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Expected Result**:
```json
{
  "success": true,
  "data": {
    "executionDate": "2025-01-09T12:00:00.000Z",
    "executionTime": 1234,
    "processedContracts": 5,
    "successfulTransactions": 5,
    "failedTransactions": 0,
    "totalAmount": 3500.00,
    "summary": { ... }
  }
}
```

---

### Test 6: Verify Vercel Cron Schedule

**Goal**: Check if Vercel cron is configured

**Steps**:
1. Go to your Vercel dashboard
2. Select your project
3. Go to "Cron Jobs" tab
4. Check the schedule

**Expected**: 
- Should show cron job for `/api/automation/cron`
- Schedule: Daily at 1:00 AM (Hobby plan) or hourly (Pro plan)
- Status: Enabled

---

## 🐛 Common Issues & Debugging

### Issue 1: No Eligible Contracts Found

**Symptoms**: Preview shows 0 contracts

**Check**:
```sql
-- Detailed eligibility check
SELECT 
  fc.id,
  fc.auto_billing_enabled,
  fc.automated_drawdown_frequency,
  fc.next_run_date,
  fc.daily_support_item_cost,
  fc.current_balance,
  fc.contract_status,
  r.status as resident_status,
  r.first_name || ' ' || r.last_name as resident_name,
  CASE 
    WHEN fc.auto_billing_enabled = false THEN 'Automation not enabled'
    WHEN fc.contract_status != 'Active' THEN 'Contract not active'
    WHEN r.status != 'Active' THEN 'Resident not active'
    WHEN fc.next_run_date > CURRENT_DATE THEN 'Not scheduled yet'
    WHEN fc.current_balance < (fc.daily_support_item_cost * 
      CASE fc.automated_drawdown_frequency
        WHEN 'daily' THEN 1
        WHEN 'weekly' THEN 7
        WHEN 'fortnightly' THEN 14
      END) THEN 'Insufficient balance'
    ELSE 'Eligible!'
  END as eligibility_reason
FROM funding_contracts fc
JOIN residents r ON r.id = fc.resident_id
WHERE fc.auto_billing_enabled = true;
```

---

### Issue 2: Transactions Created but Wrong Amount

**Check**:
```sql
-- Verify daily rate calculations
SELECT 
  id,
  type,
  amount as contract_amount,
  duration_days,
  daily_support_item_cost,
  CASE 
    WHEN duration_days > 0 THEN amount / duration_days
    ELSE 0
  END as calculated_daily_rate,
  automated_drawdown_frequency,
  CASE automated_drawdown_frequency
    WHEN 'daily' THEN daily_support_item_cost * 1
    WHEN 'weekly' THEN daily_support_item_cost * 7
    WHEN 'fortnightly' THEN daily_support_item_cost * 14
  END as expected_transaction_amount
FROM funding_contracts
WHERE auto_billing_enabled = true;
```

---

### Issue 3: Cron Not Running

**Check Vercel Logs**:
1. Go to Vercel dashboard → Your Project → Logs
2. Filter by function: `/api/automation/cron`
3. Look for execution logs

**Check Automation Logs**:
```sql
SELECT * FROM automation_logs 
ORDER BY run_date DESC 
LIMIT 1;
```

If no recent logs:
- Verify cron is enabled in Vercel
- Check CRON_SECRET environment variable is set
- Verify automation settings have `enabled = true`
- Check `run_time` matches when cron actually runs

---

### Issue 4: Time Not Matching

**Problem**: Cron runs but says "Not time to run yet"

**Check**:
```sql
-- Check configured run time
SELECT run_time, timezone 
FROM automation_settings 
WHERE organization_id = '00000000-0000-0000-0000-000000000000';
```

**Fix**:
- For Vercel Hobby plan: Cron runs daily at 1:00 AM UTC
- Your `run_time` should be set to match (considering timezone)
- Example: If you want 2 AM Sydney time, that's 3 PM UTC (previous day)

---

## 📊 Success Metrics

A healthy automation system should show:

1. ✅ **Consistent Runs**: Log entries appear daily
2. ✅ **High Success Rate**: Most transactions succeed
3. ✅ **Accurate Amounts**: Transaction amounts match expected calculations
4. ✅ **Updated Balances**: Contract balances decrease correctly
5. ✅ **Next Run Dates**: Contracts have correct next_run_date set
6. ✅ **No Duplicates**: Each contract generates only one transaction per run

---

## 🔍 Detailed Diagnostic Query

Run this comprehensive query to see the full picture:

```sql
WITH latest_logs AS (
  SELECT * FROM automation_logs 
  ORDER BY run_date DESC 
  LIMIT 5
),
active_contracts AS (
  SELECT 
    fc.*,
    r.first_name || ' ' || r.last_name as resident_name,
    r.status as resident_status
  FROM funding_contracts fc
  JOIN residents r ON r.id = fc.resident_id
  WHERE fc.auto_billing_enabled = true
),
recent_transactions AS (
  SELECT * FROM transactions
  WHERE created_by = 'automation-system'
  ORDER BY created_at DESC
  LIMIT 20
)
SELECT 
  '=== AUTOMATION SETTINGS ===' as section,
  (SELECT enabled FROM automation_settings LIMIT 1) as automation_enabled,
  (SELECT run_time FROM automation_settings LIMIT 1) as configured_run_time
UNION ALL
SELECT 
  '=== ACTIVE CONTRACTS ===' as section,
  COUNT(*)::text as count,
  NULL
FROM active_contracts
UNION ALL
SELECT 
  '=== LATEST RUNS ===' as section,
  COUNT(*)::text as run_count,
  NULL
FROM latest_logs
UNION ALL
SELECT 
  '=== RECENT AUTO TRANSACTIONS ===' as section,
  COUNT(*)::text as transaction_count,
  SUM(amount)::text as total_amount
FROM recent_transactions;
```

---

## 🎯 Quick Test Command

Create a test script to quickly check automation status:

```bash
#!/bin/bash
# test-automation.sh

echo "🔍 Testing Automation System"
echo "=============================="
echo ""

# Test 1: Check if cron endpoint is accessible
echo "1. Testing cron endpoint..."
curl -s -X GET "https://your-app.vercel.app/api/automation/cron" \
  -H "Authorization: Bearer $CRON_SECRET" | jq '.'

echo ""
echo "2. Check automation logs..."
# Add SQL query here

echo ""
echo "3. Test complete!"
```

---

## 📝 Next Steps After Testing

Once testing is complete:

1. **If Working**: 
   - Monitor for a few days
   - Set up email notifications (Phase 4)
   - Create log viewer UI

2. **If Issues Found**:
   - Document the specific issue
   - Check relevant logs
   - Review test data setup
   - Verify environment variables

---

## 🆘 Getting Help

If stuck, provide:
1. Results of Pre-requisites Check
2. Screenshots of Preview Next 3 Days
3. SQL query results from diagnostic queries
4. Vercel logs (if accessible)
5. Automation logs table contents

