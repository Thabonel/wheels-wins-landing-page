# PAM System Analysis - AI Agent Prompt

## Context

PAM (Personal AI Manager) is an AI assistant for RV travelers built with:
- **Backend**: Python/FastAPI with Claude Sonnet 4.5 AI
- **Frontend**: React/TypeScript with WebSocket communication
- **Database**: Supabase PostgreSQL
- **AI Model**: Anthropic Claude Sonnet 4.5 (primary), OpenAI GPT-5.1 (fallback)

## Current System State

### What's Working ✅
- WebSocket communication (backend ↔ frontend)
- Claude Sonnet 4.5 AI integration
- 6 operational tools registered in tool_registry.py:
  1. `manage_finances` - Budget tracking
  2. `mapbox_navigator` - Route planning
  3. `weather_advisor` - Weather forecasts (FREE OpenMeteo API)
  4. `create_calendar_event` - Calendar management
  5. `get_fuel_log` - Fuel tracking
  6. `search_travel_videos` - YouTube search

### Recent Fixes (November 19, 2025) 🔧
- **Commit `8b1d9d96`**: Added location awareness to PersonalizedPamAgent
- **Commit `55ff4757`**: Fixed Python dataclass field ordering bug
- **Result**: Location should flow from frontend GPS → backend → system prompt → Claude

### Known Problems 🚨

#### 1. Location Awareness Not Tested
**Status**: Fixed in code, UNVERIFIED in production
**Issue**: Weather queries should work with GPS location but haven't been tested end-to-end
**Expected behavior**:
- User asks "What's the weather like?"
- PAM should respond with weather for their GPS location
- PAM should NOT ask "where are you?"

**Actual behavior**: Unknown (needs testing on staging)

**Test URL**: https://wheels-wins-staging.netlify.app
**Test query**: "What's the weather like?"

#### 2. Tool Registry Gap
**Status**: Critical implementation gap
**Issue**: Only 6 tools operational, but codebase has 40+ tool files in `/backend/app/services/pam/tools/`
**Affected directories**:
- `/backend/app/services/pam/tools/budget/` - 10+ files, mostly unregistered
- `/backend/app/services/pam/tools/trip/` - 10+ files, mostly unregistered
- `/backend/app/services/pam/tools/social/` - 10+ files, unregistered
- `/backend/app/services/pam/tools/profile/` - 5+ files, unregistered
- `/backend/app/services/pam/tools/community/` - 2 files, unregistered
- `/backend/app/services/pam/tools/admin/` - 2 files, unregistered

**Why this matters**: PAM can't use tools that aren't registered, limiting functionality

**Roadmap exists**: `docs/PAM_ROADMAP.md` has 4-phase plan to register remaining tools

#### 3. Duplicate/Conflicting Files
**Status**: Unknown if this is still an issue
**Potential issue**: Multiple orchestrator files may exist:
- `PersonalizedPamAgent` (confirmed active - personalized_pam_agent.py)
- `EnhancedPamOrchestrator` (referenced in old docs, status unknown)
- `UnifiedPamOrchestrator` (may exist, status unknown)
- Legacy pam.py files (may exist, status unknown)

**Question**: Are there conflicting implementations that should be deleted?

#### 4. Context Field Name Inconsistencies
**Status**: Recently documented, may still cause bugs
**Issue**: Backend expects specific field names (snake_case):
- ✅ Use: `user_location` (NOT `location`)
- ✅ Use: `lat` and `lng` (NOT `latitude` and `longitude`)
- ✅ Use: `user_id` (NOT `userId`)

**Files to check**:
- Frontend: `src/utils/pamLocationContext.ts`
- Frontend: `src/services/pamService.ts`
- Backend: `backend/app/api/v1/pam_main.py`

**Documentation**: `docs/PAM_BACKEND_CONTEXT_REFERENCE.md` has full field reference

#### 5. Testing Coverage
**Status**: Likely minimal or non-existent
**Issue**: No automated tests for:
- Location awareness flow
- Tool execution with real AI calls
- WebSocket message handling
- System prompt injection
- Tool registry loading

**Test files to check**:
- `/backend/tests/` directory structure
- Frontend tests in `/src/__tests__/`

## Key Files to Analyze

### Core PAM Implementation
1. **`backend/app/core/personalized_pam_agent.py`** (424 lines)
   - Active orchestrator
   - Lines 37-53: UserContext dataclass (check field ordering)
   - Lines 240-262: Location injection into system prompt
   - Lines 342-351: Location injection into messages

2. **`backend/app/services/pam/tools/tool_registry.py`** (933 lines)
   - Lines 545-606: manage_finances registration
   - Lines 616-661: mapbox_navigator registration
   - Lines 671-744: weather_advisor registration
   - Check: Why are only 6 tools registered? What's blocking the rest?

3. **`backend/app/api/v1/pam_main.py`** (large file)
   - Lines 2371-2382: Location wiring to PersonalizedPamAgent
   - WebSocket endpoint implementation
   - REST endpoint implementation

4. **`src/services/pamService.ts`** (frontend)
   - WebSocket client
   - Message formatting
   - Location context building

5. **`src/utils/pamLocationContext.ts`** (frontend)
   - GPS location gathering
   - Field name formatting

### Documentation
1. **`docs/PAM_SYSTEM_ARCHITECTURE.md`** - Recently updated, should be accurate
2. **`docs/PAM_BACKEND_CONTEXT_REFERENCE.md`** - Field name reference
3. **`docs/PAM_ROADMAP.md`** - Tool registration plan
4. **`docs/DATABASE_SCHEMA_REFERENCE.md`** - Database schema

## Questions for Analysis

### Critical Questions 🔴
1. **Why aren't the remaining 35+ tools registered?**
   - Check tool files in `/backend/app/services/pam/tools/`
   - Check for import errors, syntax issues, missing dependencies
   - Check PAM_ROADMAP.md for planned approach

2. **Does location awareness actually work end-to-end?**
   - Trace location flow: Frontend GPS → pamService.ts → WebSocket → pam_main.py → PersonalizedPamAgent → System Prompt → Claude
   - Check for field name mismatches (location vs user_location)
   - Check for coordinate format issues (lat/lng vs latitude/longitude)

3. **Are there conflicting PAM implementations?**
   - Search for: EnhancedPamOrchestrator, UnifiedPamOrchestrator, legacy pam.py
   - Check if multiple orchestrators are active
   - Identify files that should be deleted

4. **What's blocking tool registration?**
   - Check tool file syntax
   - Check for missing imports or dependencies
   - Check tool_registry.py for patterns
   - Check if there's a registration mechanism we're missing

### Important Questions 🟡
5. **What's the test coverage?**
   - Check `/backend/tests/` for PAM tests
   - Check frontend tests for PAM components
   - Identify critical gaps in test coverage

6. **Are there performance bottlenecks?**
   - Check Redis caching implementation
   - Check database query patterns
   - Check WebSocket connection handling
   - Check Claude API call frequency

7. **Are field names consistent across frontend/backend?**
   - Compare field names in pamService.ts vs pam_main.py
   - Check for camelCase vs snake_case mismatches
   - Verify against PAM_BACKEND_CONTEXT_REFERENCE.md

8. **What's the error handling like?**
   - Check for try/catch blocks
   - Check for error logging
   - Check for user-friendly error messages

### Nice-to-Know Questions 🟢
9. **Can we simplify the architecture?**
   - Is the current implementation over-engineered?
   - Can we consolidate duplicate code?
   - Are there unused files we can delete?

10. **What's the deployment story?**
    - Check for deployment scripts
    - Check for environment variable management
    - Check for database migration handling

## Analysis Instructions

### Phase 1: Code Discovery (15 minutes)
1. Map the directory structure of `/backend/app/services/pam/`
2. List all tool files and check which are registered
3. Identify any duplicate or conflicting orchestrator files
4. Check for import errors or syntax issues in tool files

### Phase 2: Location Awareness (10 minutes)
1. Trace the location flow from frontend to backend
2. Check field name consistency (user_location, lat, lng)
3. Verify system prompt injection in personalized_pam_agent.py
4. Identify any breaks in the location flow

### Phase 3: Tool Registry Gap (15 minutes)
1. Count total tool files vs registered tools
2. Analyze tool_registry.py registration pattern
3. Check for blockers preventing registration
4. Review PAM_ROADMAP.md implementation plan

### Phase 4: Testing & Quality (10 minutes)
1. Check test coverage in `/backend/tests/`
2. Identify critical testing gaps
3. Check for error handling patterns
4. Review logging implementation

### Phase 5: Recommendations (10 minutes)
1. Prioritize issues by severity
2. Suggest quick wins (low effort, high impact)
3. Identify architectural improvements
4. Provide implementation roadmap

## Expected Output

Please provide:

1. **Executive Summary** (5 bullet points)
   - What's working well
   - Top 3 critical issues
   - Quick win opportunities

2. **Detailed Analysis**
   - Location awareness flow (is it complete?)
   - Tool registry gap (why only 6 registered?)
   - Conflicting files (what should be deleted?)
   - Field name issues (where are mismatches?)
   - Test coverage (what's missing?)

3. **Prioritized Issues**
   - 🔴 Critical: Blocks core functionality
   - 🟡 Important: Limits functionality
   - 🟢 Nice-to-have: Quality improvements

4. **Actionable Recommendations**
   - Specific files to modify
   - Specific code changes to make
   - Test cases to write
   - Files to delete (if any)

5. **Implementation Plan**
   - Step-by-step tasks
   - Estimated time per task
   - Dependencies between tasks
   - Success criteria

## Context You Have Access To

- Full codebase at `/Users/thabonel/Code/wheels-wins-landing-page/`
- Recent git history (commits through `1d5ab333`)
- Documentation in `/docs/` directory
- Backend code in `/backend/app/`
- Frontend code in `/src/`

## What We Need

We need to know:
1. **Why is location awareness not working?** (if it's not)
2. **How do we register the remaining 35+ tools?**
3. **What files are conflicting and should be deleted?**
4. **What's the fastest path to getting PAM fully operational?**

## Success Criteria

Your analysis is successful if it:
- ✅ Identifies the root cause of location awareness issues (if any)
- ✅ Explains the tool registration gap
- ✅ Provides a clear, prioritized action plan
- ✅ Gives specific code examples and file paths
- ✅ Estimates implementation time realistically

---

**Start your analysis now. Be thorough but efficient.**
