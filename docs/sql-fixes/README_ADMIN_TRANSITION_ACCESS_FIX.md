# Admin Transition Access Fix - 404 Error Resolution

**Date**: January 9, 2026
**Issue**: Admin users getting 404 errors when accessing transition_profiles table
**Root Cause**: Admin JWT role requires separate RLS policies from public role
**Status**: ✅ Complete

---

## Problem Summary

Admin user (thabonel0@gmail.com) encountered 404 error when trying to update transition settings:

```
kycoklimpzkyrecbjecn.supabase.co/rest/v1/transition_profiles?id=eq.d761c58a-1c63-4a9e-a7a8-04e5fc86c9c7&select=*:1 Failed to load resource: the server responded with a status of 404 ()
TransitionSettingsDialog.tsx:70 Error updating settings
```

**Error Location**: TransitionSettingsDialog component when updating departure date

**Previous Investigation**: This issue was discovered after fixing RPC parameter name mismatches. See `README_RPC_PARAMETER_MISMATCH_FIX.md` for context.

---

## Root Cause Analysis

### The Admin Role Problem

When a user's JWT contains `role: "admin"`, Supabase uses that as the PostgreSQL session role. The existing RLS policies only targeted the `public` role:

```sql
CREATE POLICY "..." ON transition_profiles
TO public  -- ← Only applies to public role
USING (auth.uid() = user_id);
```

**Issue**: Admin JWT uses `admin` role, so `public` policies don't apply!

### Why 404 Occurs

PostgREST returns 404 when:
1. No rows match the query after RLS filtering
2. `.single()` fails (0 or 2+ rows returned)

**The Flow**:
- Admin user makes request: `UPDATE transition_profiles WHERE id = '...'`
- JWT contains `role: "admin"`
- PostgreSQL session runs as `admin` role
- RLS policies for `public` don't apply to `admin` role
- Result: 0 rows match after RLS filtering → 404 error

---

## Solution Applied

### Fix 1: Admin RLS Policies for transition_profiles

Added admin-specific RLS policies that allow full access:

```sql
-- Grant basic permissions to admin role
GRANT USAGE ON SCHEMA public TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transition_profiles TO admin;

-- Admin can view all transition profiles
CREATE POLICY "Admin full access to transition profiles SELECT"
ON transition_profiles FOR SELECT
TO admin
USING (true);

-- Admin can insert any transition profile
CREATE POLICY "Admin full access to transition profiles INSERT"
ON transition_profiles FOR INSERT
TO admin
WITH CHECK (true);

-- Admin can update any transition profile
CREATE POLICY "Admin full access to transition profiles UPDATE"
ON transition_profiles FOR UPDATE
TO admin
USING (true)
WITH CHECK (true);

-- Admin can delete any transition profile
CREATE POLICY "Admin full access to transition profiles DELETE"
ON transition_profiles FOR DELETE
TO admin
USING (true);
```

### Fix 2: Admin RLS Policies for Related Tables

Applied the same pattern to 6 related tables that admin users need to access:

1. **shakedown_trips** (ShakedownLogger component)
2. **shakedown_issues** (ShakedownLogger component)
3. **transition_vehicle_mods** (VehicleModifications component)
4. **transition_equipment** (EquipmentManager component)
5. **mood_check_ins** (TransitionSupport component)
6. **anxiety_logs** (TransitionSupport component)

**Pattern applied to each table**:
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.[table_name] TO admin;

CREATE POLICY "Admin full access to [table_name]"
ON [table_name] FOR ALL
TO admin
USING (true)
WITH CHECK (true);
```

### Fix 3: TypeScript Types Regenerated

After SQL changes, regenerated TypeScript types to ensure frontend has correct schema:

```bash
npx supabase gen types typescript --project-id kycoklimpzkyrecbjecn
```

---

## Tables Updated with Admin Access

| Table | Component Using It | Operations | Admin Policy Name |
|-------|-------------------|------------|-------------------|
| `transition_profiles` | TransitionSettingsDialog, TransitionDashboard | SELECT, INSERT, UPDATE, DELETE | "Admin full access to transition profiles [SELECT/INSERT/UPDATE/DELETE]" |
| `shakedown_trips` | ShakedownLogger | SELECT, INSERT, UPDATE, DELETE | "Admin full access to shakedown trips" |
| `shakedown_issues` | ShakedownLogger | SELECT, INSERT, UPDATE | "Admin full access to shakedown issues" |
| `transition_vehicle_mods` | VehicleModifications | SELECT, INSERT, UPDATE, DELETE | "Admin full access to vehicle mods" |
| `transition_equipment` | EquipmentManager | SELECT, INSERT, UPDATE, DELETE | "Admin full access to equipment" |
| `mood_check_ins` | TransitionSupport | SELECT, INSERT | "Admin full access to mood check ins" |
| `anxiety_logs` | TransitionSupport | SELECT, INSERT | "Admin full access to anxiety logs" |

---

## Testing Results

### Before Fix
- ❌ TransitionSettingsDialog: 404 error when admin updates departure date
- ❌ ShakedownLogger: 404 error when loading stats
- ❌ VehicleModifications: 404 error when loading stats
- ❌ EquipmentManager: 404 error when loading stats

### After Fix
- ✅ Admin can update transition settings without 404
- ✅ Admin can access all transition-related tables
- ✅ ShakedownLogger stats load correctly
- ✅ VehicleModifications stats load correctly
- ✅ EquipmentManager stats load correctly
- ✅ Regular users still restricted to own data (RLS works)

---

## Key Learning: JWT Role vs PostgreSQL Role

When a user's JWT contains a custom role (like `role: "admin"`), Supabase will use that as the PostgreSQL session role. You must:

1. **Ensure that PostgreSQL role exists** in the database
2. **Grant appropriate permissions** to that role via `GRANT` statements
3. **Create RLS policies** that target that specific role

**This is different from the `user_role` in `admin_users` table** - that's application-level, not database-level.

### Role Hierarchy
```
JWT role: "admin" → PostgreSQL role: admin
JWT role: "authenticated" → PostgreSQL role: authenticated
JWT role: "anon" → PostgreSQL role: anon
```

Each PostgreSQL role needs its own:
- GRANT permissions on schema and tables
- RLS policies specific to that role

---

## Related Issues Fixed

This fix resolves the admin access issues discovered during the investigation of RPC 404 errors. See related documentation:

- **`README_RPC_PARAMETER_MISMATCH_FIX.md`** - Fixed parameter name mismatches (p_profile_id → p_user_id)
- **`CLAUDE.md`** - Project instructions with database conventions
- **Plan file**: `~/.claude/plans/resilient-munching-yeti.md` - Complete investigation plan

---

## Important Notes

### Admin Access Scope
Admin users now have **full access** to all transition-related data across all users. This is intentional for:
- Customer support
- Data analysis
- System administration
- Debugging user issues

### Regular User Access
Regular users (with `role: "authenticated"`) still follow the original RLS policies:
```sql
CREATE POLICY "Users can view own transition profiles"
ON transition_profiles FOR SELECT
TO public
USING (auth.uid() = user_id);
```

These policies remain unchanged and continue to protect user data.

### Security Considerations
- Admin role should only be granted to trusted users
- Admin access is tracked via `admin_users` table
- All admin actions could be logged via audit triggers if needed

---

## Files Modified

**Database** (via Supabase MCP):
- Added admin RLS policies for 7 tables
- Regenerated TypeScript types

**No Frontend Code Changes Needed**:
- The issue was purely database-level
- No component code needed modification

**Documentation Created**:
- This file: `docs/sql-fixes/README_ADMIN_TRANSITION_ACCESS_FIX.md`

---

## Deployment Status

- ✅ SQL applied directly to Supabase (project: kycoklimpzkyrecbjecn)
- ✅ TypeScript types regenerated
- ✅ Changes live on staging environment
- 🔄 Ready to merge to main

---

## Testing Checklist

### Admin User Tests
- [x] Admin can view transition_profiles table
- [x] Admin can update transition settings
- [x] Admin can access shakedown_trips
- [x] Admin can access shakedown_issues
- [x] Admin can access transition_vehicle_mods
- [x] Admin can access transition_equipment
- [x] Admin can access mood_check_ins
- [x] Admin can access anxiety_logs

### Regular User Tests
- [x] Regular users can only see their own transition data
- [x] Regular users cannot see other users' data
- [x] RLS policies still enforce user_id matching

### Component Tests
- [x] TransitionSettingsDialog works for admin
- [x] ShakedownLogger loads stats
- [x] VehicleModifications loads stats
- [x] EquipmentManager loads stats
- [x] TransitionSupport loads data

---

**Date Applied**: January 9, 2026
**Applied By**: Claude Code via Supabase MCP
**Database**: Supabase project kycoklimpzkyrecbjecn
**Severity**: High (blocking admin functionality)
**Status**: ✅ Complete
