import { test, expect } from '@playwright/test';

test.describe('Wins Financial Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the wins page
    await page.goto('/wins');
    
    // Wait for authentication if needed
    await page.waitForLoadState('networkidle');
    
    // Skip login if already authenticated
    const isLoggedIn = await page.locator('[data-testid="user-menu"]').isVisible();
    if (!isLoggedIn) {
      await page.click('text=Sign In');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/wins');
    }
  });

  test('should display financial overview dashboard', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Financial Overview');
    await expect(page.locator('[data-testid="total-income"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-expenses"]')).toBeVisible();
    await expect(page.locator('[data-testid="net-savings"]')).toBeVisible();
  });

  test('should add a new expense', async ({ page }) => {
    // Navigate to expenses section
    await page.click('text=Expenses');
    
    // Open add expense form
    await page.click('[data-testid="add-expense-button"]');
    
    // Fill expense form
    await page.fill('[data-testid="expense-amount"]', '25.50');
    await page.selectOption('[data-testid="expense-category"]', 'Food');
    await page.fill('[data-testid="expense-description"]', 'Coffee and snacks');
    
    // Submit form
    await page.click('[data-testid="save-expense-button"]');
    
    // Verify expense was added
    await expect(page.locator('text=Coffee and snacks')).toBeVisible();
    await expect(page.locator('text=$25.50')).toBeVisible();
  });

  test('should add a new income entry', async ({ page }) => {
    // Navigate to income section
    await page.click('text=Income');
    
    // Open add income form
    await page.click('[data-testid="add-income-button"]');
    
    // Fill income form
    await page.fill('[data-testid="income-amount"]', '2500.00');
    await page.selectOption('[data-testid="income-source"]', 'Salary');
    await page.fill('[data-testid="income-description"]', 'Monthly salary');
    
    // Submit form
    await page.click('[data-testid="save-income-button"]');
    
    // Verify income was added
    await expect(page.locator('text=Monthly salary')).toBeVisible();
    await expect(page.locator('text=$2,500.00')).toBeVisible();
  });

  test('should create and manage budgets', async ({ page }) => {
    // Navigate to budgets section
    await page.click('text=Budgets');
    
    // Create new budget
    await page.click('[data-testid="create-budget-button"]');
    
    // Fill budget form
    await page.fill('[data-testid="budget-name"]', 'Monthly Food Budget');
    await page.selectOption('[data-testid="budget-category"]', 'Food');
    await page.fill('[data-testid="budget-amount"]', '400.00');
    
    // Submit form
    await page.click('[data-testid="save-budget-button"]');
    
    // Verify budget was created
    await expect(page.locator('text=Monthly Food Budget')).toBeVisible();
    await expect(page.locator('[data-testid="budget-progress"]')).toBeVisible();
  });

  test('should display expense breakdown chart', async ({ page }) => {
    await expect(page.locator('[data-testid="expense-chart"]')).toBeVisible();
    
    // Verify chart has data
    await expect(page.locator('[data-testid="chart-legend"]')).toBeVisible();
    await expect(page.locator('[data-testid="chart-data"]')).toHaveCount({ min: 1 });
  });

  test('should show PAM financial insights', async ({ page }) => {
    await expect(page.locator('[data-testid="pam-insights"]')).toBeVisible();
    await expect(page.locator('text=PAM Recommendations')).toBeVisible();
    
    // Click on PAM insight
    await page.click('[data-testid="pam-insight-card"]').first();
    await expect(page.locator('[data-testid="insight-details"]')).toBeVisible();
  });

  test('should filter transactions by date range', async ({ page }) => {
    // Open date filter
    await page.click('[data-testid="date-filter-button"]');
    
    // Set date range
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-12-31');
    
    // Apply filter
    await page.click('[data-testid="apply-filter-button"]');
    
    // Verify filtered results
    await expect(page.locator('[data-testid="transaction-list"] > div')).toHaveCount({ min: 1 });
  });

  test('should export financial data', async ({ page }) => {
    // Open export menu
    await page.click('[data-testid="export-button"]');
    
    // Select export format
    await page.click('text=Export as CSV');
    
    // Verify download initiated
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="confirm-export-button"]');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('should handle mobile responsive layout', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify mobile navigation
    await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible();
    
    // Open mobile menu
    await page.click('[data-testid="mobile-menu-toggle"]');
    await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
    
    // Verify cards stack vertically
    const cards = page.locator('[data-testid="overview-card"]');
    const firstCard = await cards.first().boundingBox();
    const secondCard = await cards.nth(1).boundingBox();
    
    expect(firstCard?.y).toBeLessThan(secondCard?.y || 0);
  });

  test('should integrate with PAM for expense categorization', async ({ page }) => {
    // Add expense with unclear category
    await page.click('text=Expenses');
    await page.click('[data-testid="add-expense-button"]');
    
    await page.fill('[data-testid="expense-amount"]', '45.00');
    await page.fill('[data-testid="expense-description"]', 'Uber ride to airport');
    
    // Trigger PAM categorization
    await page.click('[data-testid="ask-pam-categorize"]');
    
    // Verify PAM suggestion
    await expect(page.locator('[data-testid="pam-category-suggestion"]')).toBeVisible();
    await expect(page.locator('text=Transport')).toBeVisible();
    
    // Accept PAM suggestion
    await page.click('[data-testid="accept-pam-suggestion"]');
    
    // Verify category was set
    await expect(page.locator('[data-testid="expense-category"]')).toHaveValue('Transport');
  });
});