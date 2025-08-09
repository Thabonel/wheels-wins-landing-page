# Render Staging Deployment Guide - Memory Fix

## Quick Solution

Add this environment variable in your Render staging service:
```
ENVIRONMENT=staging
```

Then redeploy. The app will automatically run in low-memory mode.

## Detailed Steps

### Step 1: Set Environment Variable
1. Go to your Render Dashboard
2. Select `wheels-wins-backend-staging` service
3. Go to "Environment" tab
4. Add new environment variable:
   - Key: `ENVIRONMENT`
   - Value: `staging`
5. Save changes

### Step 2: Trigger Redeploy
1. In Render dashboard, click "Manual Deploy"
2. Select "Deploy latest commit"
3. Watch the logs

### Step 3: Verify Deployment
Look for these messages in the logs:
- "🚧 STAGING MODE DETECTED - Disabling heavy imports"
- "✅ Heavy imports successfully mocked for staging"
- "🚧 Running in STAGING mode with reduced memory footprint"

### Step 4: After Successful Deploy
Once deployed and the 2GB memory is active:
1. You can remove the `ENVIRONMENT=staging` variable
2. Or change it to `ENVIRONMENT=production`
3. Redeploy to enable all features

## What This Fix Does

1. **Prevents Heavy Imports**: Blocks memory-intensive libraries before they load
2. **Mocks Dependencies**: Provides fake versions of SentenceTransformer and ChromaDB
3. **Reduces Workers**: Limits to single worker process
4. **Optimizes Memory**: Keeps usage under 512MB for initial deploy

## Alternative Solutions

### Option A: Modified Start Command
If the environment variable doesn't work, try updating the start command:
```bash
cd backend && ENVIRONMENT=staging uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Option B: Direct Python Command
```bash
cd backend && ENVIRONMENT=staging python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Option C: Use Deploy Script
```bash
cd backend && bash deploy_staging_fix.sh
```

## Files Created

1. **`backend/app/core/staging_config.py`** - Sets staging environment variables
2. **`backend/app/core/import_staging_guard.py`** - Blocks heavy imports
3. **`backend/deploy_staging_fix.sh`** - Deployment helper script
4. **`backend/test_staging_memory.py`** - Test script to verify memory usage

## Testing Locally

To test if the staging mode works:
```bash
cd backend
ENVIRONMENT=staging python test_staging_memory.py
```

## Troubleshooting

### Deploy Still Fails?
1. Check if `ENVIRONMENT=staging` is set correctly
2. Look for import errors in logs
3. Try the alternative start commands
4. Contact Render support about the memory upgrade catch-22

### Memory Still Too High?
1. Check logs for what's using memory
2. Ensure no heavy models are being imported
3. Verify staging guard is running first

### Features Not Working After Deploy?
This is expected! In staging mode:
- PAM knowledge features are limited
- Voice synthesis uses basic engines only
- No vector search capabilities

These will work once you remove staging mode and have 2GB RAM.

## Next Steps

1. Deploy with `ENVIRONMENT=staging`
2. Wait for successful deploy
3. Verify 2GB memory is active in Render dashboard
4. Remove staging environment variable
5. Redeploy for full functionality

## Support

If you need help:
1. Check Render logs for specific errors
2. Run the test script locally
3. Contact Render support about the Starter tier activation issue
4. The staging mode is designed to use <400MB RAM, well under the 512MB limit