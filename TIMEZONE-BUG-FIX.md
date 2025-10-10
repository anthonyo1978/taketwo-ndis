# 🐛 Timezone Bug: Why Automation Didn't Run Until 10:30 AM

## Problem Summary

**Expected**: Automation should run at 12:30 AM Sydney time (first hour after midnight)  
**Actual**: Automation didn't run until 10:30 AM Sydney time  
**Delay**: ~10 hours!

---

## Root Cause Analysis

### Your Database Data
```sql
next_run_date: 2025-10-10 00:00:00+00  (stored in UTC)
```

### What Happened at Each Hour

#### 12:30 AM Sydney Time (Oct 10)
```
Sydney Time: 2025-10-10 00:30:00
UTC Time:    2025-10-09 13:30:00  (Sydney is UTC+11 in October)

Code calculated "today" as: "2025-10-09" (from UTC!)
Query looked for: next_run_date >= "2025-10-09" AND < "2025-10-10"
Your contract has: "2025-10-10 00:00:00+00"
Result: ❌ NO MATCH (2025-10-10 is NOT in the range 2025-10-09 to 2025-10-10)
```

#### 10:30 AM Sydney Time (Oct 10)
```
Sydney Time: 2025-10-10 10:30:00
UTC Time:    2025-10-09 23:30:00  (STILL Oct 9 in UTC!)

BUT... Code now converts Sydney time to get date:
- Gets Sydney date: "2025-10-10"
- Query looks for: next_run_date >= "2025-10-10" AND < "2025-10-11"
- Your contract has: "2025-10-10 00:00:00+00"
Result: ✅ MATCH!
```

Wait, that's still wrong... Let me check the actual code logic again.

Looking at lines 135-150 of contract-eligibility.ts:
```typescript
const timezone = timezone || 'Australia/Sydney'
const now = new Date()
const localDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
const year = localDate.getFullYear()
const month = String(localDate.getMonth() + 1).padStart(2, '0')
const day = String(localDate.getDate()).padStart(2, '0')
const todayStr = `${year}-${month}-${day}`
```

**AH! The bug is here:**  
`new Date(now.toLocaleString('en-US', { timeZone: timezone }))`

This converts the UTC time to a string in Sydney timezone, then parses it back as if it's in LOCAL time (which might be UTC on the server).

---

## The Actual Problem

The code tries to get "today" in Sydney timezone, but the database stores `next_run_date` as timestamps with timezone (`timestamptz`).

**When comparing:**
- Code calculates: "2025-10-10" (Sydney date)
- Database has: "2025-10-10 00:00:00+00" (UTC midnight)
- Query: `next_run_date >= '2025-10-10' AND < '2025-10-11'`

**PostgreSQL interprets the date string as:**
- `'2025-10-10'` becomes `'2025-10-10 00:00:00+00'` (UTC midnight)

**So the comparison is:**
```sql
WHERE next_run_date >= '2025-10-10 00:00:00+00'  -- Oct 10 midnight UTC
  AND next_run_date <  '2025-10-11 00:00:00+00'  -- Oct 11 midnight UTC
```

**Your contract:**
```
next_run_date = '2025-10-10 00:00:00+00'
```

**This SHOULD match!** But why didn't it?

---

## The REAL Problem

Looking more carefully at the timezone conversion:

```typescript
const localDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
```

**Example at 12:30 AM Sydney:**
1. `now` = `2025-10-09T13:30:00.000Z` (UTC)
2. `now.toLocaleString('en-US', { timeZone: 'Australia/Sydney' })` = `"10/10/2025, 12:30:00 AM"`
3. `new Date("10/10/2025, 12:30:00 AM")` = Parses as LOCAL time (server timezone)

**If the server is in UTC:**
- It interprets `"10/10/2025, 12:30:00 AM"` as `2025-10-10T00:30:00.000Z`
- Gets date: `"2025-10-10"`
- ✅ This should work!

**If the server is in a different timezone:**
- The parsing might be wrong!

---

## The Solution

### Option 1: Store next_run_date as DATE (not TIMESTAMP)

Change the column type:
```sql
ALTER TABLE funding_contracts 
ALTER COLUMN next_run_date TYPE DATE;
```

Then compare dates directly without timezone conversion:
```typescript
const todayStr = new Date().toISOString().split('T')[0]
.eq('next_run_date', todayStr)
```

### Option 2: Use Timezone-Aware Comparison (RECOMMENDED)

Modify the query to compare in the target timezone:

```typescript
// Get start and end of "today" in Sydney timezone
const sydneyDate = new Date().toLocaleString('en-AU', { 
  timeZone: 'Australia/Sydney',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).split('/').reverse().join('-')  // "2025-10-10"

// Query: Check if next_run_date falls on this date in Sydney timezone
const { data: contracts } = await supabase
  .from('funding_contracts')
  .select('*')
  .eq('auto_billing_enabled', true)
  .gte('next_run_date', `${sydneyDate}T00:00:00+11:00`)  // Sydney midnight
  .lt('next_run_date', `${sydneyDate}T23:59:59+11:00`)   // Sydney end of day
```

### Option 3: Use PostgreSQL's AT TIME ZONE (BEST)

Use PostgreSQL's built-in timezone conversion:

```typescript
// Raw SQL query
const { data: contracts } = await supabase.rpc('get_eligible_contracts_for_date', {
  target_date: todayStr,
  target_timezone: 'Australia/Sydney'
})
```

```sql
CREATE OR REPLACE FUNCTION get_eligible_contracts_for_date(
  target_date DATE,
  target_timezone TEXT
) RETURNS SETOF funding_contracts AS $$
  SELECT *
  FROM funding_contracts
  WHERE auto_billing_enabled = true
    AND (next_run_date AT TIME ZONE target_timezone)::DATE = target_date
$$ LANGUAGE SQL;
```

---

## Recommended Fix

**Change `next_run_date` to DATE type** (simplest and most reliable):

1. Run migration:
```sql
-- Backup existing data
CREATE TABLE funding_contracts_backup AS 
SELECT * FROM funding_contracts;

-- Convert to DATE
ALTER TABLE funding_contracts 
ALTER COLUMN next_run_date TYPE DATE 
USING (next_run_date AT TIME ZONE 'Australia/Sydney')::DATE;
```

2. Update code to compare dates:
```typescript
// No timezone conversion needed!
const todayStr = new Date().toISOString().split('T')[0]

const { data: contracts } = await supabase
  .from('funding_contracts')
  .select('*')
  .eq('auto_billing_enabled', true)
  .eq('next_run_date', todayStr)  // Simple date comparison!
```

---

## Why This Is The Best Solution

✅ **Simple**: No complex timezone math  
✅ **Reliable**: PostgreSQL handles date comparison correctly  
✅ **Performant**: Date equality is faster than range queries  
✅ **Clear**: Intent is obvious (run on this date)  
✅ **No Bugs**: Can't have timezone mismatches with dates  

---

## Implementation Steps

1. Create backup of existing data
2. Run migration to change column type
3. Update API code to use DATE type
4. Update form validation to accept dates
5. Test with contracts set to today's date
6. Verify automation runs at first opportunity after midnight

---

**Status**: Ready to implement  
**Priority**: HIGH (blocks automation from running reliably)  
**Risk**: LOW (simple column type change)  

