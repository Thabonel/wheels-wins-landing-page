# PAM Universal Site Access Integration - Product Requirements Document

**Document Version:** 1.0
**Created:** February 1, 2026
**Author:** Technical Lead
**Status:** Draft

---

## Executive Summary

This PRD defines the architecture for integrating Universal Site Access (USA) capabilities into the existing PAM system. The integration enables PAM to interact with any website on behalf of users while maintaining backward compatibility with 47+ existing specialized tools.

### Key Objectives

1. Enable PAM to perform actions on arbitrary websites (booking, purchasing, form filling)
2. Maintain existing specialized tool performance and reliability
3. Provide intelligent routing between universal and specialized approaches
4. Ensure user privacy and security throughout browser interactions

### Success Metrics

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Supported Domains | 47 tools (fixed) | Unlimited | Week 6 |
| Task Completion Rate | 85% | 90% | Week 6 |
| Average Response Time | 2.3s | <3.5s (universal) | Week 6 |
| User Satisfaction | 4.2/5 | 4.5/5 | Week 8 |

---

## 1. Hybrid Architecture Design

### 1.1 Enhanced Architecture Overview

```
+------------------+     WebSocket      +------------------+
|                  |  (Real-time)       |                  |
|  React Frontend  | <--------------->  |  FastAPI Backend |
|  pamService.ts   |                    |  pam_service.py  |
|  + BrowserBridge |                    |  + USAService    |
+--------+---------+                    +--------+---------+
         |                                       |
         v                                       v
+--------+---------+                    +--------+---------+
|  Browser Session |                    |   Tool Router    |
|  Manager         |                    |   Decision Engine|
+------------------+                    +--------+---------+
                                                 |
                              +------------------+------------------+
                              |                                     |
                              v                                     v
                       +------+------+                       +------+------+
                       | Specialized |                       |  Universal  |
                       | Tool Engine |                       | Site Access |
                       | (47 tools)  |                       |   Engine    |
                       +-------------+                       +-------------+
```

### 1.2 Component Responsibilities

**Tool Router:** Analyzes user intent, decides between specialized vs universal approach, handles fallback

**Universal Site Access Engine:** Manages browser automation, executes web interactions, extracts data

**Browser Session Manager:** Manages user's browser context, preserves authentication, handles cookies

---

## 2. Tool Router System

### 2.1 Routing Decision Logic

```python
class ToolRouterDecision:
    """
    Decision factors for routing requests:

    1. Domain Match Score (0-100)
       - Exact match with specialized tool: 100
       - Partial match (same domain family): 50-80
       - No match: 0

    2. Complexity Score (0-100)
       - Simple CRUD operations: 20
       - Multi-step workflows: 50
       - Interactive/dynamic pages: 80

    3. Reliability Score (0-100)
       - Historical success rate
       - API stability rating
    """

    ROUTING_THRESHOLDS = {
        "specialized_preferred": 80,  # Use specialized if score >= 80
        "universal_preferred": 40,    # Use universal if specialized < 40
        "hybrid_zone": (40, 80),      # Consider both options
    }
```

### 2.2 Domain Classification Tiers

| Tier | Description | Confidence | Examples |
|------|-------------|------------|----------|
| 1 | Full Specialized Support | 95%+ | Supabase, Google Calendar |
| 2 | Partial Specialized Support | 70-94% | Affiliate sites, booking platforms |
| 3 | Universal Access Only | Variable | Arbitrary websites |

---

## 3. Session Management

### 3.1 Session Types

```typescript
interface BrowserSession {
  sessionId: string;
  userId: string;
  browserContextId: string;
  state: 'idle' | 'active' | 'executing' | 'error' | 'terminated';

  // Browser state
  currentPage?: { url: string; title: string; };
  cookies: Cookie[];
  localStorage: Record<string, string>;

  // Lifecycle
  createdAt: timestamp;
  expiresAt: timestamp;
  maxIdleTime: number; // seconds
}

interface TaskSession {
  taskId: string;
  userId: string;
  browserSessionId?: string;

  // Task definition
  intent: string;
  targetDomain: string;
  routingDecision: RouteDecision;

  // Execution state
  state: 'pending' | 'planning' | 'executing' | 'confirming' | 'completed' | 'failed';
  steps: TaskStep[];
  currentStepIndex: number;

  // Results
  result?: TaskResult;
  error?: TaskError;
}
```

### 3.2 Session Security

- All credentials encrypted at rest (AES-256)
- TLS 1.3 for all browser communications
- Separate browser contexts per user
- Automatic session expiration (30 min idle)
- Rate limiting per user (10 concurrent sessions)

---

## 4. API Design

### 4.1 New Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/usa/session` | POST | Create browser session |
| `/api/v1/usa/session/{id}` | GET | Get session status |
| `/api/v1/usa/session/{id}` | DELETE | Terminate session |
| `/api/v1/usa/task` | POST | Execute universal task |
| `/api/v1/usa/task/{id}` | GET | Get task status/result |
| `/api/v1/usa/task/{id}/confirm` | POST | Confirm pending action |
| `/api/v1/usa/health` | GET | Service health check |

### 4.2 WebSocket Integration

```typescript
// New message types for PAM WebSocket
type USAMessageTypes =
  | 'usa_task_start'      // Initiate universal task
  | 'usa_task_progress'   // Real-time progress updates
  | 'usa_task_confirm'    // User confirmation
  | 'usa_task_result'     // Task completion
  | 'usa_session_event';  // Session lifecycle events
```

---

## 5. Database Schema

### 5.1 New Tables

```sql
-- Browser sessions
CREATE TABLE usa_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    session_token VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'created',
    config JSONB NOT NULL DEFAULT '{}',
    cookies_encrypted TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Task tracking
CREATE TABLE usa_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    session_id UUID REFERENCES usa_sessions(id),
    intent TEXT NOT NULL,
    target_domain VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    routing_decision JSONB NOT NULL,
    execution_log JSONB DEFAULT '[]',
    result JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Domain patterns for optimization
CREATE TABLE usa_domain_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain VARCHAR(255) NOT NULL UNIQUE,
    tier INTEGER NOT NULL DEFAULT 3,
    capabilities JSONB DEFAULT '[]',
    automation_hints JSONB DEFAULT '{}',
    avg_success_rate DECIMAL(5,4) DEFAULT 0.0,
    total_executions INTEGER DEFAULT 0
);

-- User preferences
CREATE TABLE usa_user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) UNIQUE,
    require_confirmation_for JSONB DEFAULT '["payment", "booking"]',
    max_auto_spend_usd DECIMAL(10,2) DEFAULT 50.00,
    allow_credential_storage BOOLEAN DEFAULT FALSE
);
```

---

## 6. Migration Strategy

### 6.1 Migration Phases

| Phase | Duration | Description |
|-------|----------|-------------|
| Foundation | Weeks 1-2 | Deploy USA alongside existing PAM, no user changes |
| Internal Testing | Weeks 3-4 | Tool Router, universal engine, alpha testing |
| Beta Rollout | Week 5 | 10% user rollout, monitor and iterate |
| General Availability | Week 6 | 100% rollout, documentation complete |

### 6.2 Rollback Plan

- Feature flag `usa_enabled` for instant disable
- All requests fallback to specialized tools only
- Preserve session data for investigation
- Notify affected users

---

## 7. Performance Requirements

| Metric | Target |
|--------|--------|
| Session Creation | <500ms |
| Task Planning | <2s |
| Simple Navigation | <1.5s |
| Form Filling | <3s |
| Full Task (5 steps) | <15s |
| Memory per Session | <256MB |
| Concurrent Sessions | 100/server |

---

## 8. Monitoring

### 8.1 Key Metrics

```
usa_sessions_active          - Gauge
usa_tasks_completed_total    - Counter (by status)
usa_task_duration_seconds    - Histogram
usa_browser_memory_bytes     - Gauge
usa_routing_decisions        - Counter (specialized/universal)
usa_task_success_rate        - Gauge (by domain)
```

### 8.2 Alerts

- CRITICAL: usa_task_error_rate > 10% for 5m
- WARNING: usa_task_duration_p99 > 30s for 10m
- WARNING: usa_browser_memory > 90% for 5m

---

## 9. Implementation Timeline

### Week 1-2: Foundation
- Create usa/ module structure
- Database migrations
- Browser pool manager
- Session management

### Week 3-4: Core Engine
- Task executor
- Tool router integration
- WebSocket integration
- Error handling

### Week 5: Beta
- 10% user rollout
- Monitoring dashboards
- Performance tuning
- User feedback

### Week 6: GA
- Full rollout
- Documentation
- Support training
- Retrospective

---

## 10. Dependencies

| Component | Technology | Version |
|-----------|------------|---------|
| Browser Automation | Playwright | 1.40+ |
| Backend | FastAPI | 0.104+ |
| Database | PostgreSQL (Supabase) | 15+ |
| Cache | Redis | 7+ |
| Monitoring | Prometheus + Grafana | Latest |

---

## Appendix: Related Documents

- `/docs/PAM_SYSTEM_ARCHITECTURE.md` - Existing PAM architecture
- `/docs/DATABASE_SCHEMA_REFERENCE.md` - Database schemas
- `/docs/prd/universal-browser-automation.md` - Browser automation PRD
- `/docs/prd/security-privacy-framework.md` - Security PRD

---

*Document Version 1.0 - February 1, 2026*
