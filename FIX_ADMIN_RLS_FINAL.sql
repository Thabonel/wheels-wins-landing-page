-- Fix: Add admin role to RLS policies
-- Your JWT shows role="admin", so we need to check for that too!

-- First, let's see all users (to find your email)
SELECT id, email, role, raw_user_meta_data->>'is_admin' as is_admin_flag
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- After you see your email above, we'll update the policies to include:
-- 1. Users with role='admin' in their JWT
-- 2. The existing email/metadata checks

-- Drop existing policies
DROP POLICY IF EXISTS "Admin users can view all content moderation" ON public.content_moderation;
DROP POLICY IF EXISTS "Admin users can insert content moderation" ON public.content_moderation;
DROP POLICY IF EXISTS "Admin users can update content moderation" ON public.content_moderation;
DROP POLICY IF EXISTS "Admin users can delete content moderation" ON public.content_moderation;

-- NEW POLICY: Check JWT role OR email OR metadata
CREATE POLICY "Admin users can view all content moderation"
ON public.content_moderation FOR SELECT
USING (
  -- Allow if JWT role is 'admin' OR email matches OR metadata has is_admin
  (
    -- Check if current user's JWT role is 'admin' or 'service_role'
    (current_setting('request.jwt.claims', true)::json->>'role')::text IN ('admin', 'service_role')
  ) OR (
    -- Existing checks: email domain or explicit emails or metadata flag
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.email LIKE '%@wheelsandwins.%' OR
        auth.users.email IN ('barry.tong1@outlook.com', 'admin@wheelsandwins.com') OR
        (auth.users.raw_user_meta_data->>'is_admin')::boolean = true
      )
    )
  )
);

CREATE POLICY "Admin users can insert content moderation"
ON public.content_moderation FOR INSERT
WITH CHECK (
  (
    (current_setting('request.jwt.claims', true)::json->>'role')::text IN ('admin', 'service_role')
  ) OR (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.email LIKE '%@wheelsandwins.%' OR
        auth.users.email IN ('barry.tong1@outlook.com', 'admin@wheelsandwins.com') OR
        (auth.users.raw_user_meta_data->>'is_admin')::boolean = true
      )
    )
  )
);

CREATE POLICY "Admin users can update content moderation"
ON public.content_moderation FOR UPDATE
USING (
  (
    (current_setting('request.jwt.claims', true)::json->>'role')::text IN ('admin', 'service_role')
  ) OR (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.email LIKE '%@wheelsandwins.%' OR
        auth.users.email IN ('barry.tong1@outlook.com', 'admin@wheelsandwins.com') OR
        (auth.users.raw_user_meta_data->>'is_admin')::boolean = true
      )
    )
  )
);

CREATE POLICY "Admin users can delete content moderation"
ON public.content_moderation FOR DELETE
USING (
  (
    (current_setting('request.jwt.claims', true)::json->>'role')::text IN ('admin', 'service_role')
  ) OR (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.email LIKE '%@wheelsandwins.%' OR
        auth.users.email IN ('barry.tong1@outlook.com', 'admin@wheelsandwins.com') OR
        (auth.users.raw_user_meta_data->>'is_admin')::boolean = true
      )
    )
  )
);

-- Verify the new policies
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'content_moderation';
