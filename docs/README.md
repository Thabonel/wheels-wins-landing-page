# Wheels & Wins Documentation Hub

## 📚 Documentation Structure

Our documentation is organized into logical categories for easy navigation. Each folder contains related documents with a clear naming convention.

### Directory Structure

```
docs/
├── 🏗️ architecture/        - System design and infrastructure
├── 🚀 deployment/          - Deployment guides and configurations
├── ✨ features/            - Feature documentation and specs
├── 📖 guides/              - Development guides and tutorials
├── 🔧 technical/           - Technical specs and API docs
├── 🤖 pam/                 - PAM AI Assistant documentation
├── 📝 conversations/       - Development session logs
├── 🔍 technical-audits/    - Code audits and reviews
├── 🐛 troubleshooting/     - Bug fixes and solutions
├── 📊 project-management/  - Project overview and planning
└── 🗄️ archive/             - Deprecated documentation
```

## 🎯 Quick Navigation

### Getting Started
- **New Developer?** → [Project Overview](./project-management/PROJECT_OVERVIEW.md)
- **Setting Up?** → [Initial Setup Guide](./guides/setup/initial-setup.md)
- **Deploying?** → [Deployment Guide](./deployment/README.md)
- **Having Issues?** → [Troubleshooting](./troubleshooting/)

### By Feature Area

#### 🗺️ Trip Planning & Maps
- [Map Component Implementation](./technical/map-component.md)
- [Mapbox Security Guide](./technical/MAPBOX_SECURITY_GUIDE.md)
- [Trip Planner Replacement Summary](./conversations/trip-planner-replacement-summary.md)
- **NEW** [Trip Planner Panel Controls Fix](./conversations/2025-08-23-trip-planner-panels-fix.md)

#### 🤖 PAM AI Assistant
- [PAM Feature Overview](./features/pam-ai-assistant.md)
- [Technical Architecture](./pam/pam-current-state-breakdown.md)
- [Voice Integration](./pam/pam-voice-integration-analysis.md)
- [Technical Audit](./pam/PAM_TECHNICAL_AUDIT_MAIN_BRANCH_VERIFIED.md)
- [Migration Plans](./pam/pam-migration-session-summary.md)
- [Simplification Strategy](./pam/pam-simplification-plan.md)

#### 💰 Financial Management (Wins)
- [Financial Features Overview](./features/financial-management.md)
- [Shopping & Marketplace](./features/shopping-marketplace.md)
- [Subscription & Billing](./features/subscription-billing.md)
- [Bank Statement Import Debug](./conversations/BANK_STATEMENT_DEBUG_SESSION_AUG2025.md)

#### 👥 Social & Community
- [Social Networking Features](./features/social-networking.md)
- [User Knowledge Management](./features/user-knowledge-management.md)
- [Safety Resources](./features/safety-resources.md)

#### 🚐 Travel & Vehicles (Wheels)
- [Travel & Vehicles Overview](./features/travel-vehicles.md)
- [Personal Organization Tools](./features/personal-organization.md)
- [Offline Functionality](./features/offline-functionality.md)

### Development Resources

#### 🛠️ Development Guides
- [AI Agents Guide](./guides/AI_AGENTS_GUIDE.md)
- [Animation Guide](./guides/ANIMATION_GUIDE.md)
- [Playwright MCP Setup](./guides/PLAYWRIGHT_MCP_SETUP.md)
- [Sentry Error Tracking](./guides/SENTRY_SETUP.md)

#### 🚀 Deployment & DevOps
- [Staging Environment Manual](./deployment/STAGING_ENVIRONMENT_MANUAL.md)
- [Environment Variables Guide](./deployment/environment-variables-comprehensive.md)
- [Multi-Service Architecture](./deployment/multi-service-architecture.md)
- [Production Deployment](./deployment/production-deployment.md)
- [Staging Backup Info](./deployment/STAGING_BACKUP_INFO.md)

#### 🔧 Technical Documentation
- [API Documentation](./technical/api-documentation.md)
- [Database Schema](./technical/database-schema.md)
- [Security Considerations](./technical/security-considerations.md)
- [Integration Patterns](./technical/integration-patterns.md)

### Recent Development Sessions

#### August 2025
- [2025-08-23: Trip Planner Panel Controls Fix](./conversations/2025-08-23-trip-planner-panels-fix.md) ⭐ NEW
- [2025-08-10: PAM Development Session](./conversations/PAM_DEVELOPMENT_SESSION_2025-08-10.md)

#### January 2025
- [2025-01-10: Critical Backend Fixes](./conversations/CRITICAL_BACKEND_FIXES_SESSION_2025-01-10.md)
- [2025-01-09: PAM WebSocket Fix](./conversations/pam-websocket-fix-2025-01-09.md)
- [2025-01-09: PAM Analysis Session](./conversations/2025-01-09-pam-analysis-session.md)
- [2025-01-04: Backend Fixes Log](./conversations/conversation-log-backend-fixes-2025-01-04.md)

### Critical Fixes & Troubleshooting

#### 🚨 Emergency Fixes
- [Emergency Site Fix](./troubleshooting/EMERGENCY_SITE_FIX.md)
- [Critical Bug Fixes Phase 5 - Voice](./troubleshooting/CRITICAL_BUG_FIXES_PHASE5_VOICE.md)
- [WebSocket Fix Summary](./troubleshooting/WEBSOCKET_FIX_SUMMARY.md)

#### 🐛 Common Issues
- [Admin Access Issues](./guides/troubleshooting/admin-access-issues.md)
- [API Errors](./guides/troubleshooting/api-errors.md)
- [Deployment Issues](./guides/troubleshooting/deployment-issues.md)
- [Debugging Guide](./guides/troubleshooting/debugging-guide.md)

## 📋 Document Naming Conventions

### Session Logs
Format: `YYYY-MM-DD-feature-description.md`
- Example: `2025-08-23-trip-planner-panels-fix.md`

### Feature Documentation
Format: `feature-name.md` (lowercase, hyphenated)
- Example: `pam-ai-assistant.md`

### Technical Documentation
Format: `TECHNICAL_TOPIC.md` (uppercase for critical docs)
- Example: `PAM_TECHNICAL_AUDIT.md`

### Guides
Format: `topic-guide.md` or `TOPIC_GUIDE.md` (based on importance)
- Example: `animation-guide.md` or `AI_AGENTS_GUIDE.md`

## 🔄 Document Status Legend

| Status | Icon | Description |
|--------|------|-------------|
| Current | ✅ | Up-to-date and accurate |
| Needs Update | ⚠️ | Partially outdated, needs revision |
| In Progress | 🚧 | Currently being written/updated |
| Planned | 📝 | Documentation needed but not created |
| Deprecated | 🗑️ | No longer relevant, kept for reference |
| New | ⭐ | Recently added documentation |

## 🔍 Finding Documents by Use Case

### "I need to understand the system"
1. Start with [Project Overview](./project-management/PROJECT_OVERVIEW.md)
2. Review [Architecture Documentation](./architecture/)
3. Explore [Feature Documentation](./features/)

### "I need to fix something"
1. Check [Troubleshooting Guides](./troubleshooting/)
2. Review [Recent Conversations](./conversations/)
3. Look at [Technical Audits](./technical-audits/)

### "I need to deploy"
1. Follow [Deployment Guides](./deployment/)
2. Configure [Environment Variables](./deployment/environment-variables-comprehensive.md)
3. Use [Staging Environment](./deployment/STAGING_ENVIRONMENT_MANUAL.md)

### "I need to develop a feature"
1. Read [Feature Documentation](./features/)
2. Follow [Development Guides](./guides/)
3. Check [Similar Implementations](./conversations/)

### "I need to understand PAM"
1. Start with [PAM Overview](./features/pam-ai-assistant.md)
2. Review [Technical Documentation](./pam/)
3. Check [Recent PAM Sessions](./conversations/)

## 📊 Project Management

- [Project Overview](./project-management/PROJECT_OVERVIEW.md)
- [Project Guide](./project-management/Project_Guide.md)
- [Changelog January 2025](./project-management/CHANGELOG_JANUARY_2025.md)
- [Legal Compliance](./project-management/legal-compliance.md)

## 🛡️ Current System Status

### Production Environment
- **Frontend**: Netlify (React/TypeScript/Vite)
- **Backend**: Render.com (Multi-service architecture)
- **Database**: Supabase (PostgreSQL with RLS)
- **AI Services**: OpenAI GPT-4, Multi-engine TTS/STT

### Recent Improvements (August 2025)
- ✅ Trip Planner 2 panel controls fixed
- ✅ Fullscreen mode z-index issues resolved
- ✅ Documentation reorganized for better navigation
- ✅ 42 duplicate files cleaned up

### Known Issues
- ⚠️ PAM WebSocket connection requires refactoring
- ⚠️ Some test coverage gaps remain
- ⚠️ Performance optimization needed for mobile

## 🔧 Maintaining Documentation

### When Adding New Documents
1. Place in the appropriate category folder
2. Follow naming conventions
3. Update this README index
4. Add to relevant section lists
5. Include status indicator if needed

### When Updating Existing Documents
1. Update the content
2. Update last modified date
3. Update status if changed
4. Ensure cross-references are valid

### Archiving Documents
1. Move to `/archive` folder
2. Add deprecation notice at top
3. Update references to point to new docs
4. Keep for historical reference

## 🆘 Need Help?

- **Quick Issues** → [Troubleshooting](./troubleshooting/)
- **Development Questions** → [Guides](./guides/)
- **Feature Information** → [Features](./features/)
- **Deployment Help** → [Deployment](./deployment/)
- **PAM Specific** → [PAM Documentation](./pam/)

---

*Last Updated: August 23, 2025*
*Documentation Version: 2.0*
*System Version: Wheels & Wins v1.2.0*