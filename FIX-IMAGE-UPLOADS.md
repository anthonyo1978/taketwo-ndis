# 🖼️ Fix Image Uploads - Complete Guide

## 🐛 **The Problem**

**User Report:** "When I upload images to residents and houses, these are lost, the image doesn't persist anymore. Ever since I introduced the build agent vercel agent thing, this has been there."

---

## 🔍 **Root Cause**

The application is trying to upload images to **Supabase Storage**, but the storage bucket is either:

1. ❌ **Not created** in your Supabase project
2. ❌ **Wrong permissions** (can't upload or read)
3. ❌ **Wrong bucket name** (code expects `house-images` but bucket has different name)

---

## ✅ **The Fix (3 Steps)**

### **Step 1: Create Storage Buckets in Supabase**

#### **Option A: Using SQL (Recommended)**

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new
2. Copy and paste the entire contents of `SETUP-SUPABASE-STORAGE.sql`
3. Click **"Run"**
4. You should see: `Successfully run 2 queries`

#### **Option B: Using Supabase Dashboard (Manual)**

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/storage/buckets
2. Click **"New bucket"**
3. Create first bucket:
   - **Name:** `house-images`
   - **Public bucket:** ✅ Yes
   - **File size limit:** 5 MB
   - **Allowed MIME types:** `image/jpeg, image/jpg, image/png, image/gif, image/webp`
4. Create second bucket:
   - **Name:** `resident-photos`
   - **Public bucket:** ✅ Yes
   - **File size limit:** 5 MB
   - **Allowed MIME types:** `image/jpeg, image/jpg, image/png, image/gif, image/webp`

---

### **Step 2: Set Up Storage Policies**

#### **Option A: Using SQL (Already included in Step 1)**

If you ran the SQL script, policies are already created! ✅

#### **Option B: Using Supabase Dashboard**

For each bucket (`house-images` and `resident-photos`):

1. Go to Storage → Click bucket name → **Policies** tab
2. Create 4 policies:

**Policy 1: Public Read**
```sql
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'house-images');
```

**Policy 2: Authenticated Upload**
```sql
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'house-images' AND auth.role() = 'authenticated');
```

**Policy 3: Authenticated Update**
```sql
CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'house-images' AND auth.role() = 'authenticated');
```

**Policy 4: Authenticated Delete**
```sql
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'house-images' AND auth.role() = 'authenticated');
```

Repeat for `resident-photos` bucket (change bucket_id).

---

### **Step 3: Test Image Upload**

1. Go to: https://taketwo-ndis.vercel.app/houses
2. Click any house → Click camera icon
3. Select an image
4. Upload
5. ✅ **Image should persist!**

---

## 🧪 **Verification Checklist**

### **Check 1: Verify Buckets Exist**

Run this SQL in Supabase:

```sql
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id IN ('house-images', 'resident-photos');
```

**Expected result:** 2 rows (one for each bucket)

### **Check 2: Verify Policies Exist**

Run this SQL in Supabase:

```sql
SELECT policyname, cmd, tablename 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname;
```

**Expected result:** At least 8 policies (4 for each bucket)

### **Check 3: Try Uploading an Image**

1. Open browser console (F12)
2. Try uploading an image
3. Look for errors in console

**If successful, you'll see:**
```
✅ Image uploaded successfully!
```

**If failed, you might see:**
```
❌ new row violates row-level security policy for table "objects"
❌ bucket "house-images" does not exist
❌ Upload failed: ...
```

---

## 🔧 **Troubleshooting**

### **Issue 1: "Bucket does not exist"**

**Console error:**
```
Error: The bucket 'house-images' does not exist
```

**Fix:** Create the bucket using Step 1 above.

---

### **Issue 2: "Row-level security policy violation"**

**Console error:**
```
Error: new row violates row-level security policy for table "objects"
```

**Fix:** Set up storage policies using Step 2 above.

---

### **Issue 3: "Image uploads but doesn't show"**

**Possible causes:**
1. Bucket is not public (images can't be accessed)
2. Wrong public URL format

**Fix:**
1. Make bucket public: Storage → Bucket → Settings → Public bucket = ON
2. Verify public URL works:
   ```
   https://[PROJECT_ID].supabase.co/storage/v1/object/public/house-images/[filename]
   ```

---

### **Issue 4: "Image shows but disappears after refresh"**

This was the **original issue** you reported!

**Cause:** Image was stored in browser cache/memory but not actually uploaded to Supabase.

**Fix:** Complete Steps 1 & 2 above to enable proper storage.

---

## 📊 **How Image Upload Works**

```
┌────────────────────────────────────────────────────┐
│ 1. User selects image in browser                  │
│    ↓                                               │
│ 2. Image converted to File object                 │
│    ↓                                               │
│ 3. Uploaded to Supabase Storage bucket            │
│    supabase.storage.from('house-images')          │
│    ↓                                               │
│ 4. Get public URL from Supabase                   │
│    https://...supabase.co/storage/.../image.jpg   │
│    ↓                                               │
│ 5. Save URL to database (houses.image_url)        │
│    ↓                                               │
│ 6. Display image using public URL                 │
└────────────────────────────────────────────────────┘
```

**Key Point:** Images are stored in **Supabase Storage**, NOT on Vercel servers!

---

## 🎯 **Why This Matters**

### **Before Fix:**
- ❌ Upload fails silently (no storage bucket)
- ❌ Image preview shows (browser cache) but doesn't persist
- ❌ Refresh page → image gone

### **After Fix:**
- ✅ Upload succeeds (storage bucket exists)
- ✅ Image stored permanently in Supabase
- ✅ Refresh page → image still there
- ✅ Works across all devices/browsers

---

## 📝 **Current Image Upload Locations**

| Feature | Component | Storage Bucket | Database Field |
|---------|-----------|----------------|----------------|
| **House Images** | `HouseImageUpload.tsx` | `house-images` | `houses.image_url` |
| **Resident Photos** | `ResidentForm.tsx` | `resident-photos` | `residents.photo_base64` |

**Note:** Residents use base64 encoding (stored in DB), not Supabase Storage!

---

## 🚀 **After Running the Fix**

1. ✅ **Buckets created** in Supabase
2. ✅ **Policies configured** for security
3. ✅ **Image uploads work** for houses
4. ✅ **Images persist** across refreshes/deployments

---

## 📞 **Still Having Issues?**

**Debug checklist:**

1. Check browser console for errors
2. Verify buckets exist in Supabase dashboard
3. Verify policies exist (run SQL above)
4. Try uploading a small image (< 1MB)
5. Check if URL is accessible:
   ```
   Open: https://[PROJECT_ID].supabase.co/storage/v1/object/public/house-images/test.jpg
   ```

---

## 🎓 **Technical Details**

### **Supabase Storage vs Local Storage**

| Aspect | Supabase Storage | Local Storage |
|--------|------------------|---------------|
| **Persistence** | ✅ Permanent | ❌ Lost on deployment |
| **Accessibility** | ✅ Public URLs | ❌ Server-only |
| **Scalability** | ✅ Unlimited | ❌ Limited |
| **Cost** | Free (1GB/month) | N/A |

### **Why Not Use Vercel's Filesystem?**

Vercel is **serverless** and **stateless**:
- ❌ No persistent filesystem
- ❌ Files deleted between deployments
- ❌ Different server for each request

**Solution:** Use external storage (Supabase, AWS S3, Cloudinary, etc.)

---

**Ready to fix? Run `SETUP-SUPABASE-STORAGE.sql` now!** 🚀

