# Technology Stack

## Frontend

### Core Technologies
- **React 18.3.1** - UI framework
- **TypeScript 5.6.3** - Type safety
- **Vite 5.4.19** - Build tool and dev server
- **Tailwind CSS 3.4.11** - Utility-first CSS
- **React Router 7.1.1** - Client-side routing

### UI Components
- **Radix UI** - Headless component library (25+ components)
- **Shadcn/UI** - Component system built on Radix
- **Lucide React** - Icon library
- **Framer Motion** - Animation library
- **Recharts** - Data visualization

### State Management
- **React Context** - Global state
- **React Hook Form** - Form management
- **Zod** - Schema validation
- **TanStack Query** - Server state management

### Map & Location
- **Mapbox GL JS** - Interactive maps
- **@mapbox/mapbox-gl-directions** - Route planning
- **@turf/turf** - Geospatial analysis

### PWA & Performance
- **Workbox** - Service worker management
- **vite-plugin-pwa** - PWA generation
- **Web Vitals** - Performance monitoring

## Backend

### Core Services (4 Render Services)
1. **pam-backend** (FastAPI)
   - Main API server
   - WebSocket connections
   - Authentication
   - Business logic

2. **pam-redis** (Redis)
   - Session management
   - Caching
   - Rate limiting
   - Real-time data

3. **pam-celery-worker** (Celery)
   - Background tasks
   - Email sending
   - Data processing
   - OCR processing

4. **pam-celery-beat** (Celery Beat)
   - Scheduled tasks
   - Cron jobs
   - Periodic cleanup

### Backend Technologies
- **FastAPI** - Modern Python web framework
- **Pydantic** - Data validation
- **SQLAlchemy** - ORM
- **Alembic** - Database migrations
- **Redis** - Caching and sessions
- **Celery** - Task queue
- **WebSockets** - Real-time communication

## Database

### Supabase (PostgreSQL)
- **PostgreSQL 15** - Primary database
- **Row Level Security (RLS)** - Data access control
- **PostGIS** - Geospatial queries
- **pgvector** - Vector embeddings for AI

### Key Tables
- `profiles` - User profiles
- `user_settings` - User preferences
- `expenses` - Financial transactions
- `budgets` - Budget configurations
- `user_trips` - Saved trips
- `trip_templates` - Pre-built journeys
- `pam_conversations` - AI chat history
- `medical_records` - Health documents
- `medications` - Medication tracking

## AI & Machine Learning

### OpenAI Integration
- **GPT-4** - Text generation
- **Whisper** - Speech-to-text
- **TTS** - Text-to-speech

### AI Features
- PAM conversational assistant
- Health consultation
- Trip optimization
- Financial insights
- Document OCR

## External Services

### APIs
- **Mapbox** - Maps and geocoding
- **OpenAI** - AI models
- **Supabase** - Backend as a service
- **Sentry** - Error tracking
- **Google Analytics** - Usage analytics

### Payment & Commerce
- **Stripe** - Payment processing (planned)
- **Digistore24** - Digital products (integrated)

## Development Tools

### Code Quality
- **ESLint** - Linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **Commitlint** - Commit message linting
- **TypeScript** - Type checking

### Testing
- **Vitest** - Unit testing
- **Playwright** - E2E testing
- **React Testing Library** - Component testing
- **MSW** - API mocking

### Build & Bundle
- **Vite** - Build tool
- **Rollup** - Module bundler
- **esbuild** - Fast transpilation
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixes

## Deployment

### Frontend (Netlify)
- **Production**: main branch
- **Staging**: staging branch
- **Preview**: PR deployments
- **CDN**: Global distribution
- **SSL**: Automatic HTTPS

### Backend (Render)
- **Region**: US East (Ohio)
- **Auto-scaling**: Enabled
- **Health checks**: Every 30 seconds
- **Zero-downtime**: Blue-green deployments

### Monitoring
- **Sentry** - Error tracking
- **Render Metrics** - Server monitoring
- **Netlify Analytics** - Traffic analysis
- **Supabase Dashboard** - Database monitoring

## Environment Variables

### Frontend (VITE_ prefix required)
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_MAPBOX_TOKEN
VITE_SENTRY_DSN
VITE_GA_MEASUREMENT_ID
```

### Backend
```
DATABASE_URL
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
REDIS_URL
SECRET_KEY
TTS_ENABLED
```

## Version Requirements

- **Node.js**: 20.x
- **npm**: 10.x
- **Python**: 3.11+
- **PostgreSQL**: 15+
- **Redis**: 7+