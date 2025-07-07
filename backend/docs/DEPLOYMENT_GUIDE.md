# PAM Backend Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Production Deployment](#production-deployment)
3. [Docker Deployment](#docker-deployment)
4. [Cloud Platform Deployments](#cloud-platform-deployments)
5. [Environment Configuration](#environment-configuration)
6. [Database Setup](#database-setup)
7. [Monitoring & Health Checks](#monitoring--health-checks)
8. [Security Configuration](#security-configuration)
9. [Performance Optimization](#performance-optimization)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements
- **Python**: 3.11 or higher
- **RAM**: Minimum 2GB, Recommended 4GB+
- **CPU**: 2 cores minimum, 4+ recommended
- **Storage**: 20GB minimum for logs and cache
- **Network**: Stable internet connection for AI services

### Required Services
- **PostgreSQL**: 13+ (Supabase recommended)
- **Redis**: 6+ for caching and sessions
- **SMTP Server**: For email notifications
- **File Storage**: Supabase Storage or S3-compatible

### Development Tools
```bash
# Install required tools
pip install --upgrade pip
pip install uv  # Fast Python package installer
pip install docker-compose
```

---

## Production Deployment

### 1. Server Setup (Ubuntu 22.04 LTS)

#### Update System
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3.11 python3.11-venv python3-pip nginx postgresql-client redis-tools curl git
```

#### Create Application User
```bash
sudo useradd -m -s /bin/bash pam
sudo usermod -aG www-data pam
sudo su - pam
```

#### Setup Application Directory
```bash
# As pam user
mkdir -p /home/pam/{app,logs,backups}
cd /home/pam/app

# Clone repository
git clone https://github.com/your-org/pam-backend.git .
```

### 2. Python Environment Setup

```bash
# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn[gevent]

# Verify installation
python -c "import app.main; print('✅ Application imports successfully')"
```

### 3. Environment Configuration

#### Create Production Environment File
```bash
# /home/pam/app/.env.production
cat > .env.production << 'EOF'
# Environment
ENVIRONMENT=production
SECRET_KEY=your-super-secret-key-change-this-in-production
DEBUG=false

# Database
DATABASE_URL=postgresql://username:password@host:5432/pam_production
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=30

# Redis
REDIS_URL=redis://localhost:6379/0
REDIS_MAX_CONNECTIONS=20

# AI Services
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-your-anthropic-key
OPENAI_MODEL=gpt-4-turbo-preview
MAX_TOKENS=4000

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# External APIs
MAPBOX_API_KEY=pk.your-mapbox-token

# Security
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
TRUSTED_PROXIES=127.0.0.1,10.0.0.0/8

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
LOG_LEVEL=INFO
LOG_FORMAT=json

# Performance
WORKERS=4
WORKER_CLASS=gevent
WORKER_CONNECTIONS=1000
MAX_REQUESTS=1000
MAX_REQUESTS_JITTER=50
TIMEOUT=30
KEEPALIVE=2

# Cache
CACHE_TTL=3600
SESSION_TIMEOUT=86400

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_STORAGE_URL=$REDIS_URL

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@your-domain.com
EOF

# Secure the environment file
chmod 600 .env.production
```

### 4. Database Migrations

```bash
# Run database migrations
python -m alembic upgrade head

# Verify database connection
python -c "
from app.core.database import get_db
from app.core.config import settings
print(f'✅ Database connected: {settings.DATABASE_URL.split('@')[1]}')
"
```

### 5. Systemd Service Configuration

#### Create Service File
```bash
sudo tee /etc/systemd/system/pam-backend.service << 'EOF'
[Unit]
Description=PAM Backend API Server
After=network.target postgresql.service redis.service
Wants=postgresql.service redis.service

[Service]
Type=notify
User=pam
Group=pam
WorkingDirectory=/home/pam/app
Environment=PATH=/home/pam/app/venv/bin
ExecStart=/home/pam/app/venv/bin/gunicorn app.main:app \
    --worker-class gevent \
    --workers 4 \
    --worker-connections 1000 \
    --max-requests 1000 \
    --max-requests-jitter 50 \
    --timeout 30 \
    --keepalive 2 \
    --bind 127.0.0.1:8000 \
    --pid /home/pam/app/gunicorn.pid \
    --access-logfile /home/pam/logs/access.log \
    --error-logfile /home/pam/logs/error.log \
    --log-level info \
    --preload
ExecReload=/bin/kill -s HUP $MAINPID
KillMode=mixed
TimeoutStopSec=5
PrivateTmp=true
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable pam-backend
sudo systemctl start pam-backend
sudo systemctl status pam-backend
```

### 6. Nginx Configuration

#### Main Configuration
```bash
sudo tee /etc/nginx/sites-available/pam-backend << 'EOF'
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=chat_limit:10m rate=30r/m;

# Upstream backend
upstream pam_backend {
    server 127.0.0.1:8000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Client settings
    client_max_body_size 10M;
    client_body_timeout 60s;
    client_header_timeout 60s;
    
    # Logging
    access_log /var/log/nginx/pam-backend-access.log;
    error_log /var/log/nginx/pam-backend-error.log;
    
    # Health check endpoint (no rate limiting)
    location /api/health {
        proxy_pass http://pam_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 5s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
    }
    
    # Authentication endpoints (strict rate limiting)
    location ~ ^/api/(auth|register|login) {
        limit_req zone=auth_limit burst=10 nodelay;
        limit_req_status 429;
        
        proxy_pass http://pam_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 10s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    # Chat endpoints (moderate rate limiting)
    location ~ ^/api/(chat|pam) {
        limit_req zone=chat_limit burst=20 nodelay;
        limit_req_status 429;
        
        proxy_pass http://pam_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 15s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_buffering off;
    }
    
    # WebSocket connections
    location /ws/ {
        proxy_pass http://pam_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
    
    # API endpoints (standard rate limiting)
    location /api/ {
        limit_req zone=api_limit burst=50 nodelay;
        limit_req_status 429;
        
        proxy_pass http://pam_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 10s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # CORS headers
        add_header Access-Control-Allow-Origin "$http_origin" always;
        add_header Access-Control-Allow-Credentials "true" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" always;
        
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Type 'text/plain; charset=utf-8';
            add_header Content-Length 0;
            return 204;
        }
    }
    
    # Static files (if needed)
    location /static/ {
        alias /home/pam/app/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/pam-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. SSL Certificate Setup

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 3 * * * /usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx"
```

---

## Docker Deployment

### 1. Docker Compose Setup

#### Production docker-compose.yml
```yaml
version: '3.8'

services:
  pam-backend:
    build: 
      context: .
      dockerfile: Dockerfile.prod
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - ENVIRONMENT=production
    env_file:
      - .env.production
    volumes:
      - ./logs:/app/logs
      - ./uploads:/app/uploads
    depends_on:
      - redis
      - postgres
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: "1.5"
        reservations:
          memory: 1G
          cpus: "0.5"

  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: pam_production
      POSTGRES_USER: pam_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U pam_user -d pam_production"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./ssl:/etc/ssl/certs
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - pam-backend

volumes:
  postgres_data:
  redis_data:

networks:
  default:
    driver: bridge
```

#### Production Dockerfile
```dockerfile
# Dockerfile.prod
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PIP_NO_CACHE_DIR=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN useradd -m -u 1000 pam && mkdir -p /app /app/logs
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir gunicorn[gevent]

# Copy application code
COPY . .
RUN chown -R pam:pam /app

# Switch to app user
USER pam

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Expose port
EXPOSE 8000

# Start command
CMD ["gunicorn", "app.main:app", \
     "--worker-class", "gevent", \
     "--workers", "4", \
     "--worker-connections", "1000", \
     "--bind", "0.0.0.0:8000", \
     "--timeout", "30", \
     "--keepalive", "2", \
     "--max-requests", "1000", \
     "--max-requests-jitter", "50", \
     "--preload", \
     "--access-logfile", "/app/logs/access.log", \
     "--error-logfile", "/app/logs/error.log"]
```

### 2. Docker Deployment Commands

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f pam-backend

# Scale backend instances
docker-compose -f docker-compose.prod.yml up -d --scale pam-backend=3

# Update application
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --force-recreate

# Backup database
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U pam_user pam_production > backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## Cloud Platform Deployments

### 1. Render.com Deployment

#### render.yaml
```yaml
services:
  - type: web
    name: pam-backend
    env: python
    plan: pro
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn app.main:app --worker-class gevent --workers 4 --bind 0.0.0.0:$PORT
    envVars:
      - key: ENVIRONMENT
        value: production
      - key: PYTHON_VERSION
        value: 3.11.5
      - key: DATABASE_URL
        fromDatabase:
          name: pam-postgres
          property: connectionString
      - key: REDIS_URL
        fromService:
          type: redis
          name: pam-redis
          property: connectionString
    healthCheckPath: /api/health
    autoDeploy: false

databases:
  - name: pam-postgres
    plan: pro
    databaseName: pam_production
    user: pam_user

services:
  - type: redis
    name: pam-redis
    plan: pro
    maxmemoryPolicy: allkeys-lru
```

### 2. Railway Deployment

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and initialize
railway login
railway init

# Set environment variables
railway variables set ENVIRONMENT=production
railway variables set SECRET_KEY=your-secret-key

# Deploy
railway up
```

### 3. DigitalOcean App Platform

#### .do/app.yaml
```yaml
name: pam-backend
services:
- name: api
  source_dir: /
  github:
    repo: your-org/pam-backend
    branch: main
  run_command: gunicorn app.main:app --worker-class gevent --workers 4 --bind 0.0.0.0:$PORT
  environment_slug: python
  instance_count: 2
  instance_size_slug: pro-s
  http_port: 8000
  health_check:
    http_path: /api/health
  envs:
  - key: ENVIRONMENT
    value: production
  - key: DATABASE_URL
    value: ${pam-postgres.DATABASE_URL}
  - key: REDIS_URL  
    value: ${pam-redis.DATABASE_URL}

databases:
- engine: PG
  name: pam-postgres
  num_nodes: 1
  size: db-s-1vcpu-1gb
  version: "15"
- engine: REDIS
  name: pam-redis
  num_nodes: 1
  size: db-s-1vcpu-1gb
  version: "7"
```

---

## Environment Configuration

### 1. Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `ENVIRONMENT` | Deployment environment | Yes | `development` |
| `SECRET_KEY` | JWT signing key | Yes | - |
| `DATABASE_URL` | PostgreSQL connection | Yes | - |
| `REDIS_URL` | Redis connection | Yes | - |
| `OPENAI_API_KEY` | OpenAI API key | Yes | - |
| `SUPABASE_URL` | Supabase project URL | Yes | - |
| `SUPABASE_KEY` | Supabase anon key | Yes | - |
| `CORS_ORIGINS` | Allowed CORS origins | No | `*` |
| `LOG_LEVEL` | Logging level | No | `INFO` |
| `WORKERS` | Gunicorn workers | No | `4` |
| `SENTRY_DSN` | Sentry error tracking | No | - |

### 2. Configuration Validation

```python
# config_validator.py
import os
from typing import List, Dict

def validate_production_config() -> Dict[str, List[str]]:
    """Validate production configuration and return issues."""
    issues = {
        'errors': [],
        'warnings': []
    }
    
    # Required variables
    required_vars = [
        'SECRET_KEY', 'DATABASE_URL', 'REDIS_URL', 
        'OPENAI_API_KEY', 'SUPABASE_URL', 'SUPABASE_KEY'
    ]
    
    for var in required_vars:
        if not os.getenv(var):
            issues['errors'].append(f'Missing required environment variable: {var}')
    
    # Security checks
    secret_key = os.getenv('SECRET_KEY', '')
    if len(secret_key) < 32:
        issues['errors'].append('SECRET_KEY must be at least 32 characters')
    
    if secret_key == 'change-this-in-production':
        issues['errors'].append('SECRET_KEY must be changed from default value')
    
    # CORS configuration
    cors_origins = os.getenv('CORS_ORIGINS', '*')
    if cors_origins == '*' and os.getenv('ENVIRONMENT') == 'production':
        issues['warnings'].append('CORS_ORIGINS should be restricted in production')
    
    return issues

if __name__ == '__main__':
    issues = validate_production_config()
    if issues['errors']:
        print("❌ Configuration errors:")
        for error in issues['errors']:
            print(f"  - {error}")
        exit(1)
    
    if issues['warnings']:
        print("⚠️  Configuration warnings:")
        for warning in issues['warnings']:
            print(f"  - {warning}")
    
    print("✅ Configuration validation passed")
```

---

## Database Setup

### 1. Production Database Configuration

#### PostgreSQL Optimization
```sql
-- postgresql.conf optimizations
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
```

#### Connection Pooling (PgBouncer)
```ini
# pgbouncer.ini
[databases]
pam_production = host=localhost port=5432 dbname=pam_production

[pgbouncer]
listen_port = 6432
listen_addr = 127.0.0.1
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
admin_users = pam_admin
pool_mode = transaction
server_reset_query = DISCARD ALL
max_client_conn = 100
default_pool_size = 20
```

### 2. Database Migrations

#### Automated Migration Script
```bash
#!/bin/bash
# migrate.sh

set -e

echo "🔄 Starting database migration..."

# Backup current database
echo "📦 Creating backup..."
pg_dump $DATABASE_URL > "backup_$(date +%Y%m%d_%H%M%S).sql"

# Run migrations
echo "🔄 Running migrations..."
python -m alembic upgrade head

# Verify migration
echo "✅ Verifying migration..."
python -c "
from app.core.database import engine
from sqlalchemy import text
with engine.connect() as conn:
    result = conn.execute(text('SELECT version_num FROM alembic_version'))
    print(f'Current schema version: {result.scalar()}')
"

echo "✅ Migration completed successfully"
```

### 3. Database Backup Strategy

#### Automated Backup Script
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/home/pam/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/pam_backup_$TIMESTAMP.sql"

# Create backup
pg_dump $DATABASE_URL | gzip > "$BACKUP_FILE.gz"

# Upload to cloud storage (optional)
# aws s3 cp "$BACKUP_FILE.gz" s3://your-bucket/backups/

# Keep only last 7 days of backups
find $BACKUP_DIR -name "pam_backup_*.sql.gz" -mtime +7 -delete

echo "✅ Backup completed: $BACKUP_FILE.gz"
```

#### Cron Schedule
```bash
# Add to crontab
0 2 * * * /home/pam/scripts/backup.sh >> /home/pam/logs/backup.log 2>&1
```

---

## Monitoring & Health Checks

### 1. Application Health Checks

#### Comprehensive Health Check
```python
# app/api/v1/health.py
from fastapi import APIRouter, HTTPException
from sqlalchemy import text
import redis
import httpx
import time
from app.core.database import engine
from app.core.config import settings

router = APIRouter()

@router.get("/health/detailed")
async def detailed_health_check():
    """Comprehensive health check with service status."""
    health_data = {
        "status": "healthy",
        "timestamp": time.time(),
        "checks": {}
    }
    
    # Database check
    try:
        with engine.connect() as conn:
            start_time = time.time()
            conn.execute(text("SELECT 1"))
            db_response_time = (time.time() - start_time) * 1000
            health_data["checks"]["database"] = {
                "status": "healthy",
                "response_time_ms": round(db_response_time, 2)
            }
    except Exception as e:
        health_data["checks"]["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health_data["status"] = "unhealthy"
    
    # Redis check
    try:
        redis_client = redis.from_url(settings.REDIS_URL)
        start_time = time.time()
        redis_client.ping()
        redis_response_time = (time.time() - start_time) * 1000
        health_data["checks"]["redis"] = {
            "status": "healthy",
            "response_time_ms": round(redis_response_time, 2)
        }
    except Exception as e:
        health_data["checks"]["redis"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health_data["status"] = "unhealthy"
    
    # OpenAI API check
    try:
        async with httpx.AsyncClient() as client:
            start_time = time.time()
            response = await client.get(
                "https://api.openai.com/v1/models",
                headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                timeout=5.0
            )
            openai_response_time = (time.time() - start_time) * 1000
            health_data["checks"]["openai"] = {
                "status": "healthy" if response.status_code == 200 else "degraded",
                "response_time_ms": round(openai_response_time, 2)
            }
    except Exception as e:
        health_data["checks"]["openai"] = {
            "status": "unhealthy",
            "error": str(e)
        }
    
    if health_data["status"] == "unhealthy":
        raise HTTPException(status_code=503, detail=health_data)
    
    return health_data
```

### 2. Prometheus Metrics

#### Custom Metrics
```python
# app/core/metrics.py
from prometheus_client import Counter, Histogram, Gauge, generate_latest
import time

# Request metrics
REQUEST_COUNT = Counter(
    'pam_requests_total',
    'Total requests',
    ['method', 'endpoint', 'status']
)

REQUEST_DURATION = Histogram(
    'pam_request_duration_seconds',
    'Request duration',
    ['method', 'endpoint']
)

# AI metrics
AI_REQUESTS = Counter(
    'pam_ai_requests_total',
    'AI API requests',
    ['provider', 'model', 'status']
)

AI_RESPONSE_TIME = Histogram(
    'pam_ai_response_time_seconds',
    'AI response time',
    ['provider', 'model']
)

# System metrics
ACTIVE_CONNECTIONS = Gauge(
    'pam_active_connections',
    'Active database connections'
)

CACHE_HITS = Counter(
    'pam_cache_hits_total',
    'Cache hits',
    ['cache_type']
)

def track_request(method: str, endpoint: str, status: int, duration: float):
    """Track request metrics."""
    REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=status).inc()
    REQUEST_DURATION.labels(method=method, endpoint=endpoint).observe(duration)
```

### 3. Log Aggregation

#### Structured Logging Configuration
```python
# app/core/logging.py
import logging
import json
import sys
from datetime import datetime
from app.core.config import settings

class JSONFormatter(logging.Formatter):
    """JSON formatter for structured logging."""
    
    def format(self, record):
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        # Add exception info if present
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        
        # Add extra fields
        for key, value in record.__dict__.items():
            if key not in ("name", "msg", "args", "levelname", "levelno", 
                          "pathname", "filename", "module", "lineno", 
                          "funcName", "created", "msecs", "relativeCreated", 
                          "thread", "threadName", "processName", "process",
                          "getMessage", "exc_info", "exc_text", "stack_info"):
                log_entry[key] = value
        
        return json.dumps(log_entry)

def setup_logging():
    """Setup application logging."""
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper()))
    
    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    
    if settings.LOG_FORMAT == "json":
        console_handler.setFormatter(JSONFormatter())
    else:
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        console_handler.setFormatter(formatter)
    
    root_logger.addHandler(console_handler)
    
    # Set levels for third-party loggers
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    
    return logging.getLogger("pam")
```

---

## Security Configuration

### 1. Security Headers Middleware

```python
# app/core/security_middleware.py
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        
        return response
```

### 2. Rate Limiting Configuration

```python
# app/core/rate_limiter.py
import redis
import time
from fastapi import HTTPException, Request
from typing import Optional

class RateLimiter:
    """Redis-based rate limiter."""
    
    def __init__(self, redis_url: str):
        self.redis = redis.from_url(redis_url)
    
    async def check_rate_limit(
        self, 
        key: str, 
        limit: int, 
        window: int,
        cost: int = 1
    ) -> bool:
        """Check if request is within rate limit."""
        pipe = self.redis.pipeline()
        now = time.time()
        window_start = now - window
        
        # Remove old entries
        pipe.zremrangebyscore(key, 0, window_start)
        
        # Count current requests
        pipe.zcard(key)
        
        # Add current request
        pipe.zadd(key, {str(now): now})
        
        # Set expiry
        pipe.expire(key, window)
        
        results = pipe.execute()
        current_requests = results[1]
        
        return current_requests + cost <= limit
    
    def rate_limit_key(self, request: Request, identifier: str) -> str:
        """Generate rate limit key."""
        client_ip = request.client.host
        return f"rate_limit:{identifier}:{client_ip}"
```

### 3. Input Validation & Sanitization

```python
# app/core/validators.py
import re
from typing import Any, Dict
from pydantic import validator
from fastapi import HTTPException

class InputValidator:
    """Input validation and sanitization."""
    
    @staticmethod
    def sanitize_string(value: str, max_length: int = 1000) -> str:
        """Sanitize string input."""
        if not isinstance(value, str):
            raise ValueError("Input must be a string")
        
        # Remove null bytes and control characters
        value = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', value)
        
        # Limit length
        if len(value) > max_length:
            raise ValueError(f"Input too long (max {max_length} characters)")
        
        return value.strip()
    
    @staticmethod
    def validate_email(email: str) -> str:
        """Validate email format."""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, email):
            raise ValueError("Invalid email format")
        return email.lower()
    
    @staticmethod
    def validate_coordinates(lat: float, lng: float) -> tuple:
        """Validate geographical coordinates."""
        if not -90 <= lat <= 90:
            raise ValueError("Latitude must be between -90 and 90")
        if not -180 <= lng <= 180:
            raise ValueError("Longitude must be between -180 and 180")
        return lat, lng
```

---

## Performance Optimization

### 1. Connection Pooling

```python
# app/core/database_pool.py
from sqlalchemy.pool import QueuePool
from sqlalchemy import create_engine
from app.core.config import settings

# Optimized database engine
engine = create_engine(
    settings.DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=30,
    pool_timeout=30,
    pool_recycle=3600,
    pool_pre_ping=True,
    echo=settings.ENVIRONMENT == "development"
)
```

### 2. Caching Strategy

```python
# app/core/cache.py
import json
import pickle
from typing import Any, Optional
import redis.asyncio as redis
from app.core.config import settings

class CacheManager:
    """Async Redis cache manager."""
    
    def __init__(self):
        self.redis = redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=False
        )
    
    async def get(self, key: str) -> Optional[Any]:
        """Get cached value."""
        try:
            value = await self.redis.get(key)
            if value:
                return pickle.loads(value)
        except Exception:
            return None
        return None
    
    async def set(
        self, 
        key: str, 
        value: Any, 
        ttl: int = 3600
    ) -> bool:
        """Set cached value."""
        try:
            serialized = pickle.dumps(value)
            return await self.redis.setex(key, ttl, serialized)
        except Exception:
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete cached value."""
        try:
            return await self.redis.delete(key) > 0
        except Exception:
            return False
    
    async def get_json(self, key: str) -> Optional[dict]:
        """Get JSON cached value."""
        try:
            value = await self.redis.get(key)
            if value:
                return json.loads(value)
        except Exception:
            return None
        return None
    
    async def set_json(
        self, 
        key: str, 
        value: dict, 
        ttl: int = 3600
    ) -> bool:
        """Set JSON cached value."""
        try:
            serialized = json.dumps(value)
            return await self.redis.setex(key, ttl, serialized)
        except Exception:
            return False

cache = CacheManager()
```

### 3. Response Compression

```python
# app/core/compression.py
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import gzip

class CompressionMiddleware(BaseHTTPMiddleware):
    """Gzip compression middleware."""
    
    def __init__(self, app, minimum_size: int = 1024):
        super().__init__(app)
        self.minimum_size = minimum_size
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Check if client accepts gzip
        accept_encoding = request.headers.get("accept-encoding", "")
        if "gzip" not in accept_encoding:
            return response
        
        # Check content type
        content_type = response.headers.get("content-type", "")
        if not any(ct in content_type for ct in [
            "application/json", "text/", "application/javascript"
        ]):
            return response
        
        # Get response body
        body = b""
        async for chunk in response.body_iterator:
            body += chunk
        
        # Compress if large enough
        if len(body) >= self.minimum_size:
            compressed_body = gzip.compress(body)
            response.headers["content-encoding"] = "gzip"
            response.headers["content-length"] = str(len(compressed_body))
            
            # Create new response with compressed body
            response = Response(
                content=compressed_body,
                status_code=response.status_code,
                headers=response.headers,
                media_type=response.media_type
            )
        
        return response
```

---

## Troubleshooting

### 1. Common Issues & Solutions

#### Database Connection Issues
```bash
# Check database connectivity
psql $DATABASE_URL -c "SELECT version();"

# Check connection pool status
python -c "
from app.core.database import engine
print(f'Pool size: {engine.pool.size()}')
print(f'Checked out: {engine.pool.checkedout()}')
print(f'Overflow: {engine.pool.overflow()}')
"
```

#### Redis Connection Issues
```bash
# Test Redis connection
redis-cli -u $REDIS_URL ping

# Check Redis memory usage
redis-cli -u $REDIS_URL info memory
```

#### High Memory Usage
```bash
# Check Python memory usage
python -c "
import psutil
process = psutil.Process()
print(f'Memory usage: {process.memory_info().rss / 1024 / 1024:.2f} MB')
"

# Monitor with htop
htop -p $(pgrep -f gunicorn)
```

### 2. Log Analysis

#### Error Pattern Detection
```bash
# Common error patterns
grep -E "(ERROR|CRITICAL)" /home/pam/logs/error.log | tail -20

# Performance issues
grep -E "slow|timeout|502|503|504" /var/log/nginx/pam-backend-error.log

# Database connection errors
grep -E "(connection|pool|timeout)" /home/pam/logs/error.log
```

### 3. Performance Monitoring

#### Application Metrics Script
```python
#!/usr/bin/env python3
# monitor.py
import psutil
import requests
import time
import json

def check_app_health():
    """Check application health and performance."""
    try:
        # Health check
        response = requests.get(
            "http://localhost:8000/api/health/detailed",
            timeout=10
        )
        health_data = response.json()
        
        # System metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        metrics = {
            "timestamp": time.time(),
            "health": health_data,
            "system": {
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "disk_percent": disk.percent,
                "available_memory_mb": memory.available / 1024 / 1024
            }
        }
        
        print(json.dumps(metrics, indent=2))
        
        # Alert conditions
        if cpu_percent > 80:
            print("⚠️  High CPU usage detected")
        if memory.percent > 85:
            print("⚠️  High memory usage detected")
        if any(check["status"] != "healthy" for check in health_data["checks"].values()):
            print("🚨 Service health check failed")
            
    except Exception as e:
        print(f"❌ Monitoring failed: {e}")

if __name__ == "__main__":
    check_app_health()
```

### 4. Rollback Procedures

#### Quick Rollback Script
```bash
#!/bin/bash
# rollback.sh

set -e

BACKUP_DIR="/home/pam/backups"
SERVICE_NAME="pam-backend"

echo "🔄 Starting rollback procedure..."

# Stop service
sudo systemctl stop $SERVICE_NAME

# Restore from backup
if [ -f "$BACKUP_DIR/latest.sql.gz" ]; then
    echo "📦 Restoring database from backup..."
    gunzip -c "$BACKUP_DIR/latest.sql.gz" | psql $DATABASE_URL
fi

# Revert code (if using git)
git checkout HEAD~1
pip install -r requirements.txt

# Restart service
sudo systemctl start $SERVICE_NAME

# Verify health
sleep 10
curl -f http://localhost:8000/api/health || {
    echo "❌ Health check failed after rollback"
    exit 1
}

echo "✅ Rollback completed successfully"
```

This comprehensive deployment guide covers all aspects of production deployment, from basic server setup to advanced monitoring and troubleshooting. Each section includes practical examples and scripts that can be directly used in production environments.