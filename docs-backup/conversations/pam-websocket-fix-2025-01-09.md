# PAM WebSocket Connection Fix - January 9, 2025

## Session Summary
**Date**: January 9, 2025  
**Time**: ~12:00 PM UTC  
**Branch**: staging  
**Issue**: PAM WebSocket failing with 403 Forbidden errors  
**Resolution**: Fixed WebSocket URL construction to include user ID in path  

## Problem Description

The PAM AI assistant was unable to connect via WebSocket to the staging backend. The frontend diagnostic showed:
- Backend health checks passing (200 OK)
- WebSocket connections failing (403 Forbidden)
- Error message: "connection rejected (403 Forbidden)"

### Backend Logs Analysis
```
2025-08-09T08:50:25.033173658Z 203.30.15.204:0 - "WebSocket /api/v1/pam/ws?token=eyJhbGci..." 403
2025-08-09T08:50:25.033365743Z connection rejected (403 Forbidden)
```

The logs showed WebSocket requests were being sent to `/api/v1/pam/ws?token=...` without the user ID in the path.

## Root Cause Analysis

1. **Backend Expectation**: The FastAPI backend (`backend/app/api/v1/pam.py`) expects:
   ```python
   @router.websocket("/ws/{user_id}")
   ```
   This means the URL must be: `/api/v1/pam/ws/{user_id}?token=...`

2. **Frontend Issue**: The frontend was constructing URLs incorrectly:
   - The `PAM_CONFIG` in `pamService.ts` was appending `/api/v1/pam/ws` to the base URL
   - When trying to insert the user ID, it was creating malformed URLs
   - Result: `/api/v1/pam/ws?token=...` (missing user ID)

3. **Environment Variables**: All managed in Render.com, not local `.env` files

## Solution Implemented

### 1. Fixed PAM_CONFIG (src/services/pamService.ts)

**Before**:
```typescript
WEBSOCKET_ENDPOINTS: [
  import.meta.env.VITE_WEBSOCKET_URL ? `${import.meta.env.VITE_WEBSOCKET_URL}/api/v1/pam/ws` :
  import.meta.env.VITE_PAM_WEBSOCKET_URL || 
  'wss://pam-backend.onrender.com/api/v1/pam/ws',
  'wss://api.wheelsandwins.com/pam/ws',
],
```

**After**:
```typescript
WEBSOCKET_ENDPOINTS: [
  import.meta.env.VITE_WEBSOCKET_URL || 
  import.meta.env.VITE_API_BASE_URL?.replace('https:', 'wss:').replace('http:', 'ws:') ||
  import.meta.env.VITE_BACKEND_URL?.replace('https:', 'wss:').replace('http:', 'ws:') ||
  'wss://wheels-wins-backend-staging.onrender.com',
  'wss://wheels-wins-backend.onrender.com',  // Production fallback
],
```

### 2. Fixed WebSocket URL Construction

**Before**:
```typescript
// Complex logic trying to replace paths
let baseUrl = endpoint;
if (endpoint.includes('/api/v1/pam/ws')) {
  baseUrl = endpoint.replace('/api/v1/pam/ws', `/api/v1/pam/ws/${userId}`);
} else if (endpoint.includes('/pam/ws')) {
  baseUrl = endpoint.replace('/pam/ws', `/pam/ws/${userId}`);
}
```

**After**:
```typescript
// Simple, correct construction
const wsUrl = new URL(`${endpoint}/api/v1/pam/ws/${userId}`);
wsUrl.searchParams.append('token', token);
wsUrl.searchParams.append('user_id', userId);
wsUrl.searchParams.append('version', '1.0');
```

## Files Modified

1. **src/services/pamService.ts**
   - Lines 48-63: Updated PAM_CONFIG to use base URLs without path suffix
   - Lines 198-211: Simplified WebSocket URL construction

## Deployment Details

- **Commit Hash**: `875ddc3`
- **Commit Message**: "fix: resolve PAM WebSocket connection 403 errors"
- **Branch**: staging
- **Auto-Deploy**: Netlify will automatically deploy from staging branch

## Testing & Verification

### Expected Behavior After Fix:
1. WebSocket URL format: `wss://wheels-wins-backend-staging.onrender.com/api/v1/pam/ws/{user_id}?token=...`
2. Backend response: 101 Switching Protocols (successful WebSocket upgrade)
3. PAM chat functionality restored
4. No more 403 Forbidden errors in Render.com logs

### How to Verify:
1. Check Render.com backend logs for successful WebSocket connections
2. Visit https://staging-wheelsandwins.netlify.app
3. Open browser DevTools > Network tab
4. Look for WebSocket connection to confirm proper URL format
5. Test PAM chat functionality

## Key Learnings

1. **URL Construction**: Always construct WebSocket URLs cleanly rather than trying to replace parts
2. **Backend API Contract**: Ensure frontend matches exact backend expectations for URL paths
3. **Environment Variables**: When using cloud services like Render.com, environment variables are managed there, not in local `.env` files
4. **Debugging WebSocket**: Backend logs are crucial for understanding connection failures

## Related Issues

- Previous fix attempt (commit `d8aec47`) tried to add user ID but didn't fix the root cause
- The staging backend was running correctly; the issue was purely frontend URL construction
- Multiple WebSocket connection hooks exist but all use the central `pamService.ts`

## Impact

This fix restores full PAM AI assistant functionality on the staging environment, allowing:
- Real-time chat with PAM
- Voice synthesis and responses
- Trip planning assistance
- Financial management help
- All PAM-powered features

---

*Session conducted by Claude Code for Wheels & Wins project*