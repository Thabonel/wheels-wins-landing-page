
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
