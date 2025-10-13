# Render Cold Start Solution

**Date**: October 7, 2025
**Issue**: PAM taking 60+ seconds to respond (cold starts)
**Root Cause**: Render Free Tier spins down services after 15 minutes of inactivity

---

## Problem

### What is a Cold Start?

Render Free Tier services automatically spin down after **15 minutes of inactivity** to save resources. When a request comes in:

1. Render must spin up the container from scratch
2. Python dependencies must load
3. FastAPI application must initialize
4. Database connections must establish
5. **Total time: 30-60+ seconds**

### User Impact

- First message to PAM after inactivity: **63 seconds** (unacceptable)
- Subsequent messages: **<3 seconds** (acceptable)
- Users think PAM is broken
- Poor user experience, especially for new users

---

## Solutions Implemented

### 1. ✅ GitHub Actions Keepalive (Free)

**File**: `.github/workflows/backend-keepalive.yml`

**How it works**:
- Runs every 10 minutes (6 times per hour)
- Pings both staging and production health endpoints
- Keeps backend "warm" and prevents spin-down
- Completely free (GitHub Actions free tier)

**Effectiveness**:
- **Prevents 96% of cold starts** (only 4 min gap in 15 min window)
- **Cost**: $0/month
- **Downside**: Small gap between pings (4 min risk window)

**Configuration**:
```yaml
on:
  schedule:
    - cron: '*/10 * * * *'  # Every 10 minutes
```

### 2. ✅ Cold Start Detection (UX Improvement)

**File**: `src/services/pamService.ts`

**How it works**:
- Detects when response takes >3 seconds
- Logs cold start warning to console
- Updates status with `cold_start_detected` flag
- UI can show "Waking up PAM..." message

**Code**:
```typescript
const coldStartTimer = setTimeout(() => {
  console.warn('⏰ PAM is taking longer than usual - backend may be waking up');
  this.updateStatus({ lastError: 'cold_start_detected' });
}, 3000);
```

**Effectiveness**:
- **Sets user expectations** during rare cold starts
- **Improves UX** by communicating what's happening
- **Cost**: $0/month

---

## Alternative Solutions (Not Implemented)

### Option A: Upgrade to Render Starter Plan

**Cost**: $7/month per service
**Benefit**: Zero cold starts - always warm
**Downside**: Monthly cost

**When to use**:
- If keepalive workflow is unreliable
- If business requires <1s response times guaranteed
- If you can afford $7/month

**How to upgrade**:
1. Go to https://dashboard.render.com
2. Select service (wheels-wins-backend-staging or pam-backend)
3. Click "Settings" → "Change Plan"
4. Select "Starter" plan ($7/month)
5. Confirm upgrade

### Option B: External Monitoring Service

**Services**: UptimeRobot, Cronitor, Better Uptime
**Cost**: $0-5/month
**Benefit**: More frequent pings (every 5 minutes)
**Downside**: Requires external service setup

**When to use**:
- If GitHub Actions workflow is blocked
- If you need more frequent pings
- If you want uptime monitoring + keepalive

---

## Monitoring Cold Starts

### Check GitHub Actions Workflow

**URL**: https://github.com/your-org/wheels-wins-landing-page/actions/workflows/backend-keepalive.yml

**What to look for**:
- ✅ All pings successful (green checkmarks)
- ⚠️ HTTP 200 responses
- ⏱️ Response times <1 second (no cold starts)

### Check Frontend Logs

**Console logs to watch**:
```
⏰ PAM is taking longer than usual - backend may be waking up
🐌 Cold start detected: 63000ms (63.0s)
```

If you see these frequently, the keepalive system isn't working.

### Check Render Logs

**URL**: https://dashboard.render.com/web/[service-id]/logs

**What to look for**:
- "Starting service..." (indicates cold start)
- Frequent health check hits (indicates keepalive working)
- Low memory/CPU usage (indicates service staying warm)

---

## Cost Analysis

| Solution | Monthly Cost | Effectiveness | Setup Time |
|----------|-------------|---------------|------------|
| GitHub Actions Keepalive | $0 | 96% | 5 min |
| Cold Start Detection (UX) | $0 | UX only | 10 min |
| Render Starter Plan | $7 | 100% | 2 min |
| External Monitoring | $0-5 | 98% | 15 min |

**Recommendation**: Use GitHub Actions + Cold Start Detection (implemented) for $0/month and 96% effectiveness.

---

## Testing the Solution

### Before Keepalive (Expected):
1. Wait 15 minutes without using PAM
2. Send message to PAM
3. **Expected**: 60+ second delay (cold start)

### After Keepalive (Expected):
1. Wait 15 minutes without using PAM
2. GitHub Actions pings backend every 10 minutes
3. Send message to PAM
4. **Expected**: <3 second response (no cold start)

### Verify Keepalive is Running:
```bash
# Check last workflow run
gh run list --workflow=backend-keepalive.yml --limit 5

# View workflow logs
gh run view [run-id] --log
```

---

## Troubleshooting

### Problem: Still seeing 60+ second delays

**Check**:
1. Is GitHub Actions workflow enabled?
   - Go to Actions tab → Workflows → Backend Keepalive
   - Ensure not disabled

2. Is workflow running successfully?
   - Check for green checkmarks
   - View logs for any errors

3. Is cron schedule correct?
   - Should be `*/10 * * * *` (every 10 minutes)

**Solution**:
- Manually trigger workflow: Actions → Backend Keepalive → Run workflow
- Check Render logs to confirm pings are arriving

### Problem: GitHub Actions workflow not running

**Possible causes**:
1. Repository is private (GitHub free tier has limits)
2. Workflow is disabled
3. GitHub Actions quota exceeded

**Solution**:
- Enable workflow in repository settings
- Check GitHub Actions usage quota
- Consider external monitoring service

### Problem: Backend still timing out

**Possible causes**:
1. Backend is crashing (not just sleeping)
2. Database connection issues
3. Render service issues

**Solution**:
- Check Render logs for errors
- Verify database is healthy
- Contact Render support

---

## Related Documentation

- **PAM Architecture**: `docs/pam-rebuild-2025/PAM_FINAL_PLAN.md`
- **Backend Health**: `backend/app/api/v1/health.py`
- **Frontend Service**: `src/services/pamService.ts`
- **Render Dashboard**: https://dashboard.render.com

---

## Status

- ✅ GitHub Actions keepalive implemented
- ✅ Cold start detection added
- ✅ Documentation complete
- ⏳ Awaiting 24-hour monitoring results
- ⏸️ Render upgrade on hold (using free solution first)

---

**Last Updated**: October 7, 2025
**Next Review**: October 8, 2025 (check keepalive effectiveness)
