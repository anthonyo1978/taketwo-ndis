# Haven - Complete User Guide

**Your Comprehensive SDA Business Management System**

---

## 📖 Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Managing Houses](#managing-houses)
4. [Managing Residents](#managing-residents)
5. [Managing Contracts](#managing-contracts)
6. [Transactions & Billing](#transactions--billing)
7. [Claims Management](#claims-management)
8. [Automated Billing](#automated-billing)
9. [User Management](#user-management)
10. [Settings & Configuration](#settings--configuration)
11. [Tips & Best Practices](#tips--best-practices)

---

## 🚀 Getting Started

### First Time Setup

1. **Visit Haven**: Go to your Haven URL (provided by your administrator)
2. **Sign Up**: Click "Sign up" on the login page
3. **Create Organization**:
   - Enter your organization name
   - Fill in your details (name, email, password)
   - Click "Create Account"
4. **Welcome Email**: Check your email for the welcome message
5. **Login**: Use your credentials to access Haven

### Signing In

1. Go to the login page
2. Enter your email and password
3. Click "Sign in"
4. You'll be taken to your dashboard

---

## 📊 Dashboard Overview

The Dashboard is your command center, providing an at-a-glance view of your entire SDA portfolio.

### Key Metrics

**Portfolio Overview:**
- **Total Houses**: Count of active properties
- **Total Residents**: Number of active residents
- **Transaction Volume**: Revenue over 7 days, 30 days, and 12 months
- **Claims Summary**: Total claimed amount and pending claims

**House Performance:**
- See which houses are performing best
- View by revenue, occupancy, or claim rates
- Click on any house to drill down for details

**Recent Activity:**
- Recent transactions, claims, and system events
- Shows last 15 activities with pagination
- Quick access to related records

### Using the Dashboard

- **Navigation**: Click any metric card to see detailed breakdowns
- **Refresh**: Data updates automatically as you navigate
- **Filters**: Use date range filters to view different time periods

---

## 🏠 Managing Houses

### Adding a New House

1. Go to **Houses** (left sidebar)
2. Click **"+ Add House"** (top right)
3. Fill in the form:
   - **Address**: Full property address
   - **House Type**: Choose from dropdown
   - **Status**: Active, Inactive, or Maintenance
   - **Number of Bedrooms**: Total bedrooms
   - **Other details**: Any additional information
4. Click **"Create House"**

### Editing House Information

1. Find the house in the list
2. Click the **Edit** button (pencil icon)
3. Update any fields
4. Click **"Save Changes"**

### House Status

- **Active**: House is operational and ready for residents
- **Inactive**: Temporarily unavailable
- **Maintenance**: House is being repaired or renovated

### Managing Residents in a House

- Navigate to a house
- View current and past residents
- Add new residents from the house page
- Link residents to their funding contracts

---

## 👥 Managing Residents

### Adding a New Resident

1. Go to **Residents** (left sidebar)
2. Click **"Add Resident"** button
3. Fill in the resident form:
   - **Personal Details**: Name, date of birth, NDIS number
   - **Contact Information**: Email, phone, address
   - **Medical Info**: Any relevant health information
   - **House Assignment**: Select which house they'll live in
4. Click **"Create Resident"**

### Resident Profiles

Each resident profile shows:
- Personal information
- Current house assignment
- Active funding contracts
- Transaction history
- Claims submitted
- Balance and funding remaining

### Linking Contracts

1. Open the resident's profile
2. Go to **"Contracts"** tab
3. Click **"Add Contract"**
4. Enter contract details (covered in Contracts section)

---

## 💼 Managing Contracts

### Creating a Funding Contract

1. Navigate to a resident's profile
2. Go to **"Contracts"** tab
3. Click **"Add Contract"**
4. Fill in contract details:
   - **Contract Name**: Descriptive name
   - **Start Date**: When the contract begins
   - **End Date**: When it expires
   - **Total Value**: Total funding amount
   - **Daily Support Item Cost**: Daily rate
   - **Payment Frequency**: Daily, Weekly, or Fortnightly
   - **Service Type**: Type of NDIS support
5. Click **"Create Contract"**

### Enabling Automated Billing

For contracts you want to bill automatically:

1. When creating or editing a contract
2. Toggle **"Enable Auto-Billing"**
3. Select **"Billing Frequency"**:
   - Daily: Bill every day
   - Weekly: Bill once per week
   - Fortnightly: Bill every 2 weeks
4. The system will calculate daily rates automatically
5. Save the contract

The system will then automatically create transactions at the specified frequency.

### Contract Balance

- **Current Balance**: Amount remaining in the contract
- **Spent**: Total amount already billed
- **Percentage Used**: Visual indicator of usage

### Contract Lifecycle

- **Active**: Contract is operational
- **Suspended**: Temporarily paused
- **Closed**: Contract has ended
- **Expired**: Past end date

---

## 💳 Transactions & Billing

### Viewing Transactions

1. Go to **Transactions** (left sidebar)
2. View all transactions in a table:
   - Transaction ID
   - Date and time
   - Resident and contract
   - Amount and description
   - Status (Draft, Posted, Voided)
3. Use filters to narrow down:
   - Date range
   - Resident
   - Contract
   - House
   - Status

### Transaction Status

- **Draft**: Created but not yet posted to contract
- **Posted**: Applied to contract balance
- **Voided**: Reversed and balance restored

### Creating Transactions Manually

1. Click **"+ Create Transaction"**
2. Select:
   - **Resident** (who the transaction is for)
   - **Contract** (which funding contract)
   - **Amount** (billing amount)
   - **Date** (when the service occurred)
   - **Description** (what service was provided)
   - **Quantity** (if applicable)
   - **Unit Price** (if applicable)
3. Click **"Create Transaction"**

### Posting Transactions

1. Find the transaction in Draft status
2. Click **"Post"** button
3. The transaction moves to Posted status
4. Contract balance is reduced
5. Transaction is now final

### Voiding Transactions

If you made a mistake:

1. Find the posted transaction
2. Click **"Void"** button
3. Confirm the void
4. Transaction moves to Voided status
5. Contract balance is restored

### Exporting Data

1. Use filters to select the data you want
2. Click **"Export"** button
3. Choose format: CSV or Excel
4. Download the file

---

## 📋 Claims Management

### Submitting Claims

1. Go to **Claims** (left sidebar)
2. View all your claims
3. Click **"+ Create Claim"**
4. Fill in claim details:
   - Select transactions to include
   - Add participant details
   - Attach supporting documents
   - Review totals
5. Click **"Submit"**

### Claim Status

- **Draft**: Being prepared
- **Submitted**: Sent to NDIA
- **Approved**: Accepted by NDIA
- **Rejected**: Not accepted
- **Paid**: Payment received

### Claim Reconciliation

After NDIA approves a claim:

1. Find the approved claim
2. Click **"Reconcile"**
3. Enter payment details:
   - Payment date
   - Amount received
   - Reference number
4. Click **"Reconcile Payment"**
5. The claim moves to Paid status

### Claim Filters

Filter claims by:
- Status
- Date range
- Participant
- House
- Amount range

---

## 🤖 Automated Billing

### Overview

Haven automatically creates transactions for your funding contracts based on the frequency you configure (daily, weekly, or fortnightly).

### Setting Up Automation

1. Go to **Settings** → **Automation**
2. Toggle **"Enable Automated Billing"** to ON
3. Configure settings:
   - **Run Time**: When to generate transactions (default: 2 AM)
   - **Timezone**: Australia/Sydney
   - **Email Notifications**: Who receives automation reports
   - **Notification Frequency**: When to send emails
4. Click **"Save Settings"**

### Previewing Automation

Before enabling, preview what will happen:

1. Go to **Settings** → **Automation**
2. Click **"Preview Next 3 Days"**
3. See which contracts will be billed
4. See amounts that will be generated
5. Adjust contracts if needed

### Email Notifications

After each automation run, you'll receive an email with:
- Total transactions created
- Total amount billed
- Success or failure status
- Error details (if any)

### Automation Best Practices

- **Review Daily**: Check automation emails each morning
- **Monitor Balances**: Ensure contracts don't run out of funds
- **Update Contracts**: Adjust daily costs as needed
- **Handle Errors**: Review failed transactions and fix issues

---

## 👤 User Management

### Adding Team Members

1. Go to **Settings** → **User Management**
2. Click **"+ Add User"**
3. Fill in user details:
   - First Name
   - Last Name
   - Email (must be unique)
   - Phone (optional)
   - Job Title (optional)
   - Role: Staff, Manager, or Admin
4. Check **"Send welcome email"**
5. Click **"Create User"**

### User Roles

- **Staff**: Can view and manage data, but can't delete critical records
- **Manager**: Full data access, can manage users
- **Admin**: Complete system access, including all settings

### Inviting Users

When you create a user:
1. An email is sent to their address
2. They receive a welcome email with setup link
3. They click "Set Password & Login"
4. They create their password
5. They can then login to Haven

### Managing Existing Users

- **Edit**: Update user information
- **Suspend**: Temporarily disable account
- **Delete**: Remove user (use carefully)
- **Resend Invite**: Send another welcome email

---

## ⚙️ Settings & Configuration

### General Settings

- Organization details
- System preferences
- Timezone settings

### Automation Settings

- Enable/disable automated billing
- Configure run times
- Set notification preferences
- Manage admin emails

### User Management

- Add, edit, or remove users
- Manage user roles
- Resend invitations
- View user activity

### Integration Settings

- Configure external systems
- API keys and credentials
- Data import/export settings

---

## 💡 Tips & Best Practices

### Data Entry

- **Be Consistent**: Use the same naming conventions throughout
- **Double-Check**: Review all data before submitting
- **Use Descriptions**: Add clear, descriptive notes to transactions
- **Document Changes**: Add notes when making significant changes

### Automation

- **Start Small**: Enable automation for a few contracts first
- **Monitor Closely**: Check email notifications daily
- **Keep Balances Healthy**: Ensure contracts have sufficient funds
- **Review Regularly**: Periodically review automation settings

### Claims

- **Batch Similar Items**: Group similar transactions in one claim
- **Submit Regularly**: Don't let claims backlog
- **Reconcile Promptly**: Update payment status quickly
- **Keep Records**: Export and save claim data regularly

### Reporting

- **Use Filters**: Leverage date and status filters for insights
- **Export Regularly**: Download data for external analysis
- **Monitor Trends**: Watch for patterns in your dashboard
- **Track Performance**: Use metrics to identify best-performing houses

### Security

- **Strong Passwords**: Use unique, complex passwords
- **Regular Updates**: Keep your information current
- **Access Control**: Only grant access to trusted team members
- **Audit Trail**: Review user activity logs

---

## 🆘 Need Help?

### Common Issues

**Can't Login?**
- Check your email and password
- Use "Forgot Password" to reset
- Contact your administrator

**Transactions Not Appearing?**
- Check if automation is enabled
- Verify contracts have sufficient balance
- Review automation email notifications

**Claims Failing?**
- Ensure transaction details are complete
- Verify resident NDIS numbers are correct
- Check that contracts are active

### Support

- **Email**: Reach out to your administrator
- **Documentation**: Refer to this guide
- **System Logs**: Check automation emails for errors

---

## 📝 Quick Reference

### Keyboard Shortcuts

- `Ctrl/Cmd + K`: Quick search
- `Ctrl/Cmd + N`: New record (context-aware)
- `Esc`: Close modals

### Status Icons

- 🟢 Active/Posted
- 🟡 Draft/Pending
- 🔴 Inactive/Voided
- ⚪ Suspended/Closed

---

**Welcome to Haven - Your SDA Business Management Partner! 🏡**

