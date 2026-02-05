# PAM RLS Diagnostic Baseline
Run: 2026-02-06 via Supabase Management API against project kycoklimpzkyrecbjecn

---

## Query 1: Table Existence and RLS Status

| Table | Exists | RLS Enabled | RLS Forced |
|-------|--------|-------------|------------|
| budgets | YES | YES | NO |
| calendar_events | YES | YES | NO |
| comments | YES | YES | NO |
| community_knowledge | YES | YES | NO |
| community_tips | YES | YES | NO |
| event_attendees | YES | YES | NO |
| events | YES | YES | NO |
| expenses | YES | YES | NO |
| favorite_locations | YES | YES | NO |
| fuel_log | YES | YES | NO |
| maintenance_records | YES | YES | NO |
| meal_plans | YES | YES | NO |
| **messages** | **NO** | - | - |
| pam_admin_knowledge | YES | YES | NO |
| pam_knowledge_usage_log | YES | YES | NO |
| pam_savings_events | YES | YES | NO |
| **pantry_items** | **NO** | - | - |
| post_likes | YES | YES | NO |
| posts | YES | YES | NO |
| profiles | YES | YES | NO |
| **recipes** | **NO** | - | - |
| shakedown_issues | YES | YES | NO |
| shakedown_trips | YES | YES | NO |
| shared_locations | YES | YES | NO |
| shopping_lists | YES | YES | NO |
| timers_and_alarms | YES | YES | NO |
| tip_usage_log | YES | YES | NO |
| transition_equipment | YES | YES | NO |
| transition_tasks | YES | YES | NO |
| user_follows | YES | YES | NO |
| user_launch_tasks | YES | YES | NO |
| user_settings | YES | YES | **YES** |
| user_trips | YES | YES | NO |
| vehicles | YES | YES | NO |

**Missing tables (3):** messages, pantry_items, recipes

**Special:** user_settings has `relforcerowsecurity = true` (RLS forced even for table owner)

---

## Query 2: RLS Policies Summary

### Tables with ISSUES (need attention)

**budgets** - Policies use `{public}` role instead of `{authenticated}`. Public role means the policy applies to ALL roles including anon - relies entirely on `auth.uid()` check.
- SELECT: `(auth.uid() = user_id)` roles={public}
- INSERT: with_check `(auth.uid() = user_id)` roles={public}
- UPDATE: `(auth.uid() = user_id)` roles={public}
- DELETE: `(auth.uid() = user_id)` roles={public}

**calendar_events** - DUPLICATE policies (7 total for a 4-operation table). Has both `{anon,authenticated}` and `{public}` and `{service_role}` policies for the same operations.
- "Users can create own calendar events" INSERT roles={anon,authenticated}
- "Users can delete own calendar events" DELETE roles={anon,authenticated}
- "Users can update own calendar events" UPDATE roles={anon,authenticated}
- "Users can view own calendar events" SELECT roles={anon,authenticated}
- "secure_calendar_insert" INSERT roles={public}
- "secure_calendar_select" SELECT roles={public}
- "service_role_calendar_access" ALL roles={service_role}

**comments** - Policies use `{public}` role. SELECT allows `true` (anyone can read all comments).
- SELECT: qual=`true` roles={public}
- INSERT: with_check `(auth.uid() = user_id)` roles={public}
- UPDATE: `(auth.uid() = user_id)` roles={public}
- DELETE: `(auth.uid() = user_id)` roles={public}

**community_knowledge** - Uses `{authenticated}` role correctly. But regular users can only read their OWN articles, not published ones.
- SELECT: `(auth.uid() = author_id)` roles={authenticated}
- INSERT: with_check `(auth.uid() = author_id)` roles={authenticated}
- UPDATE: `(auth.uid() = author_id) AND (status = 'pending')` roles={authenticated}
- DELETE: `(auth.uid() = author_id) AND (status = 'pending')` roles={authenticated}

**community_tips** - SELECT requires `auth.role() = 'authenticated'` AND `status = 'active'`. This blocks service_role reads.
- SELECT: `(auth.role() = 'authenticated') AND (status = 'active')` roles={public}

**events** - Only has service_role ALL policy. No authenticated user policies at all.
- ALL: `true` roles={service_role}

**expenses** - Has duplicate SELECT policy. One via `{authenticated}` ALL, another via `{public}` SELECT.
- ALL: `(auth.uid() = user_id)` roles={authenticated}
- SELECT: `(user_id = auth.uid())` roles={public}

**pam_knowledge_usage_log** - SELECT is admin-only (checks profiles.role='admin'). Regular users cannot read their own usage logs.
- INSERT: with_check `(auth.uid() = user_id)` roles={public}
- SELECT: `EXISTS(profiles WHERE id=auth.uid() AND role='admin')` roles={public}

**posts** - Only has an admin moderation policy (ALL). No standard user CRUD policies visible.
- ALL: `EXISTS(profiles WHERE id=auth.uid() AND role='admin')` roles={public}

**profiles** - SELECT allows anyone to view active profiles. The ALL policy requires both `auth.uid()=id` AND role in `{authenticated, admin}`.
- SELECT: `(status = 'active')` roles={public}
- ALL: `(auth.uid()=id) AND (auth.role() IN ('authenticated','admin'))` roles={public}

**shakedown_issues** - Only admin policy. No authenticated user policies.
- ALL: `true` roles={admin}

**shakedown_trips** - Only admin policy. No authenticated user policies.
- ALL: `true` roles={admin}

**tip_usage_log** - INSERT checks for `service_role` via JWT, but uses `{public}` role. Problematic because `auth.jwt() ->> 'role' = 'service_role'` won't match for backend using service_role key (service_role bypasses RLS).
- INSERT: with_check `(auth.jwt()->>'role' = 'service_role')` roles={public}
- SELECT: `(auth.uid() = contributor_id) OR (auth.uid() = beneficiary_id)` roles={public}

**user_launch_tasks** - Only admin policy. No authenticated user policies.
- ALL: `true` roles={admin}

**user_settings** - Policies check against specific admin email addresses via `auth.users` table join. Performance concern and maintenance burden.
- All 4 policies (SELECT/INSERT/UPDATE/DELETE) check: `EXISTS(auth.users WHERE id=auth.uid() AND email LIKE '%@wheelsandwins.%' OR email IN (...))`

**user_trips** - DUPLICATE policies (8 total). Has both `{authenticated}` and `{public}` versions of every operation.
- Authenticated: select/insert/update/delete using `user_id = auth.uid()`
- Public: select_own/insert_own/update_own/delete_own using `auth.uid() = user_id`

### Tables with CLEAN policies

**event_attendees** - Owner ALL + organizer SELECT via join to group_events.
**favorite_locations** - ALL `(auth.uid() = user_id)` roles={public}
**fuel_log** - Separate SELECT/INSERT/UPDATE/DELETE all with `(auth.uid() = user_id)` roles={public}
**maintenance_records** - Separate SELECT/INSERT/UPDATE/DELETE with `(user_id = auth.uid())` roles={authenticated}
**meal_plans** - Separate SELECT/INSERT/UPDATE/DELETE with `(auth.uid() = user_id)` roles={public}
**pam_admin_knowledge** - Admin write + public read. SELECT `true`, write requires admin via profiles table.
**pam_savings_events** - SELECT/INSERT/UPDATE/DELETE with `(auth.uid() = user_id)` roles={public}
**post_likes** - SELECT `true` + INSERT/DELETE with `(auth.uid() = user_id)` roles={public}
**shared_locations** - Owner ALL + public SELECT for active/non-expired.
**shopping_lists** - Separate SELECT/INSERT/UPDATE/DELETE with `(user_id = auth.uid())` roles={public}
**timers_and_alarms** - Users own + service_role ALL.
**transition_equipment** - Admin only. roles={admin}
**transition_tasks** - Separate SELECT/INSERT/UPDATE/DELETE with `(user_id = auth.uid())` roles={public}
**user_follows** - ALL with `(auth.uid() = follower_id) OR (auth.uid() = following_id)` roles={public}
**vehicles** - ALL `(auth.uid() = user_id)` roles={public}

---

## Query 3: Grants Summary

All 31 existing tables have full grants (SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE) for all three roles: `anon`, `authenticated`, `service_role`.

No grant issues detected for existing tables. The 3 missing tables (messages, pantry_items, recipes) have no grants since they do not exist.

---

## Critical Findings

### 1. Missing Tables (3)
- **messages** - Required for PAM social/messaging tools
- **pantry_items** - Required for PAM meal planning tools
- **recipes** - Required for PAM meal planning tools

### 2. Tables with NO authenticated user policies (4)
These tables have RLS enabled but only admin or service_role policies:
- **events** - Only service_role ALL
- **shakedown_issues** - Only admin ALL
- **shakedown_trips** - Only admin ALL
- **user_launch_tasks** - Only admin ALL

### 3. Tables with Duplicate/Conflicting Policies (3)
- **calendar_events** - 7 policies (should be ~4-5)
- **expenses** - Duplicate SELECT policies
- **user_trips** - 8 policies (double set for authenticated + public)

### 4. Tables with Problematic Policy Logic (4)
- **community_tips** - SELECT blocks service_role
- **posts** - Only admin moderation policy, no user CRUD
- **user_settings** - Hardcoded admin emails in policy
- **tip_usage_log** - INSERT with_check references service_role via JWT (unnecessary)

### 5. Inconsistent Role Usage
Some tables use `{public}`, some use `{authenticated}`, some use `{anon,authenticated}`. The `{public}` approach works because `auth.uid()` returns NULL for unauthenticated requests, but it's inconsistent and allows the anon role to attempt operations.
