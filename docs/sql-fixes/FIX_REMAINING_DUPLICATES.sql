-- ============================================================================
-- FINAL SWEEP - Remove ALL remaining duplicate policies
-- ============================================================================
-- Generic approach: For each table/cmd with >1 policy, keep first alphabetically
-- ============================================================================

DO $$
DECLARE
  dup record;
  pol record;
  first_kept boolean;
  total_dropped int := 0;
BEGIN
  RAISE NOTICE 'Starting final duplicate policy cleanup...';

  -- Find all table/cmd combinations with duplicates
  FOR dup IN
    SELECT tablename, cmd, count(*) as cnt
    FROM pg_policies
    WHERE schemaname = 'public' AND permissive = 'PERMISSIVE'
    GROUP BY tablename, cmd
    HAVING count(*) > 1
    ORDER BY tablename, cmd
  LOOP
    first_kept := false;

    -- For each duplicate set, keep first policy (alphabetically), drop rest
    FOR pol IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = dup.tablename
        AND cmd = dup.cmd
      ORDER BY policyname
    LOOP
      IF NOT first_kept THEN
        first_kept := true;
        RAISE NOTICE 'KEEP: %.% [%]', dup.tablename, pol.policyname, dup.cmd;
      ELSE
        BEGIN
          EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, dup.tablename);
          total_dropped := total_dropped + 1;
          RAISE NOTICE 'DROP: %.% [%]', dup.tablename, pol.policyname, dup.cmd;
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING 'Failed to drop %.%: %', dup.tablename, pol.policyname, SQLERRM;
        END;
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'COMPLETE! Dropped % duplicate policies', total_dropped;
  RAISE NOTICE '============================================';
END $$;

-- Verify: Should return empty if all duplicates removed
SELECT tablename, cmd, count(*) as remaining_duplicates
FROM pg_policies
WHERE schemaname = 'public' AND permissive = 'PERMISSIVE'
GROUP BY tablename, cmd
HAVING count(*) > 1
ORDER BY count(*) DESC;
