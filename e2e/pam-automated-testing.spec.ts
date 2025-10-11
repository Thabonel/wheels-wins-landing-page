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

  test.describe('Home Page', () => {
    test('should answer general question', async ({ page }) => {
      await runPAMTest(
        page,
        'Home',
        'what can you help me with?',
        '/'
      );
    });

    test('should create calendar appointment', async ({ page }) => {
      await runPAMTest(
        page,
        'Home',
        'add a dinner appointment for the 13th at 12pm',
        '/'
      );
    });

    test('should answer about features', async ({ page }) => {
      await runPAMTest(
        page,
        'Home',
        'what features does Wheels and Wins have?',
        '/'
      );
    });
  });

  test.describe('Wheels Page', () => {
    test('should answer trip planning question', async ({ page }) => {
      await runPAMTest(
        page,
        'Wheels',
        'plan a trip from Phoenix to Seattle',
        '/wheels'
      );
    });

    test('should provide weather information', async ({ page }) => {
      await runPAMTest(
        page,
        'Wheels',
        'what is the weather forecast for Denver?',
        '/wheels'
      );
    });

    test('should calculate gas costs', async ({ page }) => {
      await runPAMTest(
        page,
        'Wheels',
        'calculate gas cost for 500 miles at 10 MPG with gas at $3.50',
        '/wheels'
      );
    });

    test('should find RV parks', async ({ page }) => {
      await runPAMTest(
        page,
        'Wheels',
        'find RV parks near Yellowstone',
        '/wheels'
      );
    });
  });

  test.describe('Wins Page', () => {
    test('should show spending summary', async ({ page }) => {
      await runPAMTest(
        page,
        'Wins',
        'show my spending this month',
        '/wins'
      );
    });

    test('should create expense', async ({ page }) => {
      await runPAMTest(
        page,
        'Wins',
        'add a $50 gas expense',
        '/wins'
      );
    });

    test('should analyze budget', async ({ page }) => {
      await runPAMTest(
        page,
        'Wins',
        'how am I doing on my budget?',
        '/wins'
      );
    });

    test('should track savings', async ({ page }) => {
      await runPAMTest(
        page,
        'Wins',
        'I saved $20 on cheap gas today',
        '/wins'
      );
    });
  });

  test.describe('Social Page', () => {
    test('should answer about social features', async ({ page }) => {
      await runPAMTest(
        page,
        'Social',
        'how can I connect with other RV travelers?',
        '/social'
      );
    });

    test('should help with posting', async ({ page }) => {
      await runPAMTest(
        page,
        'Social',
        'how do I share my trip with friends?',
        '/social'
      );
    });

    test('should find community events', async ({ page }) => {
      await runPAMTest(
        page,
        'Social',
        'are there any RV meetups coming up?',
        '/social'
      );
    });
  });

  test.describe('Shop Page', () => {
    test('should help find products', async ({ page }) => {
      await runPAMTest(
        page,
        'Shop',
        'I need a new water filter for my RV',
        '/shop'
      );
    });

    test('should answer product questions', async ({ page }) => {
      await runPAMTest(
        page,
        'Shop',
        'what are the most popular RV accessories?',
        '/shop'
      );
    });
  });

  test.describe('You (Profile) Page', () => {
    test('should help with profile updates', async ({ page }) => {
      await runPAMTest(
        page,
        'You',
        'how do I update my profile information?',
        '/you'
      );
    });

    test('should answer about settings', async ({ page }) => {
      await runPAMTest(
        page,
        'You',
        'where are my notification settings?',
        '/you'
      );
    });

    test('should help with preferences', async ({ page }) => {
      await runPAMTest(
        page,
        'You',
        'how do I change from imperial to metric units?',
        '/you'
      );
    });
  });

  test.describe('PAM Chat Page', () => {
    test('should answer contextual questions', async ({ page }) => {
      await runPAMTest(
        page,
        'PAM',
        'what questions can I ask you?',
        '/pam'
      );
    });

    test('should use multiple tools in sequence', async ({ page }) => {
      await runPAMTest(
        page,
        'PAM',
        'plan a trip to Seattle, check the weather, and calculate the gas cost',
        '/pam'
      );
    });

    test('should handle complex financial queries', async ({ page }) => {
      await runPAMTest(
        page,
        'PAM',
        'show me how much I spent on gas vs food this month',
        '/pam'
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
