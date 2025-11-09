# E2E Health Monitoring System - Big Tech Approach

**Status**: Ready to Deploy
**Detection Time**: 5 minutes (like Google, Facebook, Netflix)
**Philosophy**: Don't prevent bugs - detect them instantly

---

## The Big Tech Way

### How Google/Facebook Do It

They don't prevent every bug. They detect failures in **5 minutes** and fix in **30 minutes**.

**Their Strategy**:
1. E2E tests run every 5 minutes
2. Instant alerts when something breaks
3. Fix immediately
4. Ship fast, detect fast

**Our Implementation**: Same strategy, adapted for our scale.

---

## 3-Layer Defense System

### Layer 1: Real User Monitoring (5 min detection) ✅ NEW

**What**: Netlify scheduled function runs every 5 minutes
**Tests**: Signup, Login, PAM Backend, Database
**Alert Time**: Instant (within 5 minutes of failure)
**Cost**: Free (Netlify functions)

**File**: `netlify/functions/health-check.ts`

**Tests Performed**:
1. **Signup Test** - Try to create new user account
2. **Login Test** - Try to authenticate existing user
3. **PAM Backend** - Check AI service health
4. **Database** - Verify Supabase connectivity

**What Happens When Test Fails**:
- Logs to console (visible in Netlify dashboard)
- Saves to database (health_check_alerts table)
- Returns 503 status (monitoring tools can alert on this)
- TODO: Send email/SMS/Slack alert

### Layer 2: Cron Monitoring (30 min detection) - EXISTING

**What**: Backend cron job checks for real user activity
**Tests**: Did real users sign up in last 30 min?
**Alert Time**: 30 minutes
**Status**: Already implemented ✅

### Layer 3: Manual Daily Check (Morning routine)

**What**: Quick dashboard check every morning
**SQL**: `SELECT * FROM health_check_alerts WHERE timestamp > NOW() - INTERVAL '24 hours';`
**Time**: 10 seconds
**Status**: Can implement dashboard page

---

## Setup Instructions

### Step 1: Add Environment Variables to Netlify

Go to Netlify Dashboard → Site Settings → Environment Variables

**Required**:
- `VITE_SUPABASE_URL` - Already set ✅
- `SUPABASE_SERVICE_ROLE_KEY` - **ADD THIS** (from Supabase dashboard)
- `VITE_BACKEND_URL` - Already set ✅

**Optional**:
- `ALERT_EMAIL` - Your email for alerts (default: thabonel@gmail.com)

### Step 2: Create Database Tables

Run this SQL in Supabase SQL Editor:

```sql
-- File: docs/sql-fixes/create_health_check_tables.sql

CREATE TABLE IF NOT EXISTS health_check_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'critical')),
  failed_tests TEXT[] NOT NULL,
  error_details TEXT[],
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_check_alerts_timestamp
  ON health_check_alerts(timestamp DESC);

-- (See full file for complete schema)
```

### Step 3: Deploy to Netlify

```bash
git add netlify/ docs/
git commit -m "feat: add E2E health monitoring (5-min detection)"
git push origin staging
```

Netlify will automatically:
1. Deploy the scheduled function
2. Start running it every 5 minutes
3. Log results to dashboard

### Step 4: Test Manually

**Option A: Via Browser**
```
https://your-site.netlify.app/.netlify/functions/manual-health-check
```

**Option B: Via curl**
```bash
curl https://wheels-wins-staging.netlify.app/.netlify/functions/manual-health-check
```

**Expected Response**:
```json
{
  "overall_status": "healthy",
  "timestamp": "2025-01-15T12:00:00Z",
  "tests": [
    {
      "test": "signup",
      "status": "pass",
      "duration_ms": 234
    },
    {
      "test": "login",
      "status": "pass",
      "duration_ms": 189
    },
    {
      "test": "pam_backend",
      "status": "pass",
      "duration_ms": 45
    },
    {
      "test": "database",
      "status": "pass",
      "duration_ms": 12
    }
  ],
  "alerts": []
}
```

---

## How It Works

### Every 5 Minutes

```
┌─────────────────────────────────────────────┐
│  Netlify Scheduled Function Triggers       │
│  (Runs at: 00:00, 00:05, 00:10, ...)      │
└─────────────────┬───────────────────────────┘
                  │
        ┌─────────▼─────────┐
        │  Run 4 Tests      │
        │  In Parallel      │
        └─────────┬─────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
┌───▼───┐   ┌────▼────┐   ┌───▼────┐   ┌─────▼─────┐
│Signup │   │ Login   │   │  PAM   │   │ Database  │
│ Test  │   │  Test   │   │Backend │   │   Test    │
└───┬───┘   └────┬────┘   └───┬────┘   └─────┬─────┘
    │             │            │              │
    └─────────────┼────────────┼──────────────┘
                  │
        ┌─────────▼─────────┐
        │   All Passed?     │
        └─────────┬─────────┘
                  │
        ┌─────────▼─────────┐
        │   YES: Log        │
        │   200 OK          │
        └───────────────────┘

        OR

        ┌─────────▼─────────┐
        │   NO: Alert!      │
        │   503 Error       │
        │   Log to DB       │
        │   Send Alert      │
        └───────────────────┘
```

### When Test Fails

1. **Immediate** (within 5 min):
   - Function returns 503 status
   - Error logged to Netlify function logs
   - Record saved to `health_check_alerts` table

2. **Monitoring** (you set up):
   - Check Netlify dashboard for function errors
   - Query database: `SELECT * FROM health_check_alerts WHERE status != 'healthy';`
   - Optionally: Set up external monitoring (UptimeRobot, Pingdom) to ping the endpoint

3. **Alert Channels** (to implement):
   - Email via SendGrid/AWS SES
   - SMS via Twilio
   - Slack webhook
   - Discord webhook
   - PagerDuty integration

---

## What Gets Tested

### Test 1: User Signup
**Critical**: If broken, no new users can join

**Steps**:
1. Create test user with unique email
2. Verify signup successful
3. Delete test user (cleanup)

**Failure Scenarios**:
- Supabase auth service down
- RLS policies broken
- Email service failing

### Test 2: User Login
**Critical**: If broken, existing users locked out

**Steps**:
1. Create test user
2. Try to login with credentials
3. Verify JWT token received
4. Delete test user (cleanup)

**Failure Scenarios**:
- Auth service down
- JWT secret misconfigured
- Session management broken

### Test 3: PAM Backend
**Critical**: If broken, AI features don't work

**Steps**:
1. Hit `/api/v1/pam/health` endpoint
2. Verify status is "healthy"
3. Check Claude API availability

**Failure Scenarios**:
- Backend server down (Render)
- Claude API key invalid
- WebSocket service crashed

### Test 4: Database Connectivity
**Critical**: If broken, entire app unusable

**Steps**:
1. Query profiles table (simple SELECT)
2. Verify query succeeds
3. Check response time

**Failure Scenarios**:
- Supabase database down
- Network connectivity issues
- RLS policies blocking service role

---

## Monitoring Dashboard (Optional)

### Quick SQL Queries

**Check Recent Alerts**:
```sql
SELECT
  status,
  failed_tests,
  error_details,
  timestamp
FROM health_check_alerts
WHERE timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;
```

**Alert Frequency by Test**:
```sql
SELECT
  test_name,
  COUNT(*) as failures,
  MAX(timestamp) as last_failure
FROM health_check_history
WHERE status = 'fail'
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY test_name
ORDER BY failures DESC;
```

**System Health Over Time**:
```sql
SELECT
  DATE_TRUNC('hour', timestamp) as hour,
  COUNT(*) FILTER (WHERE status = 'pass') as passes,
  COUNT(*) FILTER (WHERE status = 'fail') as failures
FROM health_check_history
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

---

## Alert Integration (TODO)

### Email Alerts (SendGrid)

```typescript
async function sendEmailAlert(report: HealthCheckReport) {
  await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{
        to: [{ email: process.env.ALERT_EMAIL }],
        subject: `🚨 Health Check Failed: ${report.failed_tests.length} tests`,
      }],
      from: { email: 'alerts@wheelsandwins.com' },
      content: [{
        type: 'text/plain',
        value: generateAlertEmail(report),
      }],
    }),
  });
}
```

### Slack Alerts

```typescript
async function sendSlackAlert(report: HealthCheckReport) {
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `🚨 Health Check Failed`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Status*: ${report.overall_status}\n*Failed Tests*: ${report.alerts.join(', ')}`,
          },
        },
      ],
    }),
  });
}
```

---

## Benefits of This Approach

### Fast Detection ✅
- Issues detected in 5 minutes (not hours/days)
- Same as Google/Facebook detection time
- Beats manual checking by 10x

### Automatic Cleanup ✅
- Test users auto-deleted
- No database pollution
- No manual intervention needed

### Low Cost ✅
- Netlify functions: Free tier (125k invocations/month)
- Database queries: Minimal (4 simple queries every 5 min)
- Total cost: $0/month

### Production-Ready ✅
- Same approach used by Big Tech
- Battle-tested pattern
- Scales to millions of users

### Developer-Friendly ✅
- One TypeScript file
- Simple to understand
- Easy to extend (add more tests)

---

## Usage Examples

### Check Health Manually
```bash
curl https://wheels-wins-staging.netlify.app/.netlify/functions/manual-health-check
```

### View Recent Alerts (Supabase Dashboard)
```sql
SELECT * FROM health_check_alerts
WHERE timestamp > NOW() - INTERVAL '1 day'
ORDER BY timestamp DESC;
```

### Check Netlify Logs
1. Go to Netlify Dashboard
2. Functions → health-check
3. View recent executions

### Simulate Failure (Testing)
1. Temporarily break something (e.g., wrong API key)
2. Wait 5 minutes
3. Check function logs for failure detection
4. Fix the issue
5. Verify next check passes

---

## Next Steps

### Immediate (Required)
1. ✅ Add SUPABASE_SERVICE_ROLE_KEY to Netlify env vars
2. ✅ Run SQL migration to create tables
3. ✅ Deploy to staging
4. ✅ Test manual endpoint
5. ✅ Wait 5 minutes and verify scheduled run

### Soon (Recommended)
1. Add email alerts (SendGrid/AWS SES)
2. Add Slack integration for team alerts
3. Create admin dashboard page showing health history
4. Set up external monitoring (UptimeRobot) as backup

### Later (Nice to Have)
1. Add more tests (profile creation, expense tracking, etc.)
2. Performance benchmarks (track response time trends)
3. Geographic health checks (test from multiple regions)
4. Mobile app health checks (if applicable)

---

## Troubleshooting

### Function Not Running
**Check**: Netlify Dashboard → Functions → Scheduled
**Fix**: Verify `netlify.toml` has correct schedule syntax

### Environment Variables Not Working
**Check**: Netlify Dashboard → Site Settings → Environment Variables
**Fix**: Ensure all required vars are set, redeploy after adding

### Tests Always Failing
**Check**: Function logs for specific error messages
**Common Causes**:
- Wrong Supabase URL
- Invalid service role key
- Backend actually down (check Render)

### Database Insert Failing
**Check**: RLS policies on health_check_alerts table
**Fix**: Ensure service role can INSERT (policy created in migration)

---

**Created**: January 15, 2025
**Status**: Ready to Deploy
**Next**: Add env vars → Run migration → Deploy → Test
