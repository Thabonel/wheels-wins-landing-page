ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin users can view all support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admin users can insert support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admin users can update support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admin users can delete support tickets" ON support_tickets;

CREATE POLICY "Admin users can view all support tickets" ON support_tickets FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.email LIKE '%@wheelsandwins.%' OR
      auth.users.email IN ('barry.tong1@outlook.com', 'admin@wheelsandwins.com') OR
      (auth.users.raw_user_meta_data->>'is_admin')::boolean = true
    )
  )
);

CREATE POLICY "Admin users can insert support tickets" ON support_tickets FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.email LIKE '%@wheelsandwins.%' OR
      auth.users.email IN ('barry.tong1@outlook.com', 'admin@wheelsandwins.com') OR
      (auth.users.raw_user_meta_data->>'is_admin')::boolean = true
    )
  )
);

CREATE POLICY "Admin users can update support tickets" ON support_tickets FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.email LIKE '%@wheelsandwins.%' OR
      auth.users.email IN ('barry.tong1@outlook.com', 'admin@wheelsandwins.com') OR
      (auth.users.raw_user_meta_data->>'is_admin')::boolean = true
    )
  )
);

CREATE POLICY "Admin users can delete support tickets" ON support_tickets FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.email LIKE '%@wheelsandwins.%' OR
      auth.users.email IN ('barry.tong1@outlook.com', 'admin@wheelsandwins.com') OR
      (auth.users.raw_user_meta_data->>'is_admin')::boolean = true
    )
  )
);