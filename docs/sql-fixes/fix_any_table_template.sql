-- Universal RLS Fix Template
-- Works for ANY table - just change the table name below

DO $$
DECLARE
    target_table text := 'predictive_models';  -- ⬅️ CHANGE THIS (next: predictive_models, social_posts, etc.)
    user_column text;
    policy_rec RECORD;
    fixed_count INTEGER := 0;
BEGIN
    -- Auto-detect user column name
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = target_table
          AND column_name = 'user_id'
    ) THEN
        user_column := 'user_id';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = target_table
          AND column_name = 'created_by'
    ) THEN
        user_column := 'created_by';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = target_table
          AND column_name = 'owner_id'
    ) THEN
        user_column := 'owner_id';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = target_table
          AND column_name = 'id'
    ) THEN
        user_column := 'id';  -- For tables like profiles
    ELSE
        RAISE NOTICE 'No user column found in % - skipping', target_table;
        RETURN;
    END IF;

    RAISE NOTICE 'Fixing table: % (using column: %)', target_table, user_column;

    -- Drop all existing policies for this table
    FOR policy_rec IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = target_table
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            policy_rec.policyname, target_table);
        RAISE NOTICE '  Dropped: %', policy_rec.policyname;
    END LOOP;

    -- Create standard optimized policies

    -- SELECT policy
    EXECUTE format('
        CREATE POLICY "Users can view their own %s"
        ON public.%I FOR SELECT
        USING (%I = (SELECT auth.uid()))
    ', target_table, target_table, user_column);
    fixed_count := fixed_count + 1;

    -- INSERT policy
    EXECUTE format('
        CREATE POLICY "Users can insert their own %s"
        ON public.%I FOR INSERT
        WITH CHECK (%I = (SELECT auth.uid()))
    ', target_table, target_table, user_column);
    fixed_count := fixed_count + 1;

    -- UPDATE policy
    EXECUTE format('
        CREATE POLICY "Users can update their own %s"
        ON public.%I FOR UPDATE
        USING (%I = (SELECT auth.uid()))
        WITH CHECK (%I = (SELECT auth.uid()))
    ', target_table, target_table, user_column, user_column);
    fixed_count := fixed_count + 1;

    -- DELETE policy
    EXECUTE format('
        CREATE POLICY "Users can delete their own %s"
        ON public.%I FOR DELETE
        USING (%I = (SELECT auth.uid()))
    ', target_table, target_table, user_column);
    fixed_count := fixed_count + 1;

    -- Admin policies
    EXECUTE format('
        CREATE POLICY "Admins can view all %s"
        ON public.%I FOR SELECT
        USING ((SELECT auth.jwt() ->> ''role'') = ''admin'')
    ', target_table, target_table);
    fixed_count := fixed_count + 1;

    RAISE NOTICE '';
    RAISE NOTICE '✓ Successfully created % optimized policies for %', fixed_count, target_table;
    RAISE NOTICE '';

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '';
    RAISE NOTICE '✗ Error fixing %: %', target_table, SQLERRM;
    RAISE NOTICE '';
END $$;

-- Verify
SELECT tablename, COUNT(*) as new_policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'predictive_models'  -- ⬅️ CHANGE THIS to match target_table above
GROUP BY tablename;
