# Environment Configuration Guide

## Overview

The Wheels & Wins application uses a comprehensive environment configuration system that provides type safety, validation, and environment-specific settings. This guide covers all environment variables, their purposes, and configuration best practices.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Environment Files](#environment-files)
3. [Core Configuration](#core-configuration)
4. [Feature Flags](#feature-flags)
5. [Service Configuration](#service-configuration)
6. [External APIs](#external-apis)
7. [Security Configuration](#security-configuration)
8. [Monitoring & Logging](#monitoring--logging)
9. [Performance Tuning](#performance-tuning)
10. [Environment Validation](#environment-validation)
11. [Deployment Guides](#deployment-guides)

## Quick Start

### 1. Copy the Example File

```bash
# For production
cp .env.production.example .env.production

# For development
cp .env.example .env

# For staging
cp .env.staging.example .env.staging
```

### 2. Fill in Required Variables

Minimum required variables for the application to start:

```env
# Supabase (Required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Database (Required)
DATABASE_URL=postgresql://user:password@localhost:5432/wheels_wins

# OpenAI (Required for PAM)
OPENAI_API_KEY=your_openai_api_key

# Redis (Required for caching)
REDIS_URL=redis://localhost:6379
```

### 3. Validate Configuration

```bash
# Run validation script
python scripts/validate_env.py

# Or use the built-in validation
python -c "from app.core.environment_config import get_config; print(get_config().validate_configuration())"
```

## Environment Files

### File Structure

```
.
├── .env                    # Development environment (git-ignored)
├── .env.example            # Development template (committed)
├── .env.production         # Production environment (git-ignored)
├── .env.production.example # Production template (committed)
├── .env.staging            # Staging environment (git-ignored)
├── .env.staging.example    # Staging template (committed)
└── .env.test              # Test environment (git-ignored)
```

### Loading Priority

Environment variables are loaded in this order (later overrides earlier):
1. System environment variables
2. `.env` file
3. `.env.{NODE_ENV}` file
4. Process environment variables

## Core Configuration

### Application Settings

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `NODE_ENV` | string | development | Environment mode (development/staging/production) |
| `APP_NAME` | string | Wheels & Wins | Application name |
| `APP_URL` | URL | http://localhost:8080 | Application URL |
| `APP_PORT` | number | 8000 | Backend server port |
| `APP_HOST` | string | 0.0.0.0 | Backend server host |

### OpenAI Configuration

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `OPENAI_API_KEY` | string | Yes | OpenAI API key |
| `OPENAI_MODEL` | string | No | Model to use (default: gpt-4-turbo-preview) |
| `OPENAI_TEMPERATURE` | float | No | Response creativity (0-2, default: 0.7) |
| `OPENAI_MAX_TOKENS` | number | No | Max response tokens (default: 2000) |

### Supabase Configuration

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `SUPABASE_URL` | URL | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | string | Yes | Service role key (backend) |
| `VITE_SUPABASE_URL` | URL | Yes | Supabase URL (frontend) |
| `VITE_SUPABASE_ANON_KEY` | string | Yes | Anonymous key (frontend) |

### Database Configuration

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `DATABASE_URL` | URL | Yes | PostgreSQL connection string |
| `READ_REPLICA_URL` | URL | No | Read replica connection (optional) |
| `DB_POOL_MIN_SIZE` | number | No | Min pool connections (default: 5) |
| `DB_POOL_MAX_SIZE` | number | No | Max pool connections (default: 20) |

## Feature Flags

### PAM AI Features

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `PAM_ENABLED` | boolean | true | Enable PAM assistant |
| `PAM_CACHE_ENABLED` | boolean | true | Enable response caching |
| `PAM_LEARNING_ENABLED` | boolean | false | Enable ML features |
| `PAM_PROACTIVE_ENABLED` | boolean | false | Enable proactive suggestions |
| `PAM_VOICE_ENABLED` | boolean | true | Enable voice features |
| `PAM_FUNCTION_CALLING_ENABLED` | boolean | true | Enable function calling |

### Security Features

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `SECURITY_ENHANCED_MODE` | boolean | true | Enhanced security checks |
| `SECURITY_RATE_LIMITING` | boolean | true | Enable rate limiting |
| `SECURITY_MESSAGE_VALIDATION` | boolean | true | Validate messages |
| `SECURITY_IP_REPUTATION` | boolean | true | Check IP reputation |
| `SECURITY_AUDIT_LOGGING` | boolean | true | Enable audit logs |

### Performance Features

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `PERFORMANCE_CACHING` | boolean | true | Enable caching |
| `PERFORMANCE_CONNECTION_POOLING` | boolean | true | Use connection pools |
| `PERFORMANCE_QUERY_OPTIMIZATION` | boolean | true | Optimize queries |
| `PERFORMANCE_COMPRESSION` | boolean | true | Enable compression |

## Service Configuration

### TTS (Text-to-Speech)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `TTS_ENABLED` | boolean | true | Enable TTS |
| `TTS_PRIMARY_ENGINE` | string | edge | Primary engine (edge/coqui/system) |
| `TTS_FALLBACK_ENABLED` | boolean | true | Enable fallback engines |
| `TTS_VOICE_DEFAULT` | string | en-US-AriaNeural | Default voice |
| `TTS_CACHE_ENABLED` | boolean | true | Cache TTS responses |

### WebSocket

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `WEBSOCKET_ENABLED` | boolean | true | Enable WebSocket |
| `WEBSOCKET_MAX_CONNECTIONS` | number | 1000 | Max concurrent connections |
| `WEBSOCKET_CONNECTION_TIMEOUT` | number | 300 | Connection timeout (seconds) |
| `WEBSOCKET_MAX_MESSAGE_SIZE` | number | 65536 | Max message size (bytes) |

### Voice

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `VOICE_ENABLED` | boolean | true | Enable voice features |
| `VOICE_RATE_LIMIT` | number | 10 | Messages per minute |
| `VOICE_MAX_DURATION` | number | 60 | Max recording duration |

## External APIs

### Google Services

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `GOOGLE_PLACES_API_KEY` | string | Recommended | Google Places API |
| `YOUTUBE_API_KEY` | string | Optional | YouTube Data API |
| `VITE_GOOGLE_MAPS_API_KEY` | string | Recommended | Google Maps (frontend) |

### Mapbox

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `VITE_MAPBOX_PUBLIC_TOKEN` | string | Yes | Public token (frontend) |
| `MAPBOX_SECRET_TOKEN` | string | Recommended | Secret token (backend) |

### Redis Cache

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `REDIS_ENABLED` | boolean | true | Enable Redis |
| `REDIS_URL` | URL | redis://localhost:6379 | Redis connection |
| `REDIS_PASSWORD` | string | None | Redis password |
| `REDIS_CACHE_TTL` | number | 300 | Default TTL (seconds) |

## Security Configuration

### JWT Settings

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `JWT_SECRET_KEY` | string | Auto-generated | JWT signing key (min 32 chars) |
| `JWT_ALGORITHM` | string | HS256 | JWT algorithm |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | number | 30 | Access token lifetime |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS` | number | 7 | Refresh token lifetime |

### CORS Settings

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `CORS_ENABLED` | boolean | true | Enable CORS |
| `CORS_ALLOWED_ORIGINS` | string | http://localhost:8080 | Allowed origins (comma-separated) |
| `CORS_ALLOW_CREDENTIALS` | boolean | true | Allow credentials |

### Session Security

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `SESSION_SECRET_KEY` | string | Auto-generated | Session signing key |
| `SESSION_COOKIE_SECURE` | boolean | true | Secure cookies (HTTPS) |
| `SESSION_COOKIE_HTTPONLY` | boolean | true | HTTP-only cookies |
| `SESSION_COOKIE_SAMESITE` | string | strict | SameSite policy |

## Monitoring & Logging

### Sentry Error Tracking

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `SENTRY_ENABLED` | boolean | No | Enable Sentry |
| `SENTRY_DSN` | URL | If enabled | Sentry DSN |
| `SENTRY_ENVIRONMENT` | string | No | Environment name |

### Logging

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `LOG_LEVEL` | string | INFO | Log level (DEBUG/INFO/WARNING/ERROR) |
| `LOG_FORMAT` | string | json | Log format (json/text) |
| `LOG_FILE_ENABLED` | boolean | true | Enable file logging |
| `LOG_FILE_PATH` | string | /var/log/wheels-wins/app.log | Log file path |

## Performance Tuning

### Database Pool

```env
# Connection pool settings
DB_POOL_MIN_SIZE=5          # Minimum connections
DB_POOL_MAX_SIZE=20         # Maximum connections
DB_POOL_TIMEOUT=10          # Connection timeout (seconds)
DB_POOL_COMMAND_TIMEOUT=60  # Query timeout (seconds)
DB_POOL_MAX_IDLE_TIME=300   # Max idle time (seconds)
```

### Cache Configuration

```env
# Cache settings
CACHE_DEFAULT_TTL=300              # Default TTL (seconds)
CACHE_MAX_MEMORY_ITEMS=1000        # Max in-memory items
CACHE_COMPRESSION_ENABLED=true     # Enable compression
CACHE_COMPRESSION_THRESHOLD=1024   # Compression threshold (bytes)
```

### Query Optimization

```env
# Query settings
QUERY_SLOW_THRESHOLD_MS=100    # Slow query threshold
QUERY_CACHE_ENABLED=true        # Enable query caching
QUERY_PLAN_CACHE_SIZE=100       # Query plan cache size
```

## Environment Validation

### Using the Validation System

```python
from app.core.environment_config import get_config

config = get_config()
validation = config.validate_configuration()

if not validation["valid"]:
    print(f"Configuration issues: {validation['issues']}")
    
if validation["warnings"]:
    print(f"Warnings: {validation['warnings']}")
```

### Validation Checks

The system validates:
- Required services availability
- Production-specific requirements
- Security settings
- Performance configurations
- API key formats
- URL validity

## Deployment Guides

### Production Deployment

1. **Security First**
   ```env
   NODE_ENV=production
   SECURITY_ENHANCED_MODE=true
   SESSION_COOKIE_SECURE=true
   CORS_ALLOWED_ORIGINS=https://wheelswins.com
   ```

2. **Enable Monitoring**
   ```env
   SENTRY_ENABLED=true
   SENTRY_DSN=your_sentry_dsn
   LOG_LEVEL=INFO
   ```

3. **Optimize Performance**
   ```env
   PERFORMANCE_CACHING=true
   DB_POOL_MAX_SIZE=20
   REDIS_ENABLED=true
   ```

### Staging Deployment

```env
NODE_ENV=staging
APP_URL=https://staging.wheelswins.com
LOG_LEVEL=DEBUG
SENTRY_ENVIRONMENT=staging
```

### Development Setup

```env
NODE_ENV=development
APP_URL=http://localhost:8080
LOG_LEVEL=DEBUG
CORS_ALLOWED_ORIGINS=http://localhost:8080,http://localhost:3000
```

## Best Practices

### 1. Never Commit Secrets

```bash
# Add to .gitignore
.env
.env.production
.env.staging
```

### 2. Use Strong Keys

```python
# Generate secure keys
import secrets
jwt_key = secrets.token_urlsafe(32)
session_key = secrets.token_urlsafe(32)
```

### 3. Environment-Specific Configs

```bash
# Use separate files
.env.development  # Local development
.env.staging      # Staging server
.env.production   # Production server
```

### 4. Validate Before Deployment

```bash
# Run validation
python scripts/validate_env.py --env production
```

### 5. Monitor Configuration

```python
# Log configuration status
config = get_config()
logger.info(f"Configuration loaded: {config.export_safe_config()}")
```

## Troubleshooting

### Common Issues

1. **Missing Required Variables**
   - Check validation output
   - Ensure all required services are configured

2. **Invalid URLs**
   - Verify URL format includes protocol
   - Check for typos in domain names

3. **Weak Security Keys**
   - Keys must be at least 32 characters
   - Use secure random generation

4. **Connection Issues**
   - Verify database URL is correct
   - Check Redis connection string
   - Ensure services are running

### Debug Mode

```env
# Enable debug logging
LOG_LEVEL=DEBUG
BACKEND_DEBUG=true
```

### Health Check Endpoint

```bash
# Check configuration status
curl http://localhost:8000/api/health/config
```

## Support

For environment configuration issues:
1. Check this documentation
2. Run the validation script
3. Review error logs
4. Contact the development team

---

Remember: **Always keep production credentials secure and never commit them to version control!**