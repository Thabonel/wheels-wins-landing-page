# PAM 2.0 Render Deployment Guide
========================================

## 🚀 Quick Deployment to Render

### Step 1: Create New Render Service

1. **Go to Render Dashboard**: https://dashboard.render.com/
2. **Create New Web Service**
3. **Configure Service**:

```
Repository: wheels-wins-landing-page
Branch: feature/pam2-staging-deployment
Root Directory: backend/pam2_backend
```

### Step 2: Build Configuration

```
Build Command: ./render-build.sh
Start Command: ./render-start.sh
```

### Step 3: Environment Variables

Set these environment variables in Render dashboard:

#### Required Variables
```
PAM2_GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=your_supabase_database_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

#### Staging Configuration
```
PAM2_ENVIRONMENT=staging
PAM2_CORS_ORIGINS=https://wheels-wins-staging.netlify.app,http://localhost:8080
PAM2_TRUSTED_HOSTS=pam2-backend-staging.onrender.com,localhost
PAM2_REDIS_URL=redis://wheels-wins-redis-staging:6379
```

#### Service Settings
```
PAM2_ENABLE_RATE_LIMITING=true
PAM2_RATE_LIMIT_MESSAGES_PER_HOUR=200
PAM2_ENABLE_VOICE_SYNTHESIS=true
PAM2_ENABLE_MCP_PROTOCOL=true
PAM2_ENABLE_ADVANCED_FEATURES=true
```

### Step 4: Service Configuration

- **Name**: `pam2-backend-staging`
- **Region**: `Ohio (US East)`
- **Plan**: `Starter ($7/month)` or `Free`
- **Auto-Deploy**: `Yes`

## 🔧 Expected Service URL

Your PAM 2.0 staging backend will be available at:
```
https://pam2-backend-staging.onrender.com
```

## 🧪 Health Check Endpoints

After deployment, verify these endpoints:

```bash
# Basic health check
curl https://pam2-backend-staging.onrender.com/health

# Detailed health check
curl https://pam2-backend-staging.onrender.com/api/v1/health

# Enhanced services health
curl https://pam2-backend-staging.onrender.com/api/v1/enhanced/health

# API documentation
https://pam2-backend-staging.onrender.com/docs
```

## 🎯 Testing Endpoints

### Core Chat API
```bash
curl -X POST https://pam2-backend-staging.onrender.com/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test", "message": "Hello PAM2"}'
```

### Voice Synthesis
```bash
curl -X POST https://pam2-backend-staging.onrender.com/api/v1/enhanced/voice/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello from PAM2", "user_id": "test"}'
```

### MCP Tools
```bash
curl https://pam2-backend-staging.onrender.com/api/v1/enhanced/mcp/tools
```

### Intelligent Chat
```bash
curl -X POST https://pam2-backend-staging.onrender.com/api/v1/enhanced/intelligent/chat \
  -H "Content-Type: application/json" \
  -d '{"text": "Plan a trip to Tokyo", "user_id": "test"}'
```

## 🔄 Frontend Integration

Update staging frontend environment to use PAM2:

```bash
# In Netlify staging deployment settings:
VITE_API_BASE_URL=https://pam2-backend-staging.onrender.com
```

## 📊 Success Metrics

PAM2 staging is ready when:

- ✅ Health endpoints return 200 OK
- ✅ Chat API responds correctly
- ✅ Enhanced features (voice, MCP, advanced) work
- ✅ No CORS errors from staging frontend
- ✅ Response times <500ms (staging environment)
- ✅ WebSocket connections establish successfully

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**:
   ```bash
   # Check build logs in Render dashboard
   # Common fixes:
   - Ensure all dependencies in requirements.txt
   - Check Python version compatibility
   - Verify file permissions on scripts
   ```

2. **Environment Variable Issues**:
   ```bash
   # Test environment setup
   curl https://pam2-backend-staging.onrender.com/api/v1/debug/info
   ```

3. **Import Errors**:
   ```bash
   # Check Python path and module structure
   # Ensure all __init__.py files exist
   ```

4. **CORS Issues**:
   ```bash
   # Verify PAM2_CORS_ORIGINS includes staging frontend URL
   # Check browser developer tools for CORS errors
   ```

## 🔒 Security Notes

- All API keys stored as Render environment variables
- No secrets in code repository
- CORS properly configured for staging environment
- Rate limiting enabled for API protection

## 📈 Performance Expectations

- **Cold Start**: ~10-15 seconds (free tier)
- **Response Time**: 200-500ms (staging environment)
- **Concurrent Users**: 10-50 (starter plan)
- **Memory Usage**: ~300-500MB

## 🔄 Rollback Strategy

If PAM2 staging fails:

1. **Quick Fix**: Update frontend to point back to original backend
2. **Service Rollback**: Disable PAM2 service in Render
3. **Code Rollback**: Revert to previous branch if needed

---

✨ **PAM 2.0 Staging Ready for Deployment!**