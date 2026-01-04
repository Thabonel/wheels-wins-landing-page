DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin') THEN
    CREATE ROLE admin NOLOGIN;
    RAISE NOTICE 'Created admin role';
  ELSE
    RAISE NOTICE 'Admin role already exists';
  END IF;
END $$;

GRANT USAGE ON SCHEMA storage TO admin;

GRANT ALL ON storage.objects TO admin;
GRANT ALL ON storage.buckets TO admin;

GRANT authenticated TO admin;

SELECT
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.table_privileges
WHERE grantee IN ('admin', 'authenticated')
  AND table_schema = 'storage'
  AND table_name IN ('objects', 'buckets')
ORDER BY grantee, table_name, privilege_type;
