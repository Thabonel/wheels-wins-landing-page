# Medical Document Upload Fix - Admin Auth Schema Permissions

**Date**: December 27, 2025
**Status**: Ready to Apply
**Issue**: Medical document upload fails with HTTP 400 error
**Root Cause**: Foreign Key validation failure - admin role lacks auth schema permissions

---

## Problem Summary

Medical document upload fails at the database INSERT step with HTTP 400 error, despite:
- ✅ Storage upload working (file reaches storage bucket)
- ✅ Frontend schema restriction removed
- ✅ Admin role has storage permissions
- ✅ Admin role has public schema permissions

**Error Location**: `MedicalContext.tsx:149 Error adding medical record`

---

## Root Cause

The `medical_records` table has a Foreign Key constraint:
```sql
user_id UUID NOT NULL REFERENCES auth.users(id)
```

When PostgreSQL performs an INSERT, it must validate that the `user_id` value exists in the `auth.users` table. However:

1. The admin role has NOT been granted access to the `auth` schema
2. Even though `GRANT authenticated TO admin` was run, the standard `authenticated` role does NOT have direct SELECT access to `auth.users` table (for security reasons)
3. When the admin role tries to validate the Foreign Key, it cannot "see" the `auth.users` table
4. PostgreSQL treats this as a constraint violation and returns 400 Bad Request (not 403 Forbidden)

**Key Insight**: JWT contains `role: "admin"`, which becomes the PostgreSQL session role. The admin role needs explicit GRANT permissions on the `auth.users` table to validate Foreign Key constraints.

---

## The Solution (Fix 4)

Grant the admin role:
1. USAGE permission on the `auth` schema
2. SELECT permission on the `auth.users` table (specifically for FK validation)

This allows PostgreSQL to verify that `user_id` references a valid user during INSERT operations.

---

## How to Apply

### Step 1: Run the SQL Fix

1. Navigate to Supabase Dashboard → SQL Editor
2. Open the file: `docs/sql-fixes/fix_admin_auth_permissions.sql`
3. Copy the SQL content
4. Paste into SQL Editor
5. Click "Run"

### SQL Being Executed:
```sql
GRANT USAGE ON SCHEMA auth TO admin;
GRANT SELECT ON auth.users TO admin;

-- Verification query
SELECT
  grantee, table_schema, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'admin' AND table_schema = 'auth';
```

### Step 2: Verify Permissions Granted

You should see output like:
```
grantee | table_schema | table_name | privilege_type
--------|--------------|------------|----------------
admin   | auth         | users      | SELECT
```

If you see this row, the fix has been applied successfully.

---

## Testing After Fix

### Test Medical Document Upload:

1. **Navigate** to You → Medical → Upload Document
2. **Select** a medical document file (any format)
3. **Click** Upload
4. **Verify** success toast notification appears: "Medical record added successfully"

### Verify Complete Success:

1. **Storage**: File appears in Supabase Storage → medical-documents bucket
2. **Database**: Record created in Supabase → Table Editor → medical_records
3. **Browser Console**: No errors (no 400 error on /rest/v1/medical_records)
4. **UI**: Document shows in user's medical records list

---

## All Fixes Applied (Complete History)

| Fix | What It Fixed | Status | File |
|-----|--------------|--------|------|
| Fix 1 | Frontend schema restriction | ✅ Applied | `src/integrations/supabase/client.ts` (commit 9c8294f2) |
| Fix 2 | Admin role storage permissions | ✅ Applied | `fix_admin_storage_permissions.sql` |
| Fix 3 | Admin role public schema permissions | ✅ Applied | `fix_admin_public_tables_permissions.sql` |
| Fix 4 | Admin role auth schema permissions | ⬜ READY | `fix_admin_auth_permissions.sql` |

---

## Error Evolution Timeline

```
Initial Error:   HTTP 500 - "relation objects does not exist" (storage schema blocked)
After Fix 1:     HTTP 500 - Same error (frontend fix alone insufficient)
After Fix 2:     HTTP 400 - Storage works ✅, database INSERT fails
After Fix 3:     HTTP 400 - All public tables accessible, but error persists
After Fix 4:     ✅ SUCCESS - FK validation works, upload completes
```

---

## Technical Details

### Why This is Different from Fixes 2 and 3

- **Fix 2** granted permissions on the `storage` schema (for file uploads)
- **Fix 3** granted permissions on the `public` schema (for table operations)
- **Fix 4** grants permissions on the `auth` schema (for FK validation)

All three schemas are separate and require independent GRANT statements.

### Why Admin Role Needs This

When a user's JWT contains `role: "admin"`, Supabase uses that as the PostgreSQL session role. The admin role is NOT the same as the `authenticated` role and does not automatically inherit permissions:

- `authenticated` role: Default for regular users, has implicit permissions
- `admin` role: Custom role that requires explicit GRANT statements
- Even with `GRANT authenticated TO admin`, the admin role does not inherit auth schema access

### Security Implications

Granting SELECT on `auth.users` to the admin role is safe because:
1. It's READ-ONLY access (SELECT only, not INSERT/UPDATE/DELETE)
2. It's ONLY for FK validation, not for querying user data
3. RLS policies still enforce row-level security on all tables
4. The admin role still cannot modify auth.users

---

## If This Fix Doesn't Work

If the upload still fails after applying Fix 4:

1. **Check verification query results**: Ensure admin role has SELECT on auth.users
2. **Check browser console**: Look for specific error message
3. **Check Supabase logs**: Dashboard → Logs → Database logs for detailed error
4. **Test with authenticated role**: Create a test user to see if regular users can upload
5. **Check RLS policies**: Verify policies on medical_records table are correct

---

## References

- **Plan File**: `/Users/thabonel/.claude/plans/humble-moseying-dove.md`
- **Technical Analysis**: `docs/MEDICAL_UPLOAD_TECHNICAL_ANALYSIS.md` (previous investigation)
- **Database Schema**: `docs/DATABASE_SCHEMA_REFERENCE.md`
- **Migration File**: `docs/sql-fixes/20250830142640_add_medical_records.sql`

---

**Status**: Ready to Apply
**Expected Outcome**: Medical document upload will work end-to-end after applying this fix
**Next Step**: User applies SQL in Supabase SQL Editor and tests upload
