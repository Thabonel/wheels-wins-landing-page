# Transition Profile Diagnostic - Step by Step

## Instructions

Run each SQL file below **individually** in the Supabase SQL Editor and share the results.

**Supabase SQL Editor:** https://supabase.com/dashboard/project/ydevatqwkoccxhtejdor/sql

---

## Step 1: Check if RPC Function Exists

**File:** `01_check_function_exists.sql`

**What it checks:** Verifies the `start_transition_profile` RPC function is registered in the database.

**Expected result:** Should show `✅ Function exists`

**Copy and run:**
```sql
SELECT
  routine_name,
  routine_type,
  routine_schema,
  CASE
    WHEN routine_name = 'start_transition_profile' THEN '✅ Function exists'
    ELSE '❌ Function NOT found'
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'start_transition_profile';
```

---

## Step 2: Check RLS Policies

**File:** `02_check_rls_policies.sql`

**What it checks:** Lists all Row Level Security policies on the `transition_profiles` table.

**Expected result:** Should show SELECT, INSERT, UPDATE policies for authenticated role.

**Copy and run:**
```sql
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'transition_profiles'
ORDER BY cmd, policyname;
```

---

## Step 3: Check User Authentication

**File:** `03_check_user_auth.sql`

**What it checks:** Verifies you're authenticated in the SQL Editor context.

**Expected result:** Should show `✅ Authenticated` with your email.

**Copy and run:**
```sql
SELECT
  auth.uid() as current_user_id,
  CASE
    WHEN auth.uid() IS NOT NULL THEN '✅ Authenticated'
    ELSE '❌ Not authenticated'
  END as auth_status,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as user_email;
```

---

## Step 4: Check Existing Profile

**File:** `04_check_existing_profile.sql`

**What it checks:** Looks for existing transition profile for your user.

**Expected result:** Should show `✅ No existing profile` (0 rows)

**Copy and run:**
```sql
SELECT
  COUNT(*) as profile_count,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ No existing profile'
    WHEN COUNT(*) = 1 THEN '⚠️  Profile exists'
    ELSE '❌ Multiple profiles (should be impossible)'
  END as status
FROM transition_profiles
WHERE user_id = auth.uid();

SELECT *
FROM transition_profiles
WHERE user_id = auth.uid();
```

---

## Step 5: Test RPC Function Directly

**File:** `05_test_rpc_function.sql`

**What it checks:** Attempts to create a profile using the RPC function.

**Expected result:** Should either create profile successfully OR show the REAL error.

**Copy and run:**
```sql
SELECT * FROM start_transition_profile(
  (now() at time zone 'utc')::date + 90,
  true
);
```

⚠️ **This is the critical test** - it will tell us if the RPC function works in SQL Editor but fails in frontend.

---

## Step 6: Check Table Grants

**File:** `06_check_table_grants.sql`

**What it checks:** Verifies table-level permissions are correct.

**Expected result:** Should show SELECT, INSERT, UPDATE for authenticated role.

**Copy and run:**
```sql
SELECT
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name = 'transition_profiles'
AND grantee IN ('authenticated', 'anon', 'public')
ORDER BY grantee, privilege_type;
```

---

## After Running All Diagnostics

Share the results of **ALL 6 steps** so we can identify the exact root cause and apply a targeted fix.

**Most common issues we'll identify:**

1. **Function missing** → Apply migration file
2. **RLS policy blocking** → Fix policy logic or remove duplicate
3. **Authentication context mismatch** → Frontend JWT issue
4. **Constraint violation** → Fix existing bad data
5. **Permission mismatch** → Apply correct grants

---

**Next:** Once you share all 6 results, I'll know exactly what's wrong and provide the specific fix.
