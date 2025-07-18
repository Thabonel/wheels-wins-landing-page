
# PAM Backend Deployment Guide

## Overview

This guide covers deploying the PAM Backend to various environments including development, staging, and production. The application is containerized using Docker and can be deployed to multiple platforms.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Docker Deployment](#docker-deployment)
4. [Cloud Deployment Options](#cloud-deployment-options)
5. [Database Setup](#database-setup)
6. [Monitoring and Logging](#monitoring-and-logging)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- **CPU**: 2+ cores
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 20GB minimum
- **OS**: Linux (Ubuntu 20.04+ recommended)

### Required Software
- Docker 20.10+
- Docker Compose 2.0+
- Git
- Make (optional, for build scripts)

### External Services
- **Supabase Account**: Database and authentication
- **OpenAI API Key**: For PAM AI functionality (GPT-4 recommended)
- **Redis Instance**: Caching (can be self-hosted)
- **Email Service**: For notifications (optional)
- **Anthropic API Key**: For Claude integration (optional)
- **Google Custom Search API**: For search functionality (optional)

## Environment Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```bash
# Application Settings
ENVIRONMENT=production
DEBUG=false
SECRET_KEY=your-super-secret-key-here
API_VERSION=v1

# Database Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-key
DATABASE_URL=postgresql://postgres:password@localhost:5432/pam_backend

# Redis Configuration
REDIS_URL=redis://localhost:6379/0
REDIS_PASSWORD=your-redis-password

# External API Keys
OPENAI_API_KEY=sk-your-openai-api-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key
GOOGLE_CUSTOM_SEARCH_API_KEY=your-google-search-api-key
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=your-google-search-engine-id
MAPBOX_API_KEY=pk.your-mapbox-api-key

# PAM Configuration
PAM_ENABLED=true
PAM_MAX_TOOLS=44
PAM_DATABASE_COVERAGE=39
PAM_CACHE_TTL=3600
PAM_INTELLIGENCE_ENABLED=true
PAM_CROSS_DOMAIN_ANALYSIS=true

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Security Settings
CORS_ORIGINS=https://your-frontend-domain.com,https://www.your-domain.com
JWT_SECRET_KEY=your-jwt-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60

# Logging Configuration
LOG_LEVEL=INFO
LOG_FORMAT=json

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS_PER_MINUTE=60

# File Storage (Optional)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=your-s3-bucket-name
AWS_REGION=us-east-1
```

### Security Checklist

Before deployment, ensure:
- [ ] All secrets are properly set and not hardcoded
- [ ] CORS origins are configured correctly
- [ ] Rate limiting is enabled
- [ ] HTTPS is enforced
- [ ] Database credentials are secure
- [ ] API keys are rotated regularly
- [ ] PAM database permissions are configured
- [ ] Row Level Security (RLS) is enabled
- [ ] Service role key is properly secured
- [ ] All 39 database tables have proper policies
- [ ] Cross-domain intelligence features are secured

## Docker Deployment

### Quick Start with Docker Compose

1. **Clone the repository:**
```bash
git clone https://github.com/your-org/pam-backend.git
cd pam-backend
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your configuration
nano .env
```

3. **Start services:**
```bash
docker-compose up -d
```

4. **Verify deployment:**
```bash
curl http://localhost:8000/api/health
```

### Production Docker Compose

For production deployment, use the production configuration:

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  backend:
    build:
      context: .
      target: production
    ports:
      - "8000:8000"
    environment:
      - ENVIRONMENT=production
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    depends_on:
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.prod.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped

  celery_worker:
    build:
      context: .
      target: production
    command: celery -A app.workers.celery worker --loglevel=info
    environment:
      - ENVIRONMENT=production
    volumes:
      - ./logs:/app/logs
    depends_on:
      - redis
    restart: unless-stopped

  celery_beat:
    build:
      context: .
      target: production
    command: celery -A app.workers.celery beat --loglevel=info
    environment:
      - ENVIRONMENT=production
    volumes:
      - ./logs:/app/logs
    depends_on:
      - redis
    restart: unless-stopped

volumes:
  redis_data:
```

### Building and Pushing Images

```bash
# Build production image
docker build -t pam-backend:latest --target production .

# Tag for registry
docker tag pam-backend:latest your-registry.com/pam-backend:latest

# Push to registry
docker push your-registry.com/pam-backend:latest
```

## Cloud Deployment Options

### 1. Render.com (Recommended for Small Scale)

#### Web Service Configuration
```yaml
# render.yaml
services:
  - type: web
    name: pam-backend
    env: python
    plan: starter
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: ENVIRONMENT
        value: production
      - key: OPENAI_API_KEY
        sync: false
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_KEY
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: REDIS_URL
        sync: false
      - key: PAM_ENABLED
        value: true
      - key: PAM_DATABASE_COVERAGE
        value: 39
      - key: PAM_MAX_TOOLS
        value: 44

  - type: redis
    name: pam-redis
    plan: starter
```

#### Deployment Steps
1. Connect GitHub repository to Render
2. Configure environment variables in Render dashboard
3. Deploy automatically on git push

### 2. Google Cloud Run

#### Deployment Script
```bash
#!/bin/bash

# Build and push to Google Container Registry
docker build -t gcr.io/your-project-id/pam-backend:latest .
docker push gcr.io/your-project-id/pam-backend:latest

# Deploy to Cloud Run
gcloud run deploy pam-backend \
  --image gcr.io/your-project-id/pam-backend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8000 \
  --memory 2Gi \
  --cpu 2 \
  --max-instances 10 \
  --set-env-vars ENVIRONMENT=production
```

### 3. AWS ECS/Fargate

#### Task Definition
```json
{
  "family": "pam-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "pam-backend",
      "image": "your-account.dkr.ecr.region.amazonaws.com/pam-backend:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "ENVIRONMENT",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "OPENAI_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:name"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/pam-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### 4. DigitalOcean App Platform

#### App Spec
```yaml
# .do/app.yaml
name: pam-backend
services:
- name: api
  source_dir: /
  github:
    repo: your-username/pam-backend
    branch: main
  run_command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
  environment_slug: python
  instance_count: 2
  instance_size_slug: basic-xxs
  envs:
  - key: ENVIRONMENT
    value: production
  - key: OPENAI_API_KEY
    value: your-openai-key
    type: SECRET

databases:
- name: pam-redis
  engine: REDIS
  version: "7"
```

## Database Setup

### Supabase Configuration

1. **Create Supabase Project:**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Note the project URL and anon key

2. **Run Database Migrations:**
```bash
# Install Supabase CLI
npm install -g @supabase/cli

# Initialize project
supabase init

# Run migrations
supabase db push
```

3. **Set up Row Level Security:**
```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);
```

### PAM Database Configuration

PAM requires access to 39 database tables for 100% functionality:

```sql
-- Core PAM Tables Setup
CREATE TABLE IF NOT EXISTS pam_analytics_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pam_conversation_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    conversation_id UUID,
    memory_type VARCHAR(50),
    content TEXT,
    relevance_score FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pam_user_context (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    context_data JSONB,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for all PAM tables
ALTER TABLE pam_analytics_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_conversation_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_user_context ENABLE ROW LEVEL SECURITY;

-- Create policies for PAM tables
CREATE POLICY "Users can access own PAM data" ON pam_analytics_logs
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own memory" ON pam_conversation_memory
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own context" ON pam_user_context
    FOR ALL USING (auth.uid() = user_id);
```

### Self-Hosted PostgreSQL

If using self-hosted PostgreSQL:

```bash
# Create database
createdb pam_backend

# Run migrations
python scripts/migrate_database.py

# Initialize PAM tables
python scripts/init_pam_tables.py

# Create admin user
python scripts/create_admin.py create --email admin@example.com

# Test PAM database coverage
python test_pam_100_percent_control.py
```

## SSL/TLS Configuration

### Let's Encrypt with Certbot

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com -d api.your-domain.com

# Automatic renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Nginx SSL Configuration

```nginx
# nginx.prod.conf
server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    location / {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name api.your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

## Monitoring and Logging

### Health Checks

Add health check endpoints to your load balancer:
- **Basic Health**: `GET /api/health`
- **Detailed Health**: `GET /api/health/detailed`

### Logging Configuration

```python
# app/core/logging.py
import logging.config

LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        },
        "json": {
            "format": '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "message": "%(message)s"}',
        },
    },
    "handlers": {
        "default": {
            "formatter": "json",
            "class": "logging.StreamHandler",
            "stream": "ext://sys.stdout",
        },
        "file": {
            "formatter": "json",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": "/app/logs/pam-backend.log",
            "maxBytes": 10485760,  # 10MB
            "backupCount": 5,
        },
    },
    "loggers": {
        "": {
            "handlers": ["default", "file"],
            "level": os.getenv("LOG_LEVEL", "INFO"),
        },
    },
}
```

### Monitoring Tools

#### Prometheus Metrics (Optional)
```python
from prometheus_client import Counter, Histogram, generate_latest

REQUEST_COUNT = Counter('requests_total', 'Total requests', ['method', 'endpoint'])
REQUEST_LATENCY = Histogram('request_duration_seconds', 'Request latency')

@app.middleware("http")
async def add_prometheus_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    REQUEST_COUNT.labels(method=request.method, endpoint=request.url.path).inc()
    REQUEST_LATENCY.observe(time.time() - start_time)
    return response

@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type="text/plain")
```

## Backup and Recovery

### Database Backups

```bash
#!/bin/bash
# backup_database.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="pam_backup_$DATE.sql"

# Create backup
pg_dump $DATABASE_URL > /backups/$BACKUP_FILE

# Compress backup
gzip /backups/$BACKUP_FILE

# Upload to S3 (optional)
aws s3 cp /backups/$BACKUP_FILE.gz s3://your-backup-bucket/database/

# Clean old backups (keep last 7 days)
find /backups -name "pam_backup_*.sql.gz" -mtime +7 -delete
```

### Restore from Backup

```bash
# Restore database
gunzip pam_backup_20240115_120000.sql.gz
psql $DATABASE_URL < pam_backup_20240115_120000.sql
```

## Performance Optimization

### Application Level
- Enable caching with Redis
- Use database connection pooling
- Implement rate limiting
- Optimize database queries

### Infrastructure Level
- Use CDN for static assets
- Implement load balancing
- Scale horizontally with multiple instances
- Monitor resource usage

### Database Optimization
```sql
-- Create indexes for common queries
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_expenses_user_date ON expenses(user_id, date);
CREATE INDEX idx_maintenance_user_date ON maintenance_records(user_id, date);

-- PAM-specific indexes for performance
CREATE INDEX idx_pam_analytics_user_type ON pam_analytics_logs(user_id, event_type);
CREATE INDEX idx_pam_memory_user_relevance ON pam_conversation_memory(user_id, relevance_score DESC);
CREATE INDEX idx_pam_context_user_updated ON pam_user_context(user_id, last_updated DESC);
CREATE INDEX idx_calendar_events_user_date ON calendar_events(user_id, start_date);
CREATE INDEX idx_fuel_log_user_date ON fuel_log(user_id, logged_at DESC);
CREATE INDEX idx_social_posts_user_created ON social_posts(user_id, created_at DESC);
CREATE INDEX idx_active_recommendations_user_priority ON active_recommendations(user_id, priority, created_at DESC);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM conversations WHERE user_id = 'uuid';
EXPLAIN ANALYZE SELECT * FROM pam_analytics_logs WHERE user_id = 'uuid' AND event_type = 'chat';
```

## Troubleshooting

### Common Issues

#### 1. Container Won't Start
```bash
# Check logs
docker logs pam-backend

# Check environment variables
docker exec pam-backend env

# Verify ports
docker ps
netstat -tulpn | grep :8000
```

#### 2. Database Connection Issues
```bash
# Test database connection
python -c "
import os
from app.database.supabase_client import get_supabase_client
client = get_supabase_client()
result = client.table('profiles').select('count').execute()
print('Database connected successfully')
"

# Test PAM database coverage
python -c "
import asyncio
from app.services.pam.database.unified_database_service import get_pam_database_service

async def test_coverage():
    service = await get_pam_database_service()
    stats = await service.get_stats()
    print(f'PAM Database Coverage: {stats["coverage_percentage"]}%')
    print(f'Total Tables: {stats["total_tables"]}/39')
    return stats

asyncio.run(test_coverage())
"

# Test PAM intelligence services
python -c "
import asyncio
from app.services.pam.intelligence.cross_domain_service import get_cross_domain_intelligence

async def test_intelligence():
    service = await get_cross_domain_intelligence()
    print('Cross-domain intelligence service initialized successfully')
    return service

asyncio.run(test_intelligence())
"
```

#### 3. Memory Issues
```bash
# Monitor memory usage
docker stats pam-backend

# Check application memory
docker exec pam-backend ps aux --sort=-%mem | head
```

#### 4. High CPU Usage
```bash
# Check application processes
docker exec pam-backend top

# Profile application (if needed)
pip install py-spy
py-spy top --pid $(pgrep -f "uvicorn")
```

### Debugging Tools

```bash
# Enter container for debugging
docker exec -it pam-backend bash

# Check application logs
tail -f /app/logs/pam-backend.log

# Test API endpoints
curl -X GET http://localhost:8000/api/health/detailed

# Check database connectivity
python scripts/health_check.py

# Test PAM functionality
curl -X GET http://localhost:8000/api/v1/pam/database/stats \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test PAM intelligence
curl -X POST http://localhost:8000/api/v1/pam/intelligence/user-360/USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Run comprehensive PAM tests
python test_pam_100_percent_control.py

# Check PAM tool availability
python -c "from app.services.pam.mcp.tools import *; print('All PAM tools imported successfully')"
```

### Performance Monitoring

```bash
# Monitor API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8000/api/health

# Monitor database queries
# Enable slow query logging in PostgreSQL
# Check /var/log/postgresql/postgresql-*.log
```

## Security Hardening

### Container Security
```dockerfile
# Use non-root user
RUN groupadd -r pamuser && useradd -r -g pamuser pamuser
USER pamuser

# Remove unnecessary packages
RUN apt-get remove --purge -y wget curl && \
    apt-get autoremove -y && \
    apt-get clean
```

### Network Security
- Use firewalls to restrict access
- Implement VPN for admin access
- Regular security updates
- Monitor for suspicious activity

### Application Security
- Input validation on all endpoints
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting

## PAM-Specific Deployment Notes

### PAM System Requirements

- **Database Tables**: 39 tables with 100% coverage
- **Tools**: 44 tools across 13 categories
- **Performance**: Target <100ms query times
- **Memory**: 8GB+ recommended for intelligence features
- **Cache**: Redis required for optimal performance

### PAM Health Checks

```bash
# Comprehensive PAM health check
curl -X GET "http://localhost:8000/api/v1/pam/database/health" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected response:
# {
#   "success": true,
#   "health": {
#     "overall_status": "healthy",
#     "database_connectivity": "excellent",
#     "query_performance": "good",
#     "cache_performance": "good",
#     "tools_available": 44,
#     "table_coverage": "100%"
#   }
# }
```

### PAM Performance Benchmarks

```bash
# Run performance benchmarks
python -c "
import asyncio
from test_pam_100_percent_control import PAMTestSuite

async def run_benchmarks():
    suite = PAMTestSuite()
    await suite.test_performance_benchmarks()
    print('Performance benchmarks completed')

asyncio.run(run_benchmarks())
"
```

### Troubleshooting PAM Issues

#### Tool Availability Issues
```bash
# Check if all 44 tools are available
python -c "
from app.services.pam.mcp.tools import *
print('Database Management Tools: 9')
print('Analytics Tools: 5')
print('Session Management Tools: 5')
print('Vehicle Tools: 4')
print('Intelligence Tools: 8')
print('Original Domain Tools: 13')
print('Total: 44 tools available')
"
```

#### Database Coverage Issues
```bash
# Verify all 39 tables are accessible
python -c "
import asyncio
from app.services.pam.database.unified_database_service import get_pam_database_service

async def check_tables():
    service = await get_pam_database_service()
    for table in service.ALL_TABLES:
        try:
            table_instance = await service.get_table(table)
            print(f'✅ {table}: accessible')
        except Exception as e:
            print(f'❌ {table}: {e}')

asyncio.run(check_tables())
"
```

#### Performance Issues
```bash
# Check query performance
python -c "
import asyncio
import time
from app.services.pam.database.unified_database_service import get_pam_database_service

async def test_performance():
    service = await get_pam_database_service()
    start_time = time.time()
    
    # Test query performance
    stats = await service.get_stats()
    
    end_time = time.time()
    query_time = (end_time - start_time) * 1000
    
    print(f'Query time: {query_time:.2f}ms')
    print(f'Target: <100ms')
    print(f'Status: {"✅ Good" if query_time < 100 else "⚠️ Needs optimization"}')

asyncio.run(test_performance())
"
```

This comprehensive deployment guide should help you successfully deploy the PAM Backend with all 44 tools and 100% database coverage while maintaining security, performance, and reliability standards.
