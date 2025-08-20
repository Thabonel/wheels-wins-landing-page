# 🚀 Staging to Production Deployment Workflow

## Overview

This document provides a comprehensive guide for safely deploying changes from the staging environment to production. This workflow was developed after resolving critical PAM backend connectivity issues and establishing a robust dual-backend architecture.

## Table of Contents
1. [When to Use This Workflow](#when-to-use-this-workflow)
2. [Prerequisites](#prerequisites)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [Step-by-Step Deployment Process](#step-by-step-deployment-process)
5. [Post-Deployment Validation](#post-deployment-validation)
6. [Rollback Procedures](#rollback-procedures)
7. [Common Issues and Solutions](#common-issues-and-solutions)
8. [Emergency Deployment Protocol](#emergency-deployment-protocol)

---

## When to Use This Workflow

### ✅ Deploy When:
- **Backend fixes are needed** (initialization errors, service crashes)
- **New features are fully tested** and validated on staging
- **Critical bugs need immediate production deployment**
- **Environment variable mismatches** between staging and production backends
- **CORS configuration issues** need to be resolved
- **PAM functionality is broken** in production but working in staging

### ❌ Don't Deploy When:
- Staging environment is unstable or showing errors
- Features haven't been thoroughly tested
- Database migrations are incomplete
- External API integrations are failing in staging
- Team members haven't reviewed the changes

---

## Prerequisites

### System Requirements
- Access to GitHub repository with `main` and `staging` branches
- Netlify deployment dashboard access
- Render.com backend service dashboard access
- Supabase project admin access (both staging and production)

### Environment Understanding
```
Production Environment:
├── Frontend: https://wheelsandwins.com (Netlify, main branch)
├── Backend: https://pam-backend.onrender.com (Render, main branch)
└── Database: Production Supabase project

Staging Environment:
├── Frontend: https://wheels-wins-staging.netlify.app (Netlify, staging branch)
├── Backend: https://wheels-wins-backend-staging.onrender.com (Render, staging branch)
└── Database: Staging Supabase project
```

---

## Pre-Deployment Checklist

### 1. Validate Staging Environment

#### Backend Health Check
```bash
# Check staging backend health
curl https://wheels-wins-backend-staging.onrender.com/health

# Expected response:
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "redis": "connected",
    "openai": "available",
    "tts": "operational"
  }
}
```

#### Frontend Functionality Test
- [ ] PAM chat functionality works
- [ ] Authentication flows complete successfully
- [ ] Map features load correctly
- [ ] Financial tracking (Wins) operates properly
- [ ] No "emergency mode" warnings in console
- [ ] All new features function as expected

#### Environment Variables Verification
```bash
# Staging backend must have these 5 critical variables:
APP_URL=https://wheels-wins-backend-staging.onrender.com
DEBUG=true
NODE_ENV=staging
ENVIRONMENT=staging
VITE_USE_AI_SDK_PAM=true
```

### 2. Production Environment Check

#### Current Status Assessment
- [ ] Production backend current health status
- [ ] Any ongoing user-reported issues
- [ ] Recent deployment history review
- [ ] Current user traffic levels

#### Environment Variables Audit
```bash
# Production backend should have these 5 critical variables:
APP_URL=https://pam-backend.onrender.com
DEBUG=false
NODE_ENV=production
ENVIRONMENT=production
VITE_USE_AI_SDK_PAM=true
```

### 3. Data Backup Strategy
- [ ] Recent database backup confirmed (Supabase automatic backups)
- [ ] Git repository backup strategy in place
- [ ] Environment variable documentation current

---

## Step-by-Step Deployment Process

### Step 1: Create Safety Backup

Always create a backup branch before making changes to main:

```bash
# Switch to main branch and ensure it's up to date
git checkout main
git pull origin main

# Create timestamped backup branch
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
git checkout -b backup/main-before-sync-$TIMESTAMP
git push origin backup/main-before-sync-$TIMESTAMP

# Confirm backup was created
git branch -r | grep backup/main-before-sync-$TIMESTAMP
```

**Important**: Record the backup branch name for potential rollback:
```
backup/main-before-sync-20250820-124908
```

### Step 2: Merge Staging to Main

```bash
# Return to main branch
git checkout main

# Merge staging branch with proper commit message
git merge staging --no-ff -m "feat: sync staging to production - [brief description]

- [List key changes being deployed]
- [Mention any critical fixes]
- [Note environment variable updates needed]
- Backend connectivity fixes for PAM service
- Environment variable synchronization
- CORS configuration updates

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Step 3: Deploy to Production

```bash
# Push to trigger all production deployments
git push origin main
```

This triggers automatic deployments:
- **Netlify Frontend**: `wheelsandwins.com` deploys from main branch
- **Render Backend**: `pam-backend.onrender.com` deploys from main branch

### Step 4: Monitor Deployment Progress

#### Frontend Deployment (Netlify)
1. Visit Netlify dashboard
2. Monitor build progress for production site
3. Check for any build failures or warnings
4. Verify deployment completion

#### Backend Deployment (Render)
1. Visit Render dashboard for `pam-backend` service
2. Monitor deployment logs for any errors
3. Wait for service to reach "Live" status
4. Check for initialization errors in logs

### Step 5: Add Missing Environment Variables

If production backend is missing critical environment variables:

```bash
# Add these variables in Render dashboard for pam-backend:
APP_URL=https://pam-backend.onrender.com
DEBUG=false
NODE_ENV=production
ENVIRONMENT=production
VITE_USE_AI_SDK_PAM=true

# Update CORS origins to include staging domain:
CORS_ORIGINS=https://wheelsandwins.com,https://wheels-wins-landing-page.netlify.app,https://wheels-wins-staging.netlify.app
```

**Note**: Adding environment variables triggers an automatic redeploy of the backend service.

---

## Post-Deployment Validation

### Backend Health Verification

```bash
# Check production backend health
curl https://pam-backend.onrender.com/health

# Expected healthy response:
{
  "status": "healthy",
  "timestamp": "2025-08-20T12:49:08Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "openai": "available",
    "tts": "operational"
  },
  "version": "2.0.3"
}
```

### Frontend Functionality Testing

#### PAM AI Assistant
- [ ] Chat interface loads without errors
- [ ] WebSocket connection establishes successfully
- [ ] Voice features work (if enabled)
- [ ] No "demo mode" or "emergency mode" messages
- [ ] AI responses are generated properly

#### Core Application Features
- [ ] User authentication works
- [ ] Trip planning and maps function
- [ ] Financial tracking (Wins) operates
- [ ] Social features load correctly
- [ ] Mobile responsiveness maintained

#### Error Monitoring
- [ ] No console errors related to backend connectivity
- [ ] No CORS-related errors in network tab
- [ ] Sentry error monitoring shows no new issues
- [ ] Performance metrics remain stable

### User Experience Validation
- [ ] Page load times remain under 3 seconds
- [ ] No user-reported issues within first hour
- [ ] All major user flows complete successfully

---

## Rollback Procedures

### Quick Git Rollback (Fastest)

If issues are detected immediately after deployment:

```bash
# Revert to backup branch
git checkout main
git reset --hard backup/main-before-sync-[timestamp]
git push --force-with-lease origin main
```

**Example**:
```bash
git reset --hard backup/main-before-sync-20250820-124908
git push --force-with-lease origin main
```

### Service-Level Rollback

#### Netlify Frontend Rollback
1. Log into Netlify dashboard
2. Navigate to production site
3. Click "Deploys" tab
4. Find previous successful deployment
5. Click "Publish deploy" to restore

#### Render Backend Rollback
1. Log into Render dashboard
2. Navigate to `pam-backend` service
3. Go to "Deploys" section
4. Find previous working deployment
5. Click "Redeploy" to restore

### Environment Variable Restoration

If environment variable changes caused issues:

```bash
# Restore previous environment variable values from backup documentation
# Re-add critical variables:
APP_URL=https://pam-backend.onrender.com
DEBUG=false
NODE_ENV=production
ENVIRONMENT=production
VITE_USE_AI_SDK_PAM=true
```

---

## Common Issues and Solutions

### Issue 1: Backend Fails to Start

**Symptoms**:
- Health endpoint returns 503 or times out
- Logs show "no running event loop" errors
- PAM service shows "emergency mode"

**Solution**:
```bash
# Add missing environment variables in Render dashboard
APP_URL=https://pam-backend.onrender.com
DEBUG=false
NODE_ENV=production
ENVIRONMENT=production
VITE_USE_AI_SDK_PAM=true
```

### Issue 2: CORS Errors on Frontend

**Symptoms**:
- Console shows "Access-Control-Allow-Origin" errors
- API requests fail with CORS policy violations
- PAM WebSocket connection fails

**Solution**:
```bash
# Update CORS_ORIGINS in backend environment variables
CORS_ORIGINS=https://wheelsandwins.com,https://wheels-wins-landing-page.netlify.app,https://wheels-wins-staging.netlify.app
```

### Issue 3: Database Connection Failures

**Symptoms**:
- Backend health check shows database as "unhealthy"
- Authentication failures
- Data loading errors

**Solution**:
1. Verify Supabase URL and keys are correct
2. Check Supabase project status
3. Ensure RLS policies are properly configured
4. Test database connectivity from Render logs

### Issue 4: Frontend Shows Old Version

**Symptoms**:
- New features don't appear
- Old bugs are still present
- Version numbers don't match expected

**Solution**:
1. Check Netlify build logs for failures
2. Clear browser cache and test in incognito
3. Verify correct branch is being deployed
4. Check for CDN caching issues

---

## Emergency Deployment Protocol

For critical production issues requiring immediate fixes:

### 1. Assess Severity
- **Severity 1**: Complete service outage
- **Severity 2**: Major feature broken (PAM, authentication)
- **Severity 3**: Minor feature issues

### 2. Emergency Hotfix Process

```bash
# Create emergency hotfix branch
git checkout main
git checkout -b hotfix/critical-[issue-description]

# Make minimal fix
# Test locally if possible

# Deploy to staging first (if time permits)
git checkout staging
git merge hotfix/critical-[issue-description]
git push origin staging
# Quick staging test

# Deploy to production
git checkout main
git merge hotfix/critical-[issue-description]
git push origin main
```

### 3. Emergency Rollback

If emergency deployment fails:
```bash
# Immediate rollback to last known good state
git checkout main
git reset --hard backup/main-before-sync-[latest-backup]
git push --force-with-lease origin main
```

### 4. Communication Protocol
1. Notify team of emergency deployment
2. Document issue and fix in git commit
3. Monitor for 30 minutes post-deployment
4. Update incident documentation

---

## Deployment History Template

Keep a record of each deployment:

```markdown
## Deployment: 2025-08-20T12:49:08Z

**Trigger**: PAM backend connectivity issues
**Changes**: 
- Environment variable synchronization
- CORS configuration fixes
- Backend health monitoring improvements

**Backup Branch**: backup/main-before-sync-20250820-124908
**Result**: ✅ Successful
**Issues**: None
**Rollback Required**: No

**Validation Results**:
- Backend health: ✅ Healthy
- PAM functionality: ✅ Working
- Frontend performance: ✅ Normal
- User reports: ✅ No issues
```

---

## Best Practices Summary

1. **Always create backup branches** before major deployments
2. **Test thoroughly on staging** before production deployment
3. **Monitor deployments actively** for at least 30 minutes
4. **Keep environment variables synchronized** between environments
5. **Document all changes** in commit messages and deployment logs
6. **Have rollback plan ready** before starting deployment
7. **Communicate with team** about planned deployments
8. **Monitor error tracking** (Sentry) after deployment
9. **Validate user-facing functionality** after deployment
10. **Keep deployment documentation updated**

---

This workflow ensures safe, reliable deployments while maintaining the ability to quickly resolve issues if they arise. Always prioritize user experience and system stability over speed of deployment.