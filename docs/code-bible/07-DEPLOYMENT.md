# 07 - Deployment Documentation

**Purpose:** Netlify frontend and Render backend deployment reference.

---

## Infrastructure Overview

```
                    USERS
                      |
     +----------------+----------------+
     |                                 |
[Mobile/PWA]                     [Desktop Web]
     |                                 |
     +----------------+----------------+
                      |
               [Netlify CDN]
          wheels-wins-staging.netlify.app
             wheelsandwins.com
                      |
     +----------------+----------------+
     |                                 |
[React SPA]                     [Static Assets]
     |
     v
[Render Backend]
  pam-backend.onrender.com
  wheels-wins-backend-staging.onrender.com
     |
     +--------+--------+--------+
     |        |        |        |
 [FastAPI] [Celery] [Redis] [Supabase]
```

---

## Two-System Architecture

### Production System

| Component | URL/Service |
|-----------|-------------|
| Frontend | wheelsandwins.com (Netlify main) |
| Backend | pam-backend.onrender.com |
| Redis | pam-redis.onrender.com |
| Celery Worker | pam-celery-worker.onrender.com |
| Celery Beat | pam-celery-beat.onrender.com |
| Database | Supabase (shared) |

### Staging System

| Component | URL/Service |
|-----------|-------------|
| Frontend | wheels-wins-staging.netlify.app |
| Backend | wheels-wins-backend-staging.onrender.com |
| Celery Worker | wheels-wins-celery-worker-staging.onrender.com |
| Database | Supabase (shared) |

**CRITICAL:** Each frontend MUST point to its corresponding backend!

---

## Frontend Deployment (Netlify)

### Configuration File

```toml
# netlify.toml

[build]
  publish = "dist"
  command = "npm run build:netlify"

[build.environment]
  NODE_VERSION = "20"
```

### Environment Contexts

**Production (main branch):**

```toml
[context.production]
  [context.production.environment]
    VITE_BACKEND_URL = "https://pam-backend.onrender.com"
    VITE_API_URL = "https://pam-backend.onrender.com"
    VITE_PAM_WEBSOCKET_URL = "wss://pam-backend.onrender.com/api/v1/pam/ws"
    VITE_ENVIRONMENT = "production"
```

**Staging (staging branch):**

```toml
[context.staging]
  [context.staging.environment]
    VITE_BACKEND_URL = "https://wheels-wins-backend-staging.onrender.com"
    VITE_API_URL = "https://wheels-wins-backend-staging.onrender.com"
    VITE_PAM_WEBSOCKET_URL = "wss://wheels-wins-backend-staging.onrender.com/api/v1/pam/ws"
    VITE_ENVIRONMENT = "staging"
```

**Deploy Previews (PRs):**

```toml
[context.deploy-preview]
  [context.deploy-preview.environment]
    VITE_BACKEND_URL = "https://wheels-wins-backend-staging.onrender.com"
    VITE_ENVIRONMENT = "preview"
```

### SPA Routing

```toml
# Serve static assets directly
[[redirects]]
  from = "/assets/*"
  to = "/assets/:splat"
  status = 200

# SPA fallback - all routes to index.html
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
  force = false
```

### Security Headers

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Content-Security-Policy = "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; img-src 'self' https: data: blob:; font-src 'self' https: data:; connect-src 'self' https: wss: data: blob: wss://pam-backend.onrender.com wss://wheels-wins-backend-staging.onrender.com;"
    Permissions-Policy = "camera=(), microphone=(self), geolocation=(self), interest-cohort=()"
```

### Cache Headers

```toml
# Long cache for immutable assets
[[headers]]
  for = "/*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.woff2"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

# Shorter cache for images
[[headers]]
  for = "/images/*"
  [headers.values]
    Cache-Control = "public, max-age=86400, must-revalidate"
```

### Deploy Commands

```bash
# Manual deploy (staging)
git push origin staging

# Manual deploy (production)
git checkout main
git merge staging
git push origin main

# Trigger rebuild without code changes
# Add empty commit or use Netlify dashboard
```

---

## Backend Deployment (Render)

### Configuration File

```yaml
# render.yaml

services:
  - name: pam-backend
    type: web
    env: docker
    dockerfilePath: ./Dockerfile
    dockerContext: .
    plan: free
    autoDeploy: true
    healthCheckPath: /health
    envVars:
      - fromGroup: wheels-env

  - name: pam-celery
    type: worker
    env: docker
    dockerfilePath: ./Dockerfile
    dockerContext: .
    plan: free
    autoDeploy: true
    startCommand: celery -A app.workers.celery worker --loglevel=INFO
    envVars:
      - fromGroup: wheels-env
```

### Dockerfile

```dockerfile
# Dockerfile

FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Set working directory to backend
WORKDIR /app/backend

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Start command
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Variables (Render)

**Required:**

```bash
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
ANTHROPIC_API_KEY=sk-ant-xxx
SECRET_KEY=xxx
```

**Optional:**

```bash
REDIS_URL=redis://...
OPENAI_API_KEY=sk-xxx
GEMINI_API_KEY=xxx
TTS_ENABLED=true
CORS_ORIGINS=https://wheelsandwins.com,https://wheels-wins-staging.netlify.app
```

### Render Services

| Service | Type | Purpose |
|---------|------|---------|
| pam-backend | Web | Main FastAPI application |
| pam-celery | Worker | Background task processing |
| pam-redis | Redis | Caching and message broker |

### Health Checks

```python
# Backend health endpoint
@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}
```

Render uses `/health` endpoint to verify service health.

---

## Environment Variables

### Frontend (.env)

```bash
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx

# Mapbox
VITE_MAPBOX_TOKEN=pk.xxx

# Backend
VITE_BACKEND_URL=https://pam-backend.onrender.com
VITE_API_URL=https://pam-backend.onrender.com
VITE_PAM_WEBSOCKET_URL=wss://pam-backend.onrender.com/api/v1/pam/ws

# Environment
VITE_ENVIRONMENT=production
```

### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx

# AI Providers
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx
GEMINI_API_KEY=xxx

# Security
SECRET_KEY=xxx
JWT_SECRET=xxx

# Features
TTS_ENABLED=true
REDIS_URL=redis://localhost:6379

# CORS
CORS_ORIGINS=https://wheelsandwins.com,https://wheels-wins-staging.netlify.app,http://localhost:8080

# Environment
NODE_ENV=production
DEBUG=false
```

---

## Deployment Workflow

### Git Branching Strategy

```
main (production)
  |
  +-- staging (staging environment)
        |
        +-- feature/* (feature branches)
        +-- fix/* (bug fixes)
```

### Standard Deployment Process

1. **Create feature branch**
   ```bash
   git checkout staging
   git pull origin staging
   git checkout -b feature/new-feature
   ```

2. **Develop and test locally**
   ```bash
   npm run dev
   npm run test
   npm run type-check
   ```

3. **Push to staging**
   ```bash
   git push origin feature/new-feature
   # Create PR to staging
   # Merge after review
   ```

4. **Test on staging environment**
   - Visit wheels-wins-staging.netlify.app
   - Verify all features work
   - Check backend health

5. **Deploy to production**
   ```bash
   git checkout main
   git merge staging
   git push origin main
   ```

### Branch Protection

- **Protected branches:** main, staging
- **Required:** Pull requests for all changes
- **Required:** Approval before merge
- **No direct pushes** to protected branches

---

## CI/CD Pipeline

### Quality Gates

```bash
# Run before every commit
npm run quality:check:full
npm run type-check
npm run lint
npm run test
```

### Pre-Deploy Checklist

- [ ] All tests pass
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Quality checks pass
- [ ] Tested on staging
- [ ] No console errors
- [ ] No security vulnerabilities

---

## Monitoring

### Health Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/health` | Basic health check |
| `/health/ping` | Quick ping |
| `/health/pam` | PAM-specific health |
| `/health/detailed` | Comprehensive status |
| `/health/ready` | Readiness probe |
| `/health/live` | Liveness probe |
| `/health/redis` | Redis connection |
| `/health/all` | All checks combined |

### Checking Service Status

```bash
# Check production backend
curl https://pam-backend.onrender.com/health

# Check staging backend
curl https://wheels-wins-backend-staging.onrender.com/health

# Detailed health check
curl https://pam-backend.onrender.com/health/detailed
```

### Logging

- **Backend logs:** Render dashboard or `render logs` CLI
- **Frontend errors:** Browser console, Sentry
- **Database:** Supabase dashboard logs

---

## Rollback Procedures

### Frontend Rollback (Netlify)

1. Go to Netlify dashboard
2. Navigate to "Deploys"
3. Find last working deploy
4. Click "Publish deploy"

### Backend Rollback (Render)

1. Go to Render dashboard
2. Navigate to service
3. Click "Rollback"
4. Select previous working deploy

### Git Rollback

```bash
# Find last working commit
git log --oneline

# Revert specific commit
git revert <commit-hash>
git push origin main

# Force rollback (use with caution)
git reset --hard <commit-hash>
git push --force origin main
```

---

## Scaling Considerations

### Current Setup (Free Tier)

| Service | Resources |
|---------|-----------|
| Netlify | 100 GB/month bandwidth |
| Render | 512 MB RAM, auto-sleep |
| Supabase | 500 MB storage, 2 GB bandwidth |

### Production Setup (Paid)

| Service | Resources |
|---------|-----------|
| Netlify Pro | Unlimited bandwidth, analytics |
| Render Starter | 2 GB RAM, always-on, 4 workers |
| Supabase Pro | 8 GB storage, 50 GB bandwidth |

### Future Scaling

```
[Horizontal Scaling]
- Multiple Render instances
- Load balancer
- Redis cluster
- Read replicas

[Edge Computing]
- Netlify Edge Functions
- Geographic distribution
- Reduced latency
```

---

## Troubleshooting

### Common Issues

**1. Frontend shows wrong backend URL**

Check netlify.toml environment context matches branch.

**2. CORS errors**

Verify CORS_ORIGINS in backend includes frontend URL.

**3. WebSocket connection fails**

```bash
# Check WebSocket URL in browser
wss://pam-backend.onrender.com/api/v1/pam/ws/${userId}?token=${token}
```

**4. Backend cold start (Render free tier)**

First request after sleep takes 30-60 seconds. Consider upgrading to always-on.

**5. Environment variable not found**

Ensure variable is set in correct environment (staging vs production).

### Debug Commands

```bash
# Check Netlify deploy logs
netlify deploy --build

# Check Render logs
render logs pam-backend

# Test backend locally
cd backend
uvicorn app.main:app --reload --port 8000
```

---

## Quick Reference

### URLs

| Environment | Frontend | Backend |
|-------------|----------|---------|
| Production | wheelsandwins.com | pam-backend.onrender.com |
| Staging | wheels-wins-staging.netlify.app | wheels-wins-backend-staging.onrender.com |
| Development | localhost:8080 | localhost:8000 |

### Deploy Commands

```bash
# Deploy to staging
git push origin staging

# Deploy to production
git checkout main && git merge staging && git push origin main

# Local development
npm run dev        # Frontend
uvicorn app.main:app --reload  # Backend
```

### Configuration Files

| Purpose | File |
|---------|------|
| Frontend deploy | netlify.toml |
| Backend deploy | render.yaml |
| Docker build | Dockerfile |
| Environment | .env, .env.local |
