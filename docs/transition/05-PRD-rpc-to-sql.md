# Phase 5 PRD: Replace Supabase RPC Functions with Standard SQL

## Goal

Replace all 34 Supabase RPC function calls (`.rpc('function_name', params)`) with equivalent standard SQL queries executed through the repository layer (Phase 1), eliminating dependency on Supabase-specific PostgreSQL functions.

This phase completes the database abstraction by removing the last Supabase-specific call pattern, making the codebase database-agnostic.

---

## Current State

### Frontend RPC Calls (23 unique functions)

These are called via `supabase.rpc('name', params)` from TypeScript files:

| RPC Function | File Location | Category | Purpose |
|---|---|---|---|
| `calculate_trust_score` | `src/services/socialService.ts` | Social | Calculate user trust score based on activity |
| `check_badge_eligibility` | `src/services/badgeService.ts` | Social | Check if user qualifies for achievement badge |
| `check_failed_login_attempts` | `src/services/authService.ts` | Auth/Security | Count recent failed login attempts |
| `check_rate_limit` | `src/services/apiService.ts` | Auth/Security | Rate limiting check for API requests |
| `cleanup_expired_pam_memories` | `src/services/pamService.ts` | PAM | Delete expired PAM conversation memories |
| `delete_user_pam_memories` | `src/services/pamService.ts` | PAM | Delete all PAM memories for a user |
| `diagnose_auth_issue` | `src/services/authService.ts` | Auth/Debug | Debug authentication problems |
| `exec_sql` | `src/services/adminService.ts` | Admin | Execute arbitrary SQL (DANGEROUS) |
| `find_similar_memories` | `src/services/pamService.ts` | PAM | Vector similarity search using pgvector |
| `find_similar_users` | `src/services/socialService.ts` | Social | Find users with similar profiles/interests |
| `get_current_user_id` | `src/services/authService.ts` | Auth | Get current user ID from JWT |
| `get_days_until_launch` | `src/services/transitionService.ts` | Transition | Calculate days until launch date |
| `get_equipment_stats` | `src/services/transitionService.ts` | Transition | Equipment inventory statistics |
| `get_launch_week_progress` | `src/services/transitionService.ts` | Transition | Launch week task completion percentage |
| `get_shakedown_stats` | `src/services/transitionService.ts` | Transition | Shakedown trip statistics summary |
| `get_user_connection_stats` | `src/services/socialService.ts` | Social | Connection/follower/following counts |
| `get_vehicle_mod_stats` | `src/services/transitionService.ts` | Transition | Vehicle modification statistics |
| `increment_product_clicks` | `src/services/shopService.ts` | Shop | Track affiliate product click count |
| `increment_template_usage` | `src/services/tripService.ts` | Trips | Track trip template usage count |
| `log_security_event` | `src/services/securityService.ts` | Auth/Security | Write to security audit log |
| `start_transition_profile` | `src/services/transitionService.ts` | Transition | Initialize transition planning data |
| `test_manual_jwt_extraction` | `src/services/authService.ts` | Auth/Debug | Debug JWT token parsing |
| `update_memory_importance` | `src/services/pamService.ts` | PAM | Update memory priority score |

### Backend RPC Calls (11 unique functions)

Called via Supabase Python client `.rpc('name', params)`:

| RPC Function | File Location | Category | Purpose |
|---|---|---|---|
| `create_default_transition_tasks` | `backend/app/services/transition.py` | Transition | Seed default planning tasks |
| `decrement_post_likes` | `backend/app/services/social.py` | Social | Decrease like count atomically |
| `exec_sql` | `backend/app/services/admin.py` | Admin | Execute arbitrary SQL |
| `execute_sql` | `backend/app/services/admin.py` | Admin | Execute arbitrary SQL (duplicate) |
| `foobar` | `backend/app/services/test.py` | Debug | Test function (should be removed) |
| `get_downsizing_stats` | `backend/app/services/transition.py` | Transition | Downsizing progress statistics |
| `get_income_stats` | `backend/app/services/financial.py` | Financial | Income summary aggregation |
| `get_service_stats` | `backend/app/services/admin.py` | Admin | Service health statistics |
| `increment_post_comments` | `backend/app/services/social.py` | Social | Increase comment count atomically |
| `increment_post_likes` | `backend/app/services/social.py` | Social | Increase like count atomically |
| `update_memory_access` | `backend/app/services/pam.py` | PAM | Update last accessed timestamp |

---

## Target State

Each RPC function replaced with one of:
1. **Repository method** - SQL query in the appropriate repository (from Phase 1)
2. **Backend API endpoint** - Frontend calls REST API instead of direct RPC (from Phase 2)
3. **Removed** - Debug/test functions that shouldn't exist in production

### Migration Categories

#### Category A: Functions to Remove (Not Migrate)

These should be deleted entirely or moved to admin-only diagnostic endpoints:

| Function | Action | Reason |
|---|---|---|
| `exec_sql` | Remove | Arbitrary SQL execution is a critical security vulnerability |
| `execute_sql` | Remove | Duplicate of exec_sql, same security issue |
| `foobar` | Remove | Test function with no production purpose |
| `test_manual_jwt_extraction` | Remove | Debug utility, not needed in production |
| `diagnose_auth_issue` | Move to admin endpoint | Debug utility, should be admin-only |
| `get_current_user_id` | Remove | Redundant - JWT already contains user_id in claims |

#### Category B: Simple Atomic Operations (Direct SQL Replacement)

These are simple single-table operations that translate directly to SQL:

| Function | Repository | SQL Equivalent |
|---|---|---|
| `increment_product_clicks` | `ShopRepository` | `UPDATE affiliate_products SET click_count = click_count + 1 WHERE id = $1 RETURNING click_count` |
| `increment_post_likes` | `SocialRepository` | `UPDATE social_posts SET likes_count = likes_count + 1 WHERE id = $1 RETURNING likes_count` |
| `decrement_post_likes` | `SocialRepository` | `UPDATE social_posts SET likes_count = likes_count - 1 WHERE id = $1 AND likes_count > 0 RETURNING likes_count` |
| `increment_post_comments` | `SocialRepository` | `UPDATE social_posts SET comments_count = comments_count + 1 WHERE id = $1 RETURNING comments_count` |
| `increment_template_usage` | `TripRepository` | `UPDATE trip_templates SET usage_count = usage_count + 1 WHERE id = $1 RETURNING usage_count` |
| `update_memory_importance` | `PamRepository` | `UPDATE pam_memories SET importance = $2, updated_at = NOW() WHERE id = $1 AND user_id = $3` |
| `update_memory_access` | `PamRepository` | `UPDATE pam_memories SET last_accessed = NOW() WHERE id = $1 AND user_id = $2` |
| `cleanup_expired_pam_memories` | `PamRepository` | `DELETE FROM pam_memories WHERE expires_at < NOW() AND user_id = $1` |
| `delete_user_pam_memories` | `PamRepository` | `DELETE FROM pam_memories WHERE user_id = $1` |
| `log_security_event` | `SecurityRepository` | `INSERT INTO security_events (user_id, event_type, details, ip_address, created_at) VALUES ($1, $2, $3, $4, NOW())` |

#### Category C: Simple Aggregation Queries

These are single-table aggregations:

**`check_failed_login_attempts`** -> `SecurityRepository.countFailedLogins(userId, since)`
```sql
SELECT COUNT(*)
FROM user_login_history
WHERE user_id = $1
  AND success = false
  AND created_at > $2
```

**`check_rate_limit`** -> `SecurityRepository.countRecentRequests(userId, since)`
```sql
SELECT COUNT(*)
FROM api_requests
WHERE user_id = $1
  AND created_at > $2
```

**`get_days_until_launch`** -> `TransitionRepository.getDaysUntilLaunch(userId)`
```sql
SELECT EXTRACT(DAY FROM (launch_date - CURRENT_DATE))::int AS days_remaining
FROM transition_profiles
WHERE user_id = $1
```

**`get_user_connection_stats`** -> `SocialRepository.getConnectionStats(userId)`
```sql
SELECT
  (SELECT COUNT(*) FROM user_connections WHERE user_id = $1 AND status = 'accepted') AS connections_count,
  (SELECT COUNT(*) FROM user_connections WHERE connected_user_id = $1 AND status = 'accepted') AS followers_count,
  (SELECT COUNT(*) FROM user_connections WHERE user_id = $1 AND status = 'accepted') AS following_count
```

#### Category D: Complex Multi-Table Aggregations

These require more complex SQL but are still standard queries:

**`calculate_trust_score`** -> `SocialRepository.calculateTrustScore(userId)`
```sql
SELECT
  COALESCE(
    (
      (COUNT(DISTINCT posts.id) * 2) +
      (COUNT(DISTINCT comments.id) * 1) +
      (COUNT(DISTINCT connections.id) * 3) +
      (SUM(posts.likes_count) * 0.5)
    ) / 10.0,
    0
  )::numeric(5,2) AS trust_score
FROM profiles
LEFT JOIN social_posts posts ON posts.user_id = profiles.id
LEFT JOIN social_comments comments ON comments.user_id = profiles.id
LEFT JOIN user_connections connections ON connections.user_id = profiles.id AND connections.status = 'accepted'
WHERE profiles.id = $1
GROUP BY profiles.id
```

**`check_badge_eligibility`** -> `BadgeRepository.checkEligibility(userId, badgeType)`
```sql
-- Example for "social_butterfly" badge (100+ connections)
SELECT
  CASE
    WHEN COUNT(*) >= 100 THEN true
    ELSE false
  END AS eligible,
  COUNT(*) AS progress
FROM user_connections
WHERE user_id = $1 AND status = 'accepted'
```

**`get_equipment_stats`** -> `TransitionRepository.getEquipmentStats(userId)`
```sql
SELECT
  COUNT(*) AS total_items,
  SUM(CASE WHEN category = 'keep' THEN 1 ELSE 0 END) AS keeping,
  SUM(CASE WHEN category = 'sell' THEN 1 ELSE 0 END) AS selling,
  SUM(CASE WHEN category = 'donate' THEN 1 ELSE 0 END) AS donating,
  SUM(CASE WHEN category = 'undecided' THEN 1 ELSE 0 END) AS undecided
FROM equipment_inventory
WHERE user_id = $1
```

**`get_shakedown_stats`** -> `TransitionRepository.getShakedownStats(userId)`
```sql
SELECT
  COUNT(DISTINCT trips.id) AS total_trips,
  SUM(trips.distance_miles) AS total_miles,
  COUNT(DISTINCT issues.id) AS issues_found,
  COUNT(DISTINCT issues.id) FILTER (WHERE issues.resolved = true) AS issues_resolved
FROM trips
LEFT JOIN trip_issues issues ON issues.trip_id = trips.id
WHERE trips.user_id = $1 AND trips.trip_type = 'shakedown'
```

**`get_vehicle_mod_stats`** -> `TransitionRepository.getVehicleModStats(userId)`
```sql
SELECT
  COUNT(*) AS total_mods,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
  SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
  SUM(CASE WHEN status = 'planned' THEN 1 ELSE 0 END) AS planned,
  SUM(cost) AS total_cost
FROM vehicle_modifications
WHERE user_id = $1
```

**`get_downsizing_stats`** -> `TransitionRepository.getDownsizingStats(userId)`
```sql
SELECT
  COUNT(*) AS total_items,
  SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) AS sold,
  SUM(CASE WHEN status = 'donated' THEN 1 ELSE 0 END) AS donated,
  SUM(CASE WHEN status = 'keeping' THEN 1 ELSE 0 END) AS keeping,
  SUM(CASE WHEN status = 'sold' THEN sale_price ELSE 0 END) AS total_revenue
FROM downsizing_items
WHERE user_id = $1
```

**`get_income_stats`** -> `FinancialRepository.getIncomeStats(userId, startDate, endDate)`
```sql
SELECT
  SUM(amount) AS total_income,
  AVG(amount) AS average_income,
  COUNT(*) AS transaction_count,
  SUM(CASE WHEN category = 'work' THEN amount ELSE 0 END) AS work_income,
  SUM(CASE WHEN category = 'side_hustle' THEN amount ELSE 0 END) AS side_income,
  SUM(CASE WHEN category = 'passive' THEN amount ELSE 0 END) AS passive_income
FROM income_transactions
WHERE user_id = $1
  AND transaction_date >= $2
  AND transaction_date <= $3
```

**`get_launch_week_progress`** -> `TransitionRepository.getLaunchWeekProgress(userId)`
```sql
SELECT
  COUNT(*) AS total_tasks,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_tasks,
  ROUND(
    (SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0)) * 100,
    2
  ) AS completion_percentage
FROM transition_tasks
WHERE user_id = $1
  AND week_number = (
    SELECT EXTRACT(WEEK FROM CURRENT_DATE - launch_date)
    FROM transition_profiles
    WHERE user_id = $1
  )
```

**`get_service_stats`** -> `AdminRepository.getServiceStats()`
```sql
SELECT
  (SELECT COUNT(*) FROM profiles WHERE created_at > NOW() - INTERVAL '24 hours') AS new_users_24h,
  (SELECT COUNT(*) FROM social_posts WHERE created_at > NOW() - INTERVAL '24 hours') AS new_posts_24h,
  (SELECT AVG(response_time_ms) FROM api_requests WHERE created_at > NOW() - INTERVAL '1 hour') AS avg_response_time,
  (SELECT COUNT(*) FROM api_requests WHERE created_at > NOW() - INTERVAL '1 hour' AND status_code >= 500) AS error_count
```

#### Category E: Complex Operations Requiring Multiple Statements

**`start_transition_profile`** -> `TransitionRepository.initializeProfile(userId)`

Requires transaction with multiple inserts:
```sql
BEGIN;

-- Insert transition profile
INSERT INTO transition_profiles (user_id, launch_date, current_phase, created_at)
VALUES ($1, $2, 'planning', NOW())
ON CONFLICT (user_id) DO NOTHING;

-- Insert default categories
INSERT INTO equipment_categories (user_id, name, description)
VALUES
  ($1, 'Kitchen', 'Cooking and food storage'),
  ($1, 'Clothing', 'Personal clothing and accessories'),
  ($1, 'Electronics', 'Tech and gadgets'),
  ($1, 'Outdoor Gear', 'Camping and outdoor equipment')
ON CONFLICT DO NOTHING;

-- Insert default milestones
INSERT INTO transition_milestones (user_id, name, target_date, status)
VALUES
  ($1, 'Downsize Home', $2 - INTERVAL '6 months', 'pending'),
  ($1, 'Purchase RV', $2 - INTERVAL '4 months', 'pending'),
  ($1, 'First Shakedown Trip', $2 - INTERVAL '2 months', 'pending'),
  ($1, 'Launch Day', $2, 'pending')
ON CONFLICT DO NOTHING;

COMMIT;
```

**`create_default_transition_tasks`** -> `TransitionRepository.createDefaultTasks(userId)`

Batch insert:
```sql
INSERT INTO transition_tasks (user_id, title, description, category, week_number, priority)
VALUES
  ($1, 'Create equipment inventory', 'List all belongings and categorize', 'planning', 1, 'high'),
  ($1, 'Research RV types', 'Determine best RV type for lifestyle', 'planning', 1, 'high'),
  ($1, 'Set launch date', 'Choose target date for hitting the road', 'planning', 1, 'critical'),
  ($1, 'Budget assessment', 'Calculate current expenses and future needs', 'financial', 2, 'high'),
  -- ... (20+ more default tasks)
ON CONFLICT DO NOTHING
RETURNING id, title
```

#### Category F: Vector Similarity (PostgreSQL-Specific)

**`find_similar_memories`** -> `PamRepository.findSimilarMemories(userId, embedding, limit)`

This uses pgvector extension, which is PostgreSQL-specific:
```sql
SELECT
  id,
  content,
  importance,
  created_at,
  1 - (embedding <=> $2::vector) AS similarity
FROM pam_memories
WHERE user_id = $1
ORDER BY embedding <=> $2::vector
LIMIT $3
```

**Note**: This remains a PostgreSQL dependency even after removing Supabase. If switching to another database, vector similarity will require:
- SQLite: sqlite-vss extension
- MySQL: InnoDB full-text search (less accurate)
- Alternative: Move to dedicated vector DB (Pinecone, Weaviate, etc.)

**`find_similar_users`** -> `SocialRepository.findSimilarUsers(userId, limit)`

This can be done without vectors using profile matching:
```sql
WITH user_interests AS (
  SELECT interest_tags FROM profiles WHERE id = $1
),
user_location AS (
  SELECT current_location FROM profiles WHERE id = $1
)
SELECT
  p.id,
  p.username,
  p.avatar_url,
  p.bio,
  CARDINALITY(
    ARRAY(
      SELECT UNNEST(p.interest_tags)
      INTERSECT
      SELECT UNNEST(ui.interest_tags)
    )
  ) AS shared_interests,
  ST_Distance(p.current_location, ul.current_location) AS distance_km
FROM profiles p
CROSS JOIN user_interests ui
CROSS JOIN user_location ul
WHERE p.id != $1
ORDER BY shared_interests DESC, distance_km ASC
LIMIT $2
```

---

## Tasks

### Task 1: Audit RPC Function Implementations
**Duration**: 2 days

1. Export all PostgreSQL function definitions from Supabase:
   ```sql
   SELECT
     routine_name,
     routine_definition
   FROM information_schema.routines
   WHERE routine_type = 'FUNCTION'
     AND routine_schema = 'public'
   ORDER BY routine_name;
   ```

2. Document each function's:
   - SQL implementation
   - Input parameters and types
   - Return type
   - Dependencies (other functions, extensions)
   - Performance characteristics (indexes used, query plan)

3. Create mapping document: `docs/transition/RPC_FUNCTION_AUDIT.md`

### Task 2: Create Repository Methods (Category B & C)
**Duration**: 3 days

For each simple operation and aggregation:

1. Add method to appropriate repository (from Phase 1)
2. Write unit tests verifying identical behavior to RPC
3. Add JSDoc/docstring with migration note

Example:
```typescript
// src/repositories/ShopRepository.ts
export class ShopRepository extends BaseRepository {
  /**
   * Increment product click count atomically
   * Replaces RPC: increment_product_clicks
   */
  async incrementProductClicks(productId: string): Promise<number> {
    const result = await this.db.query(
      `UPDATE affiliate_products
       SET click_count = click_count + 1
       WHERE id = $1
       RETURNING click_count`,
      [productId]
    );
    return result.rows[0].click_count;
  }
}
```

### Task 3: Create Repository Methods (Category D)
**Duration**: 4 days

For each complex aggregation:

1. Implement SQL query in repository
2. Add database indexes if needed for performance
3. Write unit tests comparing results to RPC version
4. Benchmark query performance vs RPC

Pay special attention to:
- Query optimization (EXPLAIN ANALYZE)
- Index usage
- N+1 query avoidance

### Task 4: Create Repository Methods (Category E)
**Duration**: 3 days

For multi-statement operations:

1. Implement as repository method using transactions
2. Ensure atomicity (all-or-nothing)
3. Add proper error handling and rollback
4. Test edge cases (partial failure, constraints)

Example:
```typescript
// src/repositories/TransitionRepository.ts
export class TransitionRepository extends BaseRepository {
  /**
   * Initialize transition profile with defaults
   * Replaces RPC: start_transition_profile
   */
  async initializeProfile(userId: string, launchDate: Date): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Insert profile
      await tx.query(
        `INSERT INTO transition_profiles (user_id, launch_date, current_phase)
         VALUES ($1, $2, 'planning')
         ON CONFLICT (user_id) DO NOTHING`,
        [userId, launchDate]
      );

      // Insert default categories
      await tx.query(
        `INSERT INTO equipment_categories (user_id, name, description)
         VALUES ($1, 'Kitchen', 'Cooking and food storage'),
                ($1, 'Clothing', 'Personal clothing and accessories'),
                ($1, 'Electronics', 'Tech and gadgets'),
                ($1, 'Outdoor Gear', 'Camping and outdoor equipment')
         ON CONFLICT DO NOTHING`,
        [userId]
      );

      // Insert default milestones
      // ... etc
    });
  }
}
```

### Task 5: Update Frontend Callers
**Duration**: 3 days

For each frontend RPC call:

1. Replace `supabase.rpc('name', params)` with backend API call
2. Use Phase 2 API client (from API transition PRD)
3. Update error handling for HTTP responses instead of RPC errors
4. Update TypeScript types

Example:
```typescript
// Before (RPC)
const { data, error } = await supabase
  .rpc('increment_product_clicks', { product_id: productId });

// After (API)
const data = await apiClient.shop.incrementProductClicks(productId);
```

### Task 6: Update Backend Callers
**Duration**: 2 days

For each backend RPC call:

1. Replace `supabase.rpc('name', params)` with repository method call
2. Update return type handling
3. Update error handling

Example:
```python
# Before (RPC)
result = supabase.rpc('increment_post_likes', {'post_id': post_id}).execute()
likes_count = result.data

# After (Repository)
likes_count = await social_repository.increment_post_likes(post_id)
```

### Task 7: Handle Vector Similarity (Category F)
**Duration**: 2 days

For `find_similar_memories` and `find_similar_users`:

**Option A: Keep PostgreSQL dependency**
- Implement as repository method using pgvector
- Document this as remaining PostgreSQL requirement
- Add to Phase 8 "PostgreSQL Dependencies" list

**Option B: Move to external vector DB**
- Set up Pinecone/Weaviate/Qdrant
- Migrate embeddings
- Update PAM service to use vector DB API
- More complex but enables full database portability

**Recommendation**: Option A for now (keep pgvector). Vector similarity is critical for PAM and pgvector is excellent. Document as PostgreSQL dependency in Phase 8.

### Task 8: Remove Debug/Test Functions (Category A)
**Duration**: 1 day

1. Remove all calls to `exec_sql`, `execute_sql`, `foobar`, `test_manual_jwt_extraction`
2. Move `diagnose_auth_issue` to admin-only diagnostic endpoint
3. Replace `get_current_user_id` with direct JWT claim access
4. Add deprecation warnings to PostgreSQL functions

### Task 9: Create Migration Script
**Duration**: 1 day

Create `scripts/migrate-rpc-to-sql.ts`:
- Validates all RPC calls have been replaced
- Scans codebase for `.rpc(` patterns
- Reports any remaining usages
- Provides migration progress report

### Task 10: Performance Testing
**Duration**: 2 days

For each replaced RPC:

1. Benchmark RPC version vs repository version
2. Compare query plans (EXPLAIN ANALYZE)
3. Test under load (concurrent requests)
4. Ensure performance is equal or better

Create benchmark report: `docs/transition/RPC_PERFORMANCE_BENCHMARKS.md`

### Task 11: Integration Testing
**Duration**: 2 days

1. End-to-end tests for each migrated function
2. Test from frontend through API to repository
3. Verify identical behavior to RPC version
4. Test error cases and edge cases

### Task 12: Documentation Updates
**Duration**: 1 day

1. Update API documentation with new endpoints
2. Update repository documentation with new methods
3. Create migration guide for developers
4. Document any behavior changes

### Task 13: Drop PostgreSQL Functions (Final Step)
**Duration**: 1 day

After all callers migrated:

1. Create SQL script to drop all unused RPC functions
2. Save as `docs/sql-fixes/DROP_UNUSED_RPC_FUNCTIONS.sql`
3. Test on staging database
4. Run on production after verification

```sql
-- Drop RPC functions (after migration complete)
DROP FUNCTION IF EXISTS calculate_trust_score(uuid);
DROP FUNCTION IF EXISTS check_badge_eligibility(uuid, text);
DROP FUNCTION IF EXISTS check_failed_login_attempts(uuid);
-- ... (all 34 functions)
```

---

## Verification

### Automated Tests
- [ ] All unit tests pass for new repository methods
- [ ] Integration tests pass for API endpoints
- [ ] No `.rpc(` patterns found in codebase (except comments)
- [ ] Performance benchmarks show comparable or better performance

### Manual Testing
- [ ] Social features work (likes, comments, connections)
- [ ] Shop product clicks tracked correctly
- [ ] PAM memory search returns relevant results
- [ ] Transition planning statistics accurate
- [ ] Security logging works (failed logins, rate limits)
- [ ] Admin dashboard shows correct stats

### Database Verification
```sql
-- Verify RPC functions are no longer called
SELECT
  schemaname,
  funcname,
  calls
FROM pg_stat_user_functions
WHERE schemaname = 'public'
ORDER BY calls DESC;

-- Should show zero calls after migration
```

### Performance Verification
- [ ] API response times unchanged or improved
- [ ] Database CPU usage unchanged or reduced
- [ ] No N+1 query issues introduced
- [ ] Cache hit rates maintained

---

## Rollback

### Rollback Strategy

PostgreSQL functions remain in database during transition, so rollback is straightforward:

1. **Code rollback**: Revert repository changes, restore `.rpc()` calls
2. **Deploy rollback**: Previous version still works with existing RPC functions
3. **No data migration needed**: Only code changes, no schema changes

### Rollback Procedure

```bash
# 1. Revert to previous release
git revert <migration-commit-range>

# 2. Redeploy backend
cd backend
git checkout <previous-tag>
./scripts/deploy-staging.sh

# 3. Redeploy frontend
cd ..
git checkout <previous-tag>
npm run deploy:staging

# 4. Verify RPC functions still work
psql $DATABASE_URL -c "SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' ORDER BY routine_name;"
```

### Rollback Verification
- [ ] All features work as before migration
- [ ] No errors in application logs
- [ ] Performance metrics normal
- [ ] RPC function call counts increase (showing they're being used again)

---

## Dependencies

**Blocked by**:
- Phase 1: Repository Layer (complete) - need base repositories
- Phase 2: API Transition (partial) - frontend should call backend APIs

**Blocks**:
- Phase 8: Full Supabase Removal - RPC is the last Supabase-specific pattern

**Parallel work possible**:
- Can migrate Category B/C (simple functions) while Phase 2 API work continues
- Can work on backend repository methods independently of frontend API migration

---

## Success Criteria

1. Zero `.rpc()` calls in production code (grep confirms)
2. All 34 RPC functions replaced with repository methods or removed
3. Performance equal or better than RPC version (benchmark report)
4. 100% test coverage on new repository methods
5. All integration tests pass
6. No production incidents during migration
7. PostgreSQL functions dropped from database (after verification period)

---

## Risk Assessment

**Low Risk**:
- Category B (atomic operations) - straightforward SQL
- Category C (simple aggregations) - well-tested patterns

**Medium Risk**:
- Category D (complex aggregations) - potential for SQL mistakes
- Category E (multi-statement) - transaction handling complexity
- Performance regressions if indexes not optimized

**High Risk**:
- Category F (vector similarity) - critical for PAM functionality
- Any data loss in multi-statement operations
- Production performance issues if queries not optimized

**Mitigation**:
- Extensive testing on staging with production-like data
- Performance benchmarking before production deploy
- Phased rollout (migrate one category at a time)
- Keep RPC functions for 2 weeks after migration as safety net

---

## Timeline Estimate

| Task | Duration | Dependencies |
|---|---|---|
| Task 1: Audit RPC functions | 2 days | None |
| Task 2: Category B & C repositories | 3 days | Task 1 |
| Task 3: Category D repositories | 4 days | Task 1 |
| Task 4: Category E repositories | 3 days | Task 1 |
| Task 5: Update frontend callers | 3 days | Tasks 2-4, Phase 2 |
| Task 6: Update backend callers | 2 days | Tasks 2-4 |
| Task 7: Handle vector similarity | 2 days | Task 1 |
| Task 8: Remove debug functions | 1 day | None |
| Task 9: Migration script | 1 day | None |
| Task 10: Performance testing | 2 days | Tasks 2-7 |
| Task 11: Integration testing | 2 days | Tasks 2-7 |
| Task 12: Documentation | 1 day | All tasks |
| Task 13: Drop RPC functions | 1 day | All tasks, 2 week wait |

**Total**: ~15 working days (3 weeks)

**Buffer**: +1 week for unexpected issues

**Target completion**: 4 weeks from start

---

## Notes

- RPC functions are not inherently bad, but they tie us to Supabase/PostgreSQL
- Some functions (like vector similarity) may keep PostgreSQL dependency - this is acceptable
- Performance should be identical since RPC functions just wrap SQL anyway
- The real benefit is database portability and eliminating Supabase-specific patterns
- Consider keeping RPC functions in database for 30 days after migration as safety net
