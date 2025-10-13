import { test, expect, Page } from '@playwright/test';
import {
  loginAsTestUser,
  waitForPAMReady,
  askPAM,
  isErrorResponse,
  retryTest,
  saveTestReport,
  printTestSummary,
  PAMTestResult,
  PAMTestReport
} from './helpers/pam-test-helpers';

const testResults: PAMTestResult[] = [];
const startTime = Date.now();

/**
 * Run a PAM test with retry logic
 */
async function runPAMTest(
  page: Page,
  pageName: string,
  question: string,
  pageUrl: string
): Promise<void> {
  const testStart = Date.now();

  const { result, success, retryCount, error } = await retryTest(async () => {
    // Navigate to page
    await page.goto(pageUrl);
    await waitForPAMReady(page);

    // Ask question
    const response = await askPAM(page, question);

    // Check for errors
    if (isErrorResponse(response)) {
      throw new Error(`Error response: ${response}`);
    }

    return response;
  }, 3);

  const duration = Date.now() - testStart;

  // Record result
  testResults.push({
    page: pageName,
    question,
    response: result || error || 'No response',
    success,
    error,
    duration,
    timestamp: new Date().toISOString(),
    retryCount
  });

  // Assert success
  expect(success, `PAM failed on ${pageName}: ${error}`).toBe(true);
}

test.describe('PAM Automated Testing - All Pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test.describe('General Questions', () => {
    test('should answer general question', async ({ page }) => {
      await runPAMTest(
        page,
        'PAM',
        'what can you help me with?',
        '/simple-pam-test'
      );
    });

    test('should answer about features', async ({ page }) => {
      await runPAMTest(
        page,
        'PAM',
        'what features does Wheels and Wins have?',
        '/simple-pam-test'
      );
    });
  });

  test.describe('Calendar & Appointments', () => {
    test('should create calendar appointment', async ({ page }) => {
      await runPAMTest(
        page,
        'PAM',
        'add a dinner appointment for the 13th at 12pm',
        '/simple-pam-test'
      );
    });
  });

  test.describe('Trip Planning', () => {
    test('should answer trip planning question', async ({ page }) => {
      await runPAMTest(
        page,
        'PAM',
        'plan a trip from Phoenix to Seattle',
        '/simple-pam-test'
      );
    });

    test('should provide weather information', async ({ page }) => {
      await runPAMTest(
        page,
        'PAM',
        'what is the weather forecast for Denver?',
        '/simple-pam-test'
      );
    });

    test('should calculate gas costs', async ({ page }) => {
      await runPAMTest(
        page,
        'PAM',
        'calculate gas cost for 500 miles at 10 MPG with gas at $3.50',
        '/simple-pam-test'
      );
    });

    test('should find RV parks', async ({ page }) => {
      await runPAMTest(
        page,
        'PAM',
        'find RV parks near Yellowstone',
        '/simple-pam-test'
      );
    });

    test('should use multiple tools in sequence', async ({ page }) => {
      await runPAMTest(
        page,
        'PAM',
        'plan a trip to Seattle, check the weather, and calculate the gas cost',
        '/simple-pam-test'
      );
    });
  });

  test.describe('Budget & Finance', () => {
    test('should show spending summary', async ({ page }) => {
      await runPAMTest(
        page,
        'PAM',
        'show my spending this month',
        '/simple-pam-test'
      );
    });

    test('should create expense', async ({ page }) => {
      await runPAMTest(
        page,
        'PAM',
        'add a $50 gas expense',
        '/simple-pam-test'
      );
    });

    test('should analyze budget', async ({ page }) => {
      await runPAMTest(
        page,
        'PAM',
        'how am I doing on my budget?',
        '/simple-pam-test'
      );
    });

    test('should track savings', async ({ page }) => {
      await runPAMTest(
        page,
        'PAM',
        'I saved $20 on cheap gas today',
        '/simple-pam-test'
      );
    });

    test('should handle complex financial queries', async ({ page }) => {
      await runPAMTest(
        page,
        'PAM',
        'show me how much I spent on gas vs food this month',
        '/simple-pam-test'
      );
    });
  });

  test.afterAll(async () => {
    // Generate report
    const totalDuration = Date.now() - startTime;
    const passed = testResults.filter(r => r.success).length;
    const failed = testResults.filter(r => !r.success).length;

    const report: PAMTestReport = {
      totalTests: testResults.length,
      passed,
      failed,
      duration: totalDuration,
      timestamp: new Date().toISOString(),
      results: testResults
    };

    // Save and print report
    saveTestReport(report);
    printTestSummary(report);

    // Fail the test suite if there are failures
    expect(failed, `${failed} tests failed`).toBe(0);
  });
});
