# Week 4: Polish + Launch Prep - Execution Plan

**Date Started**: January 10, 2025
**Estimated Time**: 16 hours (2 days)
**Status**: 🟡 In Progress

---

## 📋 Phase 1: Analysis & Planning (2 hours)

### Current State Assessment

**WebSocket Status**:
- ✅ `pamService.ts` - Unified service (marked as "SINGLE SOURCE OF TRUTH")
- ✅ `usePamWebSocketUnified.ts` - Unified hook exists
- ⚠️ Need to verify if old implementations are still imported/used

**PAM Component Status**:
- Found: `Pam.tsx`
- Need to find: `PamAssistant.tsx` (may have been removed)

**Tool Prefiltering Status**:
- ❌ Not implemented yet
- Target: 87% token reduction

### Tasks:
- [x] Locate all WebSocket implementations
- [ ] Check which ones are actively used
- [ ] Identify import usage across codebase
- [ ] Create consolidation plan

---

## 📋 Phase 2: WebSocket Consolidation (4 hours)

### Goal
Consolidate 4 WebSocket implementations → 1 unified implementation

### Current Implementations (from roadmap):
1. `pamService.ts`
2. `usePamWebSocket.ts`
3. `usePamWebSocketConnection.ts`
4. `usePamWebSocketV2.ts`

### Consolidation Plan:
1. **Audit** (30 min)
   - Find all files importing old WebSocket hooks
   - Document current usage patterns
   - Identify breaking changes

2. **Migrate** (2 hours)
   - Update all components to use `usePamWebSocketUnified`
   - Update all services to use `pamService.ts`
   - Remove duplicate connection logic

3. **Clean Up** (1 hour)
   - Delete unused WebSocket files
   - Update imports
   - Run type checking

4. **Test** (30 min)
   - Verify PAM connection works
   - Test message sending/receiving
   - Check error handling
   - Validate reconnection logic

### Success Criteria:
- ✅ Only ONE WebSocket implementation remains
- ✅ All components use unified hook
- ✅ PAM connection stable
- ✅ No breaking changes in functionality

---

## 📋 Phase 3: PAM Component Consolidation (2 hours)

### Goal
Consolidate `Pam.tsx` + `PamAssistant.tsx` → 1 component

### Tasks:
1. **Audit** (30 min)
   - Find both component files
   - Identify differences
   - Document feature overlap

2. **Design** (30 min)
   - Choose primary component
   - Plan feature merge strategy
   - Design unified API

3. **Implement** (45 min)
   - Merge components
   - Update imports
   - Maintain all features

4. **Test** (15 min)
   - Verify UI renders correctly
   - Test all PAM interactions
   - Validate voice features

### Success Criteria:
- ✅ Only ONE PAM component exists
- ✅ All features preserved
- ✅ Clean component API
- ✅ No UI regressions

---

## 📋 Phase 4: Tool Prefiltering (4 hours)

### Goal
Implement 87% token reduction through intelligent tool filtering

### Background
Current issue: Sending ALL tools to AI on every request = massive token waste

### Solution
Pre-filter tools based on:
- User message content (keyword matching)
- Current context (page, location, user state)
- Recent tool usage patterns
- Tool relevance scoring

### Implementation Plan:

#### 1. Analysis (1 hour)
- Count current tool definitions in PAM
- Calculate token usage per request
- Identify tool categories
- Design relevance scoring algorithm

#### 2. Implementation (2 hours)
**File**: `backend/app/services/pam/tools/tool_prefilter.py`

```python
class ToolPrefilter:
    def filter_tools(
        self,
        user_message: str,
        available_tools: List[Tool],
        context: Dict[str, Any]
    ) -> List[Tool]:
        """
        Filter tools based on relevance to reduce token usage by ~87%

        Strategy:
        1. Always include: Core tools (get_time, get_location)
        2. Keyword matching: Extract keywords from user message
        3. Context-based: Include tools for current page/domain
        4. Usage history: Include recently used tools
        5. Category filtering: If user asks about trips, only include trip tools
        """
        pass
```

**Integration Points**:
- `backend/app/services/pam/core/pam.py` - Call prefilter before AI request
- `backend/app/services/pam/tools/tool_registry.py` - Add filtering metadata

#### 3. Testing (1 hour)
- Verify token reduction (before/after comparison)
- Test tool availability for different queries
- Ensure critical tools always included
- Validate response quality maintained

### Success Criteria:
- ✅ 80%+ token reduction achieved
- ✅ Response quality unchanged
- ✅ Critical tools never filtered out
- ✅ Contextual filtering works correctly

---

## 📋 Phase 5: Final Agent Reviews (2 hours)

### Goal
Launch all 7 specialized agents in parallel for comprehensive review

### Agents to Launch:

1. **code-reviewer** - Code quality, best practices
2. **security-auditor** - Security vulnerabilities, RLS policies
3. **performance-optimizer** - Performance bottlenecks, optimization opportunities
4. **database-architect** - Database schema, query optimization
5. **testing-automation-expert** - Test coverage, CI/CD
6. **devops-engineer** - Infrastructure, deployment
7. **react-frontend-specialist** - React patterns, UX

### Process:

#### 1. Parallel Launch (15 min)
```bash
# Launch all agents simultaneously
/double escape
```

Launch 7 agents in one message with different focus areas:
- Agent 1: Review WebSocket consolidation code
- Agent 2: Security audit of tool prefiltering
- Agent 3: Performance analysis of PAM service
- Agent 4: Database query optimization review
- Agent 5: Test coverage for new features
- Agent 6: Infrastructure review for production
- Agent 7: React component quality check

#### 2. Collect Findings (30 min)
- Aggregate all agent reports
- Categorize issues: CRITICAL / HIGH / MEDIUM / LOW
- Prioritize fixes

#### 3. Fix Critical Issues (1 hour 15 min)
- Address CRITICAL issues immediately
- Fix HIGH priority issues if time permits
- Defer MEDIUM/LOW to post-launch

### Success Criteria:
- ✅ All 7 agents complete reviews
- ✅ No CRITICAL issues remaining
- ✅ HIGH priority issues addressed or documented
- ✅ Quality score >8/10 across all areas

---

## 📋 Phase 6: Production Deployment (2 hours)

### Pre-Deployment Checklist:

#### Code Quality:
- [ ] All Week 4 changes committed
- [ ] No TypeScript errors
- [ ] All tests passing
- [ ] No console errors in staging

#### Infrastructure:
- [ ] Production environment variables verified
- [ ] Database migrations ready
- [ ] Monitoring dashboards configured
- [ ] Rollback plan documented

#### Documentation:
- [ ] CHANGELOG updated
- [ ] README updated
- [ ] API documentation current
- [ ] Deployment runbook ready

### Deployment Process:

#### 1. Final Staging Test (30 min)
- Full manual test on staging
- Verify all Week 4 changes working
- Check PAM connection stability
- Test tool prefiltering effectiveness

#### 2. Production Deploy (30 min)
```bash
# Merge staging → main
git checkout main
git pull origin main
git merge staging
git push origin main

# Netlify auto-deploys frontend
# Render auto-deploys backend

# Verify deployment
curl https://wheelsandwins.com
curl https://pam-backend.onrender.com/api/health
```

#### 3. Smoke Tests (30 min)
- Test user authentication
- Test PAM WebSocket connection
- Send test messages
- Verify tool execution
- Check database writes

#### 4. Monitoring Setup (30 min)
- Open Sentry dashboard
- Monitor error rate
- Watch WebSocket connections
- Track API response times
- Set up alerts

### Success Criteria:
- ✅ Production deployment successful
- ✅ Health checks passing
- ✅ Error rate <1%
- ✅ Response times within SLA
- ✅ No critical errors

---

## 📋 Phase 7: Post-Deployment Monitoring (4 hours)

### Monitoring Plan:

#### Hour 1: Critical Watch
- Monitor every 5 minutes
- Watch for:
  - Error spikes
  - Connection failures
  - Slow response times
  - Database errors

#### Hour 2-3: Active Monitoring
- Monitor every 15 minutes
- Track:
  - User activity patterns
  - Tool usage statistics
  - Token reduction metrics
  - Performance metrics

#### Hour 4: Stability Validation
- Monitor every 30 minutes
- Validate:
  - System stable
  - No degradation
  - Metrics within normal range

### Rollback Triggers:
- Error rate >5%
- WebSocket connection failures >10%
- Response time P95 >5s
- Database connection failures
- Critical security issue

### Rollback Process:
```bash
# Revert to previous version
git revert <commit_hash>
git push origin main

# Verify rollback
curl https://wheelsandwins.com
```

### Success Criteria:
- ✅ 4 hours monitoring complete
- ✅ Error rate <1%
- ✅ No rollback needed
- ✅ Performance metrics stable
- ✅ User feedback positive

---

## 📊 Success Metrics

### Technical Metrics:
- WebSocket implementations: 4 → 1 ✅
- PAM components: 2 → 1 ✅
- Token reduction: 87% ✅
- Code quality score: >8/10 ✅
- Test coverage: >80% ✅

### Performance Metrics:
- Response time P95: <2s
- Error rate: <1%
- WebSocket uptime: >99.9%
- Tool prefiltering: 80%+ reduction

### Business Metrics:
- Production deployment: successful
- Zero critical bugs
- Monitoring: 4+ hours stable
- User feedback: positive

---

## 🚀 Timeline

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| 1. Analysis | 2h | Day 1, 9am | Day 1, 11am |
| 2. WebSocket | 4h | Day 1, 11am | Day 1, 3pm |
| 3. PAM Components | 2h | Day 1, 3pm | Day 1, 5pm |
| 4. Tool Prefiltering | 4h | Day 2, 9am | Day 2, 1pm |
| 5. Agent Reviews | 2h | Day 2, 1pm | Day 2, 3pm |
| 6. Deployment | 2h | Day 2, 3pm | Day 2, 5pm |
| 7. Monitoring | 4h | Day 2, 5pm | Day 2, 9pm |

**Total**: 16 hours across 2 days

---

## 🎯 Current Status

**Phase**: 1 - Analysis & Planning
**Progress**: 10%
**Next Action**: Audit WebSocket implementations
**Blockers**: None

---

**Last Updated**: January 10, 2025
**Owner**: Claude Code + User
**Priority**: HIGH (v1.5 release blocker)
