# Render Deployment Guide

## Quick Setup Checklist

### ✅ Fixed Issues

1. **Dependencies**: Removed duplicate packages and version conflicts
   - Fixed duplicate `python-jose` and `passlib` entries
   - Aligned `pillow==11.0.0` across all files
   - Updated `TTS==0.22.0` for Python 3.11 compatibility
   - Pinned `sentry-sdk==1.45.0` to avoid import issues

2. **Docker Build**: Optimized for Render deployment
   - Multi-stage build reduces image size
   - Proper health check endpoint at `/health`
   - Port 10000 configured correctly for Render
   - Non-root user for security

3. **Celery Worker**: Fixed worker configuration
   - Corrected path: `app.workers.celery` (not `app.tasks.celery_worker`)
   - Proper Redis connection sharing
   - All environment variables configured

4. **Health Checks**: Standardized endpoints
   - `/health` - Basic health check (matches Render config)
   - `/health/detailed` - Service status
   - `/health/ready` - Readiness probe
   - `/health/live` - Liveness probe

## Environment Variables Required in Render

Set these in your Render dashboard:

```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-...
SENTRY_DSN=https://...
PORT=10000
```

## Render Services Configuration

### Web Service (pam-web)
- **Environment**: Docker
- **Dockerfile Path**: `./backend/Dockerfile`
- **Docker Context**: `.` (project root)
- **Port**: 10000
- **Health Check Path**: `/health`

### Celery Worker (pam-celery)
- **Environment**: Docker
- **Dockerfile Path**: `./backend/Dockerfile`
- **Docker Context**: `.` (project root)
- **Start Command**: `celery -A app.workers.celery worker --loglevel=info --concurrency=2`

## Deployment Steps

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "fix: optimize for Render deployment"
   git push origin main
   ```

2. **Verify Build Locally** (optional):
   ```bash
   cd backend
   python test_smoke.py
   chmod +x verify_build.sh
   ./verify_build.sh
   ```

3. **Deploy to Render**:
   - Go to Render dashboard
   - Select your service
   - Click "Manual Deploy" or wait for auto-deploy
   - Monitor logs for successful startup

## Expected Success Indicators

✅ **Build Phase**: No dependency conflicts, all packages install
✅ **Health Check**: `/health` returns 200 status
✅ **Celery**: Worker connects to Redis successfully  
✅ **Application**: FastAPI starts on port 10000

## Troubleshooting

### Build Failures
- Check `requirements.txt` for version conflicts
- Verify Python 3.11 compatibility of all packages
- Look for missing system dependencies in Dockerfile

### Runtime Failures  
- Check environment variables are set correctly
- Verify Redis/Database URLs are accessible
- Monitor application logs for import errors

### Health Check Failures
- Ensure `/health` endpoint returns within 30 seconds
- Check if database connections are working
- Verify Redis connectivity

## Quick Test Commands

```bash
# Test health endpoint locally
curl http://localhost:10000/health

# Test Celery worker
celery -A app.workers.celery inspect active

# Check Python imports
python -c "from app.main import app; print('✅ App imports OK')"
```

## Files Modified for Render Compatibility

- `requirements.txt` - Cleaned dependencies, fixed versions
- `render.yaml` - Corrected Celery worker path
- `backend/Dockerfile` - Optimized build and runtime
- `backend/app/main.py` - Fixed health endpoint routing
- `backend/.dockerignore` - Reduced build context size

Your application should now deploy successfully to Render! 🚀