GRANT USAGE ON SCHEMA public TO admin;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO admin;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO admin;

SELECT
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.table_privileges
WHERE grantee = 'admin'
  AND table_schema = 'public'
  AND table_name IN ('medical_records', 'medical_medications', 'medical_emergency_info', 'profiles', 'expenses', 'budgets')
ORDER BY table_name, privilege_type;
