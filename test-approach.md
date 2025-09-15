# 🧪 Test Approach & Strategy

## 📋 Overview

This document outlines our comprehensive testing strategy for the TakeTwo application. We use a multi-layered approach to ensure code quality, reliability, and maintainability.

## 🏗️ Testing Pyramid

### **1. Unit Tests (Mocked) - Foundation**
- **Purpose**: Test individual functions in isolation
- **Speed**: ⚡ Very fast (milliseconds)
- **Scope**: Single function/component
- **Data**: Mocked data
- **Location**: `app/api/__tests__/`, `components/__tests__/`, `lib/__tests__/`
- **Example**: API route logic, validation, error handling

### **2. Integration Tests (Real DB) - Middle Layer**
- **Purpose**: Test how components work together
- **Speed**: 🐌 Slower (seconds)
- **Scope**: Multiple components + real database
- **Data**: Real database with test data
- **Location**: `tests/integration/` (to be created)
- **Example**: Full API flow with real Supabase calls

### **3. E2E Tests (Real Everything) - Top Layer**
- **Purpose**: Test complete user workflows
- **Speed**: 🐌🐌 Slowest (minutes)
- **Scope**: Entire application
- **Data**: Real database + real UI
- **Location**: `e2e/` (existing)
- **Example**: User clicks "Houses" → sees houses list → creates new house

## 🎯 Test Coverage Goals

### **Current Status (Updated 2024-01-XX)**
- **Unit Tests**: 289 passing, 59 failing, 10 skipped (80.7% pass rate)
- **E2E Tests**: 15 test files, comprehensive coverage but web server issues
- **Integration Tests**: 0% coverage (to be implemented)
- **Next.js 15 Compatibility**: ✅ Fixed cookies() API issue

### **Target Coverage** 
- **Unit Tests**: 90%+ coverage for critical paths
- **Integration Tests**: 80%+ coverage for API endpoints
- **E2E Tests**: 70%+ coverage for user workflows

## 📁 Test Structure

```
taketwo-main/
├── app/api/__tests__/           # Unit tests for API routes
├── components/__tests__/        # Unit tests for React components
├── lib/__tests__/              # Unit tests for utilities
├── tests/integration/          # Integration tests (to be created)
│   ├── api/
│   │   ├── houses.test.ts
│   │   ├── residents.test.ts
│   │   └── transactions.test.ts
│   ├── database/
│   │   ├── houses.test.ts
│   │   └── residents.test.ts
│   └── services/
│       ├── house-service.test.ts
│       └── resident-service.test.ts
└── e2e/                        # E2E tests (existing)
    ├── houses-supabase.spec.ts
    ├── residents-ui-simple.spec.ts
    └── ...
```

## 🔧 Unit Testing Strategy

### **Mocking Approach**
- **Service Layer**: Mock Supabase services, not the database
- **External APIs**: Mock all external dependencies
- **Browser APIs**: Mock localStorage, fetch, etc.

### **Supabase Services Testing Strategy**
- **Purpose**: Test the data layer and database operations in isolation
- **Scope**: CRUD operations, data transformation, error handling
- **Mocking**: Mock Supabase client calls, not the actual database
- **Focus Areas**:
  - **Data Transformation**: snake_case ↔ camelCase conversion
  - **Query Building**: Supabase query chains (`.from()`, `.select()`, `.where()`)
  - **Error Handling**: Database errors, constraint violations, not found scenarios
  - **Field Mapping**: Ensure all fields are correctly mapped between formats
  - **Date Handling**: Timestamp conversion and date object creation
  - **Business Logic**: Status transitions, validation rules, default values

### **Test Data Strategy**
- **Predictable**: Always use the same test data
- **Edge Cases**: Test unusual scenarios (0 records, 200+ records, long names)
- **Isolation**: Each test is independent

### **Example Unit Test Structure**
```typescript
describe('Houses API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/houses', () => {
    it('should return all houses', async () => {
      const mockHouses = [
        { id: '1', address1: '123 Test St', suburb: 'Test City' }
      ]
      vi.mocked(houseService.getAll).mockResolvedValue(mockHouses)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true, data: mockHouses })
    })

    it('should handle empty state', async () => {
      vi.mocked(houseService.getAll).mockResolvedValue([])
      
      const response = await GET()
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.data).toEqual([])
    })

    it('should handle large datasets', async () => {
      const mockHouses = Array.from({ length: 200 }, (_, i) => ({
        id: `house-${i}`,
        address1: `123 Test St ${i}`,
        suburb: 'Test City'
      }))
      
      vi.mocked(houseService.getAll).mockResolvedValue(mockHouses)
      
      const response = await GET()
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.data).toHaveLength(200)
    })
  })
})
```

## 🔗 Integration Testing Strategy

### **Real Database Testing**
- **Test Database**: Use separate test Supabase instance
- **Data Cleanup**: Clean database before each test
- **Test Data**: Create realistic test data
- **Isolation**: Each test is independent

### **Integration Test Example**
```typescript
describe('Houses API Integration Tests', () => {
  beforeEach(async () => {
    await cleanHousesTable()
  })

  it('should create and retrieve real houses from Supabase', async () => {
    const houseData = {
      address1: '123 Integration St',
      suburb: 'Test City',
      state: 'NSW',
      postcode: '2000',
      country: 'AU',
      status: 'Active',
      goLiveDate: new Date('2024-01-01')
    }

    const createResponse = await fetch('/api/houses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(houseData)
    })

    expect(createResponse.status).toBe(201)
    const createdHouse = await createResponse.json()

    const getResponse = await fetch('/api/houses')
    const houses = await getResponse.json()
    
    expect(houses.data).toContainEqual(
      expect.objectContaining({
        address1: '123 Integration St',
        suburb: 'Test City'
      })
    )
  })
})
```

## 🎭 E2E Testing Strategy

### **User Workflow Testing**
- **Real Browser**: Use Playwright for browser automation
- **Real Data**: Use real database with test data
- **User Scenarios**: Test complete user journeys

### **E2E Test Example**
```typescript
test('User can create and view houses', async ({ page }) => {
  await page.goto('/houses')
  
  // Click "Add New House"
  await page.click('text=Add New House')
  
  // Fill out form
  await page.fill('input[name="address1"]', '123 E2E Test St')
  await page.fill('input[name="suburb"]', 'E2E City')
  await page.selectOption('select[name="state"]', 'NSW')
  await page.fill('input[name="postcode"]', '2000')
  
  // Submit form
  await page.click('button[type="submit"]')
  
  // Verify house appears in list
  await expect(page.locator('text=123 E2E Test St')).toBeVisible()
})
```

## 📊 Test Coverage Areas

### **API Routes (0% → 90% target)**
- **Houses API**: GET, POST, PUT, DELETE
- **Residents API**: GET, POST, PUT, DELETE
- **Transactions API**: GET, POST, PUT, DELETE
- **Error Handling**: Validation, network errors, server errors
- **Response Format**: Consistent JSON structure

### **React Components (Low → 80% target)**
- **UI Components**: Button, Input, Dialog, Tabs
- **Business Components**: HouseForm, ResidentForm, StatusManager
- **User Interactions**: Click, type, submit, validation
- **State Management**: Loading, error, success states

### **Utilities (90%+ current)**
- **ID Generators**: House, resident, transaction IDs
- **Calculations**: Funding calculations, balance updates
- **Validation**: Schema validation, data sanitization
- **Storage**: localStorage utilities, data persistence

## 🚀 Implementation Plan

### **Phase 1: Fix Failing Unit Tests** ✅
- [x] Fix StatusManager dialog accessibility issues
- [x] Fix localStorage mock setup problems
- [x] Fix API test response format mismatches
- [x] Fix migration test mock configuration issues
- [x] Fix Next.js 15 cookies() API compatibility
- [x] Fix ResidentForm loading states and text matching
- [x] Fix ResidentTable loading skeleton and text matching
- [x] Add comprehensive API route tests (houses, residents, transactions)

### **Phase 2: Expand Unit Test Coverage** 🔄
- [x] Add comprehensive API route tests (houses, residents, transactions)
- [ ] Fix remaining component test issues (FundingManager, ResidentAvatars)
- [ ] Add utility function tests
- [ ] Add edge case testing

### **Phase 3: Integration Tests** 📋
- [ ] Create integration test structure
- [ ] Add API integration tests
- [ ] Add database integration tests
- [ ] Add service integration tests

### **Phase 4: E2E Test Improvements** 📋
- [ ] Fix failing E2E tests
- [ ] Add new user workflow tests
- [ ] Improve test reliability
- [ ] Add cross-browser testing

## 🛠️ Tools & Configuration

### **Testing Tools**
- **Unit Tests**: Vitest + React Testing Library
- **Integration Tests**: Vitest + Real Supabase
- **E2E Tests**: Playwright
- **Coverage**: Vitest coverage reports

### **Configuration Files**
- `vitest.config.mjs` - Unit test configuration
- `playwright.config.ts` - E2E test configuration
- `vitest.setup.ts` - Global test setup

### **Test Commands**
```bash
# Unit tests
pnpm vitest --config vitest.config.mjs --run

# Unit tests with coverage
pnpm vitest --config vitest.config.mjs --run --coverage

# E2E tests
pnpm playwright test

# Integration tests (future)
pnpm vitest --config vitest.integration.config.mjs --run
```

## 🏥 Testing Health Check (Current Status)

### **Unit Tests Health**
- **Pass Rate**: 80.7% (289/358 tests passing)
- **Critical Issues**: 59 failing tests
- **Main Problem Areas**:
  - **FundingManager**: Text matching and validation issues
  - **ResidentAvatars**: Initials display (expecting "JD" but getting "J S")
  - **Component Accessibility**: Some form elements missing proper labels
- **Strengths**: API route tests comprehensive, core functionality working

### **E2E Tests Health**
- **Coverage**: 15 comprehensive test files
- **Issues**: Web server configuration problems preventing execution
- **Strengths**: Complete user workflow coverage, real database integration
- **Test Areas**: Login, Houses CRUD, Residents management, Funding contracts, Drawing down workflows

### **Integration Tests Health**
- **Status**: Not implemented yet
- **Priority**: Medium (after fixing unit test issues)

## 📈 Success Metrics

### **Quality Metrics**
- **Test Coverage**: 90%+ for critical paths
- **Test Speed**: Unit tests < 1s, Integration < 10s, E2E < 60s
- **Test Reliability**: 95%+ pass rate
- **Bug Detection**: Catch 90%+ of bugs before production

### **Maintenance Metrics**
- **Test Maintenance**: Easy to update and extend
- **Test Clarity**: Clear, readable test code
- **Test Documentation**: Well-documented test approach
- **Test Automation**: Automated test execution

## 🎯 Immediate Recommendations

### **Before Committing to Master**
1. **Fix Critical Unit Test Issues** (Priority: High)
   - Fix FundingManager text matching issues
   - Fix ResidentAvatars initials display
   - Add proper form labels for accessibility

2. **Resolve E2E Test Configuration** (Priority: Medium)
   - Fix web server port configuration
   - Ensure E2E tests can run reliably

3. **Document Known Issues** (Priority: Low)
   - Create issue tracking for remaining test failures
   - Document workarounds for complex test scenarios

### **Post-Commit Improvements**
1. **Add Integration Tests** (Priority: Medium)
   - Create real database integration tests
   - Test API endpoints with actual Supabase calls

2. **Enhance Test Coverage** (Priority: Low)
   - Add utility function tests
   - Add edge case testing
   - Improve component test coverage

## 🔄 Continuous Improvement

### **Regular Reviews**
- **Weekly**: Review test coverage and failures
- **Monthly**: Update test strategy and approach
- **Quarterly**: Evaluate testing tools and processes

### **Learning & Updates**
- **New Patterns**: Document new testing patterns
- **Best Practices**: Update with industry best practices
- **Tool Updates**: Keep testing tools up to date
- **Team Training**: Share knowledge and techniques

---

## 📝 Notes & Updates

### **Recent Updates**
- **2024-01-XX**: Created initial test approach document
- **2024-01-XX**: Fixed 20 failing unit tests
- **2024-01-XX**: Improved test coverage from 65% to 75%

### **Future Considerations**
- **Performance Testing**: Add performance benchmarks
- **Security Testing**: Add security test cases
- **Accessibility Testing**: Add a11y test coverage
- **Mobile Testing**: Add mobile-specific E2E tests

---

*This document is a living guide that will be updated as we learn and improve our testing strategy.*
