-- ============================================================================
-- FIX DUPLICATE RLS POLICIES
-- ============================================================================
-- Problem: Tables have duplicate permissive policies for same operations
-- Solution: Remove snake_case duplicates, keep human-readable policies
-- ============================================================================

DO $$
DECLARE
  pol record;
  policies_dropped int := 0;
BEGIN
  RAISE NOTICE 'Starting duplicate policy cleanup...';

  -- Find and drop snake_case policies where a human-readable equivalent exists
  FOR pol IN
    SELECT p1.schemaname, p1.tablename, p1.policyname, p1.cmd
    FROM pg_policies p1
    WHERE p1.schemaname = 'public'
      -- Snake_case pattern policies
      AND p1.policyname ~ '^(delete_own_|select_own_|update_own_|insert_)[a-z_]+$'
      -- Has a duplicate human-readable policy for same command
      AND EXISTS (
        SELECT 1 FROM pg_policies p2
        WHERE p2.schemaname = p1.schemaname
          AND p2.tablename = p1.tablename
          AND p2.cmd = p1.cmd
          AND p2.policyname LIKE 'Users can %'
      )
    ORDER BY p1.tablename
  LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
        pol.policyname, pol.schemaname, pol.tablename);
      policies_dropped := policies_dropped + 1;

      IF policies_dropped <= 50 OR policies_dropped % 100 = 0 THEN
        RAISE NOTICE 'Dropped #%: %.%', policies_dropped, pol.tablename, pol.policyname;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed: %.% - %', pol.tablename, pol.policyname, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '--------------------------------------------';
  RAISE NOTICE 'Phase 1 complete: % snake_case policies dropped', policies_dropped;

  -- Phase 2: Remove ALL policies where specific CRUD policies exist
  FOR pol IN
    SELECT p1.schemaname, p1.tablename, p1.policyname
    FROM pg_policies p1
    WHERE p1.schemaname = 'public'
      AND p1.cmd = 'ALL'
      -- Has at least 2 specific CRUD policies
      AND (
        SELECT count(DISTINCT cmd) FROM pg_policies p2
        WHERE p2.schemaname = p1.schemaname
          AND p2.tablename = p1.tablename
          AND p2.cmd IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
      ) >= 2
    ORDER BY p1.tablename
  LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
        pol.policyname, pol.schemaname, pol.tablename);
      policies_dropped := policies_dropped + 1;
      RAISE NOTICE 'Dropped ALL: %.%', pol.tablename, pol.policyname;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed: %.% - %', pol.tablename, pol.policyname, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'COMPLETE! Total policies dropped: %', policies_dropped;
  RAISE NOTICE '============================================';
END $$;

-- Show remaining duplicates
SELECT tablename, cmd, count(*) as duplicates
FROM pg_policies
WHERE schemaname = 'public' AND permissive = 'PERMISSIVE'
GROUP BY tablename, cmd
HAVING count(*) > 1
ORDER BY count(*) DESC
LIMIT 20;
