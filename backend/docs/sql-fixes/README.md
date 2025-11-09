# SQL Fixes Directory

This directory contains SQL migration scripts to fix database issues.

## How to Apply SQL Fixes

1. **Access Supabase Dashboard:**
   - Go to: https://supabase.com/dashboard/project/ydevatqwkoccxhtejdor
   - Navigate to: SQL Editor

2. **Open the SQL file** from this directory

3. **Copy and paste** the entire SQL content into the Supabase SQL Editor

4. **Run the script** by clicking "Run" button

5. **Verify the fix** by running the verification query at the bottom of the script

## Current Fixes

### fix_calendar_rls_properly.sql
**Issue:** Calendar tools failing with 403 Forbidden errors  
**Root Cause:** Row Level Security (RLS) policies blocking authenticated users from accessing calendar_events table  
**Impact:** All 12 calendar tool tests failing with error: `{'message': 'new row violates row-level security policy', 'code': '42501'}`

**What This Fix Does:**
1. Drops any existing conflicting RLS policies
2. Ensures RLS is enabled on calendar_events table
3. Creates 4 new policies allowing authenticated users to:
   - SELECT (view) their own calendar events
   - INSERT (create) their own calendar events
   - UPDATE (modify) their own calendar events
   - DELETE (remove) their own calendar events

**How to Verify:**
After applying the fix, run this query in Supabase SQL Editor:
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'calendar_events';
```

Expected result: 4 policies listed with names matching those in the fix script.

**Testing:**
After applying the fix, run the calendar tests:
```bash
cd backend
source venv/bin/activate
PYTHONPATH=/Users/thabonel/Code/wheels-wins-landing-page/backend pytest app/tests/test_calendar_tools.py -v
```

Expected: Tests should now pass (or fail with different, non-RLS errors).
