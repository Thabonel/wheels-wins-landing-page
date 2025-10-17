SET ROLE authenticated;
SET request.jwt.claims.sub TO '21a2151a-cd37-41d5-a1c7-124bb05e7a6a';
SELECT id, title, start_date, user_id FROM calendar_events LIMIT 5;
RESET ROLE;
