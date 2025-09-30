# PAM Hybrid System - Deployment Guide

**Version:** 3.0 Hybrid
**Date:** September 30, 2025
**Status:** Ready for Testing

## Quick Start

### Testing the Hybrid System

1. **Visit the test page:**
   ```
   https://wheels-wins-staging.netlify.app/pam-hybrid-test
   ```

2. **Try simple queries:**
   - "What's my current balance?"
   - "Show me my recent trips"
   - These will use GPT-4o-mini (fast & cheap)

3. **Try complex tasks:**
   - "Plan a 2-week RV trip from SF to Seattle under $2000"
   - "Analyze my spending patterns and suggest optimizations"
   - These will use Claude Agent SDK (specialized agents)

## Environment Variables

### Backend (.env)

```bash
# Required for Hybrid System
OPENAI_API_KEY=sk-proj-...        # For GPT-4o-mini
ANTHROPIC_API_KEY=sk-ant-...      # For Claude Agent SDK

# Existing variables (keep these)
DATABASE_URL=postgresql://...
SUPABASE_SERVICE_ROLE_KEY=...
REDIS_URL=redis://...
```

### Frontend (.env)

```bash
# Use staging backend for testing
VITE_API_BASE_URL=https://wheels-wins-backend-staging.onrender.com

# Existing variables (keep these)
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## API Endpoints

### Staging Backend
- **Base URL:** `https://wheels-wins-backend-staging.onrender.com`
- **Health:** `GET /api/v1/pam-hybrid/health`
- **Chat:** `POST /api/v1/pam-hybrid/chat`
- **WebSocket:** `wss://wheels-wins-backend-staging.onrender.com/api/v1/pam-hybrid/ws/{user_id}`
- **Metrics:** `GET /api/v1/pam-hybrid/metrics`

### Production Backend (when ready)
- **Base URL:** `https://pam-backend.onrender.com`
- **Health:** `GET /api/v1/pam-hybrid/health`
- **Chat:** `POST /api/v1/pam-hybrid/chat`
- **WebSocket:** `wss://pam-backend.onrender.com/api/v1/pam-hybrid/ws/{user_id}`
- **Metrics:** `GET /api/v1/pam-hybrid/metrics`

## Deployment Steps

### Phase 1: Staging Deployment (Current)

1. **Backend Deployment (Render)**

   ```bash
   # SSH into staging server or use Render dashboard

   # Install new dependencies
   pip install openai>=1.50.0 anthropic>=0.40.0

   # Set environment variables in Render dashboard:
   OPENAI_API_KEY=sk-proj-...
   ANTHROPIC_API_KEY=sk-ant-...

   # Deploy will happen automatically via GitHub push
   ```

2. **Frontend Deployment (Netlify)**

   ```bash
   # Push to staging branch
   git push origin staging

   # Netlify will auto-deploy to:
   # https://wheels-wins-staging.netlify.app
   ```

3. **Test the System**
   - Visit: https://wheels-wins-staging.netlify.app/pam-hybrid-test
   - Check health endpoint
   - Try simple and complex queries
   - Monitor costs and latency

### Phase 2: Production Deployment (After Testing)

1. **Merge to Main**

   ```bash
   # After successful staging tests
   git checkout main
   git merge staging
   git push origin main
   ```

2. **Update Environment Variables**
   - Production backend: Add OPENAI_API_KEY and ANTHROPIC_API_KEY
   - Production frontend: Ensure VITE_API_BASE_URL points to production

3. **Gradual Rollout**
   - Start with 10% of users
   - Monitor costs and performance
   - Gradually increase to 100%

### Phase 3: Sunset Old System

1. **Disable GPT-5 routing** (after 2 weeks of stable hybrid system)
2. **Remove deprecated code** (PAM 1.0, PAM 2.0, old implementations)
3. **Update documentation** and remove old references

## Cost Monitoring

### Expected Costs

**Current (GPT-5):**
- Average: $0.00213 per query
- Monthly (100K queries): $213

**Hybrid System:**
- Average: $0.00028 per query
- Monthly (100K queries): $28
- **Savings: $185/month (87%)**

### Monitoring Dashboard

Access metrics at:
```
GET /api/v1/pam-hybrid/metrics
```

Returns:
```json
{
  "orchestrator_metrics": {
    "dashboard": { "total_requests": 100, "total_cost_usd": 0.05 },
    "budget": { "total_requests": 50, "total_cost_usd": 0.10 },
    "trip": { "total_requests": 30, "total_cost_usd": 0.12 }
  },
  "tools_loaded": 40
}
```

### Cost Alerts

Set up alerts if:
- Daily cost exceeds $5
- Average cost per query > $0.001
- Claude agent usage > 10% (should be ~5%)

## Architecture Overview

```
Frontend (React + TypeScript)
  ↓
pamHybridService.ts
  ↓
WebSocket or REST API
  ↓
Backend: /api/v1/pam-hybrid/
  ↓
HybridGateway
  ├─ ComplexityClassifier
  ├─ ComplexityRouter
  │   ├─ GPT4oMiniHandler (95%)
  │   └─ AgentOrchestrator (5%)
  │       ├─ Dashboard Agent
  │       ├─ Budget Agent
  │       ├─ Trip Agent
  │       ├─ Community Agent
  │       └─ Shop Agent
  └─ ContextManager (shared memory)
```

## Testing Checklist

- [ ] Health endpoint returns 200
- [ ] Simple query uses GPT-4o-mini
- [ ] Complex query uses Claude agent
- [ ] WebSocket connection stable
- [ ] Costs are tracking correctly
- [ ] Average latency < 2s
- [ ] Error handling works (test with bad input)
- [ ] Reconnection works after disconnect
- [ ] Conversation context preserved
- [ ] Tools are being called correctly

## Troubleshooting

### Issue: Health check fails

```bash
# Check if service is running
curl https://wheels-wins-backend-staging.onrender.com/api/v1/pam-hybrid/health

# Check logs in Render dashboard
# Verify environment variables are set
```

### Issue: "Failed to initialize Hybrid Gateway"

**Cause:** Missing API keys

**Fix:**
```bash
# In Render dashboard, add:
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...

# Redeploy service
```

### Issue: All queries using Claude (expensive)

**Cause:** Classifier not working correctly

**Fix:**
1. Check backend logs for classification results
2. Review `ComplexityClassifier` logic
3. Adjust thresholds in `core/config.py`

### Issue: WebSocket disconnects immediately

**Cause:** Authentication issue

**Fix:**
1. Verify JWT token is being sent
2. Check token format in WebSocket URL
3. Review backend auth logs

## Rollback Plan

If issues occur in production:

### Quick Rollback (5 minutes)

1. **Disable Hybrid Router in main.py**
   ```python
   # Comment out hybrid router
   # app.include_router(pam_hybrid.router, ...)
   ```

2. **Redeploy**
   ```bash
   git revert HEAD
   git push origin main
   ```

3. **Switch back to old PAM**
   - Users will automatically use existing PAM system
   - No data loss

### Full Rollback (15 minutes)

1. Restore from emergency backup branch:
   ```bash
   git checkout EMERGENCY-BACKUP-PRE-HYBRID-20250930-203710
   git push origin main --force
   ```

2. Wait for auto-deployment

## Success Metrics

### Week 1 Goals
- [ ] Zero critical errors
- [ ] Average latency < 2s
- [ ] Cost per query < $0.0005
- [ ] 95% of queries using GPT-4o-mini

### Week 2 Goals
- [ ] User satisfaction > 4.5/5
- [ ] Cost reduction > 75%
- [ ] Zero service interruptions
- [ ] All 5 agents functioning correctly

### Month 1 Goals
- [ ] Total cost < $50 for 100K queries
- [ ] System handling 100% of traffic
- [ ] Old system deprecated
- [ ] Documentation complete

## Support

### Development Team
- **Technical Lead:** Engineering Team
- **Backend:** FastAPI + Python
- **Frontend:** React + TypeScript
- **Infrastructure:** Render (backend), Netlify (frontend)

### Resources
- **Architecture Doc:** `HYBRID_PAM_ARCHITECTURE.md`
- **Production Inventory:** `PRODUCTION_PAM_INVENTORY.md`
- **Code Location:** `backend/app/services/pam_hybrid/`
- **Frontend:** `src/services/pamHybridService.ts`

### Getting Help
- Check logs first (Render dashboard)
- Review health endpoint
- Test with `/pam-hybrid-test` page
- Check environment variables
- Review this deployment guide

---

**Last Updated:** September 30, 2025
**Status:** Ready for Staging Deployment
**Next:** Test on staging, then production rollout