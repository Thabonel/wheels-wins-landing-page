/**
 * PAM Page-Specific Automated Tests
 * Tests PAM functionality on each main app page with contextual tasks
 */

import { test, expect, Page } from '@playwright/test';
import {
  loginAsTestUser,
  waitForPAMReady,
  askPAM,
  retryTest,
  saveTestReport,
  printTestSummary,
  TestResult
} from './helpers/pam-test-helpers';

// Test results storage
const testResults: TestResult[] = [];

/**
 * Open FloatingPAM dialog on any page
 */
async function openFloatingPAM(page: Page): Promise<void> {
  // Wait for floating PAM button (using specific test ID)
  const floatingButton = page.locator('[data-testid="floating-pam-button"]');
  await floatingButton.waitFor({ state: 'visible', timeout: 10000 });

  // Click to open dialog
  await floatingButton.click({ force: true }); // Force click to bypass any overlays

  // Wait for dialog to open
  await page.waitForSelector('[data-testid="floating-pam-dialog"]', { timeout: 5000 });

  // Wait a moment for SimplePAM to initialize
  await page.waitForTimeout(1000);

  // Wait for PAM input to be ready (should be inside the dialog)
  await waitForPAMReady(page);

  console.log('FloatingPAM opened successfully');
}

/**
 * Run PAM test on a specific page
 */
async function runPagePAMTest(
  page: Page,
  pageName: string,
  question: string,
  pageUrl: string
): Promise<void> {
  const startTime = Date.now();

  const testFn = async () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing PAM on ${pageName} page`);
    console.log(`URL: ${pageUrl}`);
    console.log(`Question: "${question}"`);
    console.log('='.repeat(60));

    // Navigate to the page
    await page.goto(pageUrl);
    await page.waitForLoadState('networkidle');

    // Open FloatingPAM
    await openFloatingPAM(page);

    // Ask question
    const response = await askPAM(page, question);

    // Check if error response
    const isError = response.toLowerCase().includes('error') ||
                   response.toLowerCase().includes('sorry') ||
                   response === 'No response received';

    if (isError) {
      throw new Error(`PAM error response: ${response}`);
    }

    console.log(`✅ PAM Response: ${response.substring(0, 200)}${response.length > 200 ? '...' : ''}`);

    return response;
  };

  // Retry test up to 3 times
  const { response, success, retryCount } = await retryTest(testFn);

  const duration = Date.now() - startTime;

  // Record result
  const result: TestResult = {
    page: pageName,
    question,
    response: response || 'No response',
    success,
    duration,
    timestamp: new Date().toISOString(),
    retryCount
  };

  testResults.push(result);

  if (!success) {
    throw new Error(`Test failed after ${retryCount + 1} attempts: ${response}`);
  }
}

test.describe('PAM Page-Specific Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test.afterAll(async () => {
    // Print summary
    printTestSummary(testResults);

    // Save report
    await saveTestReport(testResults);
  });

  test.describe('Wheels Page - Trip Planning', () => {
    test('should plan a trip from current location', async ({ page }) => {
      await runPagePAMTest(
        page,
        'Wheels',
        'plan a trip from Phoenix to Seattle',
        '/wheels'
      );
    });

    test('should find cheap gas stations', async ({ page }) => {
      await runPagePAMTest(
        page,
        'Wheels',
        'find cheap gas stations near me',
        '/wheels'
      );
    });

    test('should check weather for route', async ({ page }) => {
      await runPagePAMTest(
        page,
        'Wheels',
        'what is the weather forecast for my next trip?',
        '/wheels'
      );
    });

    test('should find RV parks', async ({ page }) => {
      await runPagePAMTest(
        page,
        'Wheels',
        'find RV parks near Yellowstone with full hookups',
        '/wheels'
      );
    });
  });

  test.describe('Wins Page - Financial Management', () => {
    test('should show spending summary', async ({ page }) => {
      await runPagePAMTest(
        page,
        'Wins',
        'show my spending this month',
        '/wins'
      );
    });

    test('should add expense', async ({ page }) => {
      await runPagePAMTest(
        page,
        'Wins',
        'add a $50 gas expense',
        '/wins'
      );
    });

    test('should check budget status', async ({ page }) => {
      await runPagePAMTest(
        page,
        'Wins',
        'how am I doing on my budget?',
        '/wins'
      );
    });

    test('should track savings', async ({ page }) => {
      await runPagePAMTest(
        page,
        'Wins',
        'I saved $20 on cheap gas today',
        '/wins'
      );
    });
  });

  test.describe('Social Page - Community', () => {
    test('should help with community features', async ({ page }) => {
      await runPagePAMTest(
        page,
        'Social',
        'how can I connect with other RV travelers?',
        '/social'
      );
    });

    test('should create a post', async ({ page }) => {
      await runPagePAMTest(
        page,
        'Social',
        'help me create a post about my trip',
        '/social'
      );
    });

    test('should find local RVers', async ({ page }) => {
      await runPagePAMTest(
        page,
        'Social',
        'find RVers near my location',
        '/social'
      );
    });
  });

  test.describe('Shop Page - Shopping', () => {
    test('should help find products', async ({ page }) => {
      await runPagePAMTest(
        page,
        'Shop',
        'I need a new water filter for my RV',
        '/shop'
      );
    });

    test('should check cart', async ({ page }) => {
      await runPagePAMTest(
        page,
        'Shop',
        'what is in my shopping cart?',
        '/shop'
      );
    });
  });

  test.describe('You Page - Profile & Settings', () => {
    test('should help update profile', async ({ page }) => {
      await runPagePAMTest(
        page,
        'You',
        'update my profile information',
        '/you'
      );
    });

    test('should check user stats', async ({ page }) => {
      await runPagePAMTest(
        page,
        'You',
        'show me my account statistics',
        '/you'
      );
    });

    test('should manage settings', async ({ page }) => {
      await runPagePAMTest(
        page,
        'You',
        'how do I change my notification settings?',
        '/you'
      );
    });
  });

  test.describe('Cross-Page Context', () => {
    test('should maintain context across pages', async ({ page }) => {
      // Start on Wheels page
      await page.goto('/wheels');
      await openFloatingPAM(page);

      const response1 = await askPAM(page, 'plan a trip from Phoenix to Seattle');
      console.log('First response:', response1.substring(0, 100));

      // Close dialog
      await page.locator('button:has-text("×")').first().click();
      await page.waitForTimeout(1000);

      // Navigate to Wins page
      await page.goto('/wins');
      await openFloatingPAM(page);

      const response2 = await askPAM(page, 'how much will this trip cost?');
      console.log('Second response:', response2.substring(0, 100));

      // Should reference the trip from previous context
      const hasContext = response2.toLowerCase().includes('trip') ||
                        response2.toLowerCase().includes('phoenix') ||
                        response2.toLowerCase().includes('seattle');

      expect(hasContext).toBeTruthy();
    });
  });
});
