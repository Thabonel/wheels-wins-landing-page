# Infrastructure Neutrality Transition - Master Plan

**Project:** Wheels & Wins
**Date:** February 8, 2026
**Status:** Planning Phase
**Trigger:** Implement when approaching ~100 customers (current: single digits)

---

## Executive Summary

This document outlines a seven-phase plan to migrate Wheels & Wins from deep Supabase lock-in to provider-neutral architecture. The transition enables future flexibility to switch providers (AWS RDS, PlanetScale, Neon, Railway) without rewriting the entire application.

**Current State:** 1.5/10 provider neutrality
**Target State:** 8/10 provider neutrality (full abstraction with PostgreSQL as common denominator)
**Timeline:** 12 weeks across 7 phases
**Strategy:** Staging-first, zero downtime, backward-compatible at every step

---

## Current State Assessment

### Lock-in Severity

**Frontend (Critical Lock-in)**
- 216 files import `@supabase/supabase-js` directly
- Components perform CRUD operations via Supabase SDK
- Direct database writes bypass backend entirely (security risk)
- 23 Supabase RPC function calls embedded in components

**Backend (Moderate Lock-in)**
- 69 files use `safe_db_*` functions or `DatabasePool` tied to Supabase connection strings
- 4 Supabase client entry points scattered across codebase:
  - `app/core/database.py` (get_supabase_client, get_supabase, init_supabase, get_cached_supabase_client)
  - `app/services/database.py` (DatabaseService)
  - `app/database/supabase_client.py`
  - `app/core/database_pool.py` (DatabasePool with asyncpg)
- 118 PAM tool files each import `get_supabase_client` from `app.core.database`
- 11 backend Supabase RPC calls

**RPC Function Inventory (34 Total)**

*Frontend RPCs (23):*
- calculate_trust_score
- check_badge_eligibility
- check_failed_login_attempts
- check_rate_limit
- cleanup_expired_pam_memories
- delete_user_pam_memories
- diagnose_auth_issue
- exec_sql
- find_similar_memories
- find_similar_users
- get_current_user_id
- get_days_until_launch
- get_equipment_stats
- get_launch_week_progress
- get_shakedown_stats
- get_user_connection_stats
- get_vehicle_mod_stats
- increment_product_clicks
- increment_template_usage
- log_security_event
- start_transition_profile
- test_manual_jwt_extraction
- update_memory_importance

*Backend RPCs (11):*
- create_default_transition_tasks
- decrement_post_likes
- exec_sql
- execute_sql
- foobar
- get_downsizing_stats
- get_income_stats
- get_service_stats
- increment_post_comments
- increment_post_likes
- update_memory_access

**Auth (Tight Coupling)**
- JWT validation hardcoded to Supabase JWKS endpoint
- `unified_auth.py` exists as 80% complete abstraction (good foundation)
- Auth middleware assumes Supabase JWT structure

**Environment Variables (Supabase-specific)**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**In-Memory State (Deployment Risk)**
- CSRF tokens stored in memory (lost on container restart)
- Should migrate to Redis for multi-instance deployment

---

## Strategic Goals

1. **Provider Flexibility**: Switch PostgreSQL providers in <1 day
2. **Security Hardening**: All frontend requests route through backend API layer
3. **Cost Optimization**: Evaluate provider pricing without migration friction
4. **Deployment Resilience**: Stateless backend for multi-instance scaling
5. **Maintainability**: Single abstraction layer for database access

---

## Seven-Phase Roadmap

### Phase 1: Backend Repository Layer (Weeks 1-2)

**Objective:** Consolidate 4 Supabase client entry points into single repository pattern

**Deliverables:**
- `backend/app/repositories/base.py` - Abstract base repository
- `backend/app/repositories/` directory structure:
  - `user_repository.py`
  - `expense_repository.py`
  - `trip_repository.py`
  - `social_repository.py`
  - `shop_repository.py`
  - `pam_repository.py`
- Single database connection pool manager (consolidate from 4 entry points)
- Unit tests for each repository (80%+ coverage)

**Scope:**
- Build on existing `DatabasePool` (asyncpg) - already provider-neutral
- Wrap all database access in repository methods
- 69 backend files to refactor

**Success Criteria:**
- All backend DB access goes through repositories
- No more `get_supabase_client()` calls outside repository layer
- Integration tests pass on staging

**Risk Mitigation:**
- Feature flag: `USE_REPOSITORY_LAYER` (default: false)
- Parallel run: old and new code paths coexist for 1 week
- Rollback: toggle feature flag to false

---

### Phase 2: Backend API Endpoints (Weeks 3-4)

**Objective:** Create REST endpoints for frontend components currently doing direct DB writes

**Priority Areas (Security Risk):**
1. Expenses - financial data bypassing backend validation
2. Social posts - user-generated content without sanitization
3. Shop management - admin operations without audit trail

**Deliverables:**
- `/api/v1/expenses/*` - CRUD endpoints
- `/api/v1/social/posts/*` - Post creation/editing
- `/api/v1/shop/products/*` - Product management
- `/api/v1/trips/*` - Trip planning
- OpenAPI schema documentation
- Rate limiting on write endpoints (via existing rate limiter)

**Scope:**
- Map existing frontend Supabase queries to REST endpoints
- Add validation middleware (Pydantic models)
- Add authentication checks (existing `unified_auth.py`)
- Add audit logging for admin operations

**Success Criteria:**
- All priority endpoints return data matching Supabase SDK behavior
- Postman collection covers all endpoints
- Load testing shows <200ms p95 latency

**Dependencies:**
- Phase 1 (repository layer) must be complete

---

### Phase 3: Auth Abstraction (Week 5)

**Objective:** Abstract auth behind AuthProvider interface, remove Supabase JWKS hardcoding

**Build On:**
- Existing `unified_auth.py` (80% complete)
- JWT validation logic already exists

**Deliverables:**
- `backend/app/auth/auth_provider.py` - Abstract interface
- `backend/app/auth/providers/supabase_auth.py` - Supabase implementation
- `backend/app/auth/providers/generic_jwt_auth.py` - Generic JWT implementation
- Environment variable: `AUTH_PROVIDER` (default: "supabase")

**Key Abstractions:**
- `AuthProvider.validate_token(token: str) -> UserClaims`
- `AuthProvider.get_user_id(claims: UserClaims) -> str`
- `AuthProvider.get_user_role(claims: UserClaims) -> str`

**Success Criteria:**
- Auth tests pass with both Supabase and generic JWT providers
- No hardcoded JWKS URLs outside provider implementations
- Frontend auth flow unchanged

**Risk Mitigation:**
- Keep Supabase provider as default for 2 weeks
- A/B test with 10% traffic to generic provider
- Detailed logging of auth failures

---

### Phase 4: Frontend API Migration (Weeks 6-8)

**Objective:** Migrate 216 frontend files from direct Supabase SDK to backend API calls

**Migration Priority:**
1. **Week 6:** Expenses, Budget (security-critical writes)
2. **Week 7:** Social posts, Profile updates (high traffic)
3. **Week 8:** Trips, Shop, Admin (lower traffic)

**Deliverables:**
- `src/services/apiClient.ts` - Single API client entry point
- `src/hooks/useApi.ts` - React hook for API calls with loading/error states
- Refactor 216 files to use apiClient instead of Supabase SDK
- Remove `@supabase/supabase-js` from frontend dependencies

**Build On:**
- Existing `src/services/api.ts` (partial abstraction exists)

**Pattern:**
```typescript
// Before
const { data } = await supabase
  .from('expenses')
  .insert({ user_id, amount, category })

// After
const data = await apiClient.expenses.create({ amount, category })
```

**Success Criteria:**
- Zero direct Supabase SDK imports in src/ (except auth)
- All API calls route through apiClient
- Frontend tests pass with mock API client
- Performance metrics unchanged (within 5%)

**Dependencies:**
- Phase 2 (backend API endpoints) must be complete

**Risk Mitigation:**
- Feature flag per component: `USE_BACKEND_API`
- Gradual rollout: 10% -> 50% -> 100% of users
- Automatic fallback to Supabase SDK if backend errors
- Monitor error rates in Sentry

---

### Phase 5: RPC to SQL (Week 9)

**Objective:** Replace 34 Supabase RPC function calls with standard SQL via repository layer

**RPC Migration Map:**

*Analytics RPCs (7):*
- `get_equipment_stats` -> `SELECT COUNT(*) FROM equipment GROUP BY category`
- `get_shakedown_stats` -> `SELECT * FROM shakedown_tasks WHERE status = 'completed'`
- `get_vehicle_mod_stats` -> `SELECT COUNT(*) FROM vehicle_mods GROUP BY type`
- `get_downsizing_stats` -> `SELECT COUNT(*) FROM downsizing_items WHERE status = 'sold'`
- `get_income_stats` -> `SELECT SUM(amount) FROM income GROUP BY category`
- `get_service_stats` -> `SELECT COUNT(*) FROM service_records GROUP BY type`
- `get_launch_week_progress` -> `SELECT COUNT(*) FROM tasks WHERE week = 'launch'`

*Social RPCs (4):*
- `increment_post_likes` -> `UPDATE posts SET likes = likes + 1 WHERE id = ?`
- `decrement_post_likes` -> `UPDATE posts SET likes = likes - 1 WHERE id = ?`
- `increment_post_comments` -> `UPDATE posts SET comments = comments + 1 WHERE id = ?`
- `calculate_trust_score` -> SQL aggregate query

*Auth/Security RPCs (5):*
- `check_failed_login_attempts` -> `SELECT COUNT(*) FROM auth_logs WHERE user_id = ? AND success = false`
- `check_rate_limit` -> `SELECT COUNT(*) FROM api_requests WHERE user_id = ? AND timestamp > NOW() - INTERVAL '1 minute'`
- `log_security_event` -> `INSERT INTO security_events (...)`
- `diagnose_auth_issue` -> SQL diagnostic queries
- `get_current_user_id` -> Extract from JWT claims (no DB call)

*PAM Memory RPCs (5):*
- `cleanup_expired_pam_memories` -> `DELETE FROM pam_memories WHERE expires_at < NOW()`
- `delete_user_pam_memories` -> `DELETE FROM pam_memories WHERE user_id = ?`
- `find_similar_memories` -> Vector similarity query (keep as function or migrate to pgvector)
- `find_similar_users` -> Vector similarity query
- `update_memory_importance` -> `UPDATE pam_memories SET importance = ? WHERE id = ?`
- `update_memory_access` -> `UPDATE pam_memories SET last_accessed = NOW() WHERE id = ?`

*Onboarding RPCs (3):*
- `start_transition_profile` -> `INSERT INTO profiles (...) RETURNING *`
- `create_default_transition_tasks` -> Batch INSERT
- `get_days_until_launch` -> `SELECT launch_date - CURRENT_DATE FROM profiles WHERE user_id = ?`

*Shop RPCs (2):*
- `increment_product_clicks` -> `UPDATE affiliate_products SET clicks = clicks + 1 WHERE id = ?`
- `increment_template_usage` -> `UPDATE budget_templates SET usage_count = usage_count + 1 WHERE id = ?`

*Badge/Gamification RPCs (2):*
- `check_badge_eligibility` -> Complex SQL query (multiple JOINs)
- `get_user_connection_stats` -> `SELECT COUNT(*) FROM connections WHERE user_id = ?`

*Admin RPCs (2):*
- `exec_sql` -> **REMOVE** (security risk)
- `execute_sql` -> **REMOVE** (security risk)
- `foobar` -> **REMOVE** (appears to be test function)
- `test_manual_jwt_extraction` -> **REMOVE** (test function)

**Deliverables:**
- Repository methods for each RPC equivalent
- SQL migration scripts in `docs/sql-fixes/rpc-to-sql/`
- Unit tests for SQL equivalents
- Performance benchmarks (RPC vs SQL)

**Success Criteria:**
- Zero `.rpc()` calls in codebase
- All functionality equivalent to RPC behavior
- Performance within 10% of RPC baseline

**Dependencies:**
- Phase 1 (repository layer) must be complete

**Risk Mitigation:**
- Keep RPC functions in database for 2 weeks (parallel run)
- A/B test SQL vs RPC with 50/50 split
- Detailed query performance logging

---

### Phase 6: Config & Environment (Week 10)

**Objective:** Abstract environment variables from Supabase-specific to generic database config

**Environment Variable Migration:**

*Before:*
```bash
SUPABASE_URL=https://kycoklimpzkyrecbjecn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
VITE_SUPABASE_URL=https://kycoklimpzkyrecbjecn.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

*After:*
```bash
# Backend
DATABASE_URL=postgresql://user:pass@host:5432/db
DATABASE_POOL_SIZE=20
DATABASE_POOL_TIMEOUT=30
AUTH_PROVIDER=supabase  # or "generic_jwt"
AUTH_JWT_SECRET=...     # for generic provider
AUTH_JWKS_URL=...       # for Supabase provider

# Frontend
VITE_API_BASE_URL=https://pam-backend.onrender.com
VITE_AUTH_PROVIDER=supabase
```

**Deliverables:**
- `backend/app/config/provider_config.py` - Factory pattern for provider-specific config
- `backend/app/config/database_config.py` - Database connection config
- `.env.example` with generic variable names
- Migration guide: `docs/transition/ENV_MIGRATION.md`

**Additional Changes:**
- Move in-memory CSRF tokens to Redis
- Redis session store for multi-instance deployments

**Success Criteria:**
- No hardcoded Supabase URLs in code
- Config factory supports multiple providers
- Redis session store tested with 2+ backend instances

**Risk Mitigation:**
- Keep old env vars as fallback for 1 month
- Gradual deprecation warnings in logs
- Staging cutover 2 weeks before production

---

### Phase 7: Staging Cutover (Weeks 11-12)

**Objective:** Deploy all changes to staging, validate, then production

**Week 11: Staging Cutover**

*Day 1-2: Pre-cutover Validation*
- Run health checks on all phases
- Verify feature flags in correct state
- Database backup snapshot
- Load testing on staging backend

*Day 3: Staging Deploy*
- Deploy backend with all feature flags enabled
- Deploy frontend with backend API calls
- Database migration scripts
- Redis deployment

*Day 4-5: Validation*
- Automated test suite (E2E tests)
- Manual QA checklist:
  - User registration/login
  - Expense tracking
  - Social posts
  - Trip planning
  - Shop browsing
  - PAM interactions
- Performance benchmarking
- Error rate monitoring

*Day 6-7: Soak Testing*
- 48-hour monitoring period
- Error tracking in Sentry
- Performance metrics in monitoring dashboard
- User feedback collection (internal team)

**Week 12: Production Cutover**

*Day 1-2: Production Preparation*
- Final staging validation
- Production database backup
- Rollback procedure documented
- On-call schedule for cutover window

*Day 3: Production Deploy*
- Low-traffic window (2-4 AM PST)
- Deploy backend (zero downtime via blue/green)
- Deploy frontend (Netlify instant rollback ready)
- Database migrations (backward-compatible)
- Redis deployment

*Day 4-7: Production Monitoring*
- 72-hour intensive monitoring
- Error rate comparison (pre vs post cutover)
- Performance metrics tracking
- User feedback monitoring
- Cost tracking (provider pricing)

**Rollback Plan:**

*Backend Rollback:*
1. Toggle feature flags to disable new code paths
2. Revert to previous container image
3. Database rollback (if migrations applied)
4. Redis state flush (if corrupted)

*Frontend Rollback:*
1. Netlify instant rollback to previous deploy
2. Toggle feature flags via backend API

*Database Rollback:*
1. Restore from pre-cutover snapshot
2. Replay transaction logs from backup window
3. RPC functions still available as fallback

**Health Checks:**
- `/health/db` - Database connectivity
- `/health/redis` - Redis connectivity
- `/health/auth` - Auth provider validation
- `/health/repositories` - Repository layer sanity checks

**Success Criteria:**
- Error rate <0.5% (comparable to pre-cutover)
- p95 latency <200ms (within 10% of baseline)
- Zero data loss incidents
- Zero authentication failures
- Cost within 20% of Supabase baseline

---

## Dependency Graph

```
Phase 1: Backend Repository Layer
         |
         +---> Phase 2: Backend API Endpoints
         |              |
         |              +---> Phase 4: Frontend API Migration
         |
         +---> Phase 3: Auth Abstraction (parallel with Phase 2)
         |
         +---> Phase 5: RPC to SQL

Phase 6: Config & Environment (parallel with all phases)

Phase 7: Staging Cutover (depends on Phases 1-6)
```

**Critical Path:** Phase 1 -> Phase 2 -> Phase 4 -> Phase 7

**Parallelizable:** Phase 3 can run alongside Phase 2, Phase 6 can run anytime

---

## Risk Assessment

### High-Risk Areas

1. **Frontend API Migration (Phase 4)**
   - **Risk:** Breaking user-facing features
   - **Mitigation:** Feature flags, gradual rollout, automatic fallback
   - **Monitoring:** Sentry error tracking, user feedback

2. **RPC to SQL Migration (Phase 5)**
   - **Risk:** Performance degradation on complex queries
   - **Mitigation:** Benchmark each SQL equivalent, keep RPC as fallback
   - **Monitoring:** Query performance logging, APM tools

3. **Auth Abstraction (Phase 3)**
   - **Risk:** Authentication failures locking out users
   - **Mitigation:** A/B testing, detailed logging, instant rollback
   - **Monitoring:** Auth success/failure rates, user complaints

### Medium-Risk Areas

1. **Backend Repository Layer (Phase 1)**
   - **Risk:** Bugs in repository methods causing data corruption
   - **Mitigation:** Unit tests (80%+ coverage), integration tests
   - **Monitoring:** Database transaction logs, data integrity checks

2. **Config & Environment (Phase 6)**
   - **Risk:** Misconfiguration causing outages
   - **Mitigation:** Staging validation 2 weeks before production
   - **Monitoring:** Health check endpoints, config validation on startup

### Low-Risk Areas

1. **Backend API Endpoints (Phase 2)**
   - **Risk:** API design not matching frontend needs
   - **Mitigation:** OpenAPI schema validation, Postman collection testing
   - **Monitoring:** API usage analytics, error rates per endpoint

---

## Cost Analysis

### Current Costs (Supabase)
- Database: $25/month (Pro plan)
- Storage: $10/month (file uploads)
- Auth: Included in Pro plan
- **Total:** ~$35/month

### Projected Costs (Provider-Neutral)

*Optimized Scenario (Railway):*
- PostgreSQL: $5/month (Hobby plan)
- Redis: $5/month
- Backend compute: $10/month (2 instances)
- **Total:** ~$20/month (-43% savings)

*Enterprise Scenario (AWS RDS):*
- RDS PostgreSQL (db.t3.medium): $60/month
- ElastiCache Redis: $15/month
- ECS Fargate: $30/month (2 tasks)
- **Total:** ~$105/month (+200% increase, but enterprise features)

**Conclusion:** Provider neutrality enables cost optimization based on scale.

---

## Success Metrics

### Technical Metrics
- **Provider Neutrality Score:** 1.5/10 -> 8/10
- **Direct DB Access:** 216 frontend files -> 0 frontend files
- **Supabase Client Entry Points:** 4 -> 1 (abstracted)
- **RPC Function Calls:** 34 -> 0
- **Test Coverage:** 65% -> 85%

### Performance Metrics
- **API Latency (p95):** <200ms (within 10% of baseline)
- **Error Rate:** <0.5% (comparable to pre-migration)
- **Uptime:** 99.9% (no degradation)

### Business Metrics
- **Provider Switch Time:** ~1 month -> <1 day
- **Cost Flexibility:** Locked to $35/month -> $20-$105/month range
- **Deployment Resilience:** Single instance -> Multi-instance ready

---

## Timeline Summary

| Phase | Duration | Effort | Dependencies |
|-------|----------|--------|--------------|
| 1. Backend Repository Layer | 2 weeks | 80 hours | None |
| 2. Backend API Endpoints | 2 weeks | 80 hours | Phase 1 |
| 3. Auth Abstraction | 1 week | 40 hours | None |
| 4. Frontend API Migration | 3 weeks | 120 hours | Phase 2 |
| 5. RPC to SQL | 1 week | 40 hours | Phase 1 |
| 6. Config & Environment | 1 week | 40 hours | None |
| 7. Staging Cutover | 2 weeks | 80 hours | Phases 1-6 |
| **Total** | **12 weeks** | **480 hours** | |

**Effort Breakdown:**
- Backend development: 240 hours (50%)
- Frontend development: 120 hours (25%)
- Testing/QA: 80 hours (17%)
- DevOps/deployment: 40 hours (8%)

---

## Trigger Condition

**Implement when approaching ~100 customers.**

**Current Status:**
- User count: Single digits
- Revenue: Pre-revenue
- Traffic: <1,000 requests/day

**Decision Point:**
- 50-75 active users: Begin Phase 1
- 75-100 active users: Complete Phases 1-3
- 100+ active users: Full migration (Phases 4-7)

**Why wait?**
- Supabase works fine at current scale
- Premature optimization wastes engineering time
- Migration complexity increases with more users (better to start early)

---

## Key Principles

1. **Backward Compatibility:** Every phase must not break existing functionality
2. **Feature Flags:** All new code paths behind toggles for instant rollback
3. **Gradual Rollout:** Percentage-based traffic splitting for validation
4. **Zero Downtime:** Blue/green deployments, database migrations are additive
5. **Staging First:** Every change validated on staging before production
6. **Monitoring Obsession:** Detailed logging, error tracking, performance metrics
7. **Rollback Ready:** One-command rollback for every deployment

---

## Next Steps

1. **Read this plan:** Ensure team alignment on strategy
2. **Schedule kickoff:** When user count hits 50
3. **Create Phase 1 PRD:** Detailed implementation plan for repository layer
4. **Setup monitoring:** Establish baseline metrics before migration
5. **Provision staging:** Ensure staging environment mirrors production

---

**Document Owner:** Engineering Team
**Last Updated:** February 8, 2026
**Status:** Planning Phase (Not Yet Implemented)
