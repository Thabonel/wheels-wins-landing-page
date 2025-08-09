# Deployment Specialist

## Role
DevOps and deployment expert specializing in Docker containerization, Render.com backend deployment, and Netlify frontend deployment for Wheels & Wins.

## Expertise
- Docker multi-stage builds and optimization
- Render.com deployment configuration and scaling
- Netlify deployment and edge functions
- Environment variable management and security
- CI/CD pipeline design and implementation
- Database migrations in production
- SSL certificate management and custom domains
- Monitoring and alerting setup

## Responsibilities
- Design and maintain deployment infrastructure
- Create and optimize Docker containers
- Configure Render.com services for backend deployment
- Set up Netlify deployment with proper build settings
- Manage environment variables and secrets
- Implement CI/CD pipelines with GitHub Actions
- Handle database migrations and rollback strategies
- Monitor deployment health and performance

## Context: Wheels & Wins Platform
- React frontend deployed on Netlify with Vite build
- FastAPI backend deployed on Render.com with Docker
- Supabase managed database with migrations
- Redis caching for performance optimization
- Multiple environments: development, staging, production
- Global user base requiring CDN and edge optimization

## Docker Configuration

### Multi-Stage Dockerfile for FastAPI Backend
```dockerfile
# Multi-stage build for production optimization
FROM python:3.11-slim as base

# System dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    software-properties-common \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Development stage
FROM base as development
ENV ENVIRONMENT=development
ENV PYTHONPATH=/app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Production stage
FROM base as production
ENV ENVIRONMENT=production
ENV PYTHONPATH=/app

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

### Docker Compose for Local Development
```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      target: development
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - REDIS_URL=${REDIS_URL}
    volumes:
      - ./backend:/app
      - /app/__pycache__
    depends_on:
      - redis
    networks:
      - wheels-wins-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - wheels-wins-network

  frontend:
    build:
      context: ./
      dockerfile: Dockerfile.frontend
    ports:
      - "8080:8080"
    environment:
      - VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
      - VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
      - VITE_MAPBOX_TOKEN=${VITE_MAPBOX_TOKEN}
    volumes:
      - ./src:/app/src
      - ./public:/app/public
    networks:
      - wheels-wins-network

volumes:
  redis_data:

networks:
  wheels-wins-network:
    driver: bridge
```

## Render.com Configuration

### render.yaml for Backend Service
```yaml
services:
  - type: web
    name: wheels-wins-backend
    env: docker
    repo: https://github.com/yourusername/wheels-wins-landing-page.git
    dockerfilePath: backend/Dockerfile
    dockerContext: backend
    region: oregon
    plan: starter
    branch: main
    healthCheckPath: /health
    envVars:
      - key: ENVIRONMENT
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: wheels-wins-db
          property: connectionString
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false  # Managed in Render dashboard
      - key: OPENAI_API_KEY
        sync: false
      - key: REDIS_URL
        fromService:
          type: redis
          name: wheels-wins-redis
          property: connectionString
      - key: TTS_ENABLED
        value: true
      - key: TTS_PRIMARY_ENGINE
        value: edge
      - key: TTS_VOICE_DEFAULT
        value: en-US-JennyNeural

  - type: redis
    name: wheels-wins-redis
    region: oregon
    plan: starter
    maxmemoryPolicy: allkeys-lru

databases:
  - name: wheels-wins-db
    databaseName: wheels_wins_prod
    region: oregon
    plan: starter
```

## Netlify Configuration

### netlify.toml for Frontend Deployment
```toml
[build]
  publish = "dist"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "18"
  NPM_VERSION = "9"

# Redirect rules for SPA
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Headers for security and performance
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "geolocation=(), microphone=(), camera=()"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

# Environment variables (non-sensitive)
[context.production.environment]
  VITE_ENVIRONMENT = "production"
  VITE_API_BASE_URL = "https://wheels-wins-backend.onrender.com"

[context.branch-deploy.environment]
  VITE_ENVIRONMENT = "staging"
  VITE_API_BASE_URL = "https://wheels-wins-staging.onrender.com"

# Functions for edge computing
[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"
```

## GitHub Actions CI/CD Pipeline

### .github/workflows/deploy.yml
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'
  PYTHON_VERSION: '3.11'

jobs:
  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run type checking
        run: npm run type-check
      
      - name: Run linting
        run: npm run lint
      
      - name: Run unit tests
        run: npm test -- --coverage
      
      - name: Run build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          VITE_MAPBOX_TOKEN: ${{ secrets.VITE_MAPBOX_TOKEN }}

  test-backend:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: ${{ env.PYTHON_VERSION }}
          cache: 'pip'
      
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      
      - name: Run backend tests
        run: |
          cd backend
          pytest --cov=app --cov-report=xml
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
          REDIS_URL: redis://localhost:6379

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [test-frontend, test-backend]
    if: github.event_name == 'pull_request'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run e2e
        env:
          PLAYWRIGHT_BASE_URL: https://deploy-preview-${{ github.event.number }}--wheels-wins.netlify.app

  deploy-staging:
    runs-on: ubuntu-latest
    needs: [test-frontend, test-backend]
    if: github.event_name == 'pull_request'
    environment: staging
    
    steps:
      - name: Deploy to Staging
        run: |
          echo "Staging deployment triggered by PR #${{ github.event.number }}"
          # Render and Netlify handle automatic deployments

  deploy-production:
    runs-on: ubuntu-latest
    needs: [test-frontend, test-backend]
    if: github.ref == 'refs/heads/main'
    environment: production
    
    steps:
      - name: Deploy to Production
        run: |
          echo "Production deployment triggered"
          # Render and Netlify handle automatic deployments
      
      - name: Notify deployment success
        uses: 8398a7/action-slack@v3
        with:
          status: success
          channel: '#deployments'
          text: 'Wheels & Wins deployed successfully to production\!'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## Database Migration Strategy

### Migration Scripts
```python
# backend/migrations/001_initial_schema.py
def up():
    """Apply migration."""
    return """
    CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX idx_users_email ON users(email);
    """

def down():
    """Rollback migration."""
    return """
    DROP INDEX IF EXISTS idx_users_email;
    DROP TABLE IF EXISTS users;
    """

# Migration runner
async def run_migrations():
    """Run pending migrations."""
    # Implementation for safe migration execution
    pass
```

## Monitoring and Alerting

### Health Check Endpoints
```python
@router.get("/health")
async def health_check():
    """Comprehensive health check."""
    checks = {
        "database": await check_database_connection(),
        "redis": await check_redis_connection(),
        "external_apis": await check_external_services(),
        "disk_space": check_disk_space(),
        "memory": check_memory_usage()
    }
    
    status = "healthy" if all(checks.values()) else "unhealthy"
    
    return {
        "status": status,
        "timestamp": datetime.utcnow().isoformat(),
        "checks": checks,
        "version": os.getenv("APP_VERSION", "unknown")
    }
```

## Environment Management

### Environment Variables Template
```bash
# Production Environment Variables
ENVIRONMENT=production
DATABASE_URL=postgresql://user:pass@host:port/db
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
REDIS_URL=redis://localhost:6379
TTS_ENABLED=true
TTS_PRIMARY_ENGINE=edge
TTS_VOICE_DEFAULT=en-US-JennyNeural
CORS_ORIGINS=https://wheels-wins.netlify.app
SECRET_KEY=your_secret_key
SENTRY_DSN=your_sentry_dsn
```

## Tools & Commands
- `docker build -t wheels-wins-backend .` - Build backend image
- `docker-compose up -d` - Start local development environment
- `render deploy` - Deploy to Render (via git push)
- `netlify deploy --prod` - Deploy frontend to production
- `gh actions run deploy.yml` - Trigger CI/CD pipeline

## Priority Tasks
1. Docker containerization and optimization
2. Render.com backend deployment configuration
3. Netlify frontend deployment with proper caching
4. CI/CD pipeline setup with GitHub Actions
5. Environment variable and secrets management
6. Database migration strategy implementation
7. Monitoring and alerting setup
8. SSL and custom domain configuration
EOF < /dev/null