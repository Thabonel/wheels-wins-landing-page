# RLS Security Fix Execution Guide

## ⚠️ CRITICAL SECURITY FIX REQUIRED

**Status**: Ready for execution
**Priority**: IMMEDIATE
**Affected Tables**: 3 tables with confirmed vulnerabilities

## Execution Instructions

### Step 1: Open Supabase SQL Editor
1. Open: https://supabase.com/dashboard/project/kycoklimpzkyrecbjecn/sql/new
2. Login with your Supabase account

### Step 2: Execute the Security Fix
1. Copy the entire contents of `TARGETED_SECURITY_FIX.sql`
2. Paste into the SQL editor
3. Click **"Run"** to execute

### Step 3: Verify the Fix
After execution, run these verification queries in the same SQL editor:

```sql
-- Check that no WITH CHECK (true) policies remain on target tables
SELECT
    tablename,
    policyname,
    cmd,
    with_check,
    CASE
        WHEN with_check = 'true' THEN '🚨 STILL INSECURE'
        ELSE '✅ SECURE'
    END as security_status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('affiliate_product_clicks', 'product_issue_reports', 'trip_locations')
ORDER BY tablename, cmd;

-- Check RLS is enabled
SELECT
    t.table_name,
    CASE WHEN pc.relrowsecurity THEN '✅ RLS ENABLED' ELSE '❌ RLS DISABLED' END as rls_status
FROM information_schema.tables t
JOIN pg_class pc ON pc.relname = t.table_name
WHERE t.table_schema = 'public'
  AND t.table_name IN ('affiliate_product_clicks', 'product_issue_reports', 'trip_locations');

-- Show new secure policies
SELECT
    tablename,
    policyname,
    cmd,
    roles,
    '✅ NEW SECURE POLICY' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('affiliate_product_clicks', 'product_issue_reports', 'trip_locations')
  AND policyname LIKE 'secure_%'
ORDER BY tablename, cmd;
```

## What This Fix Does

### Security Vulnerabilities Fixed

1. **affiliate_product_clicks**
   - **Before**: `WITH CHECK (true)` - any anonymous user could insert
   - **After**: Requires authentication + proper user validation

2. **product_issue_reports**
   - **Before**: `WITH CHECK (true)` - any anonymous user could insert
   - **After**: Requires authentication + user must own the report

3. **trip_locations**
   - **Before**: `WITH CHECK (true)` - any anonymous user could insert
   - **After**: Service role for system operations + users own their data

### Functionality Preserved

- ✅ PAM system continues to work (service role access)
- ✅ User functionality preserved (proper user-scoped access)
- ✅ Admin functionality maintained
- ✅ All existing features work normally

## Expected Results

After successful execution, you should see:
- ✅ All policies show "SECURE" status
- ✅ All tables show "RLS ENABLED"
- ✅ New secure policies are created
- ✅ No `WITH CHECK (true)` policies remain

## Rollback Plan

If anything breaks, you can restore the previous state by:
1. Dropping the new policies
2. Recreating the original policies
3. Original SQL is backed up in git history

## File Locations

- **Main Fix**: `docs/sql-fixes/TARGETED_SECURITY_FIX.sql`
- **This Guide**: `docs/sql-fixes/SECURITY_FIX_EXECUTION_GUIDE.md`
- **Execution Script**: `docs/sql-fixes/EXECUTE_SECURITY_FIX.sh`

## Next Steps After Execution

1. ✅ Execute the SQL fix
2. ✅ Run verification queries
3. ✅ Test PAM functionality
4. ✅ Test user functionality
5. ✅ Monitor for any issues
6. ✅ Commit this guide to git

---

**Manual Execution Required**: Supabase CLI configuration issues prevent automated execution.
**Ready for immediate manual execution via Supabase Dashboard.**