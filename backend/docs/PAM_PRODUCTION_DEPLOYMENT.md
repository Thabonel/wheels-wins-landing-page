# PAM Production Deployment Guide

## Overview

This guide covers the production deployment setup for the PAM (Personal Assistant Manager) proactive autonomous agent system with Redis and Celery workers.

## Architecture

### Production Infrastructure

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │ Celery Workers  │
│ (Netlify)       │───▶│  (Render)       │───▶│   (Render)      │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │ Supabase DB     │    │ Redis Queue     │
                       │ (PostgreSQL)    │    │  (Render)       │
                       └─────────────────┘    └─────────────────┘
```

### Service Components

1. **Frontend**: React app on Netlify
2. **Backend API**: FastAPI on Render
3. **Celery Workers**: Background task processing on Render
4. **Celery Beat**: Task scheduler on Render
5. **Redis**: Task queue and cache on Render
6. **PostgreSQL**: Database on Supabase

## PAM Proactive Tasks

### Task Schedule

| Task | Frequency | Queue | Purpose |
|------|-----------|-------|---------|
| Fuel Monitoring | 5 minutes | notifications | Monitor fuel levels, trigger low fuel alerts |
| Budget Analysis | 1 hour | analytics | Analyze spending, trigger budget threshold alerts |
| Weather Monitoring | 30 minutes | analytics | Monitor weather windows for travel |
| Maintenance Monitoring | Daily | maintenance | Check vehicle maintenance schedules |
| Context Monitoring | 15 minutes | notifications | Monitor user context for proactive suggestions |

### Task Implementation

**File**: `backend/app/workers/tasks/pam_proactive_tasks.py`

**Key Features**:
- Async/await pattern for database operations
- Comprehensive error handling and retries
- Structured logging
- Integration with PAM event system
- Queue-based routing

## Render Configuration

### Production Services (`render.backend.yaml`)

```yaml
services:
  # Main API Service
  - type: web
    name: pam-backend
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT

  # Redis Service
  - type: redis
    name: pam-redis
    plan: free

  # Celery Worker
  - type: worker
    name: pam-celery-worker
    startCommand: celery -A app.workers.celery worker --loglevel=info --concurrency=4

  # Celery Beat Scheduler
  - type: worker
    name: pam-celery-beat
    startCommand: celery -A app.workers.celery beat --loglevel=info
```

### Environment Variables

**Required for all services**:
```bash
# Core Configuration
ENVIRONMENT=production
REDIS_URL=redis://...  # Auto-provided by Render Redis service
CELERY_BROKER_URL=redis://...
CELERY_RESULT_BACKEND=redis://...

# AI APIs (PAM functionality)
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...

# Database
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...

# Security
SECRET_KEY=...
```

## Deployment Process

### 1. Staging Deployment

Deploy to staging first for testing:

```bash
git push origin staging
```

This triggers deployment to:
- Frontend: `wheels-wins-staging.netlify.app`
- Backend: `wheels-wins-backend-staging.onrender.com`

### 2. Production Deployment

After staging validation:

```bash
git checkout main
git merge staging
git push origin main
```

This triggers deployment to:
- Frontend: `wheelsandwins.com`
- Backend: `pam-backend.onrender.com`

### 3. Verification

**Check services are running**:
1. API health: `GET /api/health`
2. Celery workers: Render dashboard logs
3. Redis connectivity: Check worker logs
4. Scheduled tasks: Monitor PAM WebSocket events

## Monitoring

### Health Checks

- **API**: `/api/health` endpoint
- **Workers**: Celery worker heartbeats in logs
- **Redis**: Connection status in worker logs
- **Tasks**: Task execution logs and PAM event triggers

### Logging

**Key log sources**:
- Render API service logs
- Celery worker logs
- Celery beat scheduler logs
- PAM event manager logs

### Metrics

Monitor these key metrics:
- Task execution frequency
- Task success/failure rates
- Queue depth
- Memory usage
- Response times

## Troubleshooting

### Common Issues

**1. Redis Connection Errors**
```bash
# Check REDIS_URL environment variable
echo $REDIS_URL
```

**2. Task Not Running**
```bash
# Check Celery Beat logs for schedule
celery -A app.workers.celery inspect scheduled
```

**3. Import Errors**
```bash
# Verify PYTHONPATH
echo $PYTHONPATH
```

### Debug Commands

**Check active tasks**:
```bash
celery -A app.workers.celery inspect active
```

**Check scheduled tasks**:
```bash
celery -A app.workers.celery inspect scheduled
```

**Manual task execution**:
```bash
celery -A app.workers.celery call app.workers.tasks.pam_proactive_tasks.check_fuel_levels_for_all_users
```

## Security Considerations

### Environment Variables

- Never commit API keys to version control
- Use Render dashboard to set sensitive variables
- Enable auto-generation for SECRET_KEY

### Redis Security

- Render Redis includes authentication
- No public IP access (internal only)
- Connection string includes auth token

### API Security

- Rate limiting enabled
- CORS properly configured
- JWT token validation

## Scaling

### Horizontal Scaling

**Celery Workers**: Increase `concurrency` parameter
```yaml
startCommand: celery -A app.workers.celery worker --concurrency=8
```

**Multiple Workers**: Deploy additional worker services
```yaml
- type: worker
  name: pam-celery-worker-2
  # Same configuration
```

### Vertical Scaling

**Render Plans**:
- Free: 512MB RAM, 0.1 CPU
- Starter: 1GB RAM, 0.5 CPU
- Standard: 2GB RAM, 1 CPU

### Queue Management

**Separate queues by priority**:
- `notifications`: High priority, real-time alerts
- `analytics`: Medium priority, hourly analysis
- `maintenance`: Low priority, background processing

## Development vs Production

### Local Development

```bash
# Terminal 1: Redis
redis-server

# Terminal 2: Celery Worker
celery -A app.workers.celery worker --loglevel=debug

# Terminal 3: Celery Beat
celery -A app.workers.celery beat --loglevel=debug

# Terminal 4: API Server
uvicorn app.main:app --reload
```

### Production

All services managed by Render with:
- Auto-restart on failure
- Resource monitoring
- Distributed across availability zones
- SSL/TLS termination

## Cost Optimization

### Render Resources

- **Free Tier**: Redis, Worker, Beat (sufficient for MVP)
- **Paid Tier**: Required for high availability and scaling

### Task Optimization

- Reduce unnecessary API calls
- Cache frequently accessed data
- Optimize database queries
- Use connection pooling

### Monitoring Costs

- Monitor task execution frequency
- Adjust schedules based on user activity
- Scale workers based on queue depth

## Backup and Recovery

### Database

Supabase handles automated backups and point-in-time recovery.

### Redis

Redis is used as a message queue (ephemeral data):
- Task results expire automatically
- No persistent data requiring backup
- Workers can recover from temporary Redis outages

### Configuration

Store deployment configurations in version control:
- `render.backend.yaml` (production)
- `render-staging.yaml` (staging)
- Environment variable documentation

## Next Steps

1. **Monitoring**: Set up Sentry for error tracking
2. **Alerting**: Configure Slack/email alerts for failures
3. **Analytics**: Track task performance metrics
4. **Auto-scaling**: Implement queue-based worker scaling
5. **Multi-region**: Deploy workers in multiple regions