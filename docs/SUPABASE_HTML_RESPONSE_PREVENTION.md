# Supabase HTML Response Prevention Guide

## The Problem

**Issue:** Supabase returns HTML error pages instead of JSON responses, causing `SyntaxError: Unexpected token '<'` errors.

**Impact:** Calendar operations (delete, move, resize) appear to fail but actually succeed, requiring page reload to see changes.

**Frequency:** Recurring issue that has been fixed multiple times.

---

## Root Causes

### 1. Network/Infrastructure Issues
- **CORS redirects** - Request redirected to CORS error page
- **CDN/Proxy issues** - Netlify or Supabase CDN returns HTML error
- **SSL certificate problems** - HTTPS redirects to error pages
- **Load balancer failures** - Backend returns HTML status page

### 2. Authentication Issues
- **Expired JWT tokens** - Redirect to login page (HTML)
- **Service role vs anon key confusion** - Wrong key returns error page
- **Token malformation** - Invalid JWT triggers error redirect

### 3. Rate Limiting/Quotas
- **API rate limits exceeded** - Returns HTML "Too Many Requests" page
- **Database connection limits** - Connection pool full returns error page
- **Bandwidth quota exceeded** - Account suspended page

### 4. Server-Side Errors
- **Supabase 500 errors** - Internal server errors return HTML
- **Database downtime** - Maintenance page displayed
- **Regional outages** - Fallback error pages shown

---

## Prevention Strategy

### ✅ Immediate Fixes (Implemented)

**1. Error Detection & Handling**
- `src/utils/supabaseErrorHandler.ts` - Detects HTML responses
- `src/utils/supabaseMonitoring.ts` - Tracks error patterns
- Automatic retry logic for transient failures
- Graceful fallbacks when operations succeed despite HTML responses

**2. Enhanced Calendar Operations**
- Updated `EventHandlers.ts` with comprehensive error handling
- Retry logic with exponential backoff
- HTML response detection and assumption of success
- Better user feedback and state management

**3. Monitoring & Alerting**
- Real-time error pattern detection
- Alert when HTML response rate spikes
- Console logging with actionable insights
- Error log export for debugging

### 🛡️ Long-term Prevention

**1. Configuration Validation**
```bash
# Add to CI/CD pipeline
npm run validate:supabase-config
```

**2. Health Check Monitoring**
```typescript
// Periodic health checks
setInterval(() => checkSupabaseHealth(supabase), 60000);
```

**3. Environment Variable Validation**
```typescript
// Ensure correct URLs in all environments
const requiredVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
requiredVars.forEach(key => {
  if (!process.env[key]) throw new Error(`Missing ${key}`);
});
```

---

## Debugging When It Happens Again

### 1. Console Investigation
```javascript
// Check current error status
window.supabaseMonitor.getErrorSummary()

// Export full error log
console.log(window.supabaseMonitor.exportErrorLog())

// Check recent error patterns
window.supabaseMonitor.getRecentErrors()
```

### 2. Network Analysis
```bash
# Check if Supabase is accessible
curl -I https://kycoklimpzkyrecbjecn.supabase.co/rest/v1/profiles

# Verify CORS headers
curl -H "Origin: https://wheelsandwins.com" \
     -H "Access-Control-Request-Method: DELETE" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://kycoklimpzkyrecbjecn.supabase.co/rest/v1/calendar_events
```

### 3. Authentication Check
```javascript
// Check current user and token
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user);
console.log('JWT payload:', JSON.parse(atob(user.jwt.split('.')[1])));
```

### 4. Environment Verification
```bash
# Verify environment variables
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY

# Check if URLs are correct
grep -r "supabase" .env*
```

---

## Common Fixes

### Fix 1: Clear Browser Cache
```javascript
// Force refresh Supabase client
localStorage.removeItem('sb-kycoklimpzkyrecbjecn-auth-token');
window.location.reload();
```

### Fix 2: Verify Environment Variables
```bash
# Staging
VITE_SUPABASE_URL=https://kycoklimpzkyrecbjecn.supabase.co

# Production
VITE_SUPABASE_URL=https://kycoklimpzkyrecbjecn.supabase.co
```

### Fix 3: Check Supabase Dashboard
1. Go to https://supabase.com/dashboard/project/kycoklimpzkyrecbjecn
2. Check **Settings > API** for correct URLs
3. Verify **Database > RLS** policies are active
4. Look at **Logs** for server errors

### Fix 4: Network Troubleshooting
```bash
# Test from different network
# Check if issue is location-specific

# Verify DNS resolution
nslookup kycoklimpzkyrecbjecn.supabase.co

# Check if CDN is serving stale content
curl -H "Cache-Control: no-cache" https://kycoklimpzkyrecbjecn.supabase.co
```

---

## Incident Response Plan

### When Users Report Calendar Issues:

**Step 1: Quick Check**
```javascript
// Open browser console on affected page
window.supabaseMonitor.getRecentErrorCount()
```

**Step 2: Identify Pattern**
- HTML response errors → Network/Infrastructure issue
- Auth errors → Token expiration
- Rate limit errors → Usage spike
- Server errors → Supabase downtime

**Step 3: Apply Fix**
- **HTML responses:** Already handled automatically
- **Auth issues:** Force re-authentication
- **Rate limits:** Implement exponential backoff
- **Server errors:** Check Supabase status page

**Step 4: Monitor Recovery**
```javascript
// Watch error rate decrease
setInterval(() => console.log(window.supabaseMonitor.getRecentErrorCount()), 30000)
```

---

## Testing Prevention Measures

### Test HTML Response Handling
```javascript
// Simulate HTML response error
const mockError = {
  message: "SyntaxError: Unexpected token '<', \"<!doctype html>\" is not valid JSON"
};

// Should be detected as HTML response
import { analyzeSupabaseError } from './src/utils/supabaseErrorHandler';
console.log(analyzeSupabaseError(mockError));
```

### Test Retry Logic
```javascript
// Should retry on transient failures
await executeWithRetry(
  () => { throw new Error('Network Error'); },
  'Test Operation',
  2
);
```

### Test Monitoring Alerts
```javascript
// Should trigger alert after multiple errors
for (let i = 0; i < 6; i++) {
  supabaseMonitor.logError(mockError, 'Test Operation');
}
```

---

## Future Improvements

### 1. Circuit Breaker Pattern
- Automatically stop operations when error rate is high
- Graceful degradation during outages

### 2. Offline Mode
- Cache operations for later replay
- Local state management during disconnection

### 3. Alternative Endpoints
- Fallback to direct database connections
- Regional redundancy

### 4. Proactive Monitoring
- External uptime monitoring
- Performance degradation alerts
- Automated incident response

---

## Key Files

**Prevention:**
- `src/utils/supabaseErrorHandler.ts` - Core error handling
- `src/utils/supabaseMonitoring.ts` - Error tracking & alerting
- `src/components/you/EventHandlers.ts` - Calendar-specific fixes

**Documentation:**
- `docs/SUPABASE_HTML_RESPONSE_PREVENTION.md` - This guide
- `docs/DATABASE_SCHEMA_REFERENCE.md` - Schema documentation

**Configuration:**
- `.env` - Environment variables
- `CLAUDE.md` - Project instructions

---

**Remember:** The goal is to make the system self-healing and provide clear information when issues occur, rather than just fixing symptoms each time.