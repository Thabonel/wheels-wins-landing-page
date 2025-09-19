# 🔧 Environment Variables Reference

This guide provides a complete reference for all environment variables used in the Wheels & Wins application across different environments.

## 📋 Variable Categories

### Core Application Variables
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_ENVIRONMENT` | ✅ | Current environment | `staging`, `production` |
| `NODE_ENV` | ✅ | Node environment | `development`, `production` |
| `VITE_API_BASE_URL` | ✅ | Backend API URL | `https://api.wheelswins.com` |

### Database Configuration
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL | `https://abc123.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous key | `eyJ0eXAiOiJKV1QiLCJhbGc...` |

### External API Keys
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_MAPBOX_ACCESS_TOKEN` | ✅ | Mapbox maps API | `[REDACTED-MAPBOX-TOKEN]` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | ✅ | Stripe payments | `pk_test_...` or `pk_live_...` |
| `VITE_GOOGLE_ANALYTICS_ID` | ❌ | Google Analytics | `G-XXXXXXXXXX` |
| `VITE_HOTJAR_ID` | ❌ | Hotjar analytics | `1234567` |
| `VITE_SENTRY_DSN` | ❌ | Error tracking | `https://...@sentry.io/...` |

### Feature Flags
| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `VITE_ENABLE_BETA_FEATURES` | ❌ | Enable experimental features | `false` |
| `VITE_ENABLE_DEBUG_TOOLS` | ❌ | Show debug information | `false` |
| `VITE_ENABLE_PERFORMANCE_MONITORING` | ❌ | Performance tracking | `true` |
| `VITE_SHOW_STAGING_BANNER` | ❌ | Show staging environment banner | `false` |
| `VITE_ENABLE_TEST_DATA` | ❌ | Load test/sample data | `false` |
| `VITE_SKIP_EMAIL_VERIFICATION` | ❌ | Skip email verification | `false` |

## 🌍 Environment-Specific Configurations

### Development Environment
```bash
# .env.local (for local development)
VITE_ENVIRONMENT=development
NODE_ENV=development
VITE_SUPABASE_URL=https://your-dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-dev-key
VITE_API_BASE_URL=http://localhost:8000
VITE_MAPBOX_ACCESS_TOKEN=your-dev-token
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_dev_key
VITE_ENABLE_DEBUG_TOOLS=true
VITE_ENABLE_TEST_DATA=true
VITE_SHOW_STAGING_BANNER=false
```

### Staging Environment
```bash
# Set in Netlify for staging site
VITE_ENVIRONMENT=staging
NODE_ENV=production
VITE_SUPABASE_URL=https://your-staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-staging-key
VITE_API_BASE_URL=https://staging-api.wheelswins.com
VITE_MAPBOX_ACCESS_TOKEN=your-staging-token
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_staging_key
VITE_ENABLE_DEBUG_TOOLS=true
VITE_ENABLE_TEST_DATA=true
VITE_SHOW_STAGING_BANNER=true
VITE_SKIP_EMAIL_VERIFICATION=true
```

### Production Environment
```bash
# Set in Netlify for production site
VITE_ENVIRONMENT=production
NODE_ENV=production
VITE_SUPABASE_URL=https://your-production-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-key
VITE_API_BASE_URL=https://api.wheelswins.com
VITE_MAPBOX_ACCESS_TOKEN=your-production-token
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_production_key
VITE_GOOGLE_ANALYTICS_ID=G-PRODUCTION-ID
VITE_SENTRY_DSN=https://production-sentry-dsn
VITE_ENABLE_DEBUG_TOOLS=false
VITE_ENABLE_TEST_DATA=false
VITE_SHOW_STAGING_BANNER=false
VITE_SKIP_EMAIL_VERIFICATION=false
VITE_ENABLE_PERFORMANCE_MONITORING=true
```

## 🔒 Security Best Practices

### Variable Naming
- **Frontend variables** must start with `VITE_` to be accessible in the browser
- **Backend variables** should NOT start with `VITE_` (they stay on the server)
- Use descriptive names: `VITE_SUPABASE_URL` not `VITE_DB_URL`

### Sensitive Information
- ✅ **Safe for frontend**: API URLs, public keys, feature flags
- ❌ **Never in frontend**: Secret keys, private keys, passwords
- 🔐 **Backend only**: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`

### Key Management
| Environment | Stripe Keys | Supabase | Security Level |
|-------------|-------------|----------|----------------|
| Development | `pk_test_*` | Dev project | Low |
| Staging | `pk_test_*` | Staging project | Medium |
| Production | `pk_live_*` | Production project | High |

## 🛠️ Setting Environment Variables

### In Netlify Dashboard
1. Go to **Site Settings** → **Environment Variables**
2. Click **Add variable**
3. Enter variable name and value
4. Select environment (staging/production)
5. Click **Save**
6. **Redeploy** to apply changes

### In GitHub Actions
Set as repository secrets for CI/CD:

1. Go to **Repository Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add variables like:
   - `STAGING_SUPABASE_URL`
   - `PRODUCTION_STRIPE_KEY`
   - `NETLIFY_AUTH_TOKEN`

### Local Development
Create `.env.local` file in project root:

```bash
# Copy from .env.staging and customize
cp .env.staging .env.local
# Edit values for local development
```

## 🧪 Testing Environment Variables

### Validation Script
```bash
# Test if all required variables are set
npm run dev
# Check browser console for environment info
```

### Environment Detection
```typescript
import { ENV, validateEnvironment } from '@/config/environment';

// Check current environment
console.log('Environment:', ENV.ENVIRONMENT);

// Validate required variables
const validation = validateEnvironment();
if (!validation.isValid) {
  console.error('Missing variables:', validation.missingVars);
}
```

## 🚨 Common Issues

### Variables Not Loading
1. **Check variable names** - Must start with `VITE_` for frontend
2. **Restart development server** after adding variables
3. **Redeploy** after changing Netlify variables
4. **Clear browser cache** if changes don't appear

### Wrong Environment Detected
1. Check `VITE_ENVIRONMENT` is set correctly
2. Verify build command uses correct mode
3. Check browser console for environment info

### Stripe Test/Live Mode Confusion
- **Test keys**: Start with `pk_test_` and `sk_test_`
- **Live keys**: Start with `pk_live_` and `sk_live_`
- **Always use test keys** in staging environment

## 📋 Environment Variable Checklist

### Before Deploying to Staging
- [ ] `VITE_ENVIRONMENT=staging`
- [ ] `VITE_SHOW_STAGING_BANNER=true`
- [ ] All API keys are test/sandbox versions
- [ ] Separate Supabase project configured
- [ ] Debug tools enabled

### Before Deploying to Production
- [ ] `VITE_ENVIRONMENT=production`
- [ ] `VITE_SHOW_STAGING_BANNER=false`
- [ ] All API keys are live/production versions
- [ ] Production Supabase project configured
- [ ] Debug tools disabled
- [ ] Analytics configured

---

*For more information, see the [Staging Environment Manual](../STAGING_ENVIRONMENT_MANUAL.md) or [Troubleshooting Guide](../guides/troubleshooting/common-issues.md).*