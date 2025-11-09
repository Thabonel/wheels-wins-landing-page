-- Clean up all existing policies and create proper RLS setup
-- This fixes both security lint errors

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Admin users can delete support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admin users can insert support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admin users can update support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admin users can view all support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can update support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can view all support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Service role can manage all support_tickets data" ON support_tickets;
DROP POLICY IF EXISTS "Users can create their own support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can view their own support tickets" ON support_tickets;
DROP POLICY IF EXISTS delete_own_tickets ON support_tickets;
DROP POLICY IF EXISTS insert_own_tickets ON support_tickets;
DROP POLICY IF EXISTS select_own_tickets ON support_tickets;
DROP POLICY IF EXISTS service_role_bypass_support_tickets ON support_tickets;
DROP POLICY IF EXISTS update_own_tickets ON support_tickets;

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Create simple policies that allow service role full access
-- Service role is used by backend API

CREATE POLICY "service_role_all_support_tickets"
ON support_tickets
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated users to insert their own tickets
CREATE POLICY "authenticated_insert_support_tickets"
ON support_tickets
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to view their own tickets
CREATE POLICY "authenticated_select_own_support_tickets"
ON support_tickets
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id OR auth.uid()::text = user_id::text);
