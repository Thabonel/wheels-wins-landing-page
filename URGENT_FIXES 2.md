# 🚨 URGENT CODE FIXES - January 9, 2025

## 🎯 **Identified Issues from Backend Logs**:

1. **WebSocket 403 Forbidden**: `/api/v1/pam/ws?token=...` returning 403
2. **CORS OPTIONS 400**: Preflight requests failing with 400 status
3. **Database Permissions**: `permission denied for table income_entries`

---

## 🔧 **Fix #1: WebSocket Path Mismatch**

**Problem**: Backend expects `/ws/{user_id}` but frontend calls `/ws`

**Backend Route** (in `backend/app/api/v1/pam.py`):
```python
@router.websocket("/ws/{user_id}")  # Expects user_id in path
```

**Frontend Issue** (needs to be checked):
Frontend might be calling `/api/v1/pam/ws` instead of `/api/v1/pam/ws/{user_id}`

**Fix**: Update frontend WebSocket connection to include user_id in URL

---

## 🔧 **Fix #2: CORS OPTIONS 400 Error**

**Problem**: CORS middleware in `backend/app/core/cors_middleware.py` is returning 400 for OPTIONS

**Root Cause**: Line 89 in cors_middleware.py:
```python
if response.status_code in [400, 404, 405]:  # Treats 400 as missing OPTIONS handler
    # Provides fallback OPTIONS response
```

**Issue**: The fallback might not be working correctly for staging domain.

**Quick Fix**: 
1. Check if staging domain is in allowed origins
2. Verify CORS middleware is properly configured in main.py
3. Add debugging to see why OPTIONS requests fail

---

## 🔧 **Fix #3: Database RLS Permissions**

**Problem**: `permission denied for table income_entries`

**Root Cause**: Row Level Security policies on Supabase tables are broken

**Fix**: Update RLS policies for staging environment

---

## ⚡ **IMMEDIATE ACTIONS NEEDED**:

### **Action 1: Fix WebSocket URL Construction**

Check/update the frontend WebSocket connection in these files:
- `src/hooks/usePamWebSocket.ts`
- `src/hooks/usePamWebSocketConnection.ts` 
- `src/services/api.ts`

**Current Issue**: Frontend logs show:
```
WebSocket connection to 'wss://wheels-wins-backend-staging.onrender.com/api/v1/pam/ws?token=...' failed
```

**Should be**:
```
wss://wheels-wins-backend-staging.onrender.com/api/v1/pam/ws/{user_id}?token=...
```

### **Action 2: Fix CORS Configuration**

**Backend main.py** line 14-15:
```python
cors_origins = "https://staging-wheelsandwins.netlify.app,https://wheels-wins-staging.netlify.app"
os.environ["CORS_ALLOWED_ORIGINS"] = cors_origins
```

**Verify**: Check if `wheels-wins-staging.netlify.app` is the correct staging domain

### **Action 3: Database RLS Policies** 

Run these SQL commands in Supabase SQL editor:

```sql
-- Fix income_entries permissions
DROP POLICY IF EXISTS "income_entries_policy" ON income_entries;
CREATE POLICY "income_entries_policy" ON income_entries
  FOR ALL USING (auth.uid() = user_id);

-- Enable RLS
ALTER TABLE income_entries ENABLE ROW LEVEL SECURITY;
```

---

## 🛠️ **Code Changes Needed**:

### **Fix WebSocket Connection (High Priority)**

File: `src/hooks/usePamWebSocket.ts` or similar

**Current code** (incorrect):
```typescript
const wsUrl = `${baseWsUrl}/api/v1/pam/ws?token=${token}`;
```

**Fixed code**:
```typescript
const wsUrl = `${baseWsUrl}/api/v1/pam/ws/${userId}?token=${token}`;
```

### **Fix CORS Debugging (Medium Priority)**

Add debugging to backend CORS middleware to see why OPTIONS fails.

### **Fix Error Boundaries (Medium Priority)**

The React error boundary is catching crashes - add better error handling for network failures.

---

## 🧪 **Test After Fixes**:

1. **WebSocket Test**: Should connect without 403 errors
2. **CORS Test**: OPTIONS requests should return 200, not 400
3. **Database Test**: Income data should load without permission errors
4. **PAM Test**: Talk bubble should appear and function

---

**Next Action**: Fix the WebSocket URL construction first - that's the main issue breaking the site!**