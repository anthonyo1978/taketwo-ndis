# 🤖 Automated Batch Drawdown - End-to-End Test Plan

## 🎯 Goal

Prove that the automation system works **completely hands-off**:
1. Vercel cron triggers hourly
2. Finds eligible contracts
3. Creates transactions
4. Updates contract data
5. Sends email notification
6. Logs everything

---

## 📋 Pre-Test Checklist

- [x] Email integration working (Resend)
- [x] Cron job configured in `vercel.json`
- [x] Automation enabled in settings
- [x] Admin email configured
- [ ] Test data set up
- [ ] Verified cron schedule

---

## 🚀 Test Procedure

### **Step 1: Check Current Data**

Run `CHECK-CURRENT-DATA.sql` in Supabase to see:
- Existing residents
- Active contracts
- Recent transactions
- Automation logs
- Current settings

### **Step 2: Set Up Test Contract**

Run `SETUP-AUTOMATED-TEST.sql` in Supabase to:

**Option A: Update Bill Maher's contract**
- Sets `next_run_date` to today
- Ensures contract is active
- Ensures balance available

**Option B: Create fresh test data**
- New resident: "Auto TestUser"
- New contract: $50,000, $100/day
- Scheduled for next hour

### **Step 3: Verify Cron Schedule**

Check Vercel cron configuration:
1. Go to: https://vercel.com/anthonyo1978s-projects/taketwo-ndis/settings/cron-jobs
2. Verify: `/api/automation/cron` is scheduled `0 * * * *` (hourly)
3. Check next scheduled run time

### **Step 4: Wait for Automatic Run**

**Option A: Wait naturally**
- Cron runs at the top of every hour (e.g., 3:00, 4:00, 5:00)
- Wait for the next hour
- No action needed!

**Option B: Trigger manually (for faster testing)**
- Go to cron settings (link above)
- Click "Run Now" on `/api/automation/cron`
- Instant execution

### **Step 5: Verify Results**

#### **5.1 Check Email**
- Check inbox: `anthonyo1978@gmail.com`
- Should receive: "✅ Automation Run Completed Successfully"
- Email shows: contracts processed, transactions created, amount

#### **5.2 Check Vercel Logs**
Go to: https://vercel.com/anthonyo1978s-projects/taketwo-ndis/logs

Look for:
```
[AUTOMATION CRON] Starting automated billing run
[ELIGIBILITY] Found X contracts with next_run_date
[ELIGIBILITY] Returning X eligible contracts
[AUTOMATION CRON] Completed in Xms
[AUTOMATION CRON] Processed: X contracts
[AUTOMATION CRON] Successful: X transactions
✅ Email sent successfully via Resend
```

#### **5.3 Check Database**

Run this SQL in Supabase:

```sql
-- Check new transactions
SELECT 
  t.id,
  r.first_name || ' ' || r.last_name as resident,
  t.amount,
  t.status,
  t.drawdown_status,
  t.created_by,
  t.created_at
FROM transactions t
JOIN residents r ON r.id = t.resident_id
WHERE t.created_by = 'automation-system'
ORDER BY t.created_at DESC
LIMIT 5;

-- Check updated contracts
SELECT 
  fc.id,
  r.first_name || ' ' || r.last_name as resident,
  fc.current_balance,
  fc.next_run_date,
  fc.last_run_date,
  fc.updated_at
FROM funding_contracts fc
JOIN residents r ON r.id = fc.resident_id
WHERE fc.auto_billing_enabled = true
ORDER BY fc.updated_at DESC
LIMIT 5;

-- Check automation logs
SELECT 
  run_date,
  status,
  contracts_processed,
  contracts_failed,
  execution_time_ms,
  LEFT(summary, 200) as summary_preview
FROM automation_logs
ORDER BY run_date DESC
LIMIT 3;
```

#### **5.4 Check UI**

1. Go to: https://taketwo-ndis.vercel.app/transactions
2. Filter by: Status = "Draft"
3. Look for transactions with:
   - Created by: "automation-system"
   - Recent timestamp
   - Correct amount

---

## ✅ Success Criteria

| Check | Expected Result |
|-------|----------------|
| **Email received** | ✅ Inbox has automation report |
| **Transactions created** | ✅ New draft transactions in DB |
| **Balances updated** | ✅ `current_balance` decreased |
| **Next run scheduled** | ✅ `next_run_date` moved forward |
| **Logs created** | ✅ Entry in `automation_logs` |
| **No errors** | ✅ Clean logs, no exceptions |

---

## 🔄 Testing Different Scenarios

### **Scenario 1: Daily Contract**
```sql
UPDATE funding_contracts
SET 
  automated_drawdown_frequency = 'daily',
  automated_drawdown_amount = 100.00,
  next_run_date = CURRENT_DATE
WHERE resident_id = (SELECT id FROM residents WHERE first_name = 'Bill' LIMIT 1);
```
**Expected:** Runs today, next_run_date = tomorrow

### **Scenario 2: Weekly Contract**
```sql
UPDATE funding_contracts
SET 
  automated_drawdown_frequency = 'weekly',
  automated_drawdown_amount = 700.00,
  next_run_date = CURRENT_DATE
WHERE resident_id = (SELECT id FROM residents WHERE first_name = 'Bill' LIMIT 1);
```
**Expected:** Runs today, next_run_date = +7 days

### **Scenario 3: Fortnightly Contract**
```sql
UPDATE funding_contracts
SET 
  automated_drawdown_frequency = 'fortnightly',
  automated_drawdown_amount = 1400.00,
  next_run_date = CURRENT_DATE
WHERE resident_id = (SELECT id FROM residents WHERE first_name = 'Bill' LIMIT 1);
```
**Expected:** Runs today, next_run_date = +14 days

### **Scenario 4: Multiple Contracts**
Set up 3 different residents with contracts all scheduled for today.
**Expected:** All 3 processed in one run, email shows 3 transactions

### **Scenario 5: Insufficient Balance**
```sql
UPDATE funding_contracts
SET 
  current_balance = 50.00,  -- Less than drawdown amount
  automated_drawdown_amount = 100.00
WHERE resident_id = (SELECT id FROM residents WHERE first_name = 'Bill' LIMIT 1);
```
**Expected:** Contract skipped, error logged, email shows failure

---

## 🐛 Troubleshooting

### **No email received**
- Check Vercel logs for "Email sent successfully"
- Check spam folder
- Verify `FROM_EMAIL` and `RESEND_API_KEY` in Vercel
- Check Resend dashboard: https://resend.com/emails

### **No transactions created**
- Check `next_run_date` is TODAY (not future)
- Check `auto_billing_enabled = true`
- Check `contract_status = 'Active'`
- Check `current_balance > automated_drawdown_amount`
- Check Vercel logs for eligibility reasons

### **Cron not running**
- Verify cron job exists in Vercel settings
- Check Vercel logs for cron invocations
- Ensure app is deployed to production
- Check `CRON_SECRET` if configured

### **Transactions created but balance not updated**
- Check transaction status (should be 'draft')
- Check `drawdown_status` (should be 'pending')
- Balances update when transaction is POSTED, not created

---

## 📊 Monitoring

### **Daily Checks**
1. Check email for automation reports
2. Review `automation_logs` table
3. Verify no failed transactions

### **Weekly Checks**
1. Review all automated transactions
2. Verify balances are accurate
3. Check for any contracts that should have run but didn't

### **Monthly Checks**
1. Audit all automation logs
2. Review error patterns
3. Optimize scheduling if needed

---

## 🎯 Next Steps After Successful Test

1. **Adjust Cron Schedule** (if needed)
   - Currently: Hourly (`0 * * * *`)
   - Recommended: Daily at 2:00 AM (`0 2 * * *`)
   - Update `vercel.json` and redeploy

2. **Add More Residents**
   - Set up real contracts
   - Configure automation settings per contract

3. **Set Up Alerts**
   - Monitor for failed runs
   - Alert on critical errors

4. **Document Processes**
   - How to review automated transactions
   - How to handle errors
   - How to adjust schedules

---

## 📝 Test Log Template

```
Date: ___________
Time: ___________
Tester: ___________

Setup:
- [ ] Test data created
- [ ] Cron schedule verified
- [ ] Email configured

Execution:
- [ ] Cron triggered (auto/manual)
- [ ] Logs reviewed
- [ ] Email received

Results:
- Contracts processed: _____
- Transactions created: _____
- Errors encountered: _____
- Email delivered: Yes / No

Issues:
_________________________________
_________________________________

Notes:
_________________________________
_________________________________

Status: ✅ PASS / ❌ FAIL
```

---

**Ready to test? Run the SQL scripts and let's see the magic happen! 🚀**

