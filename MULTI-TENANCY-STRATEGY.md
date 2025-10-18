# Multi-Tenancy Migration Strategy
## From Single-Tenant to SaaS Platform

---

## 📊 **CURRENT STATE ANALYSIS**

### ✅ **What's Already Multi-Tenant Ready:**
1. **`automation_settings`** - Has `organization_id` column
2. **`organization_settings`** - Built for multi-tenancy
3. **`users`** table - Exists (needs `organization_id`)
4. **Auth infrastructure** - Supabase Auth in place
5. **RLS enabled** - All tables have RLS turned on (but policies are `USING (true)` - allow all!)

### ❌ **What's Currently Single-Tenant:**
1. **Core tables** missing `organization_id`:
   - `houses`
   - `residents`
   - `funding_contracts`
   - `transactions`
   - `transaction_audit_trail`
   - `resident_audit_trail`
   - `contacts`
   - `resident_contacts`
   - `claims`
   - `claim_reconciliations`
   - `automation_logs`
   - `system_logs`
   - `rendered_documents`

2. **RLS Policies** - All currently set to `USING (true)` (no filtering!)

3. **Application code** - Uses hardcoded organization ID: `'00000000-0000-0000-0000-000000000000'`

4. **User context** - No organization attached to users yet

---

## 🎯 **END-STATE VISION**

### **Marketing Website → Signup → Org Creation → App Access**

```
User Journey:
1. Visit marketing site (haven.com)
2. Click "Start Free Trial" / "Sign Up"
3. Enter: Email, Password, Company Name
4. Payment (Stripe) → Creates subscription
5. System creates:
   - Organization record
   - Admin user account
   - Default settings
6. User redirected to app (/dashboard)
7. User can invite team members
```

### **Security Model:**
- ✅ Users can ONLY see data for their organization
- ✅ RLS enforces at database level (defense in depth)
- ✅ Application code filters by organization
- ✅ No cross-tenant data leakage possible

---

## 📋 **MIGRATION STRATEGY - PHASED APPROACH**

### **PHASE 1: Database Schema Migration** ⚠️ **BREAKING CHANGES**
*Estimated Time: 1-2 weeks*
*Risk: HIGH - Requires data migration*

#### **Step 1.1: Add organization_id to all tables**
```sql
-- Add organization_id column to each table
ALTER TABLE houses ADD COLUMN organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE residents ADD COLUMN organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE funding_contracts ADD COLUMN organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE transactions ADD COLUMN organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE claims ADD COLUMN organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
-- ... repeat for all tables
```

#### **Step 1.2: Add indexes for performance**
```sql
CREATE INDEX idx_houses_organization_id ON houses(organization_id);
CREATE INDEX idx_residents_organization_id ON residents(organization_id);
CREATE INDEX idx_transactions_organization_id ON transactions(organization_id);
-- ... repeat for all tables
```

#### **Step 1.3: Add organization_id to users table**
```sql
ALTER TABLE users ADD COLUMN organization_id UUID;
UPDATE users SET organization_id = '00000000-0000-0000-0000-000000000000';
ALTER TABLE users ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX idx_users_organization_id ON users(organization_id);
```

---

### **PHASE 2: Update RLS Policies** ⚠️ **CRITICAL FOR SECURITY**
*Estimated Time: 1 week*
*Risk: HIGH - Security-critical*

#### **Step 2.1: Create helper function for user's org**
```sql
-- Function to get current user's organization_id
CREATE OR REPLACE FUNCTION auth.current_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id 
  FROM users 
  WHERE auth_user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;
```

#### **Step 2.2: Replace RLS policies**
```sql
-- Example for houses table
DROP POLICY IF EXISTS "Allow all operations on houses" ON houses;

-- Users can only SELECT their own organization's houses
CREATE POLICY "Users can view own org houses" ON houses
  FOR SELECT
  USING (organization_id = auth.current_user_organization_id());

-- Users can only INSERT into their own organization
CREATE POLICY "Users can create houses in own org" ON houses
  FOR INSERT
  WITH CHECK (organization_id = auth.current_user_organization_id());

-- Users can only UPDATE their own organization's houses
CREATE POLICY "Users can update own org houses" ON houses
  FOR UPDATE
  USING (organization_id = auth.current_user_organization_id());

-- Users can only DELETE their own organization's houses
CREATE POLICY "Users can delete own org houses" ON houses
  FOR DELETE
  USING (organization_id = auth.current_user_organization_id());
```

**⚠️ Repeat for EVERY table!**

#### **Step 2.3: Service Role Bypass for System Operations**
```sql
-- Service role (backend) can access all organizations
CREATE POLICY "Service role full access" ON houses
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

---

### **PHASE 3: Application Code Updates** 
*Estimated Time: 2-3 weeks*
*Risk: MEDIUM - Requires extensive testing*

#### **Step 3.1: Create Organization Context**
```typescript
// lib/contexts/OrganizationContext.tsx
export const OrganizationContext = createContext<{
  organizationId: string | null
  organization: Organization | null
}>({
  organizationId: null,
  organization: null
})

// Fetch from users table based on current auth user
```

#### **Step 3.2: Update all API routes**
```typescript
// Before
const { data } = await supabase
  .from('houses')
  .select('*')

// After
const organizationId = await getCurrentUserOrganizationId()
const { data } = await supabase
  .from('houses')
  .select('*')
  .eq('organization_id', organizationId) // Explicit filter (defense in depth)
```

#### **Step 3.3: Update all create operations**
```typescript
// Before
await supabase.from('houses').insert({ address1, suburb, ... })

// After
const organizationId = await getCurrentUserOrganizationId()
await supabase.from('houses').insert({ 
  organization_id: organizationId,
  address1, 
  suburb, 
  ... 
})
```

---

### **PHASE 4: Signup & Onboarding Flow**
*Estimated Time: 2 weeks*
*Risk: LOW - New feature*

#### **Step 4.1: Create organizations table**
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- for subdomain/custom domain
  subscription_status TEXT DEFAULT 'trial', -- trial, active, canceled, suspended
  subscription_plan TEXT DEFAULT 'starter', -- starter, pro, enterprise
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **Step 4.2: Create signup endpoint**
```typescript
// app/api/auth/signup/route.ts
export async function POST(request: NextRequest) {
  const { email, password, companyName } = await request.json()
  
  // 1. Create Supabase Auth user
  const { data: authUser } = await supabase.auth.signUp({ email, password })
  
  // 2. Create organization
  const { data: org } = await supabase
    .from('organizations')
    .insert({ name: companyName, slug: generateSlug(companyName) })
    .select()
    .single()
  
  // 3. Create user record
  await supabase.from('users').insert({
    auth_user_id: authUser.user.id,
    organization_id: org.id,
    email,
    role: 'admin',
    status: 'active'
  })
  
  // 4. Create default organization_settings
  await supabase.from('organization_settings').insert({
    organization_id: org.id,
    organization_name: companyName
  })
  
  // 5. Create default automation_settings
  await supabase.from('automation_settings').insert({
    organization_id: org.id,
    enabled: false
  })
  
  return NextResponse.json({ success: true })
}
```

#### **Step 4.3: Payment integration (Stripe)**
- Stripe Checkout for trial signup
- Webhook to activate/deactivate subscriptions
- Store `stripe_customer_id` and `stripe_subscription_id` on organizations table

---

### **PHASE 5: Data Isolation Testing** ⚠️ **CRITICAL**
*Estimated Time: 1 week*
*Risk: HIGH - Must verify security*

#### **Test Cases:**
1. ✅ Create 2 test organizations
2. ✅ Create houses/residents in each
3. ✅ Log in as Org A user → Can NOT see Org B data
4. ✅ Try to access Org B data via API with Org A token → 403 Forbidden
5. ✅ Try to modify organization_id in requests → RLS blocks it
6. ✅ Delete Org A → All Org A data deleted (cascade)
7. ✅ Service role can still access all data (for admin/support)

---

## 🤔 **SHOULD YOU HAVE STARTED EARLIER?**

### **✅ You Did This RIGHT:**

1. **Built features first** - You validated the product with a working system
2. **Prepared for multi-tenancy** - `automation_settings` already has `organization_id`
3. **Used Supabase** - RLS makes multi-tenancy easier
4. **Small codebase** - Easier to refactor now than if you had 100k lines

### **Why NOW is the RIGHT time:**

| **Too Early** | **Now (Perfect)** | **Too Late** |
|---------------|-------------------|--------------|
| No product validation | ✅ Product works | 1000s of customers |
| Wasted effort if pivot | ✅ Ready to scale | Massive migration |
| Over-engineering | ✅ Proven need | Customer downtime |

### **Answer: NO, you could NOT have pushed this later**

Once you have:
- Multiple customers on shared infrastructure
- Production data at scale
- SLAs and uptime commitments
- Complex integrations

→ Multi-tenancy migration becomes **10x harder and riskier**

---

## 💰 **FINANCIAL VIABILITY IMPACT**

### **Current (Single-Tenant):**
- ❌ Can only sell to 1 customer
- ❌ Each customer = new deployment
- ❌ High operational cost per customer
- ❌ Can't scale pricing tiers

### **After Multi-Tenancy:**
- ✅ 1 deployment = unlimited customers
- ✅ Self-service signup → No sales overhead
- ✅ Tiered pricing (Starter $49/mo, Pro $199/mo)
- ✅ MRR predictable and scalable

---

## 📅 **RECOMMENDED TIMELINE**

### **Total Time: 6-8 weeks**

| Phase | Duration | Can Go Live? |
|-------|----------|--------------|
| Phase 1: Schema | Week 1-2 | ❌ No |
| Phase 2: RLS | Week 3 | ❌ No |
| Phase 3: Code | Week 4-6 | ✅ Yes (existing users) |
| Phase 4: Signup | Week 7 | ✅ Yes (new signups) |
| Phase 5: Testing | Week 8 | ✅ Yes (public launch) |

---

## ⚠️ **BIGGEST RISKS & MITIGATION**

### **Risk 1: Data Leakage Across Orgs**
**Mitigation:**
- ✅ Test with 2+ orgs extensively
- ✅ Automated tests for RLS policies
- ✅ Penetration testing before launch

### **Risk 2: Breaking Existing Users**
**Mitigation:**
- ✅ Migrate existing data to default org ID
- ✅ Existing users work exactly as before
- ✅ Gradual rollout (staging → production)

### **Risk 3: Performance Degradation**
**Mitigation:**
- ✅ Add indexes on `organization_id` everywhere
- ✅ Composite indexes where needed
- ✅ Monitor query performance

---

## 🚀 **READY TO START?**

### **Next Steps:**
1. Review this document
2. Ask clarifying questions
3. I create detailed migration scripts
4. We execute phase by phase
5. Test extensively
6. Deploy to production
7. Build marketing site + signup flow
8. Launch! 🎉

---

**Question for you:** Do you want to proceed with this migration? Any concerns or questions about the approach?

