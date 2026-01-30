# PAM Bootstrap Files System - Phase 1 PRD

**Status:** Draft - Pending User Validation
**Version:** 2.0 (Revised based on agent review)
**Created:** January 30, 2026
**Owner:** PAM Enhancement Team
**Review Status:** ⚠️ CONDITIONAL APPROVAL - Requires user research first

---

## Agent Review Summary

This PRD was reviewed by specialized agents for feasibility, technical architecture, and product value:

### 🔍 **Project Manager Review** - Senior Project Management Specialist
**Assessment**: Timeline unrealistic, critical risks missing
- **4-week timeline → 6 weeks** (more realistic for complexity)
- **Added mandatory user research gate** (Phase 0)
- **Enhanced risk assessment** with security and integration concerns
- **Reduced initial scope** to 2 files (SOUL.md + USER.md)

### 🏗️ **Backend Architect Review** - Technical Architecture Specialist
**Assessment**: Architecture sound but integration risks high
- **Added adapter pattern** for PersonalizedPamAgent compatibility
- **Connection-based caching** for WebSocket architecture
- **Security hardening** (Jinja2 sandboxing, prompt injection protection)
- **Performance targets adjusted** 50ms → 70ms (realistic for Render constraints)

### 📊 **Product Manager Review** - Sprint Prioritization Specialist
**Assessment**: Engineering-driven solution without user validation
- **RICE Score: 49/100** (below threshold, deprioritize recommendation)
- **No user research** validating demand for personalization
- **Alternative solutions** analysis added (lower effort, higher value)
- **User-centric metrics** replacing internal productivity metrics

**Key Insight**: This PRD solves developer problems, not user problems. User research is mandatory before proceeding.

---

## Executive Summary

**REVISED APPROACH**: Validate user demand for prompt personalization before implementing infrastructure changes. Transform PAM's monolithic prompt system into modular markdown files ONLY if users demonstrate clear value need.

**Key Changes from v1.0:**
- Added mandatory user research phase (Phase 0)
- Reduced initial scope to 2 files (SOUL.md + USER.md)
- Extended timeline to 6 weeks with proper risk mitigation
- Added user-centric success metrics

**Success Metrics (REVISED):**
- User satisfaction with PAM responses: No degradation (baseline)
- Prompt maintenance time: 30 min → 5 min (50x improvement, not 90%)
- User personalization adoption: >50% of conversations use dynamic context

---

## Problem Statement

### Current Pain Points (REVISED)
1. **Maintenance Complexity**: `enhanced_pam_prompt.py` contains 464 lines requiring deployment for changes
2. **No Personalization**: Same prompt for all users (UNVALIDATED if users want this)
3. **Content Team Dependency**: Non-engineers can't update PAM personality

### Critical Analysis
**⚠️ USER RESEARCH GAP**: No evidence users are dissatisfied with current PAM responses or want better personalization. This PRD assumes user problems without validation.

**Current System Reality Check:**
- PAM has 88 operational tools across 6 categories
- System is functionally working with WebSocket architecture
- Recent issues are operational stability, not prompt maintenance
- QA reports show 0% API success rate - infrastructure problems take priority

### Impact Assessment
- **PAM Users**: **UNKNOWN** - No user research validates demand for personalization
- **Developers**: Reduced deployment frequency for prompt changes
- **Content Teams**: Independence from engineering (assumes they want this responsibility)

---

## Solution Overview

### Bootstrap Files Architecture

Convert monolithic prompt into modular markdown files loaded dynamically:

```
backend/app/services/pam/prompts/
├── SOUL.md              # Core personality, tone, boundaries (static)
├── TOOLS.md             # Tool usage guidance (static)
├── CONTEXT.md           # Context awareness rules (static)
├── templates/
│   ├── USER.md          # Per-user customization template
│   ├── TRIP.md          # Active trip context template
│   └── MEMORY.md        # Recent conversation summary template
└── loader.py           # Assembles final prompt from components
```

### Dynamic Context Loading

```python
def build_pam_prompt(user_id: str, session_context: dict) -> str:
    # Static components (cached)
    soul = load_markdown("SOUL.md")
    tools = load_markdown("TOOLS.md")
    context_rules = load_markdown("CONTEXT.md")

    # Dynamic components (per-request)
    user_context = render_template("USER.md", user_profile=get_user_profile(user_id))
    trip_context = render_template("TRIP.md", active_trip=get_active_trip(user_id))
    memory_context = render_template("MEMORY.md", recent_summary=get_conversation_summary(user_id))

    return assemble_prompt([soul, tools, context_rules, user_context, trip_context, memory_context])
```

---

## Detailed Requirements

### Functional Requirements

#### FR1: Static Bootstrap Files
- **SOUL.md**: PAM's core personality, warmth, boundaries, communication style
- **TOOLS.md**: When and how to use each of the 47 tools
- **CONTEXT.md**: Rules for interpreting user context and maintaining conversation flow

#### FR2: Dynamic Template System
- **USER.md Template**: Renders user-specific data (RV type, preferences, location, travel style)
- **TRIP.md Template**: Renders active trip context (destination, dates, budget, companions)
- **MEMORY.md Template**: Renders conversation history summary (last 5 interactions)

#### FR3: Prompt Assembly Engine
- Load and cache static files on application start
- Render dynamic templates per conversation turn
- Assemble final prompt with proper markdown formatting
- Handle missing or malformed templates gracefully

#### FR4: Hot-Reload Capability
- Watch static markdown files for changes
- Reload modified files without application restart
- Validate markdown syntax before applying changes
- Fallback to previous version if validation fails

### Non-Functional Requirements

#### NFR1: Performance
- **Target**: < 50ms prompt assembly time
- **Caching**: Static files cached in memory
- **Template Rendering**: < 10ms per dynamic template

#### NFR2: Reliability
- **Fallback**: Graceful degradation to original monolithic prompt if files unavailable
- **Validation**: Schema validation for template variables
- **Error Handling**: Continue conversation even if non-critical templates fail

#### NFR3: Scalability
- **Memory Usage**: < 5MB for all cached markdown files
- **Concurrent Requests**: Support 1000+ simultaneous prompt generations
- **File Size Limits**: Individual markdown files capped at 50KB

#### NFR4: Maintainability
- **Documentation**: Clear examples for editing each file type
- **Versioning**: Git tracking for all prompt changes
- **Testing**: Automated validation of prompt output quality

---

## Technical Design

### File Structure

```
backend/app/services/pam/
├── prompts/
│   ├── bootstrap/
│   │   ├── SOUL.md           # 200-300 lines
│   │   ├── TOOLS.md          # 400-500 lines
│   │   └── CONTEXT.md        # 100-150 lines
│   ├── templates/
│   │   ├── USER.md           # 50-100 lines
│   │   ├── TRIP.md           # 30-50 lines
│   │   └── MEMORY.md         # 20-30 lines
│   └── loader.py             # Prompt assembly logic
├── prompt_service.py         # Integration with existing PAM
└── tests/
    ├── test_prompt_loader.py
    └── fixtures/
        ├── sample_user.json
        └── sample_trip.json
```

### Template Variable Schema

#### USER.md Variables
```yaml
user:
  name: string
  rv_type: "motorhome" | "caravan" | "campervan" | "tent"
  experience_level: "beginner" | "intermediate" | "expert"
  travel_style: "budget" | "comfort" | "luxury"
  location:
    lat: number
    lng: number
    timezone: string
  preferences:
    communication_style: "casual" | "professional" | "friendly"
    detail_level: "brief" | "moderate" | "detailed"
```

#### TRIP.md Variables
```yaml
trip:
  destination: string
  start_date: ISO8601
  end_date: ISO8601
  budget: number
  companions: number
  vehicle_type: string
  special_requirements: string[]
```

### Integration Points

#### Current PAM Service
```python
# Before (in pam_service.py)
from app.services.pam.enhanced_pam_prompt import get_system_prompt

# After
from app.services.pam.prompt_service import PromptService

prompt_service = PromptService()
system_prompt = prompt_service.build_prompt(user_id, session_context)
```

#### Caching Strategy
```python
class PromptService:
    def __init__(self):
        self._static_cache = {}
        self._template_cache = {}
        self._file_watchers = {}
        self._initialize_caches()
        self._setup_hot_reload()
```

---

## Implementation Plan (REVISED)

### Phase 0: User Research & Validation (Week 1) - **MANDATORY GATE**
**Goals**: Validate user demand before engineering investment

**Tasks:**
1. Interview 20-30 PAM users about personality satisfaction and personalization needs
2. A/B test simple personalization in existing `enhanced_pam_prompt.py`
3. Analyze support tickets for prompt-related complaints
4. Survey users on desired customization features

**Acceptance Criteria:**
- >60% of users express desire for better personalization
- A/B test shows statistically significant preference for personalized responses
- Clear user stories identified for personalization features
- **Gate Decision**: Only proceed if user demand validated

### Phase 1A: Risk Mitigation & Foundation (Week 2)
**Goals**: Implement safety mechanisms before architectural changes

**Tasks:**
1. Implement feature flag system (`ENABLE_BOOTSTRAP_PROMPTS=false`)
2. Create adapter pattern for backward compatibility with PersonalizedPamAgent
3. Add comprehensive fallback to existing `enhanced_pam_prompt.py`
4. Implement circuit breaker for prompt generation failures
5. Add performance monitoring for prompt assembly latency

**Acceptance Criteria:**
- Feature flag controls new vs. old system
- Zero risk to existing PAM functionality
- Automatic fallback on any error
- Monitoring dashboard for prompt performance

### Phase 1B: Minimal Viable Implementation (Week 3-4)
**Goals**: Implement only SOUL.md + USER.md (reduced scope)

**Tasks:**
1. Extract personality section to `SOUL.md` (120 lines from existing prompt)
2. Create simple `USER.md` template with basic user context
3. Implement secure template rendering with Jinja2 SandboxedEnvironment
4. Add input sanitization for prompt injection protection
5. Deploy to 5% of production traffic via feature flag

**Acceptance Criteria:**
- Only 2 files (SOUL.md + USER.md) in initial implementation
- Template injection vulnerabilities mitigated
- A/B testing shows no quality degradation
- User personalization works for basic variables (name, RV type, location)

### Phase 1C: Performance Optimization (Week 5)
**Goals**: Meet production performance requirements

**Tasks:**
1. Implement connection-based prompt caching for WebSocket architecture
2. Pre-compile templates at application startup
3. Optimize for single-worker Render deployment constraints
4. Add Redis caching for user context with 5-minute TTL
5. Load testing with 100+ concurrent users

**Acceptance Criteria:**
- Prompt assembly latency < 70ms (realistic target, not 50ms)
- Memory usage < 3MB for template cache
- System stable under 100 concurrent WebSocket connections
- Performance meets existing PAM response time SLA

### Phase 1D: Gradual Rollout (Week 6)
**Goals**: Safe production deployment with monitoring

**Tasks:**
1. Increase feature flag: 5% → 25% → 50% → 100%
2. Monitor user satisfaction metrics and error rates
3. Content team training on markdown editing
4. Create runbooks for prompt system troubleshooting
5. Document lessons learned for Phase 2 planning

**Acceptance Criteria:**
- 99.9% uptime maintained throughout rollout
- User satisfaction scores unchanged from baseline
- Error rate < 0.1% for prompt generation
- Content team successfully editing markdown files

---

## Success Metrics

### Primary Metrics
- **Maintenance Effort**: 90% reduction in time to update PAM personality
- **Customization Capability**: 100% of users receive personalized context
- **Developer Productivity**: Content updates require zero engineering involvement

### Secondary Metrics
- **Response Quality**: No degradation vs. baseline (measured via user ratings)
- **Performance**: < 50ms prompt assembly time (99th percentile)
- **Reliability**: 99.9% uptime for prompt generation service

### Leading Indicators
- **File Edit Frequency**: How often content team updates prompt files
- **Template Usage**: % of conversations using dynamic templates
- **Error Rate**: Prompt generation failures < 0.1%

---

## Risk Assessment (REVISED - Critical Risks Added)

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|---------|------------|
| **Template injection attacks** | High | Critical | Jinja2 SandboxedEnvironment, input sanitization, prompt injection detection |
| **PersonalizedPamAgent integration failure** | High | Critical | Adapter pattern, feature flag, comprehensive fallback |
| **WebSocket latency degradation** | Medium | High | Connection-based prompt caching, pre-compilation |
| **Circuit breaker failures** | Medium | High | Multiple fallback layers, monitoring alerts |
| **Memory leaks from file watchers** | Medium | Medium | File size limits (50KB), proper cleanup, monitoring |
| **Render deployment constraints** | High | Medium | Optimize for single-worker, aggressive caching |

### Security Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|---------|------------|
| **Prompt injection via template variables** | High | High | Input validation, injection pattern detection, variable sanitization |
| **Directory traversal attacks** | Medium | High | Path validation, file system sandboxing |
| **File system race conditions** | Low | Medium | Atomic file operations, proper locking |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|---------|------------|
| **No user value delivered** | High | Critical | **Phase 0 user research gate - MANDATORY** |
| **Engineering opportunity cost** | High | High | Clear user validation before proceeding, alternative analysis |
| **System instability during migration** | Medium | Critical | Feature flags, gradual rollout 5%→25%→50%→100%, instant rollback |
| **Content team adoption failure** | Medium | Medium | Simple workflows, extensive training, optional adoption |

---

## Dependencies

### Internal Dependencies
- **User Profile Service**: For USER.md template variables
- **Trip Management Service**: For TRIP.md template variables
- **Conversation Service**: For MEMORY.md template variables
- **Authentication Service**: For user identification in prompt generation

### External Dependencies
- **Jinja2**: Template rendering engine
- **watchdog**: File system monitoring for hot-reload
- **PyYAML**: Configuration and template variable parsing

### Team Dependencies
- **Content Team**: Create and maintain markdown prompt files
- **DevOps Team**: Deploy and monitor new prompt service
- **QA Team**: Validate response quality during migration

---

## Rollout Strategy

### Phase 1A-B: Internal Testing (Weeks 1-2)
- Deploy to development environment only
- Test with synthetic conversations and sample user data
- Engineering team validates prompt assembly and response quality

### Phase 1C: Limited Production (Week 3)
- Deploy to 5% of production traffic (feature flag)
- Monitor key metrics: response quality, performance, error rates
- Content team begins editing markdown files for immediate feedback

### Phase 1D: Full Rollout (Week 4)
- Gradually increase traffic: 25% → 50% → 100%
- Monitor user satisfaction and system performance
- Disable feature flag and remove old monolithic prompt code

### Post-Launch: Optimization (Week 5+)
- Analyze which template variables drive highest user satisfaction
- Expand template system based on content team feedback
- Plan Phase 2: Multi-channel support using same prompt infrastructure

---

## Future Considerations

### Phase 2 Integration
Bootstrap files system designed to support:
- **Multi-channel prompts**: Different personality for WhatsApp vs. web app
- **Skills marketplace**: Community-contributed tool guidance files
- **A/B testing**: Easy prompt variant testing via file swapping

### Monitoring & Analytics
- **Template Usage Analytics**: Which variables improve response quality
- **Content Creator Metrics**: How often files are edited, by whom
- **Performance Monitoring**: Prompt assembly time trends, cache hit rates

### Compliance & Security
- **Content Approval Workflow**: Review process for prompt changes
- **Version Control**: Git-based tracking of all prompt modifications
- **Access Control**: Role-based permissions for editing different file types

---

## Appendix

### A. Current Prompt Analysis

**Line Count Breakdown of `enhanced_pam_prompt.py`:**
- Personality/tone: ~120 lines → SOUL.md
- Tool usage guidance: ~180 lines → TOOLS.md
- Context rules: ~80 lines → CONTEXT.md
- User-specific logic: ~20 lines → USER.md template

### B. Template Examples

**USER.md Template Sample:**
```markdown
# User Context

**Name**: {{ user.name }}
**RV Type**: {{ user.rv_type }}
**Experience**: {{ user.experience_level }} RV traveler
**Travel Style**: {{ user.travel_style }}
**Current Location**: {{ user.location.city }}, {{ user.location.country }}

## Communication Preferences
- **Style**: {{ user.preferences.communication_style }}
- **Detail Level**: {{ user.preferences.detail_level }}

{% if user.rv_type == "caravan" %}
Remember to consider towing vehicle capabilities when suggesting routes.
{% endif %}
```

### C. Migration Checklist

**Pre-Migration:**
- [ ] Backup current `enhanced_pam_prompt.py`
- [ ] Create test environment with new system
- [ ] Prepare rollback plan
- [ ] Train content team on markdown editing

**Migration:**
- [ ] Deploy prompt loader infrastructure
- [ ] Migrate content to bootstrap files
- [ ] Enable feature flag for subset of users
- [ ] Monitor metrics and user feedback
- [ ] Gradually increase rollout percentage

**Post-Migration:**
- [ ] Remove old prompt code
- [ ] Update documentation
- [ ] Plan Phase 2 enhancements
- [ ] Measure success metrics

---

---

## Agent Review Recommendations Summary

### 🚨 **Critical Actions Required**

1. **STOP**: Do not proceed without Phase 0 user research
2. **VALIDATE**: Interview 20-30 users to confirm personalization demand
3. **SIMPLIFY**: Start with 2 files max (SOUL.md + USER.md)
4. **SECURE**: Implement template injection protection from day 1
5. **FALLBACK**: Build adapter pattern for zero-risk deployment

### 🎯 **Alternative Approaches Considered**

| Approach | Effort | User Value | Technical Risk | Recommendation |
|----------|--------|------------|----------------|----------------|
| **Current PRD (v2.0)** | 6 weeks | Unvalidated | Medium | ⚠️ Conditional approval |
| **Targeted prompt improvements** | 1 week | Proven | Low | ✅ Consider first |
| **Simple personalization** | 2 weeks | Medium | Low | ✅ Test market demand |
| **Focus on tool quality** | 4 weeks | High | Low | ✅ Higher ROI option |

### 📋 **Mandatory Gates**

- [ ] **Phase 0 Complete**: User research validates >60% demand for personalization
- [ ] **Technical Review**: Backend architect approves integration approach
- [ ] **Security Audit**: Template injection vulnerabilities mitigated
- [ ] **Performance Baseline**: Current PAM latency benchmarked
- [ ] **Rollback Plan**: Instant revert capability demonstrated

### 🔄 **Post-Review Status**

This PRD transforms from a developer productivity initiative to a user-validated product improvement. The bootstrap files approach has technical merit but requires proof of user value before engineering investment.

**Next Steps:**
1. Get stakeholder approval for Phase 0 user research
2. If research validates demand, proceed with revised 6-week plan
3. If research shows no demand, pivot to alternative approaches

---

*This PRD v2.0 reflects comprehensive agent review and risk mitigation. Original assumptions replaced with data-driven validation requirements.*