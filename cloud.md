# Wheels & Wins - Master Project Context

## 🚀 Project Architecture Overview

**Wheels & Wins** is a comprehensive RV travel and financial management platform with AI-powered assistance through PAM (Personal Assistant Motorhome).

### Core Architecture Stack
```
Frontend (React/TS/PWA) ◄──► Backend (FastAPI/Redis) ◄──► External Services
├── Vite 5.4.19               ├── pam-backend              ├── Supabase DB
├── Tailwind 3.4.11           ├── pam-redis                ├── Mapbox GL
├── Radix UI (25+)            ├── celery-worker            ├── OpenAI GPT-4
└── PWA Manifest              └── WebSocket                └── TTS/STT
```

## 📁 Project Structure

### Frontend (`src/`)
- **Components**: Modular React components with TypeScript
- **Pages**: Route-based page components
- **Services**: API clients and external integrations
- **Hooks**: Custom React hooks for state management
- **Context**: React Context providers for global state

### Backend (`backend/`)
- **FastAPI**: Python-based API with async support
- **Services**: Business logic and external integrations
- **Core**: Configuration, logging, security, and utilities
- **API**: RESTful endpoints and WebSocket handlers

### Database (`supabase/`)
- **PostgreSQL**: Primary data store with RLS
- **Migrations**: Database schema versioning
- **Functions**: Server-side database functions
- **Types**: Generated TypeScript types

## 🔧 Development Environment

### Critical Commands
```bash
npm run dev              # Start dev server (port 8080)
npm run build            # Production build
npm run quality:check:full # Run all quality checks
npm test                 # Run tests
```

### Environment Variables
- **Frontend**: `.env` (VITE_ prefixed)
- **Backend**: `backend/.env`
- **Database**: Supabase project settings

## 🏗️ Key Features

### 1. Wheels (Trip Planning)
- AI-powered route optimization
- Trip templates and planning
- Real-time navigation integration
- Campground and POI recommendations

### 2. Wins (Financial Management)
- Expense tracking and categorization
- Budget planning and monitoring
- Income management
- Financial goal tracking

### 3. PAM AI Assistant
- Natural language trip planning
- Financial advice and insights
- Real-time conversational interface
- WebSocket-based communication

### 4. Social Features
- Community interaction
- Trip sharing and reviews
- Group trip coordination
- Expert advice network

## 🚀 Deployment Architecture

### Production Environment
- **Frontend**: Netlify (main branch)
- **Backend**: Render (4 services)
  - pam-backend (main API)
  - pam-redis (cache)
  - pam-celery-worker (background tasks)
  - pam-celery-beat (scheduler)
- **Database**: Supabase (managed PostgreSQL)

### Staging Environment
- **Frontend**: Netlify (staging branch)
- **Backend**: Render staging services
- **Database**: Same Supabase instance with staging tables

## 🔐 Security & Authentication

### Authentication Flow
1. Supabase Auth with JWT tokens
2. Row Level Security (RLS) on all tables
3. Rate limiting and request validation
4. CSRF protection and input sanitization

### Data Protection
- End-to-end encryption for sensitive data
- GDPR compliance for EU users
- Secure API key management
- Regular security audits

## 📊 Performance Considerations

### Frontend Optimization
- Code splitting with Vite
- Lazy loading for components
- Image optimization
- PWA caching strategies

### Backend Optimization
- Redis caching layer
- Database query optimization
- Async processing with Celery
- Connection pooling

## 🐛 Common Issues & Solutions

### PAM WebSocket Issues
- Check backend health first
- Verify JWT token validity
- Ensure correct WebSocket URL construction
- Monitor connection timeouts

### Build Issues
- Check TypeScript compilation
- Verify environment variables
- Update dependencies regularly
- Clear build caches

## 📚 Documentation References

- **CLAUDE.md**: Project-specific instructions
- **README.md**: Setup and deployment guide
- **docs/**: Technical documentation
- **supabase/**: Database schema and migrations

## 🎯 Current Focus Areas

### High Priority
- PAM WebSocket connection stability
- Mobile responsive design
- Performance optimization
- Security hardening

### Medium Priority
- Feature expansion
- UI/UX improvements
- Testing coverage
- Documentation updates

## 🔄 Workflow Integration

This project uses advanced Claude Code workflows:
- **Context-aware development**: Each subsystem has dedicated context
- **Structured planning**: PLAN.md templates for complex tasks
- **Automated validation**: Quality checks and testing pipelines
- **GitHub integration**: Automated PR generation and reviews

---

**Last Updated**: January 31, 2025
**Maintained By**: Thabonel with Claude Code Assistant
**Architecture Version**: 2.1