# Wheels & Wins - Claude Code Prompt Library

## 🎯 Purpose
This document contains battle-tested prompts for common development tasks in the Wheels & Wins project. Copy and adapt these for maximum efficiency with Claude Code.

---

## 🔍 Context Building Prompts

### Initial Project Exploration
```
Prepare to discuss how the Wheels & Wins platform works. Read cloud.md, CLAUDE.md, and all subfolder cloud.md files. 
Analyze:
1. Frontend architecture (React, TypeScript, component structure)
2. Backend services (FastAPI, TTS, WebSocket)
3. Database design (Supabase, RLS policies)
4. External integrations (Mapbox, OpenAI)
5. Current issues in CHANGELOG.md
Do not write code. Summarize patterns and potential improvements.
```

### Feature-Specific Deep Dive
```
Explore the [PAM AI assistant/Trip Planning/Financial Management] system in detail.
Read all files in:
- src/components/[pam|wheels|wins]/
- src/services/[pam|trips|expenses].ts
- src/hooks/use[Pam|Trips|Expenses].ts
- backend/app/services/[relevant].py
Identify the data flow, state management approach, and integration points.
```

---

## 📋 Planning Prompts

### New Feature Planning
```
Think hard. Create a plan to add [offline trip syncing] to Wheels & Wins.
Requirements:
- Work offline using service workers
- Sync when connection restored
- Handle conflicts gracefully
- Show sync status in UI

Break into 3 PRs (max 500 lines each):
1. Service worker setup and caching
2. Offline data management 
3. UI sync indicators

For each PR, specify:
- Key functions (1-2 sentences each)
- Test scenarios (5-10 words each)
- Dependencies to add
```

### Performance Optimization Planning
```
Analyze performance bottlenecks in [trip planning/expense calculations].
Current issues:
- [Slow map loads on mobile]
- [Bundle size too large]

Create optimization plan:
1. Quick wins (< 1 hour each)
2. Medium improvements (< 1 day each)
3. Major refactors (specify effort)

Include metrics to measure success.
```

### Bug Fix Planning
```
Debug the issue: "[PAM voice responses cutting off mid-sentence]"
1. Read error logs and related code
2. Identify root cause possibilities
3. Create minimal fix plan
4. List regression test scenarios
5. Suggest long-term improvements

Prefer surgical fixes over rewrites.
```

---

## 🔨 Execution Prompts

### Component Development
```
Implement PR #1: Create OfflineSyncIndicator component.
Requirements:
- Show sync status (synced/syncing/error/offline)
- Use existing UI components from src/components/ui/
- Follow our TypeScript patterns
- Mobile-first design with Tailwind
- Add to relevant pages (TripPlanner, ExpenseTracker)

Write clean code with no comments. Run quality checks.
```

### API Endpoint Creation
```
Add new endpoint: POST /api/v1/trips/{trip_id}/share
- FastAPI route in backend/app/api/v1/endpoints/trips.py
- Pydantic schemas for request/response
- Service layer logic in backend/app/services/trip.py
- Proper auth with dependency injection
- Return shareable link with expiration

Follow existing patterns. Add OpenAPI documentation.
```

### Database Migration
```
Using Supabase MCP, create migration for user preferences:
1. Analyze existing user tables and RLS policies
2. Create preferences table with:
   - theme (light/dark/auto)
   - notification settings (email/push/sms)
   - privacy settings (profile visibility)
3. Add RLS policies (users can only edit own)
4. Create TypeScript types
5. Test migration up and down

Generate SQL in supabase/migrations/ format.
```

### Test Writing
```
Write comprehensive tests for ExpenseTracker component:
1. Unit tests with React Testing Library
2. Mock useExpenses hook
3. Test scenarios:
   - Initial load state
   - Add/edit/delete expense
   - Category filtering
   - Date range selection
   - Error states
   - Mobile responsiveness
4. Achieve 90%+ coverage
Use existing test patterns from __tests__/
```

---

## 🔄 Refactoring Prompts

### Code Modernization
```
Refactor [TripPlanner component] to use modern React patterns:
- Convert class components to functional
- Replace Redux with Tanstack Query
- Use React.lazy for code splitting
- Implement proper error boundaries
- Add loading skeletons
Maintain exact functionality. Update tests.
```

### Performance Refactor
```
Optimize [map rendering] performance:
1. Profile current implementation
2. Implement:
   - Viewport-based marker clustering
   - Lazy load map overlays
   - Debounce user interactions
   - Memory cleanup on unmount
3. Measure improvements
4. Document optimizations in cloud.md
```

---

## 🐛 Debugging Prompts

### Complex Bug Investigation
```
Investigate: "WebSocket connection drops after 5 minutes on mobile"
1. Check backend/app/api/v1/pam.py WebSocket handler
2. Review connection lifecycle and heartbeat
3. Check mobile browser limitations
4. Analyze server logs from last 24h
5. Test on multiple devices
6. Propose fixes with minimal changes
Include root cause analysis.
```

### Memory Leak Hunt
```
Find memory leaks in trip planning feature:
1. Use Chrome DevTools heap snapshots
2. Check for:
   - Unremoved event listeners
   - Retained Mapbox instances
   - Circular references
   - Uncleared intervals/timeouts
3. Fix leaks with minimal refactoring
4. Add cleanup to useEffect returns
```

---

## 🚀 Deployment Prompts

### Pre-Deployment Checklist
```
Prepare [feature name] for production deployment:
1. Run full quality pipeline
2. Check bundle size impact
3. Test on slow 3G network
4. Verify mobile breakpoints
5. Check error tracking integration
6. Update environment variables docs
7. Add feature flag if needed
8. Update CHANGELOG.md
Report any blockers.
```

### Hotfix Deployment
```
Emergency fix for [production issue]:
1. Create minimal fix (no refactoring)
2. Add regression test
3. Test locally with production data
4. Create hotfix branch
5. Deploy to staging first
6. Monitor error rates
Keep changes under 50 lines.
```

---

## 💡 Review & Validation Prompts

### Code Review
```
My developer implemented [feature]. Review this code:
- Security vulnerabilities?
- Performance concerns?
- Accessibility issues?
- Mobile UX problems?
- Better approaches?
Be critical but constructive. Suggest specific improvements.
```

### Architecture Review
```
Review our approach to [state management/data fetching]:
Current: [Tanstack Query + Context]
Pros/cons given our requirements:
- Offline support needed
- Real-time updates
- 50k+ users scale
- React Native planned
Recommend improvements or alternatives.
```

---

## 🔗 Integration Prompts

### Third-Party Integration
```
Integrate [Stripe payments] into Wheels & Wins:
1. Research Stripe best practices
2. Plan integration points:
   - Premium subscriptions
   - Trip booking payments
   - Refund handling
3. Security requirements
4. PCI compliance needs
5. Testing approach
Create phased implementation plan.
```

### AI Feature Integration
```
Enhance PAM with [trip recommendation engine]:
1. Analyze current PAM architecture
2. Design recommendation algorithm:
   - User preferences
   - Past trips
   - Popular routes
   - Weather/season factors
3. Integration with OpenAI
4. Caching strategy
5. Fallback behavior
Keep PAM response times under 2s.
```

---

## 🎯 Quick Task Templates

### Add New Page
```
Create [User Settings] page:
- Route: /settings
- Components: UserProfile, Preferences, Security
- Use existing layout wrapper
- Mobile-first design
- Connect to auth context
- Add to navigation
```

### Add API Integration
```
Add [weather API] integration:
- Service in src/services/weather.ts
- Use Tanstack Query
- Cache for 1 hour
- Handle errors gracefully
- Add TypeScript types
```

### Fix TypeScript Error
```
Fix TS error in [file:line]:
- Understand the type issue
- Fix without using 'any'
- Update related types
- Ensure no new errors
```

---

## 📝 Documentation Prompts

### Feature Documentation
```
Document [new feature] for other developers:
1. Update relevant cloud.md files
2. Add inline JSDoc comments
3. Create usage examples
4. Update API documentation
5. Add to user guide if needed
Keep concise but complete.
```

### Troubleshooting Guide
```
Create troubleshooting guide for [common issue]:
1. Problem description
2. Common causes
3. Step-by-step diagnosis
4. Solutions (quick to complex)
5. Prevention tips
Add to relevant documentation.
```

---

## 🎮 Usage Tips

1. **Always build context first** - Never skip the exploration phase
2. **Be specific** - Replace [bracketed] sections with actual requirements
3. **Chain prompts** - Use planning output as input for execution
4. **Validate often** - Run quality checks after each implementation
5. **Use MCP servers** - Leverage Supabase, Serena, and Render integrations

Remember: These prompts are starting points. Adapt them based on:
- Current codebase state
- Specific requirements
- Time constraints
- Team preferences