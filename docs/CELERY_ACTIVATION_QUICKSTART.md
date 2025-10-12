# Celery Activation Quick Start

**Date:** January 2025
**Status:** Ready to Activate
**Estimated Time:** 30-45 minutes

---

## Prerequisites

- Access to Supabase Dashboard
- Access to Render Dashboard
- Staging environment for testing

---

## Step 1: Create Resend Account (5 min)

1. Go to https://resend.com/signup
2. Create free account (3,000 emails/month)
3. Verify your email domain OR use onboarding subdomain for testing
4. Dashboard → API Keys → Create API Key
5. Copy the key (starts with `re_`)

---

## Step 2: Run Database Migration (5 min)

**Option A: Via Supabase Dashboard**
1. Go to Supabase Dashboard → SQL Editor
2. Open `supabase/migrations/20250112000000-create-analytics-tables.sql`
3. Copy the entire SQL content
4. Paste into SQL Editor and run
5. Verify tables created:
   ```sql
   SELECT * FROM pam_analytics_logs LIMIT 1;
   SELECT * FROM analytics_summary LIMIT 1;
   SELECT * FROM analytics_daily LIMIT 1;
   ```

**Option B: Via Command Line**
```bash
psql $SUPABASE_DATABASE_URL -f supabase/migrations/20250112000000-create-analytics-tables.sql
```

---

## Step 3: Configure Staging Environment (10 min)

1. **Render Dashboard** → `wheels-wins-backend-staging` → Environment
2. Add new variable:
   - Key: `RESEND_API_KEY`
   - Value: `re_your_api_key_here` (paste from Step 1)
3. Click "Save Changes"
4. Wait for automatic redeploy (2-3 minutes)

5. **Resume Celery Worker:**
   - Render Dashboard → `wheels-wins-celery-worker-staging`
   - Click "Resume" button
   - Wait 30-60 seconds for startup

---

## Step 4: Test on Staging (10 min)

**Test 1: Welcome Email**
1. Go to https://wheels-wins-staging.netlify.app
2. Register a new test user with your email
3. Check email inbox (or Resend dashboard → Emails)
4. Verify welcome email received

**Test 2: Analytics Logging**
1. Log in to staging app
2. Send a message to PAM: "Show me my expenses"
3. Query database:
   ```sql
   SELECT * FROM pam_analytics_logs
   ORDER BY created_at DESC
   LIMIT 5;
   ```
4. Verify your message is logged

**Test 3: Check Celery Logs**
1. Render Dashboard → `wheels-wins-celery-worker-staging` → Logs
2. Look for:
   ```
   [celery worker] Connected to redis://...
   [celery worker] Task app.workers.tasks.email_tasks.send_welcome_email registered
   [celery worker] ready
   ```

---

## Step 5: Deploy to Production (10 min)

**Only proceed if staging tests pass!**

1. **Render Dashboard** → `pam-backend` → Environment
2. Add: `RESEND_API_KEY` = `re_your_api_key_here`
3. Save and wait for redeploy

4. **Resume Production Workers:**
   - Render Dashboard → `pam-celery-worker` → Resume
   - Render Dashboard → `pam-celery-beat` → Resume
   - Wait 30-60 seconds each

5. **Test Production:**
   - Register test user on https://wheelsandwins.com
   - Verify welcome email
   - Send PAM message and verify analytics

---

## Step 6: Monitor (24-48 hours)

### What to Check Daily

**Celery Worker Logs:**
```
Render → pam-celery-worker → Logs
Look for: Task completion messages, error count
```

**Celery Beat Logs:**
```
Render → pam-celery-beat → Logs
Look for: Scheduled task execution (hourly analytics, daily maintenance)
```

**Database Analytics:**
```sql
-- Check hourly analytics processing
SELECT * FROM analytics_summary
WHERE period = 'hourly'
ORDER BY timestamp DESC
LIMIT 10;

-- Check daily analytics
SELECT * FROM analytics_daily
ORDER BY date DESC
LIMIT 7;
```

**Email Delivery:**
- Resend Dashboard → Emails
- Check delivery rate (should be >95%)
- Monitor bounce/spam rates

---

## Troubleshooting

### No Emails Sending
- Check: `RESEND_API_KEY` is set in Render env vars
- Check: Celery worker logs for errors
- Check: Resend dashboard for delivery status

### Analytics Not Logging
- Check: Migration ran successfully (tables exist)
- Check: PAM endpoint logs for analytics errors
- Check: RLS policies allow service role insert

### Workers Not Running
- Check: Worker status (not suspended)
- Check: Redis connection in worker logs
- Check: Worker logs show "ready" message

---

## Rollback Procedure

If anything goes wrong:

1. **Suspend Services:**
   - Render → `pam-celery-worker` → Suspend
   - Render → `pam-celery-beat` → Suspend
   - Render → `wheels-wins-celery-worker-staging` → Suspend

2. **Remove Env Var:**
   - Render → Backend → Environment
   - Delete `RESEND_API_KEY`
   - Save changes

3. **Revert Code:**
   ```bash
   git revert a7f5c320  # Environment vars
   git revert cead9288  # Celery integration
   git push origin staging
   ```

---

## Success Metrics

**After 24 Hours:**
- [ ] 5+ welcome emails sent successfully
- [ ] 100+ PAM interactions logged to analytics
- [ ] 0 critical errors in Celery logs
- [ ] Analytics dashboard shows data

**After 1 Week:**
- [ ] Email delivery rate >95%
- [ ] Analytics processed hourly without errors
- [ ] Scheduled tasks executing on time
- [ ] No service crashes or restarts

---

## Next Steps

Once stable in production:
- Monitor email engagement (open rates, clicks)
- Review analytics insights weekly
- Add more email templates (budget alerts, maintenance reminders)
- Implement user preference controls for email frequency

---

## Support Resources

**Full Documentation:**
- `docs/CELERY_INTEGRATION_COMPLETE.md` - Comprehensive guide
- `docs/RENDER_COST_REDUCTION_PLAN.md` - Cost analysis

**Resend Support:**
- Dashboard: https://resend.com/emails
- Docs: https://resend.com/docs

**Render Support:**
- Dashboard logs for debugging
- Docs: https://render.com/docs

---

**Status:** ✅ Ready to Activate
**Estimated Value:** $21-45/month justified by email automation + analytics
**Risk:** Low (rollback procedure tested)
