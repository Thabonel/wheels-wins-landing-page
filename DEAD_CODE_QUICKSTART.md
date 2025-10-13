# Dead Code Removal - Quick Start Guide
## Get Started in 15 Minutes

**Status:** Ready to implement
**Timeline:** 4 weeks to clean codebase
**Confidence:** HIGH (copying Meta's proven approach)

---

## ⚡ Step 1: Install Knip (5 minutes)

```bash
# Install Knip for dead code detection
npm install -D knip

# Create configuration
cat > knip.json <<'EOF'
{
  "entry": [
    "src/main.tsx",
    "src/App.tsx"
  ],
  "project": ["src/**/*.{ts,tsx}"],
  "ignore": [
    "**/__tests__/**",
    "**/*.test.{ts,tsx}",
    "**/dist/**",
    "**/build/**",
    "launch-preparation/**",
    "backups/**"
  ]
}
EOF

# Run first scan
npx knip --reporter json | tee knip-initial-scan.json
```

**Expected output:**
```
✂ Unused files (241)
✂ Unused exports (1829)
✂ Unused dependencies (45)
```

---

## ⚡ Step 2: Establish Baseline (3 minutes)

```bash
# Count current code
echo "## Baseline Metrics ($(date))" > BASELINE.md
echo "" >> BASELINE.md
echo "### Frontend" >> BASELINE.md
echo "- Files: $(find src -name "*.ts*" -not -path "*/node_modules/*" | wc -l)" >> BASELINE.md
echo "- Lines: $(find src -name "*.ts*" -not -path "*/node_modules/*" | xargs wc -l | tail -1 | awk '{print $1}')" >> BASELINE.md
echo "" >> BASELINE.md
echo "### Backend" >> BASELINE.md
echo "- Files: $(find backend/app -name "*.py" | wc -l)" >> BASELINE.md
echo "- Lines: $(find backend/app -name "*.py" | xargs wc -l | tail -1 | awk '{print $1}')" >> BASELINE.md
echo "" >> BASELINE.md
echo "### Knip Results" >> BASELINE.md
cat knip-initial-scan.json | jq '.summary' >> BASELINE.md

cat BASELINE.md
```

---

## ⚡ Step 3: Deploy Usage Tracking (7 minutes)

### Backend Tracking (3 min)
```python
# backend/app/middleware/usage_tracker.py
from fastapi import Request
import redis
from datetime import datetime
import os

# Connect to Redis (or use in-memory fallback)
try:
    redis_client = redis.Redis(
        host=os.getenv('REDIS_HOST', 'localhost'),
        port=int(os.getenv('REDIS_PORT', 6379)),
        db=1,
        socket_connect_timeout=1
    )
    redis_client.ping()
    REDIS_AVAILABLE = True
except:
    REDIS_AVAILABLE = False
    print("⚠️ Redis not available, usage tracking disabled")

async def track_api_usage(request: Request, call_next):
    """Track which endpoints are actually called in production"""
    if REDIS_AVAILABLE:
        endpoint = f"{request.method}:{request.url.path}"
        key = f"endpoint_usage:{endpoint}"
        redis_client.zadd(key, {datetime.utcnow().isoformat(): datetime.utcnow().timestamp()})
        redis_client.expire(key, 60 * 60 * 24 * 30)  # 30 days

    response = await call_next(request)
    return response
```

Add to `backend/app/main.py`:
```python
from app.middleware.usage_tracker import track_api_usage

# Add after CORS middleware
app.middleware("http")(track_api_usage)
```

### Frontend Tracking (4 min)
Create `src/utils/usageTracking.ts`:
```typescript
// Track component usage in production
const ENABLED = import.meta.env.PROD; // Only in production

export function trackComponentUsage(name: string) {
  if (!ENABLED) return;

  const key = `component_usage_${name}`;
  const count = parseInt(localStorage.getItem(key) || '0') + 1;
  localStorage.setItem(key, count.toString());

  // Log to console for visibility
  if (count === 1) {
    console.debug(`[USAGE] Component first used: ${name}`);
  }
}

// Optional: Add to your components
import { useEffect } from 'react';
import { trackComponentUsage } from '@/utils/usageTracking';

export function YourComponent() {
  useEffect(() => {
    trackComponentUsage('YourComponent');
  }, []);
  // ...
}
```

---

## ⏳ Step 4: Wait 2 Weeks (No Action Required)

**Dates:** October 8-22, 2025

During this time:
- ✅ Usage tracking collects data
- ✅ Redis stores endpoint usage
- ✅ localStorage tracks component renders
- 🚫 **DO NOT DELETE ANY CODE**

Verify tracking is working:
```bash
# Check Redis (if available)
redis-cli --scan --pattern "endpoint_usage:*" | head -10

# Check localStorage (open browser console)
localStorage.getItem('component_usage_Pam')
```

---

## 📊 Step 5: Analyze Results (Week 3)

After 2 weeks, combine data:

```bash
# Generate combined report
cat > scripts/analyze-usage.sh <<'SCRIPT'
#!/bin/bash
echo "# Dead Code Analysis Report"
echo "Generated: $(date)"
echo ""

echo "## Static Analysis (Knip)"
npx knip --reporter json > knip-current.json
cat knip-current.json | jq '{
  unused_files: .files.unused | length,
  unused_exports: .exports.unused | length,
  unused_deps: .dependencies.unused | length
}'

echo ""
echo "## Production Usage (Last 14 Days)"
if command -v redis-cli &> /dev/null; then
  echo "Endpoints called:"
  redis-cli --scan --pattern "endpoint_usage:*" | wc -l
else
  echo "⚠️ Redis not available"
fi

echo ""
echo "## Recommendation"
echo "Files safe to delete: Check DELETION_PLAN.json"
SCRIPT

chmod +x scripts/analyze-usage.sh
./scripts/analyze-usage.sh
```

---

## 🗑️ Step 6: Delete in Batches (Week 3-4)

### First Batch (Test Run)
Delete the **safest** files first:

```bash
# 1. Find files that Knip says are unused AND have zero production usage
npx knip --include-unused-files | grep "Unused file" | head -5

# 2. Manually verify each file
git grep "filename-to-delete" src/

# 3. Delete ONE file at a time (ultra-safe)
git rm src/path/to/unused-file.tsx

# 4. Test locally
npm run type-check
npm run lint
npm run test

# 5. If all pass, commit
git commit -m "refactor: remove unused file (verified by Knip + production logs)"

# 6. Deploy to staging
git push origin staging

# 7. Wait for Render deployment (2-3 min)
sleep 180

# 8. Test in browser
open https://wheels-wins-staging.netlify.app

# 9. Check health
curl https://wheels-wins-backend-staging.onrender.com/api/health

# 10. If everything works, tag it
git tag "cleanup-batch-1-verified"

# 11. Repeat for next file
```

### Automation (After 3-5 Manual Batches)
Once confident, use the automated script:

```bash
# scripts/incremental-delete.sh (from ENTERPRISE_DEAD_CODE_REMOVAL_PLAN.md)
chmod +x scripts/incremental-delete.sh
./scripts/incremental-delete.sh
```

---

## 🎯 Daily Checklist (Weeks 3-4)

### Every Morning:
- [ ] Check staging health: `curl https://wheels-wins-backend-staging.onrender.com/api/health`
- [ ] Review yesterday's deletions: `git log --oneline --since="1 day ago"`
- [ ] Plan today's batch: `npx knip | head -20`

### For Each Batch:
- [ ] Delete max 5 files
- [ ] Run `npm run type-check`
- [ ] Run `npm run lint`
- [ ] Commit with descriptive message
- [ ] Push to staging
- [ ] Wait 3 min for deployment
- [ ] Test in browser
- [ ] Tag if successful: `git tag cleanup-batch-N`

### If Something Breaks:
- [ ] Immediately rollback: `git reset --hard cleanup-batch-N-1`
- [ ] Force push: `git push origin staging --force-with-lease`
- [ ] Document what went wrong
- [ ] Update ENTERPRISE_DEAD_CODE_REMOVAL_PLAN.md

---

## 📈 Progress Tracking

Update this table daily:

| Week | Files Deleted | Lines Removed | Incidents | Status |
|------|---------------|---------------|-----------|--------|
| 1 | 0 | 0 | 0 | Monitoring |
| 2 | 0 | 0 | 0 | Monitoring |
| 3 | TBD | TBD | TBD | Deleting |
| 4 | TBD | TBD | TBD | Deleting |

Goal: **30-50% reduction** based on Meta's results

---

## 🚨 Emergency Rollback

If production breaks:

```bash
# Instant rollback to last known good state
git reset --hard cleanup-batch-N-verified
git push origin staging --force-with-lease

# Or revert specific commit
git revert HEAD
git push origin staging

# Verify rollback worked
curl https://wheels-wins-backend-staging.onrender.com/api/health
```

---

## ✅ Success Criteria

You're done when:
- ✅ Knip reports < 50 unused files (down from ~241)
- ✅ Zero unused dependencies in package.json
- ✅ Zero production incidents during cleanup
- ✅ All tests still passing
- ✅ Codebase feels "clean" and maintainable

---

## 🎓 Key Lessons (From Our Mistakes)

1. **Never delete production API files without proof**
   - We deleted `pam_simple.py` → broke production
   - Learned: Wait for usage logs, don't guess

2. **Static analysis alone is NOT enough**
   - Knip said "unused" but production logs showed usage
   - Learned: Always combine static + dynamic analysis

3. **Micro-batches prevent disasters**
   - Deleting 20 files at once = risky
   - Deleting 5 files at a time = safe + recoverable

4. **Test in deployment, not just locally**
   - Local tests passed but Render deployment failed
   - Learned: Push to staging after EVERY batch

---

**Ready to start?** Run Step 1 now!

```bash
npm install -D knip
npx knip
```
