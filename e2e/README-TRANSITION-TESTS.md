# Life Transition Navigator - E2E Tests

## Overview

Comprehensive end-to-end tests for the Life Transition Navigator module using Playwright.

## Prerequisites

Before running these tests, ensure:

### 1. SQL Fixes Applied ✅
The following SQL script **MUST** be executed in Supabase first:
```
docs/sql-fixes/MASTER_FIX_ALL_RLS_ISSUES.sql
```

**How to apply:**
1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/kycoklimpzkyrecbjecn/sql
2. Copy entire contents of `MASTER_FIX_ALL_RLS_ISSUES.sql`
3. Paste and click "Run"
4. Verify all policies created successfully

### 2. Test User Credentials
Create a `.env.test` file in project root:
```bash
TEST_USER_EMAIL=your-test-user@example.com
TEST_USER_PASSWORD=YourSecurePassword123!
BASE_URL=http://localhost:8080
```

**Or** export environment variables:
```bash
export TEST_USER_EMAIL="test@example.com"
export TEST_USER_PASSWORD="testpass123"
export BASE_URL="http://localhost:8080"
```

### 3. Backend Running
Ensure backend is operational:
```bash
# Staging
curl https://wheels-wins-backend-staging.onrender.com/api/health

# Local (if testing locally)
cd backend && uvicorn app.main:app --reload --port 8000
```

### 4. Frontend Running
```bash
npm run dev
# Should be running on http://localhost:8080
```

## Running Tests

### Run All Transition Tests
```bash
npm run test:transition
```

### Run in Headed Mode (See Browser)
```bash
npm run test:transition:headed
```

### Run in UI Mode (Interactive)
```bash
npx playwright test e2e/transition-module.spec.ts --ui
```

### Run Specific Test Suite
```bash
# Module access tests only
npx playwright test e2e/transition-module.spec.ts -g "Module Access"

# Onboarding tests only
npx playwright test e2e/transition-module.spec.ts -g "Onboarding"

# Dashboard sections tests
npx playwright test e2e/transition-module.spec.ts -g "Dashboard Sections"

# Task management tests
npx playwright test e2e/transition-module.spec.ts -g "Task Management"

# Reality check tests
npx playwright test e2e/transition-module.spec.ts -g "Reality Check"

# Vehicle modifications tests
npx playwright test e2e/transition-module.spec.ts -g "Vehicle Modifications"

# Error handling tests
npx playwright test e2e/transition-module.spec.ts -g "Error Handling"
```

### Debug Mode
```bash
npx playwright test e2e/transition-module.spec.ts --debug
```

## Test Coverage

### 1. Module Access (2 tests)
- ✅ Navigation from You page to Transition module
- ✅ Dashboard loads without 403/406 errors

### 2. Onboarding (2 tests)
- ✅ Onboarding wizard displays for first-time users
- ✅ Departure date validation works

### 3. Dashboard Sections (5 tests)
- ✅ Departure countdown displays
- ✅ Task checklist section visible
- ✅ Financial buckets section visible
- ✅ Vehicle modifications section visible
- ✅ Equipment manager section visible

### 4. Task Management (2 tests)
- ✅ Create new task
- ✅ Mark task as complete

### 5. Reality Check (2 tests)
- ✅ Feasibility score displays
- ✅ Status indicators (red/yellow/green) show

### 6. Vehicle Modifications (2 tests)
- ✅ Kanban board displays
- ✅ Switch between Kanban and Timeline views

### 7. Error Handling (3 tests)
- ✅ No 403 Forbidden errors in console
- ✅ No 406 Not Acceptable errors in console
- ✅ Missing profile handled gracefully

**Total: 18 comprehensive tests**

## Expected Results

### ✅ All Tests Should Pass When:
1. SQL fixes have been applied to Supabase
2. Frontend query patterns fixed (commit 57a78c36)
3. Backend is healthy and operational
4. Test user has valid credentials
5. RLS policies correctly configured

### ❌ Tests Will Fail If:
1. SQL fixes NOT applied → 403/406 errors
2. Backend down → Connection errors
3. Invalid test credentials → Login fails
4. RLS policies misconfigured → Data access fails

## Troubleshooting

### Issue: Login Fails
```bash
# Verify test user exists in Supabase Auth
# Check .env.test has correct credentials
# Ensure backend auth endpoints work:
curl -X POST https://wheels-wins-backend-staging.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

### Issue: 403 Forbidden Errors
```bash
# RLS policies not applied correctly
# Re-run: docs/sql-fixes/MASTER_FIX_ALL_RLS_ISSUES.sql
# Verify policies exist:
SELECT * FROM pg_policies WHERE tablename = 'transition_profiles';
```

### Issue: 406 Not Acceptable Errors
```bash
# calendar_events RLS policies missing
# Ensure MASTER_FIX_ALL_RLS_ISSUES.sql was run completely
```

### Issue: "Element not found" Errors
```bash
# Frontend components may have different selectors
# Update test selectors in transition-module.spec.ts
# Use Playwright Inspector to find correct selectors:
npx playwright test --debug
```

## Test Environment Cleanup

After testing, you may want to clean up test data:

```sql
-- Delete test tasks (run in Supabase SQL Editor)
DELETE FROM transition_tasks
WHERE title LIKE 'Test Task - E2E%';

-- Delete test modifications
DELETE FROM transition_vehicle_mods
WHERE name LIKE 'Test Mod - E2E%';
```

## Continuous Integration

To run in CI/CD pipeline:

```yaml
# .github/workflows/test-transition.yml
name: Transition Module E2E Tests

on:
  push:
    branches: [staging, main]
  pull_request:
    branches: [staging, main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:transition
        env:
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
          BASE_URL: https://wheels-wins-staging.netlify.app
```

## Related Documentation

- **User Guide**: `docs/LIFE_TRANSITION_NAVIGATOR_USER_GUIDE.md`
- **Deployment Guide**: `docs/TRANSITION_MODULE_DEPLOYMENT.md`
- **SQL Fixes**: `docs/sql-fixes/MASTER_FIX_ALL_RLS_ISSUES.sql`
- **Frontend Fixes**: Git commit 57a78c36

## Support

If tests fail unexpectedly:

1. Check Supabase RLS policies are applied
2. Verify frontend query patterns fixed
3. Ensure backend is healthy
4. Review browser console for errors
5. Check `test-results/` folder for screenshots

---

**Created**: October 29, 2025
**Status**: Ready to run (after SQL fixes applied)
**Coverage**: 18 tests across 7 test suites
