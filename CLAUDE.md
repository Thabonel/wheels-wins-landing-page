# Claude Code Instructions for Wheels & Wins

## 🚨 CRITICAL: Read BEFORE Any PAM or Database Work

### PAM System Architecture (START HERE!)
**Before doing ANYTHING with PAM, read:**
- **@docs/PAM_SYSTEM_ARCHITECTURE.md** - COMPLETE PAM OVERVIEW (required reading!)
  - What PAM is and how it works
  - All 47 tools and their purposes
  - WebSocket connection architecture
  - Security, context, and performance details
  - **READ THIS FIRST** on every new session

**Future PAM Hardening (Post-Launch):**
When implementing production hardening, read `docs/PAM_SCAFFOLDING_PLAN.md`

**Quick Summary (full plan: 48k chars, 3-week timeline):**
- **Phase 1** (Week 1): WebSocket resilience, circuit breakers, DB pooling
- **Phase 2** (Week 2): External API caching, security hardening, audit logging
- **Phase 3** (Week 3): Observability dashboard, chaos testing, auto-scaling
- **Full details**: Includes code examples, implementation checklists, success metrics
- **READ ONLY WHEN IMPLEMENTING** (not loaded by default to save context)

### Database Queries
**Before writing ANY database queries, read:**
- **@docs/DATABASE_SCHEMA_REFERENCE.md** - THE SOURCE OF TRUTH for all table schemas
- **Rule:** Use ACTUAL column names from this doc, not what you think they should be
- **Example:** `profiles` table uses `id` NOT `user_id` (if you get this wrong, PAM breaks)

### PAM Context Fields
**Before sending ANY context data to PAM backend, read:**
- **@docs/PAM_BACKEND_CONTEXT_REFERENCE.md** - THE SOURCE OF TRUTH for all context fields
- **Rule:** Use EXACT field names listed in this doc (snake_case, not camelCase)
- **Example:** Backend expects `user_location` NOT `location` (most common bug)
- **Validation:** Run `npm run pam:validate-context` to check field name mismatches

## Memory-Keeper Protocol (CRITICAL)

**USE MEMORY-KEEPER FOR ALL SESSION CONTEXT** - This is your persistent knowledge base across ALL sessions.

### When to Save Context
- **Every 30 minutes** of active coding work
- After completing a feature or fix
- After making architecture decisions
- When discovering important bugs/issues
- Before switching to a different task
- End of every coding session

### Auto-Reminder
**PROMPT YOURSELF every 30 minutes**: "Should I save current progress to memory-keeper?"

### Save Commands
```typescript
// Save progress
mcp__memory-keeper__context_save({
  key: "descriptive-key-name",
  value: "Detailed description of what was done/learned",
  category: "progress" | "decision" | "task" | "note" | "error" | "warning",
  priority: "high" | "normal" | "low"
});

// Check session status
mcp__memory-keeper__context_status();

// Search previous work
mcp__memory-keeper__context_search({ query: "search term" });

// Get specific context
mcp__memory-keeper__context_get({ key: "specific-key" });
```

### Category Guide
- **progress** - Work completed (features, fixes, implementations)
- **decision** - Technical/architecture choices made
- **task** - Pending work items or TODOs
- **note** - Important context, references, or documentation
- **error** - Known bugs or issues discovered
- **warning** - Gotchas, risks, or things to be careful about

### What to Save
- Feature implementations with file paths
- Bug fixes with root cause analysis
- Database schema changes
- API endpoint modifications
- Architecture decisions and rationale
- Deployment steps and results
- Failed attempts and lessons learned
- Environment configuration changes

### Example Usage
```typescript
// After fixing a bug
mcp__memory-keeper__context_save({
  key: "calendar-403-fix-jan-15-2025",
  value: `Fixed calendar events 403 error

ROOT CAUSE: RLS policy on calendar_events table blocking authenticated users
SOLUTION: Updated RLS policy to support admin role
FILES MODIFIED:
- backend/app/services/pam/tools/create_calendar_event.py
- docs/sql-fixes/fix_calendar_rls_properly.sql
DEPLOYMENT: Staging branch, commit abc123
TESTING: Verified events now load correctly`,
  category: "progress",
  priority: "high"
});
```

## Essential Context Files (Read These First)
When starting a new session, read these files to get up to speed:

- **@docs/DATABASE_SCHEMA_REFERENCE.md** - Database schema (READ BEFORE ANY DB QUERIES)
- **@docs/PAM_BACKEND_CONTEXT_REFERENCE.md** - PAM context fields (READ BEFORE PAM WORK)
- **@docs/pam-rebuild-2025/PAM_FINAL_PLAN.md** - Complete 7-day rebuild plan and progress
- **@docs/pam-rebuild-2025/DAY_4_COMPLETE.md** - Latest completed work
- **@backend/docs/architecture.md** - System architecture overview
- **@backend/docs/api.md** - API endpoint documentation
- **@CLAUDE.local.md** - Current session context (if exists)
- **Memory-Keeper** - Query with `mcp__memory-keeper__context_search()` for past work

## Task & Issue Tracking

**System**: GitHub Issues + Projects (integrated with repo)

### Quick Commands
```bash
# List all issues
gh issue list

# Create new issue (uses templates)
gh issue create

# View specific issue
gh issue view <number>

# Search issues
gh issue list --label "bug" --state open
```

### Issue Templates
Located in `.github/ISSUE_TEMPLATE/`:
- **bug_report.yml** - Bug reports with reproduction steps
- **feature_request.yml** - New feature requests
- **task.yml** - Development tasks and chores

### Labels System
**Type**: bug, enhancement, task
**Priority**: critical, high, medium, low
**Component**: pam, wins, wheels, social, shop, backend, frontend, database, admin
**Status**: needs-triage, in-progress, blocked, ready-for-review
**Effort**: small (<1 day), medium (1-3 days), large (1-2 weeks), xl (>2 weeks)

### When to Create Issues
- Bugs discovered during development
- Feature requests from users or team
- Technical debt that needs addressing
- Documentation improvements needed

### Current Active Issues
Check: https://github.com/Thabonel/wheels-wins-landing-page/issues

**IMPORTANT**: When you identify bugs or needed features during development, create GitHub issues using `gh issue create` so nothing gets lost.

## Quick Start
**Dev Server**: http://localhost:8080 (NOT 3000!)
**Stack**: React 18.3 + TypeScript + Vite + Tailwind + Supabase + FastAPI

## Strategic AI Decision (January 2025)

**PAM AI Provider**: **Claude Sonnet 4.5** (Primary)
- **Primary AI Brain**: Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`)
- **Superior Performance**: State-of-the-art reasoning and function calling
- **200K Token Context**: Massive context window for conversation history
- **Best-in-Class**: Industry-leading accuracy and response quality
- **Simple Architecture**: ONE AI brain via AsyncAnthropic client
- **Gemini Flash Fallback**: Cost-effective backup for simple queries
- **OpenAI Tertiary**: Available as additional fallback option
- **Cost**: $3/1M input + $15/1M output tokens (Claude Sonnet 4.5)
- **Reference**: See `/docs/pam-rebuild-2025/PAM_FINAL_PLAN.md` for full architecture

## Critical Commands
```bash
npm run dev              # Start dev server (port 8080)
npm run build            # Production build
npm run quality:check:full # Run all quality checks
npm test                 # Run tests
npm run lint             # ESLint
npm run type-check       # TypeScript validation
```

## PAM Automated Testing (October 2025)

### Overview
Comprehensive end-to-end testing system that automatically tests PAM across all pages, replacing tedious manual testing with a "test → fix → retest" loop.

### Setup
1. **Create test credentials file**:
   ```bash
   cp .env.test.example .env.test
   # Edit .env.test with valid test user credentials
   ```

2. **Or use environment variables**:
   ```bash
   export TEST_USER_EMAIL="your-test-user@example.com"
   export TEST_USER_PASSWORD="YourPassword123!"
   ```

### Running Tests
```bash
npm run test:pam:auto          # Run all PAM tests
npm run test:pam:auto:headed   # Run with browser visible
npm run test:pam:auto:debug    # Run with debug mode
```

### Test Coverage
- **25+ tests** across 7 pages (Home, Wheels, Wins, Social, Shop, You, PAM)
- **Automatic retry** logic (3 attempts with exponential backoff)
- **Self-healing** tests with multiple selector fallbacks
- **JSON reports** generated in `e2e/reports/`

### What Gets Tested
Each test asks PAM a question specific to the page context:
- Calendar: "add a dinner appointment for the 13th at 12pm"
- Trip: "plan a trip from Phoenix to Seattle"
- Budget: "show my spending this month"
- Social: "how can I connect with other RV travelers?"

### Test Reports
- Located: `e2e/reports/pam-test-report-latest.json`
- Includes: success/failure status, response times, retry counts, error messages
- CI/CD ready: JSON format for automated pipelines

### Documentation
See `e2e/README.md` for complete testing documentation.

## Dead Code Analysis & Cleanup (October 2025)

### Knip - Dead Code Detector
**Status**: Installed in devDependencies only (NEVER deploys to production)
**Version**: v5.64.2
**License**: ISC (free, open-source)

**What Knip Does:**
- Static analysis to detect unused files, exports, types, dependencies
- October 8, 2025 baseline: 288 unused files (33.8% of frontend)
- Used ONLY in development/staging environments
- Results excluded from git (.gitignore)

**Key Files:**
- `knip.json` - Configuration for TypeScript scanning
- `BASELINE_METRICS.md` - October 8, 2025 snapshot before cleanup
- `MONITORING_PERIOD_OCT_8_22.md` - 2-week monitoring plan
- `docs/CLEANUP_SAFETY_PROTOCOL.md` - Safety rules and incident log

**Commands:**
```bash
# Run Knip scan (development only)
npx knip

# Analyze results
./scripts/analyze-knip-results.sh

# View baseline metrics
cat BASELINE_METRICS.md
```

### Production Usage Tracking (Oct 8-22, 2025)
**Purpose:** Collect real production data before ANY code deletion

**Backend Tracking:**
- Middleware: `backend/app/middleware/usage_tracker.py`
- Storage: Redis (30-day retention)
- Tracks: Endpoint paths, call counts, timestamps
- API: `/api/v1/usage-tracking/stats?days=14`

**Frontend Tracking:**
- Utility: `src/utils/usageTracking.ts`
- Storage: localStorage (production only)
- Tracks: Component render counts, timestamps
- Export: `exportUsageData()` function in browser console

**Safety Protocol:**
- **DO NOT DELETE ANY CODE until October 22, 2025**
- **DO NOT delete files flagged by Knip without cross-referencing usage logs**
- **Maximum 5 files per deployment** (micro-batch deletions only)

**Critical Lessons from Cleanup Incidents:**
1. **Incident #1 (Oct 8):** Deleted `pam_simple.py` → PAM outage → Restored
2. **Incident #2 (Oct 8):** Cleanup exposed orchestrator naming bug → Fixed in 15min
3. **Key takeaway:** Static analysis reveals latent bugs (GOOD), but need integration tests first

**Next Steps (After Oct 22):**
1. Export production usage logs
2. Cross-reference Knip results with zero-usage files
3. Create deletion plan (5 files max per batch)
4. Test each batch thoroughly before next deletion

## Git Safety Systems (IMPORTANT FOR ALL SESSIONS)

### Available Git Safety Tools
- `scripts/git-safe` - Core corruption prevention system with flock protection
- `scripts/git-network-resilient` - Network-resilient operations with retry logic
- `scripts/git-health-monitor` - Repository health monitoring with daemon mode
- `scripts/git-script-auditor` - Audits and fixes unsafe Git patterns in scripts
- `scripts/install-git-safe.sh` - Universal installer for any repository

### Critical: Git Audit Artifacts (NEVER COMMIT THESE)
The following files are generated by git-script-auditor and should NEVER be committed:
```bash
.git/git-script-auditor/     # Audit logs, reports, backups
.git/git-safe/               # Safety system working files
.git/git-network-resilient/  # Network operation state
.git/git-health-monitor/     # Health monitoring data
*.git-safe.backup           # Backup files
REPO_HEALTH_CHECK.md        # Temporary health reports
scripts/git-safe-config     # Generated config files
git-safety-functions.sh     # Template functions
```

### Before ANY Git Operations
```bash
# Check repository health
scripts/git-health-monitor status

# Audit scripts for unsafe patterns  
scripts/git-script-auditor audit

# Use safe Git operations
scripts/git-safe git commit -m "message"
scripts/git-network-resilient push origin main
```

### If Repository Corruption Occurs
```bash
# Automatic recovery
scripts/git-safe recover

# Manual repair if needed
scripts/git-safe repair

# Nuclear option (last resort)
scripts/git-safe repair --nuclear
```

## Infrastructure Architecture

### Two-System Setup (CRITICAL: Staging & Production)
We operate **two complete separate systems** sharing one Supabase database:

#### Production System
- **Frontend**: wheelsandwins.com (Netlify main branch)
- **Backend**: pam-backend.onrender.com (Render)
- **Database**: Shared Supabase instance
- **Redis**: pam-redis.onrender.com (private network)
- **Workers**: pam-celery-worker.onrender.com, pam-celery-beat.onrender.com

#### Staging System  
- **Frontend**: wheels-wins-staging.netlify.app (Netlify staging branch)
- **Backend**: wheels-wins-backend-staging.onrender.com (Render)
- **Database**: Same shared Supabase instance
- **Workers**: wheels-wins-celery-worker-staging.onrender.com

#### Shared Services
- **Database**: Single Supabase PostgreSQL (shared between systems)
- **Redis**: Separate Redis instances per environment

### Environment Variable Configuration

**CRITICAL**: Each frontend must point to its corresponding backend!
- Production frontend → Production backend (pam-backend.onrender.com)
- Staging frontend → Staging backend (wheels-wins-backend-staging.onrender.com)

### System Architecture Overview
```
Production:
Frontend (wheelsandwins.com) ◄──► Backend (pam-backend) ◄──► Shared Services
├── React/TS/PWA (Netlify)         ├── FastAPI/Redis               ├── Supabase DB
├── Vite 5.4.19                    ├── Celery Workers              ├── Mapbox GL
├── Tailwind 3.4.11                ├── WebSocket                   ├── Claude Sonnet 4.5
└── PWA Manifest                   └── TTS/STT                     └── Gemini Flash (fallback)

Staging:
Frontend (staging.netlify.app) ◄──► Backend (staging.onrender.com) ◄──► Shared Services
├── React/TS/PWA (Netlify)          ├── FastAPI/Redis                ├── Supabase DB
├── Vite 5.4.19                     ├── Celery Workers               ├── Mapbox GL
├── Tailwind 3.4.11                 ├── WebSocket                    ├── Claude Sonnet 4.5
└── PWA Manifest                    └── TTS/STT                      └── Gemini Flash (fallback)
```

## Environment Variables

### Frontend (.env)
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_MAPBOX_TOKEN=pk.your_mapbox_token
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### Backend (backend/.env)
```bash
DATABASE_URL=postgresql://...
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=your_anthropic_api_key  # PRIMARY - Claude Sonnet 4.5
GEMINI_API_KEY=your_gemini_api_key        # FALLBACK
OPENAI_API_KEY=your_openai_api_key        # Optional tertiary
TTS_ENABLED=true
REDIS_URL=redis://localhost:6379
CORS_ALLOWED_ORIGINS=https://wheelsandwins.com,https://wheels-wins-staging.netlify.app,http://localhost:8080
```

## Project Structure
```
src/
├── components/      # UI components
│   ├── wheels/     # Trip planning
│   ├── wins/       # Financial
│   ├── social/     # Community
│   └── pam/        # AI assistant
├── pages/          # Routes
├── hooks/          # Custom hooks
├── services/       # API clients
└── __tests__/      # Tests
```

## Deployment

### Frontend (Netlify - 2 Sites)
1. **Production**: main branch → wheelsandwins.com
2. **Staging**: staging branch → wheels-wins-staging.netlify.app
- **Build**: `npm run build`

### Backend (Render - 7 Services Total)

#### Production Services
1. **pam-backend**: https://pam-backend.onrender.com (main backend)
2. **pam-redis**: Private network cache for production
3. **pam-celery-worker**: Production background tasks
4. **pam-celery-beat**: Production task scheduler

#### Staging Services  
5. **wheels-wins-backend-staging**: https://wheels-wins-backend-staging.onrender.com
6. **wheels-wins-celery-worker-staging**: Staging background tasks


### Database (Supabase - Shared)
- **Single PostgreSQL instance** shared between staging and production
- RLS policies distinguish between environments via user context
- Tables: profiles, user_settings, pam_conversations, expenses, budgets
- Daily backups

## PAM AI Assistant Status (October 2025)

### Current Architecture (VERIFIED WORKING)
1. **Active Endpoint**: `/api/v1/pam/*` (backend/app/api/v1/pam_main.py)
2. **Frontend Service**: `src/services/pamService.ts` (single implementation)
3. **AI Provider**: Claude Sonnet 4.5 (claude-sonnet-4-5-20250929) with Gemini fallback
4. **Tool System**: 40+ tools registered and operational via Claude function calling
5. **WebSocket URL**: `/api/v1/pam/ws/${userId}?token=${token}`

### Tool Categories (40+ Total)
- **Budget Tools** (10): create_expense, analyze_budget, track_savings, update_budget, etc.
- **Trip Tools** (10+): plan_trip, find_rv_parks, optimize_route, calculate_gas_cost, etc.
- **Social Tools** (10): create_post, message_friend, comment_on_post, etc.
- **Shop Tools** (5): search_products, add_to_cart, checkout, etc.
- **Profile Tools** (5+): update_profile, update_settings, manage_privacy, etc.
- **Calendar Tools** (3): create_calendar_event, update_calendar_event, delete_calendar_event
- **Admin Tools** (2): add_knowledge, search_knowledge

### Tool Calling Format (CRITICAL)
**Important**: Claude API requires different tool format than OpenAI:
- OpenAI: `{"name": "...", "parameters": {...}}`
- Claude: `{"name": "...", "input_schema": {...}}`

Tool registry uses OpenAI format internally, but `claude_ai_service.py` converts to Claude format before sending to API.

### Known Limitations
1. **3 of 5 core tools loaded** (YouTube and one other have dependency issues)
2. **In-memory instances** - Needs Redis for production scale (Day 7 roadmap)
3. **No rate limiting** - Needs Redis-based rate limiting
4. **Limited persistence** - Conversation history in-memory only

### PAM Connection Endpoints

#### Production
- **WebSocket**: `wss://pam-backend.onrender.com/api/v1/pam/ws/{user_id}?token={jwt}`
- **Health**: https://pam-backend.onrender.com/api/health

#### Staging  
- **WebSocket**: `wss://wheels-wins-backend-staging.onrender.com/api/v1/pam/ws/{user_id}?token={jwt}`
- **Health**: https://wheels-wins-backend-staging.onrender.com/api/health

**IMPORTANT**: Each frontend must connect to its corresponding backend environment!

## MCP Servers Configuration

### 🔥 CRITICAL: Supabase MCP Server (PRIMARY TOOL)

**The Supabase MCP server is THE MOST IMPORTANT development tool for this project.**

**Why It's Critical:**
- Direct database access bypassing RLS (Row Level Security)
- Fix database issues without writing migration files
- Query and modify any table directly
- Troubleshoot authentication and permission issues
- Verify schema changes in real-time

**Capabilities:**
- **Direct Database Access**: Read all tables bypassing RLS policies
- **Table Management**: Create, modify, delete tables and schemas
- **Data Operations**: INSERT, UPDATE, DELETE records directly
- **Storage Operations**: Manage Supabase storage buckets
- **SQL Execution**: Run any SQL query directly
- **Admin Operations**: Full service role access

**Project Details:**
- **Project URL**: https://ydevatqwkoccxhtejdor.supabase.co
- **Access Level**: Full read/write via service role key
- **Security**: Service role key stored locally only, NEVER in codebase

**Common Use Cases:**
- Fix RLS policy issues blocking user access
- Verify database schema matches DATABASE_SCHEMA_REFERENCE.md
- Debug authentication problems
- Migrate data between tables
- Test database triggers and functions
- Investigate missing or corrupted records

**Setup:**
```bash
npm install -g @supabase/mcp-server-supabase
```

**Configuration:** `~/.config/claude-desktop/claude_desktop_config.json`

### Other MCP Servers (Optional)
- **Memory-Keeper**: ✅ Working - Session context persistence
- **GitHub**: ✅ Working - Repository operations

## Development Workflow

### Standard Development Process
Follow this structured approach for all features and fixes:

1. **Plan the Architecture** 
   - Create PRD (Product Requirements Document) using PLAN.md template
   - Write ADR (Architecture Decision Record) for technical decisions
   - Define system structure and component relationships

2. **Define Types and Tests as Guardrails**
   - Establish TypeScript interfaces and types first
   - Write test cases before implementation (TDD approach)
   - Create API contracts and data schemas

3. **Build with Parallel Agents**
   - Deploy specialized agents for different domains
   - Use `/double escape` for concurrent development streams
   - Coordinate through main session with context sharing

4. **Review Tests and Key Decisions**
   - Validate implementation against initial test cases
   - Review architecture decisions and document changes
   - Ensure quality standards and security requirements

5. **Document Everything in ADR**
   - Record all significant technical decisions
   - Update context files (cloud.md) with architectural changes
   - Maintain decision rationale for future reference

6. **Repeat with Full Context Preserved**
   - Archive completed work in context system
   - Update PLAN.md with lessons learned
   - Preserve knowledge for future iterations

### Workflow Tools
- **PLAN.md**: Structured planning templates in project root
- **cloud.md files**: Architecture and context documentation per subsystem
- **ADR templates**: Decision record formats in `/docs/decisions/`
- **`/double escape`**: Parallel agent deployment command
- **`/resume [context]`**: Context restoration between sessions
- **GitHub Integration**: Automated PR generation with context-rich descriptions

### Branch Protection & PR Requirements
- **Protected Branches**: staging and main branches are protected
- **Pull Request Required**: All commits must be made to non-protected branches and submitted via PR
- **Approval Required**: Pull requests require approval before merging
- **No Direct Pushes**: Cannot push directly to protected branches
- **Workflow**: Create feature branch → make changes → submit PR → get approval → merge

### Quality Gates
- All implementations must have corresponding tests
- TypeScript strict mode compliance required
- Security review for authentication and data handling
- Performance benchmarks for user-facing features
- Documentation updates for architectural changes

## Recent Fixes (October 2025)

### Latest Critical Fixes
1. **PAM Tool Calling** (October 17, 2025) - Commit 733a0ba5
   - Fixed Claude API tool format (OpenAI "parameters" → Claude "input_schema")
   - Fixed None value bug in assistant message content
   - Tools now execute properly via Claude function calling
   - Files: `backend/app/services/claude_ai_service.py`

2. **Calendar RLS Policies** (October 16, 2025)
   - Fixed 403 errors on calendar_events table
   - Updated RLS TO clause to include both `authenticated, anon` PostgreSQL roles
   - Key learning: JWT claims (role: "admin") ≠ PostgreSQL roles
   - Files: `docs/sql-fixes/fix_admin_role_properly.sql`

3. **PAM Tool Registry** (October 16, 2025) - Commit 95d77016
   - Connected tool registry to Claude API
   - Added tool retrieval and execution in send_message()
   - Initialized tool registry on backend startup
   - 3 core tools loaded: manage_finances, mapbox_navigator, weather_advisor

### Previous Fixes (January 2025)
1. **Animation System**: Removed problematic page transitions
2. **WebSocket Stability**: Fixed connection state management
3. **Database**: Fixed RLS recursion, created missing tables
4. **Environment Variables**: Smart detection for swapped values
5. **Serena Integration**: Semantic code analysis enabled

### Files Recently Updated
- `backend/app/services/claude_ai_service.py` - Tool format conversion
- `backend/app/main.py` - Tool registry initialization
- `docs/sql-fixes/fix_admin_role_properly.sql` - Calendar RLS fix
- `src/App.tsx` - Removed animations
- `src/integrations/supabase/client.ts` - Smart env detection

## Current Deployment Status (October 17, 2025)

### Staging Environment
- **Backend**: https://wheels-wins-backend-staging.onrender.com ✅ HEALTHY
- **Frontend**: https://wheels-wins-staging.netlify.app
- **Latest Deploy**: Commit 733a0ba5 (Tool format fix - deploying)
- **Branch**: staging

### Production Environment
- **Backend**: https://pam-backend.onrender.com
- **Frontend**: https://wheelsandwins.com
- **Status**: Stable (pre-tool-fix deployment)

### What to Test After Deployment
1. **Weather Tool**: "what's the weather like in Phoenix?"
   - Should call `weather_advisor` tool
   - Should return actual weather data (not ask for location)

2. **Finance Tool**: "add $40 diesel to my finances"
   - Should call `manage_finances` tool
   - Should save expense to database

3. **Backend Logs to Verify**:
   ```
   🔧 Passing 3 tools to Claude API (converted from OpenAI format)
   🔧 Executing tool: [tool_name]
   ✅ Tool [tool_name] executed successfully
   ```

## UI/UX Guidelines

### Navigation Hierarchy
- Keep to 3 levels maximum
- Primary actions in header
- Use segmented controls for view switching
- Mobile-first design

### Recent Improvements
- **Expenses Page**: Simplified from 4 to 3 navigation levels
- **Bank Statement Import**: Privacy-first, multi-format support
- **Components**: Clear visual hierarchy with proper spacing

### Bank Statement Converter
- **Privacy**: Client-side processing
- **Formats**: CSV, Excel, PDF
- **Security**: Auto-anonymization, GDPR compliant
- **Files**: `src/components/bank-statement/`, `src/services/bankStatement/`

## Anti-AI-Slop Rules (CRITICAL - READ FIRST)

### Code Quality Standards - NO EXCEPTIONS

**NEVER include any of the following patterns in code:**

#### 1. Emojis in Code or Comments
- **BANNED**: Any emoji in code, comments, or logging statements
- **Examples**: ✅ ❌ 🚀 💡 🚨 ⚠️ 🎉 🔥 🎯 💰 📋
- **Exception**: User-facing UI strings ONLY (e.g., toast messages, button labels)
- **Why**: Unprofessional, breaks text processing, IDE issues

```typescript
// BAD
logger.info("✅ User logged in successfully");
console.log("🚀 Starting process...");

// GOOD
logger.info("User logged in successfully");
console.log("Starting process...");
```

#### 2. Poor Error Handling
- **BANNED**: Bare console.log/console.error in try/catch blocks
- **BANNED**: Generic error messages without context
- **BANNED**: Swallowing errors silently

```typescript
// BAD
try {
  await fetchData();
} catch (error) {
  console.log(error); // Useless
}

// GOOD
try {
  await fetchData();
} catch (error) {
  if (error instanceof NetworkError) {
    logger.error("Network request failed", { error, endpoint });
    toast.error("Unable to load data. Please check your connection.");
  } else {
    logger.error("Unexpected error in fetchData", { error });
    throw error; // Re-throw if unhandled
  }
}
```

#### 3. Verbose or Obvious Comments
- **BANNED**: Comments that restate what the code does
- **BANNED**: "This function does X" when function name already says it
- **REQUIRED**: Comments explain WHY, not WHAT

```typescript
// BAD
// This function gets the user data
function getUserData() { ... }

// This increments the counter by 1
counter++;

// GOOD
// Cache user data for 5 minutes to reduce API calls
function getUserData() { ... }

// Increment must happen before validation due to race condition
counter++;
```

#### 4. Em-Dashes and Fancy Punctuation
- **BANNED**: Em-dashes (—) in code, comments, or UI text
- **USE**: Regular hyphens (-) or colons (:) instead
- **Why**: Encoding issues, copy-paste problems, accessibility

```typescript
// BAD
<p>Fill out as much or as little as you like — here's what you'll get</p>

// GOOD
<p>Fill out as much or as little as you like - here's what you'll get</p>
```

#### 5. Mismatched Naming and Logic
- **BANNED**: Variable names that don't match their content
- **BANNED**: Function names that don't describe their actual behavior

```typescript
// BAD
const userData = fetchCompanySettings(); // Name says user, returns company
function saveUser() { deleteUser(); } // Name says save, does delete

// GOOD
const companySettings = fetchCompanySettings();
function deleteUser() { deleteUser(); }
```

#### 6. Hardcoded Mock Data in Production Code
- **BANNED**: Mock data in files outside __tests__/ or __mocks__/
- **BANNED**: TODO comments saying "replace with real API"
- **REQUIRED**: Real implementations or clearly marked feature flags

```typescript
// BAD (in production file)
async function getWeather() {
  // TODO: Connect to real API
  return { temp: 72, condition: "sunny" };
}

// GOOD
async function getWeather(location: string) {
  const response = await fetch(`/api/weather?location=${location}`);
  return response.json();
}
```

#### 7. Repeated Code Blocks
- **BANNED**: Copy-pasted code with minor variations
- **REQUIRED**: Extract to shared function or use parameters

```typescript
// BAD
function processUserA() {
  validate();
  transform();
  save();
}
function processUserB() {
  validate();
  transform();
  save();
}

// GOOD
function processUser(type: 'A' | 'B') {
  validate();
  transform();
  save(type);
}
```

#### 8. Imports/Dependencies That Don't Exist
- **BANNED**: Importing non-existent packages
- **BANNED**: Using APIs that don't exist in the current version
- **REQUIRED**: Verify all imports against package.json

```typescript
// BAD
import { nonExistentFunction } from 'made-up-library';

// GOOD
// Check package.json first, then import
import { realFunction } from 'installed-library';
```

#### 9. Missing Integration Glue
- **BANNED**: Creating new features without connecting to existing systems
- **REQUIRED**: Wire new code into actual application flow

```typescript
// BAD - function exists but never called
async function newFeature() { ... }

// GOOD - function created AND registered
async function newFeature() { ... }
router.post('/new-feature', newFeature); // Wired up!
```

#### 10. Inconsistent Formatting
- **BANNED**: Mixing tabs and spaces
- **BANNED**: Inconsistent quote styles ('single' vs "double")
- **REQUIRED**: Follow project's existing style (see .prettierrc)

#### 11. Trivial or Meaningless Tests
- **BANNED**: Tests that don't actually test anything
- **BANNED**: Tests that just verify mocks return mocked values

```typescript
// BAD
test('getUserData works', () => {
  const mockData = { name: 'John' };
  jest.mock('api', () => ({ get: () => mockData }));
  expect(getUserData()).toBe(mockData); // Just testing the mock!
});

// GOOD
test('getUserData handles network errors gracefully', async () => {
  jest.spyOn(api, 'get').mockRejectedValue(new NetworkError());
  const result = await getUserData();
  expect(result).toBeNull();
  expect(logger.error).toHaveBeenCalledWith('Network error fetching user');
});
```

#### 12. Wrong or Hallucinated File Paths
- **BANNED**: Creating files in non-existent directories
- **REQUIRED**: Use Glob tool to verify directory structure first

```bash
# BAD - assuming directory exists
Write: /src/components/new-feature/Component.tsx

# GOOD - verify first
Glob: src/components/**
# Confirm directory exists or needs creation
# THEN write file
```

### Enforcement

**Before committing any code, verify:**
- [ ] No emojis in code/comments (UI strings excepted)
- [ ] All errors properly handled with context
- [ ] Comments explain WHY, not WHAT
- [ ] No em-dashes or fancy punctuation
- [ ] Variable names match their content
- [ ] No mock data in production paths
- [ ] No repeated code blocks (DRY principle)
- [ ] All imports exist in package.json
- [ ] New features wired into application
- [ ] Formatting consistent with project
- [ ] Tests actually test behavior
- [ ] File paths verified before creation

**Quality Check Command:**
```bash
# Run before every commit
npm run quality:check:full
npm run type-check
npm run lint
```

---

## Development Guidelines

### Code Standards
- **TypeScript**: Strict mode (currently false for dev velocity)
- **Testing**: 80%+ coverage requirement
- **Mobile-first**: Responsive design
- **Accessibility**: WCAG compliance
- **No mock data**: Production-ready code only

### SQL File Guidelines
- **Executable SQL Only**: SQL files must contain ONLY executable SQL statements that will run in Supabase
- **No Comments**: Never include SQL comments, explanations, or documentation in SQL files
- **No Instructions**: Never include "run separately" or other execution instructions
- **Batch Execution**: All SQL should be designed to run as a complete script
- **Clean Format**: One statement per line, no explanatory text
- **Location**: Always save SQL files in `docs/sql-fixes/` folder

### Bundle Strategy (vite.config.ts)
```javascript
{
  'react-vendor': ['react', 'react-dom'],
  'mapbox-vendor': ['mapbox-gl'],
  'radix-vendor': [...],
  'chart-vendor': ['recharts'],
  'utils-vendor': ['clsx', 'tailwind-merge']
}
```

### Component Template
```typescript
interface ComponentProps {
  title: string;
  onAction: (data: string) => void;
  isLoading?: boolean;
}

export const MyComponent: React.FC<ComponentProps> = ({
  title,
  onAction,
  isLoading = false
}) => {
  // Implementation
};
```

## Security Best Practices
- Supabase Auth with JWT
- RLS on all tables
- Input validation
- XSS prevention
- Rate limiting
- GDPR compliance

## Common Pitfalls
1. **Port**: Use 8080, NOT 3000
2. **PAM**: Don't create new implementations, fix existing
3. **Env vars**: Use VITE_ prefix for frontend
4. **Staging**: Always test there first
5. **RLS**: Test for recursion
6. **Environment Mismatch**: Staging frontend pointing to production backend
7. **CORS Issues**: Backend CORS origins must include both staging and production URLs
8. **JWT Secrets**: Must match between frontend and corresponding backend environment

## Environment Troubleshooting

### Critical Environment Checks
When debugging staging/production issues, verify:

1. **Frontend→Backend Mapping**:
   ```bash
   # Production should use:
   VITE_API_BASE_URL=https://pam-backend.onrender.com

   # Staging should use:
   VITE_API_BASE_URL=https://wheels-wins-backend-staging.onrender.com
   ```

2. **Backend CORS Configuration**:
   ```python
   # Backend main.py must include both:
   "https://wheelsandwins.com",
   "https://wheels-wins-staging.netlify.app"
   ```

3. **JWT Token Compatibility**:
   - Staging frontend + staging backend = OK
   - Production frontend + production backend = OK
   - Cross-environment = FAIL (JWT decode failures)

### Common Error Patterns
- `"<!doctype"... is not valid JSON` = CORS/Environment mismatch
- `JWT decode failed: Signature verification failed` = Wrong backend for environment
- `Cannot connect to PAM backend` = Environment variable pointing to wrong backend

## Key Files
- `vite.config.ts` - Build configuration
- `src/hooks/useUserSettings.ts` - Settings sync
- `backend/app/api/v1/pam.py` - PAM WebSocket
- `docs/pam-current-state-breakdown.md` - Technical debt

## Testing Checklist
- [ ] Mobile responsive (375px, 768px, 1024px)
- [ ] Touch targets (min 44x44px)
- [ ] Dark mode
- [ ] Keyboard navigation
- [ ] Screen reader
- [ ] Loading/error/empty states

## Quick Debug
```bash
# Check TypeScript
npm run type-check

# Full quality check
npm run quality:check:full

# Backend server
cd backend && uvicorn app.main:app --reload --port 8000

# Test coverage
npm run test:coverage
```

---
**Remember**: This is a production app with real users. Test thoroughly, especially on mobile!