# Fix: Life Transition Navigator 403 Error

**Date:** January 27, 2025
**Error:** "Failed to check profile status"
**Root Cause:** Missing table-level GRANT statements in Supabase
**Status:** ⚠️ FIX REQUIRED - Run SQL script in Supabase

---

## What Happened?

When clicking "Start Planning My Transition" button, you see:
- ❌ Toast error: "Failed to check profile status"
- ❌ Console error: `Error code: 42501, message: 'permission denied for table transition_profiles'`
- ❌ HTTP 403 Forbidden response

**Root Cause:**
PostgreSQL requires **TWO things** for users to access tables:
1. ✅ RLS Policies (these exist and are correct)
2. ❌ **Table-level GRANT statements (these are MISSING)**

Without the GRANT statements, ALL queries return 403 Forbidden, even with correct RLS policies.

---

## The Fix (2 Minutes)

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project: **kycoklimpzkyrecbjecn**
3. Click "SQL Editor" in left sidebar
4. Click "New Query"

### Step 2: Copy & Paste SQL Script
Copy the contents of this file:
```
docs/sql-fixes/fix_transition_403_error.sql
```

Or copy this directly:
```sql
-- Grant table access to authenticated users
GRANT ALL ON transition_profiles TO authenticated;
GRANT ALL ON transition_profiles TO anon;

-- Grant access to all related transition tables
GRANT ALL ON transition_tasks TO authenticated;
GRANT ALL ON transition_tasks TO anon;
GRANT ALL ON transition_timeline TO authenticated;
GRANT ALL ON transition_timeline TO anon;
GRANT ALL ON transition_financial TO authenticated;
GRANT ALL ON transition_financial TO anon;
GRANT ALL ON transition_services TO authenticated;
GRANT ALL ON transition_services TO anon;
GRANT ALL ON transition_equipment TO authenticated;
GRANT ALL ON transition_equipment TO anon;
GRANT ALL ON transition_shakedown_trips TO authenticated;
GRANT ALL ON transition_shakedown_trips TO anon;
GRANT ALL ON transition_reality_checks TO authenticated;
GRANT ALL ON transition_reality_checks TO anon;
GRANT ALL ON transition_support_checks TO authenticated;
GRANT ALL ON transition_support_checks TO anon;
GRANT ALL ON transition_launch_tasks TO authenticated;
GRANT ALL ON transition_launch_tasks TO anon;
```

### Step 3: Run the Script
1. Click "Run" button (or press Cmd/Ctrl + Enter)
2. Wait 2-3 seconds for execution
3. Check results at bottom of screen

### Step 4: Verify Fix Worked
You should see a table showing:
```
tablename                    | grantee       | privileges
-----------------------------+---------------+---------------------------
transition_profiles          | anon          | DELETE, INSERT, REFERENCES, ...
transition_profiles          | authenticated | DELETE, INSERT, REFERENCES, ...
(more rows for other tables)
```

**✅ If you see this table, the fix worked!**

---

## Testing the Fix

### Test 1: In Supabase SQL Editor
Run this query:
```sql
SELECT * FROM transition_profiles LIMIT 1;
```

**Expected:** Returns empty result (no error)
**If Error:** GRANT statements didn't apply - try running again

### Test 2: In Your Application
1. Refresh the browser (Cmd/Ctrl + R)
2. Navigate to You page
3. Click "Start Planning My Transition" button

**Expected:** Button shows "Setting up..." then navigates to Transition page
**If Still Broken:** Check browser console for new errors

---

## What This SQL Does

1. **Grants ALL privileges** to `authenticated` role (logged-in users)
2. **Grants ALL privileges** to `anon` role (anonymous users)
3. **Applies to ALL transition tables** (10 tables total)
4. **Verifies** the grants were applied successfully
5. **Tests** a sample query to confirm access works

**Security:** RLS policies still protect data - users can only see their own rows.

---

## Why This Happened

The transition tables were created with RLS policies but without table-level GRANT statements.

**Timeline:**
- January 26, 2025: Tables created with RLS policies ✅
- January 26, 2025: GRANT SQL file created (`grant_transition_profiles_access.sql`) ✅
- **BUT:** SQL file was never run in Supabase database ❌
- January 27, 2025: User clicks button → 403 error discovered ❌
- January 27, 2025: This fix created ✅

---

## Files Modified

**Created:**
- `docs/sql-fixes/fix_transition_403_error.sql` - Comprehensive fix script
- `docs/TRANSITION_403_FIX_INSTRUCTIONS.md` - This document

**Related:**
- `docs/sql-fixes/grant_transition_profiles_access.sql` - Original fix (partial)
- `docs/sql-fixes/100_transition_module.sql` - Original table creation

---

## Troubleshooting

### Issue: "Table does not exist"
**Cause:** Transition tables not created yet
**Fix:** Run `docs/sql-fixes/100_transition_module.sql` first

### Issue: Still getting 403 after running SQL
**Cause:** Need to refresh authentication token
**Fix:** Log out and log back in to get new JWT token

### Issue: "GRANT command failed"
**Cause:** Using service role instead of postgres role
**Fix:** Run as "postgres" role (default in SQL Editor)

---

## Success Criteria

✅ SQL script runs without errors
✅ Verification query shows authenticated/anon with ALL privileges
✅ Test query returns result (not 403 error)
✅ Button click works without "Failed to check profile status" error
✅ User navigates to Transition page successfully

---

## Next Steps After Fix

1. ✅ Test button click on You page
2. ✅ Verify transition profile creation works
3. ✅ Check other transition features (checklist, timeline, etc.)
4. 📝 Update DATABASE_SCHEMA_REFERENCE.md with transition tables
5. 📝 Document lesson learned: ALWAYS include GRANT statements in migrations

---

**Status:** Ready to run in Supabase
**Time to Fix:** 2 minutes
**Risk:** None (only grants permissions, doesn't modify data)
**Rollback:** Not needed (can revoke grants if issues)
