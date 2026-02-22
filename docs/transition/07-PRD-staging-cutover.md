# PRD: Phase 7 - Staging Cutover and Production Deployment

## Goal

Define the detailed procedure for cutting over from the current Supabase-dependent architecture to the provider-neutral architecture, with staging-first validation and zero-downtime production deployment.

## Current State

**Production Infrastructure:**
- Frontend: wheelsandwins.com (Netlify, main branch)
- Backend: pam-backend.onrender.com (Render)
- Database: Supabase PostgreSQL (kycoklimpzkyrecbjecn.supabase.co)

**Staging Infrastructure:**
- Frontend: wheels-wins-staging.netlify.app (Netlify, staging branch)
- Backend: wheels-wins-backend-staging.onrender.com (Render)
- Database: Same Supabase PostgreSQL (shared with production)

**Critical Constraint:** Staging and production share the same database. Database schema changes affect both environments simultaneously. This requires extra caution with migration scripts and RLS policy changes.

**Current Deployment Risk:** No formal cutover procedure. Direct commits to main branch deploy to production without staging validation.

## Target State

**Staged Rollout Process:**
1. All changes deployed to staging first
2. Minimum 48-hour validation period on staging
3. Production deployment only with explicit user approval ("yes" or "approve")
4. Independent rollback capability per phase
5. Zero downtime for users during cutover
6. Automated health checks before and after each deployment

**Production Protection:** Match existing CLAUDE.md push protection protocol - no production deployment without explicit approval.

## Tasks

### Task 1: Pre-Cutover Preparation

**1.1 Create Cutover Coordination Document**
- Copy this PRD to `docs/transition/CUTOVER_LOG.md`
- Add sections for: Start Time, End Time, Issues Encountered, Rollback Triggered (Yes/No)
- Use as live document during each phase cutover

**1.2 Set Up Monitoring Baseline**
- Record current error rates on Render (production and staging)
- Record current Supabase query performance (p95 latency)
- Record current frontend load times (Lighthouse scores)
- Baseline: Use these to detect regressions post-cutover

**1.3 Create Automated Health Check Script**
- Path: `scripts/health-check.sh`
- Checks:
  - Backend /health endpoint (200 OK)
  - PAM WebSocket connection (wss://[backend]/api/v1/pam/ws/test)
  - Authenticated API call (GET /api/v1/expenses with valid JWT)
  - Frontend loads (200 OK, no console errors via headless browser)
- Exit code 0 if all pass, 1 if any fail
- Usage: `./scripts/health-check.sh staging` or `./scripts/health-check.sh production`

**1.4 Document Emergency Contacts**
- On-call engineer: Thabonelo (GitHub: @Thabonel)
- Rollback authority: Thabonelo
- Escalation path: N/A (single-person team)

**1.5 Prepare Rollback Branches**
- Before each phase, tag last known-good commit: `git tag staging-safe-YYYYMMDD`
- Keep these tags for 30 days post-cutover

### Task 2: Phase 1 (Repository Layer) Cutover

**2.1 Staging Deployment**

Pre-deployment checklist:
- [ ] All tests pass: `npm run quality:check:full`
- [ ] Type check passes: `npm run type-check`
- [ ] Backend tests pass: `cd backend && pytest`
- [ ] No open P0/P1 bugs in GitHub issues

Steps:
1. Merge Phase 1 code to `staging` branch
2. Verify Render picks up the deploy (wheels-wins-backend-staging.onrender.com)
3. Wait for Render build to complete (~5 minutes)
4. Check Render logs for startup errors
5. Run health check: `./scripts/health-check.sh staging`

**2.2 Staging Validation (48 hours minimum)**

Manual smoke tests:
- [ ] PAM chat: Open PAM, send "What's my budget?", verify tool execution
- [ ] Expense creation: Log a fuel expense via frontend
- [ ] Trip planning: Create a trip, add waypoints
- [ ] Social: Create a post, add a comment
- [ ] Shop: Browse products (admin and regular user)
- [ ] Profile: Update profile settings

Automated monitoring:
- [ ] No 500 errors in Render logs (48-hour window)
- [ ] No Supabase RLS errors in logs
- [ ] WebSocket connections stable (no unexpected disconnects)
- [ ] Error rate <0.1% (via Render dashboard)

Integration tests:
- [ ] Run `backend/tests/integration/test_repositories.py` (if exists)
- [ ] Verify all PAM tools execute without errors

**2.3 Production Deployment**

Pre-deployment checklist:
- [ ] Staging validated for 48+ hours
- [ ] No critical issues found
- [ ] User approval obtained (explicit "yes" or "approve")

Steps:
1. Merge `staging` branch to `main` via PR
2. Wait for user to type "yes" or "approve" in PR comment
3. Merge PR
4. Verify Render picks up the deploy (pam-backend.onrender.com)
5. Monitor Render logs for first 30 minutes
6. Run health check: `./scripts/health-check.sh production`

**2.4 Production Monitoring (24 hours)**

- [ ] No 500 errors in Render logs
- [ ] No user reports of PAM failures
- [ ] Error rate remains <0.1%
- [ ] Response time p95 <200ms (same as baseline)

**2.5 Rollback Plan**

If issues found:
1. Revert to last known-good tag: `git revert HEAD` or `git reset --hard staging-safe-YYYYMMDD`
2. Push to `main`
3. Render auto-deploys the rollback
4. Estimated time: 5 minutes
5. No database changes, so no DB rollback needed

### Task 3: Phase 2 (API Endpoints) Cutover

**3.1 Staging Deployment**

Pre-deployment:
- [ ] Phase 1 stable on production for 7+ days
- [ ] New endpoints documented in `backend/docs/api-endpoints.md`
- [ ] Postman collection created for manual testing

Steps:
1. Deploy Phase 2 to staging
2. New endpoints are additive (old endpoints remain)
3. Test each new endpoint with Postman/curl
4. Verify old endpoints still work (backward compatibility)

**3.2 Endpoint Verification**

Test each new endpoint:
- [ ] GET /api/v1/expenses - returns expense list
- [ ] POST /api/v1/expenses - creates expense
- [ ] GET /api/v1/trips - returns trip list
- [ ] POST /api/v1/trips - creates trip
- [ ] GET /api/v1/posts - returns social posts
- [ ] POST /api/v1/posts - creates post
- [ ] (Continue for all new endpoints from Phase 2 PRD)

**3.3 Production Deployment**

Same process as Phase 1:
- Staging validated for 48+ hours
- User approval obtained
- Merge to main
- Monitor for 24 hours

**3.4 Rollback Plan**

If issues found:
- New endpoints can stay (they're unused until frontend switches)
- Or revert backend deploy if critical
- No frontend changes yet, so no frontend rollback needed

### Task 4: Phase 3 (Auth Abstraction) Cutover

**4.1 Staging Deployment**

Pre-deployment:
- [ ] Set environment variable on Render (staging): `AUTH_PROVIDER=supabase`
- [ ] This is a no-op change (same behavior as current)

Steps:
1. Deploy Phase 3 to staging
2. Verify login, signup, token refresh work
3. Test with AUTH_PROVIDER=jwt on staging (create test JWT)
4. Verify admin access still works (admin_users table check)
5. Switch back to AUTH_PROVIDER=supabase

**4.2 Auth Flow Validation**

Test each auth flow:
- [ ] Login with email/password
- [ ] Signup new account
- [ ] Token refresh (wait 55 minutes or mock expiry)
- [ ] Admin user access (thabonel0@gmail.com)
- [ ] Regular user access (non-admin)
- [ ] Password reset flow

**4.3 Production Deployment**

Same process:
- Keep AUTH_PROVIDER=supabase on production
- Auth provider switch happens later when actually changing providers
- This phase just abstracts the interface

**4.4 Rollback Plan**

If issues found:
- Set AUTH_PROVIDER=supabase (if accidentally changed)
- Or revert backend deploy
- Estimated time: 1 minute (env var change)

### Task 5: Phase 4 (Frontend Migration) Cutover

**5.1 Batch-by-Batch Deployment**

Phase 4 has 9 batches (see 04-PRD-frontend-supabase-removal.md). Each batch follows this process:

**Per Batch:**

Pre-deployment:
- [ ] Previous batch stable on production for 7+ days
- [ ] Feature flag created: `VITE_ENABLE_BATCH_N=true`
- [ ] Integration tests pass for this batch

Staging deployment:
1. Deploy batch to staging with feature flag enabled
2. Test affected components manually
3. Run Cypress/Playwright tests (if available)
4. Monitor for 48 hours

Production deployment:
1. Deploy batch to production with feature flag disabled
2. Gradually enable feature flag: 10% -> 25% -> 50% -> 100% (over 48 hours)
3. Monitor error rates after each percentage increase
4. If error rate spikes >0.5%, disable flag and rollback

**Batch Order (from Phase 4 PRD):**
1. Authentication components (2 weeks validation)
2. Expense Management (1 week)
3. Trip Planning (1 week)
4. Social Features (1 week)
5. Shop Components (1 week)
6. Profile Management (1 week)
7. PAM Integration (2 weeks - most critical)
8. Admin Components (1 week)
9. Utility/Shared (1 week)

**5.2 Batch Smoke Tests**

Per batch, test:
- [ ] Component renders without errors
- [ ] User actions complete successfully (e.g., create expense, create trip)
- [ ] Loading states display correctly
- [ ] Error states display correctly
- [ ] Mobile responsive (375px, 768px, 1024px)

**5.3 Rollback Plan**

Per batch:
- Disable feature flag (instant rollback)
- Or git revert the batch commit
- Estimated time: 5 minutes per batch

### Task 6: Phase 5 (RPC to SQL) Cutover

**6.1 Staging Deployment**

Pre-deployment:
- [ ] Phase 4 complete (all batches stable on production)
- [ ] Repository methods implemented to replace RPCs
- [ ] Frontend updated to use new API endpoints instead of supabase.rpc()

Steps:
1. Deploy Phase 5 to staging
2. Verify all RPC calls now use repository methods
3. Check Supabase logs - should see fewer RPC calls
4. PostgreSQL functions remain in database (don't drop yet)

**6.2 RPC Replacement Verification**

Check each RPC function:
- [ ] get_user_expenses - replaced by ExpenseRepository
- [ ] create_expense - replaced by ExpenseRepository
- [ ] get_trips - replaced by TripRepository
- [ ] (Continue for all RPCs listed in Phase 5 PRD)

Verify via logs:
- [ ] Supabase logs show no RPC calls (except from legacy clients if any)
- [ ] Backend logs show repository method calls

**6.3 Production Deployment**

Same process:
- Staging validated for 48+ hours
- User approval obtained
- Deploy to production
- Monitor for 2 weeks

**6.4 Database Function Cleanup**

After 2 weeks stable on production:
- [ ] No RPC calls in Supabase logs
- [ ] No errors related to missing functions
- [ ] Drop unused PostgreSQL functions via migration script

Cleanup script: `docs/sql-fixes/DROP_UNUSED_RPC_FUNCTIONS.sql`

**6.5 Rollback Plan**

If issues found:
- PostgreSQL functions still exist in database
- Revert backend/frontend code to use RPCs again
- Estimated time: 5 minutes

### Task 7: Phase 6 (Config Consolidation) Cutover

**7.1 Environment Variable Migration**

Pre-deployment:
- [ ] Document all current env vars on Render and Netlify
- [ ] Create mapping table (old var -> new var)

Staging deployment:
1. Add new generic env vars alongside old ones
2. Update code to prefer new vars, fall back to old
3. Test with only new vars set (temporarily remove old ones)
4. Re-add old vars for backward compatibility

**7.2 Variable Mapping**

| Old Variable | New Variable | Platform |
|---|---|---|
| SUPABASE_URL | DATABASE_URL | Backend (Render) |
| SUPABASE_SERVICE_ROLE_KEY | DATABASE_SERVICE_KEY | Backend (Render) |
| VITE_SUPABASE_URL | VITE_API_BASE_URL | Frontend (Netlify) |
| VITE_SUPABASE_ANON_KEY | VITE_AUTH_TOKEN | Frontend (Netlify) |

**7.3 Production Deployment**

Same process:
- Staging validated for 48+ hours
- Deploy to production
- Monitor for 1 week

**7.4 Cleanup**

After 1 week stable:
- [ ] All code uses new vars
- [ ] No references to old vars in codebase
- [ ] Remove old vars from Render and Netlify

**7.5 Rollback Plan**

If issues found:
- Old env vars still present as fallback
- Code already has fallback logic
- Estimated time: 1 minute (no code change needed)

### Task 8: Post-Cutover Cleanup

**8.1 Remove Deprecated Code**

After all phases stable on production for 30 days:
- [ ] Remove unused Supabase client code
- [ ] Remove RPC function definitions from codebase
- [ ] Remove old env var fallback logic
- [ ] Update documentation to reflect new architecture

**8.2 Update Documentation**

Files to update:
- [ ] `docs/DATABASE_SCHEMA_REFERENCE.md` - reflect repository pattern
- [ ] `docs/PAM_SYSTEM_ARCHITECTURE.md` - update auth flow
- [ ] `backend/docs/architecture.md` - new repository layer
- [ ] `CLAUDE.md` - remove Supabase-specific instructions

**8.3 Archive Migration Docs**

Move to `docs/transition/archive/`:
- All 07 PRDs
- CUTOVER_LOG.md
- SQL migration scripts (keep for reference)

## Verification

### Pre-Cutover Checklist

Before each phase deployment:
- [ ] All tests pass: `npm run quality:check:full`
- [ ] Type check passes: `npm run type-check`
- [ ] Backend tests pass: `cd backend && pytest`
- [ ] Build succeeds: `npm run build`
- [ ] Backend starts without errors: `cd backend && uvicorn app.main:app --reload`
- [ ] Database migrations applied (if any)
- [ ] Environment variables set on target platform
- [ ] Health check script runs successfully: `./scripts/health-check.sh staging`

### Post-Cutover Health Checks

After each phase deployment:
- [ ] Backend health endpoint returns 200: `curl https://[backend]/health`
- [ ] PAM WebSocket connects: Test via frontend or wscat
- [ ] Auth flow works: Login, get session, make authenticated request
- [ ] Expense creation works (critical user flow)
- [ ] Frontend loads without console errors
- [ ] No 500 errors in Render logs (first 30 minutes)
- [ ] No Supabase RLS errors in logs
- [ ] Error rate <0.1% (Render dashboard)
- [ ] Response time p95 <200ms (same as baseline)

### Automated Verification Script

`scripts/health-check.sh`:

```bash
#!/bin/bash

ENV=$1 # staging or production

if [ "$ENV" = "staging" ]; then
  BACKEND_URL="https://wheels-wins-backend-staging.onrender.com"
  FRONTEND_URL="https://wheels-wins-staging.netlify.app"
elif [ "$ENV" = "production" ]; then
  BACKEND_URL="https://pam-backend.onrender.com"
  FRONTEND_URL="https://wheelsandwins.com"
else
  echo "Usage: ./health-check.sh [staging|production]"
  exit 1
fi

echo "Running health checks for $ENV..."

# 1. Backend health endpoint
echo "Checking backend health..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health")
if [ "$HEALTH_STATUS" != "200" ]; then
  echo "FAIL: Backend health check returned $HEALTH_STATUS"
  exit 1
fi
echo "PASS: Backend health OK"

# 2. Frontend loads
echo "Checking frontend..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
if [ "$FRONTEND_STATUS" != "200" ]; then
  echo "FAIL: Frontend returned $FRONTEND_STATUS"
  exit 1
fi
echo "PASS: Frontend loads OK"

# 3. WebSocket connection (requires wscat or websocat)
# Skipped for now - add if wscat installed

# 4. Authenticated API call (requires valid JWT)
# Skipped for now - add if test user credentials available

echo "All health checks passed!"
exit 0
```

Make executable: `chmod +x scripts/health-check.sh`

### Monitoring Dashboards

During cutover, monitor:
- **Render Dashboard:** Check error rates, response times, CPU/memory usage
- **Netlify Dashboard:** Check build success, deploy logs
- **Supabase Dashboard:** Check query performance, error logs, RLS policy hits
- **GitHub Issues:** Monitor for new user-reported bugs

## Rollback

### Per-Phase Rollback Strategy

| Phase | Rollback Method | Time to Rollback | Data Risk |
|---|---|---|---|
| Phase 1 (Repository Layer) | Revert backend deploy on Render | ~5 min | None - read-only change |
| Phase 2 (API Endpoints) | Remove new endpoints (or keep them unused) | ~5 min | None - additive change |
| Phase 3 (Auth Abstraction) | Set AUTH_PROVIDER=supabase | ~1 min | None - env var change |
| Phase 4 (Frontend Migration) | Disable feature flag per batch | ~5 min per batch | None - UI change only |
| Phase 5 (RPC to SQL) | Revert callers to use RPCs | ~5 min | None - PG functions still exist |
| Phase 6 (Config Consolidation) | Old env vars still present as fallback | ~1 min | None - backward compatible |

### Emergency Rollback (Full System)

If catastrophic failure across multiple phases:

**Steps:**
1. Identify last known-good commit: `git log --oneline`
2. Revert staging branch: `git revert HEAD~N` (where N = number of bad commits)
3. Push to staging: `git push origin staging`
4. Verify staging rollback successful: `./scripts/health-check.sh staging`
5. Get user approval for production rollback
6. Revert main branch: `git revert HEAD~N`
7. Push to main: `git push origin main`
8. Restore old env vars on Render and Netlify (if changed)
9. Verify production rollback successful: `./scripts/health-check.sh production`

**Estimated Time:** 15 minutes

**Data Impact:** No database rollback needed (no schema changes, no data loss)

### Rollback Decision Matrix

When to rollback:

| Severity | Criteria | Action |
|---|---|---|
| P0 (Critical) | >10% error rate, auth broken, data loss | Immediate rollback |
| P1 (High) | >1% error rate, major feature broken | Rollback if not fixable in 1 hour |
| P2 (Medium) | >0.1% error rate, minor feature broken | Fix forward if possible, rollback if not fixable in 4 hours |
| P3 (Low) | <0.1% error rate, cosmetic issues | Fix forward in next deploy |

## Timeline

| Week | Activity | Environment | Validation Period |
|---|---|---|---|
| 1 | Phase 1 deploy | Staging | 48 hours |
| 1-2 | Phase 1 deploy | Production | 7 days |
| 2 | Phase 2 deploy | Staging | 48 hours |
| 2-3 | Phase 2 deploy | Production | 7 days |
| 3 | Phase 3 deploy | Staging | 48 hours |
| 3-4 | Phase 3 deploy | Production | 7 days |
| 4-5 | Phase 4 Batch 1-3 (Auth, Expenses, Trips) | Staging then Production | 48h staging + 7d production per batch |
| 6-7 | Phase 4 Batch 4-6 (Social, Shop, Profile) | Staging then Production | 48h staging + 7d production per batch |
| 8-9 | Phase 4 Batch 7-9 (PAM, Admin, Utility) | Staging then Production | 48h staging + 14d production (PAM critical) |
| 10 | Phase 5 deploy | Staging | 48 hours |
| 10-11 | Phase 5 deploy | Production | 14 days (monitor RPC usage) |
| 12 | Drop unused PG functions | Production | N/A (cleanup) |
| 13 | Phase 6 deploy | Staging | 48 hours |
| 13-14 | Phase 6 deploy | Production | 7 days |
| 15 | Remove old env vars | Production | N/A (cleanup) |
| 16 | Post-cutover cleanup | Both | N/A |

**Total Duration:** 16 weeks (~4 months)

### Accelerated Timeline (Optional)

If all phases tested thoroughly and no issues found, validation periods can be shortened:
- Staging validation: 24 hours (minimum)
- Production validation: 3 days (minimum)
- Total duration: 8-10 weeks

**Not recommended unless under time pressure.**

## Zero-Downtime Strategy

### Principles

1. **Additive Changes First:** New code added alongside old code before removing old code
2. **Feature Flags:** Frontend changes hidden behind feature flags for gradual rollout
3. **Backward Compatibility:** Backend changes maintain backward compatibility with old frontend
4. **Database Stability:** No breaking schema changes, no data migrations during cutover
5. **Graceful Degradation:** If new code fails, fall back to old code automatically

### Per-Phase Zero-Downtime Approach

**Phase 1 (Repository Layer):**
- Repository methods wrap Supabase calls (no behavior change)
- Old direct Supabase calls still work
- Gradual replacement over time

**Phase 2 (API Endpoints):**
- New endpoints added alongside old endpoints
- Old endpoints remain until frontend switches
- No breaking changes to existing endpoints

**Phase 3 (Auth Abstraction):**
- AUTH_PROVIDER env var controls which provider is used
- Default to Supabase (current behavior)
- Switch only when ready

**Phase 4 (Frontend Migration):**
- Feature flags per batch
- Gradual rollout: 10% -> 25% -> 50% -> 100%
- Instant disable if issues found

**Phase 5 (RPC to SQL):**
- Repository methods replace RPC calls
- PostgreSQL functions remain until all callers migrated
- Drop functions only after 2 weeks stable

**Phase 6 (Config Consolidation):**
- New env vars added before old ones removed
- Code falls back to old vars if new ones missing
- Remove old vars only after all code uses new vars

### Deployment Windows

All deployments happen during low-traffic windows:
- Staging: Anytime (low user impact)
- Production: Tuesday-Thursday, 10am-2pm PST (avoid Monday/Friday, avoid late night)

Why this window:
- Team available to monitor and respond
- Low user traffic (most users in US timezones)
- Avoid weekends (harder to get support)

## Success Criteria

### Phase 1 Success
- [ ] All PAM tools execute without errors
- [ ] No increase in error rate
- [ ] Response time p95 <200ms (same as baseline)
- [ ] Zero downtime during cutover

### Phase 2 Success
- [ ] All new endpoints return correct data
- [ ] Old endpoints still work
- [ ] Postman collection tests pass
- [ ] No 500 errors in logs

### Phase 3 Success
- [ ] Auth flows work with AUTH_PROVIDER=supabase
- [ ] Auth flows work with AUTH_PROVIDER=jwt (on staging)
- [ ] Admin users can still access admin endpoints
- [ ] Token refresh works

### Phase 4 Success
- [ ] All 9 batches deployed without rollback
- [ ] No increase in frontend error rate
- [ ] All components render correctly
- [ ] Mobile responsive on all screen sizes

### Phase 5 Success
- [ ] Zero RPC calls in Supabase logs
- [ ] All repository methods return correct data
- [ ] No performance regression
- [ ] PostgreSQL functions dropped without errors

### Phase 6 Success
- [ ] All code uses new env vars
- [ ] Old env vars removed without errors
- [ ] Documentation updated
- [ ] No references to old vars in codebase

### Overall Success
- [ ] Provider-neutral architecture fully operational
- [ ] Zero data loss during cutover
- [ ] Zero downtime for users
- [ ] Error rate remains <0.1%
- [ ] Response time p95 <200ms
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Team trained on new architecture

## Risk Assessment

### High Risk Items

1. **Shared Database:** Staging and production share the same database
   - Mitigation: No breaking schema changes, test migrations on staging first
2. **PAM Critical Path:** Phase 4 Batch 7 (PAM) is most critical
   - Mitigation: Extended 14-day validation period, extra smoke tests
3. **Auth Changes:** Phase 3 could break all user access
   - Mitigation: AUTH_PROVIDER=supabase maintains current behavior, test thoroughly

### Medium Risk Items

1. **Frontend Batches:** 9 separate deployments increases coordination overhead
   - Mitigation: Feature flags for instant rollback, clear batch order
2. **RPC Removal:** Missing an RPC call could break a feature
   - Mitigation: Keep PG functions for 2 weeks, comprehensive grep for RPC calls
3. **Environment Variables:** Wrong env var mapping could break config
   - Mitigation: Fallback logic, old vars remain until all code migrated

### Low Risk Items

1. **Repository Layer:** Phase 1 is mostly a wrapper (low risk)
2. **API Endpoints:** Phase 2 is additive (old endpoints remain)
3. **Config Consolidation:** Phase 6 has backward compatibility built in

## Notes

- This is a 16-week (4-month) project with high coordination overhead
- Single-person team (Thabonelo) means no parallel work on multiple phases
- Shared database is the biggest risk - consider separate staging database in future
- Each phase is independently rollbackable - no cascading failures
- Feature flags are critical for Phase 4 success
- User approval required for each production deployment (matching CLAUDE.md protocol)

## References

- `docs/transition/01-PRD-provider-neutral-foundation.md` - Overall strategy
- `docs/transition/02-PRD-repository-layer.md` - Phase 1 details
- `docs/transition/03-PRD-api-endpoints.md` - Phase 2 details
- `docs/transition/04-PRD-frontend-supabase-removal.md` - Phase 4 details
- `docs/transition/05-PRD-rpc-to-sql.md` - Phase 5 details
- `docs/transition/06-PRD-config-consolidation.md` - Phase 6 details
- `CLAUDE.md` - Production push protection protocol
- `backend/docs/architecture.md` - Current architecture
