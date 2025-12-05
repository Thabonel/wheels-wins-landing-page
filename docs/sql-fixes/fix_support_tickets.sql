-- Fix RLS Performance for support_tickets table
-- This will optimize all 14 policies

DO $$
DECLARE
    user_column text;
BEGIN
    -- First, check which column stores the user ID
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'support_tickets'
          AND column_name = 'user_id'
    ) THEN
        user_column := 'user_id';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'support_tickets'
          AND column_name = 'created_by'
    ) THEN
        user_column := 'created_by';
    ELSE
        RAISE EXCEPTION 'Cannot find user column in support_tickets table';
    END IF;

    RAISE NOTICE 'Using column: %', user_column;

    -- Drop all existing policies
    DROP POLICY IF EXISTS "Enable read access for authenticated users" ON support_tickets;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON support_tickets;
    DROP POLICY IF EXISTS "Enable update for users based on user_id" ON support_tickets;
    DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON support_tickets;
    DROP POLICY IF EXISTS "Users can view their own tickets" ON support_tickets;
    DROP POLICY IF EXISTS "Users can create their own tickets" ON support_tickets;
    DROP POLICY IF EXISTS "Users can update their own tickets" ON support_tickets;
    DROP POLICY IF EXISTS "Users can delete their own tickets" ON support_tickets;
    DROP POLICY IF EXISTS "Admins can view all tickets" ON support_tickets;
    DROP POLICY IF EXISTS "Admins can update all tickets" ON support_tickets;
    DROP POLICY IF EXISTS "Admins can delete all tickets" ON support_tickets;
    DROP POLICY IF EXISTS "Support staff can view all tickets" ON support_tickets;
    DROP POLICY IF EXISTS "Support staff can update all tickets" ON support_tickets;
    DROP POLICY IF EXISTS "Enable all for service role" ON support_tickets;

    -- Create optimized policies

    -- Users can view their own tickets
    EXECUTE format('
        CREATE POLICY "Users can view their own tickets"
        ON support_tickets FOR SELECT
        USING (%I = (SELECT auth.uid()))
    ', user_column);

    -- Users can create tickets
    EXECUTE format('
        CREATE POLICY "Users can create tickets"
        ON support_tickets FOR INSERT
        WITH CHECK (%I = (SELECT auth.uid()))
    ', user_column);

    -- Users can update their own tickets
    EXECUTE format('
        CREATE POLICY "Users can update their own tickets"
        ON support_tickets FOR UPDATE
        USING (%I = (SELECT auth.uid()))
        WITH CHECK (%I = (SELECT auth.uid()))
    ', user_column, user_column);

    -- Users can delete their own tickets (optional, might want to disable)
    EXECUTE format('
        CREATE POLICY "Users can delete their own tickets"
        ON support_tickets FOR DELETE
        USING (%I = (SELECT auth.uid()))
    ', user_column);

    -- Admins can view all tickets
    CREATE POLICY "Admins can view all tickets"
    ON support_tickets FOR SELECT
    USING (
        (SELECT auth.jwt() ->> 'role') = 'admin'
        OR (SELECT auth.jwt() ->> 'role') = 'service_role'
    );

    -- Admins can update all tickets
    CREATE POLICY "Admins can update all tickets"
    ON support_tickets FOR UPDATE
    USING (
        (SELECT auth.jwt() ->> 'role') = 'admin'
        OR (SELECT auth.jwt() ->> 'role') = 'service_role'
    );

    -- Admins can delete all tickets
    CREATE POLICY "Admins can delete all tickets"
    ON support_tickets FOR DELETE
    USING (
        (SELECT auth.jwt() ->> 'role') = 'admin'
        OR (SELECT auth.jwt() ->> 'role') = 'service_role'
    );

    RAISE NOTICE '✓ Successfully optimized all RLS policies for support_tickets';
END $$;

-- Verify the fix
SELECT
    policyname,
    cmd,
    'optimized' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'support_tickets'
ORDER BY cmd, policyname;
