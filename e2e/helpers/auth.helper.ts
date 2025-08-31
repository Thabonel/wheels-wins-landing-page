import { Page } from '@playwright/test';

export class AuthHelper {
  constructor(private page: Page) {}

  async login(email: string = 'test@example.com', password: string = 'Test123456!') {
    await this.page.goto('/login');
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
    await this.page.click('button[type="submit"]');
    
    // Wait for navigation or success indicator
    await this.page.waitForURL((url) => !url.pathname.includes('/login'), { 
      timeout: 10000,
      waitUntil: 'networkidle' 
    });
  }

  async logout() {
    // Click on profile menu if exists
    const profileButton = await this.page.$('[aria-label="Profile menu"], [data-testid="profile-menu"]');
    if (profileButton) {
      await profileButton.click();
      await this.page.click('text=Logout');
    }
  }

  async isAuthenticated(): Promise<boolean> {
    // Check for auth indicators
    const profileElement = await this.page.$('[aria-label="Profile menu"], [data-testid="profile-menu"], a[href="/profile"]');
    return profileElement !== null;
  }

  async ensureLoggedIn() {
    const isLoggedIn = await this.isAuthenticated();
    if (!isLoggedIn) {
      await this.login();
    }
  }
}