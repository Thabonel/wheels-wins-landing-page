# Backend Issues Fix Guide

## 1. PAM Conversation Storage Error

### Issue
```
Error storing conversation: {'message': 'invalid input syntax for type uuid: "default"', 'code': '22P02'}
```

### Root Cause
- The `pam_conversations` table has `session_id` as UUID type
- Frontend is sending `"default"` as the session_id
- PostgreSQL can't convert string "default" to UUID

### Solution
Run this SQL in Supabase:
```sql
ALTER TABLE public.pam_conversations 
ALTER COLUMN session_id TYPE TEXT;
```

### Alternative Backend Fix
Update `/backend/app/services/database.py` to generate a UUID for default sessions:

```python
async def store_pam_conversation(self, user_id: str, session_id: str, memory_data: dict):
    # Convert 'default' to a consistent UUID
    if session_id == "default":
        session_id = "00000000-0000-0000-0000-000000000000"
    
    # Rest of the storage logic...
```

## 2. CSRF Token Validation Error

### Issue
```
CSRF token validation error: not enough values to unpack (expected 2, got 1)
CSRF protection triggered for 203.30.15.204 on POST /api/v1/users/.../settings
```

### Root Cause
- CSRF token format is incorrect
- Token should be in format: `token_value:timestamp`
- Receiving only single value without timestamp

### Solution
Check frontend CSRF token generation in API calls.

## 3. Slow PAM Chat Response (13+ seconds)

### Issue
- PAM chat endpoint taking 13.4 seconds to respond
- OpenAI API call is the bottleneck

### Solutions
1. **Add response streaming** for faster perceived response
2. **Implement caching** for common queries
3. **Use GPT-3.5-turbo** instead of GPT-4 for faster responses
4. **Add timeout** with fallback responses

## 4. WebSocket Disconnect After 2 Seconds

### Issue
- WebSocket connects successfully but disconnects after ~2 seconds
- No error message, just connection closed

### Potential Causes
1. Frontend closing connection prematurely
2. Heartbeat/ping-pong mechanism issue
3. Token expiration or validation issue

### Debug Steps
1. Check frontend WebSocket connection code
2. Verify heartbeat messages are being sent/received
3. Check for any timeout settings

## Quick Fixes to Apply

### 1. Database Fix (Immediate)
```bash
# Run in Supabase SQL Editor
ALTER TABLE public.pam_conversations 
ALTER COLUMN session_id TYPE TEXT;
```

### 2. Backend Performance (Update backend/app/services/simple_pam.py)
```python
# Use faster model for non-critical queries
model = "gpt-3.5-turbo" if not requires_accuracy else "gpt-4"

# Add timeout
response = await openai_client.chat.completions.create(
    model=model,
    messages=messages,
    timeout=10.0  # 10 second timeout
)
```

### 3. CSRF Fix (Update backend/app/core/xss_csrf_protection.py)
```python
def validate_csrf_token(token: str) -> bool:
    try:
        # Handle both old and new token formats
        if ':' in token:
            token_value, timestamp = token.split(':', 1)
        else:
            # Fallback for old format
            token_value = token
            timestamp = str(int(time.time()))
        
        # Rest of validation...
    except Exception as e:
        logger.warning(f"CSRF validation error: {e}")
        return False
```

## Monitoring Commands

Check backend logs:
```bash
# View recent errors
curl https://pam-backend.onrender.com/api/v1/monitoring/errors

# Check WebSocket connections
curl https://pam-backend.onrender.com/api/v1/monitoring/websockets

# View slow queries
curl https://pam-backend.onrender.com/api/v1/monitoring/slow-queries
```

## Priority Order
1. ✅ Fix database session_id type (prevents data loss)
2. ⚠️ Fix CSRF validation (improves security)
3. 🐌 Optimize PAM response time (UX improvement)
4. 🔌 Debug WebSocket disconnections (stability)