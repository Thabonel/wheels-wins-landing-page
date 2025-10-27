# Life Transition Navigator - 403 Error Diagnostic Guide

**Created:** January 27, 2025
**Purpose:** Investigate why "Start Planning My Transition" button returns 403 Forbidden
**Status:** Diagnostic in progress

---

## Quick Summary of Investigation So Far

### What I've Learned About Your App

#### 1. **System Architecture**
- **Frontend:** React + TypeScript on Netlify (wheelsandwins.com)
- **Backend:** FastAPI (Python) on Render
- **Database:** Supabase (PostgreSQL with RLS)
- **Authentication:** JWT tokens via Supabase Auth
- **Dev Port:** 8080 (NOT 3000!)

#### 2. **How User Login Works**
```
1. User enters credentials
   ↓
2. Supabase validates → Generates JWT token
   ↓
3. JWT contains: user ID (sub), role (authenticated), expiration
   ↓
4. Token stored in localStorage (key: 'pam-auth-token')
   ↓
5. AuthContext updates → Sets user, session, token
   ↓
6. useProfile hook triggers → Fetches from 'profiles' table
   ↓
7. Profile data loaded → App fully authenticated
```

**CRITICAL:** `profiles` table uses column **`id`** (NOT `user_id`)
**BUT:** Most other tables use column **`user_id`**

#### 3. **How PAM Memory Works**
- **In-Memory:** Last 20 messages per conversation
- **Database:** Stored in `pam_conversations` + `pam_messages` tables
- **Cross-Device:** Syncs via user_id across devices
- **AI:** Claude Sonnet 4.5 (ONE brain, no hybrid routing)
- **Tools:** 45 total (Budget, Trip, Social, Shop, Profile, Admin)

### The 403 Error Problem

**What's Happening:**
```
User clicks "Start Planning My Transition" button
  ↓
TransitionNavigatorCard.tsx tries to query transition_profiles table
  ↓
Supabase REST API returns: 403 Forbidden
  ↓
PostgreSQL error: "permission denied for table transition_profiles"
  ↓
User sees toast: "Failed to check profile status"
```

**Why Test Queries Work But Browser Fails:**

| Context | Role | Result |
|---------|------|--------|
| Supabase SQL Editor | `postgres` (superuser) | ✅ Works (bypasses all permissions) |
| Browser REST API | `authenticated` (from JWT) | ❌ 403 Forbidden |

**Root Cause:** PostgreSQL needs **BOTH**:
1. RLS Policies (row-level access) ✅ EXISTS
2. Table-Level GRANT statements ❌ POSSIBLY MISSING

**Critical Insight:** Even perfect RLS policies mean nothing if table-level GRANTs aren't applied!

---

## Diagnostic Process (Run These Steps)

### Step 1: Run Diagnostic SQL Script

**File:** `docs/sql-fixes/diagnose_transition_403.sql`

**How to Run:**
1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Select project: **kycoklimpzkyrecbjecn**
3. Click "SQL Editor" in left sidebar
4. Click "New Query"
5. Copy ENTIRE contents of `diagnose_transition_403.sql`
6. Click "Run" (or Cmd/Ctrl + Enter)
7. Review results below

**What This Script Does:**
- ✅ Checks if transition_profiles table exists
- ✅ Shows table structure (verify 'user_id' column exists)
- ✅ Checks table-level GRANT statements
- ✅ Lists RLS policies
- ✅ Tests query as postgres role (should work)
- ✅ Tests query as authenticated role (KEY TEST!)
- ✅ Verifies RLS is enabled
- ✅ Lists available PostgreSQL roles

### Step 2: Interpret Results

#### **If Step 2 Shows NO Rows for authenticated/anon:**

**Problem:** GRANT statements were NEVER actually applied

**Evidence:**
```
table_name           | grantee       | privilege_type
---------------------+---------------+---------------
(no rows returned)
```

**Solution:**
1. Run `docs/sql-fixes/fix_transition_403_error.sql` as **postgres role**
2. Verify verification query returns 16 rows
3. Re-test browser

---

#### **If Step 5 Returns Error 42501:**

**Problem:** authenticated role doesn't have table-level access

**Evidence:**
```
ERROR: 42501: permission denied for table transition_profiles
```

**Solution:**
1. GRANT statements didn't apply correctly
2. Run fix_transition_403_error.sql AGAIN
3. Make sure you're logged in as postgres role (not service_role)
4. Wait 30 seconds for Supabase to propagate changes

---

#### **If Step 5 Works But Browser Still Fails:**

**Problem:** RLS policy column mismatch OR JWT token caching

**Evidence:**
```
Step 5: count_as_authenticated = 0  ← Works!
But browser console still shows 403 ← Still broken!
```

**Possible Causes:**

**A. RLS Policy Column Mismatch:**

Check Step 3 results - look at the `qual` column:
```
qual: (auth.uid() = id)              ← WRONG! Query uses 'user_id'
qual: (auth.uid() = user_id)         ← CORRECT!
```

If RLS policy checks `id` but your query uses `user_id`, you'll get 403!

**Solution:** Fix RLS policy to match query column

**B. JWT Token Caching:**

Old JWT token issued BEFORE GRANT statements were applied

**Solution:**
1. Completely log out of app
2. Clear browser localStorage:
   - Open DevTools (F12)
   - Go to Application tab
   - Storage → Local Storage
   - Delete 'pam-auth-token' key
3. Close browser completely
4. Re-open browser and log back in
5. Test button again

---

#### **If Step 1 Shows Missing 'user_id' Column:**

**Problem:** Table structure doesn't match query

**Evidence:**
```
column_name | data_type
------------+----------
id          | uuid
created_at  | timestamp
... (no user_id column!)
```

**Solution:** transition_profiles table needs user_id column added

---

### Step 3: Apply Fix Based on Diagnostic Results

Based on what you found, choose ONE fix:

#### **Fix A: Re-apply GRANT Statements**

If Step 2 showed NO rows or Step 5 failed with 42501:

```sql
-- Run in Supabase SQL Editor
GRANT ALL ON transition_profiles TO authenticated;
GRANT ALL ON transition_profiles TO anon;

GRANT ALL ON transition_tasks TO authenticated;
GRANT ALL ON transition_tasks TO anon;

GRANT ALL ON transition_timeline TO authenticated;
GRANT ALL ON transition_timeline TO anon;

GRANT ALL ON transition_financial TO authenticated;
GRANT ALL ON transition_financial TO anon;

GRANT ALL ON transition_inventory TO authenticated;
GRANT ALL ON transition_inventory TO anon;

GRANT ALL ON transition_equipment TO authenticated;
GRANT ALL ON transition_equipment TO anon;

GRANT ALL ON transition_vehicles TO authenticated;
GRANT ALL ON transition_vehicles TO anon;

GRANT ALL ON transition_community TO authenticated;
GRANT ALL ON transition_community TO anon;

-- Verify grants applied
SELECT table_name, grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_name LIKE 'transition_%'
AND grantee IN ('authenticated', 'anon')
ORDER BY table_name, grantee;
```

**Expected:** 48 rows (8 tables × 2 roles × 3 privileges minimum)

---

#### **Fix B: Fix RLS Policy Column Mismatch**

If Step 3 showed policy checking wrong column:

```sql
-- Drop old policies
DROP POLICY IF EXISTS "Users can view own transition profile" ON transition_profiles;
DROP POLICY IF EXISTS "Users can insert own transition profile" ON transition_profiles;
DROP POLICY IF EXISTS "Users can update own transition profile" ON transition_profiles;
DROP POLICY IF EXISTS "Users can delete own transition profile" ON transition_profiles;

-- Create new policies with correct column
CREATE POLICY "Users can view own transition profile"
ON transition_profiles FOR SELECT
USING (auth.uid() = user_id);  -- ← user_id, not id!

CREATE POLICY "Users can insert own transition profile"
ON transition_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transition profile"
ON transition_profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transition profile"
ON transition_profiles FOR DELETE
USING (auth.uid() = user_id);

-- Verify policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'transition_profiles';
```

---

#### **Fix C: Clear JWT Token Cache**

If SQL works but browser still fails:

**Manual Steps:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Run: `localStorage.clear()`
4. Go to Application tab → Storage → Clear all
5. Close browser completely
6. Re-open and log in
7. Test button

**OR use Supabase client method:**

In browser console:
```javascript
await supabase.auth.signOut()
// Wait 5 seconds
// Log back in normally
```

---

### Step 4: Verify Fix Worked

After applying fix, test in this order:

#### **Test 1: SQL Query as authenticated**
```sql
SET ROLE authenticated;
SELECT * FROM transition_profiles LIMIT 1;
RESET ROLE;
```

**Expected:** Returns empty result (no error)
**If Error:** GRANTs still not applied correctly

#### **Test 2: Browser Query**
1. Open browser to app
2. Open DevTools → Console tab
3. Ensure logged in
4. Navigate to You page
5. Click "Start Planning My Transition" button

**Expected:** Button shows "Setting up..." then navigates to Transition page
**If Still Broken:** Check console for new errors

---

## Common Issues & Solutions

### Issue: "GRANT command failed"
**Cause:** Using service_role instead of postgres role
**Fix:** Make sure you're logged into Supabase as owner/admin, not service_role

### Issue: "Table does not exist"
**Cause:** transition_profiles table not created yet
**Fix:** Run `docs/sql-fixes/100_transition_module.sql` first

### Issue: GRANTs applied but still 403 after logout/login
**Cause:** Supabase permission cache (rare)
**Fix:** Wait 2-3 minutes for Supabase to propagate changes globally

### Issue: Different error after fix
**Cause:** Fixed permissions, revealed new problem
**Fix:** Share new error message for further diagnosis

---

## Success Criteria

✅ **Diagnostic script runs without errors**
✅ **Step 2 shows authenticated/anon with privileges**
✅ **Step 5 returns count (not 42501 error)**
✅ **Browser test works without "Failed to check profile status" error**
✅ **User navigates to Transition page successfully**

---

## What to Share After Running Diagnostic

Please share these results:

1. **Step 1 output** (table structure)
2. **Step 2 output** (GRANT statements)
3. **Step 3 output** (RLS policies - especially the `qual` column)
4. **Step 5 result** (did query as authenticated work or fail?)
5. **Browser console errors** (after running fix)

This will help pinpoint the EXACT issue!

---

## Related Files

- **Diagnostic Script:** `docs/sql-fixes/diagnose_transition_403.sql`
- **Fix Script:** `docs/sql-fixes/fix_transition_403_error.sql`
- **Original Instructions:** `docs/TRANSITION_403_FIX_INSTRUCTIONS.md`
- **Table Creation:** `docs/sql-fixes/100_transition_module.sql`
- **Button Component:** `src/components/you/TransitionNavigatorCard.tsx`
- **Dashboard Component:** `src/components/transition/TransitionDashboard.tsx`

---

**Last Updated:** January 27, 2025
**Status:** Awaiting diagnostic results
**Next Step:** Run diagnose_transition_403.sql and share results
