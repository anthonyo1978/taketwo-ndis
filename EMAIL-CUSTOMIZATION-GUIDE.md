# 📧 Email Template Customization Guide

## 📍 Location

**File:** `lib/services/email-notifications.ts`  
**Function:** `generateEmailBody()` (starts at line ~103)

You have **complete control** over the HTML and styling!

---

## 🎨 Current Template Structure

```
┌─────────────────────────────────────┐
│ 🤖 Automated Billing Run Report    │  ← Header (gradient purple)
│ Thursday, 9 October 2025 at 2:00pm │
├─────────────────────────────────────┤
│                                     │
│ 📊 Run Summary                      │  ← Stats box
│ • Contracts Processed: 1            │
│ • Successful: 1                     │
│ • Total Amount: $5,000.00           │
│ • Execution Time: 2325ms            │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ 📈 Frequency Breakdown              │  ← Breakdown section
│ • daily: 1 transaction              │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ ✅ All Transactions Successful      │  ← Success/Error section
│ No errors encountered               │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ 📝 Important Note                   │  ← Important info
│ All transactions in DRAFT status    │
│                                     │
├─────────────────────────────────────┤
│ This is an automated message        │  ← Footer
│ Execution Date: 2025-10-09...       │
└─────────────────────────────────────┘
```

---

## ✏️ Easy Customizations

### **1. Change the Header Title**

**Line 137:**
```typescript
<h1>🤖 Automated Billing Run Report</h1>
```

**Change to:**
```typescript
<h1>💰 Daily NDIS Billing Summary</h1>
// or
<h1>📊 Automation Report - ${new Date().toLocaleDateString()}</h1>
// or
<h1>🏠 Your Support Services Billing Update</h1>
```

---

### **2. Change the Header Colors**

**Line 117 (CSS):**
```css
.header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); ... }
```

**Change to:**
```css
/* Blue gradient */
.header { background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); ... }

/* Green gradient */
.header { background: linear-gradient(135deg, #10b981 0%, #047857 100%); ... }

/* Orange gradient */
.header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); ... }

/* Solid color (no gradient) */
.header { background: #4f46e5; ... }
```

---

### **3. Add Your Company Logo**

**After line 137, add:**
```html
<h1>
  <img src="https://yourdomain.com/logo.png" 
       alt="Company Logo" 
       style="height: 40px; vertical-align: middle; margin-right: 10px;">
  Automated Billing Run Report
</h1>
```

---

### **4. Change the Emoji Icons**

Find and replace:
- `🤖` (robot) → `💼` (briefcase) or `📊` (chart) or `💰` (money)
- `📊` (chart) → `📈` (trending up) or `📉` (trending down)
- `📈` (trending) → `📋` (clipboard) or `🗂️` (card index)
- `✅` (check) → `🎉` (party) or `👍` (thumbs up)
- `⚠️` (warning) → `🚨` (siren) or `❌` (cross)

---

### **5. Add More Stats to the Summary**

**After line 166, add:**
```html
<div class="stat">
  <div class="stat-label">Average Amount</div>
  <div class="stat-value">$${data.summary.averageAmount.toFixed(2)}</div>
</div>
<div class="stat">
  <div class="stat-label">Date</div>
  <div class="stat-value">${date.split(' at ')[0]}</div>
</div>
```

---

### **6. Add a "View Dashboard" Button**

**After line 207 (in the success section), add:**
```html
<div style="text-align: center; margin-top: 20px;">
  <a href="https://taketwo-ndis.vercel.app/transactions" 
     style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; 
            text-decoration: none; border-radius: 6px; font-weight: bold;">
    📊 View Transactions Dashboard
  </a>
</div>
```

---

### **7. Add Resident Names to Summary**

You'd need to pass more data, but here's how:

**In `app/api/automation/cron/route.ts` (line ~113), add:**
```typescript
const emailResult = await sendAutomationCompletionEmail(
  settings.admin_emails,
  {
    // ... existing fields ...
    residentNames: result.transactions.map(t => t.residentName)  // Add this
  }
)
```

**Then in email template (after line 180), add:**
```html
<div class="section">
  <div class="section-title">👥 Residents Processed</div>
  <div class="summary-box">
    ${data.residentNames.map(name => `
      <div style="padding: 5px 0;">• ${name}</div>
    `).join('')}
  </div>
</div>
```

---

### **8. Change Font Sizes**

**Line 115-131 (CSS):**
```css
/* Make header bigger */
.header h1 { margin: 0; font-size: 32px; }  /* was 24px */

/* Make stats bigger */
.stat-value { font-size: 32px; ... }  /* was 24px */

/* Make labels smaller */
.stat-label { font-size: 10px; ... }  /* was 12px */
```

---

### **9. Add Dark Mode**

**Replace line 115 with:**
```css
@media (prefers-color-scheme: dark) {
  body { background: #1a202c; color: #e2e8f0; }
  .content { background: #2d3748; }
  .summary-box { background: #374151; }
  .header { background: linear-gradient(135deg, #4c1d95 0%, #7e22ce 100%); }
}
```

---

### **10. Add a Warning Banner (if needed)**

**After line 141, add:**
```html
${data.failedTransactions > 0 ? `
<div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
  <strong style="color: #dc2626;">⚠️ ACTION REQUIRED:</strong>
  <p style="margin: 5px 0 0 0; color: #991b1b;">
    ${data.failedTransactions} transaction${data.failedTransactions > 1 ? 's' : ''} failed. 
    Please review the errors below and contact support if needed.
  </p>
</div>
` : ''}
```

---

## 🎨 Complete Custom Example

Here's a more branded, professional version:

```typescript
function generateEmailBody(data: AutomationEmailData): string {
  const date = new Date(data.executionDate).toLocaleString('en-AU', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Australia/Sydney'
  })

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a202c; margin: 0; padding: 0; background: #f7fafc; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: #10b981; color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0 0 10px 0; font-size: 28px; font-weight: 700; }
    .header p { margin: 0; opacity: 0.9; font-size: 16px; }
    .content { padding: 30px; }
    .badge { display: inline-block; padding: 8px 16px; background: #10b981; color: white; border-radius: 20px; font-size: 14px; font-weight: 600; margin-bottom: 20px; }
    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
    .stat-card { background: #f9fafb; border-radius: 8px; padding: 20px; text-align: center; border: 1px solid #e5e7eb; }
    .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-value { font-size: 32px; font-weight: 700; color: #10b981; margin: 10px 0; }
    .success-banner { background: #d1fae5; border: 2px solid #10b981; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
    .button { display: inline-block; padding: 14px 28px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .button:hover { background: #059669; }
    .footer { background: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💰 NDIS Billing Automation</h1>
      <p>${date}</p>
    </div>
    
    <div class="content">
      <div class="badge">✅ Run Completed Successfully</div>
      
      <h2 style="color: #1a202c; margin-bottom: 20px;">Summary</h2>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Contracts</div>
          <div class="stat-value">${data.processedContracts}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Transactions</div>
          <div class="stat-value">${data.successfulTransactions}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Billed</div>
          <div class="stat-value" style="font-size: 24px;">$${data.totalAmount.toFixed(2)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Execution</div>
          <div class="stat-value" style="font-size: 20px;">${data.executionTime}ms</div>
        </div>
      </div>
      
      ${data.errors.length === 0 ? `
      <div class="success-banner">
        <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
        <div style="font-size: 18px; font-weight: 600; color: #047857;">Perfect Run!</div>
        <div style="color: #065f46; margin-top: 5px;">All transactions processed successfully</div>
      </div>
      ` : ''}
      
      <div style="text-align: center;">
        <a href="https://taketwo-ndis.vercel.app/transactions" class="button">
          📊 View Dashboard
        </a>
      </div>
      
      <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin-top: 20px;">
        <strong style="color: #92400e;">📝 Note:</strong>
        <p style="margin: 5px 0 0 0; color: #78350f;">
          Transactions are in DRAFT status and require manual approval before posting.
        </p>
      </div>
    </div>
    
    <div class="footer">
      <p><strong>Your NDIS Management System</strong></p>
      <p>Automated by TakeTwo • ${new Date().getFullYear()}</p>
    </div>
  </div>
</body>
</html>
  `
}
```

---

## 🚀 Quick Changes You Can Make Right Now

Want me to:

1. **Change the header color?** (tell me what color)
2. **Add your logo?** (give me the URL)
3. **Change the title?** (what should it say?)
4. **Add a dashboard button?** (yes/no)
5. **Make it more/less colorful?** (preference?)
6. **Add resident names?** (yes/no)
7. **Something else?** (describe it!)

Just tell me what you'd like and I'll update it before the next cron run! ⏰

---

## 📝 Testing Your Changes

After making changes:
1. Commit and push
2. Wait for Vercel to deploy (~2 min)
3. Trigger automation manually or wait for cron
4. Check your inbox!

Want to test the email HTML without waiting for a run? I can create a preview tool! 🎨
