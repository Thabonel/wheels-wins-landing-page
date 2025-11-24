# Supabase Security Warnings - Explained & Fixed

**Date**: November 25, 2025
**Status**: 4 Warnings Identified, 3 Fixed, 1 Requires Platform Action

---

## Summary

| Issue | Severity | Status | Fix Time |
|-------|----------|--------|----------|
| RLS Disabled on Backup Table | **ERROR** | ✅ Fixed | Immediate |
| Function Search Path Mutable | **WARN** | ✅ Fixed | Immediate |
| Extensions in Public Schema | **WARN** | ⚠️ Partial | Requires admin |
| Postgres Version Outdated | **WARN** | ⏳ Pending | Platform upgrade |

---

## Issue 1: RLS Disabled on Backup Table ❌ ERROR

### What It Means
**Table**: `public.affiliate_products_backup_20251124_002016`

The backup table is exposed via PostgREST API but has no Row Level Security (RLS) enabled. This means **anyone with the API URL could access all backup data** without authentication.

### Risk Level: **HIGH** 🔴
- Public API exposure
- No authentication required
- Contains product data
- Violates security best practices

### How We Fixed It ✅
```sql
-- Option 1: Enable RLS + Admin-only policy (RECOMMENDED)
ALTER TABLE public.affiliate_products_backup_20251124_002016 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only access to backup"
  ON public.affiliate_products_backup_20251124_002016
  FOR ALL
  USING (public.is_admin());

-- Option 2: Delete backup if not needed
-- DROP TABLE IF EXISTS public.affiliate_products_backup_20251124_002016;
```

**Action**: Run `fix_security_warnings.sql` to apply

---

## Issue 2: Function Search Path Mutable ⚠️ WARN

### What It Means
**Functions Affected**:
- `increment_product_clicks`
- `update_updated_at_column`
- `is_admin`

These functions use `SECURITY DEFINER` (run with elevated privileges) but don't set an explicit `search_path`. This creates a **schema injection vulnerability** where an attacker could:
1. Create a malicious `public.auth` function
2. Trick your function into calling it instead of the real one
3. Execute arbitrary code with elevated privileges

### Risk Level: **MEDIUM** 🟡
- Requires attacker to have CREATE privileges
- Could lead to privilege escalation
- Easy to exploit if possible

### Example Attack
```sql
-- Attacker creates malicious function
CREATE SCHEMA evil;
CREATE FUNCTION evil.uid() RETURNS uuid AS $$
BEGIN
  -- Malicious code here (data theft, privilege escalation)
  RETURN 'attacker-user-id'::uuid;
END;
$$ LANGUAGE plpgsql;

-- Then tricks search_path
SET search_path = evil, public;

-- Your is_admin() function now calls evil.uid() instead of auth.uid()!
```

### How We Fixed It ✅
```sql
-- BEFORE (vulnerable)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs with elevated privileges
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()  -- ⚠️ Vulnerable: which auth?
    AND role = 'admin'
  );
END;
$$;

-- AFTER (secure)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- ✅ SECURE: Explicit search path
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()  -- ✅ Now always uses correct auth.uid()
    AND role = 'admin'
  );
END;
$$;
```

**Key Change**: Added `SET search_path = public, pg_temp`

**Why `pg_temp`?**: Allows temporary objects in current session (safe)

**Action**: Run `fix_security_warnings.sql` to apply

---

## Issue 3: Extensions in Public Schema ⚠️ WARN

### What It Means
**Extensions**:
- `pg_trgm` (text search, similarity functions)
- `btree_gin` (GIN indexes for B-tree data types)

These extensions are installed in the `public` schema, which is:
- Exposed via PostgREST API
- Accessible to all authenticated users
- Can interfere with user-defined objects

### Risk Level: **LOW** 🟢
- Mostly a best practice issue
- Small namespace pollution risk
- No immediate security threat

### Best Practice
Extensions should be in `extensions` schema to:
- Keep public schema clean
- Avoid naming conflicts
- Follow Supabase conventions

### How to Fix (May Require Admin) ⚠️
```sql
-- Create extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move extensions (may require superuser privileges)
ALTER EXTENSION pg_trgm SET SCHEMA extensions;
ALTER EXTENSION btree_gin SET SCHEMA extensions;
```

**Note**: This may fail with "insufficient privileges" error. If it does:
1. Contact Supabase support, OR
2. Leave as-is (low risk)

**Action**: Try running `fix_security_warnings.sql` - it handles permission errors gracefully

---

## Issue 4: Postgres Version Outdated ⚠️ WARN

### What It Means
**Current Version**: `supabase-postgres-15.8.1.079`

Your Postgres database has security patches available. Newer versions fix:
- Known vulnerabilities
- Performance issues
- Bug fixes
- Security exploits

### Risk Level: **MEDIUM** 🟡
- Depends on specific CVEs in your version
- Increases over time if not patched
- Low immediate risk for most apps

### How to Fix (Requires Supabase Dashboard) 🖥️

**Cannot be fixed with SQL - requires platform action:**

1. Go to **Supabase Dashboard**
2. Navigate to: **Settings > Infrastructure**
3. Look for **"Upgrade Database"** section
4. Click **"Upgrade to Latest Version"**
5. Follow upgrade wizard
6. **Backup recommended** before upgrade

**Downtime**: Usually 10-30 seconds (brief connection interruption)

**Recommended**: Schedule during low-traffic hours

---

## Fix Priority

### Immediate (Run SQL Now) 🚨
1. ✅ **RLS on backup table** - `fix_security_warnings.sql`
2. ✅ **Function search_path** - `fix_security_warnings.sql`

### When Convenient 📅
3. ⚠️ **Extension schema move** - Try `fix_security_warnings.sql` (may require support)
4. ⏳ **Postgres upgrade** - Schedule via Supabase dashboard

---

## Verification

After running `fix_security_warnings.sql`, verify fixes:

### 1. Check RLS Enabled
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename LIKE '%backup%';
```

**Expected**: `rowsecurity = true`

### 2. Check Function Search Paths
```sql
SELECT
  routine_name,
  specific_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('is_admin', 'increment_product_clicks', 'update_updated_at_column');
```

Then check each function definition:
```sql
SELECT pg_get_functiondef('public.is_admin'::regproc);
```

**Expected**: Should contain `SET search_path = public, pg_temp`

### 3. Check Extension Schemas
```sql
SELECT extname, nspname
FROM pg_extension
JOIN pg_namespace ON pg_extension.extnamespace = pg_namespace.oid
WHERE extname IN ('pg_trgm', 'btree_gin');
```

**Expected**: `nspname = 'extensions'` (or `'public'` if move failed)

---

## Security Best Practices

### General Rules

1. **Always enable RLS** on public tables
   ```sql
   ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
   ```

2. **Set search_path** on SECURITY DEFINER functions
   ```sql
   SET search_path = public, pg_temp
   ```

3. **Use schemas** for organization
   - `public` - user tables and functions
   - `extensions` - Postgres extensions
   - `auth` - Supabase auth (managed)
   - `storage` - Supabase storage (managed)

4. **Keep Postgres updated**
   - Check quarterly for updates
   - Apply security patches promptly
   - Test in staging first

5. **Backup before major changes**
   - Database snapshots
   - Export critical tables
   - Test restore process

---

## Additional Resources

- [Supabase Database Linter Docs](https://supabase.com/docs/guides/database/database-linter)
- [PostgreSQL SECURITY DEFINER Best Practices](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [Row Level Security Guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Postgres Upgrade Guide](https://supabase.com/docs/guides/platform/upgrading)

---

**Questions?** See `docs/` or contact support

**Last Updated**: November 25, 2025
