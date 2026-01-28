# PAM Enhancement PRDs

This folder contains Product Requirements Documents (PRDs) for extending PAM's capabilities.

## Current State (Verified 2026-01-29)

- **Active Tools**: 48 registered and operational
- **Unregistered Tools**: 17 (exist in code but not exposed to Claude)
- **Missing Tools**: 3 feature areas have NO tools at all

## PRD Index

### Critical Gaps - New Tools Required

| # | PRD | Priority | Effort | Description |
|---|-----|----------|--------|-------------|
| 01 | [Transition System](./01-transition-system.md) | Critical | High | No PAM tools exist for the comprehensive transition planning system |
| 02 | [Maintenance Records](./02-maintenance-records.md) | Critical | Medium | No PAM tools exist for vehicle maintenance tracking |
| 03 | [Fuel Log Write Access](./03-fuel-log-write.md) | Medium | Low | PAM can read but not write fuel entries |

### Quick Wins - Register Existing Tools

| # | PRD | Priority | Effort | Description |
|---|-----|----------|--------|-------------|
| 04 | [Unregistered Tools](./04-unregistered-tools.md) | Low-Medium | Very Low | 17 tools exist in code but need registration |

## Implementation Phases

### Phase 1: Critical Gaps (High Priority)
1. **Transition System** - 11 new tools for checklist, equipment, shakedown, launch week
2. **Maintenance Records** - 4 new tools for service tracking and reminders

### Phase 2: Medium Priority
3. **Fuel Log Write** - 3 new tools for CRUD operations
4. **Register Quick Wins** - Simply add existing tools to registry

### Phase 3: Low Priority
5. Remaining unregistered tools as needed

## What PAM Already Does Well (48 Tools)

PAM is already capable in these areas:
- **Trip Planning** (8 tools): plan_trip, optimize_route, find_rv_parks, etc.
- **Budget & Finance** (9 tools): create_expense, analyze_budget, update_budget, etc.
- **Social** (5 tools): create_post, comment_on_post, like_post, etc.
- **Meal Planning** (7 tools): plan_meals, search_recipes, manage_pantry, etc.
- **Calendar** (3 tools): create/update/delete events
- **Shopping** (3 tools): search_products, get_product_details, recommend_products
- **And more...**

## Related Documentation

- [PAM Capability Gaps Report](../PAM_CAPABILITY_GAPS_REPORT.md) - Full analysis
- [PAM System Architecture](../PAM_SYSTEM_ARCHITECTURE.md) - Technical overview
- [Database Schema Reference](../DATABASE_SCHEMA_REFERENCE.md) - Table structures
