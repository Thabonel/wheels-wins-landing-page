import { test, expect } from '@playwright/test';

test.describe('Shop Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/shop');
    await page.waitForLoadState('networkidle');
    
    // Authenticate if needed
    const isLoggedIn = await page.locator('[data-testid="user-menu"]').isVisible();
    if (!isLoggedIn) {
      await page.click('text=Sign In');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/shop');
    }
  });

  test('should display product catalog with filters', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Shop');
    await expect(page.locator('[data-testid="product-grid"]')).toBeVisible();
    await expect(page.locator('[data-testid="product-filters"]')).toBeVisible();
    await expect(page.locator('[data-testid="search-bar"]')).toBeVisible();
  });

  test('should filter products by category', async ({ page }) => {
    // Select vehicle accessories category
    await page.click('[data-testid="category-filter"]');
    await page.click('[data-testid="category-vehicle-accessories"]');
    
    // Verify filtered results
    await expect(page.locator('[data-testid="product-item"]')).toHaveCount({ min: 1 });
    await expect(page.locator('[data-testid="active-filter"]')).toContainText('Vehicle Accessories');
    
    // Clear filter
    await page.click('[data-testid="clear-filters-button"]');
    await expect(page.locator('[data-testid="active-filter"]')).not.toBeVisible();
  });

  test('should search for products', async ({ page }) => {
    // Search for specific product
    await page.fill('[data-testid="search-bar"]', 'car mount');
    await page.press('[data-testid="search-bar"]', 'Enter');
    
    // Verify search results
    await expect(page.locator('[data-testid="search-results-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="product-item"]')).toHaveCount({ min: 1 });
    
    // Verify product titles contain search term
    const productTitles = page.locator('[data-testid="product-title"]');
    await expect(productTitles.first()).toContainText(/mount/i);
  });

  test('should view product details and add to cart', async ({ page }) => {
    // Click on first product
    await page.locator('[data-testid="product-item"]').first().click();
    
    // Verify product detail page
    await expect(page.locator('[data-testid="product-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="product-price"]')).toBeVisible();
    await expect(page.locator('[data-testid="product-description"]')).toBeVisible();
    await expect(page.locator('[data-testid="product-images"]')).toBeVisible();
    
    // Select quantity
    await page.selectOption('[data-testid="quantity-select"]', '2');
    
    // Add to cart
    await page.click('[data-testid="add-to-cart-button"]');
    await expect(page.locator('text=Added to cart')).toBeVisible();
    
    // Verify cart badge updates
    await expect(page.locator('[data-testid="cart-badge"]')).toContainText('2');
  });

  test('should display PAM recommendations', async ({ page }) => {
    // Verify PAM recommendations section
    await expect(page.locator('[data-testid="pam-recommendations"]')).toBeVisible();
    await expect(page.locator('text=PAM Recommends')).toBeVisible();
    
    // Click on PAM recommendation
    await page.click('[data-testid="pam-recommendation-item"]').first();
    
    // Verify recommendation details
    await expect(page.locator('[data-testid="recommendation-reason"]')).toBeVisible();
    await expect(page.locator('text=Why PAM recommends this')).toBeVisible();
  });

  test('should integrate with trip planning', async ({ page }) => {
    // Navigate to trip planner first
    await page.goto('/wheels');
    await page.click('text=Trip Planner');
    
    // Plan a route
    await page.fill('[data-testid="origin-input"]', 'Los Angeles, CA');
    await page.fill('[data-testid="destination-input"]', 'San Francisco, CA');
    await page.click('[data-testid="plan-route-button"]');
    
    await page.waitForSelector('[data-testid="route-summary"]');
    
    // Open trip-related shopping
    await page.click('[data-testid="trip-shopping-button"]');
    
    // Verify trip-specific products
    await expect(page.locator('[data-testid="trip-essentials"]')).toBeVisible();
    await expect(page.locator('text=Recommended for your trip')).toBeVisible();
    
    // Verify products are relevant to trip
    await expect(page.locator('[data-testid="trip-product-item"]')).toHaveCount({ min: 1 });
  });

  test('should manage shopping cart', async ({ page }) => {
    // Add multiple items to cart
    const products = page.locator('[data-testid="product-item"]');
    await products.first().click();
    await page.click('[data-testid="add-to-cart-button"]');
    await page.goBack();
    
    await products.nth(1).click();
    await page.selectOption('[data-testid="quantity-select"]', '3');
    await page.click('[data-testid="add-to-cart-button"]');
    
    // Open cart
    await page.click('[data-testid="cart-button"]');
    
    // Verify cart contents
    await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(2);
    await expect(page.locator('[data-testid="cart-total"]')).toBeVisible();
    
    // Update quantity
    await page.fill('[data-testid="cart-quantity-0"]', '2');
    await expect(page.locator('[data-testid="cart-total"]')).not.toHaveText('$0.00');
    
    // Remove item
    await page.click('[data-testid="remove-item-button"]').first();
    await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(1);
  });

  test('should complete checkout process', async ({ page }) => {
    // Add item to cart
    await page.locator('[data-testid="product-item"]').first().click();
    await page.click('[data-testid="add-to-cart-button"]');
    
    // Go to checkout
    await page.click('[data-testid="cart-button"]');
    await page.click('[data-testid="checkout-button"]');
    
    // Fill shipping information
    await page.fill('[data-testid="shipping-name"]', 'John Doe');
    await page.fill('[data-testid="shipping-address"]', '123 Main St');
    await page.fill('[data-testid="shipping-city"]', 'Los Angeles');
    await page.selectOption('[data-testid="shipping-state"]', 'CA');
    await page.fill('[data-testid="shipping-zip"]', '90210');
    
    // Select shipping method
    await page.click('[data-testid="shipping-standard"]');
    
    // Fill payment information (test mode)
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="card-expiry"]', '12/25');
    await page.fill('[data-testid="card-cvc"]', '123');
    await page.fill('[data-testid="card-name"]', 'John Doe');
    
    // Place order
    await page.click('[data-testid="place-order-button"]');
    
    // Verify order confirmation
    await expect(page.locator('text=Order confirmed')).toBeVisible();
    await expect(page.locator('[data-testid="order-number"]')).toBeVisible();
  });

  test('should display wishlist functionality', async ({ page }) => {
    // Add item to wishlist
    await page.locator('[data-testid="product-item"]').first().click();
    await page.click('[data-testid="add-to-wishlist-button"]');
    await expect(page.locator('text=Added to wishlist')).toBeVisible();
    
    // Navigate to wishlist
    await page.click('[data-testid="wishlist-button"]');
    
    // Verify wishlist contents
    await expect(page.locator('[data-testid="wishlist-item"]')).toHaveCount({ min: 1 });
    
    // Move item from wishlist to cart
    await page.click('[data-testid="move-to-cart-button"]').first();
    await expect(page.locator('[data-testid="cart-badge"]')).toContainText('1');
  });

  test('should show product reviews and ratings', async ({ page }) => {
    // Click on product with reviews
    await page.locator('[data-testid="product-item"]').first().click();
    
    // Verify reviews section
    await expect(page.locator('[data-testid="product-reviews"]')).toBeVisible();
    await expect(page.locator('[data-testid="average-rating"]')).toBeVisible();
    await expect(page.locator('[data-testid="review-count"]')).toBeVisible();
    
    // Read individual reviews
    await expect(page.locator('[data-testid="review-item"]')).toHaveCount({ min: 1 });
    
    // Write a review (if purchased)
    const writeReviewButton = page.locator('[data-testid="write-review-button"]');
    if (await writeReviewButton.isVisible()) {
      await writeReviewButton.click();
      await page.selectOption('[data-testid="rating-select"]', '5');
      await page.fill('[data-testid="review-text"]', 'Great product, highly recommended!');
      await page.click('[data-testid="submit-review-button"]');
      await expect(page.locator('text=Review submitted')).toBeVisible();
    }
  });

  test('should handle subscription products', async ({ page }) => {
    // Filter for subscription products
    await page.click('[data-testid="product-type-filter"]');
    await page.click('[data-testid="subscription-products"]');
    
    // Click on subscription product
    await page.locator('[data-testid="subscription-product"]').first().click();
    
    // Verify subscription options
    await expect(page.locator('[data-testid="subscription-options"]')).toBeVisible();
    await expect(page.locator('[data-testid="subscription-frequency"]')).toBeVisible();
    
    // Select subscription frequency
    await page.click('[data-testid="monthly-subscription"]');
    
    // Add to cart
    await page.click('[data-testid="subscribe-button"]');
    await expect(page.locator('text=Subscription added')).toBeVisible();
  });

  test('should display travel-specific product categories', async ({ page }) => {
    // Verify travel categories
    await expect(page.locator('[data-testid="travel-essentials"]')).toBeVisible();
    await expect(page.locator('[data-testid="car-accessories"]')).toBeVisible();
    await expect(page.locator('[data-testid="camping-gear"]')).toBeVisible();
    await expect(page.locator('[data-testid="navigation-tools"]')).toBeVisible();
    
    // Click on camping gear
    await page.click('[data-testid="camping-gear"]');
    
    // Verify camping-specific products
    await expect(page.locator('[data-testid="product-item"]')).toHaveCount({ min: 1 });
    const productTitles = page.locator('[data-testid="product-title"]');
    await expect(productTitles.first()).toContainText(/tent|sleeping|camping/i);
  });

  test('should integrate with financial tracking', async ({ page }) => {
    // Complete a purchase
    await page.locator('[data-testid="product-item"]').first().click();
    await page.click('[data-testid="add-to-cart-button"]');
    await page.click('[data-testid="cart-button"]');
    await page.click('[data-testid="quick-checkout-button"]');
    
    // Verify purchase tracking option
    await expect(page.locator('[data-testid="track-expense-option"]')).toBeVisible();
    await page.check('[data-testid="track-expense-checkbox"]');
    await page.selectOption('[data-testid="expense-category"]', 'Travel');
    
    // Complete purchase
    await page.click('[data-testid="confirm-purchase-button"]');
    
    // Navigate to Wins to verify expense tracking
    await page.goto('/wins');
    await page.click('text=Expenses');
    
    // Verify purchase appears in expenses
    await expect(page.locator('[data-testid="recent-expenses"]')).toContainText('Shop Purchase');
  });
});