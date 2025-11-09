# PAM WebSocket Disconnection Diagnostic - January 11, 2025

## Problem Summary

PAM WebSocket connections are immediately disconnecting with error code 1005 (clean close, no status) in a continuous retry loop on staging environment.

### Error Pattern
```
✅ PAM 2.0 WebSocket connected
✅ Ping/pong keepalive started (ping: 20s, timeout: 10s)
🔌 PAM 2.0 WebSocket disconnected: 1005
🔄 Retrying PAM 2.0 WebSocket connection in 2000ms (attempt 1/5)
[Infinite loop repeats]
```

## Investigation Findings

### 1. WebSocket Connection Flow Analysis

**Frontend** (`src/services/pamService.ts`):
- ✅ Connects to: `wss://wheels-wins-backend-staging.onrender.com/api/v1/pam/ws/{user_id}?token={jwt}`
- ✅ Successfully establishes connection (logs: "✅ PAM 2.0 WebSocket connected")
- ✅ Starts ping/pong keepalive (20s interval, 10s timeout)
- ✅ Properly handles backend ping messages (sends pong response)
- ✅ Properly handles backend pong messages (updates last pong time)
- ❌ Connection closes immediately with code 1005 (no reason provided)

**Backend** (`backend/app/api/v1/pam_main.py`):
- ✅ WebSocket endpoint registered at `/api/v1/pam/ws/{user_id}`
- ✅ Accepts connection first (line 532): `await websocket.accept()`
- ✅ Validates JWT token (lines 552-590)
- ✅ Registers connection with manager (line 598)
- ✅ Starts backend keepalive (25s ping interval, 20s pong timeout)
- ✅ Sends welcome message (lines 616-622)
- ❓ **Potential issue**: Orchestrator dependency injection (line 517)

### 2. Root Cause Analysis

**Code 1005 (No Status Received)** typically occurs when:
1. Server crashes/errors during early processing
2. Network disruption (but happening consistently = unlikely)
3. Load balancer timeout (but too fast = unlikely)
4. Dependency initialization failure

**Most Likely Cause**: PAM Orchestrator Initialization Failure

```python
# backend/app/api/v1/pam_main.py:512-518
@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    token: str = Query(...),
    orchestrator = Depends(get_pam_orchestrator),  # ← THIS DEPENDENCY
    db = Depends(get_database)
):
```

The `get_pam_orchestrator()` dependency:
- Calls `get_enhanced_orchestrator()` (backend/app/api/deps.py:113)
- Checks if orchestrator is initialized (backend/app/services/pam/enhanced_orchestrator.py:2068)
- If not initialized, calls `enhanced_orchestrator.initialize()` (line 2069)
- Initialization includes:
  - AI Orchestrator setup (OpenAI + Anthropic)
  - Tool registry initialization
  - Database service setup
  - Memory management setup

**If any of these fail**, the WebSocket connection could close with error code 1005.

### 3. Evidence Supporting This Theory

1. **Connection succeeds initially** - Frontend logs "✅ PAM 2.0 WebSocket connected"
2. **Closes almost immediately** - Before first ping (20s interval)
3. **No reason provided** - Code 1005 means server closed without sending close frame
4. **Consistent pattern** - Happens every time (not intermittent network issue)
5. **Backend is healthy** - `/api/health` endpoint returns 200 OK
6. **Recent changes** - Gemini model initialization was just fixed (commit 30078078)

## Diagnostic Steps

### Step 1: Check Render Backend Logs (IMMEDIATE)

```bash
# Login to Render dashboard
# Navigate to: wheels-wins-backend-staging service
# View logs for errors during WebSocket connection

# Look for:
# - "PAM orchestrator dependency error"
# - "❌ Enhanced PAM Orchestrator initialization error"
# - "❌ AI Orchestrator initialization failed"
# - Any errors immediately after "✅ WebSocket connection accepted"
```

### Step 2: Check Orchestrator Health Endpoint

```bash
curl https://wheels-wins-backend-staging.onrender.com/api/v1/pam/health
# Should return: {"status": "healthy", ...}

# If unhealthy, check what's failing
```

### Step 3: Test Simple PAM Endpoint (Bypass Orchestrator)

```bash
# Test if simple PAM chat works (uses simpler dependencies)
curl -X POST https://wheels-wins-backend-staging.onrender.com/api/v1/pam-simple/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test-user", "message": "Hello PAM"}'

# If this works, problem is definitely in enhanced orchestrator
```

## Potential Solutions

### Solution 1: Add Error Logging to WebSocket Handler

Add detailed logging to catch orchestrator errors:

```python
# backend/app/api/v1/pam_main.py - around line 517

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    token: str = Query(...),
):
    """WebSocket endpoint with error handling"""
    connection_id = str(uuid.uuid4())

    try:
        # Accept connection first
        await websocket.accept()
        logger.info(f"✅ WebSocket accepted for user: {user_id}")

        # Get dependencies manually with error handling
        try:
            orchestrator = await get_pam_orchestrator()
            logger.info(f"✅ Orchestrator ready for user: {user_id}")
        except Exception as orch_error:
            logger.error(f"❌ ORCHESTRATOR ERROR for {user_id}: {orch_error}")
            await websocket.close(code=1011, reason=f"Orchestrator initialization failed: {str(orch_error)}")
            return

        try:
            db = await get_database()
            logger.info(f"✅ Database ready for user: {user_id}")
        except Exception as db_error:
            logger.error(f"❌ DATABASE ERROR for {user_id}: {db_error}")
            await websocket.close(code=1011, reason=f"Database initialization failed: {str(db_error)}")
            return

        # Continue with normal WebSocket flow...

    except Exception as e:
        logger.error(f"❌ WebSocket setup error for {user_id}: {type(e).__name__}: {str(e)}")
        logger.exception("Full traceback:")
        await websocket.close(code=1011, reason=str(e))
```

### Solution 2: Use Lazy Orchestrator Initialization

Instead of dependency injection, initialize orchestrator after connection:

```python
@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    token: str = Query(...),
):
    """WebSocket endpoint with lazy init"""
    await websocket.accept()

    # Initialize orchestrator AFTER accepting connection
    # This way errors can be sent to client
    try:
        orchestrator = await get_pam_orchestrator()
    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "error": f"PAM initialization failed: {str(e)}"
        })
        await websocket.close(code=1011, reason=str(e))
        return

    # Continue...
```

### Solution 3: Fallback to Simple PAM Service

If enhanced orchestrator keeps failing, use the simple PAM service:

```python
# backend/app/api/v1/pam_main.py

from app.services.pam.simple_pam_service import get_pam_instance

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    token: str = Query(...),
):
    """WebSocket with simple PAM fallback"""
    await websocket.accept()

    try:
        # Try enhanced orchestrator first
        orchestrator = await get_pam_orchestrator()
    except Exception as enhanced_error:
        logger.warning(f"Enhanced orchestrator failed, using simple PAM: {enhanced_error}")
        # Fallback to simple PAM
        orchestrator = get_pam_instance(user_id)

    # Continue...
```

## Immediate Action Items

1. ✅ **Check Render logs** - Identify exact error during WebSocket initialization
2. ⏸️ **Test simple PAM endpoint** - Verify if it's orchestrator-specific issue
3. ⏸️ **Add error logging** - Implement Solution 1 to capture errors
4. ⏸️ **Deploy fix** - Once error identified, implement appropriate solution
5. ⏸️ **Test WebSocket** - Verify fix works on staging

## Technical Notes

### Backend Health Status
- **Status**: ✅ Healthy (uptime: 71454 seconds)
- **CPU**: 65.1%
- **Memory**: 61.4%
- **Active Connections**: 0 (should show connections if WebSocket was stable)

### Frontend Configuration
- **Environment**: Staging
- **WebSocket URL**: `wss://wheels-wins-backend-staging.onrender.com/api/v1/pam/ws`
- **Ping Interval**: 20 seconds
- **Pong Timeout**: 10 seconds
- **Reconnect Attempts**: 5
- **Reconnect Delay**: 2 seconds (exponential backoff)

### Backend Configuration
- **WebSocket Route**: `/api/v1/pam/ws/{user_id}`
- **Keepalive Ping**: 25 seconds
- **Keepalive Pong Timeout**: 20 seconds
- **Max No-Pong Time**: 55 seconds (2 missed pongs + timeout)

### Ping/Pong Architecture
- **Frontend → Backend**: Sends ping every 20s, expects pong within 10s
- **Backend → Frontend**: Sends ping every 25s, expects pong within 20s
- **Both sides**: Properly handle bidirectional ping/pong messages

## Next Steps

**Priority 1**: Check Render backend logs immediately to identify exact error

**Priority 2**: Implement error logging (Solution 1) if logs don't reveal issue

**Priority 3**: Consider fallback to simple PAM service (Solution 3) for immediate fix

---

**Created**: January 11, 2025
**Investigator**: Claude Code
**Status**: Awaiting backend log review
