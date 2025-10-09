# Catch-up Billing Feature

## 🎯 Overview

Implemented a flexible catch-up billing system that allows backdated contracts and automatic generation of retrospective transactions.

---

## ✅ What's New

### 1. **Flexible Next Run Date**
- **Before**: Next Run Date had to be today or in the future
- **Now**: Can be set to any date (as long as it's not before contract start date)

### 2. **Automatic Catch-up Claims**
- New checkbox: "Automatically generate catch-up claims"
- When enabled, system creates retrospective transactions from Next Run Date → Today
- All catch-ups created as **Draft** status for manual review

### 3. **Safety Limits**
- Maximum 50 catch-up transactions
- Error shown if limit exceeded
- Balance warning if insufficient funds

---

## 📋 How It Works

### Creating a Contract with Catch-ups

1. **Set Contract Details**
   - Start Date: Can be in the past
   - End Date: As usual
   - Amount: Total contract value

2. **Configure Automation**
   - Enable Automated Billing
   - Set Frequency: Daily / Weekly / Fortnightly
   - Set First Run Date: When billing should start
   - Set Next Run Date: **Can be in the past!**

3. **Enable Catch-ups (Optional)**
   - Check "Automatically generate catch-up claims"
   - System will calculate how many transactions needed
   - Shows clear explanation of what will happen

4. **Save Contract**
   - Contract created
   - Catch-up transactions generated (if enabled)
   - Success toast shows count and total amount
   - Warning toast shows if balance insufficient

---

## 🎬 Example Scenarios

### Scenario 1: New Contract Starting Today
```
Start Date: 09/10/2025
Next Run Date: 09/10/2025
Catch-up: OFF
Result: Normal billing starts from today
```

### Scenario 2: Backdated Contract (30 days ago)
```
Start Date: 01/09/2025
Next Run Date: 01/09/2025
Frequency: Daily
Catch-up: ON
Result: Creates 30 draft transactions (01/09 → 30/09)
```

### Scenario 3: Contract Created After Automation Ran
```
Start Date: 09/10/2025 (today)
Next Run Date: 09/10/2025 (today)
Automation already ran at 3 AM
Catch-up: ON
Result: Creates today's transaction immediately
```

### Scenario 4: Weekly Contract (10 weeks ago)
```
Start Date: 01/08/2025
Next Run Date: 01/08/2025
Frequency: Weekly
Catch-up: ON
Result: Creates 10 draft transactions (one per week)
```

---

## ⚠️ Validation & Safety

### Validation Rules

1. **Next Run Date >= Contract Start Date**
   - Error: "Next run date cannot be before contract start date"

2. **Maximum 50 Catch-ups**
   - Error: "Too many catch-up transactions required (X). Maximum is 50. Please adjust your next run date."

3. **Balance Check**
   - Warning: "⚠️ Insufficient balance: Need $X but only $Y available. Some transactions may fail when posted."

### Transaction Status

- All catch-up transactions created as **Draft**
- Requires manual review before posting
- Prevents accidental bulk posting
- Allows verification before commitment

---

## 🔧 Technical Details

### Files Changed

1. **components/residents/FundingManager.tsx**
   - Added `generateCatchupClaims` checkbox
   - Made Next Run Date editable
   - Updated validation rules
   - Added toast notifications for results

2. **lib/services/catchup-transaction-generator.ts** (NEW)
   - `calculateBillingDates()`: Generates billing dates
   - `generateCatchupTransactions()`: Creates transactions
   - `validateCatchupGeneration()`: Pre-validates
   - `calculateCatchupCount()`: Preview count

3. **app/api/residents/[id]/funding/route.ts**
   - Added `generateCatchupClaims` to schema
   - Added `nextRunDate` validation
   - Integrated catch-up generation
   - Returns catch-up results in response

### API Response (with catch-ups)

```json
{
  "success": true,
  "data": { /* contract data */ },
  "message": "Funding information added successfully",
  "catchupTransactions": {
    "created": 30,
    "transactions": [
      { "id": "...", "date": "2025-09-01", "amount": 100 },
      { "id": "...", "date": "2025-09-02", "amount": 100 },
      // ... 28 more
    ],
    "warnings": [
      "⚠️ Insufficient balance: Need $3,000 but only $1,000 available."
    ]
  }
}
```

---

## 🎨 UI Changes

### Before
```
Next Run Date (Auto-calculated)
[09/10/2025] (read-only, grayed out)
Automatically calculated based on first run date and frequency
```

### After
```
Next Run Date
[09/10/2025] (editable)
Next billing date. Can be in the past (not before contract start date) for catch-up billing.

☑ Automatically generate catch-up claims
If enabled, the system will create retrospective transactions from the Next Run Date 
until today, based on your billing frequency.

Example: If Next Run Date is 30 days ago with daily frequency, this will create 30 
draft transactions for review.

⚠️ All catch-up transactions will be created in Draft status for your review before posting.
```

---

## 🚀 Next Steps

### Testing Checklist

- [ ] Create contract with Next Run Date = today (no catch-ups)
- [ ] Create contract with Next Run Date = 7 days ago, daily frequency (7 catch-ups)
- [ ] Create contract with Next Run Date = 4 weeks ago, weekly frequency (4 catch-ups)
- [ ] Try to create contract with 51+ catch-ups (should error)
- [ ] Create contract with insufficient balance (should warn)
- [ ] Verify all catch-up transactions are in Draft status
- [ ] Verify catch-up transactions have correct dates and amounts

### Future Enhancements (Optional)

1. **Batch Posting**: Allow posting all catch-up transactions at once
2. **Preview**: Show preview of catch-up transactions before creating contract
3. **Partial Generation**: If > 50 needed, allow generating first 50 with warning
4. **Email Notification**: Send email summary of catch-up transactions created

---

## 📝 Notes

- Catch-up generation is **optional** (checkbox must be checked)
- All catch-ups are **Draft** status (safe by default)
- Balance warnings are **informative** (doesn't block creation)
- Limit of 50 is **enforced** (prevents accidents)
- Works with all frequencies: Daily, Weekly, Fortnightly

---

## ✨ Benefits

1. **Flexible**: Can backdate contracts as needed
2. **Safe**: Draft status prevents accidental posting
3. **Clear**: UI explains exactly what will happen
4. **Controlled**: 50 transaction limit prevents accidents
5. **Transparent**: Shows warnings for balance issues
6. **Efficient**: Generates all catch-ups in one operation

---

**Deployed**: ✅ Pushed to master, deploying to Vercel now!

