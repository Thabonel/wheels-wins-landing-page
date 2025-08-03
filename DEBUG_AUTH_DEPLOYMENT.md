# Debug Guide: PAM Authentication Deployment

## Quick Checks

### 1. Verify New Deployment
Visit: `https://your-app-url.netlify.app/auth-check.html`
- If this page loads, the new deployment is live
- If 404, deployment hasn't completed yet

### 2. Check Current Token Being Sent
1. Open your app in browser
2. Open DevTools → Network tab
3. Filter by "WS" (WebSocket)
4. Look for `/api/v1/pam/ws?token=...`
5. Check the token parameter:
   - ❌ UUID: `21a2151a-cd37-41d5-a1c7-124bb05e7a6a` (36 chars)
   - ✅ JWT: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (100+ chars with dots)

### 3. Browser Console Tests
```javascript
// Quick auth check
window.quickAuthCheck()

// Should return something like:
{
  isAuthenticated: true,
  hasValidToken: true,
  tokenExpiresIn: 55, // minutes
  issues: []
}

// Full test suite
window.authTestSuite.runFullTestSuite()

// Should show: "7/7 tests passed"
```

## Backend UUID Compatibility

The backend currently accepts both JWT and UUID tokens:

### Current Backend Behavior
1. Receives token from WebSocket URL
2. First tries to decode as JWT
3. If JWT decode fails, checks if it's a UUID
4. Accepts UUID with warning (temporary compatibility)

### Backend Logs Interpretation

#### ❌ Still Using Old Code (UUID)
```
"token=21a2151a-cd37-41d5-a1c7-124bb05e7a6a"
"JWT decode failed: Not enough segments"
"WebSocket authentication failed: 401: Invalid JWT format"
```

#### ✅ Using New Code (JWT)
```
"token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
"WebSocket authenticated for user: [user-id]"
"Using JWT authentication"
```

#### ⚠️ Temporary Compatibility Mode
```
"Using legacy user ID authentication for WebSocket"
"WebSocket authenticated (UUID compatibility mode)"
```

## Deployment Checklist

- [ ] Pushed code to GitHub
- [ ] Netlify build started
- [ ] Build completed successfully
- [ ] auth-check.html accessible
- [ ] WebSocket using JWT tokens
- [ ] Backend logs show JWT auth
- [ ] No authentication loops

## Force Deployment Options

### 1. Via Netlify Dashboard
1. Go to Deploys tab
2. Click "Trigger deploy" → "Deploy site"

### 2. Clear Cache and Deploy
1. Site settings → Build & deploy
2. "Clear cache and deploy site"

### 3. Check Build Logs
1. Look for recent commits in build
2. Verify no build errors
3. Check environment variables are set

## Environment Variables to Verify

In Netlify dashboard, ensure these are set:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_MAPBOX_TOKEN`

## Testing WebSocket Manually

```javascript
// In browser console after logging in
async function testWebSocket() {
  const { data: { session } } = await window.supabase.auth.getSession();
  console.log('Session:', session);
  console.log('Access Token:', session?.access_token);
  console.log('Token length:', session?.access_token?.length);
  
  // Check what's being sent
  const wsUrl = `wss://pam-backend.onrender.com/api/v1/pam/ws?token=${session?.access_token}`;
  console.log('WebSocket URL:', wsUrl);
  console.log('Token in URL:', new URL(wsUrl).searchParams.get('token'));
}

testWebSocket();
```

## Current Status Summary

1. **Code**: ✅ Fixed and committed
2. **Repository**: ✅ Pushed to GitHub  
3. **Deployment**: ⏳ Waiting for Netlify
4. **Backend**: ✅ Ready with compatibility layer
5. **Production**: ❌ Still using old code (UUID)

Once the deployment completes and auth-check.html is accessible, the JWT authentication should start working immediately.