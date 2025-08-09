import { test, expect } from '@playwright/test';

test.describe('Wheels Trip Planning', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/wheels');
    await page.waitForLoadState('networkidle');
    
    // Authenticate if needed
    const isLoggedIn = await page.locator('[data-testid="user-menu"]').isVisible();
    if (!isLoggedIn) {
      await page.click('text=Sign In');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/wheels');
    }
  });

  test('should display trip planner interface', async ({ page }) => {
    await page.click('text=Trip Planner');
    
    await expect(page.locator('h1')).toContainText('Trip Planner');
    await expect(page.locator('[data-testid="origin-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="destination-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible();
  });

  test('should plan a basic route', async ({ page }) => {
    await page.click('text=Trip Planner');
    
    // Enter origin and destination
    await page.fill('[data-testid="origin-input"]', 'New York, NY');
    await page.fill('[data-testid="destination-input"]', 'Philadelphia, PA');
    
    // Plan route
    await page.click('[data-testid="plan-route-button"]');
    
    // Wait for route calculation
    await expect(page.locator('[data-testid="route-summary"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="route-distance"]')).toBeVisible();
    await expect(page.locator('[data-testid="route-duration"]')).toBeVisible();
  });

  test('should add waypoints to route', async ({ page }) => {
    await page.click('text=Trip Planner');
    
    await page.fill('[data-testid="origin-input"]', 'New York, NY');
    await page.fill('[data-testid="destination-input"]', 'Washington, DC');
    
    // Add waypoint
    await page.click('[data-testid="add-waypoint-button"]');
    await page.fill('[data-testid="waypoint-input-0"]', 'Philadelphia, PA');
    
    await page.click('[data-testid="plan-route-button"]');
    
    // Verify waypoint in route
    await expect(page.locator('[data-testid="waypoint-list"]')).toContainText('Philadelphia, PA');
    await expect(page.locator('[data-testid="route-segments"]')).toHaveCount(2);
  });

  test('should change travel modes', async ({ page }) => {
    await page.click('text=Trip Planner');
    
    // Test driving mode (default)
    await expect(page.locator('[data-testid="travel-mode-driving"]')).toHaveClass(/active/);
    
    // Switch to walking mode
    await page.click('[data-testid="travel-mode-walking"]');
    await expect(page.locator('[data-testid="travel-mode-walking"]')).toHaveClass(/active/);
    
    // Switch to cycling mode
    await page.click('[data-testid="travel-mode-cycling"]');
    await expect(page.locator('[data-testid="travel-mode-cycling"]')).toHaveClass(/active/);
  });

  test('should display vehicle information when selected', async ({ page }) => {
    await page.click('text=Trip Planner');
    
    // Select vehicle
    await page.click('[data-testid="vehicle-selector"]');
    await page.click('[data-testid="vehicle-option-0"]');
    
    // Verify vehicle info displayed
    await expect(page.locator('[data-testid="vehicle-info"]')).toBeVisible();
    await expect(page.locator('[data-testid="fuel-efficiency"]')).toBeVisible();
    await expect(page.locator('[data-testid="estimated-fuel-cost"]')).toBeVisible();
  });

  test('should integrate with PAM for route suggestions', async ({ page }) => {
    await page.click('text=Trip Planner');
    
    await page.fill('[data-testid="origin-input"]', 'Los Angeles, CA');
    await page.fill('[data-testid="destination-input"]', 'San Francisco, CA');
    
    // Ask PAM for route suggestions
    await page.click('[data-testid="ask-pam-button"]');
    
    // Verify PAM suggestions appear
    await expect(page.locator('[data-testid="pam-suggestions"]')).toBeVisible();
    await expect(page.locator('[data-testid="pam-route-recommendation"]')).toBeVisible();
    
    // Apply PAM suggestion
    await page.click('[data-testid="apply-pam-suggestion"]').first();
    
    // Verify route was updated
    await expect(page.locator('[data-testid="route-summary"]')).toBeVisible();
  });

  test('should save and load trips', async ({ page }) => {
    await page.click('text=Trip Planner');
    
    // Plan a route
    await page.fill('[data-testid="origin-input"]', 'Boston, MA');
    await page.fill('[data-testid="destination-input"]', 'New York, NY');
    await page.click('[data-testid="plan-route-button"]');
    
    await page.waitForSelector('[data-testid="route-summary"]');
    
    // Save trip
    await page.click('[data-testid="save-trip-button"]');
    await page.fill('[data-testid="trip-name-input"]', 'Boston to NYC Trip');
    await page.click('[data-testid="confirm-save-button"]');
    
    // Verify trip saved
    await expect(page.locator('text=Trip saved successfully')).toBeVisible();
    
    // Load saved trips
    await page.click('[data-testid="saved-trips-button"]');
    await expect(page.locator('text=Boston to NYC Trip')).toBeVisible();
    
    // Load a saved trip
    await page.click('[data-testid="load-trip-button"]').first();
    await expect(page.locator('[data-testid="origin-input"]')).toHaveValue('Boston, MA');
  });

  test('should display points of interest along route', async ({ page }) => {
    await page.click('text=Trip Planner');
    
    await page.fill('[data-testid="origin-input"]', 'Miami, FL');
    await page.fill('[data-testid="destination-input"]', 'Orlando, FL');
    await page.click('[data-testid="plan-route-button"]');
    
    await page.waitForSelector('[data-testid="route-summary"]');
    
    // Enable POI display
    await page.click('[data-testid="show-poi-button"]');
    
    // Select POI categories
    await page.check('[data-testid="poi-gas-stations"]');
    await page.check('[data-testid="poi-restaurants"]');
    await page.check('[data-testid="poi-hotels"]');
    
    // Verify POIs are displayed
    await expect(page.locator('[data-testid="poi-marker"]')).toHaveCount({ min: 1 });
    await expect(page.locator('[data-testid="poi-list"]')).toBeVisible();
  });

  test('should calculate trip budget', async ({ page }) => {
    await page.click('text=Trip Planner');
    
    // Plan route with vehicle selected
    await page.fill('[data-testid="origin-input"]', 'Denver, CO');
    await page.fill('[data-testid="destination-input"]', 'Las Vegas, NV');
    await page.click('[data-testid="vehicle-selector"]');
    await page.click('[data-testid="vehicle-option-0"]');
    await page.click('[data-testid="plan-route-button"]');
    
    await page.waitForSelector('[data-testid="route-summary"]');
    
    // Open budget calculator
    await page.click('[data-testid="budget-calculator-button"]');
    
    // Verify budget components
    await expect(page.locator('[data-testid="fuel-cost"]')).toBeVisible();
    await expect(page.locator('[data-testid="accommodation-cost"]')).toBeVisible();
    await expect(page.locator('[data-testid="food-cost"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-budget"]')).toBeVisible();
    
    // Adjust budget parameters
    await page.fill('[data-testid="accommodation-nights"]', '2');
    await page.fill('[data-testid="daily-food-budget"]', '50');
    
    // Verify total updates
    await expect(page.locator('[data-testid="total-budget"]')).not.toHaveText('$0');
  });

  test('should export trip itinerary', async ({ page }) => {
    await page.click('text=Trip Planner');
    
    // Plan a route with waypoints
    await page.fill('[data-testid="origin-input"]', 'Seattle, WA');
    await page.fill('[data-testid="destination-input"]', 'Portland, OR');
    await page.click('[data-testid="add-waypoint-button"]');
    await page.fill('[data-testid="waypoint-input-0"]', 'Olympia, WA');
    await page.click('[data-testid="plan-route-button"]');
    
    await page.waitForSelector('[data-testid="route-summary"]');
    
    // Export itinerary
    await page.click('[data-testid="export-itinerary-button"]');
    await page.click('[data-testid="export-pdf-option"]');
    
    // Verify download
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="confirm-export-button"]');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toContain('.pdf');
  });

  test('should work offline with cached maps', async ({ page }) => {
    await page.click('text=Trip Planner');
    
    // Plan route while online
    await page.fill('[data-testid="origin-input"]', 'Chicago, IL');
    await page.fill('[data-testid="destination-input"]', 'Milwaukee, WI');
    await page.click('[data-testid="plan-route-button"]');
    
    await page.waitForSelector('[data-testid="route-summary"]');
    
    // Cache route for offline use
    await page.click('[data-testid="cache-route-button"]');
    await expect(page.locator('text=Route cached for offline use')).toBeVisible();
    
    // Simulate offline
    await page.route('**/*', route => route.abort());
    
    // Verify offline banner appears
    await expect(page.locator('[data-testid="offline-banner"]')).toBeVisible();
    
    // Verify cached route still accessible
    await expect(page.locator('[data-testid="route-summary"]')).toBeVisible();
  });
});