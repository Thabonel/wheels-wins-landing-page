# Emergency Rollback Guide
**Wheels & Wins Production Incident Response**

---

## 🚨 CRITICAL: Read This First

**If the platform is down, follow these steps IN ORDER.**

**Response Time Targets:**
- **Database issues**: < 5 minutes
- **Frontend issues**: < 10 minutes
- **Backend API issues**: < 15 minutes

---

## Quick Diagnosis Commands

### 1. Check Signup Health (30 seconds)
```sql
-- Run in Supabase SQL Editor
SELECT * FROM signup_health_check;
```

**Interpretation:**
- ✅ OK → Signups working normally
- ⚡ NOTICE → Expected during off-hours
- ⚠️ WARNING → Investigate if ads running
- 🚨 CRITICAL → **SIGNUPS BROKEN - IMMEDIATE ACTION**

### 2. Check PAM Health (30 seconds)
```sql
SELECT * FROM pam_health_check;
```

### 3. Comprehensive Health Check (1 minute)
```sql
SELECT * FROM comprehensive_health_check();
```

This checks:
- Signup activity
- PAM conversations
- Security DEFINER functions
- RLS policies

---

## Emergency Procedures

### Scenario 1: Signups Broken 🚨

**Symptoms:**
- Users can't create accounts
- "Invalid API key" errors
- Signup form hangs
- Database trigger errors

**Immediate Fix (< 2 minutes):**

```sql
-- 1. Check for trigger failures
SELECT
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgenabled as enabled
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass
  AND NOT tgisinternal;

-- 2. If triggers are causing issues, temporarily disable
-- (ONLY AS LAST RESORT)
ALTER TABLE auth.users DISABLE TRIGGER ALL;

-- 3. Test signup immediately
-- If working, you have time to fix properly

-- 4. Re-enable triggers ASAP with proper fix
ALTER TABLE auth.users ENABLE TRIGGER ALL;
```

**Root Cause Investigation:**

```sql
-- Check if trigger functions have SECURITY DEFINER
SELECT * FROM verify_security_definer_functions();

-- Expected: All should show ✅ SECURE
-- If any show ❌ or ⚠️, that's your problem
```

**Permanent Fix:**

```sql
-- Add SECURITY DEFINER to broken function
CREATE OR REPLACE FUNCTION your_broken_function()
RETURNS trigger AS $$
BEGIN
  -- Your function code
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public';
```

---

### Scenario 2: PAM Not Responding 🔧

**Symptoms:**
- PAM takes > 60 seconds to respond
- PAM returns errors
- WebSocket connection fails

**Immediate Checks:**

```bash
# 1. Check backend health
curl https://wheels-wins-backend-staging.onrender.com/api/health

# 2. Check logs in Render dashboard
# Look for:
# - "orchestrator" errors (slow path)
# - Memory errors (OOM)
# - WebSocket errors
```

**Quick Fixes:**

```bash
# Option 1: Restart backend service (Render dashboard)
# Settings → Manual Deploy → Redeploy

# Option 2: Rollback to last working commit
git log --oneline -10
git revert <bad-commit-hash>
git push origin staging
```

**Check Performance Logs:**

```sql
-- Recent PAM conversations
SELECT
    id,
    user_id,
    created_at,
    EXTRACT(EPOCH FROM (updated_at - created_at)) as duration_seconds
FROM pam_conversations
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 20;
```

---

### Scenario 3: Database Migration Failed 💾

**Symptoms:**
- Tables missing
- Column errors
- RLS policy errors

**Immediate Rollback:**

```sql
-- 1. Check last migration
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 5;

-- 2. Manual rollback (if needed)
-- Run the DOWN migration or manually revert changes

-- 3. Verify tables exist
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 4. Check RLS status
SELECT * FROM verify_rls_policies();
```

**Prevention:**

- Always test migrations in staging first
- Keep DOWN migrations in comments
- Never DROP tables without IF EXISTS
- Always backup before major schema changes

---

### Scenario 4: Build Failures (Netlify) 🏗️

**Symptoms:**
- Netlify deploy fails
- "Module not found" errors
- Environment variable errors

**Quick Fixes:**

```bash
# 1. Check Netlify build logs
# Netlify Dashboard → Deploys → Failed Deploy → View Log

# Common Issues:

# a) Missing environment variables
# Fix: Add in Netlify → Site Settings → Environment Variables

# b) Platform-specific dependencies
npm uninstall @rollup/rollup-darwin-x64
npm install
git commit -am "fix: remove platform-specific deps"
git push

# c) TypeScript errors
npm run type-check
# Fix errors, commit, push

# d) Build command wrong
# Netlify settings should be: npm run build
# Publish directory: dist
```

**Emergency: Deploy Previous Version**

```bash
# Netlify Dashboard → Deploys
# Find last successful deploy → Options → Publish Deploy
```

---

### Scenario 5: API Keys Exposed 🔐

**Symptoms:**
- Gitleaks alerts
- Secrets detected in commits
- API key in browser console

**IMMEDIATE ACTIONS:**

1. **Rotate ALL keys immediately**
   ```bash
   # Supabase
   # Dashboard → Settings → API → Generate New Anon Key

   # Anthropic/OpenAI/Gemini
   # Provider Dashboard → Regenerate API Key

   # Update .env files
   # Update Netlify environment variables
   # Update Render environment variables
   ```

2. **Remove from Git history**
   ```bash
   # Use BFG Repo-Cleaner or git-filter-repo
   # DO NOT use this lightly - coordinate with team

   # Safer: Rewrite recent commits
   git rebase -i HEAD~5
   # Remove or squash commits with secrets
   ```

3. **Update .gitignore**
   ```bash
   # Make sure these are ignored:
   .env
   .env.local
   .env.*.local
   **/*.key
   **/*-key.json
   ```

---

## Git Rollback Procedures

### Quick Rollback (Last Commit)

```bash
# Undo last commit, keep changes
git reset HEAD~1

# Undo last commit, discard changes
git reset --hard HEAD~1
git push --force origin staging  # ⚠️ USE WITH CAUTION
```

### Rollback to Specific Commit

```bash
# Find the good commit
git log --oneline -20

# Option 1: Revert (safe, creates new commit)
git revert <bad-commit-hash>
git push origin staging

# Option 2: Hard reset (dangerous, rewrites history)
git reset --hard <good-commit-hash>
git push --force origin staging  # ⚠️ COORDINATE WITH TEAM
```

### Emergency: Rollback Staging to Production

```bash
# If staging is broken, copy production
git fetch origin main
git reset --hard origin/main
git push --force origin staging
```

---

## Monitoring Commands (Run Daily)

### Morning Health Check (60 seconds)

```sql
-- 1. Overall health
SELECT * FROM comprehensive_health_check();

-- 2. Signup activity
SELECT * FROM signup_health_check();

-- 3. PAM activity
SELECT * FROM pam_health_check();

-- 4. Security functions
SELECT * FROM verify_security_definer_functions();

-- 5. RLS policies
SELECT * FROM verify_rls_policies();
```

**Expected Results:**
- All ✅ OK statuses
- Recent signups (if ads running)
- No 🚨 CRITICAL alerts

---

## Platform Status Pages

Check these if platform is down:

- **Supabase**: https://status.supabase.com
- **Netlify**: https://www.netlifystatus.com
- **Render**: https://status.render.com
- **Anthropic (Claude)**: https://status.anthropic.com

---

## Emergency Contacts

### Service Dashboards
- **Supabase**: https://supabase.com/dashboard/project/ydevatqwkoccxhtejdor
- **Netlify**: https://app.netlify.com
- **Render**: https://dashboard.render.com

### Escalation Path
1. Check logs in service dashboards
2. Review recent commits (git log)
3. Check status pages
4. Run diagnostic SQL queries
5. Deploy rollback if needed
6. Document incident

---

## Post-Incident Checklist

After resolving an incident:

- [ ] Document what happened (incident report)
- [ ] Update this guide if new scenario
- [ ] Add monitoring for this issue
- [ ] Create tests to prevent recurrence
- [ ] Share learnings with team
- [ ] Update deployment checklist

---

## Prevention is Better Than Cure

### Before Every Deploy:

```bash
# 1. Run security checks
./scripts/pre-push-security-hook.sh

# 2. Test build
npm run build

# 3. Deploy to staging first
git push staging <branch>:staging

# 4. Test staging manually
# - Create account
# - Chat with PAM
# - Add expense
# - Check dashboard

# 5. Only then deploy to production
git push origin <branch>:main
```

---

**Remember**: This guide exists because something broke in production. Every procedure here is based on a real incident. Keep it updated!

**Last Updated**: January 10, 2025
**Next Review**: After any production incident
