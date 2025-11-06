# Enable RLS on All Tables - Fix Instructions

**Date**: November 6, 2025
**Issue**: 22 tables have RLS policies but RLS is not enabled
**Severity**: CRITICAL SECURITY VULNERABILITY
**Impact**: Tables are publicly accessible without security enforcement

---

## Problem Summary

Supabase database linter detected 22 tables with RLS policies defined but RLS not enabled. This means:
- Policies exist but are NOT enforced
- Data is publicly accessible via PostgREST API
- Authentication/authorization is bypassed
- **CRITICAL SECURITY RISK**

---

## Affected Tables (22)

### Transition/Launch System (8 tables)
- anxiety_logs
- bailout_plans
- launch_checkins
- launch_week_tasks
- mood_check_ins
- partner_expectations
- expectation_discussions
- user_launch_dates

### User Tasks/Management (5 tables)
- user_launch_tasks
- user_tags
- user_badges
- milestone_badges
- shakedown_issues

### Community Features (6 tables)
- community_connections
- community_messages
- community_success_stories
- community_groups
- community_group_members
- community_group_posts

### Other (3 tables)
- shakedown_trips
- support_tickets
- transition_vehicle_mods

---

## How to Apply Fix

### Step 1: Open Supabase SQL Editor
1. Go to: https://supabase.com/dashboard/project/kycoklimpzkyrecbjecn
2. Click **SQL Editor** in left sidebar
3. Click **New Query**

### Step 2: Copy and Execute SQL
1. Open file: `docs/sql-fixes/enable_rls_on_all_tables.sql`
2. Copy entire contents (22 ALTER TABLE statements)
3. Paste into Supabase SQL Editor
4. Click **Run** or press Cmd+Enter (Mac) / Ctrl+Enter (Windows)

### Step 3: Verify Fix Applied
Run this verification query:
```sql
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'anxiety_logs', 'bailout_plans', 'launch_checkins', 'launch_week_tasks',
    'mood_check_ins', 'partner_expectations', 'shakedown_issues', 'shakedown_trips',
    'support_tickets', 'transition_vehicle_mods', 'user_launch_dates', 'user_launch_tasks',
    'user_tags', 'community_connections', 'community_messages', 'community_success_stories',
    'community_groups', 'community_group_members', 'community_group_posts', 'user_badges',
    'milestone_badges', 'expectation_discussions'
  )
ORDER BY tablename;
```

Expected result: All 22 tables should have `rowsecurity = true`

### Step 4: Re-run Database Linter
1. Go to: https://supabase.com/dashboard/project/kycoklimpzkyrecbjecn/advisors
2. Click **Security** tab
3. Click **Refresh**
4. Verify all "policy_exists_rls_disabled" errors are gone
5. Verify all "rls_disabled_in_public" errors for these tables are gone

---

## Expected Outcome

**Before Fix**:
- 22 tables vulnerable
- 35+ security errors in database linter

**After Fix**:
- All 22 tables protected by RLS
- All security errors for these tables resolved
- Existing RLS policies now actively enforced

---

## Important Notes

1. **No Data Loss**: This operation only enables RLS, does not modify data
2. **Existing Policies**: All existing RLS policies will now be enforced
3. **Admin Access**: Service role bypass still works for backend operations
4. **User Impact**: No user-facing changes, better security enforcement
5. **Reversible**: Can disable with `ALTER TABLE ... DISABLE ROW LEVEL SECURITY;` if needed

---

## Troubleshooting

### If some tables still show errors:
1. Check if table name is spelled correctly in SQL
2. Verify you ran ALL 22 ALTER TABLE statements
3. Check for any SQL execution errors in Supabase

### If policies are blocking legitimate access:
1. Review RLS policy definitions for affected table
2. Ensure policies have correct auth.uid() checks
3. Verify user roles are set correctly in JWT tokens

---

## Related Documentation

- Calendar RLS Fix: `docs/sql-fixes/fix_calendar_rls_properly.sql`
- Database Schema Reference: `docs/DATABASE_SCHEMA_REFERENCE.md`
- Supabase RLS Guide: https://supabase.com/docs/guides/database/postgres/row-level-security

---

**Action Required**: Apply this fix IMMEDIATELY to close security vulnerability
**Estimated Time**: 2 minutes to apply + verify
**Risk**: NONE (only enables security, doesn't change data)
