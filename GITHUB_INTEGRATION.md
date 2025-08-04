# GitHub Integration with Claude Code

## 🤖 Overview
Transform Claude Code into an autonomous GitHub bot that creates PRs, responds to issues, and handles code reviews for the Wheels & Wins project.

---

## 🚀 Initial Setup

### 1. Configure Claude Bot
```bash
# In your project root
claude code github setup
```

This will:
- Create a GitHub App for your account
- Generate webhook configuration
- Set up authentication tokens
- Create `.claude/github.yml` config file

### 2. Repository Configuration
Add to `.github/claude.yml`:
```yaml
# Claude Code GitHub Configuration
version: 1
bot:
  name: claude-wheels-wins
  trigger: "@claude"
  
permissions:
  issues: write
  pull_requests: write
  contents: write
  
autoResponse:
  enabled: true
  issues: true
  pullRequests: true
  
codeGeneration:
  maxFilesPerPR: 20
  maxLinesPerFile: 500
  testRequired: true
  
validation:
  - lint: "npm run lint"
  - typecheck: "npm run type-check"
  - test: "npm test"
  - build: "npm run build"
  
context:
  - cloud.md
  - CLAUDE.md
  - src/**/cloud.md
```

### 3. Environment Variables
Add to GitHub repository secrets:
```
CLAUDE_API_KEY=your_claude_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
MAPBOX_TOKEN=your_mapbox_token
```

---

## 📝 Issue Templates

### Feature Request Template
Create `.github/ISSUE_TEMPLATE/claude_feature.md`:
```markdown
---
name: Claude Feature Request
about: Request a new feature for Claude to implement
title: '[CLAUDE] '
labels: claude-bot, enhancement
assignees: ''
---

@claude

## Feature Description
[Clear description of what you want]

## Requirements
- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Requirement 3

## Technical Details
- Component location: src/components/[folder]/
- API endpoint needed: Yes/No
- Database changes: Yes/No
- Mobile responsive: Required

## Acceptance Criteria
- [ ] Feature works as described
- [ ] Tests included (80% coverage)
- [ ] Mobile responsive
- [ ] No console errors
- [ ] Documentation updated
```

### Bug Fix Template
Create `.github/ISSUE_TEMPLATE/claude_bugfix.md`:
```markdown
---
name: Claude Bug Fix
about: Report a bug for Claude to fix
title: '[CLAUDE-FIX] '
labels: claude-bot, bug
assignees: ''
---

@claude

## Bug Description
[What's broken]

## Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. See error

## Expected Behavior
[What should happen]

## Current Behavior
[What actually happens]

## Environment
- Browser: [e.g., Chrome 120]
- Device: [e.g., iPhone 12]
- Component: [e.g., TripPlanner]

## Fix Requirements
- Minimal changes only
- Add regression test
- Update CHANGELOG.md
```

---

## 🎯 Usage Examples

### 1. Simple Feature Addition
Create issue:
```markdown
@claude

Add a "Copy Trip" button to the TripPlanner component that duplicates the current trip with a new name.

Requirements:
- Add button next to "Save Trip"
- Show modal for new trip name
- Copy all waypoints and settings
- Redirect to new trip after creation
- Use existing Modal component
- Follow our button styling patterns
```

Claude will:
1. Read context files
2. Analyze TripPlanner component
3. Create implementation plan
4. Generate PR with code
5. Run validation tests
6. Tag you for review

### 2. Complex Multi-Component Feature
```markdown
@claude

Implement expense splitting feature for group trips.

## Requirements
1. **UI Components**:
   - Add SplitExpense component to Wins
   - Modify ExpenseForm to include participants
   - Create ExpenseSummary showing who owes whom

2. **Backend**:
   - Add split_expenses table
   - Create API endpoints for splits
   - Calculate balances per user

3. **Integration**:
   - Connect to existing expense tracking
   - Work with group trips feature
   - Send notifications for payments

## Technical Notes
- Use Tanstack Query for state
- Follow our TypeScript patterns
- Mobile-first design
- Add comprehensive tests

Split into 3 PRs if needed.
```

### 3. Performance Optimization
```markdown
@claude

Optimize map performance on mobile devices.

## Current Issues
- Map loads slowly on 4G
- Markers cause lag when panning
- Memory usage increases over time

## Requirements
- Implement marker clustering for 50+ markers
- Add viewport-based loading
- Optimize re-renders
- Clean up memory on unmount
- Maintain current functionality

## Success Metrics
- Initial load < 3 seconds on 4G
- 60 FPS when panning
- Memory stable after 10 minutes use

Use performance profiling to validate improvements.
```

### 4. Bug Fix with Investigation
```markdown
@claude

Fix: PAM voice responses sometimes cut off mid-sentence on iOS Safari.

## Investigation Needed
1. Check WebSocket message buffering
2. Review iOS Safari audio limitations
3. Test with different TTS engines
4. Check for race conditions

## Fix Requirements
- Work on all iOS versions 15+
- No degradation on other platforms
- Add specific iOS Safari tests
- Update error handling

Provide root cause analysis with fix.
```

---

## 🔄 Automated Workflows

### 1. Daily Maintenance
Create `.github/workflows/claude_daily.yml`:
```yaml
name: Claude Daily Maintenance
on:
  schedule:
    - cron: '0 9 * * *'  # 9 AM UTC daily

jobs:
  maintenance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Claude Maintenance
        run: |
          claude code github run-tasks <<EOF
          1. Check for outdated dependencies
          2. Run security audit
          3. Update TypeScript types from Supabase
          4. Check for unused exports
          5. Create issue for any problems found
          EOF
```

### 2. PR Review Automation
```yaml
name: Claude PR Review
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Claude Review
        run: |
          claude code github review-pr \
            --check-tests \
            --check-types \
            --check-mobile \
            --check-performance
```

### 3. Release Notes Generation
```yaml
name: Generate Release Notes
on:
  release:
    types: [created]

jobs:
  notes:
    runs-on: ubuntu-latest
    steps:
      - name: Generate Notes
        run: |
          claude code github release-notes \
            --since-tag ${{ github.event.release.tag_name }} \
            --categorize \
            --include-contributors
```

---

## 🎨 Advanced Patterns

### 1. Batch Feature Implementation
Create `FEATURES.md`:
```markdown
## Q1 2025 Features

### @claude High Priority
- [ ] Offline trip syncing with conflict resolution
- [ ] Expense receipt OCR scanning
- [ ] Voice commands for PAM navigation

### @claude Medium Priority  
- [ ] Social feed with trip sharing
- [ ] Weather-based route suggestions
- [ ] Fuel price integration

### @claude Low Priority
- [ ] Achievement badges system
- [ ] Trip photo galleries
- [ ] Community meetup scheduler
```

Run:
```bash
claude code github batch-implement FEATURES.md --priority high
```

### 2. Parallel PR Development
```bash
# Terminal 1
claude code github implement --issue 123 --branch feature/expense-split

# Terminal 2  
claude code github implement --issue 124 --branch feature/voice-nav

# Terminal 3
claude code github implement --issue 125 --branch fix/map-memory
```

### 3. AI Code Review Chain
```markdown
@claude review this PR critically
@gemini provide security analysis  
@gpt-4 suggest performance improvements
@claude incorporate all feedback and update PR
```

---

## 🛡️ Safety & Best Practices

### 1. PR Size Limits
```yaml
# .claude/github.yml
limits:
  maxFilesPerPR: 15
  maxLinesPerPR: 800
  maxCommitsPerPR: 10
  requireTests: true
  requireReview: true
```

### 2. Protected Branches
```yaml
# GitHub branch protection rules
- Require PR reviews before merging
- Require status checks (lint, test, build)
- Require up-to-date branches
- Include administrators
```

### 3. Claude Permissions
```yaml
# Restrict Claude's abilities
permissions:
  allowedPaths:
    - src/**
    - backend/**
    - tests/**
  blockedPaths:
    - .env*
    - secrets/**
    - .github/workflows/deploy.yml
  blockedOperations:
    - force-push
    - branch-deletion
    - tag-creation
```

---

## 📊 Monitoring & Analytics

### 1. Claude Activity Dashboard
Access at: `https://github.com/[org]/[repo]/insights/claude`

Metrics:
- PRs created per week
- Average PR completion time
- Test coverage improvements
- Bug fix success rate
- Code quality trends

### 2. Cost Tracking
```bash
# Check Claude API usage
claude code github usage --this-month

# Set spending alerts
claude code github set-limit --monthly 100 --alert 80
```

### 3. Performance Metrics
Track in `CLAUDE_METRICS.md`:
```markdown
## Claude Performance - January 2025

### PRs Created
- Total: 47
- Merged: 41 (87%)
- Reverted: 2 (4%)

### Code Quality
- Test Coverage: +15%
- Bundle Size: -8%
- Lighthouse Score: +12

### Time Savings
- Average PR time: 2 hours → 15 minutes
- Bug fix time: 4 hours → 45 minutes
- Feature development: 2 days → 4 hours
```

---

## 🚨 Troubleshooting

### Common Issues

**Claude not responding to @claude**
```bash
# Check webhook delivery
claude code github test-webhook

# Verify bot permissions
claude code github check-permissions
```

**PRs failing validation**
```bash
# Run local validation
npm run quality:check:full

# Check Claude's environment
claude code github env-check
```

**Rate limiting**
```yaml
# Add to .claude/github.yml
rateLimits:
  requestsPerHour: 20
  concurrentPRs: 3
  retryAfter: 300  # seconds
```

---

## 🎯 Quick Start Checklist

- [ ] Run `claude code github setup`
- [ ] Add `.github/claude.yml` configuration
- [ ] Create issue templates
- [ ] Set repository secrets
- [ ] Configure branch protection
- [ ] Create first @claude issue
- [ ] Monitor first PR creation
- [ ] Adjust configuration as needed

---

## 📚 Resources

- [Claude Code Docs](https://docs.anthropic.com/claude-code)
- [GitHub Apps Guide](https://docs.github.com/apps)
- [Wheels & Wins Contributing](./CONTRIBUTING.md)
- [Project Context](./cloud.md)