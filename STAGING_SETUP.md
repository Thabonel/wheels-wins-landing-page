# Staging Environment Setup Guide

## Overview

This project uses a staging environment to test changes before deploying to production.

### Architecture

```
STAGING:    Netlify Staging → Render Staging ─┐
                                              ├→ Production Supabase
PRODUCTION: Netlify Prod → Render Prod ───────┘
```

## Git Workflow

1. **Branches**:
   - `main` - Production branch
   - `staging` - Staging branch
   - Feature branches created from `staging`

2. **Workflow**:
   ```
   feature-branch → staging → main
   ```

## Deployment Setup

### 1. Netlify Staging Site

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub and select `Thabonel/wheels-wins-landing-page`
4. Configure build settings:
   - **Branch to deploy**: `staging`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Build environment variables**:
     ```
     NODE_VERSION = 18.17.0
     VITE_ENVIRONMENT = staging
     VITE_SUPABASE_URL = [your-supabase-url]
     VITE_SUPABASE_ANON_KEY = [your-supabase-anon-key]
     VITE_MAPBOX_TOKEN = [your-mapbox-token]
     VITE_API_URL = https://wheels-wins-backend-staging.onrender.com
     ```

5. Deploy and note your staging URL (e.g., `staging-wheelsandwins.netlify.app`)

### 2. Render Staging Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure service:
   - **Name**: `wheels-wins-backend-staging`
   - **Branch**: `staging`
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Environment Variables**:
     ```
     ENVIRONMENT = staging
     SUPABASE_URL = [same-as-production]
     SUPABASE_SERVICE_ROLE_KEY = [same-as-production]
     OPENAI_API_KEY = [same-as-production]
     DATABASE_URL = [same-as-production]
     REDIS_URL = [same-as-production]
     MAPBOX_SECRET_TOKEN = [same-as-production]
     TTS_ENABLED = true
     CORS_ALLOWED_ORIGINS = https://staging-wheelsandwins.netlify.app,http://localhost:8080
     ```

5. Deploy and note your staging API URL

### 3. Update Netlify Staging with API URL

Once Render staging is deployed:
1. Go back to Netlify staging site settings
2. Update environment variable:
   ```
   VITE_API_URL = [your-render-staging-url]
   ```
3. Trigger a redeploy

## Testing Workflow

1. **Local Development**:
   ```bash
   git checkout staging
   git pull origin staging
   git checkout -b feature/my-feature
   # Make changes
   npm run dev  # Test locally
   ```

2. **Deploy to Staging**:
   ```bash
   git add .
   git commit -m "feat: my new feature"
   git push origin feature/my-feature
   # Create PR to staging branch
   # Merge PR → Auto-deploy to staging
   ```

3. **Test on Staging**:
   - Visit `https://staging-wheelsandwins.netlify.app`
   - Look for yellow staging banner
   - Test all features thoroughly
   - Check PAM AI functionality
   - Verify database operations

4. **Deploy to Production**:
   ```bash
   git checkout main
   git pull origin main
   git merge staging
   git push origin main
   # Auto-deploy to production
   ```

## Environment Variables Reference

### Frontend (Netlify)
- `VITE_ENVIRONMENT` - Set to "staging" for staging site
- `VITE_API_URL` - Points to staging Render backend
- All other variables same as production

### Backend (Render)
- `ENVIRONMENT` - Set to "staging" for staging service
- `CORS_ALLOWED_ORIGINS` - Include staging Netlify URL
- All other variables same as production

## Monitoring

### Staging Indicators
- Yellow banner at top of staging site
- Console logs show "STAGING ENVIRONMENT"
- API responses include staging headers

### Logs
- **Netlify Staging**: Check deploy logs in Netlify dashboard
- **Render Staging**: Check service logs in Render dashboard

## Rollback Procedures

### Quick Rollback
1. **Netlify**: Use "Rollback" button in deploy history
2. **Render**: Use "Rollback" button in deploy history

### Full Rollback
1. **Git**: Revert commits on staging branch
2. **Force Push**: `git push origin staging --force`
3. **Redeploy**: Trigger new deployments

## Troubleshooting

### Common Issues

1. **Environment Variables Not Set**
   - Check Netlify site settings
   - Verify all VITE_ prefixes
   - Trigger redeploy after changes

2. **CORS Errors**
   - Check CORS_ALLOWED_ORIGINS in Render
   - Include both HTTP and HTTPS variants
   - Include localhost for development

3. **Database Errors**
   - Staging uses same database as production
   - Check Supabase connection strings
   - Verify RLS policies allow access

4. **Build Failures**
   - Check Node version (use 18.x)
   - Clear build cache and retry
   - Check for missing environment variables

### Debug Commands

```bash
# Check environment variables locally
npm run dev
# Look for console output showing API_BASE_URL

# Test API connectivity
curl https://wheels-wins-backend-staging.onrender.com/health

# Check WebSocket connection
# Open browser dev tools and check WebSocket tab
```

### Contact Information

For issues with:
- **Netlify**: Check deploy logs and build settings
- **Render**: Check service logs and environment variables
- **Database**: Check Supabase dashboard and RLS policies

## Security Notes

- Staging uses same database as production (shared data)
- API keys are same between environments
- Never commit secrets to git
- Use environment variables for all sensitive data

---

*Last updated: August 2025*