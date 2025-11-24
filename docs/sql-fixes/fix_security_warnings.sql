-- Fix Supabase Security Warnings
-- Date: November 25, 2025
-- Addresses: RLS, function search_path, extension schema issues

BEGIN;

-- ============================================================================
-- FIX 1: RLS on Backup Table (ERROR)
-- ============================================================================
-- Option A: Enable RLS on backup table
ALTER TABLE public.affiliate_products_backup_20251124_002016 ENABLE ROW LEVEL SECURITY;

-- Add admin-only policy for backup table
CREATE POLICY "Admin only access to backup"
  ON public.affiliate_products_backup_20251124_002016
  FOR ALL
  USING (public.is_admin());

-- Option B: Delete backup table if not needed (uncomment if preferred)
-- DROP TABLE IF EXISTS public.affiliate_products_backup_20251124_002016;

-- ============================================================================
-- FIX 2: Function Search Path Security (WARN)
-- ============================================================================
-- Recreate functions with search_path set to prevent schema injection attacks

-- Fix: increment_product_clicks
CREATE OR REPLACE FUNCTION public.increment_product_clicks(product_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- SECURITY FIX: Explicit search_path
AS $$
BEGIN
  UPDATE public.affiliate_products
  SET click_count = click_count + 1
  WHERE id = product_uuid;
END;
$$;

-- Fix: update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- SECURITY FIX: Explicit search_path
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix: is_admin (critical security function)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- SECURITY FIX: Explicit search_path
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$;

-- Ensure permissions are maintained
GRANT EXECUTE ON FUNCTION public.increment_product_clicks(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================================================
-- FIX 3: Extensions in Public Schema (WARN)
-- ============================================================================
-- Move extensions to extensions schema (requires superuser or admin privileges)
-- Note: This may require manual execution by Supabase admin if permissions are restricted

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move pg_trgm extension
-- Note: This command may fail if you don't have sufficient privileges
-- In that case, contact Supabase support or leave in public schema (low risk)
DO $$
BEGIN
  EXECUTE 'ALTER EXTENSION pg_trgm SET SCHEMA extensions';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Cannot move pg_trgm extension - insufficient privileges. This is a low-risk warning.';
  WHEN OTHERS THEN
    RAISE NOTICE 'Error moving pg_trgm extension: %', SQLERRM;
END;
$$;

-- Move btree_gin extension
DO $$
BEGIN
  EXECUTE 'ALTER EXTENSION btree_gin SET SCHEMA extensions';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Cannot move btree_gin extension - insufficient privileges. This is a low-risk warning.';
  WHEN OTHERS THEN
    RAISE NOTICE 'Error moving btree_gin extension: %', SQLERRM;
END;
$$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify RLS is enabled on backup table
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename LIKE '%affiliate_products_backup%'
  AND schemaname = 'public';

-- Verify functions have search_path set
SELECT
  routine_name,
  routine_schema,
  CASE
    WHEN prosrc LIKE '%SET search_path%' THEN 'FIXED ✓'
    ELSE 'MISSING ✗'
  END as search_path_status
FROM information_schema.routines
JOIN pg_proc ON proname = routine_name
WHERE routine_schema = 'public'
  AND routine_name IN ('increment_product_clicks', 'update_updated_at_column', 'is_admin')
ORDER BY routine_name;

-- Check extension schemas
SELECT
  extname as extension_name,
  nspname as schema_name,
  CASE
    WHEN nspname = 'extensions' THEN 'FIXED ✓'
    WHEN nspname = 'public' THEN 'STILL IN PUBLIC ⚠'
    ELSE nspname
  END as status
FROM pg_extension
JOIN pg_namespace ON pg_extension.extnamespace = pg_namespace.oid
WHERE extname IN ('pg_trgm', 'btree_gin')
ORDER BY extname;

COMMIT;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. RLS on backup table: Fixed (enabled + policy)
-- 2. Function search_path: Fixed (all 3 functions secured)
-- 3. Extensions in public: Attempted fix (may need Supabase admin)
-- 4. Postgres version upgrade: Requires Supabase platform action
--    (Go to Settings > Infrastructure > Upgrade Database)
