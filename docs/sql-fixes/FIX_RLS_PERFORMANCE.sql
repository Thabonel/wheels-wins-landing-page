-- ============================================================================
-- FIX RLS POLICY PERFORMANCE WARNINGS
-- ============================================================================
-- Problem: auth.uid(), auth.jwt(), auth.role() are re-evaluated for every row
-- Solution: Wrap in subqueries: auth.uid() -> (select auth.uid())
--
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================================

DO $$
DECLARE
  pol record;
  drop_stmt text;
  create_stmt text;
  fixed_qual text;
  fixed_with_check text;
  cmd text;
  policies_fixed int := 0;
  policies_skipped int := 0;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Starting RLS Policy Performance Fix';
  RAISE NOTICE '============================================';

  FOR pol IN
    SELECT
      n.nspname as schemaname,
      c.relname as tablename,
      p.polname as policyname,
      p.polcmd as polcmd,
      p.polpermissive as permissive,
      pg_get_expr(p.polqual, p.polrelid) as qual,
      pg_get_expr(p.polwithcheck, p.polrelid) as with_check,
      ARRAY(
        SELECT rolname FROM pg_roles WHERE oid = ANY(p.polroles)
      ) as roles
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND (
        -- Has auth functions that need fixing
        (pg_get_expr(p.polqual, p.polrelid) ~ 'auth\.(uid|jwt|role)\(\)')
        OR (pg_get_expr(p.polwithcheck, p.polrelid) ~ 'auth\.(uid|jwt|role)\(\)')
      )
    ORDER BY c.relname, p.polname
  LOOP
    -- Skip if already fixed (contains "(select auth." or "( select auth.")
    IF (pol.qual IS NOT NULL AND (pol.qual ~* '\(\s*select\s+auth\.')) OR
       (pol.with_check IS NOT NULL AND (pol.with_check ~* '\(\s*select\s+auth\.')) THEN
      policies_skipped := policies_skipped + 1;
      CONTINUE;
    END IF;

    -- Fix the expressions by replacing auth.X() with (select auth.X())
    fixed_qual := pol.qual;
    fixed_with_check := pol.with_check;

    IF fixed_qual IS NOT NULL THEN
      fixed_qual := regexp_replace(fixed_qual, 'auth\.uid\(\)', '(select auth.uid())', 'gi');
      fixed_qual := regexp_replace(fixed_qual, 'auth\.jwt\(\)', '(select auth.jwt())', 'gi');
      fixed_qual := regexp_replace(fixed_qual, 'auth\.role\(\)', '(select auth.role())', 'gi');
    END IF;

    IF fixed_with_check IS NOT NULL THEN
      fixed_with_check := regexp_replace(fixed_with_check, 'auth\.uid\(\)', '(select auth.uid())', 'gi');
      fixed_with_check := regexp_replace(fixed_with_check, 'auth\.jwt\(\)', '(select auth.jwt())', 'gi');
      fixed_with_check := regexp_replace(fixed_with_check, 'auth\.role\(\)', '(select auth.role())', 'gi');
    END IF;

    -- Build DROP statement
    drop_stmt := format('DROP POLICY IF EXISTS %I ON %I.%I',
      pol.policyname, pol.schemaname, pol.tablename);

    -- Determine command type
    cmd := CASE pol.polcmd
      WHEN 'r' THEN 'SELECT'
      WHEN 'a' THEN 'INSERT'
      WHEN 'w' THEN 'UPDATE'
      WHEN 'd' THEN 'DELETE'
      WHEN '*' THEN 'ALL'
    END;

    -- Build CREATE statement
    create_stmt := format('CREATE POLICY %I ON %I.%I AS %s FOR %s',
      pol.policyname,
      pol.schemaname,
      pol.tablename,
      CASE WHEN pol.permissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
      cmd
    );

    -- Add TO clause if specific roles (not default public)
    IF array_length(pol.roles, 1) > 0 AND pol.roles[1] IS NOT NULL THEN
      create_stmt := create_stmt || ' TO ' || array_to_string(pol.roles, ', ');
    END IF;

    -- Add USING clause
    IF fixed_qual IS NOT NULL THEN
      create_stmt := create_stmt || ' USING (' || fixed_qual || ')';
    END IF;

    -- Add WITH CHECK clause
    IF fixed_with_check IS NOT NULL THEN
      create_stmt := create_stmt || ' WITH CHECK (' || fixed_with_check || ')';
    END IF;

    -- Execute the statements
    BEGIN
      EXECUTE drop_stmt;
      EXECUTE create_stmt;
      policies_fixed := policies_fixed + 1;

      IF policies_fixed <= 50 OR policies_fixed % 100 = 0 THEN
        RAISE NOTICE 'Fixed #%: %.%', policies_fixed, pol.tablename, pol.policyname;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'FAILED: %.% - %: %',
        pol.schemaname, pol.tablename, pol.policyname, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'COMPLETE!';
  RAISE NOTICE 'Policies fixed: %', policies_fixed;
  RAISE NOTICE 'Policies skipped (already fixed): %', policies_skipped;
  RAISE NOTICE '============================================';
END $$;

-- Verify: Count remaining unfixed policies
SELECT
  'Policies still needing fix' as status,
  count(*) as count
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND (
    pg_get_expr(p.polqual, p.polrelid) ~ 'auth\.(uid|jwt|role)\(\)'
    OR pg_get_expr(p.polwithcheck, p.polrelid) ~ 'auth\.(uid|jwt|role)\(\)'
  )
  AND NOT (
    pg_get_expr(p.polqual, p.polrelid) ~* '\(\s*select\s+auth\.'
    OR pg_get_expr(p.polwithcheck, p.polrelid) ~* '\(\s*select\s+auth\.'
  );

-- Show sample of fixed policies
SELECT
  tablename,
  policyname,
  LEFT(qual, 80) as qual_preview
FROM pg_policies
WHERE schemaname = 'public'
  AND qual LIKE '%select auth.%'
LIMIT 10;
