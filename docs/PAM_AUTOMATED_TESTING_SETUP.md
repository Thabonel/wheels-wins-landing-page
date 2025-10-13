# PAM Automated Testing - Setup Complete

**Date**: October 11, 2025
**Status**: ✅ Infrastructure Ready - Awaiting Test Credentials

## What Was Built

### 1. Test Infrastructure Files Created

#### Core Test Files
- **`e2e/helpers/pam-test-helpers.ts`** (265 lines)
  - Login automation
  - PAM interaction utilities
  - Retry logic with exponential backoff
  - Report generation functions
  - Error detection

- **`e2e/pam-automated-testing.spec.ts`** (302 lines)
  - 25+ tests across 7 pages
  - Home, Wheels, Wins, Social, Shop, You (Profile), PAM pages
  - Multiple questions per page
  - Automatic retry on failures

- **`e2e/global-setup.ts`** (69 lines)
  - Validates test user exists
  - Attempts to create test user if missing
  - Runs before all tests

#### Configuration & Documentation
- **`playwright.config.ts`** (updated)
  - Added global setup integration
  - Configured for multiple browsers and devices

- **`package.json`** (updated)
  - `npm run test:pam:auto` - Run PAM tests
  - `npm run test:pam:auto:headed` - Run with browser visible
  - `npm run test:pam:auto:debug` - Run with debugger

- **`e2e/README.md`** (comprehensive testing guide)
  - Setup instructions
  - Usage examples
  - Troubleshooting guide
  - CI/CD integration examples

- **`.env.test.example`** (template for test credentials)

- **`CLAUDE.md`** (updated with PAM testing section)

### 2. Test Coverage

| Page | Tests | Example Questions |
|------|-------|-------------------|
| Home | 3 | "what can you help me with?", "add a dinner appointment" |
| Wheels | 4 | "plan a trip from Phoenix to Seattle", "find RV parks near Yellowstone" |
| Wins | 4 | "show my spending this month", "add a $50 gas expense" |
| Social | 3 | "how can I connect with other RV travelers?" |
| Shop | 2 | "I need a new water filter for my RV" |
| You | 3 | "how do I update my profile information?" |
| PAM | 3 | "what questions can I ask you?", complex multi-tool queries |

**Total: 25+ tests with automatic retry logic**

### 3. Test Features

✅ **Automatic Retry** - 3 attempts per test with exponential backoff
✅ **Self-Healing** - Multiple selector fallbacks for robustness
✅ **Error Detection** - Automatically identifies error responses
✅ **JSON Reports** - Timestamped reports in `e2e/reports/`
✅ **Console Summary** - Clear pass/fail statistics
✅ **Multi-Browser** - Tests on Chrome, Firefox, Safari, Mobile
✅ **Screenshots** - Captures failures for debugging

## How to Run Tests

### Step 1: Set Up Test Credentials

**Option A: Use Environment Variables** (Quick)
```bash
export TEST_USER_EMAIL="your-email@example.com"
export TEST_USER_PASSWORD="YourPassword123!"
```

**Option B: Create .env.test File** (Recommended)
```bash
# Copy the example
cp .env.test.example .env.test

# Edit with your credentials
nano .env.test
# or
code .env.test
```

**Example .env.test:**
```bash
TEST_USER_EMAIL=your-test-user@example.com
TEST_USER_PASSWORD=YourSecurePassword123!
```

### Step 2: Run the Tests

```bash
# Run all PAM tests
npm run test:pam:auto

# Run with browser visible (helpful for debugging)
npm run test:pam:auto:headed

# Run with step-by-step debugger
npm run test:pam:auto:debug
```

### Step 3: Review Results

**Console Output:**
```
============================================================
PAM AUTOMATED TEST SUMMARY
============================================================
Total Tests: 25
Passed: 20 ✅
Failed: 5 ❌
Success Rate: 80.0%
Duration: 45.23s
============================================================
```

**JSON Report:**
```bash
cat e2e/reports/pam-test-report-latest.json
```

## What Happens During Testing

1. **Global Setup** (runs once)
   - Checks if test user exists
   - Attempts login with provided credentials
   - Creates account if needed (tries signup flow)

2. **Each Test** (runs per browser/device)
   - Logs in as test user
   - Navigates to specific page
   - Waits for PAM to be ready
   - Asks PAM a question
   - Validates response (checks for errors)
   - Retries up to 3 times if fails
   - Records result

3. **Report Generation**
   - Creates timestamped JSON report
   - Updates `pam-test-report-latest.json`
   - Prints summary to console

## Troubleshooting

### Issue: "Login timeout - please ensure test user exists"

**Solution:**
1. Verify test credentials are correct
2. Check that user account exists in database
3. Try logging in manually at http://localhost:8080/login
4. Create account at http://localhost:8080/signup if needed

### Issue: Tests fail at PAM interaction

**Possible Causes:**
1. PAM WebSocket not connecting
2. Backend not running or unhealthy
3. UI selectors changed

**Debug Steps:**
```bash
# Check backend health
curl http://localhost:8000/api/health

# Or staging:
curl https://wheels-wins-backend-staging.onrender.com/api/health

# Run with browser visible to see what's happening
npm run test:pam:auto:headed
```

### Issue: All tests pass but PAM responses seem wrong

**Check:**
1. Review test reports for actual responses
2. Verify tool execution in backend logs
3. Check database for created records (calendar events, expenses, etc.)

## Next Steps

### 1. Provide Test Credentials

You need to either:
- Set environment variables with your credentials
- Create `.env.test` file with valid login credentials
- Or manually create the default test user (pam-test@wheelsandwins.com)

### 2. Run Initial Test

```bash
npm run test:pam:auto:headed
```

This will run with the browser visible so you can see what's happening.

### 3. Review and Fix

The test will identify PAM issues:
- Which pages PAM works on
- Which questions fail
- What error messages appear

Then fix the issues and rerun until all tests pass.

### 4. Iterate

This creates the "test → fix → retest" loop you requested:
1. Run tests
2. Fix failures identified
3. Commit fixes
4. Rerun tests
5. Repeat until 100% pass rate

## CI/CD Integration (Future)

Once tests are stable, integrate with GitHub Actions:

```yaml
# .github/workflows/pam-tests.yml
- name: Run PAM Tests
  env:
    TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
    TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
  run: npm run test:pam:auto
```

Store credentials in GitHub Secrets.

## Architecture Diagram

```
┌─────────────────────────────────────┐
│   Global Setup (runs once)         │
│   - Validate/create test user       │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│   Test Suite (25+ tests)            │
│   ┌───────────────────────────┐    │
│   │ Home Tests (3)            │    │
│   │ Wheels Tests (4)          │    │
│   │ Wins Tests (4)            │    │
│   │ Social Tests (3)          │    │
│   │ Shop Tests (2)            │    │
│   │ You Tests (3)             │    │
│   │ PAM Tests (3)             │    │
│   └───────────────────────────┘    │
│                                     │
│   Each test:                        │
│   1. Login                          │
│   2. Navigate to page               │
│   3. Ask PAM question               │
│   4. Validate response              │
│   5. Retry if fails (3x)            │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│   Report Generation                 │
│   - JSON report with details        │
│   - Console summary                 │
│   - Screenshots on failure          │
└─────────────────────────────────────┘
```

## Summary

✅ **Infrastructure Complete** - All test files created and configured
✅ **25+ Tests Ready** - Covers all major PAM functionality
✅ **Auto-Retry Built In** - Handles transient failures
✅ **Reports Generated** - JSON + console output
✅ **Documentation Written** - Setup guides and troubleshooting

⏳ **Next: Provide test credentials and run first test**

---

**Commands Quick Reference:**
```bash
# Setup
cp .env.test.example .env.test
# (edit .env.test with credentials)

# Run tests
npm run test:pam:auto          # Headless
npm run test:pam:auto:headed   # With browser
npm run test:pam:auto:debug    # With debugger

# Review results
cat e2e/reports/pam-test-report-latest.json
```

**Files to Check:**
- `e2e/README.md` - Complete testing documentation
- `CLAUDE.md` - Updated with PAM testing section
- `.env.test.example` - Credentials template
