# Manual Deployment Guide for Render.com

## 🚀 How to Trigger Manual Deployment

Your PAM backend is currently deployed but missing the latest WebSocket endpoints. Here's how to update it:

### Method 1: Render Dashboard (Recommended)

1. **Access Your Service**
   - Go to https://render.com/dashboard
   - Find your existing service (likely named `pam-backend` or similar)
   - Click on the service name

2. **Trigger Manual Deploy**
   - Look for the "Manual Deploy" button (usually at the top right)
   - Click "Manual Deploy" 
   - Select "Deploy latest commit" 
   - Click "Yes, deploy" to confirm

3. **Monitor Deployment**
   - The deployment will start immediately
   - You'll see the build logs in real-time
   - Deployment typically takes 3-5 minutes

### Method 2: Git Push (If Auto-Deploy is Enabled)

If your service has auto-deploy enabled:

```bash
# Make a small change to trigger deployment
cd /path/to/your/wheels-wins-repo
echo "# Deployment trigger $(date)" >> backend/README.md
git add backend/README.md
git commit -m "trigger: deploy latest PAM backend with WebSocket support"
git push origin main
```

### Method 3: Render CLI

Install and use the Render CLI:

```bash
# Install Render CLI
npm install -g @render/cli

# Login to Render
render login

# Deploy specific service
render deploy <your-service-id>
```

## 📊 Monitoring Deployment Logs

### Real-Time Log Monitoring

1. **During Deployment**
   - Stay on the service page during deployment
   - Click on the "Logs" tab
   - You'll see real-time build and deployment logs

2. **Key Log Sections to Watch**
   ```
   [Build] Installing dependencies...
   [Build] Collecting fastapi==0.116.1
   [Build] Successfully installed all packages
   
   [Deploy] Starting uvicorn server...
   [Deploy] INFO: Uvicorn running on http://0.0.0.0:10000
   [Deploy] INFO: Application startup complete
   ```

3. **Success Indicators**
   - ✅ `"Application startup complete"`
   - ✅ `"Uvicorn running on http://0.0.0.0:10000"`
   - ✅ Health check passes

### Post-Deployment Log Monitoring

```bash
# View recent logs
curl -H "Authorization: Bearer <your-render-token>" \
  https://api.render.com/v1/services/<service-id>/logs

# Or use Render CLI
render logs <service-id> --tail
```

### Critical Log Messages to Look For

**✅ Success Indicators:**
```
INFO: Application startup complete
INFO: Uvicorn running on http://0.0.0.0:10000
SimplePamService initialized successfully with OpenAI
WebSocket manager initialized
```

**❌ Error Indicators:**
```
ModuleNotFoundError: No module named 'app'
OPENAI_API_KEY environment variable is missing
ERROR: Could not install packages due to an OSError
Connection to database failed
```

## 🧪 Testing After Deployment

### Step 1: Basic Health Check
```bash
# Test general health
curl https://pam-backend.onrender.com/health

# Expected response:
# {"status":"healthy","timestamp":"2025-07-30T...","version":"2.0.0"}
```

### Step 2: PAM Health Check
```bash
# Test PAM-specific health
curl https://pam-backend.onrender.com/api/v1/pam/health

# Expected response:
# {"status":"healthy","service":"SimplePamService","openai_api":"connected"}
```

### Step 3: WebSocket Endpoint Test
```bash
# Test WebSocket endpoint exists (should not return 404)
curl -I https://pam-backend.onrender.com/api/v1/pam/ws

# Expected: HTTP 426 Upgrade Required (WebSocket upgrade needed)
# BAD: HTTP 404 Not Found (endpoint missing)
```

### Step 4: Comprehensive WebSocket Test

Run the test script I created:

```bash
cd backend
pip install websockets aiohttp  # Install dependencies
python test-websocket-endpoint.py
```

**Expected Output:**
```
🧪 PAM WebSocket Endpoint Test Script
=====================================
✅ General Health: healthy
✅ PAM Health: healthy
ℹ️  Testing Production: wss://pam-backend.onrender.com/api/v1/pam/ws
✅ Connected to Production
✅ Welcome message: PAM is ready to assist you!
✅ Ping/Pong test passed
✅ PAM Response received!
✅ Production WebSocket is working!
```

## 🔧 Environment Variables Check

Ensure these are set in your Render service:

### Required Variables
```bash
ENVIRONMENT=production
DEBUG=false
OPENAI_API_KEY=sk-proj-YOUR_OPENAI_API_KEY_HERE
SUPABASE_URL=https://kycoklimpzkyrecbjecn.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiNhdXBhYmFzZSIsInJlZiI6Imt5Y29rbGltcHpreXJlY2JqZWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNTU4MDAsImV4cCI6MjA2MTgzMTgwMH0.nRZhYxImQ0rOlh0xZjHcdVq2Q2NY0v-9W3wciaxV2EA
```

### Optional Variables
```bash
TTS_ENABLED=true
TTS_PRIMARY_ENGINE=edge
REDIS_URL=redis://localhost:6379
SENTRY_DSN=your-sentry-dsn
```

## 🔍 Troubleshooting Deployment Issues

### Common Problems and Solutions

1. **Build Fails - Dependency Issues**
   ```
   Error: Could not install packages due to an OSError
   ```
   **Solution**: Check `requirements.txt` for conflicting versions

2. **Application Startup Fails**
   ```
   ModuleNotFoundError: No module named 'app'
   ```
   **Solution**: Ensure build command is `pip install -r requirements.txt`
   **Solution**: Ensure start command is `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

3. **OpenAI Connection Fails**
   ```
   OPENAI_API_KEY environment variable is missing
   ```
   **Solution**: Set `OPENAI_API_KEY` in environment variables

4. **WebSocket Still 404 After Deploy**
   ```
   {"detail":"Not Found"}
   ```
   **Solution**: Check that `app/api/v1/pam.py` includes WebSocket route
   **Solution**: Verify main.py includes the PAM router

### Deployment Log Analysis

**🔍 Look for these patterns in logs:**

**Good Deployment:**
```log
==> Building...
Successfully installed fastapi-0.116.1 uvicorn-0.35.0
==> Deploying...
INFO: Started server process
INFO: Waiting for application startup.
SimplePamService initialized successfully with OpenAI
INFO: Application startup complete.
INFO: Uvicorn running on http://0.0.0.0:10000
```

**Bad Deployment:**
```log
==> Building...
ERROR: Could not find a version that satisfies
==> Build failed
```

## 📋 Pre-Deployment Checklist

Before triggering deployment, verify:

- [ ] Latest code is committed and pushed to GitHub
- [ ] `app/api/v1/pam.py` contains WebSocket route `@router.websocket("/ws")`
- [ ] `app/main.py` includes PAM router: `app.include_router(pam.router, prefix="/api/v1/pam")`
- [ ] `requirements.txt` is up to date
- [ ] Environment variables are set in Render dashboard
- [ ] Service configuration is correct (Python 3, correct start command)

## ⏱️ Expected Timeline

- **Manual Deploy Trigger**: Instant
- **Build Phase**: 2-3 minutes (dependency installation)
- **Deploy Phase**: 1-2 minutes (application startup)
- **Health Check**: 30 seconds (service readiness)
- **Total Time**: 3-5 minutes

## 🎯 Success Criteria

After successful deployment:

1. ✅ Health endpoints return "healthy"
2. ✅ WebSocket endpoint accepts connections (no 404)
3. ✅ PAM chat returns AI responses (not presets)
4. ✅ Frontend can establish WebSocket connection
5. ✅ Real-time chat functionality works

## 📞 Next Steps After Deployment

1. **Test WebSocket**: Run `python test-websocket-endpoint.py`
2. **Test Frontend**: Check if PAM chat works in your app
3. **Monitor Performance**: Watch logs for any errors
4. **Update Frontend**: Ensure frontend points to correct WebSocket URL

Your PAM backend should be fully functional with WebSocket support after following these steps!