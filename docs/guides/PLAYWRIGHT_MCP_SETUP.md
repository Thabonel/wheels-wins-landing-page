# Playwright MCP Server Setup

## ✅ Installation Complete

The Playwright MCP (Model Context Protocol) server has been successfully installed and configured for browser automation and testing.

## What is Playwright MCP?

Playwright MCP allows Claude to:
- 🌐 **Control browsers** - Navigate, click, type, and interact with web pages
- 🧪 **Run automated tests** - Execute end-to-end tests on your application
- 📸 **Take screenshots** - Capture visual states for debugging
- 🔍 **Extract data** - Scrape and analyze web content
- 🎭 **Multi-browser support** - Test on Chromium, Firefox, and WebKit

## Configuration

### MCP Configuration File
**Location**: `~/.config/claude-code/mcp.json`

```json
{
  "playwright": {
    "command": "npx",
    "args": ["@playwright/mcp"],
    "env": {
      "PLAYWRIGHT_HEADLESS": "false"
    }
  }
}
```

### Environment Variables
- `PLAYWRIGHT_HEADLESS`: Set to `"false"` to see the browser window during automation
- Change to `"true"` for headless mode (no visible browser)

## Available Tools

Once Claude Code restarts, these Playwright tools will be available:

### Browser Control
- `playwright_navigate` - Navigate to a URL
- `playwright_click` - Click on elements
- `playwright_type` - Type text into inputs
- `playwright_select` - Select dropdown options
- `playwright_wait` - Wait for elements or conditions

### Page Interaction
- `playwright_screenshot` - Take screenshots
- `playwright_get_text` - Extract text from elements
- `playwright_get_attribute` - Get element attributes
- `playwright_evaluate` - Run JavaScript in the page context

### Testing
- `playwright_assert` - Make test assertions
- `playwright_test` - Run test suites
- `playwright_report` - Generate test reports

## Usage Examples

### 1. Basic Navigation and Screenshot
```javascript
// Navigate to a page
await playwright_navigate({ url: 'https://staging-wheelsandwins.netlify.app' });

// Take a screenshot
await playwright_screenshot({ path: 'homepage.png' });
```

### 2. Form Testing
```javascript
// Fill out login form
await playwright_type({ selector: '#email', text: 'user@example.com' });
await playwright_type({ selector: '#password', text: 'password123' });
await playwright_click({ selector: 'button[type="submit"]' });

// Wait for navigation
await playwright_wait({ selector: '.dashboard' });
```

### 3. Testing QA Page
```javascript
// Test adding a new issue
await playwright_navigate({ url: 'https://staging-wheelsandwins.netlify.app/qa' });
await playwright_type({ selector: 'input[placeholder="Issue title"]', text: 'Test Issue' });
await playwright_select({ selector: 'select', value: 'High' });
await playwright_click({ selector: 'button:has-text("Add Issue")' });

// Verify issue was added
await playwright_assert({ selector: '.issue-title', text: 'Test Issue' });
```

## Testing Your Application

### Profile Settings Test
```javascript
// Test profile switches
await playwright_navigate({ url: 'https://staging-wheelsandwins.netlify.app/profile' });
await playwright_click({ selector: '[data-tab="settings"]' });
await playwright_click({ selector: '#email_notifications' });
await playwright_wait({ selector: '.toast:has-text("Settings updated")' });
```

### Income Page Test
```javascript
// Test Add Income button
await playwright_navigate({ url: 'https://staging-wheelsandwins.netlify.app/wins' });
await playwright_click({ selector: 'button:has-text("Income")' });
await playwright_click({ selector: 'button:has-text("Add Income")' });
// Check if modal opens
await playwright_assert({ selector: '.income-modal', visible: true });
```

## Troubleshooting

### Browser Not Opening
- Ensure `PLAYWRIGHT_HEADLESS` is set to `"false"` in the config
- Check if Chromium is installed: `npx playwright install chromium`

### Permission Errors
- Make sure you have proper permissions: `chmod +x ~/.npm/_npx/*/node_modules/.bin/playwright`

### MCP Not Available
- Restart Claude Code after configuration changes
- Check the MCP configuration is valid JSON

### Browser Download Issues
- Run: `npx playwright install --with-deps chromium`
- For all browsers: `npx playwright install --with-deps`

## Installed Components

- ✅ **@playwright/mcp**: v0.0.34 - MCP server for Playwright
- ✅ **Chromium**: v139.0.7258.5 - Browser for testing
- ✅ **FFMPEG**: v1011 - For video recording support
- ✅ **Chromium Headless Shell**: For headless testing

## Next Steps

1. **Restart Claude Code** to load the new MCP server
2. **Test the integration** by asking Claude to navigate to a page
3. **Create automated tests** for your critical user flows
4. **Set up CI/CD** integration for continuous testing

## Useful Commands

```bash
# Install/Update Playwright
npm install -g @playwright/mcp

# Install browsers
npx playwright install chromium
npx playwright install firefox
npx playwright install webkit

# Install all browsers with dependencies
npx playwright install --with-deps

# Open Playwright Inspector
npx playwright test --debug

# Generate tests by recording
npx playwright codegen https://your-site.com
```

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [Playwright Test Examples](https://playwright.dev/docs/test-examples)

---

**Note**: After making any changes to the MCP configuration, you must restart Claude Code for the changes to take effect.