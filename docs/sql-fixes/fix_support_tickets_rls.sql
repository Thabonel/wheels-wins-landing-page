-- First, check if user_id column is TEXT or UUID
DO $$
DECLARE
    column_type TEXT;
BEGIN
    SELECT data_type INTO column_type
    FROM information_schema.columns
    WHERE table_name = 'support_tickets' AND column_name = 'user_id';

    -- If user_id is TEXT, convert it to UUID
    IF column_type = 'text' THEN
        ALTER TABLE support_tickets ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
        RAISE NOTICE 'Converted user_id from TEXT to UUID';
    END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create their own support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can view their own support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can view all support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can update support tickets" ON support_tickets;

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Create policies with UUID comparison
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
