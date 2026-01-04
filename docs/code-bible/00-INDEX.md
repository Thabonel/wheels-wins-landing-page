# Wheels & Wins Code Bible

**Version:** 1.0.0
**Last Updated:** December 21, 2025
**Status:** Complete Reference Documentation

---

## Quick Navigation

| Document | Description | When to Read |
|----------|-------------|--------------|
| [01-OVERVIEW.md](01-OVERVIEW.md) | System overview and purpose | Start here for context |
| [02-ARCHITECTURE.md](02-ARCHITECTURE.md) | Technical architecture diagrams | Understanding system design |
| [03-BACKEND.md](03-BACKEND.md) | Python/FastAPI backend | Backend development |
| [04-FRONTEND.md](04-FRONTEND.md) | React/TypeScript frontend | Frontend development |
| [05-PAM-AI.md](05-PAM-AI.md) | PAM AI assistant system | AI/ML features |
| [06-DATABASE.md](06-DATABASE.md) | Supabase/PostgreSQL schema | Database queries |
| [07-DEPLOYMENT.md](07-DEPLOYMENT.md) | Render/Netlify deployment | DevOps and releases |
| [08-API-REFERENCE.md](08-API-REFERENCE.md) | API endpoints reference | API integration |
| [09-SECURITY.md](09-SECURITY.md) | Security and RLS policies | Security audits |

---

## System Summary

**Wheels & Wins** is a comprehensive platform for RV travelers featuring:

- **PAM (Personal AI Manager)** - Voice-first AI assistant powered by Claude Sonnet 4.5
- **Wheels** - Trip planning with Mapbox integration
- **Wins** - Financial tracking and budget management
- **Social** - Community features for RV travelers
- **Shop** - Affiliate product marketplace

### Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18.3, TypeScript, Vite 5.4, Tailwind CSS |
| Backend | Python 3.11+, FastAPI, Uvicorn |
| Database | Supabase (PostgreSQL) with RLS |
| AI | Claude Sonnet 4.5 (primary), Gemini 3.0 Flash (fallback) |
| Voice | OpenAI Whisper (STT), Edge TTS (TTS) |
| Maps | Mapbox GL JS |
| Deployment | Netlify (frontend), Render (backend) |
| Caching | Redis |

### Environment URLs

| Environment | Frontend | Backend |
|-------------|----------|---------|
| Production | wheelsandwins.com | pam-backend.onrender.com |
| Staging | wheels-wins-staging.netlify.app | wheels-wins-backend-staging.onrender.com |
| Development | localhost:8080 | localhost:8000 |

---

## Key Principles

1. **Voice-First Design** - PAM is designed for hands-free RV use
2. **Mobile-First UI** - All components responsive from 375px
3. **Security by Default** - RLS on all tables, JWT authentication
4. **Cost Efficiency** - Track savings to prove ROI ($10/month goal)
5. **Simple Architecture** - ONE AI brain, no hybrid complexity

---

## Quick Start Commands

```bash
# Frontend Development
npm run dev              # Start dev server (port 8080)
npm run build            # Production build
npm run type-check       # TypeScript validation
npm run lint             # ESLint
npm run test             # Run tests

# Backend Development
cd backend
uvicorn app.main:app --reload --port 8000
pytest                   # Run backend tests

# Quality Gates
npm run quality:check:full  # Full quality check
```

---

## Critical Files Reference

### Configuration Files
- `CLAUDE.md` - AI assistant instructions (READ FIRST)
- `package.json` - Frontend dependencies
- `backend/requirements.txt` - Backend dependencies
- `netlify.toml` - Frontend deployment config
- `render.yaml` - Backend deployment config

### Core Application
- `src/App.tsx` - Frontend entry point
- `backend/app/main.py` - Backend entry point
- `backend/app/services/pam/` - PAM AI system
- `src/services/pamService.ts` - Frontend PAM client

### Documentation
- `docs/PAM_SYSTEM_ARCHITECTURE.md` - PAM technical details
- `docs/DATABASE_SCHEMA_REFERENCE.md` - Database schema
- `docs/PAM_BACKEND_CONTEXT_REFERENCE.md` - PAM context fields

---

## Document Purposes

### 01-OVERVIEW.md
- Project purpose and business goals
- User personas and use cases
- Feature summary
- Project timeline and milestones

### 02-ARCHITECTURE.md
- System architecture diagrams
- Data flow patterns
- Component relationships
- Infrastructure overview

### 03-BACKEND.md
- FastAPI structure and patterns
- Service layer organization
- API router registration
- Middleware configuration
- Background tasks (Celery)

### 04-FRONTEND.md
- React component structure
- State management (Zustand)
- Routing (React Router)
- UI components (Radix UI)
- Styling (Tailwind CSS)

### 05-PAM-AI.md
- AI provider configuration
- Tool registry system
- Voice pipeline (STT/TTS)
- Conversation management
- Context engineering

### 06-DATABASE.md
- Supabase table schemas
- Row Level Security policies
- Common query patterns
- Migration procedures

### 07-DEPLOYMENT.md
- Netlify frontend deployment
- Render backend deployment
- Environment variables
- CI/CD workflows
- Monitoring and logging

### 08-API-REFERENCE.md
- REST API endpoints
- WebSocket endpoints
- Request/response formats
- Authentication patterns
- Error handling

### 09-SECURITY.md
- Authentication flow (JWT)
- Authorization (RLS)
- Input validation
- CORS configuration
- Security headers
- Rate limiting

---

## Maintenance

This documentation should be updated when:
- New features are added
- Architecture changes occur
- API endpoints are modified
- Database schema changes
- Security policies are updated

**Owner:** Development Team
**Review Cycle:** Monthly or with major releases
