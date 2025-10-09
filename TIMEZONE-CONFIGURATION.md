# ⏰ Timezone Configuration - Complete Guide

## 🎯 **The Master Timezone Setting**

There is **ONE master timezone** stored in the database:

### **Location: `automation_settings` table**

```sql
SELECT timezone FROM automation_settings 
WHERE organization_id = '00000000-0000-0000-0000-000000000000';
```

**Default:** `'Australia/Sydney'`

---

## 📊 **Current Architecture**

### **1. Database (Source of Truth)**

**File:** `supabase/migrations/015_create_automation_settings_table.sql`

```sql
CREATE TABLE automation_settings (
  ...
  timezone TEXT DEFAULT 'Australia/Sydney',  ← THE MASTER SETTING
  ...
);
```

**This is stored in the database and can be changed via the UI.**

---

### **2. UI Settings Page**

**File:** `components/admin/AutomationSettingsPage.tsx`

```typescript
// Default value (if nothing in database)
timezone: "Australia/Sydney",

// Dropdown selector
<select value={formValues?.timezone || 'Australia/Sydney'}>
  <option value="Australia/Sydney">Australia/Sydney</option>
  <option value="Australia/Melbourne">Australia/Melbourne</option>
  <option value="UTC">UTC</option>
  // ... more options
</select>
```

**Users can change this via:** https://taketwo-ndis.vercel.app/settings/automation

---

### **3. Where It's ACTUALLY USED**

#### ❌ **NOT USED (Yet):**
- The database `timezone` field is **stored** but **not currently read** by the automation code!
- This was prepared for future use but not fully implemented

#### ✅ **HARDCODED (Current Reality):**

**In 3 places, it's hardcoded:**

##### **A. Contract Eligibility** (lib/services/contract-eligibility.ts)
```typescript
const sydneyDate = new Date(
  now.toLocaleString('en-US', { timeZone: 'Australia/Sydney' })  ← HARDCODED
)
```

##### **B. Email Generation** (lib/services/email-notifications.ts)
```typescript
const date = new Date(data.executionDate).toLocaleString('en-AU', {
  dateStyle: 'full',
  timeStyle: 'short',
  timeZone: 'Australia/Sydney'  ← HARDCODED
})
```

##### **C. Cron Summary** (app/api/automation/cron/route.ts)
```typescript
const date = new Date(executionDate).toLocaleString('en-AU', {
  dateStyle: 'full',
  timeStyle: 'short',
  timeZone: 'Australia/Sydney'  ← HARDCODED
})
```

---

## 🔧 **How to Change the Timezone**

### **Option A: Change via UI (Doesn't Work Yet!)**

1. Go to: https://taketwo-ndis.vercel.app/settings/automation
2. Change "Timezone" dropdown
3. Click "Save Settings"
4. ❌ **BUT**: The cron job still uses hardcoded `Australia/Sydney`!

### **Option B: Change in Code (Current Method)**

**You need to update 3 files:**

#### **1. lib/services/contract-eligibility.ts (Line 128)**
```typescript
const sydneyDate = new Date(
  now.toLocaleString('en-US', { timeZone: 'YOUR_TIMEZONE_HERE' })
)
```

#### **2. lib/services/email-notifications.ts (Line 114)**
```typescript
timeZone: 'YOUR_TIMEZONE_HERE'
```

#### **3. app/api/automation/cron/route.ts (Line 235)**
```typescript
timeZone: 'YOUR_TIMEZONE_HERE'
```

**Then commit and deploy.**

---

## ✅ **Proper Fix: Make It Dynamic**

To make the UI `timezone` setting actually work, we need to:

### **Step 1: Pass timezone from cron to eligibility check**

**In `app/api/automation/cron/route.ts`:**
```typescript
// Fetch timezone from settings
const { data: settings } = await supabase
  .from('automation_settings')
  .select('enabled, run_time, timezone, admin_emails')  ← Add timezone
  .single()

// Pass timezone to eligibility check
const eligibleContracts = await getEligibleContracts(settings.timezone)
```

### **Step 2: Update eligibility function signature**

**In `lib/services/contract-eligibility.ts`:**
```typescript
export async function getEligibleContracts(
  timezone: string = 'Australia/Sydney'  ← Add parameter
): Promise<ContractEligibilityResult[]> {
  
  // Use the passed timezone
  const sydneyDate = new Date(
    now.toLocaleString('en-US', { timeZone: timezone })
  )
}
```

### **Step 3: Pass timezone to email generation**

**In `app/api/automation/cron/route.ts`:**
```typescript
await sendAutomationCompletionEmail(
  settings.admin_emails,
  {
    // ... other fields
    timezone: settings.timezone  ← Add this
  }
)
```

---

## 🌍 **Supported Timezones (IANA Format)**

Currently in the UI dropdown:
- `Australia/Sydney`
- `Australia/Melbourne`
- `Australia/Brisbane`
- `Australia/Perth`
- `Australia/Adelaide`
- `UTC`

**You can add more!** Full list: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones

---

## 🎯 **Summary**

| Aspect | Current State |
|--------|---------------|
| **Master Setting** | `automation_settings.timezone` in database |
| **Default Value** | `'Australia/Sydney'` |
| **UI Control** | ✅ Exists (Settings page) |
| **Actually Used?** | ❌ No - hardcoded in 3 files |
| **To Make It Work** | Need to pass timezone from DB to code |

---

## 📝 **Quick Reference**

### **Check Current Timezone**
```sql
SELECT timezone FROM automation_settings 
WHERE organization_id = '00000000-0000-0000-0000-000000000000';
```

### **Change Timezone (Database)**
```sql
UPDATE automation_settings 
SET timezone = 'Australia/Melbourne'  -- or any IANA timezone
WHERE organization_id = '00000000-0000-0000-0000-000000000000';
```

### **Change Timezone (UI)**
Go to: https://taketwo-ndis.vercel.app/settings/automation

---

## 🚀 **Want Me To Make It Fully Dynamic?**

I can implement the proper fix in ~5 minutes so that:
- ✅ You change timezone in UI
- ✅ Automation uses that timezone
- ✅ Emails show that timezone
- ✅ All date logic respects it

**Just say the word!** 🎯

---

**Current Answer:** The timezone is **supposed to be** in `automation_settings.timezone`, but it's currently **hardcoded** as `'Australia/Sydney'` in 3 files. The UI setting exists but doesn't do anything yet.

