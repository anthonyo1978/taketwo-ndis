import { test, expect } from '@playwright/test'

test.describe('Houses with Supabase', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to houses page
    await page.goto('/houses')
  })

  test('should display houses from Supabase', async ({ page }) => {
    // Wait for the page to load
    await page.waitForLoadState('networkidle')
    
    // Check if houses are displayed
    const housesList = page.locator('[data-testid="houses-list"]')
    await expect(housesList).toBeVisible()
    
    // Check if we can see at least one house (or empty state)
    const houseItems = page.locator('[data-testid="house-item"]')
    const count = await houseItems.count()
    
    if (count > 0) {
      // If houses exist, check the first one
      const firstHouse = houseItems.first()
      await expect(firstHouse).toBeVisible()
    } else {
      // If no houses, check for empty state
      const emptyState = page.locator('[data-testid="empty-houses"]')
      await expect(emptyState).toBeVisible()
    }
  })

  test('should create a new house via Supabase', async ({ page }) => {
    // Click the "Add House" button
    await page.click('[data-testid="add-house-button"]')
    
    // Wait for the form to appear
    await page.waitForSelector('[data-testid="house-form"]')
    
    // Fill in the form
    await page.fill('[data-testid="address1-input"]', '123 Supabase St')
    await page.fill('[data-testid="suburb-input"]', 'Test City')
    await page.selectOption('[data-testid="state-select"]', 'NSW')
    await page.fill('[data-testid="postcode-input"]', '2000')
    
    // Submit the form
    await page.click('[data-testid="submit-house-button"]')
    
    // Wait for success message or redirect
    await page.waitForSelector('[data-testid="success-message"]', { timeout: 10000 })
    
    // Verify the house was created
    const successMessage = page.locator('[data-testid="success-message"]')
    await expect(successMessage).toContainText('House created successfully')
  })

  test('should edit an existing house', async ({ page }) => {
    // First, create a house if none exist
    const houseItems = page.locator('[data-testid="house-item"]')
    const count = await houseItems.count()
    
    if (count === 0) {
      // Create a house first
      await page.click('[data-testid="add-house-button"]')
      await page.waitForSelector('[data-testid="house-form"]')
      
      await page.fill('[data-testid="address1-input"]', '123 Edit Test St')
      await page.fill('[data-testid="suburb-input"]', 'Edit City')
      await page.selectOption('[data-testid="state-select"]', 'NSW')
      await page.fill('[data-testid="postcode-input"]', '2000')
      await page.click('[data-testid="submit-house-button"]')
      
      await page.waitForSelector('[data-testid="success-message"]')
    }
    
    // Now edit the first house
    const firstHouse = houseItems.first()
    await firstHouse.click()
    
    // Wait for edit form
    await page.waitForSelector('[data-testid="edit-house-form"]')
    
    // Update the address
    await page.fill('[data-testid="address1-input"]', '456 Updated St')
    
    // Submit the update
    await page.click('[data-testid="update-house-button"]')
    
    // Verify the update
    await page.waitForSelector('[data-testid="success-message"]')
    const successMessage = page.locator('[data-testid="success-message"]')
    await expect(successMessage).toContainText('House updated successfully')
  })

  test('should delete a house', async ({ page }) => {
    // First, create a house if none exist
    const houseItems = page.locator('[data-testid="house-item"]')
    const count = await houseItems.count()
    
    if (count === 0) {
      // Create a house first
      await page.click('[data-testid="add-house-button"]')
      await page.waitForSelector('[data-testid="house-form"]')
      
      await page.fill('[data-testid="address1-input"]', '123 Delete Test St')
      await page.fill('[data-testid="suburb-input"]', 'Delete City')
      await page.selectOption('[data-testid="state-select"]', 'NSW')
      await page.fill('[data-testid="postcode-input"]', '2000')
      await page.click('[data-testid="submit-house-button"]')
      
      await page.waitForSelector('[data-testid="success-message"]')
    }
    
    // Now delete the first house
    const firstHouse = houseItems.first()
    await firstHouse.hover()
    
    // Click the delete button
    await page.click('[data-testid="delete-house-button"]')
    
    // Confirm deletion
    await page.click('[data-testid="confirm-delete-button"]')
    
    // Verify deletion
    await page.waitForSelector('[data-testid="success-message"]')
    const successMessage = page.locator('[data-testid="success-message"]')
    await expect(successMessage).toContainText('House deleted successfully')
  })
})
