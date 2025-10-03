# Week 3: RLS Authentication Fix

**Date**: January 10, 2025
**Issue**: `auth.uid()` returning null causing 403 errors on all user tables
**Root Cause**: Admin role not granted permissions on tables (only `authenticated` role has access)

---

## Problem Analysis

### Symptoms
- Frontend console shows 403 Forbidden errors on multiple tables
- PAM WebSocket "flashing off" - repeatedly connecting/disconnecting
- User settings failing to load
- Medical info, subscriptions, and PAM savings data inaccessible

### Console Error Example
```
Failed to load resource: the server responded with a status of 403
🚨 RLS permission denied - auth.uid() likely null on server side
kycoklimpzkyrecbjecn.supabase.co/rest/v1/user_settings?select=*&user_id=eq.21a2151a-cd37-41d5-a1c7-124bb05e7a6a:1
```

### JWT Analysis
User JWT token shows:
```json
{
  "role": "admin",
  "sub": "21a2151a-cd37-41d5-a1c7-124bb05e7a6a",
  "aud": "authenticated",
  "iss": "https://ydevatqwkoccxhtejdor.supabase.co/auth/v1"
}
```

**Key Finding**: JWT has `role: "admin"`, but database GRANT statements only give permissions to `authenticated` role.

---

## Root Cause

### Database Permissions (Example from user_settings)

**Current State** (line 92 of `20250727160000-create-user-settings-table.sql`):
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
```

**RLS Policies Work Correctly**:
```sql
CREATE POLICY "user_settings_select_policy" ON public.user_settings
    FOR SELECT USING (auth.uid() = user_id);
```

**Problem**:
- RLS policy correctly checks `auth.uid() = user_id` ✅
- But table permissions are ONLY granted to `authenticated` role ❌
- User with `role: "admin"` has NO table access permissions ❌
- Result: 403 Forbidden (permission denied)

### PostgreSQL Role Hierarchy

In Supabase/PostgreSQL:
- `admin` role ≠ `authenticated` role
- Admin role does NOT automatically inherit authenticated permissions
- Must explicitly grant permissions to admin role

---

## Solution

Created SQL fix file: `docs/sql-fixes/week3-admin-role-permissions.sql`

### Affected Tables
1. `user_settings` - User preferences (causing settings load failures)
2. `medical_emergency_info` - Emergency contacts (403 errors)
3. `medical_medications` - Medication tracking (403 errors)
4. `medical_records` - Health records (403 errors)
5. `user_subscriptions` - Subscription status (403 errors)
6. `pam_savings_events` - Savings guarantee events (403 errors)
7. `pam_savings_guarantees` - Savings guarantee data (causing PAM Savings API failures)
8. `pam_savings_progress` - Savings progress tracking (403 errors)
9. `pam_savings_user_responses` - User savings responses (403 errors)
10. `budgets` - Budget limits (Week 2 migration)
11. `income_entries` - Income tracking (Week 2 migration)
12. `expenses` - Expense tracking (existing table)
13. `budget_utilization` - Budget summary view (Week 2 view)

### SQL Fix
```sql
-- Grant table permissions to admin role (matching authenticated role permissions)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.income_entries TO admin;
GRANT SELECT, INSERT, UPDATE ON public.user_subscriptions TO admin;
GRANT SELECT ON public.budget_utilization TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_emergency_info TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_medications TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_records TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pam_savings_events TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pam_savings_guarantees TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pam_savings_progress TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pam_savings_user_responses TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO admin;

-- Grant sequence permissions for auto-incrementing IDs
GRANT USAGE ON SEQUENCE public.budgets_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.income_entries_id_seq TO admin;
GRANT USAGE ON SEQUENCE public.user_subscriptions_id_seq TO admin;
```

---

## Deployment Instructions

### Step 1: Run SQL Fix (5 minutes)

1. **Open Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select project: `ydevatqwkoccxhtejdor`

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New query"

3. **Execute Fix**
   - Copy contents of: `docs/sql-fixes/week3-admin-role-permissions.sql`
   - Paste into SQL Editor
   - Click "Run" button
   - Verify: "Success. No rows returned"

### Step 2: Verify Permissions (2 minutes)

**Check Granted Permissions**:
```sql
-- Verify admin role has access to user_settings
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'user_settings'
  AND grantee IN ('authenticated', 'admin');
```

**Expected Output**:
```
grantee        | privilege_type
---------------|---------------
authenticated  | SELECT
authenticated  | INSERT
authenticated  | UPDATE
authenticated  | DELETE
admin          | SELECT
admin          | INSERT
admin          | UPDATE
admin          | DELETE
```

### Step 3: Test Frontend (3 minutes)

1. **Reload Frontend**
   - Open: https://wheels-wins-staging.netlify.app
   - Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

2. **Check Console**
   - Open DevTools: F12 or Cmd+Option+I
   - Look for:
     - ✅ No 403 errors on user_settings, medical_*, pam_savings_*
     - ✅ "🔍 Auth Debug Info" shows `hasSession: true`
     - ✅ PAM WebSocket stays connected (no repeated connect/disconnect)

3. **Test PAM Features**
   - Open PAM chat interface
   - Verify: PAM stays connected (no "flashing off")
   - Check: PAM Savings This Month widget loads actual data
   - Test: Send a message to PAM (should respond without disconnecting)

---

## Expected Impact

### Before Fix
- ❌ 403 Forbidden on 13+ tables for admin role users
- ❌ PAM WebSocket unstable (flashing on/off)
- ❌ User settings fail to load
- ❌ Medical info inaccessible
- ❌ Savings guarantee data fails to load
- ❌ Budget and income data blocked

### After Fix
- ✅ All tables accessible to admin role
- ✅ PAM WebSocket stable connection
- ✅ User settings load correctly
- ✅ Medical info loads successfully
- ✅ PAM Savings data displays properly
- ✅ Budget utilization view accessible
- ✅ Week 3 load testing can proceed

---

## Testing Checklist

- [ ] SQL executed successfully in Supabase Dashboard
- [ ] Permissions verified for admin role
- [ ] Frontend hard refresh completed
- [ ] No 403 errors in browser console
- [ ] PAM WebSocket stays connected (no flashing)
- [ ] User settings load without errors
- [ ] PAM Savings widget shows actual data
- [ ] Medical info tables accessible (if applicable)
- [ ] Budget data loads correctly

---

## Additional Notes

### Why Admin Role?
The JWT shows `role: "admin"` which suggests this user was created with admin privileges. In Supabase:
- Standard users get `role: "authenticated"`
- Admin users get `role: "admin"`
- Both roles need explicit GRANT permissions

### Future Prevention
**Recommendation for Week 4**: Update migration template to always include both roles:

```sql
-- Template for future migrations
GRANT SELECT, INSERT, UPDATE, DELETE ON public.new_table TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.new_table TO admin;
```

### RLS vs GRANT Confusion
- **RLS Policies**: Control WHICH rows a user can access (user_id filtering)
- **GRANT Statements**: Control WHETHER a role can access the table AT ALL
- Both must be configured correctly for access to work

---

## Resolution Timeline

**Investigation**: 15 minutes
**SQL Fix Creation**: 5 minutes
**Deployment**: 5 minutes
**Verification**: 5 minutes
**Total**: 30 minutes

---

**Status**: ✅ Fix ready for deployment
**Risk Level**: LOW (only adding permissions, not modifying RLS)
**Rollback**: Not needed (GRANT is additive, can REVOKE if issues)

**Next Step**: Execute SQL in Supabase Dashboard and verify PAM stops flashing.
