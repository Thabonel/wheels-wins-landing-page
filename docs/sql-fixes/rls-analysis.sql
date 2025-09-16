-- =====================================================
-- RLS POLICY ANALYSIS AND OPTIMIZATION SCRIPT
-- Analyzes all 142 tables and generates optimization commands
-- =====================================================

-- Step 1: Analyze current RLS policies with performance issues
SELECT
    '=== CURRENT INEFFICIENT RLS POLICIES ===' as analysis_section;

SELECT
    schemaname,
    tablename,
    policyname,
    cmd,
    CASE
        WHEN qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(select auth.uid())%' THEN 'INEFFICIENT_QUAL'
        WHEN with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(select auth.uid())%' THEN 'INEFFICIENT_WITH_CHECK'
        ELSE 'OPTIMIZED'
    END as performance_status,
    length(qual) as qual_length,
    length(with_check) as with_check_length,
    qual,
    with_check
FROM pg_policies
WHERE (
    qual LIKE '%auth.uid()%'
    OR with_check LIKE '%auth.uid()%'
)
AND schemaname = 'public'
ORDER BY
    CASE
        WHEN qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(select auth.uid())%' THEN 1
        WHEN with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(select auth.uid())%' THEN 1
        ELSE 2
    END,
    tablename,
    policyname;

-- Step 2: Count tables by optimization status
SELECT
    '=== OPTIMIZATION STATUS SUMMARY ===' as analysis_section;

SELECT
    CASE
        WHEN qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(select auth.uid())%' THEN 'NEEDS_OPTIMIZATION'
        WHEN with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(select auth.uid())%' THEN 'NEEDS_OPTIMIZATION'
        WHEN qual LIKE '%(select auth.uid())%' OR with_check LIKE '%(select auth.uid())%' THEN 'ALREADY_OPTIMIZED'
        ELSE 'NO_AUTH_POLICIES'
    END as optimization_status,
    COUNT(DISTINCT tablename) as table_count,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY
    CASE
        WHEN qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(select auth.uid())%' THEN 'NEEDS_OPTIMIZATION'
        WHEN with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(select auth.uid())%' THEN 'NEEDS_OPTIMIZATION'
        WHEN qual LIKE '%(select auth.uid())%' OR with_check LIKE '%(select auth.uid())%' THEN 'ALREADY_OPTIMIZED'
        ELSE 'NO_AUTH_POLICIES'
    END
ORDER BY policy_count DESC;

-- Step 3: List all tables that need optimization
SELECT
    '=== TABLES REQUIRING OPTIMIZATION ===' as analysis_section;

SELECT DISTINCT
    tablename,
    COUNT(*) as inefficient_policies
FROM pg_policies
WHERE (
    (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(select auth.uid())%')
    OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(select auth.uid())%')
)
AND schemaname = 'public'
GROUP BY tablename
ORDER BY inefficient_policies DESC, tablename;

-- Step 4: Generate optimization commands for each inefficient policy
SELECT
    '=== GENERATED OPTIMIZATION COMMANDS ===' as analysis_section;

SELECT
    tablename,
    policyname,
    'DROP POLICY IF EXISTS "' || policyname || '" ON ' || tablename || ';' as drop_command,
    'CREATE POLICY "' || policyname || '" ON ' || tablename ||
    CASE
        WHEN cmd IS NOT NULL THEN ' FOR ' || cmd
        ELSE ''
    END ||
    CASE
        WHEN qual IS NOT NULL THEN ' USING (' || replace(qual, 'auth.uid()', '(select auth.uid())') || ')'
        ELSE ''
    END ||
    CASE
        WHEN with_check IS NOT NULL THEN ' WITH CHECK (' || replace(with_check, 'auth.uid()', '(select auth.uid())') || ')'
        ELSE ''
    END || ';' as create_command
FROM pg_policies
WHERE (
    (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(select auth.uid())%')
    OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(select auth.uid())%')
)
AND schemaname = 'public'
ORDER BY tablename, policyname;

-- Step 5: Show table sizes to prioritize optimization
SELECT
    '=== TABLE SIZES FOR PRIORITIZATION ===' as analysis_section;

SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM information_schema.tables t
WHERE t.table_schema = 'public'
AND EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.tablename = t.table_name
    AND (
        (p.qual LIKE '%auth.uid()%' AND p.qual NOT LIKE '%(select auth.uid())%')
        OR (p.with_check LIKE '%auth.uid()%' AND p.with_check NOT LIKE '%(select auth.uid())%')
    )
)
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Step 6: Create bulk optimization function
CREATE OR REPLACE FUNCTION generate_bulk_rls_optimization()
RETURNS TABLE(
    execution_order INTEGER,
    table_name TEXT,
    optimization_sql TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    r RECORD;
    counter INTEGER := 1;
BEGIN
    -- Generate optimization SQL for each table with inefficient policies
    FOR r IN
        SELECT DISTINCT
            p.tablename,
            COUNT(*) as policy_count
        FROM pg_policies p
        WHERE (
            (p.qual LIKE '%auth.uid()%' AND p.qual NOT LIKE '%(select auth.uid())%')
            OR (p.with_check LIKE '%auth.uid()%' AND p.with_check NOT LIKE '%(select auth.uid())%')
        )
        AND p.schemaname = 'public'
        GROUP BY p.tablename
        ORDER BY COUNT(*) DESC, p.tablename
    LOOP
        execution_order := counter;
        table_name := r.tablename;
        optimization_sql := format('-- Optimize %s table (%s policies)', r.tablename, r.policy_count);
        RETURN NEXT;

        -- Generate specific policy optimizations for this table
        FOR r IN
            SELECT
                policyname,
                cmd,
                qual,
                with_check
            FROM pg_policies
            WHERE tablename = table_name
            AND (
                (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(select auth.uid())%')
                OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(select auth.uid())%')
            )
            AND schemaname = 'public'
            ORDER BY policyname
        LOOP
            optimization_sql := format('DROP POLICY IF EXISTS %I ON %I;', r.policyname, table_name);
            RETURN NEXT;

            optimization_sql := format('CREATE POLICY %I ON %I', r.policyname, table_name);

            IF r.cmd IS NOT NULL THEN
                optimization_sql := optimization_sql || format(' FOR %s', r.cmd);
            END IF;

            IF r.qual IS NOT NULL THEN
                optimization_sql := optimization_sql || format(' USING (%s)',
                    replace(r.qual, 'auth.uid()', '(select auth.uid())'));
            END IF;

            IF r.with_check IS NOT NULL THEN
                optimization_sql := optimization_sql || format(' WITH CHECK (%s)',
                    replace(r.with_check, 'auth.uid()', '(select auth.uid())'));
            END IF;

            optimization_sql := optimization_sql || ';';
            RETURN NEXT;
        END LOOP;

        counter := counter + 1;
    END LOOP;

    RETURN;
END;
$$;

-- Step 7: Generate the complete optimization script
SELECT
    '=== COMPLETE OPTIMIZATION SCRIPT ===' as analysis_section;

SELECT * FROM generate_bulk_rls_optimization();

-- Clean up
DROP FUNCTION generate_bulk_rls_optimization();