# Deployment Guide

## Infrastructure Overview

```
┌─────────────────┐     ┌──────────────────┐
│                 │     │                  │
│  Netlify (CDN)  │────▶│  Render Services │
│   Frontend      │     │    Backend       │
│                 │     │                  │
└─────────────────┘     └──────────────────┘
         │                       │
         └───────┬───────────────┘
                 │
         ┌───────▼────────┐
         │                │
         │   Supabase     │
         │   PostgreSQL   │
         │                │
         └────────────────┘
```

## Frontend Deployment (Netlify)

### Automatic Deployment
- **Production**: Push to `main` branch
- **Staging**: Push to `staging` branch
- **Preview**: Create pull request

### Build Settings
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"
  NPM_VERSION = "10"
```

### Environment Variables (Netlify Dashboard)
```bash
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_MAPBOX_TOKEN=pk...
VITE_SENTRY_DSN=https://...
VITE_GA_MEASUREMENT_ID=G-...
```

### Common Build Issues

#### Platform-Specific Packages
```bash
# Remove darwin/win32 packages
npm uninstall @esbuild/darwin-x64
npm uninstall @rollup/rollup-darwin-x64
```

#### Node Version Mismatch
```toml
# Set in netlify.toml
[build.environment]
  NODE_VERSION = "20"
```

#### Build Memory Issues
```toml
# Increase memory limit
[build.environment]
  NODE_OPTIONS = "--max_old_space_size=8192"
```

## Backend Deployment (Render)

### 4 Services Configuration

#### 1. pam-backend (Web Service)
```yaml
# render.yaml
services:
  - type: web
    name: pam-backend
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: pam-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          name: pam-redis
          property: connectionString
```

#### 2. pam-redis (Private Service)
```yaml
  - type: redis
    name: pam-redis
    ipAllowList: []
    plan: free
```

#### 3. pam-celery-worker (Background Worker)
```yaml
  - type: worker
    name: pam-celery-worker
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: celery -A app.celery_app worker --loglevel=info
```

#### 4. pam-celery-beat (Cron)
```yaml
  - type: worker
    name: pam-celery-beat
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: celery -A app.celery_app beat --loglevel=info
```

### Backend Environment Variables
```bash
# All services need
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
SECRET_KEY=...

# pam-backend specific
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=sk-...
TTS_ENABLED=true
CORS_ORIGINS=["https://yourdomain.com"]

# Email settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
```

### Health Checks
```python
# backend/app/main.py
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}
```

## Database Deployment (Supabase)

### Production Setup
1. Create project at https://supabase.com
2. Get connection string
3. Configure RLS policies
4. Set up backups

### Migrations
```bash
# Create migration
supabase migration new feature_name

# Apply to local
supabase db push

# Apply to production
supabase db push --db-url $DATABASE_URL
```

### Backup Strategy
- **Automatic**: Daily backups (Supabase)
- **Manual**: Before major changes
- **Export**: Regular SQL dumps

```bash
# Export database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

## CI/CD Pipeline

### GitHub Actions (Optional)
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Netlify Deploy
        run: curl -X POST $NETLIFY_BUILD_HOOK
```

### Pre-deployment Checklist
- [ ] All tests passing
- [ ] TypeScript no errors
- [ ] ESLint no errors
- [ ] Build succeeds locally
- [ ] Environment variables set
- [ ] Database migrations ready
- [ ] API endpoints tested

## Monitoring

### Frontend (Netlify)
- **Analytics**: Netlify Analytics dashboard
- **Logs**: Function logs in dashboard
- **Alerts**: Email notifications for failures

### Backend (Render)
- **Metrics**: CPU, Memory, Disk usage
- **Logs**: Real-time logs per service
- **Alerts**: Slack/Email for downtime

### Error Tracking (Sentry)
```typescript
// Frontend
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
});

// Backend
import sentry_sdk
sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    environment=os.getenv("ENVIRONMENT", "production")
)
```

### Database (Supabase)
- **Dashboard**: Query performance
- **Logs**: API logs, Auth logs
- **Metrics**: Connection pool, query time

## Rollback Procedures

### Frontend Rollback
1. Go to Netlify dashboard
2. Navigate to Deploys
3. Find last working deploy
4. Click "Publish deploy"

### Backend Rollback
1. Go to Render dashboard
2. Select service
3. Navigate to Deploys
4. Click "Rollback" on previous version

### Database Rollback
```bash
# Restore from backup
psql $DATABASE_URL < backup_20250130.sql

# Or use Supabase dashboard
# Settings > Backups > Restore
```

## Performance Optimization

### Frontend
- **CDN**: Netlify Edge Network
- **Compression**: Brotli/Gzip enabled
- **Caching**: Immutable assets cached
- **Prerendering**: For static pages

### Backend
- **Auto-scaling**: Render handles scaling
- **Connection Pooling**: PgBouncer
- **Redis Caching**: Session and data cache
- **Rate Limiting**: Per-endpoint limits

## Security

### SSL/TLS
- **Frontend**: Automatic via Netlify
- **Backend**: Automatic via Render
- **Database**: Enforced by Supabase

### Headers
```toml
# netlify.toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline'"
```

### Environment Variables
- Never commit `.env` files
- Use service dashboards
- Rotate keys regularly
- Different keys per environment

## Deployment Commands

### Quick Deploy to Production
```bash
# Frontend
git checkout main
git merge staging
git push origin main
# Auto-deploys to Netlify

# Backend
git push origin main
# Auto-deploys to Render
```

### Emergency Deployment
```bash
# Skip CI/CD checks
git push origin main --force

# Direct Netlify deploy
netlify deploy --prod --dir=dist

# Manual Render deploy
# Use dashboard "Manual Deploy" button
```

## Post-Deployment Verification

### Smoke Tests
1. [ ] Homepage loads
2. [ ] Login works
3. [ ] Core features accessible
4. [ ] API endpoints responding
5. [ ] WebSocket connections work
6. [ ] Database queries succeed

### Monitoring Checklist
1. [ ] Check Sentry for new errors
2. [ ] Monitor server resources
3. [ ] Check response times
4. [ ] Verify cache hit rates
5. [ ] Review user feedback

## Troubleshooting

### Build Failures
```bash
# Clear cache and retry
npm ci
npm run build

# Check Node version
node --version  # Should be 20.x

# Remove platform packages
npm ls | grep darwin
npm ls | grep win32
```

### Service Unavailable
1. Check Render service status
2. Review recent deploys
3. Check environment variables
4. Review logs for errors
5. Rollback if needed

### Database Issues
1. Check connection limits
2. Review slow queries
3. Check RLS policies
4. Verify indexes
5. Monitor disk usage

## Support Contacts

- **Netlify Support**: support@netlify.com
- **Render Support**: Dashboard ticket system
- **Supabase Support**: Dashboard support chat
- **Sentry Support**: support@sentry.io

## Cost Management

### Current Tiers
- **Netlify**: Pro ($19/month)
- **Render**: Individual (Free → $7/service)
- **Supabase**: Pro ($25/month)
- **Total**: ~$70/month

### Optimization Tips
- Monitor bandwidth usage
- Optimize image sizes
- Use caching effectively
- Clean up unused services
- Review database size