# Claude Code Instructions for Wheels & Wins Project

## 🌟 Project Overview
Wheels & Wins is a comprehensive travel planning and RV community platform that revolutionizes how travelers plan, manage, and share their adventures. Built with React/TypeScript frontend and Python FastAPI backend, the platform combines intelligent trip planning, financial management, social networking, and voice-enabled AI assistance into a unified progressive web application.

**Key Statistics:**
- 50+ specialized components across 15 major feature areas
- Multi-engine voice processing with 3-tier fallback system
- Real-time WebSocket communication with PAM AI assistant
- Progressive Web App with offline capabilities
- Multi-service deployment architecture on Render + Netlify

**Development Server**: http://localhost:8080 (runs on port 8080, not 3000)

## Architecture Overview

### System Architecture
```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│     Frontend        │    │   Backend Services  │    │   External Services │
│   (React/TS/PWA)    │◄──►│   Multi-Service     │◄──►│   & Integrations    │
│                     │    │   (FastAPI/Redis)   │    │                     │
│ • React 18.3.1      │    │ • pam-backend       │    │ • Supabase DB       │
│ • TypeScript (Dev)  │    │ • pam-redis         │    │ • Mapbox GL JS      │
│ • Vite 5.4.19       │    │ • celery-worker     │    │ • OpenAI GPT-4      │
│ • Tailwind 3.4.11   │    │ • celery-beat       │    │ • Edge/Coqui TTS    │
│ • Radix UI (25+)    │    │ • WebSocket         │    │ • Whisper STT       │
│ • PWA Manifest      │    │ • Background Tasks  │    │ • Sentry Monitoring │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

### Frontend Stack
- **React 18.3.1** + **TypeScript** (Development Mode: `"strict": false`)
- **Vite 5.4.19** - Lightning-fast build with 12-chunk optimization
- **Tailwind CSS 3.4.11** - Utility-first styling
- **Radix UI** - 25+ accessible component primitives
- **Tanstack Query 5.80.10** - Server state management
- **Mapbox GL JS 3.11.1** - Interactive mapping
- **Framer Motion** - Advanced animations
- **PWA** - Service worker, offline support, app manifest

### Backend Stack (Render Multi-Service)
- **FastAPI (Python 3.11)** - High-performance async framework
- **PostgreSQL via Supabase** - Managed database with RLS
- **Redis** - Caching, sessions, and task queuing
- **WebSocket** - Real-time PAM communication
- **Celery** - Distributed task queue with workers
- **Multi-Engine TTS/STT** - Voice processing pipeline

### AI & Voice Technologies
- **OpenAI GPT-4** - PAM conversational AI
- **Multi-TTS Engine Stack**:
  - Edge TTS (Primary) - Microsoft cloud TTS
  - Coqui TTS (Secondary) - Open-source neural TTS
  - System TTS (Fallback) - pyttsx3 offline
- **Multi-STT Engine Stack**:
  - OpenAI Whisper (Cloud)
  - Local Whisper (Offline)
  - Web Speech API (Browser)

### Key Features
- 🗺️ **Trip Planning**: Interactive maps with NASA FIRMS, NOAA, USDA overlays
- 🤖 **PAM AI Assistant**: Location-aware, voice-enabled conversational AI
- 💰 **Financial Management**: Expense tracking, budgets, income analytics
- 🛍️ **Shopping & Marketplace**: Digistore24 integration, affiliate tracking
- 👥 **Social Features**: Groups, forums, hustle board, user marketplace
- 📱 **PWA**: Mobile-first with offline functionality
- 🔊 **Voice Integration**: Complete STT→LLM→TTS pipeline
- 🏕️ **Camping Features**: Pain point tracking, specialized budgets

## Development Commands

### Frontend Development
```bash
npm run dev              # Start dev server (http://localhost:8080)
npm run build            # Production build
npm run preview          # Preview production build
npm run lint             # ESLint code linting
npm run type-check       # TypeScript validation
npm run format           # Prettier code formatting
```

### Testing Commands
```bash
npm test                 # Run all unit tests
npm run test:watch       # Watch mode for development
npm run test:coverage    # Generate coverage report
npm run test:ui          # Interactive test UI
npm run e2e              # Playwright end-to-end tests
npm run e2e:ui           # E2E tests with UI

# Integration tests
npm run test src/__tests__/integration/
```

### Quality Assurance
```bash
npm run quality:check:full    # Complete quality pipeline
npm run quality:fix           # Auto-fix linting issues
npm run security:audit        # Security vulnerability scan
```

### Backend Development
```bash
# Start backend server
cd backend
uvicorn app.main:app --reload --port 8000

# Run backend tests
pytest
pytest --cov=app --cov-report=html

# Setup TTS services
python setup_tts.py
```

## Project Structure

### Frontend Organization
```
src/
├── components/          # Reusable UI components
│   ├── wheels/         # Trip planning components
│   ├── wins/           # Financial management
│   ├── social/         # Community features
│   ├── pam/            # AI assistant components
│   └── ui/             # Base UI components (Radix)
├── pages/              # Route components
├── hooks/              # Custom React hooks
├── context/            # React context providers
├── services/           # API client services
├── utils/              # Utility functions
└── __tests__/          # Test files
    ├── integration/    # Integration test suites
    └── components/     # Component unit tests
```

### Backend Organization
```
backend/
├── app/
│   ├── main.py         # FastAPI application entry
│   ├── api/            # API route handlers
│   ├── core/           # Configuration and settings
│   ├── models/         # Database models
│   ├── services/       # Business logic services
│   │   └── tts/        # Text-to-speech services
│   ├── workers/        # Background task workers
│   └── tests/          # Backend test suites
├── requirements.txt    # Python dependencies
└── setup_tts.py       # TTS initialization script
```

## Coding Guidelines

### Always Follow These Rules
1. **PRODUCTION-READY CODE**: All implementations must be functional and connected to real services
2. **NO MOCK DATA**: Build for production with real API integrations
3. **COMPREHENSIVE TESTING**: 80%+ test coverage requirement
4. **TYPE SAFETY**: Use TypeScript strict mode with comprehensive typing
5. **PERFORMANCE FIRST**: Optimize bundle size and loading performance
6. **MOBILE-FIRST**: Ensure responsive design and mobile optimization
7. **ACCESSIBILITY**: Follow WCAG guidelines and use semantic HTML

### Code Quality Standards
- **ESLint**: Enforce code quality and security rules
- **Prettier**: Consistent code formatting
- **TypeScript**: Strict type checking with no implicit any
- **Conventional Commits**: Structured commit messages
- **Pre-commit Hooks**: Quality gates before code commits

### Component Development
```typescript
// Use functional components with TypeScript
interface ComponentProps {
  title: string;
  onAction: (data: string) => void;
  isLoading?: boolean;
}

export const MyComponent: React.FC<ComponentProps> = ({
  title,
  onAction,
  isLoading = false
}) => {
  // Component implementation
};
```

### State Management
- **Tanstack Query**: Server state and caching
- **React Context**: Global client state
- **React Hooks**: Local component state
- **Zustand**: Complex state management (when needed)

### Styling Guidelines
- **Tailwind CSS**: Utility-first styling approach
- **Mobile-First**: Start with mobile breakpoints
- **Radix UI**: Use for complex interactive components
- **Consistent Spacing**: Follow Tailwind spacing scale
- **Dark Mode**: Support with next-themes

## Environment Configuration

### Frontend Environment Variables (.env)
```bash
# Required
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_MAPBOX_TOKEN=pk.your_mapbox_public_token

# Optional
VITE_MAPBOX_PUBLIC_TOKEN=pk.alternative_token_name
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
VITE_SENTRY_DSN=your_sentry_dsn
```

### Backend Environment Variables (backend/.env)
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost/wheels_wins
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Services
OPENAI_API_KEY=your_openai_api_key

# TTS Configuration
TTS_ENABLED=true
TTS_PRIMARY_ENGINE=edge
TTS_FALLBACK_ENABLED=true
TTS_VOICE_DEFAULT=en-US-AriaNeural

# External APIs
MAPBOX_SECRET_TOKEN=sk.your_mapbox_secret_token
REDIS_URL=redis://localhost:6379
```

## Feature Development Guidelines

### Map Integration
- **Mapbox GL JS**: Primary mapping library
- **Token Management**: Use environment variables for tokens
- **Layer Management**: Proper cleanup and memory management
- **Real Data Sources**: NASA FIRMS, NOAA, USDA for overlays
- **Offline Support**: Cache map tiles and route data

### PAM AI Assistant
- **Voice Integration**: Multi-engine TTS with fallbacks
- **Context Awareness**: Trip and user data integration
- **WebSocket Communication**: Real-time conversation
- **Error Handling**: Graceful degradation for TTS failures
- **Privacy**: Secure voice data handling

### Progressive Web App
- **Manifest Configuration**: Complete PWA manifest
- **Service Worker**: Offline functionality and caching
- **Mobile Optimization**: Responsive design and touch interactions
- **App-like Experience**: Native mobile feel
- **Performance**: Optimized loading and bundle splitting

### Testing Strategy
- **Unit Tests**: Component and utility function testing
- **Integration Tests**: Cross-component workflow testing
- **E2E Tests**: Complete user journey validation
- **Performance Tests**: Bundle size and loading optimization
- **Accessibility Tests**: WCAG compliance validation

## Performance Optimization

### Bundle Optimization
- **Code Splitting**: Strategic chunking by feature
- **Lazy Loading**: Route-based component loading
- **Tree Shaking**: Eliminate unused code
- **Vendor Chunking**: Separate third-party libraries
- **Asset Optimization**: Image and font optimization

### Current Bundle Strategy
```javascript
// vite.config.ts - manualChunks configuration
{
  'react-vendor': ['react', 'react-dom'],
  'mapbox-vendor': ['mapbox-gl', '@mapbox/mapbox-gl-directions'],
  'radix-vendor': [...], // All Radix UI components
  'chart-vendor': ['recharts'],
  'calendar-vendor': ['@fullcalendar/*'],
  'icons-vendor': ['lucide-react'],
  'utils-vendor': ['clsx', 'tailwind-merge', 'date-fns']
}
```

### Mobile Performance
- **Mobile-First Design**: Start with mobile breakpoints
- **Touch Optimization**: Proper touch targets and gestures
- **Progressive Loading**: Load critical content first
- **Offline Support**: Service worker for core functionality
- **Network Awareness**: Adapt to connection quality

## Security Best Practices

### Authentication & Authorization
- **Supabase Auth**: Secure authentication provider
- **JWT Tokens**: Stateless session management
- **Role-Based Access**: Admin, user, guest permissions
- **Protected Routes**: Authentication guards

### Data Security
- **Input Validation**: Comprehensive request validation
- **SQL Injection**: Parameterized queries and ORM
- **XSS Prevention**: Content sanitization
- **CSRF Protection**: Token-based protection
- **Rate Limiting**: API abuse prevention

### Privacy Compliance
- **GDPR Compliance**: Data export and deletion
- **Cookie Management**: Transparent usage
- **Data Encryption**: In transit and at rest
- **Audit Logging**: Security event tracking

## Deployment Architecture

### Multi-Service Production Architecture

```
┌─────────────────┐    ┌─────────────────────────────────────────────┐
│   Netlify CDN   │    │            Render Services                  │
│                 │    │                                             │
│ Frontend App    │    │  ┌─────────────┐  ┌───────────────────┐   │
│ • React/TS      │◄──►│  │ pam-backend │  │    pam-redis      │   │
│ • Global CDN    │    │  │ (Web Service)│◄─┤  (Redis Service)  │   │
│ • Auto Deploy   │    │  └─────────────┘  └───────────────────┘   │
│                 │    │                                             │
└─────────────────┘    │  ┌─────────────┐  ┌───────────────────┐   │
                       │  │pam-celery-  │  │ pam-celery-beat   │   │
┌─────────────────┐    │  │worker       │  │   (Scheduler)     │   │
│  Supabase Cloud │◄───┤  │(Background) │  │                   │   │
│ • PostgreSQL    │    │  └─────────────┘  └───────────────────┘   │
│ • Auth System   │    └─────────────────────────────────────────────┘
│ • Row Level Sec │    
└─────────────────┘    
```

### Frontend Deployment (Netlify)
- **Production URL**: Your main domain
- **Staging URL**: `https://staging--[site-id].netlify.app`
- **Auto-deployment**: From `main` branch (production), `staging` branch (staging)
- **Build Command**: `npm run build`
- **Environment Variables**: Set in Netlify dashboard with `VITE_` prefix
- **CDN**: Global distribution with edge functions
- **Security Headers**: X-Frame-Options, CSP, HSTS configured

### Backend Deployment (Render - 4 Services)

#### 1. Main Backend (pam-backend)
- **URL**: `https://pam-backend.onrender.com`
- **Type**: Web Service
- **Runtime**: Python 3.11
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Health Check**: `/api/health`
- **WebSocket**: `wss://pam-backend.onrender.com/api/v1/pam/ws`

#### 2. Redis Cache (pam-redis)
- **Type**: Redis Database
- **Access**: Private network only
- **Usage**: Session storage, caching, task queue
- **Memory**: 25MB (Free tier)

#### 3. Background Worker (pam-celery-worker)
- **Type**: Background Worker
- **Tasks**: Email processing, analytics, file processing
- **Start Command**: `celery -A app.workers.celery worker`

#### 4. Task Scheduler (pam-celery-beat)
- **Type**: Background Worker
- **Purpose**: Periodic task scheduling
- **Start Command**: `celery -A app.workers.celery beat`

### Database (Supabase)
- **Production Project**: Separate from staging
- **Features**: PostgreSQL, Auth, Real-time, RLS
- **Critical Tables**: 
  - `profiles`, `user_settings`, `pam_conversations`
  - `social_posts`, `expenses`, `budgets`
  - `affiliate_sales`, `user_wishlists`
- **Backups**: Automatic daily backups
- **RLS**: Row Level Security on all tables

## Development Workflow

### Feature Development Process
1. **Analysis**: Understand requirements and existing code
2. **Planning**: Design approach and integration points
3. **Implementation**: Build with tests and documentation
4. **Testing**: Unit, integration, and E2E validation
5. **Quality Check**: Run full quality pipeline
6. **Review**: Code review and feedback
7. **Deployment**: Merge to main for auto-deployment

### Code Review Checklist
- [ ] TypeScript strict compliance
- [ ] Test coverage 80%+
- [ ] ESLint and Prettier formatting
- [ ] Mobile responsiveness
- [ ] Accessibility compliance
- [ ] Performance optimization
- [ ] Security considerations
- [ ] Documentation updates

### Troubleshooting Common Issues

#### Build Issues
1. **TypeScript Errors**: Run `npm run type-check`
2. **Dependency Issues**: Clear node_modules and reinstall
3. **Environment Variables**: Verify .env configuration
4. **Bundle Size**: Check webpack-bundle-analyzer

#### Development Issues
1. **Map Not Loading**: Check Mapbox token configuration
2. **TTS Not Working**: Run TTS setup script
3. **Database Errors**: Verify Supabase connection
4. **Hot Reload Issues**: Restart dev server

#### Testing Issues
1. **Test Failures**: Check mock configurations
2. **Coverage Issues**: Add missing test cases
3. **E2E Failures**: Verify test environment setup
4. **Performance Tests**: Check bundle size limits

## Quality Assurance Pipeline

### Automated Checks
- **ESLint**: Code quality and security rules
- **Prettier**: Code formatting consistency
- **TypeScript**: Type checking and validation
- **Vitest**: Unit and integration testing
- **Playwright**: End-to-end testing
- **Bundle Analysis**: Size and performance monitoring

### Manual Review Process
- **Code Review**: Peer review for all changes
- **UX Review**: User experience validation
- **Security Review**: Security best practices
- **Performance Review**: Loading and responsiveness
- **Accessibility Review**: WCAG compliance

---

## Staging Environment

### Environment Isolation
The project has **two completely separate environments**:

#### Staging Environment 🧪
- **URL**: `https://staging--[site-id].netlify.app`
- **Branch**: `staging` or `develop`
- **Database**: Separate Supabase project with test data
- **APIs**: Sandbox/test versions (Stripe test mode, etc.)
- **Visual Indicator**: Yellow banner "⚠️ STAGING ENVIRONMENT"
- **Features**: Debug tools enabled, test data available

#### Production Environment 🚀
- **URL**: Main domain
- **Branch**: `main`
- **Database**: Production Supabase with real user data
- **APIs**: Live APIs with real transactions
- **Features**: Only stable, tested features

### Safe Testing Process
1. Create feature branch → 2. Test locally → 3. Deploy to staging → 4. Test thoroughly → 5. Deploy to production

### Test Payment Cards (Staging)
- Success: `4242 4242 4242 4242`
- Declined: `4000 0000 0000 0002`
- Insufficient funds: `4000 0000 0000 9995`

## PAM AI Assistant Details

### Current State & Known Issues
PAM has evolved through multiple iterations, resulting in technical debt:

#### Architecture Problems
1. **Multiple WebSocket Implementations** (4 different versions):
   - `pamService.ts` - Class-based singleton
   - `usePamWebSocket.ts` - React hook wrapper
   - `usePamWebSocketConnection.ts` - Lower-level connection
   - `usePamWebSocketV2.ts` - "Enhanced" version
   
2. **Duplicate Components**:
   - `Pam.tsx` AND `PamAssistant.tsx` both exist
   - Different hooks used in each
   - Incompatible message formats

3. **WebSocket URL Issues**:
   ```typescript
   // WRONG (missing user_id):
   const wsUrl = `${baseUrl}/api/v1/pam/ws?token=${token}`;
   
   // CORRECT:
   const wsUrl = `${baseUrl}/api/v1/pam/ws/${userId}?token=${token}`;
   ```

### PAM Backend Connection
- **Production URL**: `https://pam-backend.onrender.com`
- **WebSocket Endpoint**: `wss://pam-backend.onrender.com/api/v1/pam/ws/{user_id}?token={jwt}`
- **Health Check**: `https://pam-backend.onrender.com/api/health`
- **Demo Mode**: Activates when backend unavailable

### Enhanced PAM Features (2025)
- **Location Awareness**: GPS context for recommendations
- **AI Provider Orchestration**: Multi-provider with failover
- **Isolation Architecture**: Hardened security
- **Shopping Intelligence**: Digistore24 integration

## Important Notes for Claude Code

### Critical Project-Specific Details
- **Dev Server Port**: 8080 (NOT 3000) - http://localhost:8080
- **TypeScript**: `"strict": false` for development velocity
- **Environment Variables**: Must prefix with `VITE_` for frontend
- **Bundle Strategy**: 12 manual chunks configured in vite.config.ts
- **Voice System**: Complex multi-engine with fallbacks - treat carefully
- **PAM WebSocket**: Always include user_id in path

### Common Pitfalls to Avoid
1. **Don't assume port 3000** - Always use 8080
2. **Don't create new PAM implementations** - Clean up existing ones first
3. **Don't forget VITE_ prefix** for environment variables
4. **Don't skip staging deployment** - Always test there first
5. **Don't modify RLS policies** without testing recursion

### When Making Changes
1. Check if staging environment is needed
2. Run quality checks: `npm run quality:check:full`
3. Test on mobile devices (primary target)
4. Verify PAM WebSocket connectivity
5. Check bundle size impact

### Key Files to Understand
- `vite.config.ts`: Build config with 12-chunk strategy
- `src/hooks/useUserSettings.ts`: Settings sync with retry logic
- `backend/app/api/v1/pam.py`: PAM WebSocket handler
- `docs/pam-current-state-breakdown.md`: PAM technical debt details
- `docs/STAGING_ENVIRONMENT_MANUAL.md`: Deployment guide

This project represents a mature, production-ready application with significant technical complexity. Be aware of existing technical debt, especially in PAM implementation, and prioritize cleanup over adding new features.

---

## Recent Updates and Fixes (January 2025)

### ✅ Animation System Overhaul
**Issue**: Page transition animations causing "jump-then-slide" issues and user experience problems
**Solution**: Complete removal of problematic animation system
- **Removed**: `RouteTransition` wrapper from `App.tsx`
- **Cleaned**: Animation CSS classes from `index.css`
- **Preserved**: Essential route container styling without animations
- **Result**: Smooth, immediate page transitions without visual glitches

### ✅ Backend Infrastructure Fixes
**Issue**: Multiple critical backend errors identified in server logs
**Solutions Implemented**:

1. **WebSocket Connection Stability**
   - Fixed "Cannot call send once a close message has been sent" errors
   - Added connection state checking before WebSocket operations
   - Enhanced message field mapping (`message` vs `content` compatibility)
   - **File**: `backend/app/api/v1/pam.py`

2. **Database Issues Resolution**
   - Fixed infinite recursion in `group_trip_participants` RLS policies
   - Created missing tables: `affiliate_sales` and `user_wishlists`
   - Added proper indexes and non-recursive security policies
   - **Migration**: `supabase/migrations/20250722140000-fix-database-issues.sql`

3. **PAM AI Message Handling**
   - Resolved empty message passing to PAM assistant
   - Added backward compatibility for different message field formats
   - Enhanced error handling for WebSocket state management

### ✅ Environment Variable & Deployment Fixes
**Issue**: Netlify deployment showing white screen with "Invalid URL" errors
**Root Cause**: Environment variables were being loaded with swapped values
**Solutions**:

1. **Smart Environment Detection**
   - Added auto-detection for swapped Supabase environment variables
   - Implemented automatic correction when JWT token and URL are reversed
   - Enhanced validation with detailed error messaging
   - **File**: `src/integrations/supabase/client.ts`

2. **Build-Time Debugging Tools**
   - Created comprehensive environment variable logging script
   - Added build-time validation and error reporting
   - Enhanced Netlify deployment debugging capabilities
   - **Files**: `scripts/build-debug.js`, `src/lib/supabase-safe.ts`

3. **Production Environment Hardening**
   - Fixed local `.env` file URL typo (removed extra 'z' in Supabase URL)
   - Added graceful fallback mechanisms for missing environment variables
   - Improved error messages for deployment troubleshooting

### ✅ Development Acceleration with Serena MCP Server
**Enhancement**: Integrated Serena MCP server for AI-accelerated development
**Benefits**: Semantic code analysis and intelligent editing capabilities

**Setup Completed**:
- **Installation**: Configured via `uvx` for easy management
- **Project Integration**: Auto-configured for Wheels & Wins TypeScript/React codebase
- **Language Server**: TypeScript language server initialized for semantic analysis
- **Claude Code Integration**: MCP server configuration created
- **Web Dashboard**: Available at `http://localhost:24282/dashboard/`

**Available Tools (30+)**:
- 🔍 **Semantic Search**: `find_symbol`, `find_referencing_symbols`, `get_symbols_overview`
- 📝 **Intelligent Editing**: `replace_symbol_body`, `insert_after_symbol`, `insert_before_symbol`
- 📁 **File Operations**: `read_file`, `create_text_file`, `list_dir`, `find_file`
- 🧠 **Memory System**: `write_memory`, `read_memory`, `list_memories`
- ⚙️ **Execution**: `execute_shell_command`, `restart_language_server`
- 📊 **Analysis**: `search_for_pattern`, `replace_regex`

**Configuration Files**:
- `~/.config/claude-desktop/claude_desktop_config.json` - MCP server configuration
- `~/.serena/serena_config.yml` - Serena settings and project registration
- `./test-serena.sh` - Test script for manual Serena startup

**Development Speed Improvements**:
1. **🚀 Instant Code Navigation**: Semantic understanding of component relationships
2. **⚡ Smart Refactoring**: Type-safe modifications across the codebase
3. **🔍 Semantic Search**: Find code by meaning, not just text matching
4. **📊 Project Overview**: Instant architectural understanding
5. **🛠️ Intelligent Editing**: Context-aware code modifications

### ✅ Quality Assurance Improvements
**Git Workflow Enhancements**:
- All changes properly committed with conventional commit messages
- Comprehensive testing before deployment
- Environment variable validation in CI/CD pipeline
- Build-time debugging integration

**Files Modified/Created**:
- `src/App.tsx` - Removed animation wrappers
- `src/index.css` - Cleaned animation styles
- `src/integrations/supabase/client.ts` - Smart environment variable handling
- `backend/app/api/v1/pam.py` - WebSocket stability fixes
- `scripts/build-debug.js` - Build-time environment debugging
- `src/lib/supabase-safe.ts` - Safe Supabase client initialization
- `test-serena.sh` - Serena MCP server testing script

### 🎯 Current Status
- ✅ **Frontend**: Animation issues resolved, smooth user experience
- ✅ **Backend**: All critical server errors fixed, WebSocket stability improved
- ✅ **Deployment**: Environment variable issues resolved, Netlify deployment stable
- ✅ **Development Tools**: Serena MCP server integrated for accelerated development
- ✅ **PAM AI**: Message handling fixed, WebSocket connections stable
- ✅ **Database**: RLS policies corrected, missing tables created

### 🚀 Next Development Priorities
1. **PAM Enhancement**: Leverage Serena for rapid PAM feature development
2. **Performance Optimization**: Utilize semantic analysis for code optimization
3. **Feature Development**: Use intelligent editing for new feature implementation
4. **Code Quality**: Maintain high standards with automated semantic analysis

All systems are now stable and optimized for rapid, AI-assisted development using the Serena MCP server integration.

---

## MCP Server Configuration

### Overview
The Wheels & Wins project uses Model Context Protocol (MCP) servers to provide Claude Code with direct access to development tools and services. Three MCP servers are configured for enhanced development capabilities:

1. **Supabase MCP Server** - Direct database operations and SQL execution
2. **Serena MCP Server** - Semantic code analysis and intelligent editing
3. **Render.com MCP Server** - Deployment management and monitoring

### Configuration Files

#### Claude Desktop Configuration
**File**: `~/.config/claude-desktop/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "serena": {
      "command": "uvx",
      "args": [
        "--from",
        "git+https://github.com/oraios/serena",
        "serena-mcp-server",
        "--project",
        "/Users/thabonel/Documents/Wheels and Wins/wheels-wins-landing-page",
        "--context",
        "desktop-app",
        "--mode",
        "interactive,editing",
        "--log-level",
        "INFO"
      ],
      "env": {
        "UV_CACHE_DIR": "/Users/thabonel/.cache/uv"
      }
    },
    "supabase": {
      "command": "npx",
      "args": [
        "@supabase/mcp-server-supabase"
      ],
      "env": {
        "SUPABASE_URL": "https://your-project-id.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "YOUR_SERVICE_ROLE_KEY"
      }
    },
    "render": {
      "command": "npx",
      "args": [
        "@render/mcp-server"
      ],
      "env": {
        "RENDER_API_KEY": "YOUR_RENDER_API_KEY"
      }
    }
  },
  "globalShortcut": "Cmd+Shift+Enter"
}
```

#### Claude Code CLI Configuration
**File**: `~/.config/claude-code/mcp.json`

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "@supabase/mcp-server-supabase"
      ],
      "env": {
        "SUPABASE_URL": "https://your-project-id.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "YOUR_SERVICE_ROLE_KEY"
      }
    }
  }
}
```

### MCP Server Capabilities

#### 🗄️ Supabase MCP Server
**Purpose**: Direct database operations and SQL execution
**Key Features**:
- Execute SQL queries directly against the Supabase database
- Create and modify database tables, indexes, and constraints
- Manage Row Level Security (RLS) policies
- Handle database migrations and schema changes
- Monitor database performance and usage

**Common Use Cases**:
- Fixing database issues and RLS policies
- Creating missing tables and columns
- Running database migrations
- Debugging SQL queries and performance issues
- Managing user settings and permissions

**Setup Requirements**:
- Supabase project URL
- Service role key with database admin permissions
- `@supabase/mcp-server-supabase` package

#### 🧠 Serena MCP Server  
**Purpose**: Semantic code analysis and intelligent editing
**Key Features**:
- Semantic understanding of TypeScript/React codebase
- Intelligent code refactoring and modifications
- Symbol search and reference finding
- Context-aware code generation
- Memory system for development context

**Available Tools (30+)**:
- 🔍 **Semantic Search**: `find_symbol`, `find_referencing_symbols`, `get_symbols_overview`
- 📝 **Intelligent Editing**: `replace_symbol_body`, `insert_after_symbol`, `insert_before_symbol`
- 📁 **File Operations**: `read_file`, `create_text_file`, `list_dir`, `find_file`
- 🧠 **Memory System**: `write_memory`, `read_memory`, `list_memories`
- ⚙️ **Execution**: `execute_shell_command`, `restart_language_server`
- 📊 **Analysis**: `search_for_pattern`, `replace_regex`

**Configuration Files**:
- `~/.serena/serena_config.yml` - Serena settings and project registration
- `./test-serena.sh` - Test script for manual server startup

**Web Dashboard**: Available at `http://localhost:24282/dashboard/`

#### ☁️ Render.com MCP Server
**Purpose**: Deployment management and monitoring
**Key Features**:
- Monitor deployment status and health
- Access deployment logs and metrics
- Manage environment variables
- Trigger deployments and rollbacks
- Monitor service performance

**Common Use Cases**:
- Checking backend deployment status
- Accessing production logs for debugging
- Managing environment variables
- Monitoring service health and performance
- Triggering deployments and rollbacks

**Setup Requirements**:
- Render.com API key
- `@render/mcp-server` package
- Configured services in Render.com dashboard

#### 🔄 Anthropic MCP Code Analyzer
**Purpose**: AI-powered repository analysis and code integration
**Key Features**:
- Analyzes open source projects for integration opportunities
- Uses Claude AI to generate intelligent merge strategies
- Performs AST (Abstract Syntax Tree) parsing for deep code understanding
- Identifies patterns, dependencies, and architectural decisions
- Provides conflict resolution and refactoring recommendations

**Available Endpoints**:
- **POST /analyze**: Analyzes source and target repositories
  - Accepts source and target repository URLs
  - Returns comprehensive integration strategy
  - Identifies potential conflicts and solutions
- **GET /health**: Server status verification

**Common Use Cases**:
- Integrating travel/RV-related open source projects
- Analyzing similar PWA implementations for best practices
- Merging AI assistant features from other projects
- Understanding mapping library integration patterns
- Adopting financial management features from similar platforms

**Setup Requirements**:
- Anthropic API key (same as Claude's)
- `anthropic-mcp-code-analyzer` package
- Optional: Configure PORT (defaults to 3000)

### Setup Instructions

#### Initial Setup
1. **Install MCP Server Packages**:
   ```bash
   # Supabase MCP Server
   npm install -g @supabase/mcp-server-supabase
   
   # Serena MCP Server (via uvx)
   uvx --from git+https://github.com/oraios/serena serena-mcp-server --help
   
   # Render MCP Server
   npm install -g @render/mcp-server
   
   # Anthropic MCP Code Analyzer
   npm install -g anthropic-mcp-code-analyzer
   ```

2. **Configure Environment Variables**:
   - Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for Supabase
   - Set `RENDER_API_KEY` for Render.com
   - Set `ANTHROPIC_API_KEY` for Code Analyzer
   - Configure project paths for Serena

3. **Update Configuration Files**:
   - Add MCP server configurations to Claude Desktop and Claude Code configs
   - Ensure correct paths and environment variables

#### Restart Required
After making configuration changes, restart Claude Desktop or Claude Code CLI:
```bash
# For Claude Desktop - quit and relaunch the application
# For Claude Code CLI - restart the session
```

### Development Workflow Integration

#### Database Operations
Use Supabase MCP server for:
- Fixing "Failed to load settings" errors
- Creating missing database tables
- Updating RLS policies
- Running database migrations
- Performance monitoring

#### Code Development  
Use Serena MCP server for:
- Semantic code search and navigation
- Intelligent refactoring across components
- Type-safe code modifications
- Understanding component relationships
- Context-aware code generation

#### Deployment Management
Use Render MCP server for:
- Monitoring production deployments
- Accessing backend service logs
- Managing environment configurations
- Performance monitoring
- Deployment troubleshooting

#### Code Integration
Use Anthropic MCP Code Analyzer for:
- Analyzing open source projects for feature adoption
- Generating intelligent merge strategies
- Identifying code patterns and best practices
- Resolving integration conflicts
- Planning architectural improvements

### Troubleshooting

#### MCP Server Not Working
1. **Check Configuration**: Verify JSON syntax in config files
2. **Environment Variables**: Ensure all required env vars are set
3. **Package Installation**: Verify MCP packages are installed globally
4. **Restart Required**: Restart Claude Desktop/CLI after config changes
5. **Log Inspection**: Check MCP server logs for error messages

#### Common Issues
- **Permission Denied**: Check API keys and service role permissions
- **Connection Timeout**: Verify network connectivity and API endpoints
- **Invalid Configuration**: Validate JSON syntax and required fields
- **Package Not Found**: Reinstall MCP server packages

### Setup Complete! ✅

All four MCP servers are now configured and ready for use:
- 🗄️ **Supabase**: Direct database access and SQL execution
- 🧠 **Serena**: Semantic code analysis and intelligent editing  
- ☁️ **Render**: Deployment monitoring and management
- 🔄 **Code Analyzer**: AI-powered repository analysis and integration

This powerful combination enables rapid, AI-assisted development with direct access to database operations, intelligent code analysis, deployment management, and smart code integration capabilities.

---

## Claude Code Subagents

### Overview
The Wheels & Wins project utilizes Claude Code Subagents to parallelize development tasks and leverage specialized AI expertise. Each subagent runs in its own 200k-token context window, enabling deep focus on specific domains without overwhelming the main session.

### Configuration
- **Location**: `.claude/agents/` directory
- **Settings**: `.claude/settings.json` with `enableSubagents: true`
- **Format**: Markdown files with YAML frontmatter

### Available Subagents

#### 🧪 **test-writer** - Test Suite Developer
**Purpose**: Address the critical 0% test coverage gap
**Specialization**: React Testing Library, Vitest, Playwright E2E
**Key Tasks**:
- Create component unit tests
- Write integration test suites
- Develop E2E test scenarios
- Achieve 80%+ coverage target

#### 🔍 **code-analyzer** - Code Quality Specialist  
**Purpose**: Analyze code quality and identify improvements
**Specialization**: TypeScript, React patterns, ESLint rules
**Key Tasks**:
- Identify technical debt
- Find performance bottlenecks
- Detect security vulnerabilities
- Suggest architectural improvements

#### ⚡ **performance-optimizer** - Performance Engineer
**Purpose**: Optimize bundle size and runtime performance
**Specialization**: Vite optimization, lazy loading, caching
**Key Tasks**:
- Analyze bundle sizes
- Implement code splitting
- Optimize loading performance
- Enhance mobile experience

#### 🔐 **security-auditor** - Security Specialist
**Purpose**: Audit security vulnerabilities and compliance
**Specialization**: Authentication, API security, data protection
**Key Tasks**:
- API endpoint security audit
- Authentication flow review
- GDPR compliance check
- Vulnerability assessment

#### 🤖 **pam-enhancer** - PAM AI Specialist
**Purpose**: Enhance PAM assistant capabilities
**Specialization**: Voice integration, WebSocket, AI responses
**Key Tasks**:
- Improve voice quality
- Enhance conversation flow
- Add new PAM features
- Optimize response times

#### 🎨 **ui-ux-designer** - UI/UX Developer
**Purpose**: Improve UI components and user experience
**Specialization**: Radix UI, Tailwind CSS, accessibility
**Key Tasks**:
- Create new components
- Enhance mobile UX
- Ensure WCAG compliance
- Maintain design consistency

#### 🗄️ **database-architect** - Database Specialist
**Purpose**: Optimize database and backend architecture
**Specialization**: PostgreSQL, Supabase, RLS policies
**Key Tasks**:
- Query optimization
- Schema design
- RLS policy management
- Performance tuning

#### 📚 **docs-writer** - Documentation Specialist
**Purpose**: Create and maintain documentation
**Specialization**: API docs, user guides, technical writing
**Key Tasks**:
- Document new features
- Update API documentation
- Create user guides
- Maintain technical docs

### Usage Examples

#### Parallel Execution with `/auto_run`
```bash
# Create comprehensive test suite using multiple agents
/auto_run Create full test coverage for Wheels & Wins components

# Security and performance audit
/auto_run --verbose Audit application security and performance using specialized agents
```

#### Sequential Tasks with `/task`
```bash
# Analyze then optimize
/task code-analyzer "Identify performance bottlenecks in trip planning"
/task performance-optimizer "Implement optimizations for identified issues"

# Security workflow
/task security-auditor "Audit authentication endpoints"
/task test-writer "Create security tests for auth flows"
```

#### Common Workflows

**1. Feature Development**
```bash
/task ui-ux-designer "Design new expense tracking dashboard"
/task pam-enhancer "Add PAM integration for expense insights"
/task test-writer "Create tests for new expense features"
/task docs-writer "Document expense tracking feature"
```

**2. Performance Optimization**
```bash
/task performance-optimizer "Analyze current bundle sizes"
/task code-analyzer "Find unnecessary dependencies"
/task ui-ux-designer "Implement lazy loading for heavy components"
```

**3. Security Hardening**
```bash
/task security-auditor "Full security audit of API endpoints"
/task database-architect "Review and strengthen RLS policies"
/task test-writer "Create security test suite"
```

### Best Practices

1. **Use Parallel Execution**: Leverage `/auto_run` for independent tasks
2. **Chain Related Tasks**: Use `/task` for sequential workflows
3. **Specific Instructions**: Provide clear, detailed prompts to agents
4. **Monitor Progress**: Use `/verbose` flag for detailed output
5. **Combine with MCP**: Agents can use MCP servers for enhanced capabilities

### Integration with MCP Servers

Subagents seamlessly integrate with configured MCP servers:
- **database-architect** uses Supabase MCP for direct SQL operations
- **security-auditor** leverages Supabase advisors for security checks
- **code-analyzer** can utilize Serena for semantic analysis
- **pam-enhancer** uses WebFetch for API testing

### Troubleshooting

**Agent Not Found**
- Verify agent file exists in `.claude/agents/`
- Check YAML frontmatter syntax
- Ensure `enableSubagents: true` in settings

**Permission Errors**
- Verify required tools are listed in agent config
- Check `.claude/settings.json` permissions

**Context Overflow**
- Break large tasks into smaller chunks
- Use file-based context sharing between agents
- when launcing, first look through the docs folder to familiarise yourself with the project

---

## Current QA Issues Being Fixed (August 2025)

### Priority Issues List
Based on QA testing, the following issues are being addressed:

1. **✅ Profile & Notification Switches** (FIXED)
   - Issue: "Locally updated, will retry backend sync"
   - Fix: Enhanced error handling with retry logic in `useUserSettings`
   - Status: Settings now properly sync with rollback on failure

2. **Income Page Layout Issues**
   - Problem: Duplicate "Add Income" buttons, confusing layout
   - Location: `src/components/wins/WinsIncome.tsx`
   - Fix: Remove duplicate button, keep MobileFormWrapper only

3. **Broken Avatars in Social**
   - Problem: Missing avatar URLs in feed and groups
   - Location: Social feed and groups components
   - Fix: Add proper avatar generation/fallback system

4. **Join Savings Challenge Button**
   - Problem: Button has no functionality
   - Location: `src/components/wins/tips/TipsLeaderboard.tsx`
   - Fix: Add onClick handler with challenge modal

5. **Edit Budgets Clarity**
   - Problem: Unclear functionality, date range limited to current year
   - Location: Budget management components
   - Fix: Add tooltips and extend date range options

6. **Make Money on the Road Guidance**
   - Problem: Users don't understand the feature
   - Location: `src/components/wins/WinsMoneyMaker.tsx`
   - Fix: Add onboarding tooltip or info card

7. **Knowledge Bucket Architecture**
   - Problem: Scalability concerns about per-user buckets
   - Location: Knowledge management system
   - Fix: Review and possibly implement shared bucket system

## Recent UI/UX Improvements (August 2025)

### ✅ Navigation Hierarchy Simplification
**Issue**: Expenses and Income pages had 4 levels of navigation causing user confusion
**Solution**: Reduced to 3 clear levels with improved visual hierarchy

#### Expenses Page Redesign:
```typescript
// New structure implemented in WinsExpenses.tsx
Page Header Section
├── Title & Description
├── Primary Actions Bar
│   ├── View Toggle (Timeline | Chart) - Segmented control
│   ├── Add Expense button
│   └── Import Bank Statement button
├── Category Filter Tabs (horizontal scroll)
├── Quick Input Section
│   ├── Natural Language Input
│   └── Voice Logger
├── Main Content Area (Timeline or Chart)
└── PAM Insight Card
```

**Key Improvements**:
- **Timeline/Chart Toggle**: Now a prominent segmented control in header (was buried in sub-menu)
- **Action Buttons**: Elevated to header for better visibility
- **Visual Sections**: Clear separation between functional areas
- **Mobile Responsive**: Proper stacking and touch targets

#### Income Page Consistency:
- Applied same header structure as Expenses
- Consistent button placement and styling
- Clear visual hierarchy with proper spacing

### ✅ Bank Statement Converter Implementation (Completed August 2025)
**Overview**: Comprehensive bank statement import system with privacy-first architecture and intelligent transaction processing.

**Component Architecture**:
```
BankStatementConverter (Main Component)
├── UploadStage - File selection and validation
├── ProcessingStage - Parsing and anonymization
└── ReviewStage - Transaction review and import
```

**Key Features**:
- **Privacy-First Design**: All processing happens locally in browser
- **Multi-Format Support**: CSV, Excel (XLS/XLSX), PDF
- **Automatic Data Redaction**: Removes all sensitive information
- **Smart Categorization**: AI-powered expense categorization
- **PAM Integration**: Intelligent insights and savings recommendations
- **Duplicate Detection**: Prevents duplicate transaction imports
- **Session Tracking**: Audit trail for compliance

**File Format Support**:
- **CSV**: Direct client-side parsing with auto-detection
- **Excel**: XLSX/XLS parsing using SheetJS library
- **PDF**: Server-side processing with OCR capabilities
- **Universal Parser**: Fallback for various bank formats

**Security & Privacy Measures**:
- **Client-Side Processing**: Data never leaves the browser unencrypted
- **Automatic Anonymization**:
  - Account numbers (shows last 4 digits only)
  - Social Security Numbers (complete removal)
  - Phone numbers and emails (redacted)
  - Physical addresses (removed)
  - Personal names (anonymized)
- **Memory Management**:
  - Automatic cleanup on component unmount
  - File references cleared after processing
  - Transaction data overwritten in memory
  - Garbage collection hints for browser
- **Compliance**:
  - GDPR compliant (no data retention)
  - PCI DSS compliant (no card storage)
  - SOC 2 aligned security practices

**Integration Points**:
- **PAM Savings Service**: `pamBankStatementIntegration.importTransactions()`
- **Supabase Backend**: Session tracking in `bank_processing_sessions` table
- **Expense System**: Direct import to Wins expense tracker
- **Budget Analytics**: Automatic budget category assignment

**Implementation Files**:
- Components: `src/components/bank-statement/`
  - `BankStatementConverter.tsx` - Main component
  - `UploadStage.tsx` - File upload interface
  - `ProcessingStage.tsx` - Processing pipeline
  - `ReviewStage.tsx` - Transaction review
- Services: `src/services/bankStatement/`
  - `anonymizer.ts` - Data redaction engine
  - `csvParser.ts` - CSV file parser
  - `excelParser.ts` - Excel file parser
  - `pdfParser.ts` - PDF file parser
  - `documentParser.ts` - Universal parser
- Integration: `src/services/pamSavingsService.ts`

### UI/UX Best Practices Learned:
1. **Reduce Navigation Depth**: Keep to 3 levels maximum
2. **Prominent Controls**: Primary actions should be immediately visible
3. **Visual Hierarchy**: Use spacing and backgrounds to create clear sections
4. **Segmented Controls**: Better than buried toggle buttons for view switching
5. **Mobile-First**: Always test button placement on mobile viewports
6. **Consistent Patterns**: Apply same layout structure across similar pages

### CSS Organization:
- Keep @import statements at the top of index.css
- QuickActionStyles.css contains animation and mobile optimizations
- Use Tailwind utility classes for consistent spacing
- Dark mode support with proper color variables

### Component Structure Guidelines:
When organizing page components:
1. Start with clear page header (title, description, primary actions)
2. Place view controls prominently (not buried in sub-menus)
3. Group related functionality (e.g., Quick Input section)
4. Main content area should be clearly defined
5. Support sections (like PAM insights) at the bottom

### Testing Checklist for UI Changes:
- [ ] Mobile responsiveness (test at 375px, 768px, 1024px)
- [ ] Touch target sizes (minimum 44x44px)
- [ ] Dark mode compatibility
- [ ] Keyboard navigation
- [ ] Screen reader accessibility
- [ ] Loading states
- [ ] Error states
- [ ] Empty states