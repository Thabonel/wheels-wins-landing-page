-- Fix storage schema search_path issue
-- Problem: Storage API can't find storage.objects because storage schema is not in search_path
-- Solution: Add storage schema to search_path for authenticated, anon, and service_role

-- Add storage schema to search_path for authenticated role
ALTER ROLE authenticated SET search_path TO public, storage, extensions;

-- Add storage schema to search_path for anon role
ALTER ROLE anon SET search_path TO public, storage, extensions;

-- Add storage schema to search_path for service_role (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'ALTER ROLE service_role SET search_path TO public, storage, extensions';
  END IF;
END $$;

-- Verify the changes
SELECT
  rolname,
  rolconfig
FROM pg_roles
WHERE rolname IN ('authenticated', 'anon', 'service_role', 'postgres')
ORDER BY rolname;
