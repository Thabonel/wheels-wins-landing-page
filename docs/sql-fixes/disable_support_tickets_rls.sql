-- Disable RLS on support_tickets table entirely
-- Backend uses service role key which bypasses RLS anyway

ALTER TABLE support_tickets DISABLE ROW LEVEL SECURITY;
