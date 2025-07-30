# Production Issues - Comprehensive Fix Deployment Guide

## 🚨 Critical Issues Addressed

Based on the production logs analysis, this guide addresses the following critical issues:

1. **Memory Issues** (70-84.9% usage)
2. **TTS Service Failures** (Edge TTS, fallback systems)
3. **Database Issues** (RLS policies, missing tables)
4. **WebSocket Problems** (timeouts, heartbeat failures)
5. **CORS Configuration** (400 status codes)
6. **Performance Issues** (high CPU, slow requests)
7. **Disk Space Concerns** (78-84% usage)

## 🎯 Deployment Steps

### Step 1: Database Fixes (CRITICAL - Deploy First)

Run the SQL migration to fix database issues:

```bash
# Connect to your Supabase/PostgreSQL database
psql "postgresql://user:pass@host:port/database"

# Or use Supabase SQL editor and run:
\i critical_database_fixes.sql
```

**What this fixes:**
- ✅ Infinite recursion in `group_trip_participants` RLS policy
- ✅ Creates missing `affiliate_sales` table
- ✅ Creates missing `user_wishlists` and `wishlist_items` tables
- ✅ Adds proper indexes for performance
- ✅ Sets up RLS policies without recursion

### Step 2: Backend Code Updates

Deploy the enhanced backend modules:

```bash
# 1. Enhanced Memory Optimizer
cp app/monitoring/memory_optimizer.py /path/to/production/app/monitoring/

# 2. Fixed Cache Service
cp app/services/cache_service.py /path/to/production/app/services/

# 3. Enhanced WebSocket Manager
cp app/core/websocket_manager.py /path/to/production/app/core/

# 4. Enhanced CORS Configuration
cp app/core/cors_config.py /path/to/production/app/core/

# 5. Enhanced TTS Fallback
cp app/services/tts/fallback_tts.py /path/to/production/app/services/tts/
```

### Step 3: Environment Variables

Add/update the following environment variables:

```bash
# Memory Optimization
MEMORY_OPTIMIZATION_ENABLED=true
MEMORY_WARNING_THRESHOLD=65
MEMORY_CRITICAL_THRESHOLD=75
MEMORY_EMERGENCY_THRESHOLD=85

# TTS Configuration
TTS_ENABLED=true
TTS_PRIMARY_ENGINE=fallback
TTS_FALLBACK_ENABLED=true
TTS_VOICE_DEFAULT=en-US-AriaNeural

# WebSocket Configuration
WEBSOCKET_HEARTBEAT_INTERVAL=20
WEBSOCKET_CONNECTION_TIMEOUT=60
WEBSOCKET_MAX_MISSED_PINGS=3

# CORS Configuration
ENABLE_ENHANCED_CORS=true
CORS_DEBUG_ENABLED=true

# Performance
MAX_RENDER_WORKERS=1
DATABASE_POOL_SIZE=10
CACHE_TTL=180

# Optional API Keys (to resolve missing config warnings)
BING_SEARCH_API_KEY=your_bing_api_key_here
GOOGLE_PLACES_API_KEY=your_google_places_key_here
YELP_API_KEY=your_yelp_api_key_here
```

### Step 4: Service Restart Sequence

Restart services in the correct order:

```bash
# 1. Database first (if you made changes)
# Already done in Step 1

# 2. Redis (to clear any cached data)
sudo systemctl restart redis

# 3. Backend services
sudo systemctl restart pam-backend
sudo systemctl restart celery-worker
sudo systemctl restart celery-beat

# 4. Verify all services are running
sudo systemctl status pam-backend
sudo systemctl status celery-worker
sudo systemctl status celery-beat
```

### Step 5: Monitoring and Verification

Run the health monitor to verify fixes:

```bash
# Copy and run the health monitor
cp production_health_monitor.py /path/to/production/
python3 production_health_monitor.py
```

Expected improvements after deployment:
- ✅ Memory usage should drop below 70%
- ✅ TTS fallback should work without errors
- ✅ Database queries should complete without RLS recursion
- ✅ WebSocket connections should be stable
- ✅ OPTIONS requests should return 200 instead of 400
- ✅ Disk usage monitoring and cleanup should be active

## 📊 Performance Improvements Expected

### Memory Usage
- **Before**: 70-84.9% consistently high
- **After**: 50-65% with aggressive cleanup at 65%
- **Emergency**: Automatic cleanup at 85%+ with malloc trim

### WebSocket Stability
- **Before**: 120-second timeouts, no pong responses
- **After**: 60-second timeouts, 20-second heartbeats, latency tracking

### Database Performance
- **Before**: Infinite recursion errors, missing tables
- **After**: Fixed RLS policies, all tables created, proper indexes

### TTS Reliability
- **Before**: Edge TTS failing, no fallbacks working
- **After**: Multi-tier fallback (Edge → Coqui → System TTS → Text-only)

### CORS Reliability
- **Before**: OPTIONS requests failing with 400 errors
- **After**: Proper preflight handling, enhanced debugging

## 🔍 Monitoring and Alerts

### Key Metrics to Watch

1. **Memory Usage**: Should stay below 70%
2. **Disk Usage**: Should stay below 80%
3. **WebSocket Connections**: Should maintain stable heartbeats
4. **Database Response Times**: Should improve significantly
5. **TTS Success Rate**: Should have working fallbacks

### Log Monitoring

Watch for these improved log messages:

```bash
# Memory Optimization
tail -f /var/log/app.log | grep "🧹\|📊\|🗑️"

# WebSocket Health
tail -f /var/log/app.log | grep "💓\|🔗\|🔌"

# TTS Status
tail -f /var/log/app.log | grep "🎙️\|✅\|🔄"

# Database Health
tail -f /var/log/app.log | grep "affiliate_sales\|user_wishlists\|group_trip"

# CORS Issues
tail -f /var/log/app.log | grep "CORS\|OPTIONS\|preflight"
```

## 🚨 Rollback Plan

If issues occur after deployment:

### Quick Rollback
```bash
# 1. Revert to previous code version
git checkout previous-stable-commit

# 2. Restart services
sudo systemctl restart pam-backend

# 3. Database rollback (if needed)
# Only if the SQL changes cause issues - this should be rare
# as the changes are additive and fix existing problems
```

### Database Rollback (Only if Critical Issues)
```sql
-- Only run this if the database changes cause critical issues
-- This is not recommended as it will re-break the recursive RLS policies

-- Drop new tables (if they cause issues)
DROP TABLE IF EXISTS wishlist_items;
DROP TABLE IF EXISTS user_wishlists;
DROP TABLE IF EXISTS affiliate_sales;

-- Note: RLS policy fixes should NOT be rolled back
-- as they fix the infinite recursion issue
```

## 🔧 Configuration Files to Update

### 1. Render Deployment Configuration
Update `render.backend.yaml`:

```yaml
services:
  - type: web
    name: pam-backend
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1
    envVars:
      - key: MEMORY_OPTIMIZATION_ENABLED
        value: true
      - key: WEBSOCKET_HEARTBEAT_INTERVAL
        value: 20
      - key: TTS_PRIMARY_ENGINE
        value: fallback
```

### 2. Application Startup Configuration
Update `app/main.py` to initialize new services:

```python
# Add to startup event
@app.on_event("startup")
async def startup_event():
    # Initialize memory optimizer
    from app.monitoring.memory_optimizer import memory_optimizer
    await memory_optimizer.start()
    
    # Initialize enhanced cache service
    from app.services.cache_service import cache_service
    await cache_service.initialize()
    
    logger.info("🚀 All production fixes initialized")

@app.on_event("shutdown")
async def shutdown_event():
    # Cleanup memory optimizer
    from app.monitoring.memory_optimizer import memory_optimizer
    await memory_optimizer.stop()
    
    logger.info("🛑 Production services shutdown completed")
```

## 📈 Success Metrics

After deployment, you should see:

### Immediate Improvements (within 1 hour)
- ✅ Memory usage drops from 70-84% to 50-65%
- ✅ Database RLS recursion errors stop completely
- ✅ OPTIONS requests return 200 instead of 400
- ✅ TTS fallback works without eSpeak errors

### Medium-term Improvements (within 24 hours)
- ✅ WebSocket connections remain stable without timeouts
- ✅ Disk usage stabilizes below 80%
- ✅ CPU spikes reduced through better memory management
- ✅ No more missing table errors in logs

### Long-term Improvements (within 1 week)
- ✅ Overall system stability improves
- ✅ Fewer service restarts needed
- ✅ Better user experience with PAM voice features
- ✅ Improved WebSocket connection reliability

## 🆘 Emergency Contacts and Support

If issues arise during deployment:

1. **Database Issues**: Check Supabase dashboard and logs
2. **Memory Issues**: Monitor with `production_health_monitor.py`
3. **WebSocket Issues**: Check connection stats in application logs
4. **TTS Issues**: Verify fallback engines are available

## 📝 Post-Deployment Checklist

- [ ] Run health monitor script
- [ ] Verify memory usage is below 70%
- [ ] Test WebSocket connections don't timeout
- [ ] Confirm database queries work without recursion errors
- [ ] Test TTS functionality with fallbacks
- [ ] Verify OPTIONS requests return 200
- [ ] Monitor logs for 30 minutes for any new errors
- [ ] Check disk usage is being monitored and cleaned
- [ ] Verify all new tables exist and are accessible

## 🎯 Summary

These fixes address all critical production issues identified in the logs:

1. **Memory Management**: Enhanced optimization with emergency cleanup
2. **Database Stability**: Fixed RLS recursion and missing tables
3. **WebSocket Reliability**: Improved heartbeat and connection management
4. **TTS Resilience**: Multi-tier fallback system
5. **CORS Compliance**: Proper OPTIONS request handling
6. **Performance**: Better resource management and monitoring

The deployment should result in a significantly more stable and performant production environment.