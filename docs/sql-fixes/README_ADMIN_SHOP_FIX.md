# Admin Shop Access Fix - December 2025

## Problem
Admin user could not see products in the shop (403 Forbidden error).

## Root Cause
The admin user's JWT had `role: "admin"` which causes Supabase/PostgREST to use the PostgreSQL `admin` role for database connections. This role either didn't exist or didn't have proper grants.

Previous fixes only granted permissions to `authenticated` and `anon` roles, missing the `admin` role entirely.

## Solution
Run this SQL in Supabase SQL Editor:

```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin') THEN
    CREATE ROLE admin NOLOGIN;
    RAISE NOTICE 'Created admin role';
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO admin;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO admin;
GRANT SELECT ON public.affiliate_products TO admin;

ALTER TABLE public.affiliate_products DISABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'affiliate_products'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.affiliate_products', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE public.affiliate_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_active_products" ON public.affiliate_products FOR SELECT USING (is_active = true);
```

After running, user must **log out and log back in** to refresh the session.

## Key Learning
When a user's JWT contains a custom role (like `role: "admin"`), Supabase will use that as the PostgreSQL session role. You must:
1. Ensure that PostgreSQL role exists
2. Grant appropriate permissions to that role
3. RLS policies must allow access for that role

## Related Files
- `docs/sql-fixes/FIX_ADMIN_ROLE.sql` - The working fix
- `docs/sql-fixes/STEP1_DIAGNOSE.sql` - Diagnostic queries
- `src/integrations/supabase/client.ts` - JWT role logging (lines 156-165)

## Date Fixed
December 5, 2025
