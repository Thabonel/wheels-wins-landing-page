# Claude Code Subagents - Quick Reference

## Agent Commands

### Core Development
```bash
# React frontend development
claude-code --agent react-frontend-specialist "Create responsive trip card component with expense tracking"

# FastAPI backend development  
claude-code --agent fastapi-backend-expert "Add secure expense categorization endpoint with validation"

# Full-stack integration
claude-code --agent fullstack-integrator "Implement real-time expense sync between frontend and backend"

# Performance optimization
claude-code --agent performance-optimizer "Optimize bundle size and API response times"
```

### Quality & Deployment
```bash
# Testing automation
claude-code --agent testing-automation-expert "Create comprehensive test suite for PAM voice features"

# Deployment management
claude-code --agent deployment-specialist "Set up Docker deployment with health checks"

# Database architecture
claude-code --agent database-architect "Design schema for trip collaboration with RLS policies"
```

### Advanced Features
```bash
# AI features development
claude-code --agent ai-features-specialist "Enhance PAM with location-aware travel suggestions"

# Security hardening
claude-code --agent security-specialist "Implement rate limiting and input validation"

# Infrastructure management
claude-code --agent devops-infrastructure "Set up monitoring and alerting for production"
```

## Workflow Commands

### Predefined Workflows
```bash
# Complete feature development (90-180 min)
claude-code --workflow full-feature-development

# Security audit and remediation (2-3 hours)  
claude-code --workflow security-audit-and-fix

# Performance optimization (2-3 hours)
claude-code --workflow performance-optimization
```

### Multi-Agent Workflows
```bash
# Database + Backend + Frontend
claude-code --agents database-architect,fastapi-backend-expert,react-frontend-specialist "Feature name"

# Security + Performance review
claude-code --agents security-specialist,performance-optimizer "Security audit with performance analysis"

# Testing + Deployment pipeline
claude-code --agents testing-automation-expert,deployment-specialist "Complete testing and deployment setup"
```

## Quick Tasks by Category

### Trip Management Features
```bash
# Trip planning enhancements
claude-code --agent fullstack-integrator "Add multi-stop route optimization with fuel cost calculations"

# Trip sharing features
claude-code --agent react-frontend-specialist "Create trip sharing interface with photo galleries"

# Trip collaboration
claude-code --agent ai-features-specialist "Add PAM voice commands for collaborative trip planning"
```

### Financial Tracking Features  
```bash
# Expense management
claude-code --agent fullstack-integrator "Add receipt OCR processing with categorization"

# Budget tracking
claude-code --agent react-frontend-specialist "Create budget visualization with spending trends"

# Financial insights
claude-code --agent ai-features-specialist "Add PAM financial advice based on spending patterns"
```

### Performance Optimizations
```bash
# Frontend optimization
claude-code --agent performance-optimizer "Reduce bundle size with lazy loading and code splitting"

# Backend optimization  
claude-code --agent performance-optimizer "Optimize API response times with caching strategies"

# Database optimization
claude-code --agent database-architect "Add indexes and optimize slow queries"
```

### Security Improvements
```bash
# Authentication hardening
claude-code --agent security-specialist "Strengthen JWT validation and session management"

# Input validation
claude-code --agent security-specialist "Add comprehensive input sanitization"

# API security
claude-code --agent security-specialist "Implement rate limiting and abuse prevention"
```

## Agent Specializations

### React Frontend Specialist
**Best for**: UI components, responsive design, state management, PWA features
```bash
# Component development
"Create mobile-optimized expense entry form with validation"

# State management  
"Implement TanStack Query for trip data with optimistic updates"

# Performance
"Add lazy loading for Mapbox components to reduce bundle size"

# Accessibility
"Ensure trip planning interface meets WCAG 2.1 standards"
```

### FastAPI Backend Expert  
**Best for**: API endpoints, authentication, async patterns, Supabase integration
```bash
# API development
"Create secure trip sharing endpoints with proper authorization"

# Authentication
"Implement robust JWT validation with token refresh"

# Database integration
"Add Supabase RLS integration for multi-tenant data access"

# Performance
"Optimize async patterns and database connection pooling"
```

### Fullstack Integrator
**Best for**: End-to-end features, API integration, real-time features
```bash
# Complete features
"Implement trip collaboration with real-time updates"

# API integration
"Connect expense tracking frontend to backend with error handling"

# Real-time features  
"Add WebSocket integration for live trip sharing"

# Data flow
"Design data synchronization between frontend and backend"
```

### Database Architect
**Best for**: Schema design, query optimization, RLS policies, migrations  
```bash
# Schema design
"Design database schema for trip collaboration features"

# Performance
"Optimize financial summary queries with materialized views"

# Security
"Implement RLS policies for multi-user trip access"

# Migrations
"Create safe database migration for schema changes"
```

### Performance Optimizer
**Best for**: Bundle optimization, API performance, database tuning, monitoring
```bash
# Bundle optimization
"Reduce initial bundle size below 2MB with strategic code splitting"

# API performance
"Optimize slow endpoints with caching and query improvements" 

# Database performance
"Add strategic indexes and optimize complex queries"

# Monitoring
"Set up performance monitoring and alerting"
```

### Testing Automation Expert
**Best for**: Unit tests, integration tests, E2E tests, test infrastructure
```bash
# Component testing
"Create comprehensive tests for trip planning components"

# API testing
"Add integration tests for expense tracking endpoints"

# E2E testing
"Create Playwright tests for complete user workflows"

# Test infrastructure
"Set up automated testing pipeline with coverage reporting"
```

### Security Specialist  
**Best for**: Vulnerability assessment, authentication, input validation, OWASP compliance
```bash
# Security audit
"Conduct comprehensive security assessment of API endpoints"

# Authentication
"Strengthen JWT implementation with additional security checks"

# Input validation
"Add robust input sanitization to prevent injection attacks"

# Compliance
"Ensure OWASP Top 10 compliance across the application"
```

### AI Features Specialist
**Best for**: PAM development, voice processing, OpenAI integration, conversational AI
```bash
# PAM enhancement
"Add location-aware travel suggestions to PAM responses"

# Voice features
"Implement hands-free expense logging via voice commands"

# AI integration
"Enhance PAM with trip planning assistance using OpenAI"

# Voice processing
"Optimize TTS fallback system for reliable voice responses"
```

### Deployment Specialist
**Best for**: Docker, CI/CD, Render/Netlify deployment, environment management
```bash
# Docker optimization
"Create multi-stage Docker build for production deployment"

# CI/CD pipeline
"Set up GitHub Actions with automated testing and deployment"

# Environment management
"Configure secure environment variable management"

# Deployment monitoring
"Add health checks and deployment validation"
```

### DevOps Infrastructure
**Best for**: Monitoring, logging, backup, SSL, cost optimization
```bash
# Monitoring setup
"Implement comprehensive application monitoring with alerts"

# Logging infrastructure
"Set up centralized logging with structured log analysis"

# Backup strategy
"Create automated backup and disaster recovery procedures"

# Cost optimization
"Analyze and optimize infrastructure costs across services"
```

## Common Patterns

### Feature Development Pattern
```bash
# 1. Plan architecture
claude-code --agent database-architect "Design schema for [feature]"

# 2. Backend implementation
claude-code --agent fastapi-backend-expert "Implement [feature] API endpoints"

# 3. Frontend implementation  
claude-code --agent react-frontend-specialist "Create [feature] UI components"

# 4. Integration
claude-code --agent fullstack-integrator "Connect [feature] frontend to backend"

# 5. Testing
claude-code --agent testing-automation-expert "Add comprehensive tests for [feature]"

# 6. Security review
claude-code --agent security-specialist "Security review of [feature] implementation"
```

### Bug Fix Pattern
```bash
# 1. Identify the layer
claude-code --agent [appropriate-specialist] "Investigate [bug description]"

# 2. Fix implementation
claude-code --agent [appropriate-specialist] "Fix [specific issue]"

# 3. Add tests
claude-code --agent testing-automation-expert "Add tests to prevent [bug] regression"

# 4. Verify fix
claude-code --agent [appropriate-specialist] "Verify [bug] is completely resolved"
```

### Performance Issue Pattern
```bash
# 1. Identify bottleneck
claude-code --agent performance-optimizer "Analyze performance issue in [area]"

# 2. Layer-specific optimization
claude-code --agent [frontend/backend/database-specialist] "Optimize [specific bottleneck]"

# 3. Validate improvement
claude-code --agent performance-optimizer "Validate performance improvements"

# 4. Monitor
claude-code --agent devops-infrastructure "Set up monitoring for [performance metric]"
```

## Time Estimates

### Quick Tasks (5-15 minutes)
- Single component creation
- Simple API endpoint
- Basic test additions
- Small configuration changes

### Medium Tasks (15-45 minutes)  
- Complex component with state management
- Multi-endpoint API feature
- Integration between layers
- Comprehensive test suite

### Large Tasks (45-120 minutes)
- Complete feature development
- Security audit and fixes
- Performance optimization
- Database schema changes

### Workflows (1-3 hours)
- Full feature development workflow
- Security audit and remediation  
- Performance optimization workflow
- Complete testing implementation

## Tips for Best Results

### Be Specific
```bash
# Good: Specific and actionable
"Create responsive trip card component with expense summary, edit functionality, and loading states"

# Less effective: Too vague
"Make the trip page better"
```

### Include Context
```bash
# Good: Provides context
"Add voice command expense logging to PAM for hands-free entry while driving"

# Less effective: Missing context
"Add voice commands"
```

### Specify Requirements
```bash
# Good: Clear requirements
"Implement trip sharing with public/private visibility, photo uploads (max 10), and expense summaries"

# Less effective: Unclear scope
"Add trip sharing"
```

### Use Appropriate Agent
```bash
# Good: Right agent for the task
claude-code --agent security-specialist "Fix SQL injection vulnerability in expense endpoints"

# Less effective: Wrong agent
claude-code --agent react-frontend-specialist "Fix SQL injection vulnerability"
```

This quick reference helps you get maximum productivity from the Claude Code subagent system\! 🚀
EOF < /dev/null