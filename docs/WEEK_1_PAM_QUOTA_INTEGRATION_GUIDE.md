# Week 1: PAM Quota Integration Guide

**Date**: January 12, 2025
**Status**: Backend Complete - Integration Pending
**Next Step**: Integrate quota checks into `pam_main.py`

---

## ✅ Completed Backend Work

### 1. Database Migrations (4 files)

| File | Purpose | Status |
|------|---------|--------|
| `supabase/migrations/20250112000001_create_user_usage_quotas.sql` | User quota tracking table | ✅ Created |
| `supabase/migrations/20250112000002_create_pam_usage_logs.sql` | Per-query usage logging | ✅ Created |
| `supabase/migrations/20250112000003_add_quota_tier_to_subscriptions.sql` | Quota triggers and updates | ✅ Created |
| `supabase/migrations/20250112000004_create_increment_quota_function.sql` | Atomic quota increment | ✅ Created |

**Next Action**: Apply migrations to Supabase database
```bash
# Copy SQL files to Supabase SQL editor and run in order
```

### 2. Quota Manager Service

| File | Purpose | Status |
|------|---------|--------|
| `backend/app/services/usage/quota_manager.py` | Core quota logic | ✅ Created |
| `backend/app/services/usage/pam_quota_middleware.py` | WebSocket middleware | ✅ Created |
| `backend/app/services/usage/__init__.py` | Package exports | ✅ Created |

**Functions Available**:
- `check_user_quota(user_id)` - Get current quota status
- `log_usage(user_id, ...)` - Log query and update quotas
- `check_quota_before_request(user_id)` - Pre-flight check (raises QuotaExceededError if hard limit)
- `log_usage_after_request(...)` - Post-processing logging

### 3. Celery Tasks

| File | Purpose | Status |
|------|---------|--------|
| `backend/app/workers/tasks/reset_quotas.py` | Monthly reset + health check | ✅ Created |
| `backend/app/workers/celery.py` | Celery configuration | ✅ Updated |

**Scheduled Tasks**:
- `reset_monthly_quotas` - Monthly (1st of month at midnight)
- `check_quota_health` - Daily health check

---

## 🔧 Integration Steps for `pam_main.py`

### Step 1: Add Imports (Top of File)

Add these imports after existing imports:

```python
from app.services.usage import (
    check_quota_before_request,
    log_usage_after_request,
    QuotaExceededError
)
```

### Step 2: Quota Check BEFORE Processing (Line ~1140)

In `handle_websocket_chat()` function, add quota check right after `user_id` is extracted:

```python
async def handle_websocket_chat(websocket: WebSocket, data: dict, user_id: str, user_jwt: str = None):
    """Handle chat messages over WebSocket with PAM core integration"""
    import time
    start_time = time.time()

    try:
        # Support both 'message' and 'content' fields
        message = data.get("message") or data.get("content", "")
        context = data.get("context", {})
        context["user_id"] = user_id
        context["connection_type"] = "websocket"

        # 🆕 ADD THIS: Check quota BEFORE processing
        try:
            quota_status = await check_quota_before_request(user_id)
        except QuotaExceededError as e:
            # Hard limit exceeded - send error and stop
            await safe_send_json(websocket, {
                "type": "quota_exceeded",
                "error": "You've reached your monthly query limit (130 queries). Please upgrade your plan.",
                "quota_status": {
                    "queries_used": e.status.queries_used_this_month,
                    "monthly_limit": e.status.monthly_query_limit,
                    "subscription_tier": e.status.subscription_tier
                }
            })
            return  # Stop processing

        # Rest of function continues normally...
```

### Step 3: Usage Logging AFTER Response (Multiple Locations)

Find all locations where `ai_response` is sent to the user and add logging.

**Location 1: After LangGraph Agent Response (~line 1438)**

```python
# Existing code:
await safe_send_json(websocket, agent_response_payload)
logger.info(f"📤 [DEBUG] LangGraph agent response sent successfully")

# 🆕 ADD THIS: Log usage after successful response
if agent_result.metadata and "model" in agent_result.metadata:
    response_time_ms = int((time.time() - start_time) * 1000)

    # Convert agent_result to AI response format for logging
    ai_response_dict = {
        "usage": {
            "prompt_tokens": agent_result.metadata.get("prompt_tokens", 0),
            "completion_tokens": agent_result.metadata.get("completion_tokens", 0)
        },
        "model": agent_result.metadata["model"]
    }

    await log_usage_after_request(
        user_id=user_id,
        ai_response=ai_response_dict,
        conversation_id=context.get("conversation_id"),
        intent=agent_result.metadata.get("intent"),
        tool_names=agent_result.tool_calls,
        response_time_ms=response_time_ms
    )
```

**Location 2: After Enhanced Orchestrator Response (Find similar pattern)**

Search for where the enhanced orchestrator sends responses and add similar logging.

**Location 3: In Error Handlers**

In all `except` blocks that send error responses, log failed queries:

```python
except Exception as e:
    logger.error(f"❌ Error: {e}")

    # 🆕 ADD THIS: Log failed query
    response_time_ms = int((time.time() - start_time) * 1000)
    await log_usage_after_request(
        user_id=user_id,
        ai_response={"usage": {"prompt_tokens": 0, "completion_tokens": 0}},
        success=False,
        error_message=str(e),
        response_time_ms=response_time_ms
    )

    await safe_send_json(websocket, {
        "type": "error",
        "error": str(e)
    })
```

### Step 4: Add Quota Status to ALL Responses

Modify the response payload to include quota status:

```python
# Before sending response:
response_payload = {
    "type": "response",
    "content": ai_response.content,
    # ... other fields
}

# 🆕 ADD THIS: Include quota status
if hasattr(ai_response, 'quota_status'):
    response_payload["quota_status"] = ai_response.quota_status

await safe_send_json(websocket, response_payload)
```

---

## 🧪 Testing Checklist

After integration, test these scenarios:

### 1. Normal Usage (Under Limit)
- [ ] User with 40/100 queries can send message
- [ ] Response includes `quota_status` field
- [ ] Database `pam_usage_logs` table gets new row
- [ ] `user_usage_quotas.queries_used_this_month` increments
- [ ] No warning shown

### 2. Approaching Limit (80%)
- [ ] User with 80/100 queries gets warning message
- [ ] Response includes `quota_status.warning_level: "80%"`
- [ ] Query still processes successfully

### 3. Grace Period (100-130 queries)
- [ ] User with 105/100 queries can still send messages
- [ ] Response includes `quota_status.is_in_grace_period: true`
- [ ] Upgrade prompt shown

### 4. Hard Limit (130 queries)
- [ ] User with 130/100 queries gets blocked
- [ ] Response type is `"quota_exceeded"`
- [ ] Error message encourages upgrade
- [ ] No query processed

### 5. Monthly Reset
- [ ] Run Celery task manually: `celery -A app.workers.celery call reset_monthly_quotas`
- [ ] Verify all `queries_used_this_month` reset to 0
- [ ] Verify `monthly_reset_date` updated to next month

---

## 📊 Database Queries for Testing

```sql
-- Check user quota status
SELECT * FROM user_usage_quotas WHERE user_id = 'user-uuid';

-- View recent usage logs
SELECT
    timestamp,
    model_used,
    total_tokens,
    estimated_cost_usd,
    success
FROM pam_usage_logs
WHERE user_id = 'user-uuid'
ORDER BY timestamp DESC
LIMIT 10;

-- Check quota health (all users)
SELECT
    subscription_tier,
    AVG(queries_used_this_month) as avg_queries,
    MAX(queries_used_this_month) as max_queries,
    COUNT(*) as user_count
FROM user_usage_quotas
GROUP BY subscription_tier;

-- Find high-usage users
SELECT
    user_id,
    subscription_tier,
    queries_used_this_month,
    monthly_query_limit,
    total_cost_usd
FROM user_usage_quotas
WHERE queries_used_this_month > 100
ORDER BY queries_used_this_month DESC;
```

---

## 🚨 Known Issues & Solutions

### Issue 1: Migrations Not Applied
**Symptom**: `table "user_usage_quotas" does not exist`
**Solution**: Apply migrations in Supabase SQL editor in order (001 → 004)

### Issue 2: QuotaStatus Object Not Found
**Symptom**: `AttributeError: 'NoneType' object has no attribute 'queries_used_this_month'`
**Solution**: Ensure user has quota record. Run initialization trigger or manually insert:
```sql
INSERT INTO user_usage_quotas (user_id, subscription_tier, monthly_query_limit)
VALUES ('user-uuid', 'monthly', 100);
```

### Issue 3: Celery Task Not Running
**Symptom**: Quotas don't reset on 1st of month
**Solution**: Check Celery Beat is running:
```bash
celery -A app.workers.celery beat -l info
```

---

## 📝 Next Steps (Week 2)

After `pam_main.py` integration is complete:

1. **Frontend Components**:
   - Create `src/components/pam/UsageDashboard.tsx`
   - Create `src/components/pam/QuotaWarning.tsx`
   - Update `src/services/pamService.ts` to parse `quota_status`

2. **Testing**:
   - Deploy to staging
   - Manual testing with real users
   - Load testing (simulate 100 concurrent users)

3. **Monitoring**:
   - Set up alerts for high-usage users
   - Monitor average cost per query
   - Track quota health metrics

---

**Status**: Ready for integration into `pam_main.py`
**Estimated Time**: 1-2 hours for integration + testing
**Priority**: CRITICAL - Stop financial bleeding
