
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

## Issue: "Permission denied for table [table_name]" for Admin Operations

**Symptoms**:
- Admin users get "permission denied for table calendar_events" when creating events
- Admin operations fail with table-level permission errors
- Admin functions work in SQL but fail in frontend application
- Error occurs across multiple admin features (calendar, expenses, user management)

**Root Cause**:
This error occurs when admin users' frontend operations use the regular Supabase client (with anon key) instead of the admin client (with service role key), causing them to be subject to Row Level Security (RLS) policies even though they have admin privileges.

**Solution**: Frontend Admin Client Integration

### Step 1: Verify Database Admin Permissions

Ensure admin role has proper database privileges:

```sql
-- 1. Check if admin role exists and has BYPASSRLS
SELECT rolname, rolsuper, rolbypassrls 
FROM pg_roles 
WHERE rolname = 'admin';

-- 2. Grant BYPASSRLS privilege to admin role
RESET ROLE;
ALTER ROLE admin BYPASSRLS;

-- 3. Grant table permissions to admin role
GRANT ALL PRIVILEGES ON TABLE calendar_events TO admin;
GRANT ALL PRIVILEGES ON TABLE expenses TO admin;
GRANT ALL PRIVILEGES ON TABLE user_sessions TO admin;
GRANT ALL PRIVILEGES ON TABLE profiles TO admin;
-- Add other tables as needed

-- 4. Grant sequence permissions for auto-incrementing IDs
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticator;
```

### Step 2: Implement Frontend Admin Client Usage

**Problem**: Frontend code uses regular `supabase` client for all operations:
```typescript
// WRONG: Uses anon key, subject to RLS
const { data, error } = await supabase
  .from("calendar_events")
  .insert(eventData);
```

**Solution**: Use admin client for admin users:

1. **Create admin detection helper** (add to component files):
```typescript
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Helper function to check if user is admin
const isUserAdmin = async (): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return false;
  const adminEmails = ['admin@wheelsandwins.com', 'thabonel0@gmail.com'];
  return adminEmails.includes(user.email);
};

// Helper function to get appropriate Supabase client
const getSupabaseClient = async () => {
  const isAdmin = await isUserAdmin();
  return isAdmin ? supabaseAdmin : supabase;
};
```

2. **Update database operations** to use dynamic client:
```typescript
// CORRECT: Uses admin client for admin users
const client = await getSupabaseClient();
const { data, error } = await client
  .from("calendar_events")
  .insert(eventData);
```

### Step 3: Apply Pattern to All Admin Operations

This pattern should be applied to any component where admin users perform database operations:

- **Calendar event creation/editing** ✅ (Fixed in EventHandlers.ts)
- **Expense management** (needs fixing)
- **User management** (needs fixing)
- **Profile updates** (needs fixing)
- **Admin dashboard operations** (needs fixing)

### Example Implementation

**Before** (causing permission errors):
```typescript
export const handleEventSubmit = async (data: CalendarEvent) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  // This uses anon key, gets blocked by RLS for admin operations
  const { error } = await supabase
    .from("calendar_events")
    .insert({ ...data, user_id: user.id });
};
```

**After** (working for admin users):
```typescript
export const handleEventSubmit = async (data: CalendarEvent) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  // This uses admin client for admin users, bypasses RLS
  const client = await getSupabaseClient();
  const { error } = await client
    .from("calendar_events")
    .insert({ ...data, user_id: user.id });
};
```

### Benefits of This Approach

1. **Admin users bypass RLS** - Use service role key with BYPASSRLS privilege
2. **Regular users stay protected** - Continue using anon key with RLS policies
3. **Automatic detection** - No manual role switching required
4. **Secure by default** - Admin privileges only for verified admin emails

### Troubleshooting Admin Client Issues

1. **Check admin email list**:
   ```typescript
   // Verify your email is in the admin list
   const adminEmails = ['admin@wheelsandwins.com', 'thabonel0@gmail.com'];
   ```

2. **Verify service role key**:
   ```typescript
   // Check if SUPABASE_SERVICE_ROLE_KEY is set
   console.log('Service key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
   ```

3. **Test admin client directly**:
   ```typescript
   // Test admin client in browser console
   import { supabaseAdmin } from "@/lib/supabase-admin";
   const result = await supabaseAdmin.from("calendar_events").select("*").limit(1);
   console.log(result);
   ```

### Prevention Strategies

1. **Always check user role** before database operations in admin contexts
2. **Use consistent admin detection** across all components
3. **Test with both admin and regular user accounts**
4. **Monitor for RLS policy violations** in error logs

## Related Documentation

- [Admin Dashboard Features](../../features/admin-dashboard.md)
- [Database Schema](../../technical/database-schema.md)
- [Security Considerations](../../technical/security-considerations.md)
- [Supabase Admin Client Setup](../../technical/integration-patterns.md)

---

*Last updated: 2025-07-19*
*Issue Resolution: Admin Access Bootstrap Fix + Frontend Admin Client Integration*
