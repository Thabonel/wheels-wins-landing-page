# TEMPORARY UUID Compatibility Layer

## Status: ACTIVE (August 3, 2025)

### Purpose
Restore PAM functionality while waiting for frontend deployment to complete. The frontend is still sending UUID tokens instead of JWT tokens, causing complete authentication failure.

### What This Does
- Accepts UUID tokens as temporary authentication
- Converts UUID to mock user payload
- Logs warnings for monitoring
- Allows PAM to function during deployment transition

### Files Modified
1. `backend/app/api/deps.py` - Added UUID fallback in JWT verification
2. `backend/app/api/deps_uuid_compat.py` - UUID validation logic (new file)

### When to Remove
Remove this compatibility layer once:
1. Frontend deployment completes (check for `/auth-check.html`)
2. Backend logs show JWT tokens being received
3. No more UUID authentication warnings in logs

### Removal Steps
1. Delete `backend/app/api/deps_uuid_compat.py`
2. Remove UUID fallback code from `deps.py` (both async and sync functions)
3. Deploy backend without UUID support

### Security Note
This is a TEMPORARY measure. UUID tokens are not secure for production use. They:
- Don't expire
- Can't be revoked
- Don't contain user claims
- Are predictable if exposed

### Monitoring
Look for these log messages:
- `⚠️ TEMPORARY: Accepting UUID token for user...` - UUID auth being used
- `🔐 Supabase JWT decoded successfully` - Proper JWT auth working

Once you see only JWT success messages, the frontend has been deployed and this compatibility can be removed.