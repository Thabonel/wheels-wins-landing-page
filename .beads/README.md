# Beads Issue Tracker - Wheels & Wins

## Quick Reference

### Beads Location
Binary: `/Users/thabonel/go/bin/bd`
Database: `.beads/wheels-wins-landing-page.db`

### Common Commands

```bash
# View all issues
/Users/thabonel/go/bin/bd list

# View specific issue
/Users/thabonel/go/bin/bd show wheels-wins-landing-page-1

# Create new task
/Users/thabonel/go/bin/bd create "Task title" -p 2 -t task -d "Description"

# Start working on issue
/Users/thabonel/go/bin/bd start wheels-wins-landing-page-2

# Mark issue as done
/Users/thabonel/go/bin/bd done wheels-wins-landing-page-2

# Add dependency
/Users/thabonel/go/bin/bd dep add CHILD_ID PARENT_ID -t parent-child

# View dependencies
/Users/thabonel/go/bin/bd deps wheels-wins-landing-page-1
```

## Current PAM Testing Structure

**Epic:** wheels-wins-landing-page-1 - PAM Full Testing - January 2025

**Tasks:**
- wheels-wins-landing-page-2 (P1): Test PAM WebSocket Connection
- wheels-wins-landing-page-3 (P2): Test Budget Tools (10 tools)
- wheels-wins-landing-page-4 (P2): Test Trip Tools (10 tools)
- wheels-wins-landing-page-5 (P2): Test Voice Integration
- wheels-wins-landing-page-6 (P3): Test Savings Celebration
- wheels-wins-landing-page-7 (P1): Performance Testing

## Priority Levels
- 0: Highest (Critical)
- 1: High
- 2: Medium (Default)
- 3: Low
- 4: Lowest

## Issue Types
- epic: Large feature or project
- task: Regular work item
- bug: Something broken
- feature: New functionality
- chore: Maintenance work

## Dependency Types
- blocks: This issue blocks another
- related: General relationship
- parent-child: Hierarchical relationship
- discovered-from: Found while working on another issue

## Integration

Beads can integrate with:
- GitHub: Use `--external-ref gh-123`
- Jira: Use `--external-ref jira-ABC`

## Tips

1. Use JSON output for scripting: `bd list --json`
2. Filter by status: `bd list --status open`
3. View blocked issues: `bd blocked`
4. Search issues: `bd list | grep "keyword"`

## See Also
- Full documentation: https://github.com/steveyegge/beads
- Beads version: 0.9.2
