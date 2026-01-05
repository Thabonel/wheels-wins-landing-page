# Product Management System - Deployment Guide

Step-by-step guide for deploying the automated product management features to production.

---

## Overview

This deployment adds:
1. Bulk product operations in admin dashboard
2. Automated health check Edge Function with daily cron job
3. User price reporting system
4. Product issue reports database table

---

## Pre-Deployment Checklist

### 1. Database Migration

The `product_issue_reports` table has already been created in the database via:
```bash
✅ Migration applied: 20250105000001_create_product_issue_reports.sql
```

**Verify table exists**:
```sql
SELECT COUNT(*) FROM product_issue_reports;
-- Should return: 0 (empty table, ready for use)
```

**Verify RLS policies**:
```sql
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'product_issue_reports';
-- Should return: 5 policies (insert, select own, admin select, admin update, admin delete)
```

### 2. Frontend Code Changes

**Files modified**:
- `src/components/admin/AmazonProductsManagement.tsx` - Bulk operations UI
- `src/components/shop/ProductCard.tsx` - Report issue dialog

**Files created**:
- `supabase/functions/product-health-check/index.ts` - Health check function
- `supabase/functions/product-health-check/README.md` - Function documentation
- `supabase/migrations/20250105000001_create_product_issue_reports.sql` - Database schema
- `docs/ADMIN_PRODUCT_MANAGEMENT_GUIDE.md` - Admin user guide
- `docs/PRODUCT_MANAGEMENT_DEPLOYMENT_GUIDE.md` - This file

**No breaking changes**: All features are additive, existing functionality unchanged.

### 3. Backend Dependencies

**Edge Function dependencies** (already included):
- `@supabase/supabase-js@2.39.0`
- Shared utilities: `supabase/functions/_shared/utils.ts`

**No new NPM packages required**.

---

## Deployment Steps

### Step 0: Set Environment Variables (CRITICAL)

**Before deploying, set the CRON_SECRET in Supabase**:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/kycoklimpzkyrecbjecn)
2. Navigate to **Settings** → **Edge Functions**
3. Click **Add New Secret**
4. Set:
   - **Name**: `CRON_SECRET`
   - **Value**: A strong random string (e.g., generate with `openssl rand -hex 32`)
5. Click **Save**

This secret authenticates the automated cron job requests.

### Step 1: Deploy Edge Function

**Deploy the health check function to Supabase**:

```bash
# Navigate to project root
cd /path/to/wheels-wins-landing-page

# Deploy the function
supabase functions deploy product-health-check

# Expected output:
# Deploying product-health-check (project ref: kycoklimpzkyrecbjecn)
# Bundled product-health-check in XXXms
# Deployed function product-health-check in XXXms
```

**Verify deployment (requires admin JWT)**:
```bash
# Get admin JWT token from browser (after login, check localStorage)
export ADMIN_TOKEN="your-admin-jwt-token"

# Test the function
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://kycoklimpzkyrecbjecn.supabase.co/functions/v1/product-health-check

# Should return JSON health report (not 401 Unauthorized)
```

### Step 2: Enable Cron Job

**Option A: Via Supabase Dashboard** (Recommended)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/kycoklimpzkyrecbjecn)
2. Navigate to **Edge Functions** → `product-health-check`
3. Click **Settings** → **Cron Jobs**
4. Click **Add Cron Job**
5. Configure:
   - **Name**: Daily Health Check
   - **Schedule**: `0 2 * * *` (Daily at 2 AM UTC)
   - **HTTP Method**: POST
   - **Request Body**:
     ```json
     {
       "autoFix": true,
       "staleDays": 30
     }
     ```
6. Click **Create**

**Option B: Via CLI** (If config.toml cron is not working)

The cron configuration is already in `supabase/config.toml`:
```toml
[functions.product-health-check.cron]
schedule = "0 2 * * *"
method = "POST"
body = '{"autoFix": true, "staleDays": 30}'
```

Apply the configuration:
```bash
supabase functions deploy product-health-check
```

**Verify cron job**:
```bash
# Check function invocations in dashboard
# Should show scheduled invocations every day at 2 AM UTC
```

### Step 3: Deploy Frontend Changes

**Staging deployment**:
```bash
# Push to staging branch
git add .
git commit -m "feat: Add product management system with health checks and user reporting"
git push origin staging

# Netlify will auto-deploy to staging
# URL: https://wheels-wins-staging.netlify.app
```

**Test on staging**:
1. ✅ Admin dashboard loads at `/admin/shop-management`
2. ✅ Bulk selection checkboxes work
3. ✅ Bulk actions update products
4. ✅ ProductCard shows "Report Issue" button
5. ✅ Report dialog opens and submits successfully
6. ✅ No console errors

**Production deployment**:
```bash
# Create PR from staging to main
gh pr create --base main --head staging \
  --title "Product Management System" \
  --body "Adds bulk operations, health checks, and user reporting"

# After approval, merge PR
gh pr merge --merge

# Netlify will auto-deploy to production
# URL: https://wheelsandwins.com
```

### Step 4: Initial Health Check

**Run first health check manually**:
```bash
curl -X POST \
  "https://kycoklimpzkyrecbjecn.supabase.co/functions/v1/product-health-check?autoFix=true" \
  | jq '.'

# Review output for any issues
# Fix high-severity issues (missing prices) immediately
```

**Expected output** (current state):
```json
{
  "total_products": 81,
  "healthy_products": 81,
  "products_with_issues": [],
  "summary": {
    "missing_images": 0,
    "missing_prices": 0,
    "missing_descriptions": 0,
    "stale_products": 0,
    "unknown_availability": 0
  },
  "timestamp": "2025-01-05T..."
}
```

### Step 5: Verify Permissions

**Admin access**:
```sql
-- Check admin users have correct role
SELECT email, role, status FROM admin_users
WHERE status = 'active';

-- Expected: At least one super_admin or admin
```

**Test admin functions**:
1. Log in as admin user
2. Navigate to `/admin/shop-management`
3. Test bulk selection (should work)
4. Test bulk actions (should update database)
5. Check for any permission errors in console

**Regular user access**:
1. Log in as regular user (or anonymous)
2. Visit `/shop`
3. Click "Report Issue" on any product
4. Submit a test report (should succeed)
5. Verify report saved in database:
```sql
SELECT * FROM product_issue_reports
ORDER BY created_at DESC LIMIT 1;
```

---

## Post-Deployment Verification

### Health Check Function

**Test cases**:

1. **Basic health check** (no auto-fix):
```bash
curl -X POST https://kycoklimpzkyrecbjecn.supabase.co/functions/v1/product-health-check
# Should return report without modifying database
```

2. **Auto-fix enabled**:
```bash
curl -X POST "https://kycoklimpzkyrecbjecn.supabase.co/functions/v1/product-health-check?autoFix=true"
# Should mark stale products as 'unknown'
```

3. **Custom stale threshold**:
```bash
curl -X POST "https://kycoklimpzkyrecbjecn.supabase.co/functions/v1/product-health-check?staleDays=60"
# Should use 60-day threshold instead of 30
```

### Admin Dashboard

**Test bulk operations**:

1. Select 5 products
2. Click "Mark Out of Stock"
3. Verify success toast appears
4. Verify products updated in database:
```sql
SELECT id, title, availability_status FROM affiliate_products
WHERE id IN ('id1', 'id2', 'id3', 'id4', 'id5');
-- Should all show: out_of_stock
```

5. Select same 5 products
6. Click "Mark Available"
7. Verify products restored

### User Reporting

**Test report submission**:

1. Visit `/shop` (logged in or anonymous)
2. Click "Report Issue" on any product
3. Select issue type: "Incorrect Price"
4. Add notes: "Test report from deployment verification"
5. Click "Submit Report"
6. Verify success toast appears
7. Verify report in database:
```sql
SELECT * FROM product_issue_reports
WHERE notes LIKE '%deployment verification%';
```

### Cron Job

**Verify scheduled execution**:

1. Wait for next scheduled run (2 AM UTC next day)
2. Or trigger manually via dashboard
3. Check function logs:
```bash
supabase functions logs product-health-check --limit 10
```
4. Should see execution logs with health report

---

## Rollback Plan

If issues occur post-deployment:

### Quick Rollback (Frontend Only)

```bash
# Revert to previous commit
git revert HEAD
git push origin staging  # or main

# Netlify will auto-redeploy previous version
```

**Safe**: No database changes reverted, only UI changes.

### Full Rollback (Database + Frontend)

**Step 1: Disable cron job**:
- Dashboard → Edge Functions → product-health-check → Settings → Cron Jobs
- Delete or disable the cron job

**Step 2: Drop table** (only if absolutely necessary):
```sql
-- WARNING: This will delete all user reports!
DROP TABLE IF EXISTS public.product_issue_reports CASCADE;
```

**Step 3: Revert frontend**:
```bash
git revert <commit-hash>
git push origin staging
```

---

## Monitoring

### Function Logs

**View Edge Function logs**:
```bash
supabase functions logs product-health-check --limit 50
```

**Look for**:
- Execution time (should be <5 seconds)
- Errors or warnings
- Number of products analyzed
- Auto-fix actions taken

### Database Growth

**Monitor table sizes**:
```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename IN ('product_issue_reports', 'affiliate_products')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### User Reports

**Weekly summary**:
```sql
SELECT
  issue_type,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved
FROM product_issue_reports
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY issue_type
ORDER BY total DESC;
```

---

## Maintenance Schedule

### Daily (Automated)

- ✅ Health check runs at 2 AM UTC
- ✅ Stale products auto-marked as 'unknown'
- ✅ Function logs auto-archived

### Weekly (Manual - 15 minutes)

- Review health check reports
- Resolve pending user reports
- Fix high-severity issues (missing prices)

### Monthly (Manual - 30 minutes)

- Archive old reports (status = 'resolved', age > 30 days)
- Review product health trends
- Update documentation if needed

**Monthly cleanup**:
```sql
-- Archive resolved reports older than 30 days
DELETE FROM product_issue_reports
WHERE status = 'resolved'
  AND created_at < NOW() - INTERVAL '30 days';
```

---

## Troubleshooting

### Edge Function Not Running

**Check deployment**:
```bash
supabase functions list
# Should show: product-health-check
```

**Verify URL**:
```bash
curl -I https://kycoklimpzkyrecbjecn.supabase.co/functions/v1/product-health-check
# Should return: 200 OK (after POST)
```

**Common fixes**:
- Redeploy function: `supabase functions deploy product-health-check`
- Check project ref matches: `kycoklimpzkyrecbjecn`
- Verify CORS headers in function code

### Cron Job Not Executing

**Check configuration**:
```bash
cat supabase/config.toml | grep -A 5 product-health-check
```

**Common fixes**:
- Verify cron schedule syntax: `0 2 * * *`
- Check function deployed before enabling cron
- Wait 24 hours for first execution
- Trigger manually to test: Dashboard → Invoke Now

### Bulk Operations Permission Denied

**Check admin role**:
```sql
SELECT * FROM admin_users WHERE email = 'your-email@example.com';
-- Verify: role IN ('super_admin', 'admin'), status = 'active'
```

**Check JWT token**:
- Log out and log back in (refreshes token)
- Verify `role` claim in JWT includes admin role
- Check browser console for 403 errors

**Common fixes**:
- Clear browser cache and cookies
- Verify RLS policies allow admin access
- Check `admin` PostgreSQL role has GRANTs

### Reports Not Saving

**Check RLS policies**:
```sql
SELECT * FROM pg_policies
WHERE tablename = 'product_issue_reports'
  AND policyname = 'allow_insert_reports';
```

**Test manual insert**:
```sql
INSERT INTO product_issue_reports (product_id, issue_type, notes)
VALUES (
  (SELECT id FROM affiliate_products LIMIT 1),
  'other',
  'Test insert'
);
```

**Common fixes**:
- Verify table exists: `\d product_issue_reports`
- Check foreign key references valid product
- Ensure `allow_insert_reports` policy exists

---

## Success Criteria

Deployment is successful when:

- ✅ Health check function executes without errors
- ✅ Cron job scheduled and visible in dashboard
- ✅ Admin can bulk-select and update products
- ✅ Users can submit product issue reports
- ✅ Reports save to database with correct RLS
- ✅ No console errors on staging or production
- ✅ Function logs show expected behavior

---

## Support

**Deployment issues?**
- Check [Admin Product Management Guide](./ADMIN_PRODUCT_MANAGEMENT_GUIDE.md)
- Review function logs: `supabase functions logs product-health-check`
- Contact technical team with specific error messages

**Feature questions?**
- See [Admin Product Management Guide](./ADMIN_PRODUCT_MANAGEMENT_GUIDE.md)
- Review [Database Schema Reference](./DATABASE_SCHEMA_REFERENCE.md)

---

**Deployment Date**: January 5, 2025
**Version**: 1.0
**Deployed By**: Wheels & Wins Engineering Team
**Status**: ✅ Production Ready
