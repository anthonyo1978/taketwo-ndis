# 📄 Contract PDF Generator - Setup & Testing Guide

## 🎉 **Implementation Complete!**

All code is deployed and ready to test. Just need to run the database migrations!

---

## 🚀 **Quick Setup (5 Minutes)**

### **Step 1: Run Database Migrations**

Go to: https://supabase.com/dashboard/project/ogluakwuphoowglqpblt/sql/new

**Run these 4 migrations in order:**

#### **Migration 1: Organization Settings**
Copy and paste: `supabase/migrations/020_create_organization_settings.sql`

**Creates:**
- `organization_settings` table
- Seeds with default TakeTwo NDIS Services data

#### **Migration 2: PDF Templates**
Copy and paste: `supabase/migrations/021_create_pdf_templates_table.sql`

**Creates:**
- `pdf_templates` table
- Seeds with NDIS Service Agreement v1 template

#### **Migration 3: Rendered Documents**
Copy and paste: `supabase/migrations/022_create_rendered_documents_table.sql`

**Creates:**
- `rendered_documents` table (audit trail)

#### **Migration 4: Storage Bucket**
Copy and paste: `supabase/migrations/023_create_exports_storage_bucket.sql`

**Creates:**
- `exports` storage bucket (private, PDF only)
- Security policies for signed URL access

---

### **Step 2: Verify Setup**

Run this SQL to confirm everything is set up:

```sql
-- Check organization settings
SELECT organization_name, abn, email FROM organization_settings;

-- Check templates
SELECT id, name, version, status FROM pdf_templates;

-- Check storage bucket
SELECT id, name, public FROM storage.buckets WHERE id = 'exports';
```

**Expected results:**
- 1 organization row (TakeTwo NDIS Services)
- 1 template row (ndis_service_agreement v1)
- 1 bucket row (exports, private)

---

### **Step 3: Test PDF Generation**

1. Go to: https://taketwo-ndis.vercel.app/residents
2. Click any resident with a funding contract
3. Click **"Funding & Contracts"** tab
4. Click **"📄 Generate PDF"** button (purple, next to Edit Contract)
5. Wait 2-3 seconds
6. **PDF downloads automatically!** 🎉

---

## 📄 **What's in the PDF**

### **Page 1: Contract Details & Parties**
- Header with contract ID and generation date
- **Service Provider:** Your organization details
- **NDIS Participant:** Resident name, DOB, NDIS ID, contact
- **Service Location:** House address
- **Agreement Details:** Type, dates, funding amount, balance

### **Page 2: Service Details & Payment Terms**
- Daily support rate and billing frequency
- Service location details
- Payment terms explanation
- Scope of services (bullet points)

### **Page 3: Financial Summary & Signatures**
- Funding overview table (allocated, balance, utilized)
- Recent activity (7d, 30d, 12m transactions)
- Signature sections for provider and participant
- Important notice about NDIS compliance

---

## 🎨 **Customizing Organization Details**

The PDF uses data from `organization_settings` table. To update:

```sql
UPDATE organization_settings
SET 
  organization_name = 'Your Organization Name',
  abn = '12 345 678 901',
  email = 'contact@yourorg.com.au',
  phone = '1300 123 456',
  address_line1 = '123 Your Street',
  suburb = 'Sydney',
  state = 'NSW',
  postcode = '2000',
  logo_url = 'https://yoursite.com/logo.png'
WHERE organization_id = '00000000-0000-0000-0000-000000000000';
```

**Or build a UI for this later!**

---

## 🔍 **Troubleshooting**

### **Issue: "Contract not found"**
- Check contract ID is valid
- Verify contract has resident and house data

### **Issue: "Organization settings not configured"**
- Run migration 020 (organization_settings)
- Verify row exists in database

### **Issue: "Validation failed"**
- Check contract has: startDate, amount, type
- Check resident has: firstName, lastName
- Check house exists and has address

### **Issue: "Failed to save PDF"**
- Run migration 023 (storage bucket)
- Verify `exports` bucket exists
- Check storage policies are set up

### **Issue: PDF downloads but is blank/corrupted**
- Check Vercel logs for render errors
- Verify @react-pdf/renderer is installed
- Check template syntax

---

## 📊 **Where Everything Lives**

| Component | Location |
|-----------|----------|
| **API Endpoint** | `app/api/contracts/[id]/pdf/route.ts` |
| **PDF Template** | `lib/contracts/templates/ndis-service-agreement-v1.tsx` |
| **Schema** | `lib/contracts/schemas/ndis-service-agreement-v1.ts` |
| **Renderer** | `lib/contracts/renderer.ts` |
| **UI Button** | `components/residents/FundingDashboard.tsx` |
| **Organization Service** | `lib/supabase/services/organization.ts` |
| **Migrations** | `supabase/migrations/020-023_*.sql` |

---

## 🧪 **Testing Checklist**

- [ ] Run all 4 migrations in Supabase
- [ ] Verify organization settings exist
- [ ] Verify exports bucket exists
- [ ] Go to resident with contract
- [ ] Click "Generate PDF" button
- [ ] PDF downloads successfully
- [ ] PDF opens and displays correctly
- [ ] Check rendered_documents table for audit record
- [ ] Verify signed URL expires after 15 minutes

---

## 📈 **Monitoring**

Check Vercel logs for PDF generation:

```
[PDF API] Starting PDF generation for contract: abc123...
[PDF API] Variables built, validating...
[PDF API] Validation passed, rendering PDF...
[PDF RENDERER] Starting render for template: ndis_service_agreement v1
[PDF RENDERER] Render completed in 1234ms, size: 45678 bytes
[PDF API] PDF uploaded to storage: contracts/abc123/...
[PDF API] Complete in 2345ms
```

**Success indicators:**
- ✅ Render time < 3000ms
- ✅ No validation errors
- ✅ Storage upload succeeds
- ✅ Audit record created

---

## 🎯 **What's Next (Future Phases)**

**Phase 2:**
- Documents panel (list all generated PDFs)
- Re-generate signed URLs for expired links
- Template picker (when multiple templates exist)

**Phase 3:**
- Template registry UI (activate/deprecate versions)
- Organization settings UI page
- Preview template with sample data

**Phase 4:**
- Playwright fallback for pixel-perfect CSS
- Multi-page contracts with appendices
- Digital signatures integration

---

## 🎨 **Customizing the Template**

To modify the PDF appearance, edit:
`lib/contracts/templates/ndis-service-agreement-v1.tsx`

**You can change:**
- Colors (currently purple header: `#4f46e5`)
- Fonts (currently Inter)
- Layout and spacing
- Content sections
- Page structure

**After editing:**
1. Commit and push
2. Vercel deploys
3. Next PDF generation uses new template
4. No database changes needed!

---

## 📞 **Need Help?**

**Check logs:**
- Vercel: https://vercel.com/anthonyo1978s-projects/taketwo-ndis/logs
- Browser console (F12)

**Common issues:**
- Missing migrations → Run all 4 SQL scripts
- Storage errors → Check bucket exists
- Validation errors → Check contract has required data

---

**Ready to test? Run those migrations and generate your first PDF!** 🚀📄

