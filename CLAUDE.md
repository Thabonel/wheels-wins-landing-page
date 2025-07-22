# Claude Code Instructions for Wheels & Wins Project

## Project Overview
Wheels & Wins is a comprehensive travel planning and RV community platform built with React/TypeScript frontend and Python FastAPI backend. The application features intelligent trip planning with Mapbox integration, PAM AI assistant with voice capabilities, financial management, social networking, and progressive web app functionality.

## Architecture Overview

### Frontend Stack
- **React 18** + **TypeScript** - Modern React with strict typing
- **Vite** - Fast build tool with optimized code splitting
- **Tailwind CSS** - Utility-first styling framework
- **Radix UI** - Accessible component primitives
- **Tanstack Query** - Server state management
- **Mapbox GL JS** - Interactive mapping and route planning

### Backend Stack
- **FastAPI** - High-performance Python API framework
- **PostgreSQL** - Primary database via Supabase
- **Redis** - Caching and session management
- **WebSocket** - Real-time PAM communication
- **Multi-Engine TTS** - Edge TTS, Coqui TTS, system TTS fallbacks

### Key Features
- 🗺️ **Trip Planning**: Interactive maps with real-time overlays
- 🤖 **PAM AI Assistant**: Voice-enabled conversational AI
- 💰 **Financial Management**: Expense tracking and budgeting
- 👥 **Social Features**: Community networking and sharing
- 📱 **PWA**: Mobile-optimized progressive web app
- 🔊 **Voice Integration**: TTS/STT with multiple engine fallbacks

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

### Frontend Deployment (Netlify)
- **Auto-deployment**: From main branch
- **Environment Variables**: Set in Netlify dashboard
- **Build Optimization**: Vite production build
- **CDN Distribution**: Global content delivery
- **Preview Deployments**: Branch-based previews

### Backend Deployment (Render)
- **Docker Deployment**: Containerized Python app
- **Auto-scaling**: Based on traffic
- **Health Monitoring**: Automated health checks
- **Environment Management**: Secure variable handling
- **Background Workers**: Celery task processing

### Database (Supabase)
- **PostgreSQL**: Managed database service
- **Real-time Features**: WebSocket subscriptions
- **Row Level Security**: Database-level authorization
- **Automatic Backups**: Point-in-time recovery
- **Edge Functions**: Serverless compute

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

## Important Notes for Claude Code

### Always Remember
- **Test First**: Write tests for new features
- **Mobile First**: Design for mobile users
- **Performance First**: Optimize for speed and efficiency
- **Security First**: Follow security best practices
- **User First**: Prioritize user experience

### When Making Changes
1. Run quality checks before committing
2. Update tests for modified functionality
3. Verify mobile responsiveness
4. Check performance impact
5. Update documentation as needed

### Key Files to Understand
- `vite.config.ts`: Build configuration and optimization
- `src/test/mocks/supabase.ts`: Test mocking infrastructure
- `backend/app/core/config.py`: Backend configuration
- `backend/setup_tts.py`: TTS service initialization
- `public/manifest.json`: PWA configuration

This project represents a mature, production-ready application with comprehensive testing, security, and performance optimization. Always maintain these high standards when contributing to the codebase.