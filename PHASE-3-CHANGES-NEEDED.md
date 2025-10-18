# Phase 3: Application Code Changes for Multi-Tenancy

## ✅ COMPLETED:
- [x] Created `lib/utils/organization.ts` - Helper functions
- [x] Created `types/organization.ts` - TypeScript types
- [x] Updated `lib/supabase/services/houses.ts` - Added organization_id to CREATE

## 🚧 IN PROGRESS:

### **All Service Files Need Update** (Add organization_id to INSERT/CREATE):

**Pattern to apply:**
```typescript
// Before
async create(data: CreateInput): Promise<Entity> {
  const supabase = await this.getSupabase()
  const { data, error } = await supabase
    .from('table_name')
    .insert([data])
    
// After  
async create(data: CreateInput): Promise<Entity> {
  const organizationId = await getCurrentUserOrganizationId()
  if (!organizationId) throw new Error('User organization not found')
  
  const supabase = await this.getSupabase()
  const { data, error } = await supabase
    .from('table_name')
    .insert([{ ...data, organization_id: organizationId }])
```

**Files to Update:**
1. ✅ `lib/supabase/services/houses.ts` - DONE
2. ⏳ `lib/supabase/services/residents.ts` - Need to add organization_id to create()
3. ⏳ `lib/supabase/services/transactions.ts` - Need to add organization_id to create()
4. ⏳ `lib/supabase/services/organization.ts` - Already org-aware (existing file)

**NOTE:** SELECT, UPDATE, DELETE operations DON'T need changes - RLS handles filtering automatically!

---

### **API Routes That Directly Insert (Bypass Services)**:

**Files that insert without using services:**
1. ⏳ `app/api/users/route.ts` - User creation (add organization_id)
2. ⏳ `app/api/claims/route.ts` - Claim creation
3. ⏳ `app/api/residents/[id]/contacts/route.ts` - Contact creation
4. ⏳ `app/api/contacts/route.ts` - Contact creation
5. ⏳ `app/api/automation/cron/route.ts` - Transaction generation (automation)
6. ⏳ `app/api/transactions/route.ts` - If it bypasses service
7. ⏳ `lib/services/audit-logger.ts` - System log creation
8. ⏳ `lib/services/transaction-generator.ts` - Automation transaction creation

**Pattern:**
```typescript
// Add at the top of file
import { getCurrentUserOrganizationId } from 'lib/utils/organization'

// Before INSERT
const organizationId = await getCurrentUserOrganizationId()
if (!organizationId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// In INSERT
await supabase.from('table').insert({
  ...data,
  organization_id: organizationId
})
```

---

### **Special Cases:**

#### **1. User Signup/Invitation (app/api/users/route.ts)**
When creating a new user via invitation, use the INVITER's organization:
```typescript
const inviterOrgId = await getCurrentUserOrganizationId()
await supabase.from('users').insert({
  ...userData,
  organization_id: inviterOrgId // New user joins inviter's org
})
```

#### **2. Automation/Cron Jobs (app/api/automation/cron/route.ts)**
Cron jobs process multiple organizations. Need to:
```typescript
// Get all organizations with automation enabled
const { data: orgs } = await supabase
  .from('automation_settings')
  .select('organization_id')
  .eq('enabled', true)

// Process each org separately
for (const org of orgs) {
  // Set context for this org
  const contracts = await supabase
    .from('funding_contracts')
    .select('*')
    .eq('organization_id', org.organization_id)
    .eq('automation_enabled', true)
  
  // Generate transactions WITH organization_id
  await supabase.from('transactions').insert({
    ...txnData,
    organization_id: org.organization_id
  })
}
```

#### **3. System Logs (lib/services/audit-logger.ts)**
System logs should include organization context:
```typescript
export async function logAction(params: LogActionParams) {
  const organizationId = await getCurrentUserOrganizationId()
  
  await supabase.from('system_logs').insert({
    ...logData,
    organization_id: organizationId || DEFAULT_ORGANIZATION_ID
  })
}
```

#### **4. Organization Settings/Automation Settings**
Already have organization_id, just need to ensure queries filter properly:
```typescript
// app/api/automation/settings/route.ts
const organizationId = await getCurrentUserOrganizationId()

const { data } = await supabase
  .from('automation_settings')
  .select('*')
  .eq('organization_id', organizationId) // Explicit filter (defense in depth)
  .single()
```

---

### **Frontend Changes (Minimal)**

Frontend doesn't need major changes because:
1. **API routes handle organization context** automatically
2. **RLS filters data** at database level
3. **User never sees other org's data**

Only change needed:
- Show organization name in UI (optional, nice-to-have)
- Add organization limits warnings (e.g., "You've used 4/5 houses")

---

## 📋 **CHECKLIST FOR EACH FILE:**

When updating a file, verify:
- [ ] Import `getCurrentUserOrganizationId` from `lib/utils/organization`
- [ ] Call it before INSERT operations
- [ ] Add `organization_id` to insert data
- [ ] Handle null case (user not logged in)
- [ ] Test that RLS blocks unauthorized access

---

## 🧪 **TESTING STRATEGY:**

After all changes:
1. Create 2 test organizations
2. Create houses/residents in each
3. Log in as Org A user
4. Try to access Org B house → Should 404 (RLS blocks it)
5. Try to modify organization_id in browser DevTools → Should fail (RLS blocks it)

---

## ⏱️ **ESTIMATED TIME:**

- Service files: ~30 minutes (3-4 files × 10 min each)
- API route files: ~2-3 hours (15-20 files × 10 min each)
- Testing: ~1 hour
- **Total: ~4 hours**

---

## 🎯 **NEXT STEPS:**

1. Complete service layer updates
2. Update all API routes
3. Update automation/cron jobs
4. Test locally
5. Deploy to staging
6. Security testing
7. Deploy to production


