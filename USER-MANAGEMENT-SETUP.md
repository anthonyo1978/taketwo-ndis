# 🏡 Haven User Management System - Setup Guide

## ✅ What's Been Built

A complete user management system that allows you to invite users through the UI, automatically creates their Supabase Auth accounts, and sends beautiful welcome emails with password setup links.

---

## 📋 Setup Steps

### **Step 1: Run Database Migration** 🔧

Run this migration in your Supabase SQL Editor:

```
supabase/migrations/026_create_users_table.sql
```

This creates:
- `users` table (user profiles)
- `user_invites` table (invitation tokens)
- Helper functions for token generation
- RLS policies

**Verification:**
```sql
SELECT * FROM users;
SELECT * FROM user_invites;
```

---

### **Step 2: Access User Management** 🎯

1. Go to **Settings** page (`/settings`)
2. Click **"User Management"** tile
3. You'll see the User Management page

---

## 🎬 How It Works

### **Creating a New User**

1. **Click "+ Add User"**
2. **Fill in the form:**
   - First Name *
   - Last Name *
   - Email * (must be unique)
   - Phone (optional)
   - Job Title (optional)
   - Role: Staff / Manager / Admin
   - ☑ Send welcome email (default: ON)

3. **Click "Create User"**

**What happens:**
- ✅ User record created in `users` table (status: 'invited')
- ✅ Secure invite token generated (expires in 7 days)
- ✅ Beautiful welcome email sent with Haven image
- ✅ Toast notification: "User created and welcome email sent to..."

---

### **User Receives Welcome Email** 📧

**Email includes:**
- Haven warm image at top with brand overlay
- Personalized greeting: "Welcome to Haven, [FirstName]!"
- Role badge showing their assigned role
- Big "Set Password & Login" button
- List of what they can do in Haven
- Professional footer

**User clicks "Set Password & Login"** →  
Lands on `/auth/setup-password?token=xxx`

---

### **User Sets Password** 🔐

**Password Setup Page:**
- Same beautiful split-screen as login
- Haven image on left (60%)
- Form on right (40%)

**User enters:**
- Password (min 8 chars, 1 uppercase, 1 lowercase, 1 number)
- Confirm Password (must match)

**Password Requirements shown:**
- ✓ At least 8 characters
- ✓ One uppercase letter
- ✓ One lowercase letter
- ✓ One number

**Click "Set Password & Continue"**

**What happens:**
- ✅ Supabase Auth account created with their email + password
- ✅ User record updated: status → 'active', auth_user_id linked
- ✅ Invite token marked as used
- ✅ User automatically logged in
- ✅ Success screen → redirects to dashboard after 2 seconds

---

### **User Can Now Login** ✨

User goes to `/login` and enters:
- Email (from welcome email)
- Password (they just set)

**Login now uses real Supabase Auth:**
- Validates against `auth.users` table
- Checks user status (blocks if inactive)
- Updates `last_login_at` timestamp
- Redirects to dashboard

---

## 🎨 User Management Features

### **User Table Shows:**
- Name + Email + Phone
- Role badge (color-coded)
- Job Title
- Status badge (invited/active/inactive)
- Invited date
- Actions (context-sensitive)

### **Actions Available:**

**For "Invited" users:**
- **Resend Invite** → Sends new welcome email with fresh token

**For "Active" users:**
- **Deactivate** → Sets status to 'inactive', blocks login

### **Status Badge Colors:**
- 🟡 **Invited**: Yellow (waiting for password setup)
- 🟢 **Active**: Green (can login)
- ⚫ **Inactive**: Gray (deactivated, can't login)

---

## 🔐 Security Features

### **Invitation Tokens**
- 32-byte random hex (cryptographically secure)
- 7-day expiration
- One-time use (can't reuse after password setup)
- Unique per invitation

### **Password Requirements**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

### **User Status Control**
- Inactive users can't login (checked at auth time)
- Deactivation preserves audit trail
- No hard deletes (safety)

### **Email Validation**
- Must be valid email format
- Must be unique (prevents duplicates)
- Error if email already exists

---

## 📊 Database Schema

### **users Table**
```sql
id                UUID (primary key)
auth_user_id      UUID (→ auth.users, null until password set)
first_name        TEXT
last_name         TEXT
email             TEXT (unique)
phone             TEXT (optional)
job_title         TEXT (optional)
role              TEXT ('admin', 'staff', 'manager')
status            TEXT ('invited', 'active', 'inactive')
invited_at        TIMESTAMPTZ
activated_at      TIMESTAMPTZ (when password set)
last_login_at     TIMESTAMPTZ (updated on each login)
created_at        TIMESTAMPTZ
created_by        UUID
updated_at        TIMESTAMPTZ
updated_by        UUID
```

### **user_invites Table**
```sql
id          UUID (primary key)
user_id     UUID (→ users)
token       TEXT (unique, secure random)
expires_at  TIMESTAMPTZ (7 days from creation)
used_at     TIMESTAMPTZ (marked when password set)
created_at  TIMESTAMPTZ
```

---

## 🧪 Testing Checklist

### **Test 1: Create User & Send Email**
- [ ] Go to Settings > User Management
- [ ] Click "+ Add User"
- [ ] Fill form, ensure "Send welcome email" is checked
- [ ] Click "Create User"
- [ ] Check email inbox for welcome email
- [ ] Verify Haven image appears in email
- [ ] Verify "Set Password & Login" button works

### **Test 2: Password Setup**
- [ ] Click setup link in welcome email
- [ ] Page shows "Set Your Password" with Haven image
- [ ] Enter password (test requirements validation)
- [ ] Confirm password (test mismatch error)
- [ ] Click "Set Password & Continue"
- [ ] See success screen
- [ ] Auto-redirected to dashboard

### **Test 3: Login with New Account**
- [ ] Go to `/login`
- [ ] Enter email + password
- [ ] See Haven house loading animation
- [ ] Redirected to dashboard
- [ ] Check User Management - user status = "active"

### **Test 4: Resend Invite**
- [ ] Create user without setting password
- [ ] In User Management, click "Resend Invite"
- [ ] User receives new email with new token
- [ ] Old token is invalid, new token works

### **Test 5: Deactivate User**
- [ ] Click "Deactivate" on active user
- [ ] Confirm the action
- [ ] User status changes to "inactive"
- [ ] Try to login → blocked with error message

### **Test 6: Duplicate Email**
- [ ] Try to create user with existing email
- [ ] Should show error: "A user with email X already exists"

---

## 🚀 Deployment Status

✅ **Database Migration**: Ready to run (026_create_users_table.sql)  
✅ **Code Deployed**: Pushed to master (db366fa)  
⏳ **Vercel Deployment**: In progress (~2 minutes)  

---

## 📝 Next Steps

1. **Run the migration** in Supabase SQL Editor
2. **Create your first user** through the UI
3. **Test the complete flow** (invite → email → password → login)
4. **Verify emails are being sent** (check Resend dashboard)

---

## ⚠️ Important Notes

### **For Production:**
1. **Set RESEND_FROM_EMAIL** environment variable:
   ```
   RESEND_FROM_EMAIL=haven@yourdomain.com
   ```

2. **Verify Resend domain** in Resend dashboard

3. **Set NEXT_PUBLIC_SITE_URL** for correct email links:
   ```
   NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
   ```

4. **First user creation**:
   - You'll need to manually create the FIRST admin user in Supabase Dashboard
   - Or use Supabase SQL to insert a user record directly
   - After that, admins can create other users through the UI

---

## 🎯 Features Summary

✅ **Invite users** through UI  
✅ **Automatic Supabase Auth** account creation  
✅ **Beautiful welcome emails** with Haven branding  
✅ **Secure magic links** for password setup  
✅ **Real authentication** (no more mock credentials!)  
✅ **User status management** (invite, activate, deactivate)  
✅ **Resend invitations** if needed  
✅ **Audit trail** (tracks created_by, updated_by, timestamps)  
✅ **Role-based setup** (future-proofed for permissions)  

---

**Your complete user management system is ready! 🎉**

