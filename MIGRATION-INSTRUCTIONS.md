# Multi-Tenancy Migration Instructions
## How to Safely Execute the Database Migrations

---

## ⚠️ **BEFORE YOU START**

### **Prerequisites:**
1. ✅ Backup your database (Supabase has automatic backups, but verify)
2. ✅ Test on a development/staging database first
3. ✅ Understand that this is a BREAKING change
4. ✅ Application code updates MUST follow immediately

### **Migration Order:**
```
039 → 040 → 041
```

**DO NOT** run these in production until:
- [ ] Tested on staging
- [ ] Application code is updated (Phase 3)
- [ ] You're ready to deploy app code immediately after

---

## 📋 **STEP-BY-STEP EXECUTION**

### **Option A: Via Supabase Dashboard (Recommended for First Time)**

1. **Login to Supabase Dashboard**
   - Go to https://supabase.com
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New query"

3. **Run Migration 039 (Organizations Table)**
   - Copy contents of `supabase/migrations/039_create_organizations_table.sql`
   - Paste into SQL Editor
   - Click "Run"
   - ✅ Verify: Check that `organizations` table exists
   - ✅ Verify: Check that `users.organization_id` column exists

4. **Run Migration 040 (Add organization_id to All Tables)**
   - Copy contents of `supabase/migrations/040_add_organization_id_to_all_tables.sql`
   - Paste into SQL Editor
   - Click "Run"
   - ⏱️ This may take 10-30 seconds (lots of tables being altered)
   - ✅ Verify: Run this query:
   ```sql
   SELECT 
     table_name, 
     column_name 
   FROM information_schema.columns 
   WHERE column_name = 'organization_id'
   ORDER BY table_name;
   ```
   - ✅ Verify: You should see ~17 tables listed

5. **Run Migration 041 (RLS Policies)**
   - Copy contents of `supabase/migrations/041_update_rls_policies_for_multi_tenancy.sql`
   - Paste into SQL Editor
   - Click "Run"
   - ⏱️ This may take 20-40 seconds (lots of policies being created)
   - ✅ Verify: Run this query:
   ```sql
   SELECT schemaname, tablename, policyname 
   FROM pg_policies 
   WHERE schemaname = 'public'
   ORDER BY tablename, policyname;
   ```
   - ✅ Verify: You should see lots of "Users can view X in own org" policies

---

### **Option B: Via Supabase CLI (For Repeated Deployments)**

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

---

## ✅ **VERIFICATION CHECKLIST**

After running all migrations, verify:

### **1. Tables Exist:**
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'organizations'
);
-- Should return: true
```

### **2. Default Organization Exists:**
```sql
SELECT * FROM organizations 
WHERE id = '00000000-0000-0000-0000-000000000000';
-- Should return: 1 row
```

### **3. Users Linked to Org:**
```sql
SELECT count(*) FROM users WHERE organization_id IS NULL;
-- Should return: 0
```

### **4. organization_id on All Tables:**
```sql
SELECT count(*) 
FROM information_schema.columns 
WHERE column_name = 'organization_id';
-- Should return: ~20 (depending on your exact table count)
```

### **5. RLS Policies Applied:**
```sql
SELECT count(*) 
FROM pg_policies 
WHERE schemaname = 'public' 
AND policyname LIKE '%own org%';
-- Should return: 60+ (4 policies per table × ~17 tables)
```

### **6. Helper Function Exists:**
```sql
SELECT EXISTS (
  SELECT FROM pg_proc 
  WHERE proname = 'current_user_organization_id'
);
-- Should return: true
```

---

## 🧪 **TESTING AFTER MIGRATION**

### **Test 1: Existing Data Still Accessible**
```sql
-- Login as an existing user
-- Then run:
SELECT count(*) FROM houses;
SELECT count(*) FROM residents;
SELECT count(*) FROM transactions;

-- All should return your existing data counts
-- (Because existing users are in default org, and all data is in default org)
```

### **Test 2: RLS is Working**
```sql
-- As an authenticated user, try to access another org's data
-- This should return 0 rows:
SELECT * FROM houses 
WHERE organization_id != auth.current_user_organization_id();

-- If it returns rows, RLS is NOT working!
```

---

## 🚨 **ROLLBACK PLAN (If Something Goes Wrong)**

### **If Migrations Fail Mid-Way:**
```sql
-- Supabase has automatic transaction rollback
-- If a migration fails, changes are NOT applied
-- Check the error message and fix the SQL
```

### **If You Need to Completely Rollback:**
```sql
-- ⚠️ DANGER ZONE - This removes all multi-tenancy changes

-- 1. Remove RLS policies
DROP POLICY IF EXISTS "Users can view houses in own org" ON houses;
-- ... repeat for all policies created in 041

-- 2. Drop helper function
DROP FUNCTION IF EXISTS auth.current_user_organization_id();

-- 3. Remove organization_id columns
ALTER TABLE houses DROP COLUMN IF EXISTS organization_id;
ALTER TABLE residents DROP COLUMN IF EXISTS organization_id;
-- ... repeat for all tables

-- 4. Restore old RLS policies
CREATE POLICY "Allow all operations on houses" ON houses FOR ALL USING (true);
-- ... repeat for all tables

-- 5. Drop organizations table
DROP TABLE IF EXISTS organizations CASCADE;
```

**⚠️ Only do this if absolutely necessary and you haven't gone live yet!**

---

## 📊 **EXPECTED IMPACT**

### **Before Migration:**
- Application works normally
- All users can see all data (single tenant)

### **After Migration (Before App Code Update):**
- ❌ Application will BREAK
- ❌ Queries will fail (missing organization_id filters)
- ❌ RLS will block access

### **After Migration + App Code Update:**
- ✅ Application works normally
- ✅ Data is organization-isolated
- ✅ Ready for multi-tenant signups

---

## ⏱️ **TIMELINE**

**Total Migration Time:**
- Migration 039: ~5 seconds
- Migration 040: ~30 seconds (adding columns + indexes)
- Migration 041: ~40 seconds (creating RLS policies)
- **Total: ~75 seconds downtime**

**Recommended Deployment Window:**
- Friday evening or weekend
- Low traffic period
- Have time to fix issues if needed

---

## 🎯 **NEXT STEPS AFTER MIGRATION**

1. ✅ Migrations complete (you are here)
2. ⏭️ Update application code (Phase 3)
3. ⏭️ Deploy updated application
4. ⏭️ Test with existing users
5. ⏭️ Build signup flow (Phase 4)
6. ⏭️ Create test organizations
7. ⏭️ Security testing (Phase 5)
8. ⏭️ Launch! 🚀

---

## ❓ **QUESTIONS?**

Before running these migrations, ask me if you have ANY questions about:
- What a migration does
- Why it's needed
- What could go wrong
- How to verify it worked

**Don't run these until you're confident!** 🛡️

