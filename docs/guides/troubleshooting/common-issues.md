
# Common Issues & Solutions

This document covers the most frequently encountered issues and their solutions.

## Admin Access Issues

### Issue: "Admin check failed: permission denied to set role 'admin'"
**Symptoms**: Cannot access admin dashboard, admin bootstrapping fails
**Solutions**:
1. Run the admin bootstrap migration (see [Admin Access Issues](admin-access-issues.md))
2. Use the bootstrap function: `SELECT public.bootstrap_admin_user('your-email@example.com')`
3. Check RLS policies on admin_users table
4. Verify user exists in auth.users table

**Quick Fix**: See the comprehensive [Admin Access Issues & Solutions guide](admin-access-issues.md) for detailed steps.

### Issue: "Permission denied for table [table_name]" for Admin Operations
**Symptoms**: Admin users get permission errors when creating calendar events, managing expenses, or other admin operations
**Root Cause**: Frontend using regular Supabase client instead of admin client for admin users
**Solutions**:
1. **Database**: Grant BYPASSRLS privilege to admin role: `ALTER ROLE admin BYPASSRLS;`
2. **Database**: Grant table permissions: `GRANT ALL PRIVILEGES ON TABLE calendar_events TO admin;`
3. **Frontend**: Use admin client for admin users (see pattern in [Admin Access Issues](admin-access-issues.md))
4. **Frontend**: Update all database operations to use `getSupabaseClient()` helper function

**Quick Fix**: Apply the admin client pattern from [Admin Access Issues guide](admin-access-issues.md#issue-permission-denied-for-table-table_name-for-admin-operations) to your components.

## Authentication Issues

### Issue: "Invalid JWT token" errors
**Symptoms**: Users can't log in or get logged out unexpectedly
**Solutions**:
1. Check if JWT secret is properly configured
2. Verify token expiration settings
3. Clear browser localStorage/sessionStorage
4. Check Supabase authentication settings

### Issue: OAuth login fails
**Symptoms**: Social login buttons don't work
**Solutions**:
1. Verify OAuth app configuration in provider
2. Check redirect URLs match exactly
3. Ensure Supabase auth providers are enabled
4. Check CORS settings

## Database Connection Issues

### Issue: "Failed to connect to Supabase"
**Symptoms**: Database queries fail, connection timeouts
**Solutions**:
1. Verify Supabase URL and API key
2. Check network connectivity
3. Verify database is not paused (free tier)
4. Check connection string format

### Issue: Row Level Security (RLS) blocking queries
**Symptoms**: Data not loading, permission errors
**Solutions**:
1. Review RLS policies in Supabase
2. Check user authentication state
3. Verify policy conditions match user context
4. Test queries in Supabase SQL editor

### Issue: "permission denied for table calendar_events"
**Symptoms**: Inserting or saving calendar events fails
**Solutions**:
1. Confirm the `calendar_events` table exists
2. Verify a Row Level Security policy allows authenticated users to `INSERT` rows where `user_id` matches their own
3. Example SQL to create/verify the policy:

```sql
-- Check existing calendar_events policies
SELECT policyname, command
FROM pg_policies
WHERE tablename = 'calendar_events';

-- Create policy if missing
CREATE POLICY "Allow users to insert their own events" ON public.calendar_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

## API Integration Issues

### Issue: OpenAI API rate limits
**Symptoms**: Chat responses slow or failing
**Solutions**:
1. Check API usage in OpenAI dashboard
2. Implement request queuing
3. Add retry logic with exponential backoff
4. Consider upgrading API plan

### Issue: CORS errors
**Symptoms**: API calls blocked by browser
**Solutions**:
1. Add origin to CORS allowed origins
2. Check preflight request handling
3. Verify credentials settings
4. Test with CORS browser extension (development only)

## Performance Issues

### Issue: Slow page load times
**Symptoms**: Components take long to render
**Solutions**:
1. Enable React DevTools Profiler
2. Check for unnecessary re-renders
3. Implement proper memoization
4. Optimize image loading and sizes

### Issue: Memory leaks
**Symptoms**: Browser becomes slow over time
**Solutions**:
1. Check for unsubscribed event listeners
2. Review useEffect cleanup functions
3. Monitor component mount/unmount cycles
4. Use React DevTools Memory tab

## Build & Deployment Issues

### Issue: Build failures
**Symptoms**: npm run build fails
**Solutions**:
1. Check TypeScript errors
2. Verify all imports exist
3. Review environment variables
4. Clear node_modules and reinstall

### Issue: Deployment errors
**Symptoms**: App doesn't work after deployment
**Solutions**:
1. Check environment variables are set
2. Verify build output
3. Check server logs
4. Test API endpoints individually

## Quick Diagnostic Commands

```bash
# Check package dependencies
npm ls

# Verify TypeScript compilation
npx tsc --noEmit

# Test API connectivity
curl -X GET http://localhost:8000/api/health

# Check Supabase connection
npx supabase status

# Review build output
npm run build --verbose
```

## Getting Help

1. Check browser console for errors
2. Review server logs
3. Use React DevTools for component issues
4. Check network tab for API failures
5. Consult specific troubleshooting guides:
   - [Admin Access Issues](admin-access-issues.md)
   - [API Errors](api-errors.md)
   - [Debugging Guide](debugging-guide.md)
   - [Deployment Issues](deployment-issues.md)
   - [Performance Optimization](../performance-optimization.md)
