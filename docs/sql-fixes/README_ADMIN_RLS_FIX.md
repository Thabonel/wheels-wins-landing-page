# Medical Document Upload - Admin RLS Policy Fix

**Date**: December 27, 2025
**Status**: Ready to Apply
**Fix Type**: SQL (Quick Fix - Option 2)

---

## Quick Summary

**Problem**: Medical document upload fails with HTTP 400 error
**Root Cause**: RLS policies on `medical_records` table only allow `authenticated` role, not `admin` role
**Solution**: Add admin role policies via SQL
**Time to Fix**: 2 minutes

---

## How to Apply (3 Steps)

### Step 1: Open Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/kycoklimpzkyrecbjecn/sql
2. Create a new query

### Step 2: Run the SQL Fix

1. Copy the contents of `docs/sql-fixes/add_admin_rls_policies.sql`
2. Paste into SQL Editor
3. Click **Run** button

**Expected Output**:
```
policyname                         | cmd    | roles   | qual              | with_check
-----------------------------------|--------|---------|-------------------|-----------
admin_insert_medical_records       | INSERT | {admin} | ...               | ...
admin_select_medical_records       | SELECT | {admin} | ...               | ...
admin_update_medical_records       | UPDATE | {admin} | ...               | ...
admin_delete_medical_records       | DELETE | {admin} | ...               | ...
```

If you see 4 rows returned, the fix has been applied successfully! ✅

### Step 3: Test Medical Document Upload

1. **Log out and log back in** (to refresh JWT session)
2. Navigate to: **You → Medical → Upload Document**
3. Select a medical document file (any format)
4. Click **Upload**
5. **Expected Result**: Success toast "Medical record added successfully" ✅
6. **Expected Result**: Document appears in medical records list ✅
7. **Expected Result**: NO 400 error in browser console ✅

---

## Verification Checklist

After applying the fix, verify:

- [ ] SQL executed without errors
- [ ] Verification query returned 4 policies
- [ ] Logged out and logged back in
- [ ] Medical document upload succeeds
- [ ] Success toast appears
- [ ] Document visible in records list
- [ ] No 400 error in console

---

## What This Fix Does

**Before Fix**:
```
User JWT: role = "admin"
Medical Records RLS Policies: authenticated ONLY
Result: PostgREST rejects INSERT → HTTP 400
```

**After Fix**:
```
User JWT: role = "admin"
Medical Records RLS Policies: authenticated + admin
Result: PostgREST allows INSERT → Success! ✅
```

---

## All Fixes Applied (Complete History)

| Fix | What It Fixed | Status | File |
|-----|--------------|--------|------|
| Fix 1 | Frontend schema restriction | ✅ Applied | `src/integrations/supabase/client.ts` (commit 9c8294f2) |
| Fix 2 | Admin storage permissions | ✅ Applied | `docs/sql-fixes/fix_admin_storage_permissions.sql` |
| Fix 3 | Admin public schema permissions | ✅ Applied | `docs/sql-fixes/fix_admin_public_tables_permissions.sql` |
| Fix 4 | Admin auth schema permissions | ✅ Applied | `docs/sql-fixes/fix_admin_auth_permissions.sql` |
| Code Fix | Duplicate user_id bug | ✅ Applied | MedicalService.ts, MedicalContext.tsx (commit 5eaaa40c) |
| **RLS Fix** | **Admin RLS policies** | ⬜ **READY** | **`add_admin_rls_policies.sql`** |

---

## Why This Is The Final Fix

All previous fixes addressed different layers:
- ✅ Fixes 1-4: Granted **permissions** (GRANT statements)
- ✅ Code Fix: Fixed duplicate user_id bug
- 🎯 **RLS Fix**: Adds **access policies** (RLS policies) ← Missing piece!

**Critical Understanding**:
- **GRANT permissions** = What operations a role CAN do
- **RLS policies** = What rows a role can ACCESS (checked FIRST by PostgREST)

Admin role had GRANT permissions but NO RLS policies → HTTP 400
After this fix: Admin role has BOTH → Success! ✅

---

## If This Fix Doesn't Work

If upload still fails after applying this fix:

1. **Verify policies were created**:
   ```sql
   SELECT * FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename = 'medical_records'
     AND 'admin' = ANY(roles);
   ```
   Should return 4 rows.

2. **Check JWT role**:
   - Open browser console
   - Look for: `Session JWT Role: admin`
   - If not admin, the issue is elsewhere

3. **Test with authenticated role**:
   - Create a regular (non-admin) user
   - Try uploading as that user
   - If it works → confirms RLS policies are the issue

4. **Check Supabase logs**:
   - Dashboard → Logs → Database logs
   - Look for INSERT attempts and errors

---

## Future Consideration: Option 1

This SQL fix (Option 2) works but requires replicating policies for all tables.

**Option 1** (standardize to `authenticated` role) is cleaner long-term:
- Change admin JWTs to use `role: 'authenticated'`
- Use `admin_users` table for admin permissions
- No need to mirror policies across tables

See `/Users/thabonel/.claude/plans/humble-moseying-dove.md` for full details.

---

**Status**: Ready to Apply
**Expected Outcome**: Medical document upload will work immediately after SQL fix + session refresh
**Next Step**: User applies SQL in Supabase SQL Editor and tests upload
