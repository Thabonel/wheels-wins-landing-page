GRANT USAGE ON SCHEMA auth TO admin;

GRANT SELECT ON auth.users TO admin;

SELECT
  grantee, table_schema, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'admin' AND table_schema = 'auth';
