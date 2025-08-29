# Staging Memory Fix for Render Deployment

## Problem
Render has a catch-22 situation with memory upgrades:
- The Starter tier (2GB RAM) upgrade only activates after a successful deploy
- But the app needs 2GB RAM to deploy successfully (SentenceTransformer uses ~1GB)
- Current free tier only has 512MB RAM

## Solution
We've implemented a staging-specific configuration that disables heavy AI models during initial deployment.

## Files Created/Modified

### 1. `backend/app/core/staging_config.py`
- Detects staging environment
- Sets environment variables to disable heavy models
- Reduces worker threads to conserve memory

### 2. `backend/app/main.py`
- Modified to import staging config BEFORE other imports
- This ensures environment variables are set early

### 3. `backend/deploy_staging_fix.sh`
- Deployment script that sets staging environment
- Can be used as Render's start command

## How to Deploy

### Option 1: Update Render Start Command
In your Render dashboard, update the start command to:
```bash
cd backend && python -c "import app.core.staging_config" && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Option 2: Use Environment Variable
Add this environment variable in Render:
```
ENVIRONMENT=staging
```

Then deploy normally. The app will detect staging and disable heavy models.

### Option 3: Use Deploy Script
Update start command to:
```bash
cd backend && bash deploy_staging_fix.sh
```

## What Gets Disabled in Staging

1. **Sentence Transformers** - The main memory hog (~1GB)
2. **ChromaDB default models** - Vector database embeddings
3. **Multiple worker processes** - Reduced to single worker
4. **Heavy AI models** - Switched to lightweight alternatives

## After Successful Deploy

Once the Starter tier (2GB RAM) is active:
1. Remove the `ENVIRONMENT=staging` variable
2. Or set it to `ENVIRONMENT=production`
3. Redeploy to enable full features

## Monitoring

Check the logs for these messages:
- "🚧 Running in STAGING mode with reduced memory footprint"
- "✅ Heavy models disabled for staging"

## Troubleshooting

If deploy still fails:
1. Check logs for the actual error
2. Ensure `ENVIRONMENT=staging` is set
3. Try the direct Python command approach (Option 1)
4. Contact Render support about the memory upgrade catch-22

## Technical Details

The staging config works by:
1. Setting environment variables BEFORE imports
2. Preventing heavy libraries from loading
3. Using lightweight alternatives where possible
4. Reducing concurrent workers

This allows the app to start with <512MB RAM while maintaining core functionality.