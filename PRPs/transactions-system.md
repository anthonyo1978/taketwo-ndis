# PRD: Transactions System for NDIS Provider Management

## Overview

The Transactions system provides a comprehensive billing and contract drawdown management solution for Haven users. It serves as the central source of truth for all billable events, automatically logging transactions. Either reducing contract balances (if it is a draw down contract) or crating invoices (if it is a invoice contract) 

Thie feature is the heart of the product providing financial visibility for reconciliation and payment claims thereefter.

## Problem Statement

providers need to:
- Track billable events against resident contracts with precision
- Automatically drawdown contract balances as services are provided
- Maintain audit trails for government compliance and claim processing
- Provide operational dashboards showing house → resident → contract → transaction visibility
- Enable bulk processing of transactions for efficiency
- Export data for external claim systems

## Solution

A simple, high-performance transactions table with inline balance calculations, comprehensive filtering, bulk operations, and deep integration with the existing resident/contract system.

## Key Features

### 1. Transaction Management Table
- **Route**: `/admin/transactions`
- **Design Pattern**: Based on shadcnexamples.com/tasks for high-density UX
- **Technology**: TanStack Table + shadcn/ui components
- **Pagination**: 25 records per page (configurable)

### 2. Comprehensive Filtering & Search
- **Header Controls**: Date range, client, contract, house, status filters
- **Quick Search**: Service codes and transaction notes
- **Column Filters**: Individual column quick filters
- **Sorting**: Date (desc default), amount, client, status

### 3. Transaction States & Lifecycle
- **Draft**: Created but not posted to contract balance
- **Posted**: Applied to contract balance, deducting available funds
- **Voided**: Reversed transaction, restores balance
- **Validation**: Prevents negative balances, shows remaining after post

### 4. Contract Date Boundary Validation
- **Date Constraints**: Transaction dates must fall within contract start and end dates
- **Visual Indicators**: Date picker shows min/max constraints based on selected contract
- **Orphaned Transactions**: Transactions outside contract boundaries are marked as "orphaned"
- **Balance Protection**: Orphaned transactions don't affect contract balance drawdown
- **User Warnings**: Clear visual feedback when dates are outside contract boundaries
- **Flexible Boundaries**: Open-ended contracts (no end date) have no upper limit

### 5. Sequential Transaction ID Generation
- **TXN Prefix**: All transactions get unique IDs starting with "TXN-"
- **Sequential Format**: TXN-A000001, TXN-A000002, etc.
- **Letter Progression**: When reaching TXN-A999999, increments to TXN-B000001
- **Database Integration**: Custom ID generation in transaction service
- **Collision Prevention**: Ensures no duplicate transaction IDs

### 6. Bulk Operations
- **Bulk Post**: Convert multiple draft transactions to posted
- **Bulk Void**: Reverse multiple posted transactions (with constraints)
- **CSV Export**: Export selected or filtered transactions
- **Bulk Select**: Checkbox-based row selection

### 7. Contract Integration
- **Balance Updates**: Automatic contract balance reduction on post
- **Balance Restoration**: Automatic balance restoration on void
- **Real-time Validation**: Show remaining balance preview before posting
- **Active Contract Filtering**: Only show active contracts for new transactions

### 8. Resident Page Integration
- **Balance Widget**: Show active contracts with remaining balances
- **Recent Transactions**: Last 5 transactions with link to full view
- **Quick Actions**: Direct link to create transaction for resident

## Technical Specifications

### Data Model

```typescript
interface Transaction {
  id: string
  residentId: string
  contractId: string
  occurredAt: Date
  serviceCode: string
  description?: string
  quantity: number
  unitPrice: number
  amount: number // quantity * unitPrice (can be overridden)
  status: 'draft' | 'posted' | 'voided'
  isOrphaned?: boolean // Transaction outside contract date boundaries
  note?: string
  createdAt: Date
  createdBy: string
  postedAt?: Date
  postedBy?: string
  voidedAt?: Date
  voidedBy?: string
  voidReason?: string
}

interface TransactionCreateInput {
  residentId: string
  contractId: string
  occurredAt: Date
  serviceCode: string
  description?: string
  quantity: number
  unitPrice: number
  amount?: number // Optional override
  isOrphaned?: boolean // Set by frontend validation
  note?: string
}

interface TransactionFilters {
  dateRange?: { from: Date; to: Date }
  residentIds?: string[]
  contractIds?: string[]
  houseIds?: string[]
  statuses?: TransactionStatus[]
  serviceCode?: string
  search?: string
}
```

### API Endpoints

- `GET /api/transactions` - List with filtering, sorting, pagination
- `POST /api/transactions` - Create new transaction
- `PUT /api/transactions/[id]` - Update transaction
- `POST /api/transactions/bulk-post` - Bulk post drafts
- `POST /api/transactions/bulk-void` - Bulk void posted
- `DELETE /api/transactions/[id]` - Delete draft transaction
- `GET /api/transactions/export` - CSV export

### Storage Layer

Following existing localStorage pattern:
- `lib/utils/transaction-storage.ts`
- Extends current storage abstraction
- Maintains contract balance consistency
- Atomic operations for balance updates

## Contract Date Boundary Validation

### Implementation Details

The system enforces contract date boundaries to ensure transactions are only created within valid service agreement periods:

#### Frontend Validation
- **Date Picker Constraints**: HTML date input `min` and `max` attributes set based on contract dates
- **Real-time Validation**: Date boundaries checked as user selects contract and changes dates
- **Visual Indicators**: Clear warnings when dates fall outside contract boundaries
- **Contract Information Display**: Shows contract start date, end date, and support item code

#### Backend Validation
- **Orphaned Transaction Detection**: Server-side validation checks if transaction date falls outside contract boundaries
- **Balance Protection**: Orphaned transactions are marked but don't affect contract balance drawdown
- **Database Storage**: `is_orphaned` field stored in transactions table

#### User Experience
- **Date Constraints**: Date picker automatically restricts selectable dates to contract period
- **Warning Messages**: Clear feedback when attempting to create transactions outside boundaries
- **Orphaned Badge**: Transactions outside boundaries show "Orphaned" status badge
- **Flexible Boundaries**: Open-ended contracts (no end date) have no upper date limit

#### Technical Flow
1. User selects resident → loads active contracts
2. User selects contract → sets date picker min/max constraints
3. User selects date → validates against contract boundaries
4. If outside boundaries → marks as orphaned, shows warning
5. Transaction created with `isOrphaned` flag
6. Orphaned transactions don't affect contract balance

## User Experience Flow

### Primary Workflow
1. **View Transactions**: Dense table with all filtering options
2. **Create Transaction**: Sheet/dialog with resident→contract selection and date validation
3. **Bulk Operations**: Select multiple rows, apply actions
4. **Balance Monitoring**: Real-time balance updates and validation
5. **Export**: CSV download for external processing

### Resident Integration
1. **Balance Widget**: Quick view of contract balances from resident page
2. **Recent Activity**: Last 5 transactions with links
3. **Quick Create**: Direct transaction creation from resident context

## Success Criteria

### Functional
- ✅ Create draft transactions with validation
- ✅ Post transactions with automatic balance deduction
- ✅ Void transactions with balance restoration
- ✅ Contract date boundary validation prevents invalid transactions
- ✅ Orphaned transactions are properly marked and handled
- ✅ Date picker constraints work correctly
- ✅ Bulk operations work correctly with constraints
- ✅ Filtering and sorting perform smoothly
- ✅ CSV export produces correct data
- ✅ Balance calculations are accurate
- ✅ Integration with resident pages works seamlessly

### Performance
- ✅ Table loads within 500ms for 1000+ records
- ✅ Filtering responds within 100ms
- ✅ Bulk operations process within 2s for 50+ items
- ✅ Export completes within 5s for filtered results

### UX
- ✅ Dense table layout maximizes screen real estate
- ✅ Keyboard navigation works throughout
- ✅ Mobile responsive design
- ✅ Clear visual feedback for all operations
- ✅ Error states are informative and actionable

## Implementation Priority

### Phase 1 (Core Foundation)
1. Transaction type definitions and validation schemas
2. Storage utilities with balance calculation logic
3. Basic API routes (CRUD operations)
4. Simple transactions table with mock data

### Phase 2 (Table Enhancement) ✅ COMPLETED
1. ✅ TanStack Table implementation with full feature set
2. ✅ Filtering and sorting implementation
3. ✅ Transaction creation dialog with contract date validation
4. ✅ Status transitions (draft→posted→voided)
5. ✅ Contract date boundary validation system
6. ✅ Orphaned transaction handling

### Phase 3 (Integration & Polish)
1. Resident page balance widgets
2. Bulk operations and CSV export
3. Advanced filtering and search
4. Comprehensive testing suite

### Phase 4 (Future Enhancements)
1. Automated transaction generation
2. Claims export formatting
3. Multi-tenant scoping
4. Advanced reporting dashboards

## Risks & Mitigation

### Risk: Balance Calculation Accuracy
**Mitigation**: Atomic operations, comprehensive unit tests, balance validation on every operation

### Risk: Performance with Large Datasets
**Mitigation**: Pagination, lazy loading, optimized filtering, eventual database migration path

### Risk: Complex State Management
**Mitigation**: Clear state machine for transaction statuses, comprehensive error handling

### Risk: Integration Complexity
**Mitigation**: Leveraging existing patterns, incremental development, thorough testing

## Dependencies

- Existing resident and contract system
- TanStack Table for advanced table functionality
- shadcn/ui components for consistent design
- Current localStorage storage abstraction
- date-fns for date handling and formatting

## Testing Strategy

### Unit Tests
- Transaction model validation
- Balance calculation logic
- State transition rules
- Amount calculations and overrides

### Integration Tests
- API route handlers
- Storage layer operations
- Contract balance updates
- Bulk operation atomicity

### E2E Tests
- Complete transaction lifecycle
- Filtering and sorting accuracy
- CSV export functionality
- Resident page integration

This PRD provides the foundation for a comprehensive transaction management system that integrates seamlessly with the existing NDIS provider management application while providing the high-performance, dense UX required for operational efficiency.

Enhancement & Bug Updates

1. **Resident Lookup Requirement**: When a user creates a transaction, the "Resident" field must lookup and display all residents available in the system who have:
   - An active status
   - Been assigned to a house
   - Have at least one active service agreement/contract
   - Display format: "FirstName LastName - HouseAddress"
   
2. **Service Code Field**: Changed from dropdown to optional text input with placeholder examples
3. **Unit Price Field**: Increments in $10 increments when using +/- buttons, not $0.01 per click

**Technical Implementation Notes:**
- Resident data should be fetched from API endpoints rather than localStorage for reliability
- Only residents with active contracts should appear in the dropdown
- Loading state should be shown while fetching resident and house data
- Fallback to localStorage if API fails (for development/testing)

### Iteration enhancements to the create Transaction layout

 - when the user has selected the resident ( which is awesome) - and they choose the contract, can you then flash up just under this something like this... This contract starts on XX/XX/XXXXX & ends on XX/XX/XXXXX and is configured for servicing items code XXXXXX
  - the aforementioned information is really about pulling a few variables from the selected agreement, that help guide the user on filling in the transactiuon screen
   - for the selected contract, these variabel are: Contract start date, contract end date & contract support item code
 - Change Date Occurred to Date of Delivery & make this field mandatory
 - Try and fix the alignment on quantity section, the options feel all different sizes

FIXED & Uplifts

A. On the transactions screen, there is no need for more than one " Crate Transactiopn" button. Please remove the "Drawing Down" button, also, please remove the "+create" button.
B. Please remove the "+ create button" next to the Eport .CSV button
C. When creating a transaction, can you please explain the logic that determines who is retruend as someone you can create a transaction against? I can currently only see "Bill Hat" not sure that is correct - i thought the logic was active contract with money within date
D. When a transaction is created, it gets like a primary key which is a unique identifier. The prefix is "TXN" and this uniquely identifioes each and every record, you can never have duplicateds. Please implemenet
E I am not sure how this wwould work, BUT, when the user is creating a transaction, does the sysem on the UI at that point have context of the boundaries of the contract? I am interested in the diea that the user can only create transactions within the boundaruies of the dates of that service agreement is that makes sense? So for example if the date boundaries of the service agreement are between the start and end date (Start Date 01/01//2025) and the end date (01/01/2026) .... the default data is today... but if the user tries to create a txn in the past, then this must be = to or greater then the contract start date. It cannot be less. Also, if a transactipon is created after 01/01/2026 then this is also not allowed. I am not sure how to prevent this, but please have a think and let  meknow what options you have before we code!
F Lets focus a little on editting of TXN. When a user deits a TXN, this has an impact back on that residents contract totals. When editting a TXN, the same behaviours need to apply as thoise that apply when creatinging the tXN. What i mean is that the run time formual for amount calculation needs to apply. SO in edit mode, the user can edit service ccode ( this doesnt really impact the contract, this is fine). The user can edit date of delivery, but again, this data cannot be outisde of the boundaries of the contract (start date > end date) of the agreement from which it draws down. So there may need to be a similar patten here that we deployed on txn creation, perhaps an even simpler flow here? ( keep it super simple) Quantity can be editted butß changing this is now touching the Amount calculation, and this should display in runtime. The formula again is amount = QTY * Unit price = total, therefore, touching qty or unit price will immediately affect the amount. The users can only edit quantity or unit proce but not qty. NOte can be updated.
G. When i create a TXN, i have the option to add a "description" to the description filed. This is great. When i then edit that transaction, i firstly open that TXN and see the filed which was previouosly called "description" now presented but it is called "Note" The desription not text persists, but i wonder if this filed name could please be consistent. Also, without bloating the UI, could we please think of  way to lock down earlier comments (these really matter for auditting i think as we essentially changing MONEY) so allow the user to add comments ( in fact force at least 10 character entry) and then when this change is made, please captire the comment and time stamp. Later we will think about system wide auditting!
H When creating a transaction, please remove the Balance Preview sectrion thing.. i get what it is trying to achieve but please remove this form!
I When a transaction creates and draws down from that residents contract, it would be great of a log of that transaction was visible back on the client record. On the clicnet record, there is a tab called "Transactions" it would be great oif this had benath it, just a list of the transactions for that client. This would be a simple list ( a bit like other lists) has pagination, and is like a minik version of the transactions page, filtered just fpor that participant. You can create or edit or anything , this is just a view of THAT clients transactions. 
J When editting a transaction, it seems like the edit mode cant save without something being in the serice code filed. This is ok, just if you are editting and this is a expected thing for the system to save, throw an erro to inform the user.


