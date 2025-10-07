# Security & Monitoring - Quick Start

## 🎯 What You Need to Know

Wheels & Wins now has **enterprise-grade security** based on lessons learned from a 3-day production outage at UnimogCommunityHub.

---

## 📋 One-Time Setup (5 minutes)

### 1. Install Git Security Hooks
```bash
./scripts/install-security-hooks.sh
```

**What this does:**
- Automatically checks for secrets before every push
- Validates build succeeds
- Checks TypeScript types
- Prevents unsafe SQL migrations

**Bypass** (not recommended):
```bash
git push --no-verify
```

---

### 2. Install Database Monitoring

**Copy the SQL file:**
`docs/sql-fixes/security-monitoring-setup.sql`

**Paste in Supabase SQL Editor → Run**

**What this creates:**
- `signup_health_check` view
- `pam_health_check` view
- `verify_security_definer_functions()` function
- `verify_rls_policies()` function
- `comprehensive_health_check()` function
- Admin notification tables

---

## 🔍 Daily Monitoring (60 seconds)

### Morning Health Check

```sql
SELECT * FROM comprehensive_health_check();
```

**Expected output:**
```
check_category | check_name              | status    | details
---------------|-------------------------|-----------|---------------------------
Signup Health  | Last 24h Signups        | ✅ OK     | 12 signups, last: 09:15
PAM Health     | Last 24h Conversations  | ✅ OK     | 45 conversations, last: 09:30
Security       | SECURITY DEFINER        | ✅ OK     | 4/4 secure
Security       | RLS Policies            | ✅ OK     | 8/8 tables OK
```

**Action items:**
- ✅ All OK → No action
- ⚡ NOTICE → Monitor if unusual
- ⚠️ WARNING → Investigate within 1 hour
- 🚨 CRITICAL → **IMMEDIATE ACTION** (see emergency guide)

---

## 🚨 Emergency Procedures

**If platform is down:**

1. **Check status pages** (30 seconds)
   - https://status.supabase.com
   - https://www.netlifystatus.com
   - https://status.render.com

2. **Run diagnostics** (60 seconds)
   ```sql
   SELECT * FROM comprehensive_health_check();
   ```

3. **Follow emergency guide**
   See `docs/EMERGENCY_ROLLBACK_GUIDE.md` for:
   - Signups broken → Fix in < 5 minutes
   - PAM not responding → Fix in < 15 minutes
   - Database migration failed → Rollback procedure
   - Build failures → Deployment fixes
   - API keys exposed → Rotation procedure

4. **Document incident** (after resolution)
   - What happened?
   - What was the fix?
   - How to prevent?

---

## 📚 Full Documentation

- **Security Implementation Summary**: `docs/SECURITY_IMPLEMENTATION_SUMMARY.md`
- **Emergency Rollback Guide**: `docs/EMERGENCY_ROLLBACK_GUIDE.md`
- **Master Security Guide** (source): `docs/MASTER_SECURITY_GUIDE.md`
- **SQL Monitoring Setup**: `docs/sql-fixes/security-monitoring-setup.sql`

---

## 🛡️ What's Protected

### Database Security
- ✅ RLS enabled on all tables
- ✅ SECURITY DEFINER on trigger functions
- ✅ search_path set for security
- ✅ Health monitoring views

### Git Security
- ✅ Pre-push hooks (secrets, build, types)
- ✅ Secret scanning (gitleaks)
- ✅ SQL migration safety checks

### Deployment Safety
- ✅ Automated validation before push
- ✅ Emergency rollback procedures
- ✅ < 15 minute incident response

### Monitoring
- ✅ Signup health tracking
- ✅ PAM activity monitoring
- ✅ Security function verification
- ✅ RLS policy verification

---

## 🎁 Quick Commands

### Daily Monitoring
```sql
-- Full health check (60 seconds)
SELECT * FROM comprehensive_health_check();

-- Signup status
SELECT * FROM signup_health_check();

-- PAM status
SELECT * FROM pam_health_check();

-- Security functions
SELECT * FROM verify_security_definer_functions();

-- RLS policies
SELECT * FROM verify_rls_policies();
```

### Emergency Diagnostics
```sql
-- Recent signups
SELECT id, email, created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 20;

-- Recent PAM conversations
SELECT id, user_id, created_at
FROM pam_conversations
ORDER BY created_at DESC
LIMIT 20;

-- Trigger status
SELECT tgname, tgrelid::regclass, tgenabled
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass
  AND NOT tgisinternal;
```

### Git Operations
```bash
# Run security checks manually
./scripts/pre-push-security-hook.sh

# Install/reinstall git hooks
./scripts/install-security-hooks.sh

# Check for secrets
gitleaks detect --verbose
```

---

## ⚠️ Important Notes

1. **Git hooks are local** - Each developer must run the installer
2. **Database monitoring is shared** - Run SQL setup once per environment
3. **Emergency guide** - Bookmark `docs/EMERGENCY_ROLLBACK_GUIDE.md`
4. **Daily health check** - Takes 60 seconds, prevents hours of downtime
5. **Pre-push hooks** - Don't bypass unless absolutely necessary

---

## 🎯 Success Metrics

**Before:**
- 🚨 3-day outage (UnimogCommunityHub)
- ❌ No automated security checks
- ❌ No health monitoring
- ❌ Slow incident response

**After:**
- ✅ Automated security checks (every push)
- ✅ Health monitoring (60-second daily check)
- ✅ < 15 minute incident response
- ✅ Documented emergency procedures
- ✅ Zero secrets leaked to git

---

**Remember: This system exists because something broke in production. Keep it maintained!**

**Last Updated**: January 10, 2025
