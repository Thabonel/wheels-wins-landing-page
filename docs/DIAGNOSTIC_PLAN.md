# Comprehensive 403 Diagnostic Plan

## The Mystery

**Symptom**: Clicking "Start Planning My Transition" shows error: "Failed to set up your transition profile"

**What We've Tried** (All Failed):
1. ✅ Fixed RLS policies with explicit type casting
2. ✅ Applied GRANT statements
3. ✅ Made fields nullable
4. ✅ Created SECURITY DEFINER RPC function
5. ✅ Token refresh attempts
6. ✅ Multiple logout/login cycles

**Conclusion**: We're fighting symptoms without seeing the disease. We need raw diagnostics.

---

## Root Cause Hypotheses

### Hypothesis 1: RPC Function Doesn't Exist (Most Likely)
**Theory**: Migration file exists locally but was never run in Supabase

**Evidence For**:
- Migration file is dated 2025-02-01 (future date - suspicious)
- No confirmation that it was run in Supabase
- Supabase migrations must be applied manually or via CLI

**How to Test**:
```sql
-- Check if function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'start_transition_profile';
```

**Expected if bug**: 0 rows (function doesn't exist)

---

### Hypothesis 2: CHECK Constraint Failing
**Theory**: `transition_profiles_future_departure` constraint blocks past dates

**Evidence For**:
```sql
CONSTRAINT transition_profiles_future_departure
    CHECK (departure_date >= CURRENT_DATE OR archived_at IS NOT NULL)
```

This fails if:
- Departure date is in the past
- Both departure_date and archived_at are NULL

**How to Test**:
Check if user has an existing row with invalid data:
```sql
SELECT id, user_id, departure_date, archived_at,
       CASE
         WHEN departure_date >= CURRENT_DATE THEN 'valid'
         WHEN archived_at IS NOT NULL THEN 'valid (archived)'
         ELSE 'CONSTRAINT VIOLATION'
       END as constraint_status
FROM transition_profiles
WHERE user_id = auth.uid();
```

---

### Hypothesis 3: Misleading Error Message
**Theory**: Real error is hidden behind generic toast message

**Evidence For**:
```typescript
if (rpcError || !profileResult) {
  console.error('Failed to set up transition profile via RPC:', rpcError);
  if (rpcError?.code === 'P0001') {
    toast.error('You need to be logged in to start planning');
  } else if (rpcError?.code === '42501') {
    toast.error('Still missing permission to create your transition profile');
  } else {
    toast.error('Failed to set up your transition profile'); // ← Generic message
  }
}
```

The else block swallows ALL other errors!

**How to Test**:
Open browser console and look for `console.error` output showing actual error details.

---

### Hypothesis 4: Foreign Key Constraint
**Theory**: `user_id` doesn't exist in `auth.users` table

**Evidence For**:
```sql
user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE
```

**How to Test**:
```sql
-- Check if user exists in auth.users
SELECT id, email
FROM auth.users
WHERE id = auth.uid();

-- Check for orphaned profiles
SELECT tp.id, tp.user_id, au.id as auth_user_exists
FROM transition_profiles tp
LEFT JOIN auth.users au ON tp.user_id = au.id
WHERE tp.user_id = auth.uid();
```

---

### Hypothesis 5: Existing Bad Data
**Theory**: User has a corrupted profile row that blocks upsert

**How to Test**:
```sql
-- Show user's current profile (if exists)
SELECT *
FROM transition_profiles
WHERE user_id = auth.uid();

-- Check for constraint violations
SELECT
  id,
  user_id,
  departure_date,
  current_phase,
  transition_type,
  archived_at,
  CASE WHEN departure_date IS NULL AND current_phase IS NULL THEN 'Missing required defaults' END as issue1,
  CASE WHEN departure_date < CURRENT_DATE AND archived_at IS NULL THEN 'Future departure constraint violated' END as issue2
FROM transition_profiles
WHERE user_id = auth.uid();
```

---

## Diagnostic Script (Run This in Supabase SQL Editor)

```sql
-- ==================================================
-- COMPREHENSIVE TRANSITION PROFILE DIAGNOSTIC
-- ==================================================

-- 1. Check if RPC function exists
SELECT
  'FUNCTION CHECK' as test_category,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ Function exists'
    ELSE '❌ Function NOT FOUND - This is likely the problem!'
  END as result
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'start_transition_profile';

-- 2. Check table structure (nullable fields)
SELECT
  'TABLE STRUCTURE' as test_category,
  column_name,
  is_nullable,
  column_default,
  data_type
FROM information_schema.columns
WHERE table_name = 'transition_profiles'
AND column_name IN ('departure_date', 'current_phase', 'transition_type', 'user_id')
ORDER BY column_name;

-- 3. Check RLS policies
SELECT
  'RLS POLICIES' as test_category,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'transition_profiles'
ORDER BY cmd;

-- 4. Check GRANTs
SELECT
  'GRANTS' as test_category,
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name = 'transition_profiles'
AND grantee IN ('authenticated', 'anon')
ORDER BY grantee, privilege_type;

-- 5. Check current user
SELECT
  'CURRENT USER' as test_category,
  auth.uid() as user_id,
  CASE WHEN auth.uid() IS NOT NULL THEN '✅ Authenticated' ELSE '❌ Not authenticated' END as status;

-- 6. Check user's existing profile
SELECT
  'EXISTING PROFILE' as test_category,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ No existing profile (clean slate)'
    ELSE '⚠️  Profile exists - check for issues below'
  END as result
FROM transition_profiles
WHERE user_id = auth.uid();

-- 7. Check for constraint violations
SELECT
  'CONSTRAINT CHECK' as test_category,
  id,
  user_id,
  departure_date,
  current_phase,
  transition_type,
  archived_at,
  CASE
    WHEN departure_date >= CURRENT_DATE OR archived_at IS NOT NULL THEN '✅ Valid'
    WHEN departure_date < CURRENT_DATE AND archived_at IS NULL THEN '❌ FUTURE DEPARTURE CONSTRAINT VIOLATED'
    ELSE '⚠️  Check data'
  END as constraint_status
FROM transition_profiles
WHERE user_id = auth.uid();

-- 8. Test RPC function directly (if it exists)
-- Uncomment to test:
-- SELECT * FROM start_transition_profile(
--   (now() at time zone 'utc')::date + 90,
--   true
-- );
```

---

## Novel Solution Approaches

### Approach 1: Nuclear Option - Delete Existing Profile
**If user has corrupted data:**
```sql
DELETE FROM transition_profiles WHERE user_id = auth.uid();
```
Then try button again.

### Approach 2: Apply RPC Migration Manually
**If function doesn't exist:**
Run the entire contents of:
`supabase/migrations/20250201000000-add-start-transition-profile-function.sql`

### Approach 3: Bypass Everything with Raw SQL
**If all else fails:**
```sql
-- Create profile directly with SECURITY DEFINER wrapper
CREATE OR REPLACE FUNCTION force_create_transition_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO transition_profiles (user_id, is_enabled, departure_date, current_phase, transition_type)
  VALUES (auth.uid(), true, (now() + interval '90 days')::date, 'planning', 'full_time')
  ON CONFLICT (user_id) DO UPDATE
    SET is_enabled = true,
        departure_date = (now() + interval '90 days')::date;
END;
$$;

GRANT EXECUTE ON FUNCTION force_create_transition_profile() TO authenticated;

-- Then call it
SELECT force_create_transition_profile();
```

### Approach 4: Frontend Debug Mode
**Add detailed error logging:**
```typescript
if (rpcError || !profileResult) {
  // Log EVERYTHING
  console.error('=== FULL ERROR DETAILS ===');
  console.error('Error object:', JSON.stringify(rpcError, null, 2));
  console.error('Error code:', rpcError?.code);
  console.error('Error message:', rpcError?.message);
  console.error('Error details:', rpcError?.details);
  console.error('Error hint:', rpcError?.hint);
  console.error('Profile result:', profileResult);

  // Show full error to user temporarily
  toast.error(`Error: ${rpcError?.message || 'Unknown'} (Code: ${rpcError?.code || 'N/A'})`);
}
```

---

## Step-by-Step Execution Plan

### Step 1: Run Diagnostic SQL
1. Open Supabase SQL Editor
2. Paste the comprehensive diagnostic script above
3. Run it
4. **Share ALL output with me**

### Step 2: Check Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Clear console
4. Click "Start Planning My Transition"
5. **Screenshot and share console output**

### Step 3: Check Network Tab
1. Open DevTools Network tab
2. Filter by "start_transition"
3. Click button
4. Check if request happens
5. **Share request/response details**

### Step 4: Based on Results
- If function doesn't exist → Apply migration manually
- If constraint violated → Delete bad row
- If different error → Address that specific error
- If all checks pass but still fails → Something very weird is happening

---

## Questions to Answer

1. **Did the RPC migration actually run in Supabase?**
2. **What is the EXACT error message in browser console?**
3. **Does the user have an existing (possibly corrupted) profile row?**
4. **Is there a CHECK constraint violation we're not seeing?**

Once we answer these, we'll know the real problem.
