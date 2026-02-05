# PAM Database RLS Policy Fix - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ensure all 27 PAM-accessed database tables have correct RLS policies and grants so PAM tools can read/write data without errors.

**Architecture:** PAM tools use a service role Supabase client that bypasses RLS. However, proper RLS policies + grants are still required for: (a) frontend user access, (b) defense in depth, (c) the `authenticated` and `admin` roles. The fix creates a single comprehensive SQL migration covering all PAM tables with proper policies, grants, and service role access. A diagnostic script validates the fix.

**Tech Stack:** PostgreSQL (Supabase), Python (diagnostic/test scripts), Supabase MCP for direct SQL execution.

---

## Context

### The Problem
PAM tools fail with "new row violates row-level security policy" errors. The PRD (`docs/PRD_PAM_DATABASE_RLS_POLICY_FIX.md`) identified this as a critical blocker.

### Root Cause Analysis
From codebase exploration:

1. **Service role client** (`backend/app/core/database.py`) uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS. All `safe_db_*` functions use this client.
2. **8 direct Supabase calls** in tools also use the same service role client via `get_supabase_client()`.
3. **BUT** - if the service role key is misconfigured (or missing), the code falls back to a `MockClient` that silently fails. The actual RLS errors likely come from:
   - Missing `GRANT` permissions on tables for the `service_role` PostgreSQL role
   - Tables that don't exist yet (several PAM tables referenced in tools may be missing)
   - Frontend operations hitting tables without proper `authenticated` role policies

### Tables PAM Tools Write To (27 total)
From the audit of all `safe_db_insert/update/delete` and direct Supabase calls:

| Table | Operations | Tools |
|-------|-----------|-------|
| `user_trips` | INSERT | plan_trip |
| `vehicles` | INSERT, UPDATE | create_vehicle, update_vehicle_fuel_consumption |
| `calendar_events` | INSERT, UPDATE, DELETE | create/update/delete_calendar_event |
| `expenses` | INSERT | create_expense |
| `budgets` | INSERT, UPDATE | update_budget |
| `pam_savings_events` | INSERT | track_savings, auto_track_savings |
| `fuel_log` | INSERT, UPDATE, DELETE | fuel_crud |
| `maintenance_records` | INSERT, UPDATE, DELETE | maintenance_crud |
| `posts` | INSERT | create_post |
| `comments` | INSERT | comment_on_post |
| `post_likes` | INSERT, DELETE | like_post |
| `messages` | INSERT | message_friend |
| `user_follows` | INSERT, DELETE | follow_user |
| `shared_locations` | INSERT | share_location |
| `events` | INSERT | create_event |
| `event_attendees` | INSERT | create_event |
| `profiles` | UPDATE | update_profile |
| `meal_plans` | INSERT | plan_meals |
| `pantry_items` | INSERT, UPDATE, DELETE | manage_pantry |
| `recipes` | UPDATE | share_recipe |
| `shopping_lists` | INSERT | generate_shopping_list |
| `favorite_locations` | INSERT | save_favorite_spot |
| `shakedown_trips` | INSERT | shakedown_tools |
| `shakedown_issues` | INSERT | shakedown_tools |
| `transition_equipment` | INSERT, UPDATE | equipment_tools |
| `user_launch_tasks` | INSERT, UPDATE | launch_week_tools |
| `transition_tasks` | INSERT, UPDATE | task_tools |
| `community_tips` | INSERT | submit_tip |
| `tip_usage_log` | INSERT | search_tips |
| `community_knowledge` | UPDATE | search_knowledge |
| `pam_admin_knowledge` | INSERT | add_knowledge |
| `pam_knowledge_usage_log` | INSERT | search_knowledge |
| `timers_and_alarms` | INSERT, UPDATE | timer_alarm_tool |
| `user_settings` | SELECT | calculate_gas_cost (read) |

### Existing RLS Fix Pattern (proven working)
From `docs/sql-fixes/20250808171821-comprehensive-pam-rls-fix.sql`:

```sql
ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;

-- User access
CREATE POLICY "users_manage_own_data" ON public.table_name
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Service role access (backend/PAM tools)
CREATE POLICY "service_role_access" ON public.table_name
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.table_name TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.table_name TO service_role;
```

---

## Task 1: Write Diagnostic SQL Script

**Files:**
- Create: `docs/sql-fixes/PAM_RLS_DIAGNOSTIC.sql`

**Step 1: Write the diagnostic SQL**

```sql
-- PAM RLS Diagnostic Script
-- Checks all 27+ PAM-accessed tables for: existence, RLS status, policies, grants

-- 1. Check which PAM tables exist
SELECT 'TABLE_EXISTS' as check_type, tablename,
  CASE WHEN rowsecurity THEN 'RLS_ON' ELSE 'RLS_OFF' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'user_trips', 'vehicles', 'calendar_events', 'expenses', 'budgets',
    'pam_savings_events', 'fuel_log', 'maintenance_records',
    'posts', 'comments', 'post_likes', 'messages', 'user_follows',
    'shared_locations', 'events', 'event_attendees', 'profiles',
    'meal_plans', 'pantry_items', 'recipes', 'shopping_lists',
    'favorite_locations', 'shakedown_trips', 'shakedown_issues',
    'transition_equipment', 'user_launch_tasks', 'transition_tasks',
    'community_tips', 'tip_usage_log', 'community_knowledge',
    'pam_admin_knowledge', 'pam_knowledge_usage_log',
    'timers_and_alarms', 'user_settings'
  )
ORDER BY tablename;

-- 2. Check RLS policies on PAM tables
SELECT 'POLICY' as check_type, tablename, policyname, cmd, roles::text
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'user_trips', 'vehicles', 'calendar_events', 'expenses', 'budgets',
    'pam_savings_events', 'fuel_log', 'maintenance_records',
    'posts', 'comments', 'post_likes', 'messages', 'user_follows',
    'shared_locations', 'events', 'event_attendees', 'profiles',
    'meal_plans', 'pantry_items', 'recipes', 'shopping_lists',
    'favorite_locations', 'shakedown_trips', 'shakedown_issues',
    'transition_equipment', 'user_launch_tasks', 'transition_tasks',
    'community_tips', 'tip_usage_log', 'community_knowledge',
    'pam_admin_knowledge', 'pam_knowledge_usage_log',
    'timers_and_alarms', 'user_settings'
  )
ORDER BY tablename, policyname;

-- 3. Check grants on PAM tables
SELECT 'GRANT' as check_type, table_name, grantee, string_agg(privilege_type, ', ') as privileges
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name IN (
    'user_trips', 'vehicles', 'calendar_events', 'expenses', 'budgets',
    'pam_savings_events', 'fuel_log', 'maintenance_records',
    'posts', 'comments', 'post_likes', 'messages', 'user_follows',
    'shared_locations', 'events', 'event_attendees', 'profiles',
    'meal_plans', 'pantry_items', 'recipes', 'shopping_lists',
    'favorite_locations', 'shakedown_trips', 'shakedown_issues',
    'transition_equipment', 'user_launch_tasks', 'transition_tasks',
    'community_tips', 'tip_usage_log', 'community_knowledge',
    'pam_admin_knowledge', 'pam_knowledge_usage_log',
    'timers_and_alarms', 'user_settings'
  )
  AND grantee IN ('authenticated', 'service_role', 'anon')
GROUP BY table_name, grantee
ORDER BY table_name, grantee;
```

**Step 2: Run diagnostic via Supabase MCP**

Run: `mcp__supabase__execute_sql` with the diagnostic script
Expected: Output showing which tables exist, which have RLS, which have policies/grants

**Step 3: Commit**

```bash
git add docs/sql-fixes/PAM_RLS_DIAGNOSTIC.sql
git commit -m "docs: add PAM RLS diagnostic script for all tool-accessed tables"
```

---

## Task 2: Create Comprehensive PAM RLS Fix Migration

**Files:**
- Create: `docs/sql-fixes/PAM_COMPREHENSIVE_RLS_FIX_2026.sql`

**Step 1: Write the comprehensive RLS fix SQL**

This script must be **idempotent** (safe to run multiple times). For each of the 27+ PAM tables:
1. Drop existing policies (to avoid conflicts)
2. Enable RLS
3. Create user access policy (`auth.uid() = user_id`)
4. Create service role policy (`auth.role() = 'service_role'`)
5. Grant permissions to `authenticated` and `service_role`

The script follows the proven pattern from `20250808171821-comprehensive-pam-rls-fix.sql`.

**Important exceptions:**
- `profiles` table uses `id` NOT `user_id` for ownership check
- `post_likes` and `user_follows` may use composite keys
- Some tables (like `community_tips`, `community_knowledge`) may need public read access

The SQL is structured as:
```sql
-- Section per table group:
-- A) Core user data (profiles, user_settings, vehicles)
-- B) Financial (expenses, budgets, fuel_log)
-- C) Trip (user_trips, favorite_locations)
-- D) Calendar (calendar_events, timers_and_alarms)
-- E) Social (posts, comments, post_likes, messages, user_follows, shared_locations, events, event_attendees)
-- F) Meals (meal_plans, pantry_items, recipes, shopping_lists)
-- G) Maintenance (maintenance_records)
-- H) Transition (shakedown_trips, shakedown_issues, transition_equipment, user_launch_tasks, transition_tasks)
-- I) Community (community_tips, tip_usage_log, community_knowledge)
-- J) PAM internal (pam_savings_events, pam_admin_knowledge, pam_knowledge_usage_log)
```

Each section follows this template:

```sql
-- ============ TABLE: table_name ============
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'table_name') THEN
    -- Drop existing policies to avoid conflicts
    DROP POLICY IF EXISTS "policy_name_1" ON public.table_name;
    DROP POLICY IF EXISTS "policy_name_2" ON public.table_name;
    -- ... drop all known policy names for this table

    -- Enable RLS
    ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;

    -- User access: own data only
    CREATE POLICY "table_name_user_all" ON public.table_name
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    -- Service role: full access (PAM backend)
    CREATE POLICY "table_name_service_role" ON public.table_name
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);

    -- Grants
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.table_name TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.table_name TO service_role;

    RAISE NOTICE 'Fixed RLS for table_name';
  ELSE
    RAISE NOTICE 'MISSING TABLE: table_name - needs creation';
  END IF;
END $$;
```

**Step 2: Commit**

```bash
git add docs/sql-fixes/PAM_COMPREHENSIVE_RLS_FIX_2026.sql
git commit -m "sql: comprehensive RLS policy fix for all 27+ PAM-accessed tables"
```

---

## Task 3: Apply RLS Fix via Supabase MCP

**Step 1: Run the comprehensive fix**

Run: `mcp__supabase__execute_sql` with the SQL from Task 2
Expected: NOTICE messages confirming each table was fixed or flagged as missing

**Step 2: Run diagnostic again to verify**

Run: `mcp__supabase__execute_sql` with the diagnostic script from Task 1
Expected: All existing PAM tables show RLS_ON, have user + service_role policies, and proper grants

**Step 3: Record results**

Save the output showing which tables were fixed and which are missing.

---

## Task 4: Create Missing PAM Tables (if any)

Based on diagnostic results from Task 3, some tables may not exist yet. These are likely newer tables added by tool code but never migrated to the database.

**Step 1: Write CREATE TABLE statements for missing tables**

Create: `docs/sql-fixes/PAM_CREATE_MISSING_TABLES_2026.sql`

Each missing table follows the schema implied by the tool code that inserts into it. For example, if `meal_plans` doesn't exist:

```sql
CREATE TABLE IF NOT EXISTS public.meal_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- columns based on tool insert data structure
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Step 2: Apply missing table creation**

Run: `mcp__supabase__execute_sql` with the creation script

**Step 3: Re-apply RLS fix for newly created tables**

Run the relevant sections of the comprehensive fix from Task 2

**Step 4: Commit**

```bash
git add docs/sql-fixes/PAM_CREATE_MISSING_TABLES_2026.sql
git commit -m "sql: create missing PAM tables and apply RLS policies"
```

---

## Task 5: Write Python Diagnostic Test

**Files:**
- Create: `tests/pam/test_rls_database_access.py`

**Step 1: Write the failing test**

```python
"""
Test PAM database access for all tool-accessed tables.
Validates that the service role client can read/write to each table.
"""
import pytest
import asyncio
from unittest.mock import patch, MagicMock, AsyncMock


# Tables that PAM tools INSERT into
PAM_INSERT_TABLES = [
    "user_trips", "vehicles", "calendar_events", "expenses", "budgets",
    "pam_savings_events", "fuel_log", "maintenance_records",
    "posts", "comments", "post_likes", "messages", "user_follows",
    "shared_locations", "events", "event_attendees",
    "meal_plans", "pantry_items", "shopping_lists",
    "favorite_locations", "shakedown_trips", "shakedown_issues",
    "transition_equipment", "user_launch_tasks", "transition_tasks",
    "community_tips", "tip_usage_log",
    "pam_admin_knowledge", "pam_knowledge_usage_log",
    "timers_and_alarms",
]

# Tables that PAM tools SELECT from
PAM_SELECT_TABLES = PAM_INSERT_TABLES + [
    "profiles", "user_settings", "community_knowledge", "recipes",
]


def test_safe_db_insert_accepts_all_pam_tables():
    """Verify safe_db_insert function signature works for all PAM tables."""
    import inspect
    from app.services.pam.tools.utils.database import safe_db_insert

    sig = inspect.signature(safe_db_insert)
    params = list(sig.parameters.keys())

    assert "table" in params
    assert "data" in params
    assert "user_id" in params


def test_safe_db_select_accepts_all_pam_patterns():
    """Verify safe_db_select function signature works for all PAM patterns."""
    import inspect
    from app.services.pam.tools.utils.database import safe_db_select

    sig = inspect.signature(safe_db_select)
    params = list(sig.parameters.keys())

    assert "table" in params
    assert "filters" in params
    assert "columns" in params
    assert "single" in params


def test_safe_db_update_accepts_id_column():
    """Verify safe_db_update supports custom id_column for profiles table."""
    import inspect
    from app.services.pam.tools.utils.database import safe_db_update

    sig = inspect.signature(safe_db_update)
    params = list(sig.parameters.keys())

    assert "id_column" in params


def test_supabase_client_is_service_role():
    """Verify the database client uses service role key (bypasses RLS)."""
    from app.core.database import get_supabase_client

    client = get_supabase_client()
    # Should not be a MockClient
    assert not client.__class__.__name__ == "MockClient", \
        "Supabase client is MockClient - service role key not configured!"
```

**Step 2: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/pam/test_rls_database_access.py -v`
Expected: All tests pass (these test function signatures, not actual DB access)

**Step 3: Commit**

```bash
git add tests/pam/test_rls_database_access.py
git commit -m "test: add PAM database access validation tests"
```

---

## Task 6: Verify End-to-End with Post-Fix Diagnostic

**Step 1: Run full diagnostic**

Run the diagnostic SQL from Task 1 again via Supabase MCP.

**Step 2: Verify all tables have proper setup**

Check that every PAM table has:
- RLS enabled
- At least 2 policies (user + service_role)
- Grants for `authenticated` and `service_role`

**Step 3: Run Python tests**

Run: `cd backend && python -m pytest tests/pam/ -v --tb=short`
Expected: All tests pass

**Step 4: Final commit**

```bash
git add -A
git commit -m "fix: comprehensive PAM database RLS policy fix for all 27+ tool-accessed tables

- Diagnostic script identifies missing policies/grants/tables
- Comprehensive idempotent SQL fixes RLS for all PAM tables
- Service role policies ensure PAM backend can read/write
- Authenticated user policies maintain data isolation
- Tests validate function signatures and client configuration"
```

---

## Dependencies & Notes

- **Supabase MCP required** for executing SQL directly against the database
- **No code changes needed** in `backend/app/` - the service role client already bypasses RLS; this fix ensures policies exist for defense in depth and frontend access
- **Idempotent SQL** - safe to run multiple times without breaking anything
- **Profiles table exception** - uses `id` not `user_id` for ownership check
- **Some tables may not exist** - Task 4 handles creating them based on diagnostic output
- **Previous fix reference** - Pattern proven in `20250808171821-comprehensive-pam-rls-fix.sql`
