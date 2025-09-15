# Testing Strategy

## Overview

This project uses a comprehensive testing strategy with multiple layers to ensure code quality and reliability.

## Test Types

### 1. Unit Tests (Vitest)
- **Location**: `lib/`, `components/`, `app/api/`
- **Purpose**: Test individual functions, components, and API endpoints in isolation
- **Command**: `pnpm run test`
- **Coverage**: Functions, utilities, API routes, React components

### 2. Integration Tests (Vitest)
- **Location**: `app/api/__tests__/`
- **Purpose**: Test API endpoints with real data flow
- **Command**: `pnpm run test:integration`
- **Coverage**: API routes, database operations, service integrations

### 3. End-to-End Tests (Playwright)
- **Location**: `e2e/`
- **Purpose**: Test complete user workflows through the browser
- **Command**: `pnpm run e2e:headless`
- **Coverage**: User journeys, UI interactions, cross-browser compatibility

## E2E Test Coverage

### Core User Flows
- ✅ **Authentication**: Login validation, error handling, accessibility
- ✅ **House Management**: CRUD operations, form validation, navigation
- ✅ **Resident Management**: Adding residents, data persistence
- ✅ **Funding Contracts**: Complete lifecycle (create → activate → view balance)
- ✅ **Admin Interface**: Sidebar navigation, responsive design

### Quality Assurance
- ✅ **Form Validation**: Required fields, format validation, error messages
- ✅ **Accessibility**: Keyboard navigation, screen reader support, ARIA roles
- ✅ **Responsive Design**: Mobile viewport testing
- ✅ **API Integration**: Server-client data persistence
- ✅ **Error Handling**: Loading states, network errors, validation errors

### Business Logic
- ✅ **Contract Status Transitions**: Draft → Active → Expired/Cancelled
- ✅ **Balance Calculations**: Real-time balance updates, drawdown tracking
- ✅ **Data Integrity**: Unique ID generation, data persistence

## Available Commands

### Unit & Integration Tests
```bash
pnpm run test              # Run all unit tests
pnpm run test:watch        # Run tests in watch mode
pnpm run test:ui           # Run tests with UI
pnpm run test:coverage     # Run tests with coverage report
pnpm run test:unit         # Run only unit tests
pnpm run test:integration  # Run only integration tests
pnpm run test:database     # Run database tests
pnpm run test:performance  # Run performance tests
pnpm run test:migration    # Run migration tests
pnpm run test:all          # Run all test suites
```

### E2E Tests
```bash
pnpm run e2e:headless      # Run E2E tests headlessly (CI)
pnpm run e2e:ui            # Run E2E tests with UI
pnpm run e2e:debug         # Run E2E tests in debug mode
pnpm run e2e:headed        # Run E2E tests with browser visible
pnpm run e2e:report        # Show last test report
```

### Combined Testing
```bash
pnpm run test:full         # Run unit tests + E2E tests
```

## CI/CD Integration

### GitHub Actions Workflows

#### 1. Check Workflow (PRs)
- **Triggers**: Push to main/develop, PRs
- **Steps**:
  1. Lint check
  2. Format check
  3. Unit & Integration tests
  4. Build application
  5. Install Playwright browsers
  6. Run E2E tests
  7. Storybook tests

#### 2. Playwright Workflow (Main Branches)
- **Triggers**: Push to main/develop
- **Steps**:
  1. Install dependencies
  2. Install Playwright browsers
  3. Run Playwright tests
  4. Upload test reports

## Test Data Management

### E2E Test Data
- Tests create their own data (houses, residents, contracts)
- Data is isolated per test run
- No shared state between tests
- Cleanup handled automatically

### Test Environment
- Uses localhost:3000 for E2E tests
- Supabase environment variables injected
- Slow-mo disabled in CI, enabled locally for debugging

## Best Practices

### Writing E2E Tests
1. **Test user journeys, not implementation details**
2. **Use semantic selectors** (getByRole, getByLabel)
3. **Wait for elements** before interacting
4. **Test error states and edge cases**
5. **Keep tests independent** (no shared state)

### Debugging E2E Tests
1. **Use `pnpm run e2e:debug`** to step through tests
2. **Use `pnpm run e2e:headed`** to see browser actions
3. **Check test reports** with `pnpm run e2e:report`
4. **Use `page.pause()`** in tests for debugging

### Performance Considerations
- E2E tests run in parallel by default
- CI uses single worker to avoid resource conflicts
- Tests include proper timeouts and retries
- Browser installation cached in CI

## Coverage Goals

- **Unit Tests**: >80% code coverage
- **E2E Tests**: Cover all critical user paths
- **Integration Tests**: Cover all API endpoints
- **Accessibility**: All interactive elements tested

## Troubleshooting

### Common Issues
1. **Flaky tests**: Add proper waits, use stable selectors
2. **Timeout errors**: Increase timeout, check for slow operations
3. **Browser issues**: Update Playwright, check browser installation
4. **Environment issues**: Verify environment variables, check localhost availability

### Getting Help
- Check Playwright documentation: https://playwright.dev/
- Review test reports in `playwright-report/`
- Use debug mode for step-by-step debugging
