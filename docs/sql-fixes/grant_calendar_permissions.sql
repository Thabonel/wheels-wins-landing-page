ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON calendar_events TO anon;
GRANT SELECT ON calendar_events TO authenticated;
GRANT INSERT ON calendar_events TO authenticated;
GRANT UPDATE ON calendar_events TO authenticated;
GRANT DELETE ON calendar_events TO authenticated;
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name='calendar_events'
ORDER BY grantee, privilege_type;
