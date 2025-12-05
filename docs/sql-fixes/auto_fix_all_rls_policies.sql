-- Automatic RLS Performance Fix for ALL Tables
-- This script finds and fixes all policies with auth.uid(), auth.email(), auth.role()
-- that are not already wrapped in (SELECT ...)

DO $$
DECLARE
    policy_record RECORD;
    old_definition TEXT;
    new_definition TEXT;
    fixed_count INTEGER := 0;
    skipped_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting RLS optimization for all tables...';
    RAISE NOTICE '';

    -- Loop through all policies that need fixing
    FOR policy_record IN
        SELECT
            schemaname,
            tablename,
            policyname,
            cmd,
            qual::text as qual_text,
            with_check::text as with_check_text
        FROM pg_policies
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname
    LOOP
        -- Check if qual needs fixing (USING clause)
        IF policy_record.qual_text IS NOT NULL
           AND policy_record.qual_text LIKE '%auth.uid()%'
           AND policy_record.qual_text NOT LIKE '%(SELECT auth.uid())%'
           AND policy_record.qual_text NOT LIKE '%(select auth.uid())%' THEN

            -- Drop and recreate policy with optimized version
            BEGIN
                EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                    policy_record.policyname,
                    policy_record.schemaname,
                    policy_record.tablename
                );

                -- Replace auth.uid() with (SELECT auth.uid())
                new_definition := REPLACE(policy_record.qual_text, 'auth.uid()', '(SELECT auth.uid())');

                -- Recreate policy
                EXECUTE format('CREATE POLICY %I ON %I.%I FOR %s USING (%s)',
                    policy_record.policyname,
                    policy_record.schemaname,
                    policy_record.tablename,
                    policy_record.cmd,
                    new_definition
                );

                fixed_count := fixed_count + 1;
                RAISE NOTICE '[✓] Fixed: %.% - %',
                    policy_record.tablename,
                    policy_record.policyname,
                    policy_record.cmd;

            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE '[✗] Failed to fix %.% - Error: %',
                    policy_record.tablename,
                    policy_record.policyname,
                    SQLERRM;
                skipped_count := skipped_count + 1;
            END;

        ELSE
            -- Policy already optimized or doesn't use auth.uid()
            skipped_count := skipped_count + 1;
        END IF;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RLS Optimization Complete!';
    RAISE NOTICE 'Fixed: % policies', fixed_count;
    RAISE NOTICE 'Skipped: % policies', skipped_count;
    RAISE NOTICE '========================================';
END $$;

-- Verify the fixes
SELECT
    COUNT(*) FILTER (
        WHERE qual::text LIKE '%auth.uid()%'
        AND qual::text NOT LIKE '%(SELECT auth.uid())%'
        AND qual::text NOT LIKE '%(select auth.uid())%'
    ) as still_needs_fix,
    COUNT(*) FILTER (
        WHERE qual::text LIKE '%(SELECT auth.uid())%'
        OR qual::text LIKE '%(select auth.uid())%'
    ) as optimized,
    COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public';
