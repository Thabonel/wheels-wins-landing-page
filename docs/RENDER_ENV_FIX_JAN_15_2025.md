# Render Environment Variable Fix - January 15, 2025

## Issue
Calendar event creation failing with error:
```
Could not find the 'end_date' column of 'calendar_events' in the schema cache
Error code: PGRST204
```

## Root Cause
Backend on Render is pointing to **WRONG Supabase instance**:
- Current (WRONG): `nqkmdfqnwfawirdzkvjp.supabase.co`
- Correct: `kycoklimpzkyrecbjecn.supabase.co`

The calendar_events table exists in the kycoklimpzkyrecbjecn database, but the backend is querying the wrong instance.

## Fix Steps

### 1. Get Correct Service Role Key
1. Go to: https://supabase.com/dashboard/project/kycoklimpzkyrecbjecn/settings/api
2. Copy the "service_role" key (NOT the anon key)
3. It will look like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 2. Update Render Environment Variables

#### For Staging Backend (wheels-wins-backend-staging)
1. Go to: https://dashboard.render.com/web/srv-XXXXX (your staging service)
2. Click "Environment" tab
3. Update these variables:

```bash
SUPABASE_URL=https://kycoklimpzkyrecbjecn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<paste-service-role-key-from-step-1>
```

4. Click "Save Changes"
5. Render will automatically redeploy (~5 minutes)

#### For Production Backend (pam-backend) - if applicable
1. Go to: https://dashboard.render.com/web/srv-XXXXX (your production service)
2. Repeat same steps as staging

### 3. Verify Environment Variables (Anon Key)
While you're there, also verify the anon key is correct:
```bash
SUPABASE_KEY=<your-anon-key-from-supabase-dashboard>
```
Get this from the same Supabase settings page (it's the "anon" key, different from service_role)

### 4. Wait for Deployment
- Render will show "Deploying..." status
- Wait until status shows "Live"
- Should take ~5 minutes

### 5. Test Calendar Fix
Once deployed, test in PAM:
```
User: "I need a doctors appointment on friday at 4"
Expected: Event created successfully, PAM confirms
```

## Verification Checklist

After updating:
- [ ] Render environment shows: `SUPABASE_URL=https://kycoklimpzkyrecbjecn.supabase.co`
- [ ] Service role key updated (ends with different characters than old key)
- [ ] Deployment completed successfully
- [ ] Backend health check passes: `curl https://wheels-wins-backend-staging.onrender.com/api/health`
- [ ] Calendar event creation works in PAM

## Why This Happened
The backend was likely initially configured with a test/dev Supabase instance (nqkmdfqnwfawirdzkvjp) and never updated to point to the production instance (kycoklimpzkyrecbjecn). The frontend .env.local was correctly updated, but the backend Render environment variables were not.

## Related Files
- Local frontend config: `.env.local` (line 6) - CORRECT ✅
- Backend local config: `backend/.env` (line 8) - NOW UPDATED ✅
- Render config: Set manually in dashboard - NEEDS UPDATE ❌
- Render YAML: `backend/render.yaml` (lines 25-30) - Documents that these are manual

## Next Steps After Fix
1. Mark Issue #271 as resolved
2. Move to Issue #272 (JWT verification for savings API)
3. Continue testing remaining PAM tools

---

**Created**: January 15, 2025
**Status**: Awaiting manual Render environment update
**Impact**: Blocks all database operations (calendar, expenses, trips, etc.)
