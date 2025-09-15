-- =====================================================
-- VERIFY PAM TABLES SETUP
-- Date: January 8, 2025
-- Purpose: Verification queries to confirm PAM database setup
-- =====================================================

-- =====================================================
-- 1. CHECK IF ALL TABLES EXIST
-- =====================================================
SELECT 
    'Table Existence Check' as check_type,
    table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = t.table_name
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (
    VALUES 
        ('pam_conversations'),
        ('pam_messages'),
        ('pam_user_context'),
        ('pam_conversation_memory'),
        ('pam_feedback'),
        ('pam_analytics'),
        ('pam_recommendations'),
        ('pam_savings_events'),
        ('pam_monthly_savings_summary'),
        ('pam_savings_guarantee_evaluations')
) as t(table_name)
ORDER BY table_name;

-- =====================================================
-- 2. CHECK RLS IS ENABLED ON ALL TABLES
-- =====================================================
SELECT 
    'RLS Status Check' as check_type,
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ ENABLED'
        ELSE '❌ DISABLED'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'pam_%'
ORDER BY tablename;

-- =====================================================
-- 3. COUNT RLS POLICIES PER TABLE
-- =====================================================
SELECT 
    'RLS Policies Count' as check_type,
    schemaname,
    tablename,
    COUNT(*) as policy_count,
    CASE 
        WHEN COUNT(*) >= 2 THEN '✅ GOOD'
        WHEN COUNT(*) = 1 THEN '⚠️ CHECK'
        ELSE '❌ MISSING'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename LIKE 'pam_%'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- =====================================================
-- 4. LIST ALL RLS POLICIES (CHECK FOR RECURSION)
-- =====================================================
SELECT 
    'Policy Details' as check_type,
    tablename,
    policyname,
    cmd as operation,
    CASE 
        WHEN qual LIKE '%EXISTS%EXISTS%' THEN '❌ RECURSIVE'
        WHEN qual LIKE '%auth.uid() = user_id%' THEN '✅ SIMPLE'
        WHEN qual LIKE '%auth.role() = ''service_role''%' THEN '✅ SERVICE'
        ELSE '⚠️ CHECK'
    END as policy_type,
    LEFT(qual, 100) as policy_condition
FROM pg_policies
WHERE schemaname = 'public'
AND tablename LIKE 'pam_%'
ORDER BY tablename, policyname;

-- =====================================================
-- 5. CHECK INDEXES EXIST
-- =====================================================
SELECT 
    'Index Check' as check_type,
    tablename,
    indexname,
    '✅ EXISTS' as status
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename LIKE 'pam_%'
ORDER BY tablename, indexname;

-- =====================================================
-- 6. CHECK FUNCTIONS EXIST
-- =====================================================
SELECT 
    'Function Check' as check_type,
    proname as function_name,
    '✅ EXISTS' as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND proname IN (
    'get_or_create_pam_conversation',
    'store_pam_message',
    'get_conversation_history',
    'get_user_preferences',
    'store_user_context',
    'cleanup_expired_pam_memory',
    'update_updated_at_column'
)
ORDER BY proname;

-- =====================================================
-- 7. CHECK TRIGGERS EXIST
-- =====================================================
SELECT 
    'Trigger Check' as check_type,
    event_object_table as table_name,
    trigger_name,
    '✅ EXISTS' as status
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table LIKE 'pam_%'
AND trigger_name LIKE '%updated_at%'
ORDER BY event_object_table, trigger_name;

-- =====================================================
-- 8. CHECK FOREIGN KEY CONSTRAINTS
-- =====================================================
SELECT
    'Foreign Key Check' as check_type,
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    '✅ EXISTS' as status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND tc.table_name LIKE 'pam_%'
ORDER BY tc.table_name, tc.constraint_name;

-- =====================================================
-- 9. CHECK ROW COUNTS (BASIC DATA CHECK)
-- =====================================================
DO $$
DECLARE
    table_record RECORD;
    row_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'ROW COUNT CHECK';
    RAISE NOTICE '==============================================';
    
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename LIKE 'pam_%'
        ORDER BY tablename
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM public.%I', table_record.tablename) INTO row_count;
        RAISE NOTICE '  % : % rows', RPAD(table_record.tablename, 35), row_count;
    END LOOP;
    
    RAISE NOTICE '==============================================';
END $$;

-- =====================================================
-- 10. COMPREHENSIVE SUMMARY
-- =====================================================
WITH table_check AS (
    SELECT COUNT(*) as table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
        'pam_conversations',
        'pam_messages',
        'pam_user_context',
        'pam_conversation_memory',
        'pam_feedback',
        'pam_analytics',
        'pam_recommendations',
        'pam_savings_events',
        'pam_monthly_savings_summary',
        'pam_savings_guarantee_evaluations'
    )
),
rls_check AS (
    SELECT COUNT(*) as rls_enabled_count
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename LIKE 'pam_%'
    AND rowsecurity = true
),
policy_check AS (
    SELECT COUNT(DISTINCT tablename) as tables_with_policies
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename LIKE 'pam_%'
),
function_check AS (
    SELECT COUNT(*) as function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND proname IN (
        'get_or_create_pam_conversation',
        'store_pam_message',
        'get_conversation_history',
        'get_user_preferences',
        'store_user_context',
        'cleanup_expired_pam_memory'
    )
)
SELECT 
    'FINAL VERIFICATION SUMMARY' as check_type,
    CASE 
        WHEN t.table_count = 10 THEN '✅'
        ELSE '❌'
    END || ' Tables: ' || t.table_count || '/10' as tables,
    CASE 
        WHEN r.rls_enabled_count = 10 THEN '✅'
        ELSE '❌'
    END || ' RLS Enabled: ' || r.rls_enabled_count || '/10' as rls,
    CASE 
        WHEN p.tables_with_policies >= 10 THEN '✅'
        ELSE '❌'
    END || ' Tables with Policies: ' || p.tables_with_policies || '/10' as policies,
    CASE 
        WHEN f.function_count >= 6 THEN '✅'
        ELSE '❌'
    END || ' Functions: ' || f.function_count || '/6' as functions,
    CASE 
        WHEN t.table_count = 10 
        AND r.rls_enabled_count = 10 
        AND p.tables_with_policies >= 10 
        AND f.function_count >= 6 
        THEN '✅ ALL CHECKS PASSED - PAM DATABASE READY!'
        ELSE '❌ SOME CHECKS FAILED - REVIEW ABOVE'
    END as overall_status
FROM table_check t, rls_check r, policy_check p, function_check f;

-- =====================================================
-- 11. TEST SERVICE ROLE ACCESS (OPTIONAL)
-- =====================================================
-- Uncomment and run these with service role credentials to test access

-- Test inserting a conversation
-- INSERT INTO public.pam_conversations (user_id, title) 
-- VALUES ('00000000-0000-0000-0000-000000000000'::uuid, 'Test Conversation')
-- RETURNING id;

-- Test selecting from analytics (service role only)
-- SELECT COUNT(*) FROM public.pam_analytics;

-- =====================================================
-- 12. TEST USER ACCESS (OPTIONAL)
-- =====================================================
-- Uncomment and run these with authenticated user credentials to test access

-- Test user can see their own data
-- SELECT * FROM public.pam_conversations WHERE user_id = auth.uid();
-- SELECT * FROM public.pam_messages WHERE conversation_id IN (
--     SELECT id FROM public.pam_conversations WHERE user_id = auth.uid()
-- );

-- =====================================================
-- END OF VERIFICATION SCRIPT
-- =====================================================