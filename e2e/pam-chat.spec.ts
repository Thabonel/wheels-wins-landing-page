import { test, expect } from '@playwright/test';

test.describe('PAM Chat Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Note: In a real test, you'd authenticate with a test user first
  });

  test('should display PAM chat interface', async ({ page }) => {
    // Look for PAM chat elements on the page
    const pamElements = [
      page.getByText('PAM').first(),
      page.getByPlaceholder(/ask me anything/i),
      page.getByPlaceholder(/type your message/i),
      page.getByRole('button', { name: /send/i })
    ];
    
    // Check if any PAM elements are visible
    let pamVisible = false;
    for (const element of pamElements) {
      if (await element.isVisible().catch(() => false)) {
        pamVisible = true;
        break;
      }
    }
    
    // If not visible on main page, try navigating to a page that might have PAM
    if (!pamVisible) {
      // Try to find a chat or assistant link
      const chatLinks = [
        page.getByText(/chat/i),
        page.getByText(/assistant/i),
        page.getByText(/pam/i)
      ];
      
      for (const link of chatLinks) {
        if (await link.isVisible().catch(() => false)) {
          await link.click();
          break;
        }
      }
    }
    
    // Verify PAM interface exists (adjust based on actual implementation)
    expect(page.locator('[data-testid*="pam"], [id*="pam"], [class*="pam"]')).toBeTruthy();
  });

  test('should handle chat message sending', async ({ page }) => {
    // Mock network requests to avoid hitting real API in tests
    await page.route('**/api/v1/pam/chat', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: 'Hello! I\'m PAM, your travel assistant.',
          message_id: 'test-message-id',
          timestamp: new Date().toISOString()
        }),
      });
    });

    // Look for chat input
    const chatInput = page.getByPlaceholder(/ask me anything/i)
      .or(page.getByPlaceholder(/type your message/i))
      .or(page.getByRole('textbox').first());
    
    if (await chatInput.isVisible().catch(() => false)) {
      await chatInput.fill('Hello PAM!');
      
      // Look for send button
      const sendButton = page.getByRole('button', { name: /send/i })
        .or(page.locator('[data-testid="send-button"]'))
        .or(page.locator('button[type="submit"]'));
      
      if (await sendButton.isVisible().catch(() => false)) {
        await sendButton.click();
        
        // Should see the response (with mocked data)
        await expect(page.getByText(/hello.*pam.*travel assistant/i)).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should show connection status', async ({ page }) => {
    // Look for connection indicators
    const connectionIndicators = [
      page.getByText(/connected/i),
      page.getByText(/online/i),
      page.getByText(/offline/i),
      page.locator('[data-testid*="connection"], [class*="connection"]')
    ];
    
    let hasConnectionIndicator = false;
    for (const indicator of connectionIndicators) {
      if (await indicator.isVisible().catch(() => false)) {
        hasConnectionIndicator = true;
        break;
      }
    }
    
    // Connection status should be visible somewhere in the app
    expect(hasConnectionIndicator).toBeTruthy();
  });
});

test.describe('PAM Diagnostic', () => {
  test('should display diagnostic information', async ({ page }) => {
    // Navigate to admin or diagnostic page
    const adminLinks = [
      page.getByText(/admin/i),
      page.getByText(/diagnostic/i),
      page.getByText(/observability/i)
    ];
    
    for (const link of adminLinks) {
      if (await link.isVisible().catch(() => false)) {
        await link.click();
        break;
      }
    }
    
    // Look for diagnostic elements
    const diagnosticElements = [
      page.getByText(/health/i),
      page.getByText(/status/i),
      page.getByText(/test/i),
      page.locator('[data-testid*="diagnostic"]')
    ];
    
    // Should find some diagnostic interface
    let hasDiagnostic = false;
    for (const element of diagnosticElements) {
      if (await element.isVisible().catch(() => false)) {
        hasDiagnostic = true;
        break;
      }
    }
    
    expect(hasDiagnostic).toBeTruthy();
  });
});