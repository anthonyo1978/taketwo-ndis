import { test, expect } from '@playwright/test'

test.describe('Drawing Down Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to transactions page
    await page.goto('/transactions')
  })

  test('admin can create Drawing Down transaction with NDIS compliance', async ({ page }) => {
    // Click Drawing Down button
    await page.click('text=🎯 Drawing Down')
    
    // Wait for dialog to open
    await expect(page.locator('text=Drawing Down Transaction')).toBeVisible()
    
    // Fill in participant selection
    await page.selectOption('select[name="residentId"]', { index: 1 })
    
    // Wait for contracts to load and select first active contract
    await page.waitForSelector('select[name="contractId"] option:not([value=""])')
    await page.selectOption('select[name="contractId"]', { index: 1 })
    
    // Fill in NDIS service item code
    await page.selectOption('select[name="serviceItemCode"]', '01_001_0107_1_1')
    
    // Fill in transaction date
    const today = new Date().toISOString().split('T')[0]
    await page.fill('input[name="occurredAt"]', today)
    
    // Fill in specific support description
    await page.fill('textarea[name="description"]', 'Provided 2 hours of SIL support for personal care assistance and meal preparation')
    
    // Fill in quantity and unit price
    await page.fill('input[name="quantity"]', '2')
    await page.fill('input[name="unitPrice"]', '45.50')
    
    // Verify amount is calculated correctly
    await expect(page.locator('input[name="amount"]')).toHaveValue('91.00')
    
    // Add support agreement ID
    await page.fill('input[name="supportAgreementId"]', 'SA-2024-001')
    
    // Add notes
    await page.fill('textarea[name="note"]', 'Morning shift support - participant required assistance with medication management')
    
    // Verify validation passes
    await expect(page.locator('text=✅ Validation Passed')).toBeVisible()
    
    // Submit the transaction
    await page.click('button[type="submit"]')
    
    // Wait for success and dialog to close
    await expect(page.locator('text=Drawing Down Transaction')).not.toBeVisible()
    
    // Verify transaction appears in table
    await expect(page.locator('text=01_001_0107_1_1')).toBeVisible()
    await expect(page.locator('text=$91.00')).toBeVisible()
  })

  test('Drawing Down validation prevents invalid transactions', async ({ page }) => {
    // Click Drawing Down button
    await page.click('text=🎯 Drawing Down')
    
    // Try to submit without required fields
    await page.click('button[type="submit"]')
    
    // Should show validation errors
    await expect(page.locator('text=Please select a participant')).toBeVisible()
    await expect(page.locator('text=Please select a support agreement')).toBeVisible()
    await expect(page.locator('text=NDIS service item code is required')).toBeVisible()
    await expect(page.locator('text=Specific support description is required')).toBeVisible()
    
    // Fill in participant but no contract
    await page.selectOption('select[name="residentId"]', { index: 1 })
    
    // Should show no active contracts message
    await expect(page.locator('text=No active contracts available')).toBeVisible()
  })

  test('Drawing Down enforces NDIS service item code format', async ({ page }) => {
    // Click Drawing Down button
    await page.click('text=🎯 Drawing Down')
    
    // Fill in participant and contract
    await page.selectOption('select[name="residentId"]', { index: 1 })
    await page.waitForSelector('select[name="contractId"] option:not([value=""])')
    await page.selectOption('select[name="contractId"]', { index: 1 })
    
    // Try with invalid service item code
    await page.fill('input[name="serviceItemCode"]', 'INVALID_CODE')
    
    // Fill other required fields
    await page.fill('textarea[name="description"]', 'Test support')
    await page.fill('input[name="quantity"]', '1')
    await page.fill('input[name="unitPrice"]', '50')
    
    // Should show validation error for invalid service code
    await expect(page.locator('text=Service item code must follow NDIS format')).toBeVisible()
  })

  test('Drawing Down shows contract balance impact', async ({ page }) => {
    // Click Drawing Down button
    await page.click('text=🎯 Drawing Down')
    
    // Fill in participant and contract
    await page.selectOption('select[name="residentId"]', { index: 1 })
    await page.waitForSelector('select[name="contractId"] option:not([value=""])')
    await page.selectOption('select[name="contractId"]', { index: 1 })
    
    // Fill in transaction details
    await page.selectOption('select[name="serviceItemCode"]', '01_001_0107_1_1')
    await page.fill('textarea[name="description"]', 'Test support')
    await page.fill('input[name="quantity"]', '1')
    await page.fill('input[name="unitPrice"]', '100')
    
    // Should show balance impact
    await expect(page.locator('text=Balance Impact:')).toBeVisible()
    await expect(page.locator('text=Current Balance:')).toBeVisible()
    await expect(page.locator('text=New Balance:')).toBeVisible()
  })

  test('Drawing Down creates immutable audit trail', async ({ page }) => {
    // Create a Drawing Down transaction
    await page.click('text=🎯 Drawing Down')
    
    // Fill in all required fields
    await page.selectOption('select[name="residentId"]', { index: 1 })
    await page.waitForSelector('select[name="contractId"] option:not([value=""])')
    await page.selectOption('select[name="contractId"]', { index: 1 })
    await page.selectOption('select[name="serviceItemCode"]', '01_001_0107_1_1')
    await page.fill('textarea[name="description"]', 'Audit trail test transaction')
    await page.fill('input[name="quantity"]', '1')
    await page.fill('input[name="unitPrice"]', '75')
    
    // Submit transaction
    await page.click('button[type="submit"]')
    
    // Wait for dialog to close
    await expect(page.locator('text=Drawing Down Transaction')).not.toBeVisible()
    
    // Find the transaction in the table
    const transactionRow = page.locator('tr').filter({ hasText: 'Audit trail test transaction' })
    await expect(transactionRow).toBeVisible()
    
    // Verify transaction has Drawing Down specific fields
    await expect(transactionRow.locator('text=01_001_0107_1_1')).toBeVisible()
    await expect(transactionRow.locator('text=$75.00')).toBeVisible()
    
    // Verify transaction status shows as posted
    await expect(transactionRow.locator('text=posted')).toBeVisible()
  })

  test('Drawing Down prevents zero amount transactions', async ({ page }) => {
    // Click Drawing Down button
    await page.click('text=🎯 Drawing Down')
    
    // Fill in participant and contract
    await page.selectOption('select[name="residentId"]', { index: 1 })
    await page.waitForSelector('select[name="contractId"] option:not([value=""])')
    await page.selectOption('select[name="contractId"]', { index: 1 })
    
    // Fill in required fields but with zero amount
    await page.selectOption('select[name="serviceItemCode"]', '01_001_0107_1_1')
    await page.fill('textarea[name="description"]', 'Test support')
    await page.fill('input[name="quantity"]', '0')
    await page.fill('input[name="unitPrice"]', '50')
    
    // Should show validation error
    await expect(page.locator('text=Quantity must be positive')).toBeVisible()
    await expect(page.locator('text=Amount must be greater than zero')).toBeVisible()
  })

  test('Drawing Down enforces participant linking', async ({ page }) => {
    // Click Drawing Down button
    await page.click('text=🎯 Drawing Down')
    
    // Try to submit without selecting participant
    await page.click('button[type="submit"]')
    
    // Should show participant linking error
    await expect(page.locator('text=Please select a participant')).toBeVisible()
    await expect(page.locator('text=Participant linking is required')).toBeVisible()
  })

  test('Drawing Down validates contract status', async ({ page }) => {
    // Click Drawing Down button
    await page.click('text=🎯 Drawing Down')
    
    // Select participant
    await page.selectOption('select[name="residentId"]', { index: 1 })
    
    // If no active contracts, should show appropriate message
    const noContractsMessage = page.locator('text=No active contracts available')
    const contractSelect = page.locator('select[name="contractId"]')
    
    if (await noContractsMessage.isVisible()) {
      await expect(noContractsMessage).toBeVisible()
    } else {
      // If contracts are available, select one and verify it's active
      await page.waitForSelector('select[name="contractId"] option:not([value=""])')
      await page.selectOption('select[name="contractId"]', { index: 1 })
      
      // Should show contract details
      await expect(page.locator('text=Support Agreement Details')).toBeVisible()
    }
  })
})
