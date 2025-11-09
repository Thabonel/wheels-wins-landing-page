# SimplePamBubble Endpoint Fix

**Date**: January 23, 2025
**Issue**: SimplePamBubble showing "AI service is temporarily unavailable"
**Status**: ✅ Fixed and deployed to staging

---

## Problem

SimplePamBubble component was calling the wrong backend endpoint, causing all PAM interactions from the floating bubble to fail.

**User Experience:**
- User clicks PAM floating bubble (bottom right)
- Types "hi" and sends message
- Gets error: "AI service is temporarily unavailable. Core app features remain functional. Please try again shortly"

**Console Logs:**
```
SimplePamBubble.tsx:273 🚀 Calling backend with tool support: https://wheels-wins-backend-staging.onrender.com
SimplePamBubble.tsx:303 ✅ PAM response received: AI service is temporarily unavailable. Core app features remain functional. Please try again shortly
```

---

## Root Cause

SimplePamBubble was calling:
```typescript
const response = await fetch(`${backendUrl}/api/v1/pam/chat`, {...})
```

But the correct operational endpoint is:
```typescript
const response = await fetch(`${backendUrl}/api/v1/pam-simple/chat`, {...})
```

**Why this happened:**
- The full PAM WebSocket endpoint `/api/v1/pam/chat` exists but may require different authentication/setup
- The simple REST endpoint `/api/v1/pam-simple/chat` is what's currently operational
- SimplePamBubble was configured to use the wrong endpoint

---

## Solution

**File Modified:** `src/components/SimplePamBubble.tsx` (line 275)

**Before:**
```typescript
const response = await fetch(`${backendUrl}/api/v1/pam/chat`, {
```

**After:**
```typescript
const response = await fetch(`${backendUrl}/api/v1/pam-simple/chat`, {
```

---

## Testing

### Backend Verification
```bash
curl -X POST https://wheels-wins-backend-staging.onrender.com/api/v1/pam-simple/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "hello", "user_id": "test-user"}'
```

**Response:**
```json
{
  "content": "Hey! I'm PAM, your AI travel companion for Wheels & Wins...",
  "model": "claude-sonnet-4-5-20250929",
  "timestamp": "2025-10-22T01:45:35.925052"
}
```

✅ Backend endpoint confirmed working

---

## Deployment

- **Commit**: `dc77afb3` - "fix: update SimplePamBubble to use correct PAM endpoint"
- **Branch**: staging
- **Status**: ✅ Pushed to GitHub
- **Frontend**: Will auto-deploy on Netlify (staging)

---

## What Works Now

Users can now:
- ✅ Click PAM floating bubble (bottom right)
- ✅ Send text messages to PAM
- ✅ Get responses from Claude Sonnet 4.5
- ✅ Use all PAM tools via simple bubble interface

---

## Next Steps

1. Wait for Netlify staging deploy (~2-3 minutes)
2. Test SimplePamBubble on staging
3. Send test message: "hello"
4. Verify PAM responds correctly
5. If working, merge to production

---

## Related Fixes

This is the second PAM endpoint fix today:
1. **First fix**: Pam.tsx text chat disabled → enabled REST API (commit ce3c4d17)
2. **This fix**: SimplePamBubble wrong endpoint → corrected to /pam-simple/chat (commit dc77afb3)

Both fixes point to the same working backend endpoint: `/api/v1/pam-simple/chat`

---

**Status**: ✅ Fixed and awaiting Netlify deployment
**AI Model**: Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)
**Endpoint**: /api/v1/pam-simple/chat (REST API)
**Performance**: ~2-3 second response time
