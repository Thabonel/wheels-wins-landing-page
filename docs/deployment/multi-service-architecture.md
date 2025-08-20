# Multi-Service Deployment Architecture

## Overview

Wheels & Wins uses a sophisticated multi-service deployment architecture across three primary platforms: Netlify (frontend), Render (backend services), and Supabase (database & auth). This document provides comprehensive details of the actual production deployment setup.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          🌐 Production Architecture                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────────────────────────────────────────┐
│   Netlify CDN   │    │                Render Services                      │
│                 │    │                                                     │
│ Frontend App    │    │  ┌─────────────────┐  ┌─────────────────────────┐   │
│ • React/TS      │◄──►│  │   pam-backend   │  │      pam-redis          │   │
│ • Global CDN    │    │  │   (Web Service) │◄─┤     (Redis Service)     │   │
│ • Auto Deploy   │    │  │                 │  │                         │   │
│ • Edge Funcs    │    │  │ • FastAPI       │  │ • Cache Storage         │   │
│                 │    │  │ • WebSocket     │  │ • Session Management    │   │
└─────────────────┘    │  │ • REST API      │  │ • Task Queue            │   │
                       │  │ • Health Check  │  └─────────────────────────┘   │
┌─────────────────┐    │  └─────────────────┘                              │
│  Supabase Cloud │    │                                                     │
│                 │    │  ┌─────────────────┐  ┌─────────────────────────┐   │
│ • PostgreSQL    │◄───┤  │ pam-celery-     │  │   pam-celery-beat       │   │
│ • Auth System   │    │  │ worker          │  │   (Scheduler)           │   │
│ • Real-time     │    │  │ (Background)    │  │                         │   │
│ • Row Level Sec │    │  │                 │  │ • Periodic Tasks        │   │
│ • Edge Functions│    │  │ • Task Processing│  │ • Cleanup Jobs         │   │
└─────────────────┘    │  │ • Email Queue   │  │ • Analytics Updates     │   │
                       │  │ • Analytics     │  │ • Health Monitoring     │   │
                       │  └─────────────────┘  └─────────────────────────┘   │
                       └─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        🔄 Service Communication Flow                        │
└─────────────────────────────────────────────────────────────────────────────┘

Frontend (Netlify) ──HTTP/WebSocket──► Backend (pam-backend)
                                           │
                                           ├──Redis──► Cache & Tasks
                                           │
                                           ├──PostgreSQL──► Supabase
                                           │
                                           └──Task Queue──► Celery Workers
```

## Service Specifications

### 1. Frontend Service (Netlify)

**Service Type**: Static Site with CDN
**Platform**: Netlify
**Repository**: Connected to GitHub main branch

```toml
# netlify.toml
[build]
  publish = "dist"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "18"
  SECRETS_SCAN_OMIT_KEYS = "VITE_SUPABASE_ANON_KEY,VITE_MAPBOX_PUBLIC_TOKEN"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

**Key Features**:
- Global CDN distribution
- Automatic deployments from main branch
- Environment variable management
- Security headers enforcement
- SPA routing support

### 2. Backend Services (Render)

The project uses **dual backend architecture** for complete environment isolation:

#### Production Backend Service (pam-backend)

**Service Type**: Web Service
**Runtime**: Python 3.11
**Plan**: Paid tier (always running)
**Auto-deploy**: Enabled from `main` branch
**Environment**: Production

**Service URL**: `https://pam-backend.onrender.com`
**Purpose**: Live production API for `wheelsandwins.com`
**Database**: Production Supabase project
**Status**: ⚠️ Recently had initialization issues - requires environment variable sync
**Critical Variables**: Requires 5 initialization variables (see Environment Configuration)

**Known Issues**:
- Missing 5 critical environment variables causes "no running event loop" errors
- CORS_ORIGINS missing staging domain causes cross-origin request failures
- When broken, frontend automatically falls back to staging backend

```yaml
# render.backend.yaml - Production Service
services:
  - type: web
    name: pam-backend
    env: python
    plan: paid
    runtime: python-3.11
    rootDir: backend
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    healthCheckPath: /api/health
    autoDeploy: true
    branch: main  # Deploys from main branch
```

#### Staging Backend Service (wheels-wins-backend-staging)

**Service Type**: Web Service  
**Runtime**: Python 3.11
**Plan**: Free tier (can sleep)
**Auto-deploy**: Enabled from `staging` branch
**Environment**: Staging

**Service URL**: `https://wheels-wins-backend-staging.onrender.com`
**Purpose**: Testing backend changes for `wheels-wins-staging.netlify.app`
**Database**: Staging Supabase project
**Status**: ✅ Working and stable - used as primary backend in frontend fallback chain
**Critical Variables**: Same 5 initialization variables with staging values

**Health Check Example**:
```bash
curl https://wheels-wins-backend-staging.onrender.com/health
# Returns: {"status": "healthy", "services": {...}}
```

```yaml
# render.staging.yaml - Staging Service  
services:
  - type: web
    name: wheels-wins-backend-staging
    env: python
    plan: free
    runtime: python-3.11
    rootDir: backend
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    healthCheckPath: /api/health
    autoDeploy: true
    branch: staging  # Deploys from staging branch
```

### Backend Service Comparison

| Feature | Production Backend | Staging Backend |
|---------|-------------------|-----------------|
| **Service Name** | `pam-backend` | `wheels-wins-backend-staging` |
| **URL** | `pam-backend.onrender.com` | `wheels-wins-backend-staging.onrender.com` |
| **Git Branch** | `main` | `staging` |
| **Plan** | Paid (always running) | Free (can sleep) |
| **Database** | Production Supabase | Staging Supabase |
| **Purpose** | Live user traffic | Testing & development |
| **Stability** | Must be 100% stable | Can have experimental features |
| **Current Status** | ⚠️ Recently unstable (env vars) | ✅ Working and stable |
| **Frontend Priority** | Primary (when healthy) | Fallback (currently primary) |

**Key Features (Both Services)**:
- FastAPI application server
- WebSocket support for PAM
- REST API endpoints  
- Health monitoring
- Automatic scaling
- Multi-engine TTS/STT support

**Resource Allocation**:
- **Production**: CPU: Dedicated, Memory: 1GB+, Always running
- **Staging**: CPU: Shared, Memory: 512MB, Can sleep when idle

### Backend Failover System

The frontend implements intelligent backend failover to ensure PAM functionality remains available:

#### Failover Priority Chain
```typescript
// Frontend backend priority (src/services/pamConnectionService.ts)
const backends = [
  'https://wheels-wins-backend-staging.onrender.com',  // Primary (stable)
  import.meta.env.VITE_BACKEND_URL,                    // Environment override
  import.meta.env.VITE_API_URL,                        // Legacy override
  'https://pam-backend.onrender.com'                   // Production (when healthy)
];
```

#### How Failover Works
1. **Health Check**: Frontend checks `/health` endpoint of each backend
2. **Automatic Switching**: If primary fails, automatically tries next backend
3. **Wake-Up Logic**: Attempts to wake sleeping Free tier services
4. **Connection Monitoring**: Continuous health monitoring every 30 seconds
5. **Retry Logic**: Exponential backoff with maximum 1-minute delay

#### Backend Health Indicators
```json
// Healthy Backend Response
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "redis": "connected", 
    "openai": "available",
    "tts": "operational"
  },
  "version": "2.0.3"
}

// Unhealthy Backend (Missing Environment Variables)
{
  "status": "degraded",
  "error": "PAMServiceError: Failed to initialize AI service: no running event loop"
}
```

#### Current Status (August 2025)
- **Primary**: `wheels-wins-backend-staging.onrender.com` (✅ Stable)
- **Secondary**: `pam-backend.onrender.com` (⚠️ Recently synchronized from staging)

#### Redis Service (pam-redis)

**Service Type**: Redis Database
**Plan**: Free tier
**Access**: Private network only

```yaml
  - type: redis
    name: pam-redis
    plan: free
    ipAllowList: []
```

**Usage**:
- Session storage
- API response caching
- Task queue for Celery
- Real-time data caching
- WebSocket connection management

**Resource Allocation**:
- Memory: 25MB (Free tier)
- Max Connections: 30
- Persistence: Disabled (Free tier)

#### Background Worker (pam-celery-worker)

**Service Type**: Background Worker
**Runtime**: Python 3.11
**Scaling**: Auto-scale based on queue depth

```yaml
  - type: worker
    name: pam-celery-worker
    env: python
    runtime: python-3.11
    rootDir: backend
    buildCommand: pip install -r requirements.txt
    startCommand: celery -A app.workers.celery worker --loglevel=info
    autoDeploy: true
```

**Responsibilities**:
- Email processing and delivery
- Background analytics calculations
- File processing (uploads, conversions)
- External API integrations
- Data cleanup and maintenance

#### Task Scheduler (pam-celery-beat)

**Service Type**: Background Worker
**Runtime**: Python 3.11
**Purpose**: Periodic task scheduling

```yaml
  - type: worker
    name: pam-celery-beat
    env: python
    runtime: python-3.11
    rootDir: backend
    buildCommand: pip install -r requirements.txt
    startCommand: celery -A app.workers.celery beat --loglevel=info
    autoDeploy: true
```

**Scheduled Tasks**:
- Daily analytics aggregation
- Weekly user engagement reports
- Monthly subscription processing
- System health checks (every 5 minutes)
- Database cleanup (daily)
- Cache expiration management

### 3. Database Service (Supabase)

**Service**: Managed PostgreSQL
**Plan**: Free tier (upgradeable)
**Region**: US East Coast
**Features**: Real-time subscriptions, Row Level Security, Edge Functions

**Database Configuration**:
- **PostgreSQL Version**: 15
- **Max Connections**: 60 (Free tier)
- **Storage**: 500MB (Free tier)
- **Bandwidth**: 1GB/month (Free tier)

**Key Features**:
- Row Level Security (RLS) policies
- Real-time subscriptions via WebSocket
- Automatic backups
- Connection pooling
- Edge functions for serverless compute

## Environment Configuration

### Service Environment Variables

All services share common environment variables but with service-specific access patterns:

#### Frontend (Netlify)
```bash
# Public variables (prefixed with VITE_)
VITE_SUPABASE_URL=https://project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_BACKEND_URL=https://pam-backend.onrender.com
VITE_PAM_WEBSOCKET_URL=wss://pam-backend.onrender.com/api/v1/pam/ws
VITE_MAPBOX_PUBLIC_TOKEN=pk.eyJ...
VITE_SENTRY_DSN=https://...@sentry.io/...
```

#### Backend Services (All)
```bash
# Core configuration
ENVIRONMENT=production  # Use "staging" for staging backend
SECRET_KEY=<auto-generated-by-render>
OPENAI_API_KEY=<sync-from-dashboard>
SUPABASE_URL=https://project.supabase.co
SUPABASE_KEY=<service-role-key>
SUPABASE_ANON_KEY=<anon-key>

# CRITICAL: 5 Required Initialization Variables
# Missing any of these causes "no running event loop" errors
APP_URL=https://pam-backend.onrender.com  # Service URL
DEBUG=false  # true for staging, false for production  
NODE_ENV=production  # staging for staging, production for production
ENVIRONMENT=production  # staging for staging, production for production
VITE_USE_AI_SDK_PAM=true  # Enables PAM AI service

# Redis connection (auto-injected by Render)
REDIS_URL=redis://pam-redis:6379

# Security & CORS - MUST include both domains
CORS_ORIGINS=https://wheelsandwins.com,https://wheels-wins-landing-page.netlify.app,https://wheels-wins-staging.netlify.app

# Optional services
SENTRY_DSN=<monitoring-dsn>
LANGCHAIN_TRACING_V2=disabled
```

**⚠️ Critical Environment Variable Requirements:**
- **Production Backend**: Must have all 5 initialization variables with production values
- **Staging Backend**: Must have all 5 initialization variables with staging values  
- **CORS_ORIGINS**: Must include both production and staging frontend domains
- **Missing Variables**: Causes backend to fail initialization with event loop errors

### Variable Synchronization

Render provides variable synchronization across services:
- `sync: false` - Manually managed per service
- `generateValue: true` - Auto-generated secrets
- `fromService` - Injected from dependent services

## Deployment Pipeline

### Automated Deployment Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Git Push to   │    │   Build &       │    │   Deploy to     │
│   main branch   │───►│   Test          │───►│   Production    │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ GitHub Actions  │    │ Service Builds  │    │ Health Checks   │
│ • Run tests     │    │ • Frontend      │    │ • API Status    │
│ • Type check    │    │ • Backend       │    │ • WebSocket     │
│ • Security scan │    │ • Workers       │    │ • Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Frontend Deployment (Netlify)

1. **Trigger**: Push to main branch
2. **Build**: `npm run build` with environment variables
3. **Deploy**: Static files to global CDN
4. **Validation**: Health check endpoints
5. **Rollback**: Automatic on build failure

**Build Process**:
```bash
npm install
npm run type-check
npm run lint
npm run test:coverage
npm run build
```

### Backend Deployment (Render)

1. **Trigger**: Changes in `backend/` directory
2. **Build**: `pip install -r requirements.txt`
3. **Deploy**: All services simultaneously
4. **Health Check**: `/api/health` endpoint
5. **Service Mesh**: Internal service discovery

**Service Dependencies**:
- `pam-backend` ← depends on → `pam-redis`
- `pam-celery-worker` ← depends on → `pam-redis`
- `pam-celery-beat` ← depends on → `pam-redis`

## Monitoring & Observability

### Health Monitoring

Each service provides comprehensive health endpoints:

#### Frontend Health
- **Endpoint**: CDN availability monitoring
- **Metrics**: Page load times, CDN hit rates
- **Alerts**: 4xx/5xx error rates

#### Backend Health
- **Endpoint**: `GET /api/health`
- **Response**: Service status, database connectivity, Redis status
- **Monitoring**: Response time, error rates, dependency health

```json
{
  "status": "healthy",
  "timestamp": "2025-01-29T12:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected", 
    "openai": "available",
    "tts": "operational"
  },
  "version": "2.0.3"
}
```

#### Worker Health
- **Endpoint**: Celery monitoring dashboard
- **Metrics**: Task completion rates, queue depth, worker status
- **Alerts**: Failed tasks, queue backlog

### Performance Monitoring

**Frontend (Netlify)**:
- Core Web Vitals monitoring
- Bundle size tracking
- CDN performance metrics
- User experience monitoring

**Backend (Render)**:
- Response time monitoring
- Database query performance
- Memory and CPU usage
- WebSocket connection metrics

**Database (Supabase)**:
- Query performance analysis
- Connection pool utilization
- Storage usage monitoring
- Real-time subscription metrics

## Scaling Strategy

### Auto-Scaling Configuration

**Frontend**: Automatic CDN scaling globally
**Backend**: Vertical scaling on Render (manual upgrade)
**Workers**: Horizontal scaling based on queue depth
**Database**: Connection pooling and read replicas

### Performance Optimization

1. **Frontend Caching**:
   - Static asset caching (1 year)
   - API response caching (5 minutes)
   - Service worker offline caching

2. **Backend Optimization**:
   - Redis caching for frequent queries
   - Database connection pooling
   - Celery task queuing for heavy operations

3. **Database Optimization**:
   - Indexed queries for common operations
   - Row Level Security for data isolation
   - Connection pooling for concurrent access

## Disaster Recovery

### Backup Strategy

**Database**: Automatic daily backups via Supabase
**Redis**: Memory-only (acceptable data loss)
**Application Code**: Git repository (GitHub)
**Environment Variables**: Documented and backed up

### Recovery Procedures

1. **Service Outage**: Automatic restart and health checks
2. **Data Loss**: Restore from Supabase backups
3. **Complete Failure**: Redeploy from Git repository
4. **Configuration Loss**: Restore from documented variables

### Monitoring & Alerting

**Error Tracking**: Sentry integration across all services
**Uptime Monitoring**: Render built-in monitoring
**Performance Alerts**: Custom alerts for response times
**Security Monitoring**: Automated security scanning

---

This multi-service architecture provides high availability, scalability, and maintainability while keeping costs low during development and early production phases. The architecture can scale horizontally by upgrading Render plans and adding additional worker instances as needed.