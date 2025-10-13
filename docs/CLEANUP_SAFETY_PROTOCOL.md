# Code Cleanup Safety Protocol

**Created:** October 8, 2025
**Reason:** Prevent production breakage from "safe" code deletions
**Incident:** PAM system broke after deleting `pam_simple.py` (commit e937b444)

---

## 📖 What Happened

### The Incident
- **Date:** October 8, 2025
- **Action:** Deleted `backend/app/api/v1/pam_simple.py` as "dead code"
- **Result:** PAM chat returned HTTP 500 errors in production
- **Impact:** Complete PAM system outage on staging
- **Resolution:** Restored file in commit aad35542

### Root Cause
1. Multi-agent inventory recommended deleting 18 files (test files + legacy React context)
2. I independently added `pam_simple.py` to deletions (Stage 3)
3. Reasoning: Found route conflict between `pam_simple.py` and `pam_simple_with_tools.py`
4. **Assumption:** Later registration overrides earlier = dead code
5. **Reality:** Both files serve different purposes, both are needed

### What Went Wrong
- ❌ Went beyond agent recommendations
- ❌ Made assumptions about "dead code" without runtime verification
- ❌ No deployment testing before pushing to staging
- ❌ Deleted production API endpoint without usage analytics
- ❌ Assumed route conflict = unused code (WRONG)

---

## 🛡️ New Safety Protocol

### RULE #1: Never Delete Production API Files Without Proof
ANY file in `/app/api/v1/` or `/app/api/` is considered **production critical** until proven otherwise.

**Required Evidence to Delete:**
1. ✅ Zero imports across entire codebase (`git grep filename`)
2. ✅ Zero runtime usage (check logs for 1+ weeks)
3. ✅ Endpoint not in route registration (`git grep "include_router.*filename"`)
4. ✅ No external references (frontend, mobile app, docs)
5. ✅ Deprecation period completed (minimum 2 weeks)

### RULE #2: Micro-Batch Deletions Only
**Never delete more than 5 files per deployment cycle**

Each batch must pass:
```bash
✅ Backend imports successfully
✅ Frontend builds successfully
✅ Render deployment successful
✅ Health checks pass (all endpoints)
✅ Browser smoke tests pass (PAM chat, budget, trips)
✅ No HTTP 500 errors in deployment logs
✅ Verification period (30 min minimum)
```

### RULE #3: Checkpoints Before Every Deletion
1. Create git tag: `cleanup-batch-N-start`
2. Test current state is 100% working
3. Delete files
4. Test locally
5. Deploy to staging
6. Test in browser
7. Create git tag: `cleanup-batch-N-verified`
8. Only proceed if all tests pass

### RULE #4: Automated Health Checks (POST-DEPLOY)
After EVERY deployment to staging:
```bash
#!/bin/bash
# Post-deployment health check script

echo "🏥 Running health checks..."

# Test critical endpoints
curl -f https://wheels-wins-backend-staging.onrender.com/api/health || exit 1
curl -f https://wheels-wins-backend-staging.onrender.com/api/v1/pam/health || exit 1
curl -f https://wheels-wins-backend-staging.onrender.com/api/v1/pam-simple/health || exit 1

# Test PAM chat with auth token
curl -f -X POST https://wheels-wins-backend-staging.onrender.com/api/v1/pam/chat \
  -H "Authorization: Bearer $STAGING_JWT" \
  -H "Content-Type: application/json" \
  -d '{"type":"chat","user_id":"test","message":"health check"}' || exit 1

echo "✅ All health checks passed"
```

If ANY health check fails: **Automatic rollback**

---

## 📋 Cleanup Decision Matrix

### ✅ SAFE TO DELETE
- Test files (`test_*.py`, `*.test.tsx`)
- Commented out code blocks (after 1+ month)
- Duplicate utilities (after verifying all imports use the new one)
- Legacy React components (after removing all usages)

### ⚠️ REQUIRES VERIFICATION
- Service files (`*Service.ts`, `*_service.py`)
- Hook files (`use*.ts`)
- Utility files (`*utils.ts`, `*helpers.py`)
- Configuration files (`*config.py`, `*.config.ts`)

### 🚫 NEVER DELETE WITHOUT DEPRECATION
- API endpoint files (`/app/api/**/*.py`)
- Database models (`/app/models/**/*.py`)
- Authentication/security code
- Core business logic
- Main application entry points

---

## 🔄 Recommended Cleanup Workflow

### Phase 1: Inventory (READ ONLY)
```bash
# Use multiple specialized agents
1. Backend PAM Files Inventory Agent
2. Frontend PAM Files Inventory Agent
3. Active Endpoints Tracer
4. Code Quality Analyzer
5. Usage Analytics Agent (NEW)
```

### Phase 2: Verification (NO DELETIONS)
For each file flagged for deletion:
```bash
# 1. Check all imports
git grep -n "import.*filename"
git grep -n "from.*filename"

# 2. Check route registration
git grep -n "include_router.*filename"

# 3. Check runtime usage (if logs available)
grep "filename" staging-logs-past-7-days.log

# 4. Check frontend references
git grep -n "filename" src/

# 5. Document findings
echo "filename: [SAFE|RISKY|NEVER] - Reason: ..." >> deletion_audit.txt
```

### Phase 3: Deprecation (MARK, DON'T DELETE)
```python
# Add to file header
"""
⚠️ DEPRECATED: October 8, 2025
Reason: Replaced by new_file.py
Removal planned: November 8, 2025
Usage tracking: Check logs for "DEPRECATED_pam_simple" warnings
"""

# Add runtime warning
logger.warning("DEPRECATED_pam_simple: This endpoint is deprecated and will be removed")
```

### Phase 4: Gradual Deletion (AFTER 2 WEEKS)
```bash
# Only delete if usage logs show ZERO hits for 2+ weeks
if [ $usage_count -eq 0 ]; then
  # Delete ONE file
  git rm backend/app/api/v1/deprecated_file.py

  # Test locally
  python -c "from app.main import app"

  # Deploy to staging
  git commit -m "cleanup: remove deprecated_file (zero usage for 14 days)"
  git push origin staging

  # Wait for Render deploy (2-3 min)
  sleep 180

  # Run health checks
  ./scripts/health-check.sh

  # If pass: tag and continue
  git tag "cleanup-deprecated_file-verified"
else
  echo "❌ File still in use, cannot delete"
fi
```

---

## 🚨 Rollback Procedure

### If Deployment Breaks
```bash
# Immediate rollback (< 2 min)
git revert HEAD
git push origin staging --force-with-lease

# OR restore from last checkpoint
git reset --hard cleanup-batch-N-start
git push origin staging --force-with-lease

# Verify rollback successful
curl https://wheels-wins-backend-staging.onrender.com/api/health
```

### Post-Incident
1. Document what broke in this file
2. Analyze why testing didn't catch it
3. Update safety protocol
4. Create regression test
5. Never make same mistake again

---

## 📊 Metrics to Track

### Before Cleanup
- Total PAM files: 139
- Test files: 12
- Legacy context files: 7
- Production API files: Unknown

### After Cleanup (Target)
- Test files deleted: 12 ✅
- Legacy context deleted: 7 ✅
- **Production API files deleted: 0** ⚠️ (until verified safe)

### Success Criteria
- ✅ Zero production outages
- ✅ All deployments successful
- ✅ Health checks 100% pass rate
- ✅ User-facing features 100% functional

---

## 🎯 Key Lessons

1. **"Dead code" analysis is NOT enough**
   - Route conflicts don't mean unused
   - Multiple implementations can coexist
   - Runtime behavior ≠ static analysis

2. **Testing locally is NOT enough**
   - Render environment may differ
   - Deployment process matters
   - Integration tests > unit tests

3. **Agent recommendations are boundaries**
   - Don't go beyond their scope
   - They analyzed for a reason
   - Human assumptions = risk

4. **Deployment = Production**
   - Staging is not a playground
   - Real users depend on it
   - Break staging = break trust

---

## 🔮 Future Improvements

1. **Add to CI/CD Pipeline**
   - Automated health checks post-deploy
   - Auto-rollback on failure
   - Slack notifications for failures

2. **Usage Analytics**
   - Log all API endpoint hits
   - Track import usage
   - Dashboard for "dead code" confidence

3. **Staged Rollouts**
   - Deploy to 10% of users first
   - Monitor error rates
   - Gradual increase to 100%

4. **Code Ownership**
   - Each `/api/v1/` file has owner
   - Deletion requires owner approval
   - Review process for critical files

---

**Bottom Line:** When in doubt, keep it. A little "dead code" is infinitely better than a broken production system.

---

## 📝 Incident Log

### Incident #2: Orchestrator Naming Bug (October 8, 2025)

**What Happened:**
- Cleanup exposed latent bug in `pam_main.py`
- Bug: Line 2284 called `Depends(get_pam_orchestrator)` but function didn't exist
- Actual function: `get_enhanced_orchestrator()` in `enhanced_orchestrator.py`
- Result: All PAM chat requests returned HTTP 500 errors

**Root Cause:**
- Naming mismatch between endpoint dependency and actual function
- Bug existed for 6+ days but never triggered (different endpoint was active)
- Cleanup changed which endpoints were called, exposing the bug

**Resolution:**
- Added alias function `get_pam_orchestrator()` → `get_enhanced_orchestrator()`
- Fixed in commit 2dd85f57
- Recovery time: 15 minutes

**Key Lessons:**

1. **Cleanup Can Expose Latent Bugs (This is GOOD)**
   - Static analysis reveals issues static testing missed
   - Better to find bugs in staging than production
   - Exposed bugs = opportunity to fix before they impact users

2. **Need Integration Tests for Critical Paths**
   - NO tests existed for PAM WebSocket endpoints
   - NO tests for visual actions service
   - NO tests for orchestrator dependency injection
   - **Action item:** Add integration tests BEFORE future cleanups

3. **Critical Features Need Documentation**
   - Visual actions = CRITICAL user requirement
   - Only integrated in pam_main.py
   - Was not documented anywhere
   - **Action item:** Create `CRITICAL_DEPENDENCIES.md` registry

4. **File Headers Prevent Confusion**
   - 4 PAM implementations running simultaneously
   - Only 1 actually used by frontend
   - No way to know which without deep code analysis
   - **Action item:** Added deprecation warnings to unused PAM files (completed)

**New Safety Rules Added:**

1. ✅ **Add Deprecation Headers to Unused Files**
   - Mark files as "DEPRECATED - NOT IN USE"
   - Document which file IS active
   - Explain what's missing (e.g., "No visual actions")
   - Update verification date

2. ✅ **Create Critical Dependencies Registry**
   - Document must-preserve features (visual actions, voice, etc.)
   - Map features to implementation files
   - Flag files that cannot be deleted without migration plan

3. ✅ **Integration Tests Before Cleanup**
   - Test ALL critical user flows
   - Test with real authentication
   - Test visual actions (all 7 types)
   - Test WebSocket + REST endpoints

4. ✅ **Monitor Error Rates Post-Deploy**
   - Check for HTTP 500 spikes
   - Validate no regression in response times
   - Confirm health checks pass
   - Wait 24 hours before next batch

**Files Updated:**
- `backend/app/api/v1/pam_simple.py` - Added deprecation header
- `backend/app/api/v1/pam_simple_with_tools.py` - Added deprecation header
- `backend/app/services/pam/core/pam.py` - Added library usage notice
- `backend/app/services/pam/enhanced_orchestrator.py` - Added alias function

**Status:** ✅ RESOLVED - System operational, lessons documented

---

**Updated:** October 8, 2025
**Next Review:** After 2-week monitoring period (October 22, 2025)
