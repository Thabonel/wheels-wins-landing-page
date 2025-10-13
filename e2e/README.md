# PAM Automated Testing

Comprehensive end-to-end testing suite for PAM (Personal AI Manager) across all pages.

## Setup

### 1. Test User Credentials

Create a test user account OR set environment variables with existing credentials:

```bash
# Option 1: Use environment variables (recommended)
export TEST_USER_EMAIL="your-test-user@example.com"
export TEST_USER_PASSWORD="YourSecurePassword123!"

# Option 2: Use default test account
# The tests will attempt to use: pam-test@wheelsandwins.com / Test1234!
# You must create this account manually first
```

### 2. Create Test User (if needed)

If using the default test credentials, create the account:

1. Start the dev server: `npm run dev`
2. Navigate to: http://localhost:8080/signup
3. Create account with:
   - Email: `pam-test@wheelsandwins.com`
   - Password: `Test1234!`
   - Name: `PAM Test User`

## Running Tests

### Run All PAM Tests
```bash
npm run test:pam:auto
```

### Run with Browser Visible (headed mode)
```bash
npm run test:pam:auto:headed
```

### Run with Debug Mode
```bash
npm run test:pam:auto:debug
```

## Test Coverage

The automated test suite covers all major pages and PAM functionality:

### Home Page (3 tests)
- General questions about PAM capabilities
- Calendar appointment creation
- Feature information queries

### Wheels Page (4 tests)
- Trip planning queries
- Weather forecast requests
- Gas cost calculations
- RV park searches

### Wins Page (4 tests)
- Spending summaries
- Expense creation
- Budget analysis
- Savings tracking

### Social Page (3 tests)
- Social feature questions
- Post creation help
- Community event discovery

### Shop Page (2 tests)
- Product search assistance
- Product information queries

### You (Profile) Page (3 tests)
- Profile update help
- Settings navigation
- Preference configuration

### PAM Chat Page (3 tests)
- Contextual questions
- Multi-tool execution
- Complex financial queries

## Test Results

Test reports are generated in `e2e/reports/`:
- `pam-test-report-{timestamp}.json` - Timestamped reports
- `pam-test-report-latest.json` - Latest test run

### Report Format
```json
{
  "totalTests": 25,
  "passed": 20,
  "failed": 5,
  "duration": 45000,
  "timestamp": "2025-10-11T12:00:00.000Z",
  "results": [
    {
      "page": "Home",
      "question": "what can you help me with?",
      "response": "I can help you with...",
      "success": true,
      "duration": 1250,
      "timestamp": "2025-10-11T12:00:01.000Z",
      "retryCount": 0
    }
  ]
}
```

## Test Features

### Automatic Retry Logic
- 3 retry attempts per test
- Exponential backoff (1s, 2s, 4s)
- Helps handle temporary WebSocket issues

### Self-Healing Tests
- Multiple selector fallbacks
- Error detection and classification
- Screenshots on failure

### Comprehensive Reporting
- JSON reports for CI/CD integration
- Console summary output
- Success rate calculation
- Individual test timing

## Troubleshooting

### Tests Failing at Login
**Problem**: `Login timeout - please ensure test user exists`

**Solutions**:
1. Set `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` environment variables
2. Create the test user account manually
3. Check that dev server is running on http://localhost:8080

### PAM Not Responding
**Problem**: Tests timeout waiting for PAM response

**Solutions**:
1. Check backend is running and healthy
2. Verify WebSocket connection in browser console
3. Check staging backend: https://wheels-wins-backend-staging.onrender.com/api/health

### Database Errors
**Problem**: Tool execution fails with database errors

**Solutions**:
1. Ensure Supabase is accessible
2. Check RLS policies allow test user access
3. Verify calendar_events table has all required columns

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run PAM Tests
  env:
    TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
    TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
  run: npm run test:pam:auto
```

### Jenkins Example
```groovy
environment {
  TEST_USER_EMAIL = credentials('test-user-email')
  TEST_USER_PASSWORD = credentials('test-user-password')
}
steps {
  sh 'npm run test:pam:auto'
}
```

## Development Workflow

1. **Fix a PAM issue** (backend or frontend)
2. **Run automated tests**: `npm run test:pam:auto`
3. **Review report**: `cat e2e/reports/pam-test-report-latest.json`
4. **Fix any failures** identified by tests
5. **Repeat** until all tests pass

This creates a systematic "test → fix → retest" loop that replaces manual testing.

## Adding New Tests

To add tests for new PAM functionality:

1. Open `e2e/pam-automated-testing.spec.ts`
2. Add new test in appropriate `test.describe` block:

```typescript
test('should handle new feature', async ({ page }) => {
  await runPAMTest(
    page,
    'PageName',
    'your test question to PAM',
    '/page-route'
  );
});
```

3. Run tests to validate

## Architecture

```
e2e/
├── global-setup.ts              # Creates/validates test user
├── helpers/
│   └── pam-test-helpers.ts     # Reusable test utilities
├── pam-automated-testing.spec.ts # Main test suite
├── reports/                     # Generated test reports
└── README.md                    # This file
```

## Test Helper Functions

### `loginAsTestUser(page)`
Authenticates test user and waits for successful login

### `waitForPAMReady(page)`
Ensures PAM chat interface is loaded and WebSocket connected

### `askPAM(page, question, timeout)`
Sends question to PAM and extracts response from UI

### `isErrorResponse(response)`
Detects if PAM response indicates an error

### `retryTest(testFn, maxRetries, initialDelay)`
Executes test with automatic retry logic

### `saveTestReport(report)`
Generates JSON report files

### `printTestSummary(report)`
Outputs formatted test summary to console
