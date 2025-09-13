# Staging CORS Issue Report - PAM Backend Connection Failure

**Date**: September 13, 2025  
**Environment**: Staging (`wheels-wins-staging.netlify.app`)  
**Issue**: PAM Chat functionality failing with CORS errors  
**Status**: FIX IMPLEMENTED - awaiting deployment verification  

## Executive Summary

The staging environment is experiencing persistent CORS (Cross-Origin Resource Sharing) errors where the frontend is attempting to connect to the production backend instead of the staging backend. This occurs despite correct environment variable configuration and multiple deployment attempts with cache clearing.

## Error Details

### Primary Error Message
```
4. PAM Chat Functionality
error
Network error: Cannot connect to PAM backend. Check if backend is running.
Error: {"message":"Failed to fetch","type":"network"}
```

### Browser Console Errors
```javascript
pamHealthCheck.ts:31 🏥 Checking PAM health: https://pam-backend.onrender.com/api/v1/pam/health
PAMConnectionDiagnostic.tsx:263 🔐 Testing PAM chat with user: thabonel0@gmail.com
PAMConnectionDiagnostic.tsx:264 🌐 Using optimized authentication system (reference tokens or standard JWTs)
PAMConnectionDiagnostic.tsx:269 🌐 DIAGNOSTIC: Sending PAM chat test to: /api/v1/pam/chat
PAMConnectionDiagnostic.tsx:270 🔐 DIAGNOSTIC: Using optimized authentication (reference tokens or JWT)

// CORS ERROR:
Access to fetch at 'https://pam-backend.onrender.com/api/v1/pam/chat' from origin 'https://wheels-wins-staging.netlify.app' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: It does not have HTTP ok status.

api.ts:64  POST https://pam-backend.onrender.com/api/v1/pam/chat net::ERR_FAILED
```

## Environment Configuration Analysis

### Staging Environment Variables (Netlify)
**Current Configuration** (as of Sept 13, 2025):
```bash
VITE_BACKEND_URL=https://wheels-wins-backend-staging.onrender.com
VITE_PAM_WEBSOCKET_URL=wss://wheels-wins-backend-staging.onrender.com/api/v1/pam/ws
VITE_SUPABASE_URL=https://kycoklimpzkyrecbjecn.supabase.co
VITE_SUPABASE_ANON_KEY=****************V2EA
VITE_MAPBOX_PUBLIC_TOKEN=****************WygA
VITE_MAPBOX_PUBLIC_TOKEN_MAIN=pk.eyJ1IjoidGhhYm9uZWwiLCJhIjoiY204d3lwMnhwMDBmdTJqb2JsdWgzdmZ2YyJ9.0wyj48txMJAJht1kYfyOdQ
```

**✅ CORRECT**: Environment variables point to staging backend  
**❌ PROBLEM**: Code is ignoring these variables and defaulting to production URLs

## System Architecture

### Expected Behavior
```
Staging Frontend (wheels-wins-staging.netlify.app)
    ↓ SHOULD CONNECT TO
Staging Backend (wheels-wins-backend-staging.onrender.com)
```

### Actual Behavior  
```
Staging Frontend (wheels-wins-staging.netlify.app)
    ↓ INCORRECTLY CONNECTING TO
Production Backend (pam-backend.onrender.com)
    ↓ RESULT
CORS Policy Violation (403/Blocked)
```

## Code Analysis

### URL Resolution Logic (`src/services/api.ts`)
```typescript
const getApiBaseUrl = () => {
  // Check for explicit API URL first
  if (import.meta.env.VITE_API_URL) {
    console.log('🔧 Using VITE_API_URL:', import.meta.env.VITE_API_URL);
    return import.meta.env.VITE_API_URL;
  }
  
  // Check for explicit backend URL
  if (import.meta.env.VITE_BACKEND_URL) {
    console.log('🔧 Using VITE_BACKEND_URL:', import.meta.env.VITE_BACKEND_URL);
    return import.meta.env.VITE_BACKEND_URL;
  }
  
  // Auto-detect based on current domain for staging vs production
  const currentDomain = window.location.hostname;
  console.log('🔧 Detecting domain:', currentDomain);
  
  if (currentDomain.includes('staging') || currentDomain.includes('netlify')) {
    console.log('🔧 Staging detected - using staging backend');
    return 'https://wheels-wins-backend-staging.onrender.com';
  }
  
  console.log('🔧 Production detected - using production backend');
  return 'https://pam-backend.onrender.com';
};

export const API_BASE_URL = getApiBaseUrl();
```

**Expected Console Output** (if working correctly):
```
🔧 Using VITE_BACKEND_URL: https://wheels-wins-backend-staging.onrender.com
```

**OR**
```
🔧 Detecting domain: wheels-wins-staging.netlify.app
🔧 Staging detected - using staging backend
```

### PAM Connection Service (`src/services/pamConnectionService.ts`)
```typescript
// Backend URLs in priority order - Updated to prioritize working staging server
private backends = [
  import.meta.env.VITE_BACKEND_URL || 'https://wheels-wins-backend-staging.onrender.com',
  import.meta.env.VITE_API_URL || 'https://wheels-wins-backend-staging.onrender.com', 
  'https://wheels-wins-backend-staging.onrender.com',
  'https://pam-backend.onrender.com'  // Production fallback
].filter(Boolean);
```

**✅ CORRECT**: Service configured to prioritize staging backend

## Troubleshooting Steps Taken

### 1. Environment Variable Verification
- ✅ Confirmed `VITE_BACKEND_URL` set to staging URL
- ✅ Confirmed `VITE_PAM_WEBSOCKET_URL` set to staging WebSocket URL
- ✅ No `VITE_API_URL` variable that could override

### 2. Deployment Actions
- ✅ Cleared Netlify build cache
- ✅ Triggered fresh deployment
- ✅ Verified latest code deployed to staging branch
- ✅ Added debugging console logs to track URL selection

### 3. Code Updates
- ✅ Added comprehensive debugging logs to `api.ts`
- ✅ Committed and pushed debugging changes to staging branch
- ✅ Verified staging branch has correct URL detection logic

### 4. Backend Verification
- ✅ Confirmed staging backend is running at `wheels-wins-backend-staging.onrender.com`
- ✅ Confirmed production backend is running at `pam-backend.onrender.com`

## Diagnostic Questions for Investigation

### Critical Questions to Answer:
1. **What console logs appear** when accessing `wheels-wins-staging.netlify.app`?
   - Are the debugging logs from `api.ts` visible?
   - Which URL selection path is being taken?

2. **Build-time vs Runtime**: 
   - Is `API_BASE_URL` being resolved at build time or runtime?
   - Are environment variables available during the build process?

3. **Component-level bypassing**:
   - Are some PAM components bypassing the `api.ts` URL resolution?
   - Is there direct URL hardcoding in diagnostic components?

4. **Caching issues**:
   - Is the browser caching old JavaScript bundles?
   - Is Netlify CDN serving stale builds despite cache clear?

## Technical Investigation Areas

### 1. Build Process Analysis
Check if environment variables are properly injected during Vite build:
```bash
# In Netlify build logs, look for:
VITE_BACKEND_URL=https://wheels-wins-backend-staging.onrender.com
```

### 2. Bundle Analysis
Examine if the final JavaScript bundle contains hardcoded production URLs:
```bash
# Search built files for production URLs
grep -r "pam-backend.onrender.com" dist/
```

### 3. Runtime Environment Check
Add runtime debugging to verify environment variables:
```javascript
console.log('Runtime env check:', {
  VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
  VITE_API_URL: import.meta.env.VITE_API_URL,
  hostname: window.location.hostname,
  API_BASE_URL: API_BASE_URL
});
```

### 4. Component-specific URL Usage
Audit all PAM-related components for direct URL usage:
```bash
# Search for hardcoded production URLs
grep -r "pam-backend.onrender.com" src/
```

## Potential Root Causes

### Theory 1: Build-time Environment Variable Issue
- Environment variables not available during Vite build process
- `import.meta.env.VITE_BACKEND_URL` resolving to `undefined`
- Code falling back to domain detection, but domain detection failing

### Theory 2: Component-level Bypass
- Some PAM components directly using production URLs
- Diagnostic components not using the centralized `api.ts` configuration
- Health check components hardcoded to production endpoints

### Theory 3: Deployment/Caching Issue
- Netlify not properly injecting environment variables into build
- CDN serving cached version despite cache clear
- JavaScript bundle containing hardcoded URLs from previous builds

### Theory 4: Module Resolution Issue
- `API_BASE_URL` constant resolved at module load time
- Environment variables not available when module initializes
- Need to use function-based URL resolution instead of constant

## Recommended Next Steps

### Immediate Debugging
1. **Check console logs** on `wheels-wins-staging.netlify.app` for debugging output
2. **Inspect Network tab** to see exact URLs being called
3. **Check Netlify build logs** for environment variable injection

### Code Investigation
1. **Add runtime environment debugging** to verify variable availability
2. **Audit all PAM components** for direct URL usage
3. **Check module initialization order** for environment variable access

### Alternative Approaches
1. **Function-based URL resolution**: Replace `API_BASE_URL` constant with function calls
2. **Explicit staging override**: Add staging-specific URL configuration
3. **Build-time verification**: Add checks to ensure environment variables are injected

## Files Requiring Investigation

### Primary Files
- `src/services/api.ts` - Main URL resolution logic
- `src/services/pamConnectionService.ts` - PAM backend connection
- `src/services/pamAgenticService.ts` - Agentic orchestrator service

### Component Files  
- `src/components/pam/PAMConnectionDiagnostic.tsx` - Diagnostic component showing errors
- `src/services/pamHealthCheck.ts` - Health check service
- Any component importing `API_BASE_URL` directly

### Configuration Files
- `vite.config.ts` - Build configuration
- `netlify.toml` - Netlify deployment configuration
- Environment variable configuration in Netlify dashboard

## Success Criteria

### When Issue is Resolved:
1. ✅ Console shows staging backend URL selection
2. ✅ No CORS errors in browser console  
3. ✅ PAM chat functionality works on staging
4. ✅ All network requests go to `wheels-wins-backend-staging.onrender.com`
5. ✅ Trip Planner and other Wheels components function properly

---

## SOLUTION IMPLEMENTED (September 13, 2025)

### Root Cause Identified
The issue was in the `netlify.toml` file which had a **global** `VITE_BACKEND_URL` set to production URL (`https://pam-backend.onrender.com`) that was overriding all other environment variable configurations.

### Fix Applied
1. **Removed global environment variable override** from `netlify.toml`
2. **Added context-specific configurations**:
   - `[context.production]` → Uses production backend
   - `[context.branch-deploy]` → Uses staging backend for staging branch
   - `[context.deploy-preview]` → Uses staging backend for PR previews
3. **Simplified URL resolution logic** in `src/services/api.ts` to rely purely on environment variables
4. **Added comprehensive debugging** to track URL resolution in browser console

### Expected Result
- Staging site (`wheels-wins-staging.netlify.app`) will now connect to staging backend (`wheels-wins-backend-staging.onrender.com`)
- Production site (`wheelsandwins.com`) will continue to connect to production backend (`pam-backend.onrender.com`)
- Browser console will show debugging logs confirming correct URL selection

### Verification Steps
1. Wait for Netlify staging deployment to complete
2. Check browser console on `wheels-wins-staging.netlify.app` for debug logs
3. Test PAM Chat functionality - should work without CORS errors
4. Verify all network requests go to staging backend URLs

### Deployment Status
✅ Code changes committed and pushed to staging branch  
⏳ Awaiting Netlify deployment completion  
⏳ Testing and verification pending