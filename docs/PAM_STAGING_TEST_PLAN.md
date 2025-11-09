# PAM Staging Test Plan

**Date**: January 23, 2025
**Environment**: Staging (https://wheels-wins-staging.netlify.app)
**Backend**: https://wheels-wins-backend-staging.onrender.com
**Status**: Ready for Testing

---

## Backend Verification ✅

### Endpoint Test
```bash
curl -X POST https://wheels-wins-backend-staging.onrender.com/api/v1/pam-simple/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test message", "user_id": "test-123"}'
```

**Response**:
```json
{
  "content": "Hey there! I'm PAM, your AI travel companion...",
  "model": "claude-sonnet-4-5-20250929",
  "timestamp": "2025-10-22T00:58:31.299644"
}
```

✅ **Backend Status**: WORKING

---

## Frontend Test Checklist

### 1. Login and Access PAM
- [ ] Go to https://wheels-wins-staging.netlify.app
- [ ] Login with your account
- [ ] Click PAM chat icon (bottom right or sidebar)
- [ ] Verify PAM chat opens

### 2. Send Basic Message
- [ ] Type: "hello"
- [ ] Click Send or press Enter
- [ ] Verify you see "PAM is thinking..." indicator
- [ ] Verify PAM responds with greeting
- [ ] Response should mention Claude Sonnet 4.5

### 3. Test Budget Features
- [ ] Send: "add $50 gas expense"
- [ ] Verify PAM confirms expense was added
- [ ] Send: "show my expenses"
- [ ] Verify PAM shows expense data

### 4. Test Trip Planning
- [ ] Send: "what's the weather like?"
- [ ] Verify PAM provides weather info
- [ ] Send: "find campgrounds near me"
- [ ] Verify PAM responds (may ask for location)

### 5. Test Calendar Features
- [ ] Send: "add appointment for tomorrow at 3pm"
- [ ] Verify PAM creates calendar event
- [ ] Check if calendar reloads automatically

### 6. Error Handling
- [ ] Disconnect internet
- [ ] Try sending a message
- [ ] Verify error message appears
- [ ] Reconnect internet
- [ ] Verify can send messages again

---

## Expected Behavior

### ✅ Success Indicators
- PAM responds within 2-3 seconds
- Responses are natural and helpful
- No "text chat disabled" message
- Calendar events are created
- Expenses are tracked
- Weather information is provided

### ❌ Failure Indicators
- "Text chat is disabled" message
- Long loading times (>10 seconds)
- Connection errors
- Blank responses
- TypeScript errors in console

---

## Browser Console Checks

Open browser console (F12) and look for:

### Good Logs
```
💬 Sending message via simple REST API
✅ PAM REST API response received successfully
```

### Bad Logs (Should NOT see these)
```
❌ Failed to send message
⚠️ Text chat disabled
WebSocket connection failed
```

---

## Quick Test Commands

### Test 1: Basic Chat
```
User: hello
Expected: Friendly greeting mentioning PAM features
```

### Test 2: Budget Tool
```
User: add $50 gas expense
Expected: "I've added a $50 gas expense to your budget"
```

### Test 3: Weather
```
User: what's the weather?
Expected: Weather information (or request for location)
```

### Test 4: Calendar
```
User: add appointment tomorrow 3pm
Expected: "I've added an appointment..." + calendar reloads
```

---

## If All Tests Pass

1. ✅ Confirm staging works perfectly
2. ✅ Merge staging → main:
   ```bash
   git checkout main
   git merge staging
   git push origin main
   ```
3. ✅ Wait for production deploy (~2-3 minutes)
4. ✅ Test on production: https://wheelsandwins.com

---

## If Any Tests Fail

1. ❌ Note which test failed
2. ❌ Check browser console for errors
3. ❌ Report issue with:
   - What you typed
   - What you expected
   - What actually happened
   - Any console errors

---

## Current Code Status

- **Commit**: `ce3c4d17` - "fix: enable PAM text chat for production customers"
- **Branch**: staging
- **Build**: ✅ Successful
- **TypeScript**: ✅ No errors
- **Backend**: ✅ Healthy

---

## Next Steps After Testing

### If Staging Works:
1. Merge to main
2. Deploy to production
3. Monitor production for 10-15 minutes
4. Test with real customer account
5. Announce to customers

### If Staging Has Issues:
1. Document the issues
2. Fix the code
3. Re-test on staging
4. Repeat until working

---

**Test Start Time**: _____________
**Test End Time**: _____________
**Result**: ⬜ PASS ⬜ FAIL
**Notes**:

---

**Tester Signature**: _____________
**Date**: _____________
