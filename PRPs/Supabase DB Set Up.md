# Supabase Database Migration Plan

## Overview
This document outlines the complete migration strategy from localStorage to Supabase PostgreSQL database for the NDIS Drawing Down transaction management system.

## Current State Analysis

### Data Storage
- **Current**: localStorage (client-side only)
- **Data Types**: Houses, Residents, Transactions, Funding Contracts
- **Issues**:
  - Server-side API routes can't access localStorage
  - Data not persistent across devices
  - No data relationships/constraints
  - Limited scalability
  - No real-time updates

### Data Structures to Migrate
1. **Houses** (`types/house.ts`)
2. **Residents** (`types/resident.ts`) 
3. **Transactions** (`types/transaction.ts`)
4. **Funding Contracts** (nested in residents)

## Supabase Benefits for NDIS App

### Core Features
- ✅ **PostgreSQL Database**: Full relational database with ACID compliance
- ✅ **Real-time Subscriptions**: Live updates for transaction status changes
- ✅ **Built-in Auth**: User management and role-based access
- ✅ **Auto-generated APIs**: REST and GraphQL APIs
- ✅ **Row Level Security**: Database-level security for NDIS compliance
- ✅ **Dashboard**: Visual database management
- ✅ **Edge Functions**: Serverless functions for complex logic
- ✅ **Storage**: File storage for NDIS documents

### NDIS-Specific Advantages
- 🔐 **Security**: Row-level security for participant data protection
- 📊 **Audit Trails**: Immutable transaction history
- ⚡ **Real-time**: Live balance updates and notifications
- 👥 **Multi-user**: Support for multiple staff members
- 📈 **Reporting**: Complex queries for NDIS reporting
- 🔄 **Migrations**: Easy schema evolution

## Migration Phases

### Phase 1: Supabase Project Setup
1. **Create Supabase Account**
   - Sign up at supabase.com
   - Create new project: `taketwo-ndis`
   - Choose region (Australia for NDIS compliance)

2. **Install Dependencies**
   ```bash
   pnpm add @supabase/supabase-js @supabase/auth-helpers-nextjs
   pnpm add -D @supabase/cli
   ```

3. **Environment Variables**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **Supabase Client Setup**
   - Create `lib/supabase/client.ts`
   - Create `lib/supabase/server.ts`
   - Create `lib/supabase/middleware.ts`

### Phase 2: Database Schema Design

#### Core Tables
```sql
-- Houses table
CREATE TABLE houses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address1 TEXT NOT NULL,
  address2 TEXT,
  suburb TEXT NOT NULL,
  state TEXT NOT NULL,
  postcode TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Residents table
CREATE TABLE residents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID REFERENCES houses(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  ndis_number TEXT UNIQUE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Funding contracts table
CREATE TABLE funding_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID REFERENCES residents(id) ON DELETE CASCADE,
  contract_type TEXT NOT NULL,
  contract_status TEXT DEFAULT 'draft',
  original_amount DECIMAL(10,2) NOT NULL,
  current_balance DECIMAL(10,2) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  auto_drawdown BOOLEAN DEFAULT false,
  drawdown_rate DECIMAL(5,2),
  daily_support_item_cost DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID REFERENCES residents(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES funding_contracts(id) ON DELETE CASCADE,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
  service_code TEXT NOT NULL,
  service_item_code TEXT,
  description TEXT,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'draft',
  drawdown_status TEXT,
  note TEXT,
  support_agreement_id TEXT,
  participant_id UUID REFERENCES residents(id),
  is_drawdown_transaction BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT NOT NULL,
  posted_at TIMESTAMP WITH TIME ZONE,
  posted_by TEXT,
  voided_at TIMESTAMP WITH TIME ZONE,
  voided_by TEXT,
  void_reason TEXT
);

-- Transaction audit trail
CREATE TABLE transaction_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT NOT NULL,
  user_email TEXT,
  reason TEXT
);

-- Drawdown validation
CREATE TABLE drawdown_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  is_valid BOOLEAN NOT NULL,
  validation_errors TEXT[],
  validated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  validated_by TEXT NOT NULL
);
```

#### Indexes for Performance
```sql
-- Performance indexes
CREATE INDEX idx_residents_house_id ON residents(house_id);
CREATE INDEX idx_funding_contracts_resident_id ON funding_contracts(resident_id);
CREATE INDEX idx_transactions_resident_id ON transactions(resident_id);
CREATE INDEX idx_transactions_contract_id ON transactions(contract_id);
CREATE INDEX idx_transactions_occurred_at ON transactions(occurred_at);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transaction_audit_transaction_id ON transaction_audit_trail(transaction_id);
```

#### Row Level Security (RLS)
```sql
-- Enable RLS
ALTER TABLE houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE funding_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawdown_validations ENABLE ROW LEVEL SECURITY;

-- RLS Policies (example - adjust based on auth requirements)
CREATE POLICY "Users can view all houses" ON houses FOR SELECT USING (true);
CREATE POLICY "Users can view all residents" ON residents FOR SELECT USING (true);
CREATE POLICY "Users can view all transactions" ON transactions FOR SELECT USING (true);
-- Add more policies as needed
```

### Phase 3: Data Migration Strategy

#### Migration Scripts
1. **Export localStorage Data**
   - Create utility to export existing data
   - Validate data integrity
   - Handle data transformation

2. **Import to Supabase**
   - Batch insert operations
   - Handle foreign key relationships
   - Preserve data integrity

3. **Data Validation**
   - Verify all data migrated correctly
   - Check relationships
   - Validate constraints

#### Migration Utilities
```typescript
// lib/migration/localStorage-to-supabase.ts
export class LocalStorageToSupabaseMigration {
  async exportLocalStorageData() {
    // Export houses, residents, transactions
  }
  
  async importToSupabase(data: ExportedData) {
    // Import with proper relationships
  }
  
  async validateMigration() {
    // Verify data integrity
  }
}
```

### Phase 4: API Layer Refactor

#### Replace localStorage Functions
1. **House Storage** (`lib/utils/house-storage.ts`)
   - Replace with Supabase queries
   - Add error handling
   - Maintain same interface

2. **Resident Storage** (`lib/utils/resident-storage.ts`)
   - Replace with Supabase queries
   - Handle funding contracts
   - Add real-time subscriptions

3. **Transaction Storage** (`lib/utils/transaction-storage.ts`)
   - Replace with Supabase queries
   - Add audit trail support
   - Implement Drawing Down validation

#### New Supabase Services
```typescript
// lib/supabase/services/houses.ts
export class HouseService {
  async getAll(): Promise<House[]>
  async getById(id: string): Promise<House | null>
  async create(house: CreateHouseInput): Promise<House>
  async update(id: string, updates: UpdateHouseInput): Promise<House>
  async delete(id: string): Promise<boolean>
}

// lib/supabase/services/residents.ts
export class ResidentService {
  async getAll(): Promise<Resident[]>
  async getById(id: string): Promise<Resident | null>
  async create(resident: CreateResidentInput): Promise<Resident>
  async update(id: string, updates: UpdateResidentInput): Promise<Resident>
  async delete(id: string): Promise<boolean>
  async getFundingContracts(residentId: string): Promise<FundingContract[]>
}

// lib/supabase/services/transactions.ts
export class TransactionService {
  async getAll(filters?: TransactionFilters): Promise<Transaction[]>
  async getById(id: string): Promise<Transaction | null>
  async create(transaction: CreateTransactionInput): Promise<Transaction>
  async update(id: string, updates: UpdateTransactionInput): Promise<Transaction>
  async delete(id: string): Promise<boolean>
  async post(id: string, postedBy: string): Promise<Transaction>
  async void(id: string, voidedBy: string, reason: string): Promise<Transaction>
}
```

### Phase 5: Frontend Updates

#### Remove localStorage Dependencies
1. **Update Components**
   - Replace direct localStorage calls
   - Use new Supabase services
   - Add loading states

2. **Add Real-time Features**
   - Live transaction updates
   - Real-time balance changes
   - Notification system

3. **Error Handling**
   - Network error handling
   - Retry mechanisms
   - User feedback

#### Updated Component Structure
```typescript
// components/houses/HouseForm.tsx
// Before: Direct localStorage calls
const houses = getHousesFromStorage()

// After: Supabase service calls
const { data: houses, loading, error } = useHouses()
```

### Phase 6: Testing & Validation

#### Test Strategy
1. **Unit Tests**
   - Test all Supabase services
   - Test data transformation
   - Test error handling

2. **Integration Tests**
   - Test API endpoints
   - Test real-time subscriptions
   - Test data consistency

3. **E2E Tests**
   - Test complete workflows
   - Test Drawing Down process
   - Test multi-user scenarios

#### Migration Validation
1. **Data Integrity Checks**
   - Compare localStorage vs Supabase data
   - Verify relationships
   - Check constraints

2. **Performance Testing**
   - Query performance
   - Real-time subscription performance
   - Concurrent user testing

## Implementation Timeline

### Week 1: Setup & Schema
- [ ] Create Supabase project
- [ ] Install dependencies
- [ ] Design database schema
- [ ] Create tables and indexes
- [ ] Set up RLS policies

### Week 2: Migration & Services
- [ ] Create migration utilities
- [ ] Build Supabase services
- [ ] Migrate existing data
- [ ] Validate migration

### Week 3: API Refactor
- [ ] Update API routes
- [ ] Replace localStorage functions
- [ ] Add error handling
- [ ] Test API endpoints

### Week 4: Frontend Updates
- [ ] Update components
- [ ] Add real-time features
- [ ] Remove localStorage dependencies
- [ ] Add loading states

### Week 5: Testing & Polish
- [ ] Comprehensive testing
- [ ] Performance optimization
- [ ] Documentation updates
- [ ] Deployment preparation

## Rollback Strategy

### If Migration Fails
1. **Keep localStorage as Backup**
   - Maintain localStorage functions
   - Add feature flag to switch back
   - Gradual migration approach

2. **Data Recovery**
   - Export Supabase data back to localStorage
   - Restore from backup
   - Validate data integrity

3. **Rollback Plan**
   - Revert to localStorage version
   - Fix issues
   - Retry migration

## Success Metrics

### Performance
- [ ] Page load times < 2 seconds
- [ ] Real-time updates < 100ms
- [ ] Database queries < 500ms

### Reliability
- [ ] 99.9% uptime
- [ ] Zero data loss
- [ ] Error rate < 0.1%

### User Experience
- [ ] Seamless migration
- [ ] No functionality loss
- [ ] Improved performance

## Notes & Considerations

### NDIS Compliance
- Ensure all data is properly secured
- Maintain audit trails
- Implement proper access controls
- Regular security audits

### Performance Optimization
- Use database indexes effectively
- Implement query optimization
- Consider caching strategies
- Monitor performance metrics

### Future Enhancements
- Multi-tenant support
- Advanced reporting
- Mobile app integration
- API rate limiting

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Status**: Planning Phase
