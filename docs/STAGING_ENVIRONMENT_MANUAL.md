# 📋 Wheels & Wins Staging Environment User Manual

## Table of Contents
1. [Overview](#overview)
2. [Environment Isolation](#environment-isolation)
3. [Backend Service Architecture](#backend-service-architecture)
4. [Staging to Production Workflow](#staging-to-production-workflow)
5. [Automated Testing & CI/CD Pipeline](#automated-testing--cicd-pipeline)
6. [Visual Indicators](#visual-indicators)
7. [Safe Testing Procedures](#safe-testing-procedures)
8. [Easy Rollback & Deployment Management](#easy-rollback--deployment-management)
9. [Troubleshooting](#troubleshooting)

---

## Overview

Your Wheels & Wins project now has a complete staging environment that allows you to test changes safely before they reach your production users. This manual explains how to use each feature effectively.

### 🎯 What You Get
- **Two Separate Environments**: Staging for testing, Production for live users
- **Automatic Deployments**: Code changes automatically deploy to appropriate environments
- **Visual Safety**: Clear indicators showing which environment you're using
- **Safe Testing**: Test with fake data and sandbox APIs
- **Easy Recovery**: Quick rollback if something goes wrong

---

## Environment Isolation

### 🏗️ How It Works

Your project now has **two completely separate environments**:

#### **Staging Environment** 🧪
- **Purpose**: Testing new features safely
- **URL**: `https://staging-[branch]--[site-id].netlify.app`
- **Database**: Separate Supabase project with test data
- **APIs**: Sandbox/test versions (Stripe test mode, etc.)
- **Users**: Only you and your team

#### **Production Environment** 🚀
- **Purpose**: Live site for real users
- **URL**: Your main domain (e.g., `wheelswins.com`)
- **Database**: Production Supabase with real user data
- **APIs**: Live APIs with real transactions
- **Users**: Your actual customers

### 📁 Configuration Files

Each environment has its own settings:

```
📁 Project Root
├── .env.staging          # Staging environment variables
├── .env.production       # Production environment variables
├── netlify.toml          # Production Netlify config
├── netlify.staging.toml  # Staging Netlify config
└── src/config/environment.ts  # Environment detection
```

### 🔧 Setting Up Environment Variables

#### For Staging (in Netlify):
```bash
# Environment
VITE_ENVIRONMENT=staging
VITE_SHOW_STAGING_BANNER=true

# Database (create separate Supabase project)
VITE_SUPABASE_URL=https://your-staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-staging-key

# APIs (use test/sandbox keys)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key
VITE_MAPBOX_ACCESS_TOKEN=your_test_token

# Features (enable experimental features)
VITE_ENABLE_DEBUG_TOOLS=true
VITE_ENABLE_TEST_DATA=true
VITE_SKIP_EMAIL_VERIFICATION=true
```

#### For Production (in Netlify):
```bash
# Environment
VITE_ENVIRONMENT=production
VITE_SHOW_STAGING_BANNER=false

# Database (your main Supabase project)
VITE_SUPABASE_URL=https://your-production-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-key

# APIs (use live keys)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key
VITE_MAPBOX_ACCESS_TOKEN=your_production_token

# Features (only stable features)
VITE_ENABLE_DEBUG_TOOLS=false
VITE_ENABLE_TEST_DATA=false
VITE_SKIP_EMAIL_VERIFICATION=false
```

---

## Backend Service Architecture

### 🖥️ Dual Backend System

Your project uses **two separate backend services** for complete environment isolation:

#### **Staging Backend** 🧪
- **Service**: `wheels-wins-backend-staging.onrender.com`
- **Purpose**: Testing backend changes safely
- **Git Branch**: Deploys from `staging` branch
- **Database**: Staging Supabase project
- **Status**: Should always be working and stable

#### **Production Backend** 🚀
- **Service**: `pam-backend.onrender.com` 
- **Purpose**: Live backend for production users
- **Git Branch**: Deploys from `main` branch
- **Database**: Production Supabase project
- **Status**: Must be completely stable

### 🔧 Critical Environment Variables

Both backends need these **5 critical environment variables** to function properly:

```bash
# Required for proper initialization
APP_URL=https://[backend-service].onrender.com
DEBUG=false  # true for staging, false for production
NODE_ENV=production  # staging for staging, production for production
ENVIRONMENT=production  # staging for staging, production for production
VITE_USE_AI_SDK_PAM=true
```

**⚠️ Important**: Missing any of these variables will cause backend initialization errors.

### 🔄 Backend Health Monitoring

#### Healthy Backend Logs:
```
✅ Application startup complete
✅ All performance optimizations active
✅ Enhanced security system active
✅ PAM service operational
```

#### Broken Backend Logs:
```
❌ PAMServiceError: Failed to initialize AI service: no running event loop
❌ RuntimeWarning: coroutine 'AIService.initialize' was never awaited
⚠️ PAM running in emergency mode with basic functionality
```

---

## Staging to Production Workflow

### 🎯 When to Sync Staging to Production

Sync your staging branch to main when:
- ✅ **Backend fixes are needed** (initialization errors, crashes)
- ✅ **New features are fully tested** on staging
- ✅ **Critical bugs need immediate production deployment**
- ✅ **Environment variables are mismatched** between backends

### 📋 Pre-Sync Checklist

Before syncing staging to production:

#### **1. Verify Staging is Working**
- [ ] Staging backend starts without errors
- [ ] PAM chat functionality works
- [ ] No "emergency mode" warnings in logs
- [ ] All new features function properly

#### **2. Create Safety Backup**
```bash
# Always create backup branch before major changes
git checkout main
git pull origin main
git checkout -b backup/main-before-sync-$(date +%Y%m%d-%H%M%S)
git push origin backup/main-before-sync-$(date +%Y%m%d-%H%M%S)
```

#### **3. Test Environment Variables**
- [ ] Verify staging backend has all 5 critical variables
- [ ] Confirm production backend environment variable setup
- [ ] Check CORS origins include both staging and production domains

### 🚀 Step-by-Step Sync Process

#### **Step 1: Create Backup**
```bash
git checkout main
git pull origin main
git checkout -b backup/main-before-sync-$(date +%Y%m%d-%H%M%S)
git push origin backup/main-before-sync-$(date +%Y%m%d-%H%M%S)
```

#### **Step 2: Merge Staging to Main**
```bash
git checkout main
git merge staging --no-ff -m "feat: sync staging to main - [brief description]

- [List key changes being deployed]
- [Mention any critical fixes]
- [Note environment variable updates needed]

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

#### **Step 3: Push and Monitor**
```bash
git push origin main
```

This triggers:
- **Frontend**: Netlify auto-deploys `wheelsandwins.com` from main
- **Backend**: Render auto-deploys `pam-backend.onrender.com` from main

#### **Step 4: Add Missing Environment Variables**
If production backend is missing variables, add them in Render dashboard:
```bash
APP_URL=https://pam-backend.onrender.com
DEBUG=false
NODE_ENV=production
ENVIRONMENT=production
VITE_USE_AI_SDK_PAM=true
```

#### **Step 5: Validate Deployment**
- [ ] Production backend starts without event loop errors
- [ ] Health endpoint returns healthy status
- [ ] PAM chat functionality works on production site
- [ ] No emergency mode warnings

### 🛡️ Rollback Strategy

If something goes wrong:

#### **Quick Git Rollback**
```bash
# Revert to backup branch
git checkout main
git reset --hard backup/main-before-sync-[timestamp]
git push --force-with-lease origin main
```

#### **Service-Level Rollback**
- **Netlify**: Use deployment history to restore previous version
- **Render**: Use deployment history to restore previous backend version
- **Environment Variables**: Restore from backup documentation

### ⚠️ Common Issues During Sync

#### **Backend Won't Start After Sync**
**Symptoms**: Event loop errors, emergency mode
**Solution**: Add missing environment variables to production backend

#### **CORS Errors on Production Site**
**Symptoms**: "Access-Control-Allow-Origin" errors
**Solution**: Verify `CORS_ORIGINS` includes production domain

#### **Authentication Failures**
**Symptoms**: JWT signature verification errors
**Solution**: Check Supabase URL and keys match between frontend and backend

---

## Automated Testing & CI/CD Pipeline

### 🤖 How Automatic Deployments Work

Your project has **two deployment workflows** that run automatically:

#### **Staging Deployment** (`.github/workflows/staging-deploy.yml`)
**Triggers when:**
- You push code to `staging` or `develop` branch
- Someone opens a Pull Request to `main`

**What it does:**
1. ✅ Runs all tests (`npm run test:ci`)
2. ✅ Checks code quality (`npm run lint`)
3. ✅ Validates TypeScript (`npm run type-check`)
4. 🏗️ Builds for staging (`npm run build:staging`)
5. 🚀 Deploys to staging Netlify site
6. 💬 Comments on PR with staging URL

#### **Production Deployment** (`.github/workflows/production-deploy.yml`)
**Triggers when:**
- You push code to `main` branch
- You manually trigger deployment

**What it does:**
1. ✅ Runs **full quality checks** (`npm run quality:check:full`)
2. 🔒 Security audit (`npm run security:audit`)
3. 🏗️ Builds for production (`npm run build:production`)
4. 🚀 Deploys to production Netlify site
5. 📊 Runs end-to-end tests

### 📊 Quality Checks Included

Every deployment runs these checks:

```bash
# Code Quality
npm run lint          # ESLint checks
npm run type-check    # TypeScript validation
npm run format:check  # Code formatting

# Testing
npm run test          # Unit tests
npm run test:coverage # Test coverage report
npm run e2e          # End-to-end tests

# Security
npm run security:audit # Dependency vulnerabilities
```

### 🚨 What Happens If Tests Fail

- **Staging**: Deployment stops, you get notified
- **Production**: Deployment stops, requires manual review
- **GitHub**: Shows red ❌ status, prevents merging

### 📱 Getting Notifications

You'll be notified via:
- 📧 **GitHub email notifications**
- 💬 **PR comments** with staging URLs
- 🔴 **GitHub status checks** (red/green indicators)

---

## Visual Indicators

### 🎨 Staging Banner

When you're on the staging site, you'll see a **bright yellow banner** at the top:

```
⚠️ STAGING ENVIRONMENT - This is a test site. Data may be reset without notice.
```

- **Color**: Bright yellow (impossible to miss)
- **Dismissible**: Click the X to hide temporarily
- **Only shows in staging**: Never appears on production

### 🛠️ Debug Information

In staging mode, check your browser console for environment info:

```javascript
🌍 Environment Info: {
  environment: "staging",
  nodeEnv: "development",
  apiBaseUrl: "https://staging-api.com",
  supabaseUrl: "✅ Set",
  features: {
    betaFeatures: true,
    debugTools: true,
    performanceMonitoring: true
  }
}
```

### 🎛️ Debug Tools Available in Staging

- **Extended Logging**: More detailed console output
- **Test Data**: Pre-populated sample data
- **API Debug Info**: Request/response logging
- **Performance Metrics**: Load time measurements
- **Feature Flags**: Easy toggle for experimental features

### 🌐 Environment Detection in Code

Your app automatically detects the environment:

```typescript
import { isStaging, isProduction, ENV } from '@/config/environment';

// Check environment
if (isStaging) {
  console.log('Running in staging mode');
}

// Use environment-specific features
if (ENV.ENABLE_DEBUG_TOOLS) {
  // Show debug panel
}
```

---

## Safe Testing Procedures

### 🧪 Testing New Features Safely

#### **Step 1: Create Feature Branch**
```bash
git checkout -b feature/your-new-feature
# Make your changes
git add .
git commit -m "Add new feature"
git push origin feature/your-new-feature
```

#### **Step 2: Test Locally**
```bash
# Run with staging environment
cp .env.staging .env.local
npm run dev

# Run tests
npm run test
npm run e2e
```

#### **Step 3: Deploy to Staging**
```bash
# Push to staging branch
git checkout staging
git merge feature/your-new-feature
git push origin staging
```

#### **Step 4: Test on Staging Site**
- Visit your staging URL
- Look for yellow staging banner
- Test all functionality thoroughly
- Use test payment cards: `4242 4242 4242 4242`
- Verify with different devices/browsers

#### **Step 5: Deploy to Production**
```bash
# Create PR to main
git checkout main
git pull origin main
git merge staging
git push origin main
```

### 🧾 Testing Checklist

Before deploying to production, test these on staging:

#### **Authentication & User Management**
- [ ] Sign up with test email
- [ ] Login/logout functionality
- [ ] Password reset flow
- [ ] Profile updates
- [ ] Session management

#### **Core Features**
- [ ] PAM AI chat functionality
- [ ] Trip planning and maps
- [ ] Financial tracking (Wins)
- [ ] Vehicle management (Wheels)
- [ ] Calendar integration (You)
- [ ] Social features

#### **Payment Testing**
- [ ] Subscription signup with test card: `4242 4242 4242 4242`
- [ ] Payment failure scenarios: `4000 0000 0000 0002`
- [ ] Subscription cancellation
- [ ] Billing portal access

#### **Performance & Mobile**
- [ ] Page load times under 3 seconds
- [ ] Mobile responsive design
- [ ] Offline functionality
- [ ] PWA features (if enabled)

#### **Integration Testing**
- [ ] External API connections (Mapbox, Stripe, etc.)
- [ ] Database operations
- [ ] File uploads
- [ ] Email notifications

### 🎭 Test Data & Sandbox APIs

Staging uses safe test versions:

#### **Stripe Payments** (Test Mode)
```bash
# Test cards that work
4242 4242 4242 4242  # Visa (success)
4000 0000 0000 0002  # Card declined
4000 0000 0000 9995  # Insufficient funds
```

#### **Email Testing**
- Uses `+staging` email addresses
- No real emails sent
- Email verification can be skipped

#### **Database**
- Separate Supabase project
- Test data only
- Can be reset anytime
- No real user information

---

## Easy Rollback & Deployment Management

### 🔄 Rollback Procedures

#### **Quick Rollback (GitHub)**
1. Go to your repository on GitHub
2. Click **Actions** tab
3. Find the last successful production deployment
4. Click **Re-run all jobs**

#### **Manual Rollback (Netlify)**
1. Log into Netlify
2. Go to your production site
3. Click **Deploys** tab
4. Find previous successful deploy
5. Click **Publish deploy**

#### **Code Rollback (Git)**
```bash
# Find the commit to rollback to
git log --oneline

# Create rollback commit
git revert [commit-hash]
git push origin main
```

### 🚀 Deployment Strategies

#### **Safe Deployment Process**
1. **Develop** → Make changes in feature branch
2. **Stage** → Test thoroughly on staging
3. **Review** → Code review via Pull Request
4. **Deploy** → Automatic deployment to production
5. **Monitor** → Watch for errors/issues

#### **Emergency Deployment**
For critical hotfixes:

```bash
# Create hotfix branch
git checkout -b hotfix/critical-issue
# Fix the issue
git add .
git commit -m "Fix critical issue"

# Deploy to staging first
git checkout staging
git merge hotfix/critical-issue
git push origin staging
# Test on staging

# Deploy to production
git checkout main
git merge hotfix/critical-issue
git push origin main
```

#### **Feature Flag Deployment**
Use environment variables to control features:

```typescript
// In your code
if (ENV.ENABLE_NEW_FEATURE) {
  // Show new feature
} else {
  // Show old feature
}
```

Then toggle via Netlify environment variables without redeploying.

### 📊 Monitoring Deployments

#### **GitHub Actions Status**
- ✅ Green checkmark = successful deployment
- ❌ Red X = failed deployment
- 🟡 Yellow circle = in progress

#### **Netlify Deploy Status**
- **Published**: Live and accessible
- **Failed**: Build or deploy error
- **Building**: Currently deploying

#### **Monitoring Tools Available**
- **Sentry**: Error tracking and performance monitoring
- **Google Analytics**: User behavior and performance
- **Lighthouse**: Performance scores
- **Uptime monitoring**: Site availability

### 🔔 Setting Up Alerts

#### **GitHub Notifications**
1. Go to repository **Settings**
2. Click **Notifications**
3. Enable **Actions** notifications
4. Choose email/web notifications

#### **Netlify Notifications**
1. Go to site **Settings**
2. Click **Build & deploy**
3. Add **Deploy notifications**
4. Set up Slack/email alerts

---

## Troubleshooting

### 🚨 Common Issues & Solutions

#### **Staging Site Shows Production Data**
**Problem**: Environment variables not set correctly
**Solution**:
1. Check Netlify environment variables
2. Verify `VITE_ENVIRONMENT=staging`
3. Redeploy after changes

#### **Tests Failing in CI/CD**
**Problem**: Tests pass locally but fail in GitHub Actions
**Solution**:
```bash
# Run tests exactly like CI
npm ci  # Clean install
npm run test:ci
npm run quality:check:full
```

#### **Deployment Stuck**
**Problem**: Deployment doesn't complete
**Solution**:
1. Check GitHub Actions logs
2. Look for error messages
3. Cancel and retry deployment
4. Check Netlify build logs

#### **Environment Variables Not Working**
**Problem**: App doesn't use correct API keys
**Solution**:
1. Verify variable names start with `VITE_`
2. Check for typos in variable names
3. Restart development server after changes
4. Redeploy after environment variable changes

#### **Staging Banner Not Showing**
**Problem**: Can't tell if you're on staging
**Solution**:
1. Check `VITE_SHOW_STAGING_BANNER=true`
2. Verify `VITE_ENVIRONMENT=staging`
3. Clear browser cache
4. Check browser console for errors

### 🛠️ Debug Commands

```bash
# Test staging build locally
npm run build:staging
npm run preview

# Validate environment configuration
npm run dev
# Check browser console for environment info

# Test staging deployment
STAGING_URL=https://your-staging-url.netlify.app npm run test:staging

# Check all quality checks
npm run quality:check:full
```

### 📞 Getting Help

1. **Check this manual** for common solutions
2. **Review GitHub Actions logs** for deployment errors
3. **Check Netlify deploy logs** for build issues
4. **Verify environment variables** in Netlify settings
5. **Test locally first** to isolate issues

### 🔍 Useful Links

- **GitHub Actions**: `https://github.com/[username]/[repo]/actions`
- **Netlify Dashboard**: `https://app.netlify.com/sites/[site-name]`
- **Staging Site**: `https://staging--[site-id].netlify.app`
- **Production Site**: Your main domain

---

## 🎉 Summary

You now have a complete staging environment that provides:

✅ **Safe Testing**: Test everything before it goes live  
✅ **Automated Quality**: All code is tested before deployment  
✅ **Visual Safety**: Clear indicators prevent confusion  
✅ **Easy Recovery**: Quick rollback if anything goes wrong  
✅ **Team Collaboration**: Everyone can test safely  

**Remember**: Always test on staging first! 🚀

---

*This manual covers the staging environment setup for Wheels & Wins. Keep it handy for reference when developing and deploying new features.*