-- Fix admin access for staging environment
-- This script ensures the admin user has proper access

-- Check if admin_users table exists, if not create it
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'moderator', 'user')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(user_id),
  UNIQUE(email)
);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin users can view all admin records" ON admin_users;
DROP POLICY IF EXISTS "Super admins can manage all admin records" ON admin_users;
DROP POLICY IF EXISTS "Users can view their own admin status" ON admin_users;

-- Create RLS policies for admin_users
CREATE POLICY "Admin users can view all admin records" ON admin_users
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au 
      WHERE au.user_id = auth.uid() 
      AND au.role = 'admin' 
      AND au.status = 'active'
    )
  );

CREATE POLICY "Super admins can manage all admin records" ON admin_users
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid() 
      AND u.email = 'thabonel0@gmail.com'
    )
  );

CREATE POLICY "Users can view their own admin status" ON admin_users
  FOR SELECT 
  USING (user_id = auth.uid());

-- Grant permissions
GRANT ALL ON admin_users TO authenticated;
GRANT ALL ON admin_users TO service_role;

-- Insert or update the super admin user
-- First, get the user ID for the super admin email
INSERT INTO admin_users (user_id, email, role, status, created_at, updated_at)
SELECT 
  u.id,
  u.email,
  'admin',
  'active',
  now(),
  now()
FROM auth.users u
WHERE u.email = 'thabonel0@gmail.com'
ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  status = 'active',
  updated_at = now();

-- Also ensure the profiles table has the correct role
INSERT INTO profiles (id, role, username, created_at, updated_at)
SELECT 
  u.id,
  'admin',
  split_part(u.email, '@', 1),
  now(),
  now()
FROM auth.users u
WHERE u.email = 'thabonel0@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  updated_at = now();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role_status ON admin_users(role, status);

-- Update function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_users_updated_at();

-- Verify the setup by showing current admin users
SELECT 
  au.id,
  au.user_id,
  au.email,
  au.role,
  au.status,
  au.created_at,
  u.email as auth_email
FROM admin_users au
JOIN auth.users u ON au.user_id = u.id
WHERE au.status = 'active'
ORDER BY au.created_at;