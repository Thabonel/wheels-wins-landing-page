# PAM Tool Issues Investigation Report

**Document ID**: PRD-PAM-005
**Date**: 2026-01-29
**Type**: Investigation Report
**Status**: Complete

---

## Executive Summary

Investigation of PAM's 48+ registered tools revealed **2 critical issues** that may cause tool failures:

| Issue | Severity | Impact |
|-------|----------|--------|
| Missing `youtube_trip_tool.py` file | Low | Tool disabled gracefully |
| Missing `app.core.ai` module | **CRITICAL** | `plan_meals` crashes at runtime |

**Estimated Working Tools**: ~47 of 49 registered tools function correctly

---

## Critical Issue #1: Missing YouTube Tool File

### Problem
The file `backend/app/services/pam/tools/youtube_trip_tool.py` does NOT exist.

### Impact
- Tool: `search_travel_videos`
- Registration location: `tool_registry.py` lines 797-837
- **Behavior**: Tool is gracefully disabled during registration
- **User Experience**: PAM cannot search YouTube for travel videos

### Fix Options
1. **Create the missing file** with `YouTubeTripTool` class
2. **Remove registration** if feature not needed
3. **Use alternative** (YouTube API or existing video search)

### Code Location
```python
# tool_registry.py line ~797
try:
    YouTubeTripTool = lazy_import("youtube_trip_tool", "YouTubeTripTool")
    if YouTubeTripTool is None:
        raise ImportError("YouTubeTripTool not available")
    # ...
except ImportError as e:
    logger.warning(f"Could not register search_travel_videos: {e}")
    failed_count += 1  # Graceful failure
```

---

## Critical Issue #2: Missing AI Module (CRITICAL)

### Problem
The file `backend/app/core/ai.py` does NOT exist, but `plan_meals.py` imports from it.

### Impact
- Tool: `plan_meals`
- Import location: `meals/plan_meals.py` line 12
- **Behavior**: Tool registers successfully but CRASHES at runtime
- **User Experience**: Meal planning requests cause errors

### Affected Code
```python
# meals/plan_meals.py line 12
from app.core.ai import get_ai_client  # FILE DOES NOT EXIST
```

### Fix Options

**Option A: Create the missing module**
```python
# backend/app/core/ai.py
from anthropic import Anthropic

def get_ai_client():
    """Return configured AI client"""
    return Anthropic()
```

**Option B: Update plan_meals.py to use existing AI integration**
```python
# Instead of importing from app.core.ai, use:
from app.services.pam.ai_client import get_claude_client
```

**Option C: Remove AI dependency from plan_meals**
- Use template-based meal planning without AI generation
- Lower quality but no external dependency

### Recommendation
**Option B** - Use existing PAM AI client instead of creating new module

---

## Tool Registration System Analysis

### How Registration Works

```
1. PAM startup calls initialize_tool_registry()
2. Registry attempts to import each tool via lazy_import()
3. If import succeeds: register tool, increment registered_count
4. If import fails: log warning, increment failed_count, continue
5. Failed tools are marked as disabled (enabled = False)
6. PAM continues with reduced capabilities
```

### Error Handling Statistics

| Metric | Count |
|--------|-------|
| Tool registration attempts | 49 |
| Fail paths (error handlers) | 98 |
| Lazy imports | 51 |
| Success (estimated) | 47-48 |
| Failures (confirmed) | 1-2 |

### Registration Log Output
```
🛠️ Initializing PAM Tool Registry...
📋 STARTING PAM TOOL REGISTRATION
[Tool registration attempts...]
📊 PAM TOOL REGISTRATION SUMMARY
✅ Successfully registered: X tools
❌ Failed to register: Y tools
📈 Success rate: Z%
```

---

## Tool Categories Health Check

### Verified Working (Based on Code Inspection)

| Category | Tools | Status |
|----------|-------|--------|
| Trip Planning | 8 | ✅ Working |
| Budget & Finance | 9 | ✅ Working |
| Social | 5 | ✅ Working |
| Calendar | 3 | ✅ Working |
| Profile | 2 | ✅ Working |
| Shopping | 3 | ✅ Working |
| Navigation | 1 | ✅ Working |
| Weather | 1 | ✅ Working |
| Knowledge | 6 | ✅ Working |
| Utility | 1 | ✅ Working |

### Issues Identified

| Category | Tools | Status |
|----------|-------|--------|
| Meal Planning | 7 | ⚠️ plan_meals broken, 6 others work |
| Travel Videos | 1 | ❌ Missing implementation |

---

## External API Dependencies

### APIs That Work Without Keys

| Tool | API | Status |
|------|-----|--------|
| `weather_advisor` | OpenMeteo | ✅ Free, no key needed |
| `mapbox_navigator` | Mapbox | ⚠️ Needs MAPBOX_TOKEN env var |

### APIs That Need Configuration

| Tool | API | Fallback |
|------|-----|----------|
| `search_products` | RapidAPI | ✅ Falls back to internal DB |
| `search_travel_videos` | YouTube Data API | ❌ No fallback (tool missing) |

---

## Database/RLS Status

**No Issues Found**

All database-accessing tools properly use:
- `app.integrations.supabase.get_supabase_client()` (shop tools)
- `app.core.database.get_supabase_client()` (meal tools)

RLS policies are applied at query time, not registration time, so tools register fine and fail gracefully if user doesn't have access.

---

## Recommendations

### Immediate Actions (Priority 1)

1. **Fix plan_meals.py import**
   - Update to use existing AI client
   - Or create `app/core/ai.py` stub

2. **Verify YouTube tool requirement**
   - If needed: create `youtube_trip_tool.py`
   - If not needed: remove from registry

### Short-Term Actions (Priority 2)

1. **Add tool health check endpoint**
   ```
   GET /api/v1/pam/tools/health
   Returns: { enabled: [...], disabled: [...], errors: [...] }
   ```

2. **Improve error logging**
   - Log which specific tools failed and why
   - Add tool execution telemetry

### Long-Term Actions (Priority 3)

1. **Add tool test suite**
   - Unit tests for each tool
   - Integration tests for tool execution
   - Automated health checks

2. **Implement tool capability filtering**
   - Only expose relevant tools based on user context
   - Reduce Claude token usage

---

## Testing Checklist

To verify tools are working:

- [ ] Start backend and check registration logs
- [ ] Count registered vs failed tools
- [ ] Test `plan_meals` specifically (expect failure)
- [ ] Test `search_travel_videos` (expect "tool not available")
- [ ] Test one tool from each category
- [ ] Verify Mapbox API key is configured

---

## Files to Modify

| File | Action |
|------|--------|
| `backend/app/services/pam/tools/meals/plan_meals.py` | Fix import |
| `backend/app/core/ai.py` | Create if needed |
| `backend/app/services/pam/tools/youtube_trip_tool.py` | Create or remove from registry |
| `backend/app/services/pam/tools/tool_registry.py` | Remove YouTube if not creating file |

---

## Conclusion

PAM's tool system is **largely healthy** with graceful error handling. The two identified issues are:

1. **YouTube tool missing** - Low priority, graceful failure
2. **AI module missing** - **HIGH PRIORITY**, causes runtime crash for meal planning

Fixing these issues will bring PAM to full 49-tool capability.

---

**Document End**
