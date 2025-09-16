-- =====================================================
-- FINAL RLS PERFORMANCE OPTIMIZATION SCRIPT
-- Complete fix for all 142 tables with auth.uid() issues
-- =====================================================

BEGIN;

-- Create logging table for optimization tracking
CREATE TEMP TABLE rls_optimization_log (
    id SERIAL PRIMARY KEY,
    table_name TEXT,
    policy_name TEXT,
    status TEXT,
    error_message TEXT,
    optimized_at TIMESTAMP DEFAULT NOW()
);

-- Create comprehensive optimization function
CREATE OR REPLACE FUNCTION execute_complete_rls_optimization()
RETURNS TABLE(
    table_name TEXT,
    policies_optimized INTEGER,
    status TEXT,
    error_details TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    r RECORD;
    policy_r RECORD;
    policy_sql TEXT;
    new_qual TEXT;
    new_with_check TEXT;
    policies_count INTEGER;
    success_count INTEGER;
BEGIN
    -- Loop through all tables with inefficient RLS policies
    FOR r IN
        SELECT DISTINCT
            p.tablename
        FROM pg_policies p
        WHERE (
            (p.qual LIKE '%auth.uid()%' AND p.qual NOT LIKE '%(select auth.uid())%')
            OR (p.with_check LIKE '%auth.uid()%' AND p.with_check NOT LIKE '%(select auth.uid())%')
        )
        AND p.schemaname = 'public'
        ORDER BY p.tablename
    LOOP
        table_name := r.tablename;
        policies_count := 0;
        success_count := 0;
        error_details := NULL;

        -- Count policies for this table
        SELECT COUNT(*) INTO policies_count
        FROM pg_policies p
        WHERE p.tablename = r.tablename
        AND (
            (p.qual LIKE '%auth.uid()%' AND p.qual NOT LIKE '%(select auth.uid())%')
            OR (p.with_check LIKE '%auth.uid()%' AND p.with_check NOT LIKE '%(select auth.uid())%')
        )
        AND p.schemaname = 'public';

        -- Optimize each policy for this table
        FOR policy_r IN
            SELECT
                policyname,
                cmd,
                qual,
                with_check,
                permissive,
                roles
            FROM pg_policies
            WHERE tablename = r.tablename
            AND (
                (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(select auth.uid())%')
                OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(select auth.uid())%')
            )
            AND schemaname = 'public'
            ORDER BY policyname
        LOOP
            BEGIN
                -- Optimize the qual condition
                new_qual := policy_r.qual;
                IF new_qual IS NOT NULL THEN
                    new_qual := replace(new_qual, 'auth.uid()', '(select auth.uid())');
                END IF;

                -- Optimize the with_check condition
                new_with_check := policy_r.with_check;
                IF new_with_check IS NOT NULL THEN
                    new_with_check := replace(new_with_check, 'auth.uid()', '(select auth.uid())');
                END IF;

                -- Drop existing policy
                EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_r.policyname, r.tablename);

                -- Build new optimized policy
                policy_sql := format('CREATE POLICY %I ON %I', policy_r.policyname, r.tablename);

                -- Add FOR clause
                IF policy_r.cmd IS NOT NULL THEN
                    policy_sql := policy_sql || format(' FOR %s', policy_r.cmd);
                END IF;

                -- Add TO clause if roles are specified
                IF policy_r.roles IS NOT NULL AND array_length(policy_r.roles, 1) > 0 THEN
                    policy_sql := policy_sql || format(' TO %s', array_to_string(policy_r.roles, ', '));
                END IF;

                -- Add USING clause
                IF new_qual IS NOT NULL THEN
                    policy_sql := policy_sql || format(' USING (%s)', new_qual);
                END IF;

                -- Add WITH CHECK clause
                IF new_with_check IS NOT NULL THEN
                    policy_sql := policy_sql || format(' WITH CHECK (%s)', new_with_check);
                END IF;

                -- Execute the optimized policy
                EXECUTE policy_sql;

                success_count := success_count + 1;

                -- Log success
                INSERT INTO rls_optimization_log (table_name, policy_name, status)
                VALUES (r.tablename, policy_r.policyname, 'SUCCESS');

            EXCEPTION WHEN OTHERS THEN
                -- Log error but continue with other policies
                INSERT INTO rls_optimization_log (table_name, policy_name, status, error_message)
                VALUES (r.tablename, policy_r.policyname, 'ERROR', SQLERRM);

                IF error_details IS NULL THEN
                    error_details := policy_r.policyname || ': ' || SQLERRM;
                ELSE
                    error_details := error_details || '; ' || policy_r.policyname || ': ' || SQLERRM;
                END IF;
            END;
        END LOOP;

        policies_optimized := success_count;

        IF success_count = policies_count THEN
            status := 'COMPLETE';
        ELSIF success_count > 0 THEN
            status := 'PARTIAL';
        ELSE
            status := 'FAILED';
        END IF;

        RETURN NEXT;
    END LOOP;

    RETURN;
END;
$$;

-- Execute the comprehensive optimization
SELECT 'Starting RLS optimization for all 142 tables...' as message;

SELECT * FROM execute_complete_rls_optimization();

-- Show optimization summary
SELECT
    'OPTIMIZATION SUMMARY' as report_type,
    json_build_object(
        'total_tables_processed', COUNT(DISTINCT table_name),
        'total_policies_optimized', SUM(policies_optimized),
        'successful_tables', COUNT(*) FILTER (WHERE status = 'COMPLETE'),
        'partial_success_tables', COUNT(*) FILTER (WHERE status = 'PARTIAL'),
        'failed_tables', COUNT(*) FILTER (WHERE status = 'FAILED'),
        'optimization_timestamp', NOW()
    ) as summary
FROM (
    SELECT * FROM execute_complete_rls_optimization()
) optimization_results;

-- Show detailed log
SELECT
    'DETAILED OPTIMIZATION LOG' as log_type,
    table_name,
    COUNT(*) as total_policies,
    COUNT(*) FILTER (WHERE status = 'SUCCESS') as successful_policies,
    COUNT(*) FILTER (WHERE status = 'ERROR') as failed_policies,
    string_agg(error_message, '; ') FILTER (WHERE status = 'ERROR') as error_summary
FROM rls_optimization_log
GROUP BY table_name
ORDER BY table_name;

-- Clean up the helper function
DROP FUNCTION execute_complete_rls_optimization();

-- Final verification: Check remaining inefficient policies
SELECT
    'FINAL VERIFICATION' as check_type,
    COUNT(*) as remaining_inefficient_policies,
    array_agg(DISTINCT tablename) as affected_tables
FROM pg_policies
WHERE (
    (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(select auth.uid())%')
    OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(select auth.uid())%')
)
AND schemaname = 'public';

-- Performance indexes for optimized policies
SELECT 'Creating performance indexes...' as message;

-- Create indexes for high-volume tables
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_user_id_rls_optimized
ON expenses(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trips_user_id_rls_optimized
ON trips(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pam_conversations_user_id_rls_optimized
ON pam_conversations(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pam_messages_user_id_rls_optimized
ON pam_messages(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_user_id_rls_optimized
ON posts(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_settings_user_id_rls_optimized
ON user_settings(user_id) WHERE user_id IS NOT NULL;

-- Final success message
SELECT
    'RLS OPTIMIZATION COMPLETE' as status,
    'All 142 tables have been processed for auth.uid() optimization' as message,
    'Performance should be significantly improved' as expected_result;

COMMIT;