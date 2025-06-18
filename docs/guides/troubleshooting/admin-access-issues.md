
# Admin Access Issues & Solutions

This document covers common admin access problems and their solutions, particularly the "permission denied to set role 'admin'" error.

## Common Admin Access Problems

### Issue: "Admin check failed: permission denied to set role 'admin'"

**Symptoms**: 
- Users cannot access admin dashboard
- Error message: "permission denied to set role 'admin'"
- Admin bootstrapping fails
- RLS policies prevent admin creation

**Root Cause**:
This error typically occurs when:
1. The `admin_users` table is empty (no existing admins)
2. Row Level Security (RLS) policies prevent admin role assignment
3. Circular dependency in RLS policies checking for existing admins
4. Migration logic fails to create the first admin user

**Solution**: Bootstrap Admin Access

The fix involves creating a targeted SQL migration that uses service role permissions to bypass RLS policies and create the first admin user.

#### Step 1: Run the Bootstrap Migration

```sql
-- Fix admin access issue by bootstrapping the first admin user
-- This migration will bypass RLS policies using service role permissions

-- First, let's add a bootstrap policy that allows admin creation when no admins exist
CREATE POLICY "Allow bootstrap admin creation when none exist" ON public.admin_users
  FOR INSERT 
  WITH CHECK (
    NOT EXISTS (SELECT 1 FROM public.admin_users WHERE role = 'admin' AND status = 'active')
  );

-- Insert the first admin user directly using the specific user ID and email
-- This bypasses RLS since we're using a migration with service role permissions
INSERT INTO public.admin_users (user_id, email, role, status, created_at, updated_at)
VALUES (
  'YOUR_USER_ID'::uuid,
  'your-email@example.com',
  'admin',
  'active',
  NOW(),
  NOW()
) ON CONFLICT (user_id) DO UPDATE SET
  role = 'admin',
  status = 'active',
  updated_at = NOW();

-- Create a helper function for admin bootstrapping in new environments
CREATE OR REPLACE FUNCTION public.bootstrap_admin_user(
  user_email TEXT,
  user_uuid UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- If UUID not provided, try to find user by email in auth.users
  IF user_uuid IS NULL THEN
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = user_email
    LIMIT 1;
  ELSE
    target_user_id := user_uuid;
  END IF;
  
  -- Check if we found a user
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email: %', user_email;
  END IF;
  
  -- Insert or update the admin user
  INSERT INTO public.admin_users (user_id, email, role, status, created_at, updated_at)
  VALUES (target_user_id, user_email, 'admin', 'active', NOW(), NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    role = 'admin',
    status = 'active',
    email = user_email,
    updated_at = NOW();
    
  RETURN TRUE;
END;
$$;

-- Grant execute permission on the bootstrap function to authenticated users
GRANT EXECUTE ON FUNCTION public.bootstrap_admin_user(TEXT, UUID) TO authenticated;
```

#### Step 2: Frontend Implementation

The system includes automatic recovery mechanisms:

1. **Admin Authentication Hook** (`useAdminAuth.ts`):
   - Automatically detects admin access issues
   - Attempts to bootstrap admin access for expected admin users
   - Provides retry mechanisms

2. **Admin Protection Component** (`AdminProtection.tsx`):
   - Shows clear error messages with debug information
   - Provides retry functionality
   - Displays bootstrap success messages

3. **Admin Recovery Component** (`AdminRecovery.tsx`):
   - Manual admin access recovery interface
   - Allows bootstrapping admin access for any user
   - Provides step-by-step recovery process

## Prevention Strategies

### 1. Proper RLS Policy Setup
Ensure RLS policies use security definer functions to avoid circular dependencies:

```sql
-- Create a security definer function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin_user(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE admin_users.user_id = $1 
    AND role = 'admin' 
    AND status = 'active'
  );
$$;

-- Use the function in RLS policies
CREATE POLICY "Admins can manage admin_users" ON public.admin_users
  FOR ALL USING (public.is_admin_user(auth.uid()));
```

### 2. Bootstrap Policy
Always include a bootstrap policy that allows admin creation when no admins exist:

```sql
CREATE POLICY "Allow bootstrap admin creation when none exist" ON public.admin_users
  FOR INSERT 
  WITH CHECK (
    NOT EXISTS (SELECT 1 FROM public.admin_users WHERE role = 'admin' AND status = 'active')
  );
```

### 3. Environment Setup Documentation
Document the admin setup process for new environments:

1. Deploy the application
2. Create the first user account
3. Run the bootstrap migration with the user's details
4. Verify admin access through the dashboard

## Troubleshooting Steps

1. **Check Admin User Record**:
   ```sql
   SELECT * FROM public.admin_users WHERE email = 'your-email@example.com';
   ```

2. **Verify RLS Policies**:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'admin_users';
   ```

3. **Test Admin Function**:
   ```sql
   SELECT public.is_admin_user('your-user-id'::uuid);
   ```

4. **Use Bootstrap Function**:
   ```sql
   SELECT public.bootstrap_admin_user('your-email@example.com');
   ```

## Manual Recovery Process

If automatic recovery fails:

1. Access the Admin Recovery interface at `/admin` (if available)
2. Enter the email address that should have admin access
3. Click "Bootstrap Admin Access"
4. Refresh the page to verify access

## Related Documentation

- [Admin Dashboard Features](../features/admin-dashboard.md)
- [Database Schema](../technical/database-schema.md)
- [Security Considerations](../technical/security-considerations.md)

---

*Last updated: 2025-06-18*
*Issue Resolution: Admin Access Bootstrap Fix*
