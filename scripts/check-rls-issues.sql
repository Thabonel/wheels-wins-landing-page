-- ============================================
-- RLS DIAGNOSTIC QUERIES FOR WHEELS & WINS
-- Run these in Supabase SQL Editor
-- ============================================

-- 1. CHECK WHICH TABLES HAVE RLS ENABLED
-- ----------------------------------------
SELECT 
    tablename,
    CASE WHEN rowsecurity THEN '🔒 ENABLED' ELSE '🔓 DISABLED' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. VIEW ALL RLS POLICIES (DETAILED)
-- ----------------------------------------
SELECT 
    tablename as "Table",
    policyname as "Policy Name",
    cmd as "Operation",
    permissive as "Type",
    roles as "Roles",
    CASE 
        WHEN qual IS NOT NULL THEN substring(qual::text, 1, 100) || '...'
        ELSE 'No condition'
    END as "Policy Condition (first 100 chars)"
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- 3. CHECK PROFILES TABLE POLICIES SPECIFICALLY
-- ----------------------------------------
SELECT 
    policyname,
    cmd as operation,
    qual as using_clause,
    with_check as with_check_clause
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- 4. CHECK IF BASIC TABLES EXIST AND HAVE DATA
-- ----------------------------------------
SELECT 
    'profiles' as table_name, 
    COUNT(*) as row_count,
    CASE WHEN COUNT(*) > 0 THEN '✅ Has data' ELSE '⚠️ Empty' END as status
FROM profiles
UNION ALL
SELECT 'auth.users', COUNT(*), CASE WHEN COUNT(*) > 0 THEN '✅ Has data' ELSE '⚠️ Empty' END
FROM auth.users;

-- 5. CHECK RECENT AUTH ATTEMPTS (LAST 24 HOURS)
-- ----------------------------------------
SELECT 
    created_at,
    ip_address,
    payload->>'email' as email,
    payload->>'error' as error,
    payload->>'status' as status
FROM auth.audit_log_entries 
WHERE created_at > NOW() - INTERVAL '24 hours'
AND (payload->>'error' IS NOT NULL OR payload->>'status' = 'failed')
ORDER BY created_at DESC
LIMIT 10;

-- 6. EMERGENCY FIX: TEMPORARILY DISABLE RLS
-- ----------------------------------------
-- UNCOMMENT AND RUN THESE IF YOU NEED TO TEST WITHOUT RLS:
/*
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE income DISABLE ROW LEVEL SECURITY;
ALTER TABLE budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE trips DISABLE ROW LEVEL SECURITY;
*/

-- 7. RE-ENABLE RLS AFTER TESTING
-- ----------------------------------------
-- UNCOMMENT AND RUN THESE TO RE-ENABLE:
/*
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
*/

-- 8. CHECK FOR COMMON RLS PROBLEMS
-- ----------------------------------------
-- This checks if profiles table has the basic required policies
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'profiles' 
            AND cmd = 'SELECT'
        ) THEN '✅ SELECT policy exists'
        ELSE '❌ Missing SELECT policy'
    END as select_policy,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'profiles' 
            AND cmd = 'INSERT'
        ) THEN '✅ INSERT policy exists'
        ELSE '❌ Missing INSERT policy'
    END as insert_policy,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'profiles' 
            AND cmd = 'UPDATE'
        ) THEN '✅ UPDATE policy exists'
        ELSE '❌ Missing UPDATE policy'
    END as update_policy;

-- 9. FIX COMMON AUTH ISSUES
-- ----------------------------------------
-- If profiles table is missing INSERT policy for new users:
/*
CREATE POLICY "Users can create their own profile on signup" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view their own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
*/