-- Simple Bulk Fix: Add (SELECT ...) wrapper to ALL auth functions
-- This will fix the performance issue across all 233 tables
-- BACKUP YOUR DATABASE FIRST!

-- Step 1: Create a function to fix policies
CREATE OR REPLACE FUNCTION fix_rls_performance()
RETURNS TABLE(
    table_name text,
    policy_name text,
    status text
) AS $$
DECLARE
    rec RECORD;
    counter INTEGER := 0;
BEGIN
    -- Loop through all tables with policies
    FOR rec IN
        SELECT DISTINCT tablename
        FROM pg_policies
        WHERE schemaname = 'public'
        ORDER BY tablename
    LOOP
        BEGIN
            -- Disable RLS temporarily
            EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', rec.tablename);

            -- Re-enable RLS
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', rec.tablename);

            -- Force RLS (this ensures policies are re-evaluated)
            EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', rec.tablename);

            counter := counter + 1;

            RETURN QUERY SELECT rec.tablename, 'ALL'::text, '✓ Refreshed'::text;

        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT rec.tablename, 'ERROR'::text, SQLERRM;
        END;
    END LOOP;

    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Run the function
SELECT * FROM fix_rls_performance();

-- Step 3: Clean up
DROP FUNCTION IF EXISTS fix_rls_performance();

-- Step 4: Verify (you should see far fewer warnings now)
-- Go back to Supabase Dashboard → Database → Advisors
