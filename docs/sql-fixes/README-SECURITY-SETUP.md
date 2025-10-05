# Security Monitoring Setup - Installation Guide

## Which File Should I Use?

### ✅ Use `security-monitoring-setup-safe.sql` (RECOMMENDED)

**This is the safer, tested version that:**
- Won't fail if tables don't exist
- Has defensive checks
- Includes only essential monitoring
- Can be run section-by-section

### ⚠️ Use `security-monitoring-setup.sql` (ADVANCED)

**Only use this if:**
- All database tables already exist
- You want the full monitoring suite (including PAM health check)
- You're comfortable debugging SQL errors

---

## Installation Steps

### 1. Open Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project: `ydevatqwkoccxhtejdor`
3. Click **SQL Editor** in sidebar
4. Click **New Query**

### 2. Copy & Paste SQL

**Option A: Safe Installation** (Recommended)
```sql
-- Copy ALL contents from:
docs/sql-fixes/security-monitoring-setup-safe.sql

-- Paste into SQL Editor
-- Click "Run" (or press Cmd/Ctrl + Enter)
```

**Option B: Full Installation** (Advanced)
```sql
-- Copy ALL contents from:
docs/sql-fixes/security-monitoring-setup.sql

-- Paste into SQL Editor
-- Click "Run"
-- If errors occur, switch to safe version
```

### 3. Test Installation

Run these queries to verify everything works:

```sql
-- Test 1: Signup health
SELECT * FROM signup_health_check;

-- Test 2: Security functions
SELECT * FROM verify_security_definer_functions();

-- Test 3: RLS policies
SELECT * FROM verify_rls_policies();

-- Test 4: Complete health check
SELECT * FROM basic_health_check();
```

**Expected Results:**
- Each query returns data (not errors)
- Status columns show ✅, ⚠️, or 🚨
- No "operator does not exist" errors

---

## Common Errors & Fixes

### Error: "relation pam_conversations does not exist"

**Solution:** Use the **safe version** (`security-monitoring-setup-safe.sql`)
- This version skips PAM health checks if tables don't exist
- You can add PAM monitoring later

### Error: "operator does not exist: bigint = uuid"

**Solution:** You're using the old version. Use `security-monitoring-setup-safe.sql`
- The safe version uses CTEs to avoid type comparison issues

### Error: "permission denied for schema public"

**Solution:** You need to use the Supabase service role
1. In SQL Editor, make sure you're logged in as admin
2. Or run queries via Supabase Dashboard (automatic admin access)

---

## What Gets Created?

### Views
- ✅ `signup_health_check` - Track signup activity
- ⚠️ `pam_health_check` - Only in full version (requires pam_conversations table)

### Functions
- ✅ `verify_security_definer_functions()` - Check function security
- ✅ `verify_rls_policies()` - Check RLS policies
- ✅ `basic_health_check()` - Safe version (no PAM dependency)
- ⚠️ `comprehensive_health_check()` - Full version (requires PAM tables)

### Tables (Optional)
- `admin_notification_preferences` - Admin email settings
- `admin_notification_log` - Notification history

---

## Daily Usage

### Morning Health Check (60 seconds)

```sql
-- Safe version (always works)
SELECT * FROM basic_health_check();

-- Full version (if PAM tables exist)
SELECT * FROM comprehensive_health_check();
```

### Detailed Checks

```sql
-- Check signup activity
SELECT * FROM signup_health_check();

-- Check security functions
SELECT * FROM verify_security_definer_functions();

-- Check RLS policies
SELECT * FROM verify_rls_policies();
```

---

## Troubleshooting

### "Function doesn't exist"

**Fix:**
```sql
-- Re-run the installation SQL
-- Make sure no errors during creation
```

### "View is broken"

**Fix:**
```sql
-- Drop and recreate view
DROP VIEW IF EXISTS signup_health_check CASCADE;

-- Then re-run installation
```

### Still getting errors?

1. **Use the safe version**: `security-monitoring-setup-safe.sql`
2. **Run section by section**: Copy each section separately
3. **Check prerequisites**: Make sure required tables exist
4. **Contact support**: Share the exact error message

---

## Upgrading from Safe to Full Version

Once you have all tables created:

1. Verify tables exist:
   ```sql
   SELECT tablename FROM pg_tables
   WHERE schemaname = 'public'
   AND tablename IN ('pam_conversations', 'pam_messages');
   ```

2. If both exist, run the full version:
   ```sql
   -- Run: security-monitoring-setup.sql
   ```

3. Test comprehensive health check:
   ```sql
   SELECT * FROM comprehensive_health_check();
   ```

---

## Quick Reference

| File | Use When | Dependencies |
|------|----------|--------------|
| `security-monitoring-setup-safe.sql` | ✅ **Starting out** | None (minimal) |
| `security-monitoring-setup.sql` | ⚠️ All tables exist | PAM tables required |

**Default choice**: Use `security-monitoring-setup-safe.sql`

---

## Need Help?

- See `docs/EMERGENCY_ROLLBACK_GUIDE.md` for troubleshooting
- See `docs/SECURITY_IMPLEMENTATION_SUMMARY.md` for overview
- See `docs/security/README.md` for quick start

---

**Last Updated**: January 10, 2025
