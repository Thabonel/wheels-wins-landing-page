import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const testEmail = process.env.TEST_USER_EMAIL || 'pam-test@wheelsandwins.com';
  const testPassword = process.env.TEST_USER_PASSWORD || 'Test1234!';

  const baseURL = config.projects[0].use.baseURL || 'http://localhost:8080';

  try {
    console.log('Setting up test user account...');

    // Try to login first - if it works, user exists
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Wait to see if login succeeds
    try {
      await page.waitForURL(/\/(you|home|dashboard)/, { timeout: 5000 });
      console.log('Test user already exists and can login');
      await browser.close();
      return;
    } catch (e) {
      console.log('Test user does not exist or login failed, will try to create...');
    }

    // If login failed, try to create the account
    await page.goto(`${baseURL}/signup`);

    // Fill signup form
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);

    // Fill any required name fields
    const nameFields = await page.locator('input[name*="name"], input[placeholder*="name"]').all();
    for (const field of nameFields) {
      if (await field.isVisible()) {
        await field.fill('PAM Test User');
      }
    }

    // Submit signup
    await page.click('button[type="submit"]');

    // Wait for successful signup
    try {
      await page.waitForURL(/\/(you|home|dashboard|verify)/, { timeout: 10000 });
      console.log('Test user created successfully');
    } catch (e) {
      console.log('Could not create test user automatically');
      console.log('Please create test user manually or set TEST_USER_EMAIL and TEST_USER_PASSWORD env vars');
    }
  } catch (error) {
    console.error('Error in global setup:', error);
    console.log('Tests may fail due to missing test user account');
  } finally {
    await browser.close();
  }
}

export default globalSetup;
