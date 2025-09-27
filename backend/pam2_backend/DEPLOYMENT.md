# PAM 2.0 Deployment Guide
==========================

Complete deployment guide for PAM 2.0 in production environments.

## 🚀 Quick Start

```bash
# 1. Clone and setup
git clone <your-pam2-repo>
cd PAM2

# 2. Configure environment
cp .env.production .env
# Edit .env with your API keys and settings

# 3. Deploy with Docker
./deploy.sh production
```

## 📋 Prerequisites

### System Requirements
- Docker 20.10+
- Docker Compose 2.0+
- 2GB RAM minimum, 4GB recommended
- 1GB disk space

### Required API Keys
- **Google Gemini API Key**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)

## 🔧 Configuration

### Environment Files

Create environment-specific configuration files:

- `.env.development` - Local development
- `.env.staging` - Staging environment
- `.env.production` - Production environment

### Core Settings

```bash
# Required
PAM2_GEMINI_API_KEY=your_gemini_api_key_here
PAM2_ENVIRONMENT=production

# Optional but recommended
PAM2_REDIS_URL=redis://redis:6379
PAM2_ENABLE_RATE_LIMITING=true
PAM2_RATE_LIMIT_MESSAGES_PER_HOUR=100
```

## 🐳 Docker Deployment

### Basic Deployment

```bash
# Build and start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f pam2-api
```

### Production Deployment

```bash
# Use production environment
./deploy.sh production

# Or manually:
docker-compose -f docker-compose.yml up -d
```

### With Database (Optional)

```bash
# Include PostgreSQL for context persistence
docker-compose --profile with-database up -d
```

### With Nginx (Optional)

```bash
# Include reverse proxy and SSL termination
docker-compose --profile with-nginx up -d
```

## ☁️ Cloud Deployment

### Render.com

1. **Create Web Service**
   - Repository: Your PAM 2.0 repo
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn pam_2.api.main:app --host 0.0.0.0 --port $PORT`

2. **Add Redis Service**
   - Create Redis instance
   - Update `PAM2_REDIS_URL` environment variable

3. **Environment Variables**
   ```
   PAM2_GEMINI_API_KEY=your_key_here
   PAM2_ENVIRONMENT=production
   PAM2_REDIS_URL=redis://your-redis-url:6379
   ```

### Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Heroku

```bash
# Install Heroku CLI and login
heroku create pam2-app

# Set environment variables
heroku config:set PAM2_GEMINI_API_KEY=your_key_here
heroku config:set PAM2_ENVIRONMENT=production

# Add Redis addon
heroku addons:create heroku-redis:hobby-dev

# Deploy
git push heroku main
```

### DigitalOcean App Platform

1. Create new app from GitHub repo
2. Configure build settings:
   - Build Command: `pip install -r requirements.txt`
   - Run Command: `uvicorn pam_2.api.main:app --host 0.0.0.0 --port $PORT`
3. Add Redis database
4. Set environment variables

## 🔧 Manual Installation

### System Setup

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3.12 python3.12-venv redis-server

# Create virtual environment
python3.12 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Redis Setup

```bash
# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test connection
redis-cli ping
```

### Run Application

```bash
# Development
uvicorn pam_2.api.main:app --reload --port 8000

# Production
gunicorn pam_2.api.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## 🔒 Security

### Environment Variables

Never commit sensitive data. Use:
- `.env` files (gitignored)
- Cloud provider secret management
- Docker secrets
- Kubernetes secrets

### Firewall Rules

```bash
# Allow HTTP/HTTPS only
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22  # SSH only
sudo ufw deny 8000  # Block direct API access
```

### SSL/TLS

Use reverse proxy (Nginx) with Let's Encrypt:

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com
```

## 📊 Monitoring

### Health Checks

```bash
# API health
curl http://localhost:8000/health

# Detailed health
curl http://localhost:8000/api/v1/health
```

### Logging

```bash
# Application logs
docker-compose logs -f pam2-api

# Redis logs
docker-compose logs -f redis

# All services
docker-compose logs -f
```

### Metrics

Access Prometheus metrics at: `http://localhost:9090/metrics`

## 🔄 Updates & Maintenance

### Update Deployment

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose build --no-cache
docker-compose restart
```

### Database Migrations

```bash
# If using PostgreSQL
docker-compose exec postgres psql -U pam2 -d pam2 -f /path/to/migration.sql
```

### Backup

```bash
# Redis backup
docker-compose exec redis redis-cli BGSAVE

# PostgreSQL backup
docker-compose exec postgres pg_dump -U pam2 pam2 > backup.sql
```

## 🚨 Troubleshooting

### Common Issues

1. **API Key Issues**
   ```bash
   # Check environment variables
   docker-compose exec pam2-api env | grep PAM2_
   ```

2. **Redis Connection**
   ```bash
   # Test Redis connectivity
   docker-compose exec pam2-api python -c "import redis; r=redis.Redis(host='redis'); print(r.ping())"
   ```

3. **Memory Issues**
   ```bash
   # Check memory usage
   docker stats

   # Increase memory limits in docker-compose.yml
   deploy:
     resources:
       limits:
         memory: 2G
   ```

### Log Analysis

```bash
# Error logs only
docker-compose logs pam2-api | grep ERROR

# Performance logs
docker-compose logs pam2-api | grep "processing_time_ms"

# Follow logs in real-time
docker-compose logs -f --tail=100 pam2-api
```

## 📞 Support

For deployment issues:
1. Check logs: `docker-compose logs -f`
2. Verify environment variables
3. Test API health endpoints
4. Review this documentation

## 🎯 Performance Tuning

### Production Settings

```bash
# Increase worker processes
CMD ["uvicorn", "pam_2.api.main:app", "--workers", "4", "--host", "0.0.0.0"]

# Configure Redis connection pool
PAM2_REDIS_MAX_CONNECTIONS=20

# Set appropriate timeouts
PAM2_GEMINI_TIMEOUT=30
PAM2_RESPONSE_TIMEOUT_SECONDS=30
```

### Resource Limits

```yaml
# docker-compose.yml
services:
  pam2-api:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
```

---

✨ **PAM 2.0 is ready for production!** Following this guide ensures a secure, scalable deployment.