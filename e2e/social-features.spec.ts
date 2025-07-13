import { test, expect } from '@playwright/test';

test.describe('Social Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/social');
    await page.waitForLoadState('networkidle');
    
    // Authenticate if needed
    const isLoggedIn = await page.locator('[data-testid="user-menu"]').isVisible();
    if (!isLoggedIn) {
      await page.click('text=Sign In');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/social');
    }
  });

  test('should display social feed', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Social Feed');
    await expect(page.locator('[data-testid="post-feed"]')).toBeVisible();
    await expect(page.locator('[data-testid="create-post-button"]')).toBeVisible();
  });

  test('should create a new post', async ({ page }) => {
    // Open post creation
    await page.click('[data-testid="create-post-button"]');
    
    // Fill post content
    await page.fill('[data-testid="post-content"]', 'Just completed an amazing road trip from LA to San Francisco! 🚗');
    
    // Add tags
    await page.fill('[data-testid="post-tags"]', 'roadtrip, california, travel');
    
    // Submit post
    await page.click('[data-testid="submit-post-button"]');
    
    // Verify post appears in feed
    await expect(page.locator('text=Just completed an amazing road trip')).toBeVisible();
    await expect(page.locator('[data-testid="post-tags"]')).toContainText('roadtrip');
  });

  test('should interact with posts (like, comment, share)', async ({ page }) => {
    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-item"]');
    
    const firstPost = page.locator('[data-testid="post-item"]').first();
    
    // Like post
    await firstPost.locator('[data-testid="like-button"]').click();
    await expect(firstPost.locator('[data-testid="like-count"]')).not.toHaveText('0');
    
    // Comment on post
    await firstPost.locator('[data-testid="comment-button"]').click();
    await page.fill('[data-testid="comment-input"]', 'Great trip! I love California drives.');
    await page.click('[data-testid="submit-comment-button"]');
    
    // Verify comment appears
    await expect(page.locator('text=Great trip! I love California drives.')).toBeVisible();
    
    // Share post
    await firstPost.locator('[data-testid="share-button"]').click();
    await expect(page.locator('[data-testid="share-modal"]')).toBeVisible();
    await page.click('[data-testid="share-to-feed-button"]');
    await expect(page.locator('text=Post shared successfully')).toBeVisible();
  });

  test('should create and manage groups', async ({ page }) => {
    // Navigate to groups
    await page.click('text=Groups');
    
    // Create new group
    await page.click('[data-testid="create-group-button"]');
    
    // Fill group details
    await page.fill('[data-testid="group-name"]', 'California Road Trip Enthusiasts');
    await page.fill('[data-testid="group-description"]', 'A community for people who love road trips in California');
    await page.selectOption('[data-testid="group-privacy"]', 'public');
    
    // Add group image
    await page.setInputFiles('[data-testid="group-image"]', 'test-fixtures/group-image.jpg');
    
    // Submit group creation
    await page.click('[data-testid="create-group-submit"]');
    
    // Verify group was created
    await expect(page.locator('text=California Road Trip Enthusiasts')).toBeVisible();
    await expect(page.locator('[data-testid="group-member-count"]')).toContainText('1 member');
  });

  test('should join and leave groups', async ({ page }) => {
    await page.click('text=Groups');
    
    // Find a group to join
    const publicGroup = page.locator('[data-testid="public-group-card"]').first();
    await publicGroup.click();
    
    // Join group
    await page.click('[data-testid="join-group-button"]');
    await expect(page.locator('text=You joined the group')).toBeVisible();
    await expect(page.locator('[data-testid="leave-group-button"]')).toBeVisible();
    
    // Leave group
    await page.click('[data-testid="leave-group-button"]');
    await page.click('[data-testid="confirm-leave-button"]');
    await expect(page.locator('[data-testid="join-group-button"]')).toBeVisible();
  });

  test('should use marketplace features', async ({ page }) => {
    // Navigate to marketplace
    await page.click('text=Marketplace');
    
    // Create new listing
    await page.click('[data-testid="create-listing-button"]');
    
    // Fill listing details
    await page.fill('[data-testid="listing-title"]', '2018 Honda Civic - Low Mileage');
    await page.fill('[data-testid="listing-price"]', '18500');
    await page.selectOption('[data-testid="listing-category"]', 'vehicles');
    await page.fill('[data-testid="listing-description"]', 'Well maintained Honda Civic with low mileage. Perfect for road trips!');
    
    // Add images
    await page.setInputFiles('[data-testid="listing-images"]', ['test-fixtures/car1.jpg', 'test-fixtures/car2.jpg']);
    
    // Set location
    await page.fill('[data-testid="listing-location"]', 'Los Angeles, CA');
    
    // Submit listing
    await page.click('[data-testid="submit-listing-button"]');
    
    // Verify listing appears
    await expect(page.locator('text=2018 Honda Civic - Low Mileage')).toBeVisible();
    await expect(page.locator('text=$18,500')).toBeVisible();
  });

  test('should filter and search marketplace listings', async ({ page }) => {
    await page.click('text=Marketplace');
    
    // Use search
    await page.fill('[data-testid="marketplace-search"]', 'Honda');
    await page.press('[data-testid="marketplace-search"]', 'Enter');
    
    // Verify search results
    await expect(page.locator('[data-testid="listing-item"]')).toHaveCount({ min: 1 });
    
    // Apply category filter
    await page.selectOption('[data-testid="category-filter"]', 'vehicles');
    
    // Apply price range filter
    await page.fill('[data-testid="min-price"]', '10000');
    await page.fill('[data-testid="max-price"]', '25000');
    await page.click('[data-testid="apply-filters-button"]');
    
    // Verify filtered results
    await expect(page.locator('[data-testid="listing-item"]')).toHaveCount({ min: 1 });
  });

  test('should manage friend connections', async ({ page }) => {
    // Navigate to friends/connections
    await page.click('[data-testid="friends-tab"]');
    
    // Send friend request
    await page.click('[data-testid="find-friends-button"]');
    await page.fill('[data-testid="friend-search"]', 'john@example.com');
    await page.press('[data-testid="friend-search"]', 'Enter');
    
    // Send request to found user
    await page.click('[data-testid="send-request-button"]').first();
    await expect(page.locator('text=Friend request sent')).toBeVisible();
    
    // Check pending requests
    await page.click('[data-testid="pending-requests-tab"]');
    await expect(page.locator('[data-testid="pending-request-item"]')).toHaveCount({ min: 1 });
  });

  test('should share trips to social feed', async ({ page }) => {
    // Navigate from trip planner
    await page.goto('/wheels');
    await page.click('text=Trip Planner');
    
    // Plan a quick route
    await page.fill('[data-testid="origin-input"]', 'San Diego, CA');
    await page.fill('[data-testid="destination-input"]', 'Los Angeles, CA');
    await page.click('[data-testid="plan-route-button"]');
    
    await page.waitForSelector('[data-testid="route-summary"]');
    
    // Share trip to social
    await page.click('[data-testid="share-trip-button"]');
    await page.click('[data-testid="share-to-social-button"]');
    
    // Add social post content
    await page.fill('[data-testid="social-post-content"]', 'Planning a weekend getaway to LA! 🌴');
    await page.click('[data-testid="publish-social-post-button"]');
    
    // Navigate back to social feed
    await page.goto('/social');
    
    // Verify trip post appears
    await expect(page.locator('text=Planning a weekend getaway to LA!')).toBeVisible();
    await expect(page.locator('[data-testid="trip-preview"]')).toBeVisible();
  });

  test('should moderate content and report inappropriate posts', async ({ page }) => {
    // Find a post to report
    const postToReport = page.locator('[data-testid="post-item"]').first();
    
    // Open post options
    await postToReport.locator('[data-testid="post-options-button"]').click();
    
    // Report post
    await page.click('[data-testid="report-post-button"]');
    
    // Select report reason
    await page.selectOption('[data-testid="report-reason"]', 'inappropriate-content');
    await page.fill('[data-testid="report-details"]', 'This post contains inappropriate content');
    
    // Submit report
    await page.click('[data-testid="submit-report-button"]');
    
    // Verify report submitted
    await expect(page.locator('text=Report submitted successfully')).toBeVisible();
  });

  test('should display user profiles with activity history', async ({ page }) => {
    // Click on a user's profile
    await page.locator('[data-testid="user-avatar"]').first().click();
    
    // Verify profile page
    await expect(page.locator('[data-testid="user-profile-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-stats"]')).toBeVisible();
    
    // Check activity tabs
    await expect(page.locator('[data-testid="posts-tab"]')).toBeVisible();
    await expect(page.locator('[data-testid="trips-tab"]')).toBeVisible();
    await expect(page.locator('[data-testid="groups-tab"]')).toBeVisible();
    
    // Navigate through tabs
    await page.click('[data-testid="trips-tab"]');
    await expect(page.locator('[data-testid="user-trips-list"]')).toBeVisible();
    
    await page.click('[data-testid="groups-tab"]');
    await expect(page.locator('[data-testid="user-groups-list"]')).toBeVisible();
  });

  test('should work with real-time notifications', async ({ page }) => {
    // Enable notifications if not already enabled
    await page.click('[data-testid="notifications-button"]');
    
    // Verify notifications panel
    await expect(page.locator('[data-testid="notifications-panel"]')).toBeVisible();
    
    // Check for real-time updates (simulate with manual refresh)
    await page.reload();
    
    // Verify notification indicators
    const notificationBadge = page.locator('[data-testid="notification-badge"]');
    if (await notificationBadge.isVisible()) {
      await expect(notificationBadge).toHaveText(/\d+/);
    }
    
    // Mark notifications as read
    await page.click('[data-testid="mark-all-read-button"]');
    await expect(page.locator('[data-testid="notification-badge"]')).not.toBeVisible();
  });
});