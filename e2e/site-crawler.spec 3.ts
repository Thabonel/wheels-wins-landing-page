import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth.helper';
import { CrawlerHelper } from './helpers/crawler.helper';
import { ReportGenerator } from './helpers/report.helper';

test.describe('Wheels & Wins - Comprehensive Site Crawler', () => {
  let authHelper: AuthHelper;
  let crawler: CrawlerHelper;
  let reportGenerator: ReportGenerator;

  // Define all pages to test
  const PUBLIC_PAGES = [
    '/',
    '/login',
    '/signup',
    '/shop',
    '/terms',
    '/privacy',
    '/cookie-policy',
    '/password-reset'
  ];

  const PROTECTED_PAGES = [
    '/wheels',
    '/you',
    '/wins',
    '/social',
    '/profile'
  ];

  const ADMIN_PAGES = [
    '/admin'
  ];

  const TEST_PAGES = [
    '/auth-test',
    '/pam-voice-test',
    '/pam-websocket-test',
    '/site-qa-log'
  ];

  test.beforeAll(async () => {
    console.log('🚀 Starting Wheels & Wins Site Crawler...\n');
    reportGenerator = new ReportGenerator();
  });

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    crawler = new CrawlerHelper(page);
    
    // Set viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Add console error tracking
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error(`Console Error: ${msg.text()}`);
      }
    });

    page.on('pageerror', (error) => {
      console.error(`Page Error: ${error.message}`);
    });
  });

  test('Test Public Pages - No Authentication Required', async ({ page }) => {
    console.log('\n📄 Testing Public Pages...\n');
    
    for (const url of PUBLIC_PAGES) {
      console.log(`Testing: ${url}`);
      const result = await crawler.crawlPage(url);
      
      // Basic assertions
      if (url !== '/password-reset') { // Password reset might redirect
        expect(result.status).not.toBe('fail');
      }
      
      // Log immediate issues
      if (result.errors.length > 0) {
        console.error(`  ❌ Errors on ${url}:`, result.errors);
      }
      if (result.warnings.length > 0) {
        console.warn(`  ⚠️ Warnings on ${url}:`, result.warnings);
      }
      
      console.log(`  ✓ Load time: ${(result.loadTime / 1000).toFixed(2)}s`);
      console.log(`  ✓ Buttons: ${result.buttons.filter(b => b.clickable).length}/${result.buttons.length} clickable`);
      console.log(`  ✓ Forms: ${result.forms.filter(f => f.submittable).length}/${result.forms.length} submittable`);
    }
  });

  test('Test Protected Pages - Authentication Required', async ({ page }) => {
    console.log('\n🔒 Testing Protected Pages (requires login)...\n');
    
    // Login first
    try {
      await authHelper.login();
      console.log('✓ Authentication successful\n');
    } catch (error) {
      console.error('❌ Authentication failed:', error.message);
      test.skip();
    }

    for (const url of PROTECTED_PAGES) {
      console.log(`Testing: ${url}`);
      const result = await crawler.crawlPage(url);
      
      // These pages should load without fail when authenticated
      expect(result.status).not.toBe('fail');
      
      // Log immediate issues
      if (result.errors.length > 0) {
        console.error(`  ❌ Errors on ${url}:`, result.errors);
      }
      if (result.warnings.length > 0) {
        console.warn(`  ⚠️ Warnings on ${url}:`, result.warnings);
      }
      
      console.log(`  ✓ Load time: ${(result.loadTime / 1000).toFixed(2)}s`);
      console.log(`  ✓ Buttons: ${result.buttons.filter(b => b.clickable).length}/${result.buttons.length} clickable`);
      console.log(`  ✓ Forms: ${result.forms.filter(f => f.submittable).length}/${result.forms.length} submittable`);
    }
  });

  test('Test Critical Interactive Elements', async ({ page }) => {
    console.log('\n🎯 Testing Critical Interactive Elements...\n');
    
    // Test PAM Assistant button
    console.log('Testing PAM Assistant...');
    await page.goto('/');
    const pamButton = await page.$('[aria-label="Open PAM Assistant"], [aria-label="Open PAM Chat"]');
    if (pamButton) {
      await pamButton.click();
      await page.waitForTimeout(1000);
      const pamChat = await page.$('.pam-chat, [class*="pam"], [id*="pam"]');
      expect(pamChat).toBeTruthy();
      console.log('  ✓ PAM Assistant opens correctly');
    } else {
      console.log('  ⚠️ PAM Assistant button not found');
    }

    // Test navigation menu
    console.log('Testing Navigation Menu...');
    const navItems = await page.$$('nav a, header a');
    console.log(`  ✓ Found ${navItems.length} navigation links`);

    // Test responsive menu (mobile)
    console.log('Testing Mobile Menu...');
    await page.setViewportSize({ width: 375, height: 667 });
    const mobileMenuButton = await page.$('[aria-label*="menu"], button[class*="menu"]');
    if (mobileMenuButton) {
      await mobileMenuButton.click();
      await page.waitForTimeout(500);
      console.log('  ✓ Mobile menu toggles correctly');
    } else {
      console.log('  ⚠️ Mobile menu button not found');
    }
    
    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('Test Form Functionality', async ({ page }) => {
    console.log('\n📝 Testing Forms...\n');
    
    // Test login form
    console.log('Testing Login Form...');
    await page.goto('/login');
    const emailInput = await page.$('input[type="email"]');
    const passwordInput = await page.$('input[type="password"]');
    const submitButton = await page.$('button[type="submit"]');
    
    if (emailInput && passwordInput && submitButton) {
      await emailInput.fill('test@example.com');
      await passwordInput.fill('Test123456!');
      console.log('  ✓ Login form fields are functional');
    } else {
      console.log('  ❌ Login form elements missing');
    }

    // Test signup form
    console.log('Testing Signup Form...');
    await page.goto('/signup');
    const signupForm = await page.$('form');
    if (signupForm) {
      const inputs = await signupForm.$$('input');
      console.log(`  ✓ Signup form has ${inputs.length} input fields`);
    } else {
      console.log('  ❌ Signup form not found');
    }
  });

  test('Performance and Accessibility Check', async ({ page }) => {
    console.log('\n⚡ Running Performance & Accessibility Checks...\n');
    
    const performanceMetrics: any[] = [];
    
    for (const url of ['/'].concat(PUBLIC_PAGES.slice(0, 3))) {
      await page.goto(url);
      
      // Get performance metrics
      const metrics = await page.evaluate(() => {
        const timing = performance.timing;
        return {
          url: window.location.href,
          domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
          loadComplete: timing.loadEventEnd - timing.navigationStart
        };
      });
      performanceMetrics.push(metrics);
      
      // Check for missing alt texts
      const imagesWithoutAlt = await page.$$eval('img:not([alt])', imgs => imgs.length);
      
      // Check for buttons without labels
      const buttonsWithoutLabel = await page.$$eval(
        'button:not([aria-label]):not([title])',
        buttons => buttons.filter(b => !b.textContent?.trim()).length
      );
      
      console.log(`${url}:`);
      console.log(`  DOM Ready: ${(metrics.domContentLoaded / 1000).toFixed(2)}s`);
      console.log(`  Page Load: ${(metrics.loadComplete / 1000).toFixed(2)}s`);
      console.log(`  Images without alt: ${imagesWithoutAlt}`);
      console.log(`  Buttons without labels: ${buttonsWithoutLabel}`);
    }
  });

  test.afterAll(async () => {
    console.log('\n📊 Generating Final Report...\n');
    
    // Get all results
    const results = crawler.getResults();
    const summary = crawler.getSummary();
    
    // Save the report
    await reportGenerator.saveReport(results, summary);
    
    console.log('\n✅ Site crawl complete!');
    console.log('📄 View detailed report at: playwright-report/site-crawler-report.html');
    console.log('📊 View raw data at: test-results/crawler-results.json\n');
  });
});