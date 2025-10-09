# Contract Expiry Automation - Specification

**Priority**: 🔴 HIGH  
**Status**: 📋 PLANNED  
**Estimated Effort**: 4-6 hours  
**Discovered**: October 9, 2025 during testing

---

## 🎯 Purpose

Automatically deactivate and disable automation for contracts that have passed their end date, preventing billing on expired contracts and maintaining data accuracy.

---

## 💡 Why This Matters

### **Problem Discovered**:
During testing, Bill Maher's contract had:
- `end_date = 2025-10-04` (expired 5 days ago)
- `contract_status = 'Active'` (still marked as active)
- `auto_billing_enabled = true` (automation still enabled)

The billing automation correctly **rejected** the contract (prevented billing on expired contract), but the contract status was never updated.

### **Impact**:
- ❌ Manual work required to deactivate expired contracts
- ❌ Confusion about which contracts are truly active
- ❌ Expired contracts appear in active lists
- ❌ Risk of manual billing on expired contracts
- ❌ Inaccurate reporting and dashboards

---

## 🏆 Goal

**Automatically manage contract lifecycle** by:
1. Detecting contracts that have passed their `end_date`
2. Updating their status to 'Expired'
3. Disabling automation to prevent future billing attempts
4. Notifying admins of the changes
5. Logging all actions for audit trail

---

## 📄 Functionality & Rules

### **Nightly Job Behavior**

**Schedule**: Runs daily at 3:00 AM (separate from billing automation at 1:00 AM)

**Process**:
1. Scan all contracts where `end_date < today`
2. Filter to only 'Active' contracts (skip already expired)
3. For each expired contract:
   - Update `contract_status` from 'Active' to 'Expired'
   - Set `auto_billing_enabled` to `false`
   - Set `updated_at` to current timestamp
   - Set `updated_by` to 'contract-expiry-automation'
4. Create log entry with summary
5. Send email notification to admins

**Safety Rules**:
- Only process contracts with `end_date IS NOT NULL`
- Only process contracts with `contract_status = 'Active'`
- Skip contracts already marked as 'Expired', 'Cancelled', or 'Renewed'
- Continue on error (one contract failure doesn't stop others)
- Comprehensive logging for audit trail

---

## ✅ Success Criteria

| Metric | Description |
|--------|-------------|
| **Automatic Detection** | All expired contracts detected daily |
| **Status Update** | contract_status changed to 'Expired' |
| **Automation Disabled** | auto_billing_enabled set to false |
| **No False Positives** | Only truly expired contracts affected |
| **Admin Notification** | Email sent with list of expired contracts |
| **Audit Trail** | All changes logged with timestamps |
| **Error Handling** | Failures logged, job continues |
| **Idempotent** | Safe to run multiple times (no duplicate processing) |

---

## 🔧 Technical Implementation

### **Database Query**
```sql
-- Find expired contracts that are still marked Active
SELECT 
  fc.id,
  fc.resident_id,
  r.first_name || ' ' || r.last_name as resident_name,
  fc.type,
  fc.end_date,
  fc.contract_status,
  fc.auto_billing_enabled
FROM funding_contracts fc
JOIN residents r ON r.id = fc.resident_id
WHERE fc.end_date IS NOT NULL
  AND fc.end_date < CURRENT_DATE
  AND fc.contract_status = 'Active';
```

### **Update Statement**
```sql
UPDATE funding_contracts
SET 
  contract_status = 'Expired',
  auto_billing_enabled = false,
  updated_at = NOW(),
  updated_by = 'contract-expiry-automation'
WHERE id = :contract_id
  AND contract_status = 'Active'
  AND end_date < CURRENT_DATE;
```

### **Audit Log Entry**
```sql
INSERT INTO audit_logs (
  resident_id,
  action,
  field,
  old_value,
  new_value,
  timestamp,
  user_id,
  user_email,
  details
) VALUES (
  :resident_id,
  'CONTRACT_EXPIRED',
  'contract_status',
  'Active',
  'Expired',
  NOW(),
  'system',
  'contract-expiry-automation@system.com',
  jsonb_build_object(
    'contract_id', :contract_id,
    'end_date', :end_date,
    'automation_disabled', true
  )
);
```

---

## 📊 Implementation Files

### **1. API Endpoint**
**File**: `app/api/automation/contract-expiry/route.ts`

**Responsibilities**:
- Check for expired contracts
- Update contract statuses
- Disable automation
- Create audit logs
- Send email notifications
- Return summary

### **2. Service Layer**
**File**: `lib/services/contract-expiry.ts`

**Functions**:
- `getExpiredContracts()` - Find contracts past end_date
- `deactivateContract(contractId)` - Update status and disable automation
- `createExpiryLog(contractId, details)` - Create audit entry
- `generateExpirySummary(results)` - Create human-readable summary

### **3. Vercel Cron Configuration**
**File**: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/automation/cron",
      "schedule": "0 1 * * *"
    },
    {
      "path": "/api/automation/contract-expiry",
      "schedule": "0 3 * * *"
    }
  ]
}
```

### **4. Email Template**
**File**: `lib/services/email-notifications.ts`

Add new function:
- `sendContractExpiryNotification(adminEmails, expiredContracts)`

---

## 📧 Email Notification Format

### **Subject**:
```
⚠️ Contract Expiry Report - {count} Contracts Deactivated
```

### **Content**:
```
Contract Expiry Automation - {date}

📊 SUMMARY
• Contracts Checked: {total}
• Contracts Expired: {expired_count}
• Automation Disabled: {disabled_count}

📋 EXPIRED CONTRACTS
1. John Smith - NDIS Contract
   - Ended: 2025-10-04
   - Status: Active → Expired
   - Automation: Disabled

2. Jane Doe - Government Funding
   - Ended: 2025-10-05
   - Status: Active → Expired
   - Automation: Disabled

⚠️ ACTION REQUIRED
Please review these contracts and:
- Renew if appropriate
- Update end dates if extended
- Confirm expiry is correct
```

---

## 🧪 Testing Plan

### **Test Scenario 1: Single Expired Contract**
1. Create contract with `end_date = yesterday`
2. Run expiry automation
3. Verify status changed to 'Expired'
4. Verify automation disabled
5. Verify email sent

### **Test Scenario 2: Multiple Expired Contracts**
1. Create 3 contracts with past end dates
2. Run expiry automation
3. Verify all 3 updated
4. Verify email lists all 3

### **Test Scenario 3: No Expired Contracts**
1. Ensure all contracts have future end dates
2. Run expiry automation
3. Verify no changes made
4. Verify email says "No expired contracts"

### **Test Scenario 4: Already Expired Contract**
1. Contract already has status 'Expired'
2. Run expiry automation
3. Verify not processed again (idempotent)

---

## 🔐 Security & Safety

### **Safety Measures**:
- ✅ Only updates 'Active' contracts (prevents re-processing)
- ✅ Requires `end_date IS NOT NULL` (doesn't affect ongoing contracts)
- ✅ Checks `end_date < CURRENT_DATE` (only truly expired)
- ✅ Creates audit trail for all changes
- ✅ Continues on error (one failure doesn't stop others)
- ✅ Email notification for transparency

### **Rollback Plan**:
If automation incorrectly expires contracts:
```sql
-- Rollback a specific contract
UPDATE funding_contracts
SET 
  contract_status = 'Active',
  auto_billing_enabled = true,
  updated_at = NOW(),
  updated_by = 'admin-rollback'
WHERE id = :contract_id;
```

---

## 📈 Success Metrics

After implementation, track:
- Number of contracts auto-expired per day
- Time saved vs manual expiry process
- Reduction in "expired but active" contracts
- Admin satisfaction with automation
- Accuracy of expiry detection (false positives/negatives)

---

## 🎯 Acceptance Criteria

- [ ] Cron job runs daily at 3:00 AM
- [ ] Finds all contracts with `end_date < today` and status 'Active'
- [ ] Updates contract_status to 'Expired'
- [ ] Disables auto_billing_enabled
- [ ] Creates audit log entries
- [ ] Sends email to admins with summary
- [ ] Handles errors gracefully
- [ ] Logs all actions
- [ ] Idempotent (safe to run multiple times)
- [ ] Does not affect ongoing contracts (NULL end_date)

---

## 🔗 Related Documents

- **Main Automation**: `PRPs/Automated Barch Drawdown.md`
- **Implementation Status**: `AUTOMATION-STATUS.md`
- **Testing Guide**: `TEST-AUTOMATION.md`

---

**Created**: October 9, 2025  
**Reason**: Discovered during testing - Bill Maher's expired contract was still Active  
**Priority**: HIGH - Prevents billing errors on expired contracts

