# Comprehensive Environment Variables Guide

## Overview

Wheels & Wins uses environment variables for configuration across frontend (Vite) and backend (FastAPI) services. This guide provides complete documentation of all environment variables used in the project.

## Frontend Environment Variables (.env)

### Core Database & Authentication
```bash
# Supabase Configuration - REQUIRED
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Service role key for backend operations (optional for frontend)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Backend & API Configuration
```bash
# PAM Backend API - REQUIRED for AI features
VITE_BACKEND_URL=https://pam-backend.onrender.com

# PAM WebSocket endpoint - REQUIRED for real-time chat
VITE_PAM_WEBSOCKET_URL=wss://pam-backend.onrender.com/api/v1/pam/ws
```

### Mapbox Configuration
```bash
# Mapbox Public Token - REQUIRED for maps (URL-restricted, read-only)
# Scopes: styles:read, fonts:read, sprites:read
VITE_MAPBOX_PUBLIC_TOKEN=pk.your_public_mapbox_token_here

# Legacy token support (deprecated - use VITE_MAPBOX_PUBLIC_TOKEN instead)
VITE_MAPBOX_TOKEN=pk.your_mapbox_token_here

# Backend-only secret token (NOT exposed to frontend)
# MAPBOX_SECRET_TOKEN=sk.your_secret_mapbox_token_here
```

### External API Integrations
```bash
# YouTube Data API v3 - REQUIRED for PAM YouTube Trip Scraper
VITE_YOUTUBE_API_KEY=your_youtube_data_api_v3_key_here
```

### Monitoring & Error Tracking
```bash
# Sentry Error Monitoring - OPTIONAL but recommended
VITE_SENTRY_DSN=https://your-sentry-dsn@o0000000.ingest.de.sentry.io/0000000
VITE_SENTRY_ENVIRONMENT=development|staging|production
```

### Performance & Timeout Configuration
```bash
# Request timeouts (in milliseconds)
VITE_FETCH_TIMEOUT=10000
HTTP_TIMEOUT=10
```

## Backend Environment Variables (backend/.env)

### Core Configuration
```bash
# Environment setting
ENVIRONMENT=development|staging|production

# Debug mode (disable in production)
DEBUG=false

# Application secret key
SECRET_KEY=your-super-secret-key-here
```

### Database Configuration
```bash
# Supabase configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_service_role_key
SUPABASE_ANON_KEY=your_supabase_anon_key

# Direct PostgreSQL connection (optional)
DATABASE_URL=postgresql://user:pass@localhost/wheels_wins
```

### AI Services
```bash
# OpenAI API - REQUIRED for PAM AI features
OPENAI_API_KEY=your_openai_api_key_here

# LangChain tracing (optional)
LANGCHAIN_TRACING_V2=disabled
LANGFUSE_SECRET_KEY=your_langfuse_key_here
LANGFUSE_PUBLIC_KEY=your_langfuse_public_key_here
```

### Voice Services Configuration
```bash
# TTS (Text-to-Speech) Configuration
TTS_ENABLED=true
TTS_PRIMARY_ENGINE=edge
TTS_FALLBACK_ENABLED=true
TTS_VOICE_DEFAULT=en-US-AriaNeural

# Assembly AI for STT (optional)
ASSEMBLYAI_API_KEY=your_assemblyai_key_here
```

### External Services
```bash
# Mapbox secret token for backend operations
MAPBOX_SECRET_TOKEN=sk.your_mapbox_secret_token_here

# Redis for caching and task queues
REDIS_URL=redis://localhost:6379

# Celery configuration
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

### CORS & Security
```bash
# CORS origins (comma-separated)
CORS_ORIGINS=http://localhost:3000,http://localhost:8080,https://wheelsandwins.com
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080

# Additional origins for development/staging
ADDITIONAL_CORS_ORIGINS=https://staging.wheelsandwins.com
ENABLE_LOVABLE_ORIGINS=true
DISABLE_LOVABLE_ORIGINS=false
```

### Monitoring & Observability
```bash
# Sentry error tracking
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# OpenTelemetry (optional)
OBSERVABILITY_ENABLED=false
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317

# Performance monitoring
PERFORMANCE_MONITORING_ENABLED=true
```

### Payment Processing
```bash
# Stripe integration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

## Environment-Specific Configurations

### Development (.env.development)
```bash
# Development-specific overrides
ENVIRONMENT=development
DEBUG=true
VITE_SUPABASE_URL=http://localhost:54321
VITE_BACKEND_URL=http://localhost:8000
CORS_ORIGINS=http://localhost:3000,http://localhost:8080,http://localhost:5173
```

### Staging (.env.staging)
```bash
# Staging environment
ENVIRONMENT=staging
DEBUG=false
VITE_SENTRY_ENVIRONMENT=staging
OBSERVABILITY_ENABLED=true
```

### Production (.env.production)
```bash
# Production environment
ENVIRONMENT=production
DEBUG=false
TLS_REQUIRED=true
OBSERVABILITY_ENABLED=true
PERFORMANCE_MONITORING_ENABLED=true
```

## Security Best Practices

### Environment Variable Security
1. **Never commit actual values** - Use `.env.example` for documentation
2. **Use different keys per environment** - Separate dev/staging/prod secrets
3. **Rotate keys regularly** - Especially API keys and secret keys
4. **Restrict API key permissions** - Use minimal required scopes
5. **Monitor key usage** - Track API usage for unusual patterns

### Mapbox Token Security
- **Public tokens**: URL-restricted, read-only scopes only
- **Secret tokens**: Server-side only, never expose to frontend
- **Scope limiting**: Grant minimal required permissions

### Database Security
- **Service role keys**: Use only for backend services
- **Anon keys**: Frontend-safe, limited permissions
- **Connection encryption**: Always use TLS/SSL in production

## Environment Variable Validation

### Frontend Validation (src/config/env-validator.ts)
```typescript
// Validates required environment variables at build time
const requiredVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_MAPBOX_PUBLIC_TOKEN'
];

// Warns about missing optional variables
const optionalVars = [
  'VITE_SENTRY_DSN',
  'VITE_YOUTUBE_API_KEY'
];
```

### Backend Validation (app/core/environment_validator.py)
```python
# Validates critical configuration at startup
required_settings = [
    'SUPABASE_URL',
    'SUPABASE_KEY', 
    'SECRET_KEY'
]

# Environment-specific validation
if environment == "production":
    if not openai_key:
        logger.warning("OPENAI_API_KEY not set - PAM features limited")
```

## Deployment Configuration

### Netlify Environment Variables
Set in Netlify dashboard under Site Settings > Environment Variables:
- All `VITE_*` variables
- Build-specific variables
- Deploy previews get staging values

### Render Environment Variables
Set in Render dashboard for each service:
- Backend API service gets all backend variables
- Redis service auto-provides `REDIS_URL`
- Worker services inherit from main service

### Environment Variable Precedence
1. System environment variables (highest priority)
2. `.env.local` file
3. `.env.{environment}` file (e.g., `.env.production`)
4. `.env` file
5. Default values in code (lowest priority)

## Troubleshooting

### Common Issues

#### "Invalid URL" Errors
```bash
# Check for swapped Supabase variables
VITE_SUPABASE_URL=https://...supabase.co  # Should be URL
VITE_SUPABASE_ANON_KEY=eyJ...             # Should be JWT token
```

#### CORS Errors
```bash
# Ensure frontend URL is in CORS_ORIGINS
CORS_ORIGINS=https://your-frontend-domain.com,http://localhost:3000
```

#### PAM Connection Failures
```bash
# Verify WebSocket URL format
VITE_PAM_WEBSOCKET_URL=wss://pam-backend.onrender.com/api/v1/pam/ws
```

#### Missing API Features
```bash
# Check required API keys are set
OPENAI_API_KEY=sk-...          # For PAM AI features
VITE_YOUTUBE_API_KEY=AIza...   # For trip scraping
VITE_MAPBOX_PUBLIC_TOKEN=pk... # For maps
```

### Debug Environment Variables
```bash
# Enable debug logging
DEBUG=true
VITE_SENTRY_ENVIRONMENT=development

# Build-time debugging
npm run build  # Logs environment variable loading
```

## Migration Notes

### Deprecated Variables
- `VITE_MAPBOX_TOKEN` → Use `VITE_MAPBOX_PUBLIC_TOKEN`
- `VITE_N8N_TRIP_WEBHOOK` → Removed (n8n integration discontinued)

### New Variables (Added Recently)
- `VITE_PAM_WEBSOCKET_URL` - PAM WebSocket endpoint
- `ASSEMBLYAI_API_KEY` - Enhanced STT capabilities
- `OBSERVABILITY_ENABLED` - OpenTelemetry monitoring
- `PERFORMANCE_MONITORING_ENABLED` - Performance tracking

---

**Note**: Always use `.env.example` as the authoritative reference for current environment variables. This documentation reflects the state as of the latest codebase audit.