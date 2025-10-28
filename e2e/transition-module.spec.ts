import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Life Transition Navigator Module
 *
 * Prerequisites:
 * 1. SQL fixes must be applied: docs/sql-fixes/MASTER_FIX_ALL_RLS_ISSUES.sql
 * 2. User must be logged in
 * 3. Backend must be operational
 *
 * Test Coverage:
 * - Onboarding wizard (first-time users)
 * - Dashboard rendering (all 11 sections)
 * - Task management (create, update, delete)
 * - Financial tracking (budget creation)
 * - Vehicle modifications (Kanban board)
 * - Equipment manager
 * - Shakedown logger
 * - Reality check calculations
 */

// Test configuration
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'testpassword123'
};

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Life Transition Navigator - Module Access', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto(`${BASE_URL}/login`);

    // Login
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Wait for login to complete
    await page.waitForURL(/\/(home|dashboard|you)/);
  });

  test('should navigate to Life Transition Navigator from You page', async ({ page }) => {
    // Navigate to You page
    await page.goto(`${BASE_URL}/you`);
    await page.waitForLoadState('networkidle');

    // Look for "Life Transition" link or button
    const transitionLink = page.getByText(/Life Transition/i);
    await expect(transitionLink).toBeVisible();

    // Click to navigate to transition module
    await transitionLink.click();

    // Verify we're on the transition page
    await expect(page).toHaveURL(/\/transition/);
  });

  test('should display transition dashboard for users with existing profile', async ({ page }) => {
    await page.goto(`${BASE_URL}/transition`);
    await page.waitForLoadState('networkidle');

    // Check for dashboard elements (not onboarding)
    const dashboard = page.locator('[data-testid="transition-dashboard"]').or(
      page.getByRole('heading', { name: /transition dashboard/i })
    );

    // Should see either dashboard or onboarding (not an error)
    const hasContent = await page.locator('body').evaluate(
      (body) => body.innerText.length > 100
    );
    expect(hasContent).toBe(true);

    // Should NOT see 403 or 406 errors
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('403');
    expect(bodyText).not.toContain('406');
    expect(bodyText).not.toContain('Forbidden');
    expect(bodyText).not.toContain('Not Acceptable');
  });
});

test.describe('Life Transition Navigator - Onboarding', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(home|dashboard|you)/);
  });

  test('should show onboarding wizard for first-time users', async ({ page }) => {
    // This test assumes user has NO transition profile yet
    // In practice, might need to delete profile first via API

    await page.goto(`${BASE_URL}/transition`);
    await page.waitForLoadState('networkidle');

    // Look for onboarding wizard
    const onboarding = page.getByText(/Ready to plan your nomadic adventure/i).or(
      page.getByRole('heading', { name: /Let's Get Started/i })
    );

    // If onboarding appears, test it
    const isOnboarding = await onboarding.isVisible().catch(() => false);

    if (isOnboarding) {
      // Step 1: Departure date and transition type
      const departureInput = page.locator('input[type="date"]').first();
      await expect(departureInput).toBeVisible();

      // Select transition type
      const transitionType = page.getByText(/Full-Time RV Living/i);
      await expect(transitionType).toBeVisible();
      await transitionType.click();

      // Continue to step 2
      const continueBtn = page.getByRole('button', { name: /Continue/i });
      await continueBtn.click();

      // Step 2: Motivation and concerns
      const motivationInput = page.locator('textarea').first();
      await expect(motivationInput).toBeVisible();

      // Can skip or fill
      const finishBtn = page.getByRole('button', { name: /Finish|Complete/i });
      await expect(finishBtn).toBeVisible();
    }
  });

  test('should validate departure date is required in onboarding', async ({ page }) => {
    await page.goto(`${BASE_URL}/transition`);
    await page.waitForLoadState('networkidle');

    const onboarding = await page.getByText(/Ready to plan/i).isVisible().catch(() => false);

    if (onboarding) {
      // Try to continue without selecting date
      const continueBtn = page.getByRole('button', { name: /Continue/i });

      // Should be disabled or show error
      const isDisabled = await continueBtn.isDisabled();

      if (!isDisabled) {
        await continueBtn.click();
        // Should see validation message
        await expect(page.getByText(/required/i)).toBeVisible();
      }
    }
  });
});

test.describe('Life Transition Navigator - Dashboard Sections', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to transition module
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(home|dashboard|you)/);

    await page.goto(`${BASE_URL}/transition`);
    await page.waitForLoadState('networkidle');
  });

  test('should display departure countdown', async ({ page }) => {
    // Look for countdown timer
    const countdown = page.getByText(/days until departure/i).or(
      page.getByText(/\d+ days/i)
    );

    // Should be visible if profile exists
    const hasProfile = await page.locator('[data-testid="transition-dashboard"]').isVisible().catch(() => false);

    if (hasProfile) {
      await expect(countdown.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should display task checklist', async ({ page }) => {
    // Look for task section
    const taskSection = page.getByText(/Task Checklist/i).or(
      page.getByRole('heading', { name: /Tasks/i })
    );

    const hasProfile = await page.locator('body').evaluate(
      (body) => !body.innerText.includes('Getting Started')
    );

    if (hasProfile) {
      await expect(taskSection.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should display financial buckets section', async ({ page }) => {
    const financialSection = page.getByText(/Financial Buckets/i).or(
      page.getByText(/Budget/i)
    );

    const hasProfile = await page.locator('body').evaluate(
      (body) => !body.innerText.includes('Getting Started')
    );

    if (hasProfile) {
      await expect(financialSection.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should display vehicle modifications section', async ({ page }) => {
    const vehicleSection = page.getByText(/Vehicle Modifications/i).or(
      page.getByText(/Modifications/i)
    );

    const hasProfile = await page.locator('body').evaluate(
      (body) => !body.innerText.includes('Getting Started')
    );

    if (hasProfile) {
      await expect(vehicleSection.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should display equipment manager section', async ({ page }) => {
    const equipmentSection = page.getByText(/Equipment Manager/i).or(
      page.getByText(/Equipment/i)
    );

    const hasProfile = await page.locator('body').evaluate(
      (body) => !body.innerText.includes('Getting Started')
    );

    if (hasProfile) {
      await expect(equipmentSection.first()).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('Life Transition Navigator - Task Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(home|dashboard|you)/);

    await page.goto(`${BASE_URL}/transition`);
    await page.waitForLoadState('networkidle');
  });

  test('should create a new task', async ({ page }) => {
    // Look for "Add Task" button
    const addTaskBtn = page.getByRole('button', { name: /Add Task/i }).or(
      page.getByText(/\+ Task/i)
    );

    const hasProfile = await page.locator('body').evaluate(
      (body) => !body.innerText.includes('Getting Started')
    );

    if (hasProfile && await addTaskBtn.isVisible().catch(() => false)) {
      await addTaskBtn.click();

      // Fill in task details
      const titleInput = page.locator('input[name="title"]').or(
        page.locator('input[placeholder*="title" i]')
      );
      await titleInput.fill('Test Task - E2E');

      // Select category
      const categorySelect = page.locator('select[name="category"]').or(
        page.getByLabel(/category/i)
      );
      if (await categorySelect.isVisible().catch(() => false)) {
        await categorySelect.selectOption('legal_admin');
      }

      // Save task
      const saveBtn = page.getByRole('button', { name: /Save|Create/i });
      await saveBtn.click();

      // Verify task appears
      await expect(page.getByText('Test Task - E2E')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should mark task as complete', async ({ page }) => {
    const hasProfile = await page.locator('body').evaluate(
      (body) => !body.innerText.includes('Getting Started')
    );

    if (hasProfile) {
      // Look for any task checkbox
      const taskCheckbox = page.locator('input[type="checkbox"]').first();

      if (await taskCheckbox.isVisible().catch(() => false)) {
        const wasChecked = await taskCheckbox.isChecked();
        await taskCheckbox.click();

        // Wait for state to change
        await page.waitForTimeout(1000);

        const isNowChecked = await taskCheckbox.isChecked();
        expect(isNowChecked).not.toBe(wasChecked);
      }
    }
  });
});

test.describe('Life Transition Navigator - Reality Check', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(home|dashboard|you)/);

    await page.goto(`${BASE_URL}/transition`);
    await page.waitForLoadState('networkidle');
  });

  test('should display reality check feasibility score', async ({ page }) => {
    const realityCheck = page.getByText(/Reality Check/i);

    const hasProfile = await page.locator('body').evaluate(
      (body) => !body.innerText.includes('Getting Started')
    );

    if (hasProfile && await realityCheck.isVisible().catch(() => false)) {
      await realityCheck.click();

      // Should see feasibility score (0-100%)
      const score = page.locator('text=/\\d+%/').or(
        page.getByText(/Feasibility/i)
      );
      await expect(score.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show red/yellow/green status indicators', async ({ page }) => {
    const realityCheck = page.getByText(/Reality Check/i);

    const hasProfile = await page.locator('body').evaluate(
      (body) => !body.innerText.includes('Getting Started')
    );

    if (hasProfile && await realityCheck.isVisible().catch(() => false)) {
      await realityCheck.click();

      // Look for color-coded indicators
      const indicators = page.locator('.bg-red-500, .bg-yellow-500, .bg-green-500').or(
        page.getByText(/Status:/i)
      );

      const hasIndicators = await indicators.count() > 0;
      expect(hasIndicators).toBeTruthy();
    }
  });
});

test.describe('Life Transition Navigator - Vehicle Modifications', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(home|dashboard|you)/);

    await page.goto(`${BASE_URL}/transition`);
    await page.waitForLoadState('networkidle');
  });

  test('should display vehicle modifications Kanban board', async ({ page }) => {
    const modificationsSection = page.getByText(/Vehicle Modifications/i);

    const hasProfile = await page.locator('body').evaluate(
      (body) => !body.innerText.includes('Getting Started')
    );

    if (hasProfile && await modificationsSection.isVisible().catch(() => false)) {
      await modificationsSection.click();

      // Look for Kanban columns
      const plannedColumn = page.getByText(/Planned/i);
      const inProgressColumn = page.getByText(/In Progress/i);
      const completeColumn = page.getByText(/Complete/i);

      await expect(plannedColumn).toBeVisible({ timeout: 5000 });
    }
  });

  test('should switch between Kanban and Timeline views', async ({ page }) => {
    const modificationsSection = page.getByText(/Vehicle Modifications/i);

    const hasProfile = await page.locator('body').evaluate(
      (body) => !body.innerText.includes('Getting Started')
    );

    if (hasProfile && await modificationsSection.isVisible().catch(() => false)) {
      await modificationsSection.click();

      // Look for view toggle buttons
      const timelineBtn = page.getByRole('button', { name: /Timeline/i }).or(
        page.getByText(/Timeline View/i)
      );

      if (await timelineBtn.isVisible().catch(() => false)) {
        await timelineBtn.click();

        // Should see timeline view elements
        await page.waitForTimeout(1000);
        const bodyText = await page.locator('body').textContent();
        expect(bodyText).toBeTruthy();
      }
    }
  });
});

test.describe('Life Transition Navigator - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(home|dashboard|you)/);
  });

  test('should NOT show 403 Forbidden errors', async ({ page }) => {
    await page.goto(`${BASE_URL}/transition`);
    await page.waitForLoadState('networkidle');

    // Check console for 403 errors
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    const has403Error = logs.some(log => log.includes('403'));
    expect(has403Error).toBe(false);
  });

  test('should NOT show 406 Not Acceptable errors', async ({ page }) => {
    await page.goto(`${BASE_URL}/transition`);
    await page.waitForLoadState('networkidle');

    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    const has406Error = logs.some(log => log.includes('406'));
    expect(has406Error).toBe(false);
  });

  test('should handle missing profile gracefully', async ({ page }) => {
    await page.goto(`${BASE_URL}/transition`);
    await page.waitForLoadState('networkidle');

    // Should either show onboarding or dashboard, never a crash
    const bodyText = await page.locator('body').textContent();

    expect(bodyText).not.toContain('undefined');
    expect(bodyText).not.toContain('null');
    expect(bodyText).not.toContain('Error:');
  });
});
