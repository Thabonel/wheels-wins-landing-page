-- Fix Content Moderation RLS Policies
-- The content_moderation table exists but lacks proper admin access policies

-- First, check if the table exists and enable RLS
ALTER TABLE public.content_moderation ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Admin users can manage content moderation" ON public.content_moderation;
DROP POLICY IF EXISTS "Admin users can view all content moderation" ON public.content_moderation;
DROP POLICY IF EXISTS "Admin users can insert content moderation" ON public.content_moderation;
DROP POLICY IF EXISTS "Admin users can update content moderation" ON public.content_moderation;
DROP POLICY IF EXISTS "Admin users can delete content moderation" ON public.content_moderation;

-- Create comprehensive admin access policies
-- Note: This assumes there's a way to identify admin users (admin role or is_admin flag)

-- Policy for SELECT (viewing flagged content)
CREATE POLICY "Admin users can view all content moderation"
ON public.content_moderation FOR SELECT
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

-- Policy for INSERT (creating moderation records)
CREATE POLICY "Admin users can insert content moderation"
ON public.content_moderation FOR INSERT
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

-- Policy for UPDATE (updating moderation status, notes)
CREATE POLICY "Admin users can update content moderation"
ON public.content_moderation FOR UPDATE
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

-- Policy for DELETE (removing moderation records)
CREATE POLICY "Admin users can delete content moderation"
ON public.content_moderation FOR DELETE
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

-- Grant necessary permissions to authenticated users (admins)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_moderation TO authenticated;

-- Verify the policies were created
SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'content_moderation';