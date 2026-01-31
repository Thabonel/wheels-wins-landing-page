# PRD — Autonomous Technical Monitoring Agent

## 1) Context & Goals

### What problem this feature solves
The Wheels & Wins production environment experiences resource constraints (75% memory, 84% disk usage) that require manual intervention to prevent service degradation. Current monitoring only alerts humans who must diagnose and fix issues manually, leading to potential downtime and degraded user experience.

### Who it's for
- **Primary**: DevOps/SRE team managing Wheels & Wins infrastructure
- **Secondary**: End users who benefit from improved system reliability and reduced downtime

### Why now
- Recent resource optimization work created health endpoints (`/health/resources`, `/health/system`) that provide the monitoring foundation
- Production environment shows consistent resource pressure requiring proactive intervention
- Existing PAM system provides notification and tool integration infrastructure
- Manual incident response creates operational burden and potential for human error

### In-scope goals
- Autonomous monitoring of system health using existing health endpoints
- Moderate self-healing: service restarts, cleanup scripts, resource scaling, failover
- Integration with PAM system for user notifications and tool leverage
- Trust-based permissions: auto-act for safe operations, notify for major changes
- Remediation library with success tracking for continuous improvement
- Independent operation that survives PAM system issues

### Out-of-scope / Non-goals
- Complex infrastructure changes (database migrations, architecture overhauls)
- User-facing feature development or UI changes
- Integration with external monitoring services (DataDog, NewRelic)
- Full artificial intelligence/ML-based anomaly detection
- Automated code deployment or hotfix application

## 2) Current State (Repo-informed)

### Existing relevant modules
- **Health monitoring**: `backend/app/monitoring/resource_monitor.py` with `/health/resources` and `/health/system` endpoints
- **Cleanup automation**: `backend/scripts/cleanup_system.py` with disk cleanup and log compression
- **PAM system**: WebSocket-based AI assistant with 47 tools at `/api/v1/pam/ws/{user_id}`
- **Memory persistence**: `mcp__memory-keeper__context_*` tools for session state
- **Worker management**: Celery configuration in `backend/app/workers/celery.py`
- **Cache service**: Redis connection pooling in `backend/app/services/cache_service.py`

### Where changes will likely land
- **New**: `backend/agents/autonomous/technical_monitor.py` (main agent)
- **New**: `backend/agents/autonomous/remediation_library.py` (action library)
- **New**: `backend/agents/autonomous/pam_bridge.py` (PAM integration)
- **Modify**: `backend/app/main.py` (agent startup and endpoints)
- **New**: `backend/tests/test_autonomous_monitoring.py` (test suite)

### Risks / unknowns / assumptions
- **ASSUMPTION**: Current health endpoints provide sufficient data for decision making (verify via endpoint testing)
- **RISK**: Agent actions could interfere with manual operations (mitigate with action logging)
- **ASSUMPTION**: Render.com provides APIs for resource scaling (verify documentation)
- **UNKNOWN**: Optimal polling frequency to balance responsiveness vs resource usage

## 3) User Stories

**As a DevOps engineer**, I want the system to automatically clean up disk space when usage exceeds 75%, so that I don't get paged for routine maintenance issues.

**As a system administrator**, I want to receive PAM notifications when the agent scales resources, so that I'm aware of infrastructure changes without blocking them.

**As a developer**, I want the monitoring agent to restart failed Celery workers automatically, so that background tasks continue processing without manual intervention.

**As a product manager**, I want the system to maintain service availability during resource spikes, so that users don't experience downtime during peak usage.

**As a site reliability engineer**, I want the agent to track which remediation actions work best for specific issues, so that the system improves its response effectiveness over time.

## 4) Success Criteria (Verifiable)

### Core functionality
- [ ] Agent detects critical resource usage (>80% memory, >85% disk) within 60 seconds
- [ ] Automatically executes appropriate remediation within 2 minutes of detection
- [ ] Sends PAM notification within 30 seconds of taking action
- [ ] Operates independently even when PAM WebSocket is unavailable
- [ ] Persists action history and success metrics using memory-keeper tools

### Performance constraints
- [ ] Agent uses <50MB memory and <5% CPU during normal operation
- [ ] Health endpoint polling frequency adapts: 30s normal, 10s during issues
- [ ] Remediation actions complete within 5 minutes or escalate to human

### Edge cases
- [ ] Gracefully handles health endpoint failures (fallback monitoring)
- [ ] Prevents infinite loops of failed remediation attempts (3-strike rule)
- [ ] Continues operation during Render.com API outages (queue actions for retry)
- [ ] Maintains function during Redis/database connectivity issues

### Definition of done
- [ ] All tests pass (unit, integration, e2e simulation)
- [ ] Agent runs for 24 hours in staging without manual intervention
- [ ] Successfully handles simulated memory pressure scenario
- [ ] PAM integration delivers notifications during test scenarios

## 5) Test Plan

### Unit tests (`test_technical_monitor.py`)
- **Mock external dependencies**: health endpoints, Render API, memory-keeper tools
- **Test decision logic**: threshold detection, action selection, escalation paths
- **Test error handling**: API failures, timeout scenarios, invalid responses
- **Map to success criteria**: Core functionality verification

### Integration tests (`test_monitoring_integration.py`)
- **Real health endpoints**: Test with actual `/health/resources` responses
- **Memory-keeper integration**: Verify persistence and retrieval of action history
- **PAM bridge testing**: Mock WebSocket, verify notification delivery
- **Map to success criteria**: Independent operation, persistence functionality

### End-to-end simulation (`test_monitoring_e2e.py`)
- **Scenario 1**: High memory usage → cleanup → memory reduction
- **Scenario 2**: Disk usage spike → cleanup scripts → disk space recovery
- **Scenario 3**: Service failure → restart → service restoration
- **Scenario 4**: PAM unavailable → autonomous operation → delayed notification
- **Map to success criteria**: Performance constraints, edge cases

### Test data/fixtures
- **Health response fixtures**: Various resource usage levels (normal, warning, critical)
- **Remediation result mocks**: Success/failure scenarios for each action type
- **Time-based test data**: Historical patterns for adaptive polling logic

## 6) Implementation Plan

### Slice 1: Core monitoring foundation
- **Changes**: Create `TechnicalMonitor` class with basic health endpoint polling
- **Tests first**: Unit tests for health data parsing and threshold detection
- **Commands**: `pytest backend/tests/test_technical_monitor.py::test_health_parsing -v`
- **Expected**: Health data correctly parsed, thresholds properly detected
- **Commit**: "feat: add core technical monitoring with health endpoint polling"

### Slice 2: Remediation library
- **Changes**: Create `RemediationLibrary` with cleanup and restart actions
- **Tests first**: Unit tests for each remediation action with mocked execution
- **Commands**: `pytest backend/tests/test_technical_monitor.py::test_remediation_actions -v`
- **Expected**: Actions execute correctly, success/failure properly tracked
- **Commit**: "feat: add remediation library with cleanup and restart actions"

### Slice 3: Memory persistence
- **Changes**: Integrate memory-keeper tools for action history and metrics
- **Tests first**: Integration tests for persistence and retrieval
- **Commands**: `pytest backend/tests/test_monitoring_integration.py::test_persistence -v`
- **Expected**: Action history saved/retrieved correctly across sessions
- **Commit**: "feat: add persistent memory for monitoring agent actions and metrics"

### Slice 4: PAM bridge integration
- **Changes**: Create PAM notification bridge with fallback handling
- **Tests first**: Integration tests for notification delivery and fallback
- **Commands**: `pytest backend/tests/test_monitoring_integration.py::test_pam_bridge -v`
- **Expected**: Notifications delivered when PAM available, queued when unavailable
- **Commit**: "feat: add PAM integration bridge for monitoring notifications"

### Slice 5: Agent orchestration
- **Changes**: Main agent loop with adaptive polling and error handling
- **Tests first**: E2E simulation tests for complete monitoring scenarios
- **Commands**: `pytest backend/tests/test_monitoring_e2e.py -v`
- **Expected**: Full monitoring cycle works end-to-end
- **Commit**: "feat: complete autonomous monitoring agent with orchestration loop"

### Slice 6: Service integration
- **Changes**: Integrate agent startup into main.py with health endpoints
- **Tests first**: Integration tests for service lifecycle
- **Commands**: `python backend/app/main.py` (verify agent starts)
- **Expected**: Agent starts with main service, endpoints respond correctly
- **Commit**: "feat: integrate autonomous monitoring agent with main service"

## 7) Git Workflow Rules

### Branch naming
- Use: `feature/autonomous-monitoring-agent`
- Keep all work in this branch until ready for staging

### Commit cadence
- Commit after every slice completion
- Commit immediately after any failing test is fixed
- Use conventional commit format: `feat:`, `fix:`, `test:`

### After each slice
- Run slice-specific tests: `pytest backend/tests/test_technical_monitor.py -v`
- Run health monitoring regression: `pytest backend/tests/test_resource_optimization.py -v`

### After every 3 slices
- Run full backend test suite: `pytest backend/ -v`
- Verify no regressions in PAM system: Check WebSocket connection

### Regression safety
- If any existing functionality breaks, revert immediately
- Fix broken tests before proceeding to next slice
- Never leave broken tests in the codebase

## 8) Commands

### Install dependencies
```bash
cd backend
pip install -r requirements.txt
```

### Unit tests
```bash
cd backend
python -m pytest tests/test_technical_monitor.py -v
```

### Integration tests
```bash
cd backend
python -m pytest tests/test_monitoring_integration.py -v
```

### E2E tests
```bash
cd backend
python -m pytest tests/test_monitoring_e2e.py -v
```

### Lint/typecheck
```bash
cd backend
python -m pytest --flake8  # Lint check
mypy app/  # Type checking (if mypy configured)
```

### Build verification
```bash
cd backend
python -c "from agents.autonomous.technical_monitor import TechnicalMonitor; print('Import successful')"
```

### Local run
```bash
cd backend
uvicorn app.main:app --reload --port 8000
# Verify agent starts in logs: "🤖 Technical Monitoring Agent initialized"
```

## 9) Observability / Logging

### Required logs
- **Agent startup**: "🤖 Technical Monitoring Agent initialized at {timestamp}"
- **Health checks**: "📊 Health check: Memory {%}, Disk {%}, Status: {status}"
- **Actions taken**: "🔧 Executed {action} for {issue}: {result}"
- **Errors**: "❌ Failed to {action}: {error_message}"
- **PAM notifications**: "📱 Sent notification to PAM: {message}"

### Metrics to track
- Health check frequency and response times
- Remediation action success rates by type
- Time to resolution for each issue type
- PAM notification delivery success rate

### Smoke test verification
1. Check agent startup in application logs
2. Verify health endpoint polling via log entries every 30 seconds
3. Trigger high resource usage scenario, verify action taken and logged
4. Confirm PAM notification received (if PAM system available)

## 10) Rollout / Migration Plan

### Phase 1: Staging deployment
- Deploy agent in monitoring-only mode (log actions, don't execute)
- Run for 48 hours to verify detection accuracy
- Manually validate that identified issues match real problems

### Phase 2: Staging remediation
- Enable automatic remediation actions in staging
- Monitor for 1 week, collecting success/failure metrics
- Tune thresholds and action selection based on results

### Phase 3: Production deployment
- Deploy in monitoring-only mode for 24 hours
- Enable automatic remediation with conservative thresholds
- Gradually increase agent authority based on confidence

### Feature flags
- `AUTONOMOUS_MONITORING_ENABLED`: Master switch for agent operation
- `AUTO_REMEDIATION_ENABLED`: Controls whether agent takes action or just monitors
- `PAM_INTEGRATION_ENABLED`: Controls notification system integration

### Rollback plan
- Set feature flags to disable agent operation
- Revert to manual monitoring via health endpoints
- Preserve action history data for post-mortem analysis

## 11) Agent Notes

### Agent Notes — Session Log
- (timestamp) ...

### Agent Notes — Decisions
- Decision / rationale / alternatives

### Agent Notes — Open Questions
- (List unresolved technical questions that arise during implementation)

### Agent Notes — Regression Checklist
- (List tests/features to re-run after changes)
  - Health endpoint functionality (`/health/resources`, `/health/system`)
  - Resource optimization tests (cleanup scripts, Celery configuration)
  - PAM WebSocket connectivity and tool functionality
  - Memory-keeper context persistence and retrieval