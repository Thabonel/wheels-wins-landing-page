import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('should load home page within performance budget', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Performance budget: page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    // Check Core Web Vitals
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals = {};
          
          entries.forEach((entry) => {
            if (entry.entryType === 'largest-contentful-paint') {
              vitals.lcp = entry.startTime;
            }
            if (entry.entryType === 'first-input') {
              vitals.fid = entry.processingStart - entry.startTime;
            }
            if (entry.entryType === 'layout-shift') {
              vitals.cls = entry.value;
            }
          });
          
          resolve(vitals);
        }).observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
        
        // Fallback timeout
        setTimeout(() => resolve({}), 5000);
      });
    });
    
    // Core Web Vitals thresholds
    if (metrics.lcp) expect(metrics.lcp).toBeLessThan(2500); // LCP < 2.5s
    if (metrics.fid) expect(metrics.fid).toBeLessThan(100);  // FID < 100ms
    if (metrics.cls) expect(metrics.cls).toBeLessThan(0.1);  // CLS < 0.1
  });

  test('should handle large data sets efficiently', async ({ page }) => {
    await page.goto('/wins');
    
    // Mock large expense dataset
    await page.route('**/api/expenses', (route) => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        amount: Math.random() * 1000,
        category: 'Food',
        description: `Expense ${i}`,
        date: new Date().toISOString()
      }));
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(largeDataset)
      });
    });
    
    const startTime = Date.now();
    await page.reload();
    await page.waitForSelector('[data-testid="expense-list"]');
    
    const renderTime = Date.now() - startTime;
    
    // Large dataset should render within 5 seconds
    expect(renderTime).toBeLessThan(5000);
    
    // Verify virtualization is working (only visible items rendered)
    const renderedItems = await page.locator('[data-testid="expense-item"]').count();
    expect(renderedItems).toBeLessThan(50); // Should not render all 1000 items
  });

  test('should maintain performance during PAM interactions', async ({ page }) => {
    await page.goto('/');
    
    // Open PAM chat
    await page.click('[data-testid="pam-button"]');
    
    const startTime = Date.now();
    
    // Send multiple messages rapidly
    for (let i = 0; i < 5; i++) {
      await page.fill('[data-testid="pam-input"]', `Test message ${i}`);
      await page.press('[data-testid="pam-input"]', 'Enter');
      await page.waitForTimeout(100); // Small delay between messages
    }
    
    // Wait for all responses
    await page.waitForSelector('[data-testid="pam-message"]', { timeout: 10000 });
    
    const totalTime = Date.now() - startTime;
    
    // Multiple PAM interactions should complete within 10 seconds
    expect(totalTime).toBeLessThan(10000);
    
    // Check memory usage hasn't grown excessively
    const jsHeapSize = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    // Memory usage should be reasonable (< 100MB)
    if (jsHeapSize > 0) {
      expect(jsHeapSize).toBeLessThan(100 * 1024 * 1024);
    }
  });

  test('should load images efficiently with lazy loading', async ({ page }) => {
    await page.goto('/shop');
    
    // Count initial image requests
    let imageRequests = 0;
    page.on('request', (request) => {
      if (request.url().match(/\.(jpg|jpeg|png|webp)$/i)) {
        imageRequests++;
      }
    });
    
    await page.waitForLoadState('networkidle');
    const initialImages = imageRequests;
    
    // Scroll down to trigger lazy loading
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
    });
    
    await page.waitForTimeout(2000);
    const afterScrollImages = imageRequests;
    
    // More images should load after scrolling (lazy loading working)
    expect(afterScrollImages).toBeGreaterThan(initialImages);
    
    // But not all images should load initially
    expect(initialImages).toBeLessThan(20);
  });

  test('should handle map rendering performance', async ({ page }) => {
    await page.goto('/wheels');
    await page.click('text=Trip Planner');
    
    const startTime = Date.now();
    
    // Wait for map to load
    await page.waitForSelector('[data-testid="map-container"]');
    await page.waitForFunction(() => {
      return document.querySelector('[data-testid="map-container"] canvas') !== null;
    });
    
    const mapLoadTime = Date.now() - startTime;
    
    // Map should load within 5 seconds
    expect(mapLoadTime).toBeLessThan(5000);
    
    // Test map interaction performance
    const interactionStart = Date.now();
    
    // Simulate map zoom
    await page.mouse.click(500, 300);
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(500);
    
    const interactionTime = Date.now() - interactionStart;
    
    // Map interactions should be responsive (< 1 second)
    expect(interactionTime).toBeLessThan(1000);
  });

  test('should maintain performance with real-time updates', async ({ page }) => {
    await page.goto('/social');
    
    // Mock WebSocket for real-time updates
    await page.evaluate(() => {
      const mockWs = {
        send: () => {},
        close: () => {},
        readyState: 1,
        addEventListener: (event, callback) => {
          if (event === 'message') {
            // Simulate frequent updates
            setInterval(() => {
              callback({
                data: JSON.stringify({
                  type: 'new_post',
                  data: { id: Date.now(), content: 'New post', user: 'Test User' }
                })
              });
            }, 1000);
          }
        }
      };
      
      (window as any).WebSocket = function() { return mockWs; };
    });
    
    const startTime = Date.now();
    
    // Wait for several real-time updates
    await page.waitForTimeout(5000);
    
    // Check that performance hasn't degraded
    const jsHeapSize = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    // Memory shouldn't grow excessively with real-time updates
    if (jsHeapSize > 0) {
      expect(jsHeapSize).toBeLessThan(150 * 1024 * 1024);
    }
    
    // Page should still be responsive
    const responseStart = Date.now();
    await page.click('[data-testid="create-post-button"]');
    const responseTime = Date.now() - responseStart;
    
    expect(responseTime).toBeLessThan(500);
  });

  test('should handle offline performance gracefully', async ({ page }) => {
    await page.goto('/');
    
    // Enable offline mode
    await page.context().setOffline(true);
    
    const startTime = Date.now();
    
    // Navigate to cached page
    await page.goto('/wheels');
    
    // Should load from cache relatively quickly
    const offlineLoadTime = Date.now() - startTime;
    expect(offlineLoadTime).toBeLessThan(2000);
    
    // Verify offline indicators
    await expect(page.locator('[data-testid="offline-banner"]')).toBeVisible();
    
    // Test offline functionality
    await page.click('text=Trip Planner');
    await expect(page.locator('[data-testid="offline-trip-notice"]')).toBeVisible();
  });

  test('should optimize bundle size and loading', async ({ page }) => {
    // Navigate and measure resource loading
    const responses = [];
    page.on('response', (response) => {
      if (response.url().includes('.js') || response.url().includes('.css')) {
        responses.push({
          url: response.url(),
          size: parseInt(response.headers()['content-length'] || '0'),
          status: response.status()
        });
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Calculate total bundle size
    const totalSize = responses.reduce((sum, response) => sum + response.size, 0);
    
    // Bundle should be reasonably sized (< 5MB total)
    expect(totalSize).toBeLessThan(5 * 1024 * 1024);
    
    // No large individual files
    const largeFiles = responses.filter(r => r.size > 1024 * 1024);
    expect(largeFiles.length).toBeLessThan(3);
    
    // All resources should load successfully
    const failedResources = responses.filter(r => r.status >= 400);
    expect(failedResources).toHaveLength(0);
  });

  test('should handle high-frequency user interactions', async ({ page }) => {
    await page.goto('/');
    
    const startTime = Date.now();
    
    // Rapid navigation simulation
    for (let i = 0; i < 10; i++) {
      await page.click('text=Features');
      await page.waitForTimeout(100);
      await page.click('text=Home');
      await page.waitForTimeout(100);
    }
    
    const navigationTime = Date.now() - startTime;
    
    // Rapid navigation should complete within reasonable time
    expect(navigationTime).toBeLessThan(5000);
    
    // Check for memory leaks
    const jsHeapSize = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    if (jsHeapSize > 0) {
      expect(jsHeapSize).toBeLessThan(200 * 1024 * 1024);
    }
  });
});