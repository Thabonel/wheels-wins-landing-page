# Claude Instructions for PAM AI System

## Project Context
You are working on **PAM (Personal Assistant Manager)**, an advanced AI system for nomadic lifestyle management. This is a production-ready system with 96.9% performance, 100% database coverage (39 tables), and 44 specialized tools.

## Essential Files to Read First

### 1. Always Start Here
- **MUST READ**: `/backend/docs/claude/planning.md` - Complete technical architecture
- **MUST READ**: `/backend/docs/claude/tasks.md` - Current task status and priorities
- **MUST READ**: `/backend/docs/claude/PRD.md` - Project requirements and scope

### 2. Reference Documentation
- `/backend/docs/PAM_GUIDE.md` - Complete implementation guide
- `/backend/docs/API_COMPREHENSIVE.md` - API documentation
- `/backend/docs/DEPLOYMENT.md` - Deployment instructions
- `/backend/.env.example` - Environment configuration

## Core Behavioral Rules

### 1. Task Management Protocol
- **ALWAYS** check `tasks.md` before starting any work
- **IMMEDIATELY** mark tasks as "In Progress" when starting
- **IMMEDIATELY** mark tasks as "Completed" when finished
- **ALWAYS** add new tasks when discovered during work
- **NEVER** work on tasks not listed in `tasks.md`
- **ALWAYS** update completion dates and notes

### 2. Architecture Compliance
- **FOLLOW** the architecture defined in `planning.md`
- **RESPECT** the existing 39-table database structure
- **USE** the unified database service pattern
- **MAINTAIN** the 44-tool structure across 13 categories
- **PRESERVE** the 5-phase context engineering pipeline

### 3. Code Quality Standards
- **MAINTAIN** 96.9% system performance benchmark
- **ENSURE** query times remain <100ms
- **PRESERVE** 79.8% cache hit rate
- **FOLLOW** existing code patterns and conventions
- **ADD** comprehensive error handling
- **INCLUDE** proper logging and monitoring

### 4. File Management Rules
- **NEVER** duplicate existing files
- **ALWAYS** edit existing files rather than creating new ones
- **RESPECT** the established folder structure
- **MAINTAIN** consistent naming conventions
- **PRESERVE** existing imports and dependencies

## PAM System Architecture Understanding

### Database Layer (39 Tables)
```
User Management (3): profiles, admin_users, user_active_sessions
PAM Core (7): pam_analytics_logs, pam_conversation_memory, pam_conversation_sessions, pam_memory, pam_user_context, pam_learning_events, pam_feedback
Financial (4): expenses, budgets, budget_categories, income_entries
Vehicle & Maintenance (3): maintenance_records, fuel_log, fuel_stations
Location & Travel (5): local_events, camping_locations, calendar_events, offroad_routes, manual_waypoints
Business & Hustles (3): youtube_hustles, hustle_ideas, user_hustle_attempts
E-commerce (3): shop_products, shop_orders, affiliate_sales
Social (5): social_groups, group_memberships, social_posts, marketplace_listings, facebook_groups
Analytics (3): analytics_summary, analytics_daily, active_recommendations
Other (3): chat_sessions, audio_cache, budget_summary
```

### Tool Categories (44 Tools)
```
Database Management (9): CRUD operations, bulk operations, health monitoring
Analytics Management (5): Event logging, daily analytics, insights generation
Session Management (5): Chat sessions, user sessions, cleanup
Vehicle & Maintenance (4): Maintenance logging, fuel tracking, station management
Cross-Domain Intelligence (8): User 360 analysis, trip correlation, ROI analysis
Original Domain Tools (13): Financial, social, business, travel tools
```

### Core Services
- **Unified Database Service**: Single access point for all 39 tables
- **Cross-Domain Intelligence**: Advanced analytics across all domains
- **Enhanced Context Engine**: 5-phase context processing
- **Redis Caching**: Performance optimization layer

## Development Protocols

### 1. Before Making Changes
- Read current task from `tasks.md`
- Understand the specific requirement
- Review existing code in target files
- Check for dependencies and impacts
- Plan the minimal necessary changes

### 2. During Development
- Follow existing code patterns
- Maintain performance benchmarks
- Use proper error handling
- Add appropriate logging
- Test changes thoroughly
- Update documentation if needed

### 3. After Completion
- Mark task as completed in `tasks.md`
- Add completion date and notes
- Identify any new tasks discovered
- Update relevant documentation
- Verify system still meets performance targets

## Key Performance Targets

### System Performance
- **Overall Score**: Maintain 96.9%+
- **Query Time**: <100ms average
- **Cache Hit Rate**: >75%
- **Database Coverage**: 100% (39/39 tables)
- **Tool Availability**: 44 tools functional

### Code Quality
- **Error Rate**: <1%
- **Test Coverage**: >95%
- **Documentation**: Keep current
- **Security**: Maintain RLS and user scoping

## Common Workflows

### 1. Adding New Features
1. Add task to `tasks.md`
2. Design within existing architecture
3. Implement using established patterns
4. Test thoroughly
5. Update documentation
6. Mark task complete

### 2. Bug Fixes
1. Identify root cause
2. Add debugging task to `tasks.md`
3. Fix using minimal changes
4. Test fix thoroughly
5. Update tests if needed
6. Mark task complete

### 3. Performance Optimization
1. Identify bottleneck
2. Add optimization task to `tasks.md`
3. Implement improvement
4. Verify performance gain
5. Update benchmarks
6. Mark task complete

## File Structure Understanding

### Core Application Files
```
/backend/
├── app/
│   ├── services/pam/
│   │   ├── database/unified_database_service.py
│   │   ├── intelligence/cross_domain_service.py
│   │   ├── context_engineering/enhanced_context_engine.py
│   │   └── mcp/tools/ (44 tools across 13 categories)
│   ├── api/
│   ├── core/
│   └── main.py
├── docs/
└── tests/
```

### Key Configuration Files
- `.env.example` - Environment configuration template
- `requirements.txt` - Python dependencies
- `docker-compose.yml` - Container orchestration
- `test_pam_100_percent_control.py` - Comprehensive test suite

## Testing Requirements

### Before Code Changes
- Run existing tests to ensure baseline
- Identify tests that need updates
- Plan test additions for new features

### After Code Changes
- Run comprehensive test suite
- Verify all 44 tools still function
- Check database connectivity to all 39 tables
- Validate performance metrics
- Test error handling paths

### Test Commands
```bash
# Run comprehensive PAM tests
python test_pam_100_percent_control.py

# Run specific test categories
pytest tests/unit/
pytest tests/integration/
pytest tests/performance/

# Check PAM system health
python -c "from app.services.pam.database.unified_database_service import get_pam_database_service; import asyncio; asyncio.run(get_pam_database_service().get_stats())"
```

## Error Handling Protocol

### When Errors Occur
1. **Document** the error in `tasks.md`
2. **Investigate** root cause thoroughly
3. **Fix** using minimal invasive changes
4. **Test** fix comprehensively
5. **Update** error handling if needed
6. **Mark** task complete with notes

### Common Error Scenarios
- Database connection issues
- API rate limiting
- Cache misses
- Memory issues
- Performance degradation

## Security Considerations

### Always Maintain
- Row Level Security (RLS) on all tables
- User-scoped database operations
- Proper authentication checks
- Rate limiting on API endpoints
- Input validation and sanitization

### Never Compromise
- User data privacy
- API key security
- Database access controls
- Session management
- Cross-user data access

## Communication Guidelines

### When Asking Questions
- Reference specific files and line numbers
- Provide context from `tasks.md`
- Explain the business impact
- Suggest potential solutions
- Ask for clarification on requirements

### When Reporting Progress
- Update `tasks.md` with current status
- Mention any blockers or challenges
- Provide performance impact assessment
- List any new tasks discovered
- Confirm completion criteria

## Success Criteria

### Task Completion
- All requirements met as specified
- Performance targets maintained
- Tests passing
- Documentation updated
- `tasks.md` updated with completion

### System Health
- All 44 tools functional
- All 39 tables accessible
- Performance metrics within targets
- Error rates below thresholds
- User experience unimpacted

## Emergency Protocols

### If System Performance Drops
1. **Immediately** check database health
2. **Verify** Redis cache functionality
3. **Review** recent changes
4. **Rollback** if necessary
5. **Document** incident in `tasks.md`

### If Database Issues Occur
1. **Check** unified database service status
2. **Verify** all 39 tables accessibility
3. **Test** CRUD operations
4. **Review** connection pool status
5. **Escalate** if needed

Remember: PAM is a production system with real users. Always prioritize system stability and user experience over feature development speed.