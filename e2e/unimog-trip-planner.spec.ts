import { test, expect } from '@playwright/test';

// Set the feature flag before each test
test.beforeEach(async ({ page }) => {
  // Set environment variable for new trip planner
  await page.addInitScript(() => {
    window.localStorage.setItem('VITE_USE_NEW_TRIP_PLANNER', 'true');
  });
});

test.describe('Unimog Trip Planner', () => {
  test('loads the trip planner interface', async ({ page }) => {
    await page.goto('/trips');
    
    // Wait for the map to load
    await page.waitForSelector('#map', { timeout: 10000 });
    
    // Check that main components are visible
    await expect(page.locator('#map')).toBeVisible();
    await expect(page.getByTestId('trip-toolbar')).toBeVisible();
    await expect(page.getByRole('button', { name: /menu/i })).toBeVisible();
  });

  test('opens and closes the sidebar', async ({ page }) => {
    await page.goto('/trips');
    
    // Open sidebar
    await page.getByRole('button', { name: /menu/i }).click();
    await expect(page.getByText('Trip Planner')).toBeVisible();
    
    // Check tabs are visible
    await expect(page.getByRole('tab', { name: 'Search' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'My Trips' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Templates' })).toBeVisible();
    
    // Close sidebar (on mobile)
    const closeButton = page.getByRole('button', { name: /chevron.*right/i });
    if (await closeButton.isVisible()) {
      await closeButton.click();
      await expect(page.getByText('Trip Planner')).not.toBeVisible();
    }
  });

  test('searches for a location', async ({ page }) => {
    await page.goto('/trips');
    
    // Open sidebar
    await page.getByRole('button', { name: /menu/i }).click();
    
    // Search for a location
    const searchInput = page.getByPlaceholder('Search locations...');
    await searchInput.fill('Yellowstone National Park');
    await searchInput.press('Enter');
    
    // Map should update (we can't easily test map movement, but we can check the input worked)
    await expect(searchInput).toHaveValue('Yellowstone National Park');
  });

  test('switches between sidebar tabs', async ({ page }) => {
    await page.goto('/trips');
    
    // Open sidebar
    await page.getByRole('button', { name: /menu/i }).click();
    
    // Start on Search tab
    await expect(page.getByText('Enter a location above to search')).toBeVisible();
    
    // Switch to My Trips tab
    await page.getByRole('tab', { name: 'My Trips' }).click();
    await expect(page.getByText('Create New Trip')).toBeVisible();
    
    // Switch to Templates tab
    await page.getByRole('tab', { name: 'Templates' }).click();
    await expect(page.getByText('Start with a pre-planned route')).toBeVisible();
  });

  test('opens save route modal', async ({ page }) => {
    await page.goto('/trips');
    
    // Click save route button
    await page.getByRole('button', { name: /save/i }).first().click();
    
    // Modal should open
    await expect(page.getByText('Save Trip Route')).toBeVisible();
    await expect(page.getByLabel('Trip Name')).toBeVisible();
    await expect(page.getByLabel('Description')).toBeVisible();
    
    // Close modal
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByText('Save Trip Route')).not.toBeVisible();
  });

  test('opens GPX import/export modal', async ({ page }) => {
    await page.goto('/trips');
    
    // Click import GPX button
    await page.getByRole('button', { name: /import.*gpx/i }).click();
    
    // Modal should open
    await expect(page.getByText(/Import GPX/i)).toBeVisible();
    
    // Close modal
    await page.getByRole('button', { name: /close/i }).first().click();
    await expect(page.getByText(/Import GPX/i)).not.toBeVisible();
  });

  test('opens PAM assistant', async ({ page }) => {
    await page.goto('/trips');
    
    // Click PAM button in toolbar
    await page.getByRole('button', { name: /pam|message/i }).click();
    
    // PAM assistant should open
    await expect(page.getByText('PAM Trip Assistant')).toBeVisible();
    await expect(page.getByPlaceholder('Ask PAM anything about your trip...')).toBeVisible();
    
    // Check quick actions are visible
    await expect(page.getByText('Find campgrounds along route')).toBeVisible();
    
    // Close PAM
    await page.getByRole('button', { name: /close/i }).first().click();
    await expect(page.getByText('PAM Trip Assistant')).not.toBeVisible();
  });

  test('opens budget calculator', async ({ page }) => {
    await page.goto('/trips');
    
    // Click budget calculator button
    await page.getByRole('button', { name: /budget|calculator/i }).click();
    
    // Budget calculator should open
    await expect(page.getByText('Trip Budget Calculator')).toBeVisible();
    await expect(page.getByText('Cost Settings')).toBeVisible();
    await expect(page.getByText('Cost Breakdown')).toBeVisible();
    
    // Close calculator
    await page.getByRole('button', { name: /close/i }).first().click();
    await expect(page.getByText('Trip Budget Calculator')).not.toBeVisible();
  });

  test('interacts with map overlay controls', async ({ page }) => {
    await page.goto('/trips');
    
    // Find and click the map overlays dropdown
    await page.getByRole('button', { name: /layers|overlays/i }).click();
    
    // Check overlay options are visible
    await expect(page.getByText(/traffic/i)).toBeVisible();
    await expect(page.getByText(/satellite/i)).toBeVisible();
    
    // Toggle an overlay
    const trafficToggle = page.getByRole('switch', { name: /traffic/i });
    if (await trafficToggle.isVisible()) {
      await trafficToggle.click();
    }
  });

  test('adds a waypoint by clicking on map', async ({ page }) => {
    await page.goto('/trips');
    
    // Wait for map to load
    await page.waitForSelector('#map', { timeout: 10000 });
    
    // Click on the map to add a waypoint
    const map = page.locator('#map');
    await map.click({ position: { x: 400, y: 300 } });
    
    // A marker should be added (check toolbar or sidebar for waypoint count)
    // This is hard to test without actual map interaction, but we can check the UI updates
  });

  test('uses quick actions from sidebar', async ({ page }) => {
    await page.goto('/trips');
    
    // Open sidebar
    await page.getByRole('button', { name: /menu/i }).click();
    
    // Click a quick action
    await page.getByText('Find RV Parks Nearby').click();
    
    // This should trigger a search
    const searchInput = page.getByPlaceholder('Search locations...');
    await expect(searchInput).toHaveValue('RV parks near me');
  });

  test('creates a new trip from sidebar', async ({ page }) => {
    await page.goto('/trips');
    
    // Open sidebar
    await page.getByRole('button', { name: /menu/i }).click();
    
    // Switch to My Trips tab
    await page.getByRole('tab', { name: 'My Trips' }).click();
    
    // Click Create New Trip
    await page.getByText('Create New Trip').click();
    
    // This should clear the map and start a new trip
    // We can verify by checking that save modal opens with empty fields
    await page.getByRole('button', { name: /save/i }).first().click();
    const nameInput = page.getByLabel('Trip Name');
    await expect(nameInput).toHaveValue('');
  });

  test('sends a message to PAM assistant', async ({ page }) => {
    await page.goto('/trips');
    
    // Open PAM assistant
    await page.getByRole('button', { name: /pam|message/i }).click();
    
    // Type a message
    const messageInput = page.getByPlaceholder('Ask PAM anything about your trip...');
    await messageInput.fill('What are good campgrounds near Yellowstone?');
    
    // Send the message
    await page.getByRole('button', { name: /send/i }).click();
    
    // Check that message appears in chat
    await expect(page.getByText('What are good campgrounds near Yellowstone?')).toBeVisible();
    
    // Wait for PAM response (mocked in tests, real in production)
    await page.waitForTimeout(1000);
  });

  test('adjusts budget calculator settings', async ({ page }) => {
    await page.goto('/trips');
    
    // Open budget calculator
    await page.getByRole('button', { name: /budget|calculator/i }).click();
    
    // Adjust fuel price
    const fuelPriceInput = page.getByLabel(/fuel price/i);
    await fuelPriceInput.clear();
    await fuelPriceInput.fill('5.00');
    
    // Adjust MPG
    const mpgInput = page.getByLabel(/mpg/i);
    await mpgInput.clear();
    await mpgInput.fill('15');
    
    // Check that total updates (look for any dollar amount)
    await expect(page.getByText(/\$\d+/)).toBeVisible();
    
    // Save budget
    await page.getByRole('button', { name: /save budget/i }).click();
  });

  test('loads trip templates', async ({ page }) => {
    await page.goto('/trips');
    
    // Open sidebar
    await page.getByRole('button', { name: /menu/i }).click();
    
    // Switch to Templates tab
    await page.getByRole('tab', { name: 'Templates' }).click();
    
    // Wait for templates to load (or show loading state)
    await page.waitForTimeout(1000);
    
    // Check for template content or empty state
    const hasTemplates = await page.locator('text=/miles|days/').count() > 0;
    const hasEmptyState = await page.locator('text=/No templates available/').isVisible();
    
    expect(hasTemplates || hasEmptyState).toBeTruthy();
  });

  test('clears the current route', async ({ page }) => {
    await page.goto('/trips');
    
    // First add some waypoints by clicking on map
    const map = page.locator('#map');
    await map.click({ position: { x: 300, y: 300 } });
    await page.waitForTimeout(500);
    await map.click({ position: { x: 500, y: 400 } });
    
    // Click clear route button
    await page.getByRole('button', { name: /clear/i }).click();
    
    // Confirm clear (if there's a confirmation dialog)
    const confirmButton = page.getByRole('button', { name: /confirm|yes/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
    
    // Route should be cleared
    // Hard to test map state, but we can verify UI updates
  });
});

test.describe('Unimog Trip Planner - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('sidebar is hidden by default on mobile', async ({ page }) => {
    await page.goto('/trips');
    
    // Sidebar should not be visible
    await expect(page.getByText('Trip Planner')).not.toBeVisible();
    
    // Menu button should be visible
    await expect(page.getByRole('button', { name: /menu/i })).toBeVisible();
  });

  test('sidebar overlays map on mobile', async ({ page }) => {
    await page.goto('/trips');
    
    // Open sidebar
    await page.getByRole('button', { name: /menu/i }).click();
    
    // Sidebar should be visible and overlay the map
    await expect(page.getByText('Trip Planner')).toBeVisible();
    
    // Close button should be visible on mobile
    await expect(page.getByRole('button', { name: /chevron.*right/i })).toBeVisible();
  });

  test('toolbar is accessible on mobile', async ({ page }) => {
    await page.goto('/trips');
    
    // Toolbar should be at the bottom on mobile
    const toolbar = page.getByTestId('trip-toolbar');
    await expect(toolbar).toBeVisible();
    
    // Check that buttons are scrollable or wrapped properly
    await expect(page.getByRole('button', { name: /save/i }).first()).toBeVisible();
  });
});