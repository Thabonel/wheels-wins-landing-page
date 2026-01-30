# PRD: Backend Health Visibility & Monitoring

**Status:** Ready for Implementation
**Priority:** Medium (Low Impact, Low Effort) - **Operational Excellence**
**Created:** January 30, 2026
**Based on:** PAM Audit finding - Unable to verify AI provider or agent status

---

## Problem Statement

### Audit Finding
PAM audit reported: *"No visibility into AI provider configuration (can't verify which LLM is being used), No way to verify SimplePamService or PersonalizedPamAgent status"*

### Operational Blind Spots
- **Unknown AI Provider**: Can't verify if Claude, OpenAI, or Gemini is active
- **No Agent Status**: Can't see PersonalizedPamAgent health
- **No Service Metrics**: Can't monitor tool execution success rates
- **Debug Challenges**: Hard to troubleshoot issues without visibility

### Business Impact
- **Support Difficulty**: Can't diagnose user issues quickly
- **Uptime Monitoring**: No visibility into service component health
- **Cost Optimization**: Can't track AI API usage
- **Performance Analysis**: No metrics on slow tools or failures

---

## Solution Overview

Enhance the existing `/health` endpoint to provide comprehensive backend visibility.

### Current Health Endpoint
```
GET https://pam-backend.onrender.com/health
Response: {"status": "healthy"}
```

### Enhanced Health Dashboard
```
GET https://pam-backend.onrender.com/health
Response: {
    "status": "healthy",
    "timestamp": "2025-01-30T12:00:00Z",
    "version": "2.0.4",
    "ai_providers": {...},
    "agents": {...},
    "tools": {...},
    "database": {...},
    "performance": {...}
}
```

---

## Technical Requirements

### Enhanced Health Response Schema

```python
{
    "status": "healthy" | "degraded" | "unhealthy",
    "timestamp": "2025-01-30T12:00:00Z",
    "version": "2.0.4",
    "uptime_seconds": 86400,

    "ai_providers": {
        "primary": {
            "provider": "anthropic",
            "model": "claude-3-5-sonnet-20241022",
            "status": "active",
            "last_response_time_ms": 1250,
            "requests_today": 1547,
            "errors_today": 3
        },
        "fallback": {
            "provider": "openai",
            "model": "gpt-4o",
            "status": "available",
            "configured": true
        }
    },

    "agents": {
        "PersonalizedPamAgent": {
            "status": "active",
            "sessions_active": 23,
            "last_activity": "2025-01-30T11:58:45Z",
            "memory_usage_mb": 145
        },
        "SimplePamService": {
            "status": "active",
            "requests_processed": 892,
            "avg_response_time_ms": 850
        }
    },

    "tools": {
        "total_registered": 88,
        "working": 86,
        "failing": 2,
        "top_failures": [
            {"tool": "get_weather_forecast", "errors": 5, "last_error": "API timeout"},
            {"tool": "find_rv_parks", "errors": 2, "last_error": "Rate limit exceeded"}
        ],
        "performance": {
            "avg_execution_time_ms": 450,
            "slowest_tool": "search_products",
            "fastest_tool": "get_user_stats"
        }
    },

    "database": {
        "status": "connected",
        "connection_pool": {
            "active": 5,
            "idle": 10,
            "max": 20
        },
        "query_performance": {
            "avg_query_time_ms": 45,
            "slow_queries": 2
        }
    },

    "performance": {
        "requests_per_minute": 12.5,
        "memory_usage_mb": 425,
        "cpu_usage_percent": 32,
        "response_times": {
            "p50_ms": 850,
            "p95_ms": 2100,
            "p99_ms": 3500
        }
    }
}
```

---

## Implementation Plan

### Phase 1: Core Health Metrics (2 hours)

#### Step 1.1: Update Health Endpoint
**File:** `backend/app/api/health.py`

```python
from fastapi import APIRouter
from datetime import datetime
import psutil
import time
from ..core.ai import ai_service
from ..services.pam.agent import PersonalizedPamAgent
from ..services.pam.tools.tool_registry import tool_registry

router = APIRouter()

@router.get("/health")
async def get_health():
    start_time = time.time()

    # Basic system info
    health_data = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "version": get_app_version(),
        "uptime_seconds": int(time.time() - app_start_time)
    }

    # AI Provider status
    health_data["ai_providers"] = await get_ai_provider_status()

    # Agent status
    health_data["agents"] = await get_agent_status()

    # Tools status
    health_data["tools"] = await get_tools_status()

    # Database status
    health_data["database"] = await get_database_status()

    # Performance metrics
    health_data["performance"] = get_performance_metrics()

    # Overall health determination
    health_data["status"] = determine_overall_status(health_data)

    return health_data
```

#### Step 1.2: AI Provider Status Function
```python
async def get_ai_provider_status():
    """Get status of configured AI providers"""
    status = {
        "primary": {
            "provider": "unknown",
            "model": "unknown",
            "status": "unknown"
        }
    }

    try:
        # Check if we can identify the AI service
        if hasattr(ai_service, 'provider_name'):
            status["primary"]["provider"] = ai_service.provider_name
        if hasattr(ai_service, 'model_name'):
            status["primary"]["model"] = ai_service.model_name

        # Test connectivity with a simple ping
        test_response = await ai_service.test_connection()
        status["primary"]["status"] = "active" if test_response else "error"

    except Exception as e:
        status["primary"]["status"] = "error"
        status["primary"]["error"] = str(e)

    return status
```

#### Step 1.3: Agent Status Function
```python
async def get_agent_status():
    """Get status of PAM agents"""
    status = {}

    try:
        # PersonalizedPamAgent status
        if PersonalizedPamAgent.instance:
            status["PersonalizedPamAgent"] = {
                "status": "active",
                "sessions_active": len(PersonalizedPamAgent.active_sessions),
                "last_activity": PersonalizedPamAgent.last_activity.isoformat(),
                "memory_usage_mb": get_object_memory_usage(PersonalizedPamAgent.instance)
            }
        else:
            status["PersonalizedPamAgent"] = {"status": "not_loaded"}

    except Exception as e:
        status["PersonalizedPamAgent"] = {"status": "error", "error": str(e)}

    return status
```

#### Step 1.4: Tools Status Function
```python
async def get_tools_status():
    """Get status of registered tools"""
    try:
        tools = tool_registry.get_all_tools()
        total = len(tools)

        # Test a sample of tools for basic functionality
        working = 0
        failing = 0
        failures = []

        for tool_name, tool_obj in tools.items():
            try:
                # Basic validation check
                if hasattr(tool_obj, 'execute') and callable(tool_obj.execute):
                    working += 1
                else:
                    failing += 1
                    failures.append({"tool": tool_name, "error": "Missing execute method"})
            except Exception as e:
                failing += 1
                failures.append({"tool": tool_name, "error": str(e)})

        return {
            "total_registered": total,
            "working": working,
            "failing": failing,
            "top_failures": failures[:5]  # Top 5 failures
        }

    except Exception as e:
        return {"status": "error", "error": str(e)}
```

### Phase 2: Database & Performance Metrics (1 hour)

#### Step 2.1: Database Status
```python
async def get_database_status():
    """Get database connection and performance status"""
    try:
        # Test database connectivity
        start_time = time.time()
        result = await supabase.table('profiles').select('id').limit(1).execute()
        query_time = (time.time() - start_time) * 1000

        return {
            "status": "connected",
            "query_test_ms": round(query_time, 2),
            "last_test": datetime.utcnow().isoformat() + "Z"
        }

    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "last_test": datetime.utcnow().isoformat() + "Z"
        }
```

#### Step 2.2: Performance Metrics
```python
def get_performance_metrics():
    """Get system performance metrics"""
    try:
        # Memory usage
        memory = psutil.virtual_memory()

        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)

        return {
            "memory_usage_mb": round(memory.used / 1024 / 1024, 1),
            "memory_percent": memory.percent,
            "cpu_usage_percent": cpu_percent,
            "process_count": len(psutil.pids())
        }

    except Exception as e:
        return {"error": str(e)}
```

### Phase 3: Enhanced Monitoring (1 hour)

#### Step 3.1: Request Metrics Collection
```python
# Add middleware to track requests
@app.middleware("http")
async def track_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time

    # Store metrics (in-memory for now)
    request_metrics.record(duration, response.status_code)

    return response
```

#### Step 3.2: Tool Execution Metrics
```python
# Decorator for tool execution tracking
def track_tool_execution(func):
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        tool_name = func.__name__

        try:
            result = await func(*args, **kwargs)
            duration = time.time() - start_time
            tool_metrics.record_success(tool_name, duration)
            return result
        except Exception as e:
            duration = time.time() - start_time
            tool_metrics.record_failure(tool_name, duration, str(e))
            raise

    return wrapper
```

### Phase 4: Health Status Dashboard (Optional - 2 hours)

#### Step 4.1: Admin Health Page
**File:** `backend/templates/health_dashboard.html`

Simple HTML dashboard for visual health monitoring:
```html
<!DOCTYPE html>
<html>
<head>
    <title>PAM Backend Health Dashboard</title>
    <meta http-equiv="refresh" content="30">
</head>
<body>
    <h1>PAM Backend Health Status</h1>
    <div id="health-data">
        <!-- Auto-refreshing health data -->
    </div>
    <script>
        // Auto-refresh health data every 30 seconds
        setInterval(() => {
            fetch('/health').then(r => r.json()).then(displayHealth);
        }, 30000);
    </script>
</body>
</html>
```

---

## Success Metrics

### Operational Visibility KPIs
- ✅ **AI Provider Identity**: Can see which LLM is active (Claude/OpenAI/Gemini)
- ✅ **Agent Status**: PersonalizedPamAgent health and activity
- ✅ **Tool Health**: Working vs failing tools with error details
- ✅ **Performance**: Response times and resource usage

### Debugging Improvement
- ✅ **Faster Issue Resolution**: Clear visibility into component status
- ✅ **Proactive Monitoring**: Identify issues before users report them
- ✅ **Performance Optimization**: Identify slow tools and bottlenecks

### Cost Monitoring
- ✅ **API Usage Tracking**: Monitor AI provider request counts
- ✅ **Resource Usage**: Memory and CPU utilization
- ✅ **Error Rate**: Reduce costs from failed requests

---

## Testing Strategy

### Phase 1: Basic Health Endpoint Testing
```bash
# Test basic health response
curl https://pam-backend.onrender.com/health | jq '.'

# Verify all required fields present
curl https://pam-backend.onrender.com/health | jq '.ai_providers.primary.provider'
curl https://pam-backend.onrender.com/health | jq '.agents.PersonalizedPamAgent.status'
curl https://pam-backend.onrender.com/health | jq '.tools.total_registered'
```

### Phase 2: Error Condition Testing
```bash
# Test when database is down
# Test when AI provider is unavailable
# Test when tools are failing
# Verify graceful error handling
```

### Phase 3: Performance Testing
```bash
# Test health endpoint response time
time curl https://pam-backend.onrender.com/health

# Test with high load
for i in {1..10}; do curl https://pam-backend.onrender.com/health & done
```

---

## Ralph Loop Verification Plan

Before marking complete, **must verify**:

### Step 1: Health Endpoint Verification
```bash
# Verify health endpoint responds with enhanced data
curl https://pam-backend.onrender.com/health | jq '.ai_providers'
```
**Expected:** JSON with provider info, not empty object

### Step 2: AI Provider Detection Verification
```bash
# Verify we can see which AI provider is active
curl https://pam-backend.onrender.com/health | jq '.ai_providers.primary.provider'
```
**Expected:** "anthropic", "openai", or "gemini" - not "unknown"

### Step 3: Agent Status Verification
```bash
# Verify agent status is visible
curl https://pam-backend.onrender.com/health | jq '.agents.PersonalizedPamAgent.status'
```
**Expected:** "active", "inactive", or "error" - not "unknown"

### Step 4: Tool Count Verification
```bash
# Verify tools are counted correctly
curl https://pam-backend.onrender.com/health | jq '.tools.total_registered'
```
**Expected:** Number ≥ 80 (should show actual tool count)

**No completion claims without fresh verification evidence.**

---

## Risk Assessment

### Implementation Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|---------|------------|
| **Performance Impact** | Low | Low | Health checks should be lightweight |
| **Security Exposure** | Low | Medium | No sensitive data in health response |
| **Error in Health Code** | Low | Medium | Comprehensive error handling |

### Operational Benefits

| Benefit | Impact | Effort |
|---------|--------|--------|
| **Faster Debugging** | High | Low |
| **Proactive Monitoring** | Medium | Low |
| **Cost Visibility** | Medium | Low |
| **Reliability Tracking** | High | Low |

---

## Dependencies

### Required (All Available)
- ✅ `psutil` library for system metrics (already installed)
- ✅ FastAPI health endpoint (already exists)
- ✅ Access to AI service configuration
- ✅ Tool registry for tool counting

### Optional Enhancements
- 📊 Metrics collection library (Prometheus, StatsD)
- 📈 Monitoring dashboard (Grafana, custom HTML)
- 🚨 Alerting system (email, Slack notifications)

---

## Implementation Timeline

### Total Effort: **3-4 hours**

| Phase | Time | Priority |
|-------|------|----------|
| **Core Health Metrics** | 2 hours | High |
| **Database & Performance** | 1 hour | Medium |
| **Enhanced Monitoring** | 1 hour | Low |
| **Dashboard** | 2 hours | Optional |

### Complexity: **LOW-MEDIUM**
- Extending existing health endpoint
- No external dependencies required
- Safe, read-only operations
- Easy to test and verify

---

## Acceptance Criteria

### Must Have
- [ ] Health endpoint shows AI provider (Claude/OpenAI/Gemini)
- [ ] PersonalizedPamAgent status visible
- [ ] Tool registry count displayed
- [ ] Database connectivity status
- [ ] Response time < 2 seconds

### Should Have
- [ ] Performance metrics (memory, CPU)
- [ ] Tool failure tracking
- [ ] Request rate monitoring
- [ ] Error rate visibility

### Nice to Have
- [ ] Visual dashboard page
- [ ] Alerting on failures
- [ ] Historical metric trends
- [ ] Tool performance rankings

---

## Conclusion

### Backend Health Status: **IMPROVEMENT OPPORTUNITY**

While the PAM backend is working well, enhanced health monitoring will significantly improve operational visibility and debugging capability.

### Final Recommendation

**✅ IMPLEMENT:**
- Enhanced health endpoint with AI provider and agent status
- Tool health monitoring and failure tracking
- Basic performance metrics

**🤔 CONSIDER LATER:**
- Advanced monitoring dashboard
- Alerting system
- Historical metrics collection

### Value Proposition
This is a **low-effort, medium-value** improvement that will:
- **Reduce debugging time** when issues occur
- **Enable proactive monitoring** of service health
- **Provide cost visibility** for AI provider usage
- **Support operational excellence** as PAM scales

**Total implementation time: 3-4 hours for significant operational improvement.**