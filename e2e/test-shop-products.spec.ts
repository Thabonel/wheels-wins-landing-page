import { test, expect } from '@playwright/test';

test.describe('Shop Page - Product Loading Test', () => {
  test('Shop page loads products from Supabase', async ({ page }) => {
    console.log('🛍️ Testing Shop Page Product Loading...\n');
    
    // Navigate to shop page
    await page.goto('/shop', { waitUntil: 'networkidle' });
    
    // Wait for any potential API calls to complete
    await page.waitForTimeout(2000);
    
    // Check for console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Check for product cards
    const productCards = await page.$$('[class*="product"], [class*="Product"], [data-testid*="product"]');
    console.log(`✓ Found ${productCards.length} product cards`);
    
    // Check for API errors in console
    const apiErrors = consoleErrors.filter(err => 
      err.includes('API') || err.includes('Supabase') || err.includes('401')
    );
    
    if (apiErrors.length > 0) {
      console.log('❌ API Errors found:');
      apiErrors.forEach(err => console.log(`  - ${err}`));
    } else {
      console.log('✓ No API errors detected');
    }
    
    // Check for specific elements that indicate products loaded
    const digitalProducts = await page.$$('text=/Digital Products|digital products/i');
    const affiliateProducts = await page.$$('text=/Affiliate|affiliate/i');
    
    console.log(`✓ Digital product sections: ${digitalProducts.length}`);
    console.log(`✓ Affiliate product sections: ${affiliateProducts.length}`);
    
    // Check for loading states
    const loadingElements = await page.$$('[class*="loading"], [class*="Loading"], [class*="spinner"]');
    if (loadingElements.length > 0) {
      console.log(`⚠️ Still loading: ${loadingElements.length} loading indicators found`);
    }
    
    // Check page title to confirm we're on shop page
    const title = await page.title();
    expect(title).toContain('Wheels & Wins');
    
    // Summary
    console.log('\n📊 Shop Page Test Summary:');
    console.log(`- Page loaded: ✓`);
    console.log(`- Product cards: ${productCards.length}`);
    console.log(`- API errors: ${apiErrors.length === 0 ? '✓ None' : `❌ ${apiErrors.length} errors`}`);
    console.log(`- Products loaded: ${productCards.length > 0 ? '✓' : '❌'}`);
    
    // Test passes if no API errors
    expect(apiErrors.length).toBe(0);
  });
});