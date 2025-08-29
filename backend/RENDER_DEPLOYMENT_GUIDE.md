# PAM Backend Deployment Guide for Render.com

## Current Status Analysis ✅

### Production Backend Status
- **URL**: `https://pam-backend.onrender.com` 
- **Status**: ✅ **DEPLOYED AND RUNNING**
- **Health Check**: ✅ Working (`/health` returns healthy)
- **PAM Service**: ✅ Working (`/api/v1/pam/health` returns OpenAI connected)

### Issues Found ⚠️
1. **Missing WebSocket Endpoint**: `/api/v1/pam/ws` returns 404
2. **Authentication Required**: Chat endpoint needs proper JWT tokens
3. **Outdated Deployment**: May be running older version without latest fixes

## Deployment Requirements

### Environment Variables (Required)
```bash
# Application Configuration
ENVIRONMENT=production
DEBUG=false

# Security Keys
SECRET_KEY=<generate-secure-key>
JWT_SECRET_KEY=<generate-secure-key>

# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# OpenAI Configuration
OPENAI_API_KEY=sk-proj-4nMEhJ_ASnQ3EN3QRU1Z...

# TTS Configuration
TTS_ENABLED=true
TTS_PRIMARY_ENGINE=edge
TTS_FALLBACK_ENABLED=true
TTS_VOICE_DEFAULT=en-US-AriaNeural
```

## Step-by-Step Deployment

### Option 1: Update Existing Deployment (Recommended)

Since the backend is already deployed, we need to update it with the latest code:

1. **Access Render Dashboard**
   - Go to https://render.com/dashboard
   - Find the existing `pam-backend` service
   - Click on the service name

2. **Update Environment Variables**
   ```bash
   # Add missing variables in Settings → Environment
   OPENAI_API_KEY=sk-proj-YOUR_OPENAI_API_KEY_HERE
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5Y29rbGltcHpreXJlY2JqZWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNTU4MDAsImV4cCI6MjA2MTgzMTgwMH0.nRZhYxImQ0rOlh0xZjHcdVq2Q2NY0v-9W3wciaxV2EA
   ```

3. **Manual Deploy**
   - Click "Manual Deploy" → "Deploy latest commit"
   - Wait for deployment to complete (5-10 minutes)

4. **Verify Deployment**
   ```bash
   # Test health endpoints
   curl https://pam-backend.onrender.com/health
   curl https://pam-backend.onrender.com/api/v1/pam/health
   
   # Test WebSocket endpoint (should work after update)
   curl https://pam-backend.onrender.com/api/v1/pam/ws
   ```

### Option 2: Fresh Deployment

If updating doesn't work, create a fresh deployment:

1. **Create New Web Service**
   - Go to https://render.com/dashboard
   - Click "New" → "Web Service"
   - Connect GitHub repository
   - Select `backend/` directory

2. **Configure Service**
   ```yaml
   Name: pam-backend-new
   Environment: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1
   Plan: Starter Plus (recommended for production)
   ```

3. **Set Environment Variables**
   Use the complete environment variable list above

4. **Deploy and Test**
   - Click "Create Web Service"
   - Monitor deployment logs
   - Test endpoints after completion

## Expected Endpoints After Deployment

### Working Endpoints ✅
```bash
GET  /health                    # General health check
GET  /api/v1/pam/health        # PAM-specific health check
POST /api/v1/pam/chat          # REST chat endpoint (requires auth)
POST /api/v1/pam/voice         # Voice generation endpoint
```

### Should Be Available After Update ✨
```bash
WS   /api/v1/pam/ws           # WebSocket chat endpoint
GET  /docs                     # FastAPI documentation
POST /api/v1/pam/feedback     # Feedback endpoint
GET  /api/v1/pam/history      # Chat history endpoint
```

## Testing Production Deployment

### 1. Health Checks
```bash
# Basic health
curl https://pam-backend.onrender.com/health

# PAM health (includes OpenAI connectivity)
curl https://pam-backend.onrender.com/api/v1/pam/health
```

### 2. Chat Endpoint (with proper auth)
```bash
# You'll need a valid Supabase JWT token
curl -X POST https://pam-backend.onrender.com/api/v1/pam/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <valid-supabase-jwt>" \
  -d '{"message": "Hello PAM!", "context": {"user_id": "test"}}'
```

### 3. WebSocket Endpoint
Use the frontend or a WebSocket client to test:
```javascript
const ws = new WebSocket('wss://pam-backend.onrender.com/api/v1/pam/ws?token=test');
```

## Troubleshooting

### Common Issues

1. **Environment Variables Missing**
   - Check Render dashboard → Settings → Environment
   - Ensure all required variables are set
   - Redeploy after adding variables

2. **OpenAI API Connection Failed**
   - Verify OPENAI_API_KEY is correct
   - Check API key has sufficient credits
   - Test locally first

3. **Supabase Connection Issues**
   - Verify SUPABASE_URL and SUPABASE_KEY
   - Check Supabase project is active
   - Test database connectivity

4. **WebSocket 404 Errors**
   - Ensure latest code is deployed
   - Check if WebSocket routes are registered
   - Verify FastAPI app includes all routers

### Deployment Logs
Monitor deployment logs in Render dashboard:
- Build logs show dependency installation
- Deploy logs show application startup
- Runtime logs show request handling

## Current Production Analysis

### What's Working ✅
- Basic FastAPI application is running
- Health endpoints are functional
- SimplePamService is connected to OpenAI
- Infrastructure is stable

### What's Missing ⚠️
- WebSocket endpoints for real-time chat
- Proper authentication flow
- Latest code with recent fixes
- Complete API documentation

### Next Steps
1. Update production deployment with latest code
2. Verify all environment variables are set
3. Test WebSocket functionality
4. Confirm frontend can connect properly

## Expected Results

After proper deployment update:
- ✅ Frontend WebSocket connections should work
- ✅ PAM chat should return AI responses instead of presets
- ✅ Voice features should function properly
- ✅ Real-time communication should be established

The infrastructure is solid - we just need to ensure the latest working code is deployed with proper configuration.