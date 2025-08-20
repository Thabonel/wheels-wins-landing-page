# 🔧 Environment Variables Configuration Guide

## Overview

This document provides comprehensive guidance for configuring environment variables across all Wheels & Wins deployment environments. Proper environment variable configuration is critical for system stability and functionality.

## Table of Contents
1. [Critical Variables Overview](#critical-variables-overview)
2. [Frontend Variables (Netlify)](#frontend-variables-netlify)
3. [Backend Variables (Render)](#backend-variables-render)
4. [Database Variables (Supabase)](#database-variables-supabase)
5. [Environment-Specific Configurations](#environment-specific-configurations)
6. [Troubleshooting](#troubleshooting)
7. [Security Best Practices](#security-best-practices)

---

## Critical Variables Overview

### 🚨 Backend Initialization Requirements

**All backend services MUST have these 5 variables to start properly:**

| Variable | Purpose | Production Value | Staging Value |
|----------|---------|------------------|---------------|
| `APP_URL` | Service URL for self-reference | `https://pam-backend.onrender.com` | `https://wheels-wins-backend-staging.onrender.com` |
| `DEBUG` | Enable debug logging | `false` | `true` |
| `NODE_ENV` | Node.js environment | `production` | `staging` |
| `ENVIRONMENT` | Application environment | `production` | `staging` |
| `VITE_USE_AI_SDK_PAM` | Enable PAM AI service | `true` | `true` |

**⚠️ Missing any of these variables causes backend initialization failure with "no running event loop" errors.**

---

## Frontend Variables (Netlify)

### Production Frontend Environment
```bash
# Environment Detection
VITE_ENVIRONMENT=production
VITE_SHOW_STAGING_BANNER=false

# Database Connection
VITE_SUPABASE_URL=https://your-production-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...

# Backend Services
VITE_BACKEND_URL=https://pam-backend.onrender.com
VITE_API_URL=https://pam-backend.onrender.com
VITE_PAM_WEBSOCKET_URL=wss://pam-backend.onrender.com/api/v1/pam/ws

# External Services
VITE_MAPBOX_PUBLIC_TOKEN=pk.eyJ1IjoieW91ci1hY2NvdW50IiwiYSI6ImNtMH...
VITE_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoieW91ci1hY2NvdW50IiwiYSI6ImNtMH...

# Feature Flags
VITE_ENABLE_DEBUG_TOOLS=false
VITE_ENABLE_TEST_DATA=false
VITE_SKIP_EMAIL_VERIFICATION=false

# Monitoring
VITE_SENTRY_DSN=https://[key]@[project].ingest.sentry.io/[id]

# Performance
VITE_FETCH_TIMEOUT=10000
```

### Staging Frontend Environment
```bash
# Environment Detection
VITE_ENVIRONMENT=staging
VITE_SHOW_STAGING_BANNER=true

# Database Connection (Separate Staging Project)
VITE_SUPABASE_URL=https://your-staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...

# Backend Services
VITE_BACKEND_URL=https://wheels-wins-backend-staging.onrender.com
VITE_API_URL=https://wheels-wins-backend-staging.onrender.com
VITE_PAM_WEBSOCKET_URL=wss://wheels-wins-backend-staging.onrender.com/api/v1/pam/ws

# External Services (Test/Sandbox Keys)
VITE_MAPBOX_PUBLIC_TOKEN=pk.eyJ1IjoieW91ci10ZXN0LWFjY291bnQi...
VITE_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoieW91ci10ZXN0LWFjY291bnQi...

# Feature Flags (Development Features Enabled)
VITE_ENABLE_DEBUG_TOOLS=true
VITE_ENABLE_TEST_DATA=true
VITE_SKIP_EMAIL_VERIFICATION=true

# Monitoring (Same as production for testing)
VITE_SENTRY_DSN=https://[key]@[project].ingest.sentry.io/[id]

# Performance
VITE_FETCH_TIMEOUT=15000
```

---

## Backend Variables (Render)

### Production Backend Environment
```bash
# CRITICAL: 5 Required Initialization Variables
APP_URL=https://pam-backend.onrender.com
DEBUG=false
NODE_ENV=production
ENVIRONMENT=production
VITE_USE_AI_SDK_PAM=true

# Database Connection
SUPABASE_URL=https://your-production-project.supabase.co
SUPABASE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...(service_role)
SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...(anon)

# Security & CORS
SECRET_KEY=auto-generated-by-render-production
CORS_ORIGINS=https://wheelsandwins.com,https://wheels-wins-landing-page.netlify.app,https://wheels-wins-staging.netlify.app

# AI Services
OPENAI_API_KEY=sk-proj-your-production-openai-key

# Redis Connection (Auto-injected by Render)
REDIS_URL=redis://pam-redis:6379

# External Integrations
MAPBOX_SECRET_TOKEN=sk.eyJ1IjoieW91ci1hY2NvdW50IiwiYSI6ImNtMH...

# Monitoring & Logging
SENTRY_DSN=https://[key]@[project].ingest.sentry.io/[id]
LANGCHAIN_TRACING_V2=disabled

# TTS Configuration
TTS_ENABLED=true
TTS_PRIMARY_ENGINE=edge
TTS_FALLBACK_ENABLED=true
TTS_VOICE_DEFAULT=en-US-AriaNeural

# Performance Settings
MAX_WORKERS=4
WORKER_TIMEOUT=120
```

### Staging Backend Environment
```bash
# CRITICAL: 5 Required Initialization Variables (Staging Values)
APP_URL=https://wheels-wins-backend-staging.onrender.com
DEBUG=true
NODE_ENV=staging
ENVIRONMENT=staging
VITE_USE_AI_SDK_PAM=true

# Database Connection (Staging Project)
SUPABASE_URL=https://your-staging-project.supabase.co
SUPABASE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...(staging_service_role)
SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...(staging_anon)

# Security & CORS
SECRET_KEY=auto-generated-by-render-staging
CORS_ORIGINS=https://wheels-wins-staging.netlify.app,https://wheels-wins-backend-staging.onrender.com

# AI Services (Same as production or separate staging key)
OPENAI_API_KEY=sk-proj-your-staging-openai-key

# Redis Connection (Auto-injected by Render)
REDIS_URL=redis://pam-redis:6379

# External Integrations (Test/Sandbox Keys)
MAPBOX_SECRET_TOKEN=sk.eyJ1IjoieW91ci10ZXN0LWFjY291bnQi...

# Monitoring & Logging
SENTRY_DSN=https://[key]@[project].ingest.sentry.io/[id]
LANGCHAIN_TRACING_V2=enabled

# TTS Configuration (Same as production)
TTS_ENABLED=true
TTS_PRIMARY_ENGINE=edge
TTS_FALLBACK_ENABLED=true
TTS_VOICE_DEFAULT=en-US-AriaNeural

# Performance Settings (Lower for staging)
MAX_WORKERS=2
WORKER_TIMEOUT=60
```

---

## Database Variables (Supabase)

### Required Supabase Keys

| Key Type | Format | Usage | Security Level |
|----------|--------|-------|----------------|
| **Anon Key** | `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...` | Frontend public access | Public (safe to expose) |
| **Service Role Key** | `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...` | Backend admin access | **Secret (never expose)** |

### Supabase Project Configuration

#### Production Database
```bash
# Project: wheels-wins-production
SUPABASE_URL=https://your-prod-id.supabase.co
SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

#### Staging Database  
```bash
# Project: wheels-wins-staging
SUPABASE_URL=https://your-staging-id.supabase.co
SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

---

## Environment-Specific Configurations

### Local Development
```bash
# Copy from staging for local development
cp .env.staging .env.local

# Or create custom local environment
VITE_ENVIRONMENT=development
VITE_BACKEND_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-staging-project.supabase.co
# ... other staging variables
```

### CI/CD Pipeline
```bash
# GitHub Actions environment
VITE_ENVIRONMENT=ci
VITE_SUPABASE_URL=https://your-staging-project.supabase.co
# Minimal variables for build testing
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Backend Won't Start
**Error**: "no running event loop" or "PAMServiceError"
**Cause**: Missing one of the 5 critical initialization variables
**Solution**:
```bash
# Verify all 5 variables are set in Render dashboard:
APP_URL=https://[service-name].onrender.com
DEBUG=false (true for staging)
NODE_ENV=production (staging for staging)
ENVIRONMENT=production (staging for staging)
VITE_USE_AI_SDK_PAM=true
```

#### 2. CORS Errors
**Error**: "Access-Control-Allow-Origin" errors in browser
**Cause**: Frontend domain not included in CORS_ORIGINS
**Solution**:
```bash
# Update CORS_ORIGINS to include all domains:
CORS_ORIGINS=https://wheelsandwins.com,https://wheels-wins-landing-page.netlify.app,https://wheels-wins-staging.netlify.app
```

#### 3. Frontend Shows Wrong Environment
**Error**: Staging banner on production or vice versa
**Cause**: VITE_ENVIRONMENT variable misconfigured
**Solution**:
```bash
# Production:
VITE_ENVIRONMENT=production
VITE_SHOW_STAGING_BANNER=false

# Staging:
VITE_ENVIRONMENT=staging
VITE_SHOW_STAGING_BANNER=true
```

#### 4. Database Connection Issues
**Error**: Authentication failures or 401 errors
**Cause**: Incorrect Supabase URL or keys
**Solution**:
1. Verify Supabase project URLs match environment
2. Check anon keys are correct for each project
3. Ensure service role keys are not swapped
4. Test keys in Supabase dashboard

#### 5. WebSocket Connection Failures
**Error**: PAM chat not working, WebSocket errors
**Cause**: Incorrect WebSocket URL configuration
**Solution**:
```bash
# Ensure WebSocket URLs use wss:// protocol:
VITE_PAM_WEBSOCKET_URL=wss://pam-backend.onrender.com/api/v1/pam/ws
# Not: https://pam-backend.onrender.com/api/v1/pam/ws
```

### Environment Variable Validation Script

Create a script to validate environment variables:

```bash
#!/bin/bash
# validate-env.sh

echo "🔍 Validating Environment Variables..."

# Check critical backend variables
REQUIRED_BACKEND_VARS=("APP_URL" "DEBUG" "NODE_ENV" "ENVIRONMENT" "VITE_USE_AI_SDK_PAM")

for var in "${REQUIRED_BACKEND_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Missing critical variable: $var"
    else
        echo "✅ $var is set"
    fi
done

# Check CORS configuration
if [[ $CORS_ORIGINS == *"wheelsandwins.com"* ]] && [[ $CORS_ORIGINS == *"staging"* ]]; then
    echo "✅ CORS_ORIGINS includes both production and staging"
else
    echo "⚠️ CORS_ORIGINS may be incomplete: $CORS_ORIGINS"
fi

echo "🔍 Validation complete"
```

---

## Security Best Practices

### 1. Key Rotation
- Rotate Supabase service role keys quarterly
- Update OpenAI API keys when team members change
- Regenerate Render auto-generated secrets annually

### 2. Access Control
- Never commit service role keys to git
- Use separate keys for staging and production
- Limit team access to production environment variables

### 3. Monitoring
- Monitor for unauthorized environment variable changes
- Set up alerts for key usage anomalies
- Regularly audit key permissions

### 4. Backup Strategy
```bash
# Document current environment variables
echo "Production Environment Backup - $(date)" > env-backup.txt
echo "SUPABASE_URL=$SUPABASE_URL" >> env-backup.txt
echo "CORS_ORIGINS=$CORS_ORIGINS" >> env-backup.txt
# ... (exclude sensitive keys)
```

### 5. Incident Response
If environment variables are compromised:
1. Immediately rotate affected keys
2. Update all deployment environments
3. Monitor for unauthorized access
4. Document incident and prevention measures

---

## Quick Reference

### Environment Variable Checklist

#### Before Deployment:
- [ ] All 5 critical backend variables set
- [ ] CORS_ORIGINS includes all domains
- [ ] Supabase keys match correct environment
- [ ] WebSocket URLs use wss:// protocol
- [ ] Debug flags set appropriately

#### After Deployment:
- [ ] Backend health check passes
- [ ] Frontend loads without CORS errors
- [ ] PAM WebSocket connects successfully
- [ ] No "emergency mode" warnings
- [ ] Sentry shows no new environment errors

### Emergency Environment Variable Reset

If variables get corrupted during deployment:

```bash
# Production Quick Reset
APP_URL=https://pam-backend.onrender.com
DEBUG=false
NODE_ENV=production
ENVIRONMENT=production
VITE_USE_AI_SDK_PAM=true
CORS_ORIGINS=https://wheelsandwins.com,https://wheels-wins-landing-page.netlify.app,https://wheels-wins-staging.netlify.app
```

---

This documentation ensures that environment variables are properly configured across all environments, preventing the initialization and connectivity issues experienced during PAM backend troubleshooting.