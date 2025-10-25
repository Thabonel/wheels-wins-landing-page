DROP POLICY IF EXISTS "Users can create their own support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can view their own support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can view all support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can update support tickets" ON support_tickets;

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own support tickets"
ON support_tickets
FOR INSERT
TO authenticated, anon
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own support tickets"
ON support_tickets
FOR SELECT
TO authenticated, anon
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all support tickets"
ON support_tickets
FOR SELECT
TO authenticated, anon
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can update support tickets"
ON support_tickets
FOR UPDATE
TO authenticated, anon
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
