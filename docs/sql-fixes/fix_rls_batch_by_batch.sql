-- Batch Fix: RLS Performance Optimization
-- Run this multiple times, fixing 10 tables at a time
-- Safer than trying to fix all 233 tables at once

-- STEP 1: See which tables still need fixing (run first)
SELECT
    tablename,
    COUNT(*) as policies_to_fix
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY policies_to_fix DESC
LIMIT 10;

-- STEP 2: Fix the top table from the list above
-- Replace 'TABLE_NAME_HERE' with the first table from STEP 1

-- Example: If 'support_tickets' is first, use it here:
DO $$
DECLARE
    target_table text := 'support_tickets';  -- ⬅️ CHANGE THIS to table from STEP 1
    policy_rec RECORD;
    fixed INTEGER := 0;
BEGIN
    RAISE NOTICE 'Fixing table: %', target_table;

    -- Get all policies for this table
    FOR policy_rec IN
        SELECT policyname, cmd
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = target_table
    LOOP
        BEGIN
            -- Drop existing policy
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
                policy_rec.policyname, target_table);

            -- Create optimized version
            -- Note: This is a simplified version - adjust based on your actual policy logic
            CASE policy_rec.cmd
                WHEN 'SELECT' THEN
                    EXECUTE format(
                        'CREATE POLICY %I ON public.%I FOR SELECT USING (user_id = (SELECT auth.uid()))',
                        policy_rec.policyname, target_table
                    );
                WHEN 'INSERT' THEN
                    EXECUTE format(
                        'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()))',
                        policy_rec.policyname, target_table
                    );
                WHEN 'UPDATE' THEN
                    EXECUTE format(
                        'CREATE POLICY %I ON public.%I FOR UPDATE USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()))',
                        policy_rec.policyname, target_table
                    );
                WHEN 'DELETE' THEN
                    EXECUTE format(
                        'CREATE POLICY %I ON public.%I FOR DELETE USING (user_id = (SELECT auth.uid()))',
                        policy_rec.policyname, target_table
                    );
            END CASE;

            fixed := fixed + 1;
            RAISE NOTICE '  ✓ Fixed: %', policy_rec.policyname;

        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '  ✗ Error fixing %: %', policy_rec.policyname, SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE 'Done! Fixed % policies for table %', fixed, target_table;
END $$;

-- STEP 3: Repeat STEP 2 for each table in your list
-- Change the target_table value and run again
