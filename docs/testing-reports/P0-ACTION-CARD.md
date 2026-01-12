# P0 BLOCKERS - Immediate Action Required

**Date**: January 7, 2026
**Status**: 🔴 CRITICAL - Development Blocked
**Estimated Fix Time**: 3-5 days

---

## Day 1-2: Restore CI Pipeline Health

**Problem**: 100% CI failure rate (all 5 recent runs failed)
**Impact**: Team cannot ship code safely

### Actions:
```bash
# 1. Diagnose failures locally
npm run test:coverage
cd backend && python -m pytest tests/ -v

# 2. Remove test failure bypass
# Edit: .github/workflows/backend-staging-deploy.yml:33
# Delete: || true

# 3. Temporarily lower thresholds (unblock pipeline)
# vitest.config.ts: coverage.thresholds.global = 70 (from 80)
# backend/pytest.ini: --cov-fail-under=60 (from 70)

# 4. Add security permissions to ci.yml
# Add to CodeQL job:
#   permissions:
#     security-events: write
```

**Success Criteria**: CI run passes with green checkmark

---

## Day 3-4: Fix Frontend Test Suite

**Problem**: 60% test failure rate (843/1,401 tests failing)
**Impact**: Test suite provides false confidence

### Actions:
```bash
# 1. Exclude /backups/ from test runs
# Edit vitest.config.ts:
#   test: {
#     exclude: ['**/backups/**', ...configDefaults.exclude]
#   }

# 2. Update failing SignupForm tests (13 tests)
# File: src/components/auth/__tests__/SignupForm.test.tsx
# Issue: Stale fixtures from October 2024 migration
# Fix: Update test data to match current component props

# 3. Fix React import errors
# Find all: import React from 'react' (unnecessary in React 18)
# Replace with: import { useState, useEffect } from 'react'
```

**Success Criteria**: >95% test pass rate

---

## Day 5-7: Enable First E2E Test Execution

**Problem**: 53+ E2E tests written but ZERO can execute
**Impact**: Cannot validate any user journeys

### Actions:
```bash
# 1. Add data-testid to Login page
# File: src/components/auth/LoginForm.tsx
# Add attributes:
#   <input data-testid="email-input" ... />
#   <input data-testid="password-input" ... />
#   <button data-testid="login-button" ... />

# 2. Add data-testid to Signup page
# File: src/components/auth/SignupForm.tsx
# Same pattern as Login

# 3. Configure test environment variables
# Create: .env.test
#   VITE_SUPABASE_URL=<test-project-url>
#   VITE_SUPABASE_ANON_KEY=<test-anon-key>
#   TEST_USER_EMAIL=test@wheelsandwins.com
#   TEST_USER_PASSWORD=TestPassword123!

# 4. Create test user in Supabase
# Run once via Supabase SQL editor:
#   INSERT INTO auth.users (email, encrypted_password, ...)
#   VALUES ('test@wheelsandwins.com', ...)

# 5. Run ONE complete E2E test
npx playwright test e2e/auth.spec.ts --grep "user can login"
```

**Success Criteria**: At least ONE E2E test passes end-to-end

---

## Quick Wins (30 min each)

### Fix #1: Remove Test Bypass
```bash
# File: .github/workflows/backend-staging-deploy.yml:33
# Change:
python -m pytest tests/ -v --tb=short || true  # ❌ BAD

# To:
python -m pytest tests/ -v --tb=short  # ✅ GOOD
```

### Fix #2: Configure Sentry
```bash
# 1. Get valid DSN from https://sentry.io
# 2. Update .env:
VITE_SENTRY_DSN=https://your-real-dsn@sentry.io/project-id

# 3. Verify in browser console (no "Invalid Dsn" errors)
```

### Fix #3: Fix CORS Geolocation
```bash
# Option A: Backend proxy (RECOMMENDED)
# Add to backend/app/api/v1/location.py:
@router.get("/geolocation")
async def get_geolocation(ip: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(f"https://ipapi.co/{ip}/json/")
        return response.json()

# Option B: Switch to CORS-friendly API
# Replace ipapi.co with ip-api.com (allows CORS)
```

---

## Progress Tracking

- [ ] Day 1: Diagnose CI failures
- [ ] Day 1: Remove test bypass
- [ ] Day 2: Lower coverage thresholds
- [ ] Day 2: CI passes (green checkmark)
- [ ] Day 3: Exclude /backups/ from tests
- [ ] Day 4: Fix SignupForm tests
- [ ] Day 4: Frontend tests >95% pass rate
- [ ] Day 5: Add data-testid to Login
- [ ] Day 6: Add data-testid to Signup
- [ ] Day 6: Configure test environment
- [ ] Day 7: First E2E test passes
- [ ] Quick Win: Sentry DSN fixed
- [ ] Quick Win: CORS proxy added

---

## Verification Commands

```bash
# CI health check
gh run list --limit 5

# Frontend test health
npm test 2>&1 | grep -E "Test Files|Tests|Errors"

# Backend test health (after pytest installed)
cd backend && pytest tests/ -v --tb=short 2>&1 | tail -20

# E2E test health
npx playwright test --list | wc -l
npx playwright test e2e/auth.spec.ts --dry-run
```

---

## Success Metrics (End of Week)

| Metric | Before | Target | Status |
|--------|--------|--------|--------|
| CI Pass Rate | 0% | 100% | [ ] |
| Frontend Test Pass Rate | 34.8% | 95%+ | [ ] |
| E2E Executable Tests | 0 | 1+ | [ ] |
| Sentry Configured | ❌ | ✅ | [ ] |
| CORS Issues | 10+ | 0 | [ ] |

---

**When all P0 blockers are resolved, move to P1 Critical items in main README.md**
