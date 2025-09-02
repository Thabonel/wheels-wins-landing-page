# Critical Fixes Summary - Wheels & Wins Staging

## Issues Identified

### 1. Database Permission Errors (403 Forbidden)
- **Tables affected**: `user_settings`, `trip_templates`, `user_subscriptions`, `user_profiles_extended`
- **Root cause**: RLS policies are using `public` role instead of `authenticated` role
- **Solution**: Migration created to fix RLS policies

### 2. CORS Error - Backend API
- **Issue**: Backend at https://wheels-wins-backend-staging.onrender.com blocking frontend requests
- **Root cause**: Missing staging Netlify URLs in CORS configuration
- **Solution**: Updated CORS settings to include staging URLs

### 3. Mapbox 401 Unauthorized
- **Issue**: Mapbox API returning 401 errors
- **Possible causes**: 
  - Frontend might be calling Mapbox directly instead of using backend proxy
  - Mapbox token not properly configured in backend environment

## Actions Taken

### 1. Database Fix - Migration Created
**File**: `supabase/migrations/20250822_fix_rls_policies_auth.sql`

This migration:
- Drops existing RLS policies that use `public` role
- Creates new policies using `authenticated` role
- Enables FORCE ROW LEVEL SECURITY on all affected tables
- Grants necessary permissions to authenticated users
- Adds policy for anonymous users to view public trip templates

**To apply this migration**:
1. Go to Supabase Dashboard > SQL Editor
2. Copy and paste the migration content
3. Run the migration

### 2. CORS Configuration Updated
**File**: `backend/app/core/cors_settings.py`

Added staging URLs:
- `https://staging--wheels-wins-landing-page.netlify.app`
- `https://staging--charming-figolla-d83b68.netlify.app`

**To deploy this fix**:
1. Commit and push to staging branch
2. Render will automatically redeploy with new CORS settings

### 3. Mapbox Configuration Check
The backend is properly configured to proxy Mapbox requests. The issue might be:

1. **Frontend calling Mapbox directly**: Check if frontend components are using the backend proxy endpoints
2. **Backend environment variable**: Ensure `MAPBOX_SECRET_TOKEN` is set in Render environment

## Next Steps

### 1. Apply Database Migration
Run the migration in Supabase to fix RLS policies.

### 2. Deploy Backend Changes
Push the CORS configuration changes to trigger a Render deployment.

### 3. Verify Mapbox Configuration
Check Render environment variables:
- `MAPBOX_SECRET_TOKEN` should be set with a valid secret token (sk.xxx)
- If using public token, set `MAPBOX_TOKEN` or `MAPBOX_API_KEY`

### 4. Frontend Mapbox Usage
Ensure frontend is using backend proxy endpoints:
- Geocoding: `/api/v1/mapbox/geocoding/v5/...`
- Directions: `/api/v1/mapbox/directions/v5/...`
- Instead of direct: `https://api.mapbox.com/...`

## Testing After Fixes

1. **Database Access**: 
   - Login and check if settings load without 403 errors
   - Try viewing trip templates

2. **Backend API**:
   - Check browser console for CORS errors
   - Should see successful API calls to backend

3. **Mapbox**:
   - Map should load properly
   - Search functionality should work
   - No 401 errors in console

## Environment Variables Checklist

### Frontend (Netlify)
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key
- `VITE_MAPBOX_PUBLIC_TOKEN` or `VITE_MAPBOX_TOKEN`: Public Mapbox token (pk.xxx)

### Backend (Render)
- `SUPABASE_URL`: Same as frontend
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (for backend operations)
- `MAPBOX_SECRET_TOKEN`: Secret Mapbox token (sk.xxx) - recommended
- `ENVIRONMENT`: "staging"
- `CORS_ALLOWED_ORIGINS`: Include your Netlify staging URL