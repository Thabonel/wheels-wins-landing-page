-- Fix RLS policies for support_tickets table
-- Allow authenticated users to create and view their own tickets

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can create their own support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can view their own support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can view all support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can update support tickets" ON support_tickets;

-- Enable RLS on support_tickets table
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can create their own tickets
CREATE POLICY "Users can create their own support tickets"
ON support_tickets
FOR INSERT
TO authenticated, anon
WITH CHECK (user_id = auth.uid()::text);

-- Policy: Users can view their own tickets
CREATE POLICY "Users can view their own support tickets"
ON support_tickets
FOR SELECT
TO authenticated, anon
USING (user_id = auth.uid()::text);

-- Policy: Admins can view all tickets
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

-- Policy: Admins can update all tickets
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
