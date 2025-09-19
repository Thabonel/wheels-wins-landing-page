DROP POLICY IF EXISTS "Admin users can view all user settings" ON user_settings;
DROP POLICY IF EXISTS "Admin users can insert user settings" ON user_settings;
DROP POLICY IF EXISTS "Admin users can update user settings" ON user_settings;
DROP POLICY IF EXISTS "Admin users can delete user settings" ON user_settings;

CREATE POLICY "Admin users can view all user settings" ON user_settings FOR SELECT
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

CREATE POLICY "Admin users can insert user settings" ON user_settings FOR INSERT
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

CREATE POLICY "Admin users can update user settings" ON user_settings FOR UPDATE
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

CREATE POLICY "Admin users can delete user settings" ON user_settings FOR DELETE
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