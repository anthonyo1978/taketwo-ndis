# 📧 Email Setup Guide - Resend Integration

## 🎯 Current Status

✅ **Resend SDK installed** (v6.1.2)  
✅ **Email service code updated** (using real Resend API)  
✅ **RESEND_API_KEY added** to Vercel (by you)  
❌ **FROM_EMAIL not configured** (needs to be added)

---

## 🚀 Quick Setup (5 minutes)

### **Step 1: Verify Domain in Resend**

1. Go to: https://resend.com/domains
2. Add your domain (e.g., `yourdomain.com`)
3. Add DNS records (Resend will show you what to add)
4. Wait for verification (usually 5-10 minutes)

**OR use Resend's test domain:**
- For testing, you can use: `onboarding@resend.dev`
- This only sends to verified email addresses in your Resend account

---

### **Step 2: Add FROM_EMAIL to Vercel**

1. Go to: https://vercel.com/anthonyo1978s-projects/taketwo-ndis/settings/environment-variables
2. Click **"Add New"**
3. Enter:
   - **Key**: `FROM_EMAIL`
   - **Value**: One of these options:

   **Option A - Test with Resend's domain:**
   ```
   onboarding@resend.dev
   ```
   
   **Option B - Use your own domain (after verification):**
   ```
   automation@yourdomain.com
   ```
   
   **Option C - Use a subdomain:**
   ```
   noreply@yourdomain.com
   ```

4. Select: **Production**, **Preview**, **Development**
5. Click **"Save"**

---

### **Step 3: Redeploy (Automatic)**

Vercel will automatically redeploy when you add the environment variable.

**OR manually trigger:**
- Go to: https://vercel.com/anthonyo1978s-projects/taketwo-ndis/deployments
- Click the latest deployment
- Click **"Redeploy"**

---

## 🧪 Test It

### **Option 1: Trigger Cron Manually**

1. Go to: https://vercel.com/anthonyo1978s-projects/taketwo-ndis/settings/cron-jobs
2. Find: `/api/automation/cron`
3. Click **"Run Now"**
4. Check Vercel logs for:
   ```
   ✅ Email sent successfully via Resend: { id: '...' }
   ```

### **Option 2: Use "Run Automation Now" Button**

1. Go to: https://taketwo-ndis.vercel.app/settings/automation
2. Click **"🚀 Run Automation Now"**
3. Check your inbox!

---

## 🔍 Troubleshooting

### **No email received?**

Check Vercel logs for these messages:

#### ❌ **"RESEND_API_KEY not configured"**
- Solution: Add `RESEND_API_KEY` in Vercel env vars

#### ❌ **"FROM_EMAIL not configured"**
- Solution: Add `FROM_EMAIL` in Vercel env vars (see Step 2)

#### ❌ **"Resend API error: ..."**
- Check if your domain is verified in Resend
- Check if `FROM_EMAIL` matches a verified domain
- For testing, use `onboarding@resend.dev`

#### ✅ **"Email sent successfully via Resend"**
- Email was sent! Check spam folder
- Check Resend dashboard: https://resend.com/emails

---

## 📊 Resend Dashboard

View sent emails: https://resend.com/emails

You can see:
- ✅ Delivered emails
- 📬 Pending emails
- ❌ Failed emails
- 📈 Delivery rates

---

## 🎨 Email Preview

The automation email includes:
- 🤖 Branded header with gradient
- 📊 Run summary (contracts, transactions, amount)
- 📈 Frequency breakdown (daily, weekly, fortnightly)
- ✅ Success indicators or error details
- 📝 Important notes about draft status
- 🕐 Execution time and date

---

## 🔐 Security Notes

- `RESEND_API_KEY` is secret - never commit to git
- `FROM_EMAIL` can be public - it's just the sender address
- Resend free tier: 100 emails/day, 3,000/month
- Upgrade to Pro for more: https://resend.com/pricing

---

## 📧 Testing with Real Data

Once configured, the cron job will:
1. Run hourly (currently configured)
2. Check for eligible contracts
3. Generate transactions
4. Send email to: `anthonyo1978@gmail.com` (from automation settings)

**To change recipient:**
- Go to: https://taketwo-ndis.vercel.app/settings/automation
- Update "Admin Email Addresses"
- Save settings

---

## ✅ Success Checklist

- [ ] Resend account created
- [ ] Domain verified (or using `onboarding@resend.dev`)
- [ ] `RESEND_API_KEY` added to Vercel
- [ ] `FROM_EMAIL` added to Vercel
- [ ] Vercel redeployed
- [ ] Test email sent successfully
- [ ] Email received in inbox

---

## 🆘 Need Help?

**Resend Documentation:**
- https://resend.com/docs/send-with-nextjs

**Resend Support:**
- https://resend.com/support

**Check Vercel Logs:**
- https://vercel.com/anthonyo1978s-projects/taketwo-ndis/logs

---

**Once you add `FROM_EMAIL`, your automation emails will be delivered! 🎉**

