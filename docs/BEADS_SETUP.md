# Beads Issue Tracker Setup - Wheels & Wins

**Date**: January 15, 2025
**Status**: ✅ Complete
**Version**: Beads 0.9.2

## Overview

Beads is a lightweight, local-first issue tracker designed for solo developers and small teams. It uses SQLite for storage and provides a simple CLI for managing tasks, bugs, and features.

## Installation

### Prerequisites
- Go 1.21+ (installed via Homebrew: `brew install go`)

### Installation Steps
```bash
# Install beads
curl -fsSL https://raw.githubusercontent.com/steveyegge/beads/main/install.sh | bash

# Beads binary location
/Users/thabonel/go/bin/bd

# Initialize in project
cd /Users/thabonel/Code/wheels-wins-landing-page
/Users/thabonel/go/bin/bd init
```

## Project Structure

### Database
- **Location**: `.beads/wheels-wins-landing-page.db`
- **Size**: ~118KB
- **Type**: SQLite3

### Documentation
- **Quick Reference**: `.beads/README.md`
- **Setup Guide**: `docs/BEADS_SETUP.md` (this file)

## PAM Testing Structure

### Epic: wheels-wins-landing-page-1
**Title**: PAM Full Testing - January 2025
**Priority**: 0 (Highest)
**Type**: epic

### Tasks (6 total)

#### High Priority (P1)
1. **wheels-wins-landing-page-2**: Test PAM WebSocket Connection
   - Verify WebSocket connects successfully
   - Maintain stable connection
   - Test reconnection logic

2. **wheels-wins-landing-page-7**: Performance Testing
   - Response time <3s
   - Token reduction effectiveness
   - Caching performance

#### Medium Priority (P2)
3. **wheels-wins-landing-page-3**: Test Budget Tools (10 tools)
   - create_expense, analyze_budget, track_savings
   - update_budget, get_spending_summary
   - compare_vs_budget, predict_end_of_month
   - find_savings_opportunities, categorize_transaction
   - export_budget_report

4. **wheels-wins-landing-page-4**: Test Trip Tools (10 tools)
   - plan_trip, find_rv_parks, optimize_route
   - get_weather_forecast, calculate_gas_cost
   - find_cheap_gas, get_road_conditions
   - find_attractions, estimate_travel_time
   - save_favorite_spot

5. **wheels-wins-landing-page-5**: Test Voice Integration
   - Wake word detection ("Hey PAM")
   - Voice transcription (Whisper)
   - Text-to-speech (Edge TTS)

#### Low Priority (P3)
6. **wheels-wins-landing-page-6**: Test Savings Celebration
   - Confetti animation trigger
   - Savings threshold ($10+)
   - Share functionality

## Common Commands

### Viewing Issues
```bash
# List all issues
/Users/thabonel/go/bin/bd list

# List open issues only
/Users/thabonel/go/bin/bd list --status open

# Show specific issue
/Users/thabonel/go/bin/bd show wheels-wins-landing-page-2

# View in JSON format
/Users/thabonel/go/bin/bd list --json
```

### Managing Issues
```bash
# Create new task
/Users/thabonel/go/bin/bd create "Task title" -p 2 -t task -d "Description"

# Start working on issue
/Users/thabonel/go/bin/bd start wheels-wins-landing-page-2

# Mark issue as done
/Users/thabonel/go/bin/bd done wheels-wins-landing-page-2

# Close issue
/Users/thabonel/go/bin/bd close wheels-wins-landing-page-2

# Reopen issue
/Users/thabonel/go/bin/bd reopen wheels-wins-landing-page-2
```

### Dependencies
```bash
# Add dependency
/Users/thabonel/go/bin/bd dep add CHILD_ID PARENT_ID -t parent-child

# View dependency tree
/Users/thabonel/go/bin/bd dep tree wheels-wins-landing-page-1

# Check for cycles
/Users/thabonel/go/bin/bd dep cycles
```

### Labels & Filtering
```bash
# Add labels
/Users/thabonel/go/bin/bd label add wheels-wins-landing-page-2 testing,pam,backend

# List by priority
/Users/thabonel/go/bin/bd list -p 1  # High priority only

# List by type
/Users/thabonel/go/bin/bd list -t bug  # Bugs only
```

## Priority Levels

| Level | Name    | Use Case |
|-------|---------|----------|
| 0     | Highest | Critical bugs, blockers |
| 1     | High    | Important features, security issues |
| 2     | Medium  | Regular tasks (default) |
| 3     | Low     | Nice-to-have features |
| 4     | Lowest  | Future improvements |

## Issue Types

| Type    | Description |
|---------|-------------|
| epic    | Large feature or project (multiple tasks) |
| task    | Regular work item |
| bug     | Something broken |
| feature | New functionality |
| chore   | Maintenance work |

## Dependency Types

| Type           | Description |
|----------------|-------------|
| blocks         | This issue blocks another |
| related        | General relationship |
| parent-child   | Hierarchical (epic → tasks) |
| discovered-from| Found while working on another issue |

## Git Integration

Beads database is **local-only** (added to `.gitignore`):
```gitignore
# Beads Issue Tracker (local only)
.beads/*.db
.beads/*.db-journal
.beads/*.db-wal
.beads/*.db-shm
.beads/*.jsonl
```

### Rationale
- Personal task management (not team-wide)
- Avoids merge conflicts in SQLite database
- Keep project-wide issues in GitHub Issues
- Use beads for personal testing checklists

## External Reference Integration

Link beads issues to GitHub:
```bash
# Create issue with GitHub reference
/Users/thabonel/go/bin/bd create "Fix PAM WebSocket" --external-ref gh-264

# Show issue (displays GitHub link)
/Users/thabonel/go/bin/bd show wheels-wins-landing-page-8
```

## Workflow Example

### Testing PAM WebSocket Connection
```bash
# 1. Start working on task
/Users/thabonel/go/bin/bd start wheels-wins-landing-page-2

# 2. Run tests
npm run test:pam:auto

# 3. Add notes to issue
/Users/thabonel/go/bin/bd comment wheels-wins-landing-page-2 "WebSocket connects successfully. Response time: 1.2s"

# 4. Mark as done
/Users/thabonel/go/bin/bd done wheels-wins-landing-page-2

# 5. Move to next task
/Users/thabonel/go/bin/bd start wheels-wins-landing-page-3
```

## Tips & Best Practices

1. **Use JSON for scripting**: `bd list --json | jq '.[] | select(.priority == 1)'`
2. **Check blocked issues**: `bd blocked` - shows what's blocking your work
3. **Regular cleanup**: Archive completed tasks with `bd archive`
4. **Link to GitHub**: Use `--external-ref gh-XXX` for cross-reference
5. **Progress tracking**: Use `bd progress wheels-wins-landing-page-1` to see epic status

## Backup & Recovery

### Export Issues
```bash
# Export to JSON
/Users/thabonel/go/bin/bd export > beads-backup.json

# Export to JSONL (default beads format)
/Users/thabonel/go/bin/bd export --format jsonl > beads-backup.jsonl
```

### Import Issues
```bash
# Import from backup
/Users/thabonel/go/bin/bd import beads-backup.jsonl
```

### Database Backup
```bash
# Manual backup
cp .beads/wheels-wins-landing-page.db .beads/wheels-wins-landing-page-$(date +%Y%m%d).db.backup
```

## Resources

- **Official Repo**: https://github.com/steveyegge/beads
- **Version**: 0.9.2 (dev)
- **License**: MIT
- **Support**: GitHub Issues

## Next Steps

1. Start with WebSocket testing (wheels-wins-landing-page-2)
2. Document results in issue comments
3. Move through tasks by priority
4. Update PAM_FINAL_PLAN.md with progress

---

**Setup Complete**: ✅
**Ready for Testing**: ✅
**Total Tasks**: 6
**Epic**: PAM Full Testing - January 2025
