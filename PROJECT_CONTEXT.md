# PROJECT_CONTEXT.md
*Last updated: 2025-07-23*

This file provides essential context for AI assistants and developers working on the Wheels & Wins project. It serves as a quick reference to understand the project state, architecture, and common patterns.

## Project Overview

Wheels & Wins is a comprehensive travel planning and RV community platform built with React/TypeScript frontend and Python FastAPI backend. The centerpiece is PAM (Personal Assistant Manager), an AI-powered voice-enabled assistant that helps users with trip planning, financial management, and community features. The platform combines intelligent route planning with Mapbox integration, real-time data overlays, financial tracking, social networking, and progressive web app functionality for a complete travel ecosystem.

## Architecture Decisions

**Frontend:** React 18 + TypeScript chosen for modern development with strict typing. Vite provides fast builds with optimized code splitting. Tailwind CSS enables utility-first responsive design. Radix UI provides accessible component primitives.

**Backend:** FastAPI selected for high-performance async Python API with automatic OpenAPI documentation. PostgreSQL via Supabase provides robust database with real-time subscriptions and built-in authentication.

**AI Integration:** OpenAI GPT-4 powers PAM conversations. Multi-engine TTS (Edge TTS, Coqui TTS, system fallbacks) provides voice capabilities. WebSocket enables real-time communication.

**Infrastructure:** Netlify hosts frontend with global CDN. Render deploys containerized backend. Supabase manages database, auth, and real-time features. GitHub Actions handles CI/CD.

## Current Working State

✅ **Working:**
- Backend API fully operational at `https://pam-backend.onrender.com`
- PAM AI assistant with real OpenAI integration (no mocks)
- Authentication via Supabase
- Trip planning with Mapbox integration
- Financial management features
- Social networking components
- Progressive Web App functionality

⚠️ **Known Issues:**
- Some Supabase RLS policies may need refinement for user_subscriptions table
- Node.js version warnings in package.json (requires 18-20, but works on 20+)
- Some optional TTS engines may not initialize on all systems (graceful fallbacks in place)

❌ **Broken/Incomplete:**
- ChromaDB vector database (uses fallback mode)
- Some optional AI observability features (non-critical)

## Code Patterns

**Authentication:** Uses Supabase Auth with JWT tokens. Auth context in `src/context/AuthContext.tsx` provides user state. Protected routes use `ProtectedRoute` component.

**API Calls:** Tanstack Query manages server state. Services in `src/services/` handle API communication. Backend uses FastAPI with automatic validation and OpenAPI docs.

**Error Handling:** React Error Boundaries catch component errors. Backend uses structured exceptions with proper HTTP status codes. Sentry integration for production monitoring.

**State Management:** React Context for global state, Tanstack Query for server state, local useState for component state. No Redux/Zustand currently used.

## Directory Ownership

**Frontend Structure (`src/`):**
- `components/wheels/` - Trip planning and travel features
- `components/wins/` - Financial management and budgeting
- `components/social/` - Community and networking features  
- `components/pam/` - AI assistant integration
- `components/ui/` - Base Radix UI components
- `pages/` - Route-level components
- `hooks/` - Custom React hooks
- `services/` - API client services
- `context/` - React context providers

**Backend Structure (`backend/app/`):**
- `api/v1/` - API route handlers organized by feature
- `core/` - Configuration, middleware, database setup
- `models/` - Database models and schemas
- `services/` - Business logic and external integrations
- `workers/` - Background task processing

## External Dependencies

**Required Environment Variables:**
```bash
# Frontend (.env)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_BACKEND_URL=https://your-backend-url.onrender.com
VITE_PAM_WEBSOCKET_URL=wss://your-backend-url.onrender.com/api/v1/pam/ws
VITE_MAPBOX_PUBLIC_TOKEN=pk.your_mapbox_public_token_here

# Backend (set in Render.com)
DATABASE_URL=postgresql://your_database_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
OPENAI_API_KEY=sk-proj-your_openai_api_key_here
MAPBOX_SECRET_TOKEN=sk.your_mapbox_secret_token_here
```

**Key Supabase Tables:**
- `profiles` - User profile information
- `user_settings` - User preferences and configuration
- `trips` - Trip planning data
- `expenses` - Financial tracking
- `social_posts` - Community content
- `calendar_events` - User calendar integration

**External APIs:**
- OpenAI GPT-4 for PAM conversations
- Mapbox for mapping and routing
- Supabase for database and auth
- Edge TTS for voice synthesis

## Recent Context

**2025-07-23 11:30 - Backend Production Issues Resolved:**
- Fixed "No module named 'app.agents'" import error in production
- Removed all mock responses from PAM service per user requirements
- Successfully deployed backend to Render with full AI functionality
- All endpoints now operational: /health, /api/v1/pam/chat

**2025-07-22 - Database Schema Fixes:**
- Fixed infinite recursion in group_trip_participants RLS policies
- Created missing tables: affiliate_sales, user_wishlists
- Enhanced WebSocket connection stability for PAM
- Updated database migrations in supabase/migrations/

**2025-07-22 - Animation System Overhaul:**
- Removed problematic RouteTransition causing "jump-then-slide" issues
- Cleaned animation CSS classes from index.css
- Maintained smooth page transitions without visual glitches

**2025-07-21 - Environment Variable Debugging:**
- Added smart detection for swapped Supabase environment variables
- Created build-time debugging tools for Netlify deployment
- Enhanced error messaging for environment configuration issues

**2025-01-20 - Serena MCP Server Integration:**
- Integrated Serena MCP server for AI-accelerated development
- Added 30+ semantic analysis and intelligent editing tools
- Configured TypeScript language server for semantic understanding
- Available at http://localhost:24282/dashboard/

## Common Pitfalls

**Environment Variables:** Frontend vars must start with `VITE_`. Backend production vars are set in Render.com dashboard, not local .env files.

**Import Paths:** Backend uses `from app.services.pam.agent import ...` structure. Import paths differ between local development and production deployment.

**Mock Data:** NEVER use mock responses in PAM service. User explicitly requires real AI functionality only.

**Supabase RLS:** Row Level Security policies can be complex. Always test policy changes carefully as they affect data access patterns.

**WebSocket Connections:** PAM WebSocket connections require proper state management. Check connection state before sending messages.

**Mapbox Tokens:** Use public token (pk.) for frontend, secret token (sk.) for backend operations.

## Testing Status

**Frontend Testing:**
- Unit tests with Vitest in `src/__tests__/`
- E2E tests with Playwright in `e2e/`
- Integration tests for cross-component workflows
- Current coverage target: 80%+

**Backend Testing:**
- Python tests with pytest in `backend/tests/`
- API endpoint testing
- Database integration tests
- PAM service functionality tests

**Test Commands:**
```bash
# Frontend
npm run test              # Unit tests
npm run test:coverage     # Coverage report
npm run e2e              # E2E tests
npm run quality:check:full # Full quality pipeline

# Backend
cd backend
pytest                   # Run all tests
pytest --cov=app        # Coverage report
```

## Deployment Notes

**Frontend (Netlify):**
- Auto-deploys from main branch
- Build command: `npm run build`
- Environment variables set in Netlify dashboard
- CDN distribution for global performance

**Backend (Render):**
- Deploys from main branch via GitHub integration
- Uses Docker with Python 3.11
- Environment variables configured in Render dashboard
- Auto-scaling based on traffic

**Database (Supabase):**
- PostgreSQL with real-time subscriptions
- Row Level Security for data access control
- Migrations in `supabase/migrations/`
- Manual schema changes require careful RLS policy updates

## User Flow

1. **Landing Page** - User discovers platform and key features
2. **Authentication** - Sign up/login via Supabase Auth
3. **Onboarding** - Complete profile and travel preferences
4. **Dashboard** - Access Wheels (trips), Wins (finances), Social, PAM
5. **Trip Planning** - Interactive map with route building and PAM assistance
6. **Financial Tracking** - Expense entry and budget management
7. **Community** - Social posts, groups, and marketplace
8. **PAM Interaction** - Voice and text conversations for assistance

## Known Technical Debt

**Bundle Size:** Current main bundle ~2MB, target <2MB. Need continued code splitting optimization.

**Database Migrations:** Legacy migrations in archive/ folder should be cleaned up. Many duplicate or superseded migrations exist.

**Error Boundaries:** Some components lack proper error boundaries for graceful failure handling.

**TypeScript Coverage:** Some files still use `any` types instead of proper typing.

**Testing Coverage:** Backend testing coverage below 80% target. More integration tests needed.

**Performance:** Some Mapbox operations not optimally cached. Heavy computations not properly memoized.

**Security:** API rate limiting exists but could be more granular per endpoint.

---

## Development Standards & Principles

**CRITICAL DEVELOPMENT RULES:**

1. **NO QUICK FIXES** - Every solution must be comprehensive, well-tested, and production-ready. Temporary patches or shortcuts are strictly prohibited.

2. **NO MOCK DATA** - All features must use real APIs, real databases, and real services. Mock responses, placeholder data, or simulated functionality are never acceptable.

3. **PRODUCTION-ONLY CODE** - Write code as if it's going directly to production. No "TODO", "FIXME", or development-only implementations.

4. **COMPLETE MODULES** - Every feature must be fully implemented with proper error handling, edge cases, authentication, and integration with existing systems.

5. **NO CORNER CUTTING** - Implement proper logging, monitoring, testing, documentation, and security measures for every component.

**User explicitly requires:**
- Real AI responses from OpenAI (never mocked)
- Full database integration with Supabase
- Proper error handling and user feedback
- Complete feature implementations
- Production-grade code quality

**Forbidden practices:**
- Quick fixes or temporary solutions
- Mock data or simulated responses
- Incomplete implementations
- Development-only code paths
- Shortcuts that compromise quality

All code must meet production standards from the first commit. This is a mature platform serving real users with zero tolerance for half-measures or placeholder functionality.

---

*This document should be updated whenever significant changes are made to architecture, deployment, or development patterns. Keep it concise but comprehensive for quick onboarding.*