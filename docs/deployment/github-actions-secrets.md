# GitHub Actions Secrets Configuration

**Phase 2: Essential Connectivity Fixes**
**Date:** January 8, 2026
**Purpose:** Configure GitHub Actions secrets for automated testing and deployment

---

## Overview

GitHub Actions workflows require certain secrets to function properly. This guide covers all required secrets for:
- Automated testing (authentication, API access)
- Staging deployment
- Production deployment

---

## Critical: Test Authentication Credentials

**Problem:** 70% of tests fail because the test runner can't log in to the application.

**Solution:** Add test user credentials to GitHub Actions secrets.

### Required Secrets for Testing

Navigate to your GitHub repository → Settings → Secrets and variables → Actions, then add:

1. **TEST_USER_EMAIL**
   - **Value:** Email of a dedicated test user account
   - **Example:** `tester@wheelsandwins.com`
   - **Purpose:** Used by automated tests to log in and test authenticated features
   - **Setup:** Create this user in Supabase Auth if it doesn't exist

2. **TEST_USER_PASSWORD**
   - **Value:** Password for the test user account
   - **Example:** `TestPassword123!` (use a strong password)
   - **Purpose:** Authenticate test user in CI/CD pipeline
   - **Security:** This should be a test account only, not a real user

### How to Create Test User in Supabase

1. Go to your Supabase project → Authentication → Users
2. Click "Add user" → "Create new user"
3. Enter email (e.g., `tester@wheelsandwins.com`)
4. Set a strong password
5. Confirm the user (click the three dots → Confirm user)
6. Add the email and password to GitHub Actions secrets

### Usage in Tests

These credentials are used in:
- **Backend tests:** `backend/tests/conftest.py` - Creates authenticated client
- **E2E tests:** `e2e/auth.setup.ts` - Playwright authentication setup
- **Integration tests:** Various test files that require authentication

Example usage in CI workflow:
```yaml
- name: Run tests
  env:
    TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
    TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
  run: npm test
```

---

## Deployment Secrets

### Staging Environment

Required for `backend-staging-deploy.yml` and `staging-deploy.yml`:

1. **STAGING_SUPABASE_URL**
   - Supabase project URL for staging
   - Example: `https://kycoklimpzkyrecbjecn.supabase.co`

2. **STAGING_SUPABASE_ANON_KEY**
   - Supabase anonymous key for staging
   - Found in: Supabase → Settings → API → anon public

3. **STAGING_API_BASE_URL**
   - Backend API URL for staging
   - Example: `https://wheels-wins-backend-staging.onrender.com`

4. **STAGING_MAPBOX_TOKEN**
   - Mapbox access token (can be same as production)
   - Format: `pk.ey...`

5. **STAGING_STRIPE_PUBLISHABLE_KEY**
   - Stripe publishable key for staging/test mode
   - Format: `pk_test_...`

### Production Environment

Required for `production-deploy.yml`:

1. **PRODUCTION_SUPABASE_URL**
   - Supabase project URL for production
   - Example: `https://kycoklimpzkyrecbjecn.supabase.co`

2. **PRODUCTION_SUPABASE_ANON_KEY**
   - Supabase anonymous key for production

3. **PRODUCTION_API_BASE_URL**
   - Backend API URL for production
   - Example: `https://pam-backend.onrender.com`

4. **PRODUCTION_MAPBOX_TOKEN**
   - Mapbox access token for production

5. **PRODUCTION_STRIPE_PUBLISHABLE_KEY**
   - Stripe publishable key for production (live mode)
   - Format: `pk_live_...`

6. **PRODUCTION_GOOGLE_ANALYTICS_ID**
   - Google Analytics measurement ID
   - Format: `G-XXXXXXXXXX`

7. **PRODUCTION_SENTRY_DSN** (Optional)
   - Sentry error monitoring DSN
   - Format: `https://[key]@o0.ingest.sentry.io/[project]`
   - **Note:** If not set, Sentry will be disabled (safe fallback)

---

## Backend-Specific Secrets

Required for `backend-staging-deploy.yml`:

1. **RENDER_API_KEY**
   - Render.com API key for deployment
   - Found in: Render Dashboard → Account Settings → API Keys

2. **STAGING_DATABASE_URL**
   - PostgreSQL connection string for staging
   - Format: `postgresql://user:pass@host:port/db`

3. **STAGING_SUPABASE_SERVICE_ROLE_KEY**
   - Supabase service role key (full access)
   - Found in: Supabase → Settings → API → service_role
   - **Security:** Never expose in client-side code

4. **STAGING_ANTHROPIC_API_KEY**
   - Claude API key for PAM system
   - Format: `sk-ant-api03-...`

5. **STAGING_GEMINI_API_KEY**
   - Google Gemini API key (fallback)
   - Format: `AI...`

---

## Netlify Deployment Secrets

These are managed in Netlify UI (Site settings → Environment variables):

**Staging:**
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_API_BASE_URL
- VITE_MAPBOX_ACCESS_TOKEN
- VITE_STRIPE_PUBLISHABLE_KEY

**Production:**
- Same as staging, but with production values
- Add VITE_GOOGLE_ANALYTICS_ID
- Add VITE_SENTRY_DSN (optional)

---

## Security Best Practices

1. **Never commit secrets to git**
   - Use `.env.example` for documentation
   - Keep actual `.env` in `.gitignore`

2. **Rotate secrets periodically**
   - Especially after team member changes
   - After any suspected exposure

3. **Use test accounts only for CI/CD**
   - Never use real user credentials in tests
   - Keep test data separate from production

4. **Limit secret scope**
   - Use different API keys for staging vs production
   - Use Stripe test mode keys for staging

5. **Monitor secret usage**
   - GitHub tracks secret access in Actions logs
   - Review usage regularly

---

## Troubleshooting

### Tests failing with "Authentication failed"

**Cause:** TEST_USER_EMAIL or TEST_USER_PASSWORD not set or incorrect

**Fix:**
1. Verify secrets exist in GitHub Actions secrets
2. Check that test user exists in Supabase Auth
3. Verify password is correct
4. Ensure user is confirmed (not pending email verification)

### Deployment failing with "Environment variable not found"

**Cause:** Missing required secret for environment

**Fix:**
1. Check which secret is missing from error message
2. Add secret in GitHub → Settings → Secrets and variables → Actions
3. Restart failed workflow

### Netlify build using wrong environment variables

**Cause:** Netlify environment variables not matching GitHub secrets

**Fix:**
1. Go to Netlify → Site settings → Environment variables
2. Ensure variables match GitHub secrets
3. Deploy site to apply new variables

---

## Verification Checklist

Before running CI/CD workflows, verify:

- [ ] TEST_USER_EMAIL and TEST_USER_PASSWORD set in GitHub Actions
- [ ] Test user exists and is confirmed in Supabase Auth
- [ ] All staging secrets added to GitHub Actions
- [ ] All production secrets added to GitHub Actions
- [ ] Netlify environment variables configured for both environments
- [ ] RENDER_API_KEY set for backend deployments
- [ ] Secrets rotated if repository was recently public

---

## Phase 2 Completion

**Completed:**
- ✅ Backend geolocation proxy endpoint added
- ✅ Frontend updated to use backend proxy (CORS fix)
- ✅ Sentry DSN configuration fixed (commented out placeholder)
- ✅ Test credentials documentation created

**Next Steps:**
1. Add TEST_USER_EMAIL and TEST_USER_PASSWORD to GitHub Actions secrets
2. Create test user in Supabase Auth if needed
3. Run tests to verify authentication works
4. Deploy to staging to test Phase 2 fixes

---

**Last Updated:** January 8, 2026
**Related Files:**
- `.github/workflows/ci.yml`
- `.github/workflows/staging-deploy.yml`
- `.github/workflows/production-deploy.yml`
- `.github/workflows/backend-staging-deploy.yml`
