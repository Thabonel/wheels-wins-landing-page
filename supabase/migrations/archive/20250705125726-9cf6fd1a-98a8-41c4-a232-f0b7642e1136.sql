-- Create service role policies for admin operations

-- Drop existing restrictive policies and add service role bypass policies
DROP POLICY IF EXISTS "Admins can view all admin users" ON admin_users;
DROP POLICY IF EXISTS "Admins can insert admin users" ON admin_users; 
DROP POLICY IF EXISTS "Admins can update admin users" ON admin_users;
DROP POLICY IF EXISTS "Admins can delete admin users" ON admin_users;

-- Add service role bypass policy for admin_users table
CREATE POLICY "Service role can manage admin_users" 
ON admin_users 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Allow public read access to admin_users for admin checking
CREATE POLICY "Public read access for admin checking" 
ON admin_users 
FOR SELECT 
TO anon, authenticated 
USING (true);

-- Add service role bypass policy for content_moderation table
CREATE POLICY "Service role can manage content_moderation" 
ON content_moderation 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Create function to use service role for admin operations
CREATE OR REPLACE FUNCTION admin_get_users()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  email text,
  role text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  region text,
  last_login timestamptz,
  permissions jsonb
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT id, user_id, email, role, status, created_at, updated_at, region, last_login, permissions
  FROM admin_users 
  ORDER BY created_at DESC;
$$;

-- Create function to get flagged content using service role
CREATE OR REPLACE FUNCTION admin_get_flagged_content()
RETURNS TABLE(
  id uuid,
  content_type text,
  content_id uuid,
  content_text text,
  author_email text,
  flagged_reason text,
  status text,
  moderator_notes text,
  created_at timestamptz,
  updated_at timestamptz,
  author_id uuid,
  flagged_by uuid,
  moderator_id uuid
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT id, content_type, content_id, content_text, author_email, flagged_reason, status, moderator_notes, created_at, updated_at, author_id, flagged_by, moderator_id
  FROM content_moderation 
  ORDER BY created_at DESC;
$$;

-- Grant execute permissions on admin functions
GRANT EXECUTE ON FUNCTION admin_get_users() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_get_flagged_content() TO anon, authenticated;