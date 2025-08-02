# Claude Code Subagents - Quick Start Guide

## What Are These Agents?
Specialized AI assistants that accelerate development of your Wheels & Wins platform. Each agent is an expert in specific technologies and can work independently or together.

## Basic Usage

### Single Agent Commands
```bash
# Frontend development
claude-code --agent react-frontend-specialist "Create responsive trip card with expense tracking"

# Backend development
claude-code --agent fastapi-backend-expert "Add secure expense API with validation"

# Full-stack features
claude-code --agent fullstack-integrator "Implement real-time trip collaboration"
```

### Predefined Workflows
```bash
# Complete feature development (90-180 min)
claude-code --workflow full-feature-development

# Security audit and fixes (2-3 hours)
claude-code --workflow security-audit-and-fix

# Performance optimization (2-3 hours)
claude-code --workflow performance-optimization
```

## Agent Quick Reference

### When to Use Which Agent

**🎨 Frontend Issues** → `react-frontend-specialist`
- UI components, styling, mobile responsiveness
- React hooks, state management, TanStack Query
- Performance optimization, lazy loading

**⚡ Backend Issues** → `fastapi-backend-expert`
- API endpoints, authentication, async patterns
- Database integration, input validation
- Performance optimization, caching

**🔗 Full-Stack Features** → `fullstack-integrator`
- End-to-end feature development
- Frontend ↔ Backend integration
- Real-time features, WebSocket integration

**🗄️ Database Work** → `database-architect`
- Schema design, migrations, RLS policies
- Query optimization, indexing
- Performance tuning

**🛡️ Security Issues** → `security-specialist`
- Vulnerability assessment and fixes
- Authentication strengthening
- Input validation, OWASP compliance

**⚡ Performance Problems** → `performance-optimizer`
- Bundle size optimization
- API response time improvements
- Database query optimization

**🧪 Testing Needs** → `testing-automation-expert`
- Unit, integration, E2E tests
- Test coverage improvements
- Automated testing setup

**🚀 Deployment Issues** → `deployment-specialist`
- Docker, CI/CD, environment management
- Render.com/Netlify deployment
- Health monitoring setup

**🤖 AI Features** → `ai-features-specialist`
- PAM AI enhancements
- Voice processing, TTS improvements
- OpenAI integration

**🏗️ Infrastructure** → `devops-infrastructure`
- Monitoring, logging, alerting
- SSL, backup, cost optimization

## Common Usage Patterns

### New Feature Development
```bash
# 1. Plan the feature
claude-code --agent database-architect "Design schema for [feature]"

# 2. Backend implementation
claude-code --agent fastapi-backend-expert "Implement [feature] API"

# 3. Frontend implementation
claude-code --agent react-frontend-specialist "Create [feature] UI"

# 4. Integration & testing
claude-code --agent fullstack-integrator "Connect [feature] end-to-end"
claude-code --agent testing-automation-expert "Add tests for [feature]"
```

### Bug Fixes
```bash
# Frontend bug
claude-code --agent react-frontend-specialist "Fix [specific issue]"

# Backend bug
claude-code --agent fastapi-backend-expert "Fix [specific issue]"

# Performance bug
claude-code --agent performance-optimizer "Fix slow [component/endpoint]"
```

### Before Deployment
```bash
claude-code --agent security-specialist "Security review of recent changes"
claude-code --agent performance-optimizer "Performance impact assessment"
claude-code --agent testing-automation-expert "Run comprehensive test suite"
```

## Writing Effective Commands

### ✅ Good Commands (Specific & Clear)
```bash
"Create responsive expense entry form with validation and photo upload"
"Add voice command expense logging for hands-free entry while driving"
"Optimize trip dashboard loading time from 3s to under 1s"
"Fix SQL injection vulnerability in expense filtering endpoints"
```

### ❌ Less Effective Commands (Too Vague)
```bash
"Make the app better"
"Fix the bugs"
"Add features"
"Improve performance"
```

## Multi-Agent Workflows
```bash
# Combine multiple agents for complex tasks
claude-code --agents security-specialist,performance-optimizer "Security audit with performance analysis"

claude-code --agents database-architect,fastapi-backend-expert,react-frontend-specialist "Complete trip collaboration feature"
```

## Time Expectations

**Quick Tasks (5-15 min)**
- Single component fixes
- Simple API endpoints
- Small configuration changes

**Medium Tasks (15-45 min)**
- Complex components with state
- Multi-endpoint features
- Integration between layers

**Large Tasks (45-120 min)**
- Complete features
- Security audits
- Performance optimization

**Full Workflows (1-3 hours)**
- End-to-end feature development
- Comprehensive security review
- Full-stack performance tuning

## Quality Standards
All agents enforce:
- ✅ TypeScript strict mode
- ✅ 80%+ test coverage
- ✅ ESLint/Prettier formatting
- ✅ Mobile responsiveness
- ✅ Security best practices
- ✅ Performance optimization

## Troubleshooting

**Agent not responding?**
- Check command syntax
- Ensure specific, clear instructions
- Try breaking down complex requests

**Quality checks failing?**
```bash
claude-code --agent testing-automation-expert "Diagnose quality check failures"
```

**Need help choosing an agent?**
- Frontend issues → react-frontend-specialist
- Backend issues → fastapi-backend-expert
- Full features → fullstack-integrator
- Performance → performance-optimizer
- Security → security-specialist

## Quick Examples

```bash
# Common development tasks
claude-code --agent react-frontend-specialist "Add dark mode toggle to settings page"
claude-code --agent fastapi-backend-expert "Add rate limiting to PAM chat endpoint"
claude-code --agent fullstack-integrator "Implement trip photo sharing with real-time updates"
claude-code --agent database-architect "Add indexes to optimize expense queries"
claude-code --agent security-specialist "Scan for XSS vulnerabilities in trip forms"
claude-code --agent performance-optimizer "Reduce Mapbox bundle size with lazy loading"
```

---

**Ready to accelerate your development?** Start with:
```bash
claude-code --agent react-frontend-specialist "Help me understand what you can do"
```

The agents handle the complexity while you focus on building amazing travel experiences! 🚗✨