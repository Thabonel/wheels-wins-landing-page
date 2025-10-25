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
DROP POLICY IF EXISTS service_role_all_support_tickets ON support_tickets;
DROP POLICY IF EXISTS authenticated_insert_support_tickets ON support_tickets;
DROP POLICY IF EXISTS authenticated_select_own_support_tickets ON support_tickets;

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Service role has full access (backend API uses this)
CREATE POLICY "service_role_all_support_tickets"
ON support_tickets
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Authenticated users can insert tickets
CREATE POLICY "authenticated_insert_support_tickets"
ON support_tickets
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Authenticated users can view their own tickets
-- user_id is TEXT, so convert auth.uid() to TEXT
CREATE POLICY "authenticated_select_own_support_tickets"
ON support_tickets
FOR SELECT
TO authenticated
USING (user_id = auth.uid()::text);
