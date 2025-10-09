🎯 Purpose

The automation mechanism enables the automatic generation of billable transactions, based on predefined contract settings. Its purpose is to track spend accurately and autonomously, by running in the background and simulating the same logic as manual transaction creation — without manual input. This mechanism supports predictable billing cycles (e.g. weekly support), improving operational efficiency and ensuring timely cost recovery.

🧠 Core Principles

# Out-of-Hours Execution: Automation runs during off-peak hours (e.g. 2 AM) to avoid performance impact.
# Rigorous Dependency Handling: Transactions are created based on contract metadata with full traceability and validation.
# Failure Resilience is built in as follows: 
    - All errors are trapped
    - No retries occur during the run ( at this stage)
    - Detailed logging captures any issue

# Named admins are alerted & importantly Human-Readable Logging: Comprehensive, verbose logs provide peace of mind and full transparency into automation runs
# State and date awareness with the correct passing of the baton: The system remembers its last run and ensures the next billing point is never lost.
# Manual Compatibility: Manually created transactions co-exist with automated ones — both draw down from the same participant contract.
    - On this note, when the automation cvreates a transaction, this is visible within the funding scetion within the resident record
    - also, this is available within on the transactions table, this table is a glabl view of all transactions for the provider, and never doesnt show a transaction!

🏆 Goal

When users create a funding contract, they can toggle on or choose whether or not that contract will avaiol automated transaction creation.
This is ideal for services with predictable billing patterns (e.g. weekly SIL support). Instead of staff entering transactions manually, the system generates them using settings from the contract: rate, service code, frequency, units, participant, etc.
BUt it could conversely be the case that some users choose NOT to use automation - in this case the maniual path should always fork fine too!
Some user may opt for a hybrid, where automated delivery can co exist dafetly and accuraetly with manual transactions
Whatever the use, fully automated, hybrid or manual the core principla opf accurate finaincial spend and contract tracking must apply

💡 Why It Matters

1. Reduces Admin Work - Eliminates repetitive data entry for standardised support.
2. Ensures Claim Coverage - Avoids the risk of missed claims due to human error.
3. Supports Scale - Vital for high-volume service providers — e.g. SIL, community access, transport.
4. Speeds Up Revenue - Quicker transaction creation = faster invoicing and claiming.

✅ Success Criteria

Auto Creation	Transactions are reliably created based on contract rules
Scheduled Execution	Automation runs on a set cadence (e.g. nightly)
No Duplicates	No transaction is created twice for the same window
Logged Failures	All errors are trapped and logged per participant
Admin Alerts	Email notifications sent to assigned admins upon failure
No Partial Handling	If the billing period is partial or funds are insufficient, the run is skipped and logged
Manual + Auto Compatible	Manual transactions and auto transactions share the same balance pool
Draft Mode	All auto-created transactions land in Draft status

📄 Functionality & Rules

Setting up automation
* ithin the Settings tab of the system there is a setting called "Automation" When you get to that, it open anoyther screen that shows different automated things - in this case Billing Automation, is the first item we are building!
* when you click in billing item you can swicth on the automation and choose some settings like " Run Time", error handlling ( email for logs errors), fail and retry behavior (on off for now)

Automation Engine Behaviour

Scans contracts with automation enabled. and looks at the contract set up and a few other rules to decide whether or not to bill.
Rules - Active client, in an active house, active contract, contract has automation enabled, and contract sets the run frequency and run amount ( we may have to start but cliening up contract fileds that feed this behavior)
Skips contracts: where rulles arent met or rundate is Outside start/end dates
With insufficient funds to cover the full transaction
Where billing window is partial, like say that bill run is a friday, bu the contract finished thursday


For valid entries, creates a new transaction in Draft that is the same as the transactions that are created manaually.


Error Handling Rules

* If the job fails for one or more participants:
* All errors are logged (reason + affected contract)
* No retries for that client, move onto the next
* logs fill up and at the end and Email sent to configured admin(s)
* Job continues running for other unaffected participants

This batching engine, must log really well, the log should be human readable and to helpo provide an example may run something like this...

* job started 01/01/2025 at 02:00 AM
* detected 100 clients in the org
* of these 100, 3 were ignored, here are the three ignores and the reason why ignores
* The remaining 97 were valid, of these 97 only 8 had scheduled payments for today, each was executed as follows

 - dave abc - $97 created for TXN - 987987, dave has $456789 remaining
 - davs abc - $97 created for TXN - 987987, dave has $456789 remaining
 - davd abc - $97 created for TXN - 987987, dave has $456789 remaining
 - davg abc - $97 created for TXN - 987987, dave has $456789 remaining
 - dav abc - $97 created for TXN - 987987, dave has $456789 remaining
 - davj abc - $97 created for TXN - 987987, dave has $456789 remaining
 - davl abc - $97 created for TXN - 987987, dave has $456789 remaining
 - davp abc - $97 created for TXN - 987987, dave has $456789 remaining


---- this is verbose human readable logging style that will help if there are problems>


✅ Example User Story

As an admin, I want to turn on automation for my contracts, so that transactions are automatically created for each participant. I want to receive an email if something goes wrong (e.g., no funds or missing config). These transactions should always land in Draft so I can review before approval.


Run frequency & setting next run date!

the system can run daily, weekly or fortnightly only at this stage
when a job runs successfully, it looks at the frequency and sets the next run data based on the contract frequency ( the next rum data will have to maintained as anew filed in the db)


Test harness, - in settings there is a tool that allows you to test a rerun of a certain date - lets work thorugh this. but a way to run this on demand in a mock way would be great!

---

## 🚀 **Implementation Plan**

### **Phase 1: Database Foundation** ✅ COMPLETED
- ✅ **Contract Automation Fields** - Added to funding_contracts table
- ✅ **Automation Logs Table** - Created for batch job tracking
- ✅ **Automation Settings Table** - Organization-level configuration
- ✅ **Transaction Metadata** - Auto-generated transaction tracking

### **Phase 2: Settings Page** (Next Priority)
**Goal**: Create `/admin/settings/automation` page for configuration

**Tasks**:
1. **Create Settings Page Structure**
   - Build automation settings UI component
   - Add navigation to admin sidebar
   - Implement settings form with validation

2. **Settings Configuration**
   - Enable/disable automation globally
   - Configure run time (default: 2 AM)
   - Set timezone (default: Australia/Sydney)
   - Configure admin email notifications
   - Error handling settings (retries, delays)

3. **Settings Persistence**
   - API routes for settings CRUD
   - Database integration with automation_settings table
   - Form validation and error handling

### **Phase 3: Core Automation Engine**
**Goal**: Build the batch processing system

**Tasks**:
1. **Contract Eligibility Checker**
   - Active client validation
   - Active house validation
   - Active contract validation
   - Automation enabled check
   - Sufficient balance check
   - Date range validation (within start/end dates)

2. **Transaction Generation Logic**
   - Calculate transaction amount based on frequency
   - Use contract's support item code
   - Generate appropriate description
   - Set transaction status to "Draft"
   - Link to automation run log

3. **Batch Processing System**
   - Scan all eligible contracts
   - Process contracts in batches
   - Update next_run_date after successful processing
   - Comprehensive error handling
   - Performance monitoring

### **Phase 4: Logging & Notifications**
**Goal**: Comprehensive monitoring and alerting

**Tasks**:
1. **Human-Readable Logging**
   - Detailed run summaries
   - Contract-by-contract processing logs
   - Error details with context
   - Performance metrics

2. **Email Notification System**
   - Success/failure notifications
   - Weekly summary reports
   - Error alerts to admin emails
   - Integration with email service (TBD)

### **Phase 5: Test Harness**
**Goal**: Manual testing and debugging tools


2. **Debugging & Testing Tools**
   - A simple button called "Preview Next 3 Days " shows which TXN the system thinks it will pick up.
      This shows per day per resident
      also, if a resident will be picked up more than once, this is reflected in this three day snap shot
   - Another button called "Run Today's Automation Now" is a way for the user to invoike the batch job without waiting
      This only runs if todays automation has not automatically run already
      If this automation has run today already, clicking this button will tell the user such!
    - Both buttons sit within a testing tools scetn just benaeth the "Error Handling" tile
    


### **Phase 6: Production Scheduling**
**Goal**: Automated execution system

**Tasks**:
1. **Cron Job Setup**
   - Vercel Cron integration
   - Timezone handling
   - Error recovery mechanisms
   - Monitoring and health checks

2. **Production Monitoring**
   - Automated run status tracking
   - Performance metrics
   - Error rate monitoring
   - Capacity planning

---

## 📋 **Technical Decisions Made**

### **Transaction Amount Calculation**
- **Method**: Fixed amount per run based on contract settings
- **Source**: Contract's `dailySupportItemCost` × frequency days
- **Example**: $100/day × 7 days = $700 weekly transaction

### **Transaction Details**
- **Description**: "Automated billing - [Frequency] support - [Contract Type]"
- **Support Item Code**: From contract's `supportItemCode` field
- **Status**: Always "Draft" for manual approval
- **Type**: "Service Delivery" (existing transaction type)

### **Scheduling**
- **Default Run Time**: 2:00 AM (configurable)
- **Timezone**: Australia/Sydney (configurable)
- **Frequency**: Daily, Weekly, Fortnightly only
- **Platform**: Vercel Cron Jobs

### **Error Handling**
- **No Retries**: During batch run (prevents infinite loops)
- **Continue on Error**: Process other contracts if one fails
- **Email Alerts**: To configured admin emails
- **Detailed Logging**: All errors captured with context

### **Database Schema**
- **automation_settings**: Organization-level configuration
- **automation_logs**: Batch run tracking and results
- **transactions**: Enhanced with automation metadata
- **funding_contracts**: Already has automation fields

---

## 🎯 **Next Steps**

1. **Start with Settings Page** - Build the configuration interface
2. **Implement Contract Eligibility** - Core business logic
3. **Build Transaction Generation** - Auto-create draft transactions
4. **Add Logging System** - Comprehensive monitoring
5. **Create Test Harness** - Manual testing tools
6. **Deploy Scheduling** - Production automation

**Estimated Timeline**: 3-4 weeks for full implementation

---

## 🧪 **Built-in Testing Tools**

### **Overview**
The automation system includes comprehensive testing tools accessible from the Automation Settings page (`/settings/automation`). These tools allow administrators to preview, test, and validate automation behavior before it runs in production.

### **Available Testing Tools**

#### **1. Preview Next 3 Days** 🔍
**Purpose**: Shows which contracts are eligible for automation in the next 3 days

**Features**:
- **Grouped by Date**: Contracts are organized by their next run date
- **Detailed Information**: For each contract shows:
  - Customer name and house name
  - Automated transaction amount (calculated based on frequency)
  - Automated transaction frequency (daily/weekly/fortnightly)
  - Next run date will be set to (after this transaction)
  - Balance after transaction (current balance - transaction amount)
- **Visual Organization**: Clear day-by-day breakdown with transaction counts
- **Real-time Calculations**: All amounts and dates calculated dynamically

**Use Cases**:
- Verify which contracts will run on specific dates
- Check transaction amounts before automation runs
- Validate balance calculations
- Plan for upcoming automation runs

#### **2. Preview Transactions** 📊
**Purpose**: Shows exactly what transactions would be created without actually creating them

**Features**:
- **Transaction Preview**: Shows all transactions that would be generated
- **Amount Calculations**: Displays calculated amounts based on frequency
- **Balance Projections**: Shows remaining balance after each transaction
- **Summary Statistics**: Total amount, average amount, frequency breakdown

**Use Cases**:
- Validate transaction amounts before generation
- Check total financial impact
- Verify frequency calculations
- Test automation logic

#### **3. Generate Transactions** ⚡
**Purpose**: Actually creates transactions for eligible contracts

**Features**:
- **Real Transaction Creation**: Creates actual transactions in the database
- **Status Updates**: Updates contract balances and next run dates
- **Comprehensive Reporting**: Shows success/failure counts and details
- **Error Handling**: Captures and reports any errors during generation

**Use Cases**:
- Manual automation runs for testing
- Emergency transaction generation
- Validating the full automation process

### **Testing Workflow**

1. **Preview Next 3 Days** → Review which contracts are eligible
2. **Preview Transactions** → Verify transaction amounts and calculations
3. **Generate Transactions** → Create actual transactions (if satisfied with preview)

### **Safety Features**

- **Preview Mode**: All preview tools are read-only and don't modify data
- **Confirmation Required**: Generate Transactions requires explicit confirmation
- **Detailed Logging**: All actions are logged for audit purposes
- **Error Isolation**: If one contract fails, others continue processing

---

## 📊 **Contract Duration Implementation - COMPLETED**

### **Overview**
Added contract duration calculation and persistence to provide users with clear visibility into contract length and support automated daily rate calculations.

### **Implementation Details**

#### **Database Changes**
- **Migration**: `017_add_duration_days_to_funding_contracts.sql`
- **New Field**: `duration_days` INTEGER column in `funding_contracts` table
- **Index**: Added for efficient querying on duration
- **Data Migration**: Updated existing contracts with calculated duration values

#### **Backend Updates**
- **API Enhancement**: Updated `/api/residents/[id]/funding/route.ts` to:
  - Accept `durationDays` in POST/PUT schemas
  - Automatically calculate duration when start/end dates provided
  - Save calculated duration to database
- **Service Layer**: Updated `lib/supabase/services/residents.ts` to:
  - Handle `durationDays` field in create/update operations
  - Map between frontend (`durationDays`) and database (`duration_days`)

#### **Type System**
- **Interface Update**: Added `durationDays?: number` to `FundingInformation` type
- **Form Schema**: Updated `FundingManager` form schema to include duration field

#### **Frontend Features**
- **Real-time Calculation**: Duration calculated and displayed in contract creation modal
- **Contract View**: Duration prominently displayed in contract information grid
- **Visual Design**: Purple-colored field with proper pluralization ("1 day" vs "2 days")
- **Error Handling**: Graceful handling of invalid date ranges

#### **Calculation Logic**
```typescript
// Duration calculation (inclusive of both start and end dates)
const timeDiff = endDate.getTime() - startDate.getTime()
const durationDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1
```

#### **User Experience**
1. **During Creation**: Users see duration calculated in real-time as they set dates
2. **After Creation**: Duration displayed in contract information grid
3. **Consistency**: Same calculation logic used throughout the system
4. **Automation Support**: Provides foundation for daily rate calculations

#### **Benefits for Automation**
- **Clear Reference**: Contract duration provides clear foundation for daily rate calculations
- **Validation**: Users can verify contract length before enabling automation
- **Transparency**: Duration visible in contract view helps users understand automation basis
- **Accuracy**: Consistent calculation ensures automation uses correct daily rates

#### **Technical Notes**
- **Inclusive Calculation**: Both start and end dates are included in duration
- **Null Handling**: Gracefully handles contracts without end dates
- **Type Safety**: Proper TypeScript types throughout the system
- **Database Persistence**: Duration stored and retrieved consistently

---

## 🔍 **Phase 3A: Contract Eligibility Checker - Detailed Plan**

### **Core Requirements Analysis**

A contract is eligible for automation if it meets ALL these criteria:

1. **✅ Active Client** - Client must be active
2. **✅ Active House** - House must be active  
3. **✅ Active Contract** - Contract must be active
4. **✅ Automation Enabled** - Contract has `automation_enabled = true`
5. **✅ Sufficient Balance** - Client has enough funds
6. **✅ Date Range Valid** - Current date is within contract start/end dates
7. **✅ Next Run Date** - It's time to run (based on `next_run_date`)

### **Implementation Plan**

#### **Step 1: Create Eligibility Service**
- **File**: `lib/services/contract-eligibility.ts`
- **Purpose**: Centralized logic for checking contract eligibility
- **Functions**:
  - `checkContractEligibility(contractId: string)` - Check single contract
  - `getEligibleContracts()` - Get all eligible contracts for today
  - `validateContractStatus(contract)` - Check active statuses
  - `validateBalance(contract)` - Check sufficient funds
  - `validateDateRange(contract)` - Check date ranges

#### **Step 2: Database Queries**
- **Query**: Get contracts with automation enabled
- **Joins**: Include client, house, and balance information
- **Filters**: Active status, date ranges, next_run_date

#### **Step 3: Eligibility Rules Engine**
- **Rule 1**: Status Validation
  - Client: `status = 'active'`
  - House: `status = 'active'`
  - Contract: `status = 'active'`
- **Rule 2**: Automation Settings
  - Contract: `automation_enabled = true`
  - Contract: `frequency` is set (daily/weekly/fortnightly)
- **Rule 3**: Financial Validation
  - Client balance >= contract amount
  - No outstanding debts
- **Rule 4**: Date Validation
  - Current date >= contract start_date
  - Current date <= contract end_date
  - Current date >= next_run_date

#### **Step 4: API Endpoint**
- **Route**: `/api/automation/eligible-contracts`
- **Method**: GET
- **Purpose**: Get list of eligible contracts for testing/debugging
- **Response**: Array of eligible contracts with eligibility details

#### **Step 5: Testing Interface**
- **Location**: Automation settings page
- **Feature**: "Preview Eligible Contracts" button
- **Purpose**: Show which contracts would be processed today

### **Technical Implementation**

#### **Database Schema Dependencies**
```sql
-- We need to ensure these fields exist in funding_contracts
ALTER TABLE funding_contracts ADD COLUMN IF NOT EXISTS automation_enabled BOOLEAN DEFAULT false;
ALTER TABLE funding_contracts ADD COLUMN IF NOT EXISTS frequency VARCHAR(20); -- 'daily', 'weekly', 'fortnightly'
ALTER TABLE funding_contracts ADD COLUMN IF NOT EXISTS next_run_date DATE;
```

#### **Service Structure**
```typescript
interface ContractEligibilityResult {
  contractId: string
  isEligible: boolean
  reasons: string[]
  contract: Contract
  client: Client
  house: House
}

interface EligibilityCheck {
  statusCheck: boolean
  automationCheck: boolean
  balanceCheck: boolean
  dateCheck: boolean
  nextRunCheck: boolean
}
```

### **Implementation Steps**

1. **Create the service file** with eligibility logic
2. **Add database queries** to fetch contract data
3. **Implement validation rules** for each eligibility criterion
4. **Create API endpoint** for testing
5. **Add UI preview** in automation settings
6. **Test with sample data** to ensure accuracy

### **Questions for Implementation**

1. **Balance Check**: How do we determine "sufficient balance"? Is it based on the contract amount, or is there a minimum threshold?

2. **Date Logic**: Should we check if `next_run_date` is exactly today, or within a range (e.g., today or earlier)?

3. **Frequency Handling**: How should we handle different frequencies (daily/weekly/fortnightly) in the eligibility check?

4. **Testing Data**: Do you have sample contracts we can use to test the eligibility logic?

---
