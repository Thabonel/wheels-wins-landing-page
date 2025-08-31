import { Page, Locator } from '@playwright/test';

export interface CrawlResult {
  url: string;
  title: string;
  status: 'pass' | 'fail' | 'warning';
  errors: string[];
  warnings: string[];
  buttons: ButtonTest[];
  forms: FormTest[];
  links: LinkTest[];
  loadTime: number;
  screenshots: string[];
  timestamp: Date;
}

export interface ButtonTest {
  selector: string;
  text: string;
  clickable: boolean;
  error?: string;
  responseTime?: number;
}

export interface FormTest {
  selector: string;
  name: string;
  submittable: boolean;
  fields: number;
  error?: string;
}

export interface LinkTest {
  href: string;
  text: string;
  reachable: boolean;
  statusCode?: number;
  error?: string;
}

export class CrawlerHelper {
  private results: CrawlResult[] = [];
  
  constructor(private page: Page) {}

  async crawlPage(url: string): Promise<CrawlResult> {
    const startTime = Date.now();
    const result: CrawlResult = {
      url,
      title: '',
      status: 'pass',
      errors: [],
      warnings: [],
      buttons: [],
      forms: [],
      links: [],
      loadTime: 0,
      screenshots: [],
      timestamp: new Date()
    };

    try {
      // Navigate to page
      await this.page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      result.title = await this.page.title();
      result.loadTime = Date.now() - startTime;

      // Test buttons
      result.buttons = await this.testButtons();
      
      // Test forms
      result.forms = await this.testForms();
      
      // Test links
      result.links = await this.testLinks();

      // Check for console errors
      await this.checkConsoleErrors(result);

      // Determine overall status
      if (result.errors.length > 0) {
        result.status = 'fail';
      } else if (result.warnings.length > 0) {
        result.status = 'warning';
      }

    } catch (error) {
      result.status = 'fail';
      result.errors.push(`Page load failed: ${error.message}`);
      
      // Take screenshot on failure
      const screenshotPath = `test-results/screenshots/error-${Date.now()}.png`;
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      result.screenshots.push(screenshotPath);
    }

    this.results.push(result);
    return result;
  }

  async testButtons(): Promise<ButtonTest[]> {
    const buttons: ButtonTest[] = [];
    const buttonElements = await this.page.$$('button, [role="button"], input[type="submit"], input[type="button"]');

    for (const element of buttonElements) {
      const button: ButtonTest = {
        selector: '',
        text: '',
        clickable: false
      };

      try {
        button.text = (await element.textContent()) || '';
        button.selector = await this.getSelector(element);
        
        // Check if clickable
        const isDisabled = await element.isDisabled();
        const isVisible = await element.isVisible();
        button.clickable = !isDisabled && isVisible;

        if (button.clickable) {
          // Try to click (with timeout)
          const startTime = Date.now();
          try {
            await element.click({ timeout: 2000, trial: true });
            button.responseTime = Date.now() - startTime;
          } catch (clickError) {
            button.error = `Click failed: ${clickError.message}`;
            button.clickable = false;
          }
        }

      } catch (error) {
        button.error = error.message;
      }

      buttons.push(button);
    }

    return buttons;
  }

  async testForms(): Promise<FormTest[]> {
    const forms: FormTest[] = [];
    const formElements = await this.page.$$('form');

    for (const element of formElements) {
      const form: FormTest = {
        selector: '',
        name: '',
        submittable: false,
        fields: 0
      };

      try {
        form.selector = await this.getSelector(element);
        form.name = await element.getAttribute('name') || await element.getAttribute('id') || 'unnamed';
        
        // Count form fields
        const fields = await element.$$('input, textarea, select');
        form.fields = fields.length;

        // Check if form has submit button
        const submitButton = await element.$('button[type="submit"], input[type="submit"]');
        form.submittable = submitButton !== null;

      } catch (error) {
        form.error = error.message;
      }

      forms.push(form);
    }

    return forms;
  }

  async testLinks(): Promise<LinkTest[]> {
    const links: LinkTest[] = [];
    const linkElements = await this.page.$$('a[href]');
    const checkedUrls = new Set<string>();

    for (const element of linkElements) {
      const link: LinkTest = {
        href: '',
        text: '',
        reachable: false
      };

      try {
        link.href = await element.getAttribute('href') || '';
        link.text = (await element.textContent()) || '';

        // Skip if already checked or if it's not HTTP
        if (checkedUrls.has(link.href) || 
            (!link.href.startsWith('http') && !link.href.startsWith('/'))) {
          continue;
        }

        checkedUrls.add(link.href);

        // Check if internal link
        if (link.href.startsWith('/') || link.href.includes(this.page.url())) {
          try {
            const response = await this.page.request.head(link.href);
            link.statusCode = response.status();
            link.reachable = response.ok();
          } catch (error) {
            link.error = `Link check failed: ${error.message}`;
          }
        } else {
          // External link - mark as unchecked
          link.reachable = true;
          link.error = 'External link not checked';
        }

      } catch (error) {
        link.error = error.message;
      }

      links.push(link);
    }

    return links;
  }

  async checkConsoleErrors(result: CrawlResult) {
    // Listen for console messages
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        result.errors.push(`Console error: ${msg.text()}`);
      } else if (msg.type() === 'warning') {
        result.warnings.push(`Console warning: ${msg.text()}`);
      }
    });

    // Check for JavaScript errors
    this.page.on('pageerror', (error) => {
      result.errors.push(`JavaScript error: ${error.message}`);
    });
  }

  async getSelector(element: Locator | any): Promise<string> {
    // Try to get a unique selector for the element
    try {
      const id = await element.getAttribute('id');
      if (id) return `#${id}`;

      const className = await element.getAttribute('class');
      const tagName = await element.evaluate((el: Element) => el.tagName.toLowerCase());
      
      if (className) {
        return `${tagName}.${className.split(' ')[0]}`;
      }

      return tagName;
    } catch {
      return 'unknown';
    }
  }

  async discoverAllPages(): Promise<string[]> {
    const pages = new Set<string>();
    const baseUrl = this.page.url().split('?')[0];
    
    // Get all internal links
    const links = await this.page.$$eval('a[href]', (elements) => 
      elements.map(el => el.getAttribute('href')).filter(Boolean)
    );

    for (const link of links) {
      if (link.startsWith('/')) {
        pages.add(new URL(link, baseUrl).href);
      } else if (link.startsWith(baseUrl)) {
        pages.add(link.split('?')[0]);
      }
    }

    return Array.from(pages);
  }

  getResults(): CrawlResult[] {
    return this.results;
  }

  getSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;

    const totalButtons = this.results.reduce((sum, r) => sum + r.buttons.length, 0);
    const clickableButtons = this.results.reduce((sum, r) => 
      sum + r.buttons.filter(b => b.clickable).length, 0);

    const totalForms = this.results.reduce((sum, r) => sum + r.forms.length, 0);
    const submittableForms = this.results.reduce((sum, r) => 
      sum + r.forms.filter(f => f.submittable).length, 0);

    const totalLinks = this.results.reduce((sum, r) => sum + r.links.length, 0);
    const reachableLinks = this.results.reduce((sum, r) => 
      sum + r.links.filter(l => l.reachable).length, 0);

    return {
      pages: { total, passed, failed, warnings },
      buttons: { total: totalButtons, clickable: clickableButtons },
      forms: { total: totalForms, submittable: submittableForms },
      links: { total: totalLinks, reachable: reachableLinks },
      avgLoadTime: this.results.reduce((sum, r) => sum + r.loadTime, 0) / total
    };
  }
}