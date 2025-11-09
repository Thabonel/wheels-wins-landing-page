# Calendar RLS Policy Fix - Action Required

## Problem Summary
All 12 calendar tool tests are failing with **403 Forbidden** errors due to incorrect Row Level Security (RLS) policies on the `calendar_events` table.

**Error Message:**
```
{'message': 'new row violates row-level security policy', 'code': '42501'}
```

**Root Cause:**
The calendar_events table has RLS enabled but lacks proper policies to allow authenticated users to access their own calendar events.

## Solution Created
I've created a complete SQL fix script that will:
1. Drop any existing conflicting RLS policies
2. Create 4 new policies allowing authenticated users to:
   - SELECT (view) their own calendar events
   - INSERT (create) their own calendar events  
   - UPDATE (modify) their own calendar events
   - DELETE (remove) their own calendar events

## Files Created
1. **fix_calendar_rls_properly.sql** - The SQL script to apply (45 lines)
2. **README.md** - Documentation for all SQL fixes (53 lines)
3. **This file** - Instructions for applying the fix

## How to Apply the Fix (Manual Steps Required)

### Step 1: Access Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/ydevatqwkoccxhtejdor
2. Log in with admin credentials
3. Navigate to: **SQL Editor** (left sidebar)

### Step 2: Apply the SQL Fix
1. Open the file: `docs/sql-fixes/fix_calendar_rls_properly.sql`
2. Copy the entire contents of the file
3. Paste into the Supabase SQL Editor
4. Click the **Run** button (or press Cmd+Enter)

### Step 3: Verify the Fix
Run this verification query in the SQL Editor:
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'calendar_events';
```

**Expected Output:**
You should see 4 policies listed:
- "Users can view their own calendar events" (cmd: SELECT)
- "Users can insert their own calendar events" (cmd: INSERT)
- "Users can update their own calendar events" (cmd: UPDATE)
- "Users can delete their own calendar events" (cmd: DELETE)

### Step 4: Test the Fix
After applying the SQL fix, run the calendar tests:
```bash
cd backend
source venv/bin/activate
PYTHONPATH=/Users/thabonel/Code/wheels-wins-landing-page/backend pytest app/tests/test_calendar_tools.py -v
```

**Expected Result:**
- Tests should now pass (or fail with different, non-RLS errors)
- 403 Forbidden errors should be gone
- Test pass rate should improve from 66% to ~88%

## Impact
**Current Status:**
- Total tests: 53
- Passing: 35 (66%)
- Failing: 18
- Calendar tests failing due to RLS: 12

**After Fix:**
- Expected passing: 47+ (88%+)
- Remaining failures will be other issues (Supabase auth, mock data, etc.)

## Technical Details

### RLS Policy Pattern
The policies use Supabase's auth system:
```sql
-- Policy checks if authenticated user ID matches the row's user_id
USING (auth.uid() = user_id)
```

### Security Implications
✅ **Safe:** These policies maintain data isolation - users can only access their own calendar events

✅ **No data leaks:** One user cannot view/modify another user's calendar events

✅ **Standard pattern:** This follows Supabase's recommended RLS pattern for user-isolated data

## Troubleshooting

### If policies already exist:
The script uses `DROP POLICY IF EXISTS` to handle this, so it's safe to run multiple times.

### If you get permission errors:
You need to be logged in as a Supabase admin with database permissions to create/drop policies.

### If tests still fail after applying:
1. Check that all 4 policies were created (run verification query)
2. Check that auth.uid() is properly set in test environment
3. Review test fixtures in `app/tests/conftest.py` to ensure user authentication is properly mocked

## Next Steps After Fix
Once this RLS fix is applied:
1. Rerun all automated tests to verify improvement
2. Update test coverage metrics
3. Begin manual testing of remaining 37 tools (see: `docs/PAM_PRIORITIZED_MANUAL_TESTING_PLAN.md`)

---

**Created:** January 2025  
**Priority:** P0 (Critical blocker for calendar functionality)  
**Status:** SQL fix created, awaiting manual application by admin
