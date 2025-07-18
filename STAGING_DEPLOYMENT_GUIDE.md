# Staging Environment Setup Guide

This guide helps you set up a complete staging environment on Netlify for testing before deploying to production.

## 🎯 Overview

The staging environment provides:
- **Safe Testing**: Test features without affecting production users
- **Environment Isolation**: Separate database, API keys, and configurations
- **Automated Deployments**: Auto-deploy from staging branch or PRs
- **Visual Indicators**: Clear staging banners and debugging tools
- **Performance Testing**: Monitor and optimize before production

## 🚀 Quick Setup Steps

### 1. Create Netlify Staging Site

1. **Log in to Netlify**: Go to [netlify.com](https://netlify.com)
2. **Create New Site**: Click "Add new site" → "Import an existing project"
3. **Connect GitHub**: Select your repository
4. **Configure Build Settings**:
   - Build command: `npm run build:staging`
   - Publish directory: `dist`
   - Branch: `staging` (or `develop`)

### 2. Set Environment Variables in Netlify

Go to **Site Settings** → **Environment Variables** and add:

#### Required Variables
```bash
VITE_ENVIRONMENT=staging
VITE_SUPABASE_URL=https://your-staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-staging-anon-key
VITE_API_BASE_URL=https://wheels-wins-staging-backend.render.com
```

#### Feature Flags
```bash
VITE_SHOW_STAGING_BANNER=true
VITE_ENABLE_BETA_FEATURES=true
VITE_ENABLE_DEBUG_TOOLS=true
VITE_ENABLE_TEST_DATA=true
VITE_SKIP_EMAIL_VERIFICATION=true
```

#### External APIs (Use test/sandbox keys)
```bash
VITE_MAPBOX_ACCESS_TOKEN=staging-mapbox-token
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_staging_key
VITE_GOOGLE_ANALYTICS_ID=G-STAGING-ID
VITE_SENTRY_DSN=https://staging-sentry-dsn
```

### 3. Set Up GitHub Secrets

For automated deployments, add these secrets to your GitHub repository:

**Repository Settings** → **Secrets and variables** → **Actions**

#### Netlify Deployment
```bash
NETLIFY_AUTH_TOKEN=your-netlify-auth-token
NETLIFY_STAGING_SITE_ID=your-staging-site-id
NETLIFY_PRODUCTION_SITE_ID=your-production-site-id
```

#### Staging Environment
```bash
STAGING_SUPABASE_URL=https://your-staging-project.supabase.co
STAGING_SUPABASE_ANON_KEY=your-staging-anon-key
STAGING_API_BASE_URL=https://wheels-wins-staging-backend.render.com
STAGING_MAPBOX_TOKEN=staging-mapbox-token
STAGING_STRIPE_PUBLISHABLE_KEY=pk_test_staging_key
```

#### Production Environment
```bash
PRODUCTION_SUPABASE_URL=https://your-production-project.supabase.co
PRODUCTION_SUPABASE_ANON_KEY=your-production-anon-key
PRODUCTION_API_BASE_URL=https://wheels-wins-backend.render.com
PRODUCTION_MAPBOX_TOKEN=production-mapbox-token
PRODUCTION_STRIPE_PUBLISHABLE_KEY=pk_live_production_key
PRODUCTION_GOOGLE_ANALYTICS_ID=G-PRODUCTION-ID
PRODUCTION_SENTRY_DSN=https://production-sentry-dsn
```

## 🔧 Configuration Files Created

### Netlify Configuration
- `netlify.staging.toml` - Staging-specific build settings
- `netlify.toml` - Production configuration

### Environment Files  
- `.env.staging` - Staging environment template
- `.env.production` - Production environment template

### Build Scripts
Added to `package.json`:
- `npm run build:staging` - Build for staging
- `npm run build:production` - Build for production

### Components
- `StagingBanner.tsx` - Visual staging indicator
- `environment.ts` - Environment configuration utilities

## 🚦 Deployment Workflows

### Automatic Staging Deployment
Triggers on:
- Push to `staging` or `develop` branch
- Pull requests to `main` branch

**Staging URL**: `https://staging-branch-name--your-site-id.netlify.app`

### Production Deployment
Triggers on:
- Push to `main` branch
- Manual workflow dispatch

**Production URL**: Your custom domain

## 🧪 Testing Your Staging Environment

### 1. Visual Verification
- [ ] **Staging Banner**: Yellow banner appears at top
- [ ] **Environment Indicator**: Check browser console for environment info
- [ ] **Debug Tools**: Available in staging mode

### 2. Functionality Testing
- [ ] **Authentication**: Login/signup flows
- [ ] **PAM AI Chat**: Test conversation features
- [ ] **Trip Planning**: Map functionality and route planning
- [ ] **Financial Management**: Budget and expense tracking
- [ ] **Social Features**: Groups, posts, marketplace
- [ ] **Payment Flow**: Test with Stripe test cards

### 3. Performance Testing
- [ ] **Load Times**: Page loading speed
- [ ] **API Responses**: Backend connectivity
- [ ] **Mobile Experience**: Responsive design
- [ ] **Offline Functionality**: PWA features

## 🔍 Monitoring & Debugging

### Available in Staging
```javascript
// Environment info (check browser console)
import { logEnvironmentInfo } from '@/config/environment';
logEnvironmentInfo();

// Feature flags
import { ENV } from '@/config/environment';
console.log('Beta Features:', ENV.ENABLE_BETA_FEATURES);
console.log('Debug Tools:', ENV.ENABLE_DEBUG_TOOLS);
```

### Staging-Specific Features
- **Extended Logging**: More detailed console output
- **Test Data**: Pre-populated sample data
- **Bypass Email Verification**: Faster testing
- **Debug Tools**: Additional development utilities

## 🔄 Deployment Process

### For Testing New Features
1. **Create Feature Branch**: `git checkout -b feature/new-feature`
2. **Develop & Test Locally**: `npm run dev`
3. **Push to Staging**: `git push origin feature/new-feature`
4. **Test on Staging**: Verify functionality on staging URL
5. **Create PR to Main**: For production deployment

### For Hotfixes
1. **Create Hotfix Branch**: `git checkout -b hotfix/critical-fix`
2. **Test on Staging**: Deploy and verify fix
3. **Deploy to Production**: Merge to main

## 🛡️ Security Considerations

### Staging Environment
- Uses **test API keys** for all external services
- **Separate database** from production
- **No real user data** or payments
- **Limited access** via URL obfuscation

### Data Isolation
- Staging Supabase project isolated from production
- Test Stripe account prevents real charges
- Analytics separated to avoid skewing production data

## 📋 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check environment variables are set
npm run build:staging

# Verify all dependencies installed
npm ci
```

#### Environment Variables Not Working
1. Check Netlify site settings
2. Verify variable names match exactly
3. Redeploy after changes

#### Staging Banner Not Showing
1. Verify `VITE_SHOW_STAGING_BANNER=true`
2. Check `VITE_ENVIRONMENT=staging`
3. Clear browser cache

### Debug Commands
```bash
# Test staging build locally
npm run build:staging && npm run preview

# Check environment configuration
npm run dev # and check console output

# Validate all environment variables
# Check src/config/environment.ts
```

## 🎉 Next Steps

1. **Set Up Staging Database**: Create separate Supabase project
2. **Configure Backend**: Deploy staging backend to Render
3. **Test Deployment**: Push to staging branch
4. **Invite Team**: Share staging URL for team testing
5. **Document Testing**: Create testing checklists
6. **Monitor Performance**: Set up staging analytics

## 📞 Support

If you encounter issues:
1. Check this guide first
2. Review GitHub Actions logs
3. Check Netlify deployment logs
4. Verify environment variables
5. Test locally with staging config

---

**Remember**: Always test on staging before deploying to production! 🚀