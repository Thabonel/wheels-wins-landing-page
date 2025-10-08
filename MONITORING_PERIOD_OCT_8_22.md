# Production Usage Monitoring Period

**Timeline:** October 8-22, 2025 (2 weeks)
**Purpose:** Collect production usage data before safe code deletion
**Status:** 🟢 ACTIVE

---

## Overview

Before deleting any code flagged by Knip, we're monitoring production usage for 2 weeks to ensure we don't break anything like the `pam_simple.py` incident.

## What's Being Tracked

### Backend (API Endpoints)
- **Middleware:** `backend/app/middleware/usage_tracker.py`
- **Storage:** Redis (30-day retention)
- **Data Collected:**
  - Endpoint path (e.g., `POST:/api/v1/pam/chat`)
  - Call count
  - Timestamps of each call
  - Last used timestamp

### Frontend (Components)
- **Utility:** `src/utils/usageTracking.ts`
- **Storage:** localStorage (production only)
- **Data Collected:**
  - Component name
  - Render count
  - First render timestamp
  - Last render timestamp

## Monitoring Dashboard

### Backend Endpoints
```bash
# Check if tracking is enabled
curl https://wheels-wins-backend-staging.onrender.com/api/v1/usage-tracking/health

# Get usage stats (14 days)
curl https://wheels-wins-backend-staging.onrender.com/api/v1/usage-tracking/stats?days=14

# Find potentially unused endpoints
curl https://wheels-wins-backend-staging.onrender.com/api/v1/usage-tracking/unused?days=14
```

### Frontend Components
Open browser console in production and run:
```javascript
// View usage stats
const stats = JSON.parse(localStorage.getItem('component_usage_Pam'));
console.log(stats);

// Export all usage data
import { exportUsageData } from '@/utils/usageTracking';
console.log(exportUsageData());
```

## Timeline

| Date | Milestone | Status |
|------|-----------|--------|
| Oct 8 | ✅ Monitoring started | COMPLETE |
| Oct 8 | ✅ Knip baseline established | COMPLETE |
| Oct 8 | ✅ Usage tracking deployed | COMPLETE |
| Oct 15 | Week 1 checkpoint | PENDING |
| Oct 22 | Week 2 complete - analyze data | PENDING |
| Oct 22-29 | Combine Knip + usage logs | PENDING |
| Oct 29-Nov 5 | Safe deletion (micro-batches) | PENDING |

## Safety Rules During Monitoring Period

### ⛔ DO NOT:
1. Delete ANY files flagged by Knip
2. Remove ANY exports or functions
3. Uninstall ANY dependencies
4. Make assumptions about "dead code"

### ✅ DO:
1. Monitor usage tracking health daily
2. Review usage stats weekly
3. Document any anomalies
4. Keep staging environment stable

## Known Limitations

### Backend Tracking
- **Requires Redis:** Falls back gracefully if unavailable
- **Local development:** Tracking disabled (Redis not running locally)
- **Staging/Production:** Fully operational with Render Redis

### Frontend Tracking
- **Production only:** `import.meta.env.PROD` check
- **localStorage limits:** ~5-10MB typical browser limit
- **No cross-device sync:** Data stored per-browser

## Analysis Plan (Week 3)

After 2-week monitoring period, we'll:

1. **Export production logs:**
   ```bash
   curl https://wheels-wins-backend-staging.onrender.com/api/v1/usage-tracking/stats?days=14 > production-usage.json
   ```

2. **Export Knip results:**
   ```bash
   npx knip --reporter json > knip-week3-scan.json
   ```

3. **Cross-reference:**
   - Files Knip says are unused
   - Files with ZERO production usage
   - = Safe to delete

4. **Generate deletion plan:**
   ```bash
   ./scripts/generate-deletion-plan.sh
   ```

5. **Delete in micro-batches:**
   - Max 5 files per deployment
   - Test after each batch
   - Tag successful batches for rollback

## Success Criteria

- ✅ Zero production incidents during monitoring
- ✅ Usage data collected for 100+ endpoints
- ✅ Frontend component usage tracked
- ✅ Redis operational on staging/production
- ✅ Weekly checkpoint reviews completed

## Emergency Contacts

If monitoring breaks production:
1. Check `/api/v1/usage-tracking/health`
2. Disable middleware in `backend/app/main.py` (comment out lines 454-456)
3. Redeploy immediately
4. Document incident in this file

---

**Last Updated:** October 8, 2025
**Next Review:** October 15, 2025
**Owner:** Engineering Team
