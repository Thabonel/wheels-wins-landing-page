# Wheels & Wins - Project Overview

## Frontend
- **Framework**: React 18 + TypeScript + Vite
- **Structure**: 
  - `/src/components/` - UI components organized by feature (wheels, wins, social, pam, ui)
  - `/src/pages/` - Route components
  - `/src/hooks/` - Custom React hooks
  - `/src/services/` - API client services
  - `/src/context/` - React context providers
- **Key Files**:
  - `vite.config.ts` - Build configuration with code splitting
  - `src/App.tsx` - Main application entry
  - `src/integrations/supabase/client.ts` - Supabase client with auto-correction

## Backend
- **Framework**: Python FastAPI
- **APIs**: RESTful + WebSocket endpoints
- **Database**: PostgreSQL via Supabase
- **Caching**: Redis for session management
- **Key Components**:
  - Multi-engine TTS (Edge TTS, Coqui TTS, system fallbacks)
  - WebSocket for real-time PAM communication
  - Background workers with Celery

## Key Libraries
### Frontend
- **UI**: Tailwind CSS, Radix UI, Lucide React icons
- **State**: Tanstack Query, React Context, Zustand
- **Maps**: Mapbox GL JS, @mapbox/mapbox-gl-directions
- **Charts**: Recharts
- **Calendar**: @fullcalendar
- **Routing**: React Router
- **Forms**: React Hook Form, Zod validation
- **PWA**: Workbox, next-themes

### Backend
- **Framework**: FastAPI, Pydantic
- **Database**: SQLAlchemy, Alembic
- **AI**: OpenAI API
- **TTS**: Edge TTS, Coqui TTS
- **Testing**: Pytest, pytest-cov

## Architectural Style
- **Frontend**: Component-based architecture with feature-driven organization
- **Backend**: Modular monolith with service layer pattern
- **Communication**: REST APIs + WebSocket for real-time features
- **Deployment**: Decoupled frontend (Netlify) and backend (Render)
- **Database**: Managed PostgreSQL with Row Level Security (Supabase)

## UI Style Guide
- **Design System**: Custom design system built on Radix UI primitives
- **Styling**: Utility-first with Tailwind CSS
- **Components**: Accessible, mobile-first, dark mode support
- **Spacing**: Tailwind spacing scale (4px base)
- **Colors**: Extended color palette with semantic naming
- **Typography**: System font stack with responsive sizing
- **Breakpoints**: Mobile-first responsive design (sm: 640px, md: 768px, lg: 1024px, xl: 1280px)

## Commit & Branching Standards
- **Commit Format**: Conventional Commits
  - `feat:` New features
  - `fix:` Bug fixes
  - `docs:` Documentation changes
  - `style:` Code style changes
  - `refactor:` Code refactoring
  - `test:` Test additions/changes
  - `chore:` Build/tooling changes
- **Branch Strategy**: Feature branches from `main`
- **PR Process**: Code review required before merge
- **Auto-deployment**: Main branch deploys automatically to production

## Development Workflow
1. **Quality Pipeline**: `npm run quality:check:full`
2. **Testing**: 80%+ coverage requirement
3. **Linting**: ESLint + Prettier pre-commit hooks
4. **Type Safety**: TypeScript strict mode
5. **Security**: Regular audits with `npm run security:audit`

## Key Features
- 🗺️ **Trip Planning**: Interactive Mapbox integration with real-time overlays
- 🤖 **PAM AI Assistant**: Voice-enabled conversational AI with WebSocket
- 💰 **Financial Management**: Expense tracking and budgeting
- 👥 **Social Features**: Community networking and sharing
- 📱 **PWA**: Mobile-optimized progressive web app
- 🔊 **Voice Integration**: Multi-engine TTS with fallbacks

## Environment Configuration
### Frontend (.env)
```bash
VITE_SUPABASE_URL=https://kycoklimpzkyrecbjecn.supabase.co
VITE_SUPABASE_ANON_KEY=[anon_key]
VITE_MAPBOX_TOKEN=[mapbox_token]
```

### Backend (backend/.env)
```bash
DATABASE_URL=[postgres_url]
SUPABASE_SERVICE_ROLE_KEY=[service_key]
OPENAI_API_KEY=[openai_key]
TTS_ENABLED=true
MAPBOX_SECRET_TOKEN=[secret_token]
REDIS_URL=redis://localhost:6379
```

## MCP Integration
- **Supabase MCP**: Direct database operations
- **Serena MCP**: Semantic code analysis
- **Render MCP**: Deployment management
- **Code Analyzer MCP**: AI-powered code integration

## Recent Stability Improvements (Jan 2025)
- ✅ Animation system overhaul - removed problematic transitions
- ✅ WebSocket stability fixes for PAM
- ✅ Database RLS policy corrections
- ✅ Environment variable auto-correction
- ✅ Serena MCP integration for accelerated development

## Instructions for Claude
- **Always check this file first** before any task
- **Use subfolder `cloud.md` files** for detailed component/service context
- **Prefer new, clean code** over patching legacy implementations
- **Never assume** — ask for clarification if requirements are unclear
- **Follow the workflow**: Explore → Plan → Review → Execute
- **Use MCP servers** for direct database, deployment, and code analysis
- **Check PLAN.md** for current task planning and progress
- **Update CHANGELOG.md** after significant changes