import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    // Navigate to login if not already there
    if (await page.getByText('Sign In').isVisible()) {
      await page.getByText('Sign In').click();
    }
    
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /password/i })).toBeVisible();
  });

  test('should show validation errors for invalid input', async ({ page }) => {
    // Navigate to login
    if (await page.getByText('Sign In').isVisible()) {
      await page.getByText('Sign In').click();
    }
    
    // Try to submit with empty fields
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should show validation errors
    await expect(page.getByText(/email is required/i)).toBeVisible();
    await expect(page.getByText(/password is required/i)).toBeVisible();
  });

  test('should navigate to signup page', async ({ page }) => {
    // Navigate to login first
    if (await page.getByText('Sign In').isVisible()) {
      await page.getByText('Sign In').click();
    }
    
    // Click sign up link
    await page.getByText(/don't have an account/i).click();
    
    await expect(page.getByRole('heading', { name: /sign up/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /full name/i })).toBeVisible();
  });

  test('should handle authentication state changes', async ({ page }) => {
    // Mock successful authentication (this would require proper test user setup)
    // For now, just verify the auth flow exists
    
    if (await page.getByText('Sign In').isVisible()) {
      await page.getByText('Sign In').click();
    }
    
    await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
    await page.getByRole('textbox', { name: /password/i }).fill('password123');
    
    // Note: In real tests, you'd want to use a test user or mock the auth service
    // For demo purposes, we're just testing the form interaction
    expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });
});

test.describe('Protected Routes', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Try to access a protected route
    await page.goto('/admin');
    
    // Should be redirected to login or show auth prompt
    await expect(page.getByText(/sign in/i).or(page.getByText(/login/i))).toBeVisible();
  });
});