# 02 - Technical Architecture

**Purpose:** Understand the system design, component relationships, and data flow.

---

## System Architecture Diagram

```
                                    USERS
                                      |
                    +----------------+----------------+
                    |                                 |
              [Mobile/PWA]                      [Desktop Web]
                    |                                 |
                    +----------------+----------------+
                                     |
                              [Netlify CDN]
                         wheels-wins-staging.netlify.app
                            wheelsandwins.com
                                     |
                    +----------------+----------------+
                    |                                 |
              [React SPA]                      [Static Assets]
              - Vite 5.4                       - JS/CSS bundles
              - React 18.3                     - Images
              - TypeScript                     - Fonts
                    |
                    v
            [WebSocket + REST API]
                    |
                    v
              [Render Backend]
         wheels-wins-backend-staging.onrender.com
              pam-backend.onrender.com
                    |
        +-----------+-----------+-----------+
        |           |           |           |
   [FastAPI]   [PAM AI]    [Celery]    [Redis]
   - REST      - Claude    - Workers   - Cache
   - WebSocket - Gemini    - Beat      - Sessions
   - Auth      - Tools                 - Rate Limit
        |           |
        +-----------+
              |
              v
         [Supabase]
    - PostgreSQL (RLS)
    - Auth (JWT)
    - Storage
              |
              v
      [External APIs]
    - Mapbox (Maps)
    - OpenAI (Whisper)
    - Weather APIs
    - GasBuddy
```

---

## Component Architecture

### Frontend Components

```
src/
+-- App.tsx                    # Root component, routing
+-- components/
|   +-- admin/                 # Admin dashboard components
|   +-- pam/                   # PAM chat interface
|   |   +-- PamAssistant.tsx   # Main chat UI
|   |   +-- PamVoiceButton.tsx # Voice activation
|   |   +-- PamSavingsCard.tsx # Savings display
|   +-- shop/                  # Shop/marketplace
|   +-- wheels/                # Trip planning
|   |   +-- FreshTripPlanner.tsx
|   |   +-- MapComponent.tsx
|   +-- wins/                  # Financial tracking
|   |   +-- WinsOverview.tsx
|   |   +-- ExpenseTracker.tsx
|   +-- you/                   # User profile
|   +-- social/                # Community features
|   +-- ui/                    # Radix UI components
+-- pages/                     # Route pages
|   +-- Home.tsx
|   +-- Wheels.tsx
|   +-- Wins.tsx
|   +-- Social.tsx
|   +-- Shop.tsx
|   +-- You.tsx
+-- services/                  # API clients
|   +-- pamService.ts          # PAM WebSocket client
|   +-- supabaseClient.ts      # Supabase client
+-- hooks/                     # Custom React hooks
|   +-- useAuth.ts
|   +-- usePam.ts
|   +-- useUserSettings.ts
+-- types/                     # TypeScript definitions
|   +-- pamContext.ts
|   +-- database.types.ts
+-- utils/                     # Utilities
    +-- pamLocationContext.ts
```

### Backend Components

```
backend/
+-- app/
    +-- main.py                # FastAPI application entry
    +-- api/
    |   +-- v1/                # API version 1
    |       +-- pam.py         # PAM endpoints (legacy)
    |       +-- pam_simple.py  # PAM Simple endpoints
    |       +-- pam_tools.py   # Tool execution
    |       +-- wins.py        # Financial endpoints
    |       +-- wheels.py      # Trip endpoints
    |       +-- social.py      # Social endpoints
    |       +-- auth.py        # Authentication
    |       +-- health.py      # Health checks
    |       +-- tts.py         # Text-to-speech
    |       +-- voice.py       # Voice processing
    +-- core/
    |   +-- config.py          # Configuration
    |   +-- logging.py         # Logging setup
    |   +-- middleware.py      # Custom middleware
    |   +-- cors_settings.py   # CORS configuration
    +-- services/
    |   +-- pam/               # PAM AI services
    |   |   +-- core/
    |   |   |   +-- pam.py     # Core PAM brain
    |   |   +-- tools/         # 45+ action tools
    |   |   |   +-- budget/    # 10 budget tools
    |   |   |   +-- trip/      # 10 trip tools
    |   |   |   +-- social/    # 10 social tools
    |   |   |   +-- shop/      # 5 shop tools
    |   |   |   +-- profile/   # 5 profile tools
    |   |   +-- tool_registry.py
    |   +-- ai/                # AI providers
    |   |   +-- anthropic_provider.py
    |   |   +-- openai_provider.py
    |   |   +-- gemini_provider.py
    |   +-- tts/               # Text-to-speech
    |   +-- voice/             # Voice processing
    |   +-- cache_service.py   # Redis caching
    +-- models/                # Pydantic models
    +-- middleware/            # HTTP middleware
    +-- config/                # Configuration
        +-- model_config.py    # AI model configuration
        +-- ai_providers.py    # Provider settings
```

---

## Data Flow Patterns

### 1. PAM Chat Flow (WebSocket)

```
User speaks "Hey PAM, add $50 gas expense"
        |
        v
[Browser] Web Speech API -> Text
        |
        v
[pamService.ts] Send via WebSocket
        |
        v
[pam_simple.py] WebSocket endpoint
        |
        v
[PersonalizedPamAgent] Load user context
        |
        v
[tool_registry.py] Get available tools
        |
        v
[Claude API] Function calling
        |
        v
[create_expense.py] Execute tool
        |
        v
[Supabase] Insert expense record
        |
        v
[Claude API] Generate response
        |
        v
[WebSocket] Return to frontend
        |
        v
[Edge TTS] Speak response
```

### 2. REST API Flow (HTTP)

```
[Frontend] fetch('/api/v1/wins/expenses')
        |
        v
[Netlify] Proxy to backend
        |
        v
[FastAPI] Route to handler
        |
        v
[Middleware] CORS, Auth, Rate Limit
        |
        v
[wins.py] Endpoint handler
        |
        v
[Supabase] Query with RLS
        |
        v
[Response] JSON to frontend
```

### 3. Authentication Flow

```
[User] Enter credentials
        |
        v
[Supabase Auth] Validate
        |
        v
[JWT Token] Issued
        |
        v
[Frontend] Store in localStorage
        |
        v
[API Calls] Authorization header
        |
        v
[Backend] Verify JWT
        |
        v
[Supabase] RLS uses auth.uid()
```

---

## Service Dependencies

```
Frontend
   |
   +-- React 18.3
   +-- TypeScript 5.5
   +-- Vite 5.4
   +-- Tailwind CSS 3.4
   +-- Radix UI (components)
   +-- Zustand (state)
   +-- React Query (data fetching)
   +-- Mapbox GL JS (maps)
   +-- Supabase JS (auth/db)

Backend
   |
   +-- Python 3.11+
   +-- FastAPI
   +-- Uvicorn (ASGI server)
   +-- Anthropic SDK (Claude)
   +-- google-generativeai (Gemini)
   +-- OpenAI SDK (Whisper)
   +-- Redis (caching)
   +-- Celery (background tasks)
   +-- Supabase (database)
```

---

## Scaling Architecture

### Current Setup (Free Tier)

```
[Netlify Free]     [Render Free]     [Supabase Free]
- 100 GB/month     - 512 MB RAM      - 500 MB storage
- Auto-deploy      - Auto-sleep      - 2 GB bandwidth
                   - 1 worker
```

### Production Setup (Paid)

```
[Netlify Pro]      [Render Starter]  [Supabase Pro]
- Unlimited        - 2 GB RAM        - 8 GB storage
- Analytics        - Always-on       - 50 GB bandwidth
- Form handling    - 4 workers       - Daily backups
                   - Redis 25MB
```

### Future Scaling

```
[Horizontal Scaling]
- Multiple Render instances
- Load balancer
- Redis cluster
- Read replicas

[Edge Computing]
- Netlify Edge Functions
- Geographic distribution
- Reduced latency
```

---

## Environment Configuration

### Frontend Environment Variables

```bash
# .env (Vite)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_MAPBOX_TOKEN=pk.xxx
VITE_BACKEND_URL=https://pam-backend.onrender.com
VITE_PAM_WEBSOCKET_URL=wss://pam-backend.onrender.com/api/v1/pam/ws
VITE_ENVIRONMENT=production
```

### Backend Environment Variables

```bash
# backend/.env
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx
GEMINI_API_KEY=xxx
REDIS_URL=redis://...
SECRET_KEY=xxx
NODE_ENV=production
CORS_ORIGINS=https://wheelsandwins.com,https://wheels-wins-staging.netlify.app
```

---

## Error Handling Strategy

### Frontend Errors

```typescript
// React Query error handling
const { data, error, isLoading } = useQuery({
  queryKey: ['expenses'],
  queryFn: fetchExpenses,
  retry: 3,
  onError: (error) => {
    toast.error('Failed to load expenses');
    Sentry.captureException(error);
  }
});
```

### Backend Errors

```python
# FastAPI exception handling
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    sentry_service.capture_exception(exc)
    logger.error(f"Error in {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"}
    )
```

---

## Monitoring Architecture

```
[Sentry]           [Production Monitor]     [Health Checks]
- Error tracking   - Performance metrics    - /health endpoint
- Performance      - Resource usage         - Database ping
- User context     - Alerting               - Redis ping
                                            - AI provider status
```

---

## Key Design Decisions

### 1. Single AI Brain (Claude Primary)
**Decision:** Use Claude Sonnet 4.5 as primary with Gemini fallback
**Rationale:** Simplified architecture, best-in-class function calling
**Alternative Rejected:** Hybrid multi-model routing (too complex)

### 2. WebSocket for PAM Chat
**Decision:** WebSocket for real-time chat, REST for data operations
**Rationale:** Low latency for voice, connection persistence
**Trade-off:** More complex client code

### 3. Supabase RLS for Security
**Decision:** Row Level Security on all tables
**Rationale:** Database-level security, simplified backend
**Trade-off:** Complex policy debugging

### 4. Netlify + Render Split
**Decision:** Netlify for frontend, Render for backend
**Rationale:** Best-of-breed for each layer
**Alternative:** Single-platform (Vercel) rejected for Python support

### 5. Redis for PAM Context
**Decision:** Redis caching for user profiles and context
**Rationale:** Fast access for AI context, session persistence
**Trade-off:** Additional infrastructure
