# Supabase Security Advisors Fix - January 2026

## Summary
Fixed all ERROR and critical WARN-level security issues identified by Supabase Advisors.

---

## Fixes Applied

### 1. Function Search Path Mutable (9 functions) - ✅ FIXED

**Issue**: SECURITY DEFINER functions without explicit search_path are vulnerable to search path attacks.

**Solution**: Added `SET search_path = public` to all affected functions.

**Functions Fixed**:
1. `update_product_issue_reports_updated_at()`
2. `update_article_helpful_count()`
3. `update_community_knowledge_updated_at()`
4. `search_memories(text, integer)`
5. `search_memories(vector, uuid, double precision, integer)`
6. `search_sessions(uuid)`
7. `search_sessions(vector, uuid, double precision, integer)`
8. `update_memory_access()`
9. `update_memory_access(uuid)`
10. `get_next_event_sequence()`
11. `get_next_event_sequence(uuid)`
12. `is_admin()`

**Verification**:
```sql
SELECT
  proname as function_name,
  proconfig as config_settings
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proconfig IS NOT NULL
  AND 'search_path=public' = ANY(proconfig);
```

---

### 2. RLS Policy Always True (Critical Policies) - ✅ FIXED

#### A. trip_template_ratings
**Before**: TEMP policies with USING (true) for ALL commands
**After**: User-scoped policies

```sql
-- Users can view all ratings (public information)
CREATE POLICY "Users can view all ratings"
ON trip_template_ratings FOR SELECT
TO authenticated USING (true);

-- Users can only create/update/delete their own ratings
CREATE POLICY "Users can rate templates"
ON trip_template_ratings FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings"
ON trip_template_ratings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings"
ON trip_template_ratings FOR DELETE
TO authenticated USING (auth.uid() = user_id);
```

#### B. user_subscriptions
**Before**: TEMP policy with USING (true) for ALL commands
**After**: User-scoped policies

```sql
-- Users can only view/manage their own subscriptions
CREATE POLICY "Users can view their own subscriptions"
ON user_subscriptions FOR SELECT
TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscriptions"
ON user_subscriptions FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
ON user_subscriptions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel their own subscriptions"
ON user_subscriptions FOR DELETE
TO authenticated USING (auth.uid() = user_id);
```

#### C. admin_users
**Before**: Public read access to all admin records
**After**: Users can only check their own admin status

```sql
DROP POLICY IF EXISTS "Public read access for admin checking" ON admin_users;

CREATE POLICY "Users can check their own admin status"
ON admin_users FOR SELECT
TO authenticated USING (auth.uid() = user_id);
```

**Security Impact**: Prevents users from enumerating all admin accounts.

#### D. profiles
**Before**: Public read access to all profiles
**After**: Scoped access based on authentication and status

```sql
DROP POLICY IF EXISTS "profiles_public_read" ON profiles;

-- Users can always see their own profile
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
TO authenticated USING (auth.uid() = id);

-- Public can only view active profiles
CREATE POLICY "Public can view active profiles"
ON profiles FOR SELECT
TO public USING (status = 'active');
```

**Security Impact**: Inactive/suspended profiles no longer visible to public.

---

## Intentionally Left as USING (true)

The following tables **should** have USING (true) policies:

### Service Role Bypass Policies
These are correct - service role needs full access:
- `agent_state_service`
- `artifacts_service`
- `events_service`
- `memories_service`
- `sessions_service`
- `content_moderation` (service_role)
- `support_tickets` (service_role)
- `audio_cache` (service_role)
- `pam_memory` (service_role)
- `failed_login_attempts` (service_role)

### Public Read-Only Data
These tables contain public information meant for all users:
- `campgrounds` - Public campground listings
- `camping_locations` - Public location data
- `fuel_stations` - Public fuel station data
- `local_events` - Public event listings
- `popular_routes` - Public route information
- `social_venues` - Public venue data
- `transaction_categories` - Reference data
- `poi_categories` - Reference data
- `newsletters` - Public newsletters
- `milestone_badges` - Public badge definitions

### Data Collector Tables
These need broad access for automated data collection:
- `data_collector_metrics`
- `data_collector_runs`
- `data_collector_sources`
- `data_collector_state`
- `trip_locations`

### Admin-Only Tables
These correctly use admin role checks:
- `bailout_plans`
- `anxiety_logs`
- `mood_check_ins`
- `launch_checkins`
- `launch_week_tasks`
- `shakedown_issues`
- `shakedown_trips`
- All `transition_*` tables
- `partner_expectations`
- `user_tags`
- `user_launch_dates`
- `user_launch_tasks`

---

## Testing Performed

### 1. Function Security
```sql
-- Verified all functions have search_path set
SELECT COUNT(*) FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prosecdef = true
  AND p.proconfig IS NULL;
-- Result: 0 (all SECURITY DEFINER functions have config)
```

### 2. RLS Policies
```sql
-- Verified TEMP policies removed
SELECT COUNT(*) FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE '%TEMP%';
-- Result: 0 (no TEMP policies remain)
```

### 3. User Access Control
- ✅ Users can only view their own subscriptions
- ✅ Users can only view their own admin status
- ✅ Users can only rate templates under their user_id
- ✅ Public can only view active profiles

---

## Remaining WARN-Level Issues

### Postgres Version (Not Fixable via SQL)
**Issue**: `pg_version_sub_11` - Running PostgreSQL 15.x (should upgrade to 16+)
**Action**: Platform-level upgrade required (Supabase managed)

### Intentional USING (true) Policies
All remaining `rls_policy_always_true` warnings are for:
1. Service role bypass policies (intentional)
2. Public read-only reference data (intentional)
3. Data collector tables (intentional)
4. Admin-role-gated tables (already protected by role checks)

---

## Files Changed

**SQL Fixes**:
- Applied directly to Supabase (no migration files)
- Documented in this file

**Documentation**:
- `docs/sql-fixes/README_SECURITY_ADVISORS_FIX.md` (this file)

---

## Deployment Status

- ✅ Applied to production Supabase instance
- ✅ All functions have search_path protection
- ✅ All TEMP policies replaced with user-scoped policies
- ✅ Critical privacy/security policies tightened

---

## Next Steps

### Optional Enhancements
1. Add profile visibility controls based on `preferences` JSONB field
2. Implement stricter RLS for PAM tables if not using service role
3. Review duplicate policies on some tables (cleanup opportunity)

### Required Actions
- None - all critical security issues resolved

---

**Date Applied**: January 9, 2026
**Applied By**: Claude Code
**Severity**: ERROR + High WARN
**Status**: ✅ Complete
