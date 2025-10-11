import { Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export interface PAMTestResult {
  page: string;
  question: string;
  response: string;
  success: boolean;
  error?: string;
  duration: number;
  timestamp: string;
  retryCount: number;
}

export interface PAMTestReport {
  totalTests: number;
  passed: number;
  failed: number;
  duration: number;
  timestamp: string;
  results: PAMTestResult[];
}

/**
 * Login as test user (uses env vars or creates new user)
 */
export async function loginAsTestUser(page: Page): Promise<void> {
  const testEmail = process.env.TEST_USER_EMAIL || 'pam-test@wheelsandwins.com';
  const testPassword = process.env.TEST_USER_PASSWORD || 'Test1234!';

  await page.goto('/login');

  // Fill login form
  await page.fill('input[type="email"]', testEmail);
  await page.fill('input[type="password"]', testPassword);
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard/home
  try {
    await page.waitForURL(/\/(you|home|dashboard)/, { timeout: 10000 });
  } catch (error) {
    console.error('Login failed. Please set TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables with valid credentials.');
    console.error(`Attempted to login with: ${testEmail}`);
    throw new Error(`Login timeout - please ensure test user exists: ${testEmail}`);
  }
}

/**
 * Wait for PAM chat interface to be ready
 */
export async function waitForPAMReady(page: Page): Promise<void> {
  // Wait for PAM chat interface
  await page.waitForSelector('[data-testid="pam-chat"], [id*="pam"], textarea, input[placeholder*="PAM"]', {
    timeout: 10000,
    state: 'visible'
  });

  // Wait for WebSocket connection
  await page.waitForFunction(() => {
    const wsConnected = (window as any).__pamWebSocketConnected;
    return wsConnected === true || wsConnected === undefined; // undefined means we can try
  }, { timeout: 5000 }).catch(() => {
    console.log('WebSocket connection status unknown, proceeding anyway');
  });
}

/**
 * Ask PAM a question and get response
 */
export async function askPAM(
  page: Page,
  question: string,
  timeout: number = 15000
): Promise<string> {
  // Find PAM input field
  const inputSelectors = [
    'textarea[placeholder*="ask"]',
    'textarea[placeholder*="PAM"]',
    'textarea[placeholder*="message"]',
    'input[placeholder*="ask"]',
    'input[placeholder*="PAM"]',
    '[data-testid="pam-input"]'
  ];

  let inputField = null;
  for (const selector of inputSelectors) {
    const field = page.locator(selector).first();
    if (await field.isVisible().catch(() => false)) {
      inputField = field;
      break;
    }
  }

  if (!inputField) {
    throw new Error('PAM input field not found');
  }

  // Clear and type question
  await inputField.clear();
  await inputField.fill(question);

  // Listen for response before submitting
  const responsePromise = page.waitForResponse(
    response =>
      response.url().includes('/api/v1/pam') &&
      response.status() === 200,
    { timeout }
  ).catch(() => null);

  // Submit by pressing Enter (SimplePAM supports this)
  await inputField.press('Enter');

  // Wait for response
  const response = await responsePromise;

  // Extract response text from UI
  await page.waitForTimeout(2000); // Wait for UI to update

  const responseSelectors = [
    '[data-role="assistant"] p',
    '[data-role="assistant"]',
    '.pam-response',
    '.assistant-message',
    '[class*="response"]'
  ];

  let responseText = '';
  for (const selector of responseSelectors) {
    const elements = page.locator(selector);
    const count = await elements.count();
    if (count > 0) {
      const lastElement = elements.last();
      if (await lastElement.isVisible().catch(() => false)) {
        responseText = await lastElement.innerText();
        break;
      }
    }
  }

  if (!responseText) {
    // Fallback: get last message in chat
    const messages = page.locator('[role="log"] > div, .message, .chat-message');
    const count = await messages.count();
    if (count > 0) {
      responseText = await messages.last().innerText();
    }
  }

  return responseText || 'No response received';
}

/**
 * Check if PAM response indicates an error
 */
export function isErrorResponse(response: string): boolean {
  const errorPatterns = [
    /error/i,
    /failed/i,
    /unable to/i,
    /cannot/i,
    /try again/i,
    /something went wrong/i,
    /having trouble/i
  ];

  return errorPatterns.some(pattern => pattern.test(response));
}

/**
 * Retry test with exponential backoff
 */
export async function retryTest<T>(
  testFn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<{ result: T | null; success: boolean; retryCount: number; error?: string }> {
  let retryCount = 0;
  let delay = initialDelay;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      const result = await testFn();
      return { result, success: true, retryCount: i };
    } catch (error) {
      retryCount = i;
      if (i === maxRetries) {
        return {
          result: null,
          success: false,
          retryCount,
          error: error instanceof Error ? error.message : String(error)
        };
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }

  return { result: null, success: false, retryCount, error: 'Max retries exceeded' };
}

/**
 * Save test report to file
 */
export function saveTestReport(report: PAMTestReport): void {
  const reportsDir = path.join(process.cwd(), 'e2e', 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `pam-test-report-${timestamp}.json`;
  const filepath = path.join(reportsDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
  console.log(`Test report saved: ${filepath}`);

  // Also save as latest
  const latestPath = path.join(reportsDir, 'pam-test-report-latest.json');
  fs.writeFileSync(latestPath, JSON.stringify(report, null, 2));
}

/**
 * Print test summary to console
 */
export function printTestSummary(report: PAMTestReport): void {
  console.log('\n' + '='.repeat(60));
  console.log('PAM AUTOMATED TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${report.totalTests}`);
  console.log(`Passed: ${report.passed} ✅`);
  console.log(`Failed: ${report.failed} ❌`);
  console.log(`Success Rate: ${((report.passed / report.totalTests) * 100).toFixed(1)}%`);
  console.log(`Duration: ${(report.duration / 1000).toFixed(2)}s`);
  console.log('='.repeat(60));

  if (report.failed > 0) {
    console.log('\nFailed Tests:');
    report.results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`\n  ❌ ${r.page}: ${r.question}`);
        console.log(`     Error: ${r.error || 'Unknown error'}`);
        console.log(`     Response: ${r.response.substring(0, 100)}...`);
      });
  }
  console.log('');
}
