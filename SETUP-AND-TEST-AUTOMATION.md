# 🚀 Setup and Test Your Automation System

**Status**: ✅ Deployed to production  
**Last Updated**: $(date)

---

## 🎯 What's Been Done

Your automation system is now fully configured for **hourly runs** and **on-demand execution**:

### ✅ Changes Deployed

1. **Hourly Vercel Cron** - Updated to run every hour (`0 * * * *`)
2. **Manual Run Button** - Added "🚀 Run Automation Now" button to settings page
3. **Time Check Bypass** - Automation runs every hour (no time restrictions)
4. **Test Data Scripts** - SQL scripts to create test contracts
5. **Comprehensive Testing Guide** - Step-by-step testing documentation

---

## 📋 Quick Start Guide

### Step 1: Upgrade to Vercel Pro (Required for Hourly Cron)

⚠️ **Important**: Vercel Hobby plan only allows daily cron jobs. To run hourly, you need Pro.

1. Go to your Vercel Dashboard → Settings → Plans
2. Upgrade to **Pro plan** ($20/month)
3. Hourly cron will automatically activate

**Without Pro**: Use the "Run Automation Now" button for manual testing

---

### Step 2: Create Test Data

Open your **Supabase SQL Editor** and run the queries from `CREATE-TEST-DATA.sql`:

#### Option A: Enable Automation on Existing Contract (Recommended)

```sql
-- 1. Find an existing active contract
SELECT 
  fc.id as contract_id,
  r.first_name || ' ' || r.last_name as resident_name,
  fc.type,
  fc.amount,
  fc.current_balance,
  fc.duration_days
FROM funding_contracts fc
JOIN residents r ON r.id = fc.resident_id
WHERE fc.contract_status = 'Active'
  AND fc.current_balance > 0
LIMIT 5;

-- 2. Enable automation on a contract (replace YOUR_CONTRACT_ID)
UPDATE funding_contracts
SET 
  auto_billing_enabled = true,
  automated_drawdown_frequency = 'weekly',
  next_run_date = CURRENT_DATE,
  first_run_date = CURRENT_DATE,
  daily_support_item_cost = CASE 
    WHEN duration_days > 0 THEN amount / duration_days
    ELSE 100.00
  END,
  updated_at = NOW()
WHERE id = 'YOUR_CONTRACT_ID';

-- 3. Verify it's eligible
SELECT 
  fc.id,
  r.first_name || ' ' || r.last_name as resident,
  fc.automated_drawdown_frequency,
  fc.daily_support_item_cost * 7 as weekly_amount,
  fc.current_balance,
  fc.next_run_date
FROM funding_contracts fc
JOIN residents r ON r.id = fc.resident_id
WHERE fc.auto_billing_enabled = true;
```

#### Option B: Create Complete Test Scenario

See `CREATE-TEST-DATA.sql` for full example creating a house, resident, and contract.

---

### Step 3: Configure Automation Settings

1. Go to your live app: `https://your-app.vercel.app/settings/automation`
2. Toggle **Enable Automation** to ON
3. Set **Run Time** (e.g., "02:00" for 2 AM)
4. Add your **Admin Email**
5. Configure notification preferences
6. Click **Save Settings**

---

### Step 4: Test the System

#### Option 1: Manual Run (Easiest) 🚀

1. Go to `/settings/automation`
2. Click **"🚀 Run Automation Now"** button
3. Wait for results (shows detailed summary)

**What You'll See**:
```
✅ Automation run completed successfully!

• Processed: 1 contracts
• Success: 1 transactions
• Failed: 0 transactions
• Total Amount: $191.80
• Execution Time: 245ms
```

#### Option 2: Preview First (Safer)

1. Click **"Preview Next 3 Days"** - See eligible contracts
2. Click **"Preview Transactions"** - See what will be created
3. Click **"Generate Transactions"** - Actually create them
4. Check the `/transactions` page to see created transactions

#### Option 3: Wait for Hourly Cron (Production)

- Cron runs automatically every hour at :00 minutes
- Check logs in Vercel Dashboard → Your Project → Logs
- Filter by function: `/api/automation/cron`

---

## 🔍 Verification Steps

### 1. Check if Automation Ran

```sql
-- Check automation logs
SELECT 
  run_date,
  status,
  contracts_processed,
  contracts_failed,
  execution_time_ms,
  summary
FROM automation_logs
ORDER BY run_date DESC
LIMIT 5;
```

### 2. Check Generated Transactions

```sql
-- Check auto-generated transactions
SELECT 
  t.occurred_at,
  r.first_name || ' ' || r.last_name as resident,
  t.amount,
  t.status,
  t.description
FROM transactions t
JOIN residents r ON r.id = t.resident_id
WHERE t.created_by = 'automation-system'
ORDER BY t.created_at DESC;
```

### 3. Check Updated Contracts

```sql
-- Check contract balances and next run dates
SELECT 
  fc.id,
  r.first_name || ' ' || r.last_name as resident,
  fc.current_balance,
  fc.last_drawdown_date,
  fc.next_run_date
FROM funding_contracts fc
JOIN residents r ON r.id = fc.resident_id
WHERE fc.auto_billing_enabled = true;
```

---

## 🎯 Expected Behavior

### When Automation Runs Successfully:

1. **Scans** all contracts with `auto_billing_enabled = true`
2. **Checks** eligibility (active status, sufficient balance, correct date)
3. **Creates** transactions with status "posted"
4. **Updates** contract balances (reduces by transaction amount)
5. **Sets** next_run_date based on frequency:
   - Daily: +1 day
   - Weekly: +7 days
   - Fortnightly: +14 days
6. **Logs** everything to `automation_logs` table
7. **Shows** results in UI when using manual run

---

## ⚡ Frequency Options

### Daily
- Runs every day
- Transaction amount = `daily_support_item_cost × 1`
- Example: $27.40 per day

### Weekly  
- Runs every 7 days
- Transaction amount = `daily_support_item_cost × 7`
- Example: $27.40 × 7 = $191.80 per week

### Fortnightly
- Runs every 14 days
- Transaction amount = `daily_support_item_cost × 14`
- Example: $27.40 × 14 = $383.60 per fortnight

---

## 🐛 Troubleshooting

### No Contracts Eligible?

**Check**:
```sql
SELECT 
  fc.id,
  CASE 
    WHEN NOT fc.auto_billing_enabled THEN '❌ Automation not enabled'
    WHEN fc.contract_status != 'Active' THEN '❌ Contract not active'
    WHEN r.status != 'Active' THEN '❌ Resident not active'
    WHEN fc.next_run_date > CURRENT_DATE THEN '⏰ Scheduled for ' || fc.next_run_date
    WHEN fc.current_balance < (fc.daily_support_item_cost * 7) THEN '❌ Insufficient balance'
    ELSE '✅ ELIGIBLE'
  END as reason
FROM funding_contracts fc
JOIN residents r ON r.id = fc.resident_id
WHERE fc.auto_billing_enabled = true;
```

**Fix**:
- Ensure contract has `auto_billing_enabled = true`
- Set `next_run_date = CURRENT_DATE` for immediate run
- Check `current_balance` is sufficient
- Verify resident and contract status are 'Active'

### Manual Run Button Says "Skipped"?

**Problem**: Automation is disabled in settings

**Fix**:
1. Go to `/settings/automation`
2. Toggle "Enable Automation" to ON
3. Save settings
4. Try again

### Vercel Cron Not Running?

**Check**:
1. Vercel Dashboard → Your Project → Cron Jobs
2. Verify schedule shows "0 * * * *" (hourly)
3. Check you're on Pro plan (Hobby can't do hourly)
4. Check Environment Variable `CRON_SECRET` is set (optional but recommended)

### Transactions Created but Wrong Amount?

**Check**:
```sql
SELECT 
  id,
  amount as contract_amount,
  duration_days,
  daily_support_item_cost,
  amount / NULLIF(duration_days, 0) as calculated_daily_rate
FROM funding_contracts
WHERE auto_billing_enabled = true;
```

**Fix**:
```sql
UPDATE funding_contracts
SET daily_support_item_cost = amount / NULLIF(duration_days, 0)
WHERE auto_billing_enabled = true
  AND duration_days > 0;
```

---

## 📊 Monitoring Dashboard (Coming Soon)

Future enhancements will include:
- Real-time automation status dashboard
- Success/failure rate charts
- Email notifications on errors
- Weekly summary reports
- Performance metrics

---

## 🔐 Security Notes

### CRON_SECRET (Optional)

For added security, set a `CRON_SECRET` environment variable in Vercel:

1. Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add `CRON_SECRET` = `your-random-secret-key`
3. Redeploy your app
4. Vercel will automatically pass this in the Authorization header

Without this, anyone with your URL could trigger the cron endpoint. With Pro plan and hourly runs, this is less critical.

---

## 📖 Additional Resources

- **`TEST-AUTOMATION.md`** - Comprehensive testing guide
- **`CREATE-TEST-DATA.sql`** - SQL scripts for test data
- **`AUTOMATION-STATUS.md`** - Full implementation documentation
- **`PRPs/Automated Barch Drawdown.md`** - Original requirements

---

## ✅ Success Checklist

- [ ] Vercel Pro plan activated (for hourly cron)
- [ ] Test data created in Supabase
- [ ] Automation settings configured
- [ ] Manual run test successful
- [ ] Transactions visible in `/transactions`
- [ ] Contract balances updated correctly
- [ ] Next run dates set appropriately
- [ ] Automation logs show success

---

## 🎉 You're Ready!

Once all checklist items are complete, your automation system is live and will:

✅ Run every hour (with Pro plan)  
✅ Process eligible contracts automatically  
✅ Create transactions in "posted" status  
✅ Update contract balances  
✅ Log everything for audit  
✅ Available for manual runs anytime  

**Need Help?** Check `TEST-AUTOMATION.md` for detailed troubleshooting steps.

