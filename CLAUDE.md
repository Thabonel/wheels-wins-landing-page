# Claude Code Instructions for Wheels & Wins

## 🚀 Quick Start
**Dev Server**: http://localhost:8080 (NOT 3000!)
**Stack**: React 18.3 + TypeScript + Vite + Tailwind + Supabase + FastAPI

## Critical Commands
```bash
npm run dev              # Start dev server (port 8080)
npm run build            # Production build
npm run quality:check:full # Run all quality checks
npm test                 # Run tests
npm run lint             # ESLint
npm run type-check       # TypeScript validation
```

## Architecture Overview
```
Frontend (React/TS/PWA) ◄──► Backend (FastAPI/Redis) ◄──► External Services
├── Vite 5.4.19               ├── pam-backend              ├── Supabase DB
├── Tailwind 3.4.11           ├── pam-redis                ├── Mapbox GL
├── Radix UI (25+)            ├── celery-worker            ├── OpenAI GPT-4
└── PWA Manifest              └── WebSocket                └── TTS/STT
```

## Environment Variables

### Frontend (.env)
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_MAPBOX_TOKEN=pk.your_mapbox_token
```

### Backend (backend/.env)
```bash
DATABASE_URL=postgresql://...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
TTS_ENABLED=true
REDIS_URL=redis://localhost:6379
```

## Project Structure
```
src/
├── components/      # UI components
│   ├── wheels/     # Trip planning
│   ├── wins/       # Financial
│   ├── social/     # Community
│   └── pam/        # AI assistant
├── pages/          # Routes
├── hooks/          # Custom hooks
├── services/       # API clients
└── __tests__/      # Tests
```

## Deployment

### Frontend (Netlify)
- **Production**: main branch → domain
- **Staging**: staging branch → staging--[site].netlify.app
- **Build**: `npm run build`

### Backend (Render - 4 Services)
1. **pam-backend**: https://pam-backend.onrender.com
2. **pam-redis**: Private network cache
3. **pam-celery-worker**: Background tasks
4. **pam-celery-beat**: Task scheduler

### Database (Supabase)
- PostgreSQL with RLS
- Tables: profiles, user_settings, pam_conversations, expenses, budgets
- Daily backups

## PAM AI Assistant Issues

### Known Problems
1. **Multiple WebSocket implementations** (4 versions!)
   - pamService.ts, usePamWebSocket.ts, usePamWebSocketConnection.ts, usePamWebSocketV2.ts
2. **Duplicate components**: Pam.tsx AND PamAssistant.tsx
3. **WebSocket URL**: Must include user_id: `/api/v1/pam/ws/${userId}?token=${token}`

### PAM Connection
- **WebSocket**: `wss://pam-backend.onrender.com/api/v1/pam/ws/{user_id}?token={jwt}`
- **Health**: https://pam-backend.onrender.com/api/health

## MCP Servers Configuration

### Available MCP Servers
1. **Supabase**: Direct SQL operations
2. **Serena**: Semantic code analysis
3. **Render**: Deployment management
4. **Code Analyzer**: AI-powered integration

### Setup
```bash
# Supabase
npm install -g @supabase/mcp-server-supabase

# Serena (via uvx)
uvx --from git+https://github.com/oraios/serena serena-mcp-server --help

# Render
npm install -g @render/mcp-server
```

Configuration: `~/.config/claude-desktop/claude_desktop_config.json`

## Recent Fixes (January 2025)

### ✅ Fixed Issues
1. **Animation System**: Removed problematic page transitions
2. **WebSocket Stability**: Fixed connection state management
3. **Database**: Fixed RLS recursion, created missing tables
4. **Environment Variables**: Smart detection for swapped values
5. **Serena Integration**: Semantic code analysis enabled

### Files Updated
- `src/App.tsx` - Removed animations
- `src/integrations/supabase/client.ts` - Smart env detection
- `backend/app/api/v1/pam.py` - WebSocket fixes
- `supabase/migrations/` - Database fixes

## Current QA Issues (August 2025)

### Priority Fixes
1. ✅ **Profile Settings**: Fixed sync with retry logic
2. ✅ **Income Page**: Fixed duplicate buttons
3. ✅ **Social Avatars**: Added fallback system
4. ✅ **Savings Challenge**: Added button functionality
5. ✅ **Budget Editor**: Extended date range
6. ✅ **Money Maker**: Added onboarding guidance

## UI/UX Guidelines

### Navigation Hierarchy
- Keep to 3 levels maximum
- Primary actions in header
- Use segmented controls for view switching
- Mobile-first design

### Recent Improvements
- **Expenses Page**: Simplified from 4 to 3 navigation levels
- **Bank Statement Import**: Privacy-first, multi-format support
- **Components**: Clear visual hierarchy with proper spacing

### Bank Statement Converter
- **Privacy**: Client-side processing
- **Formats**: CSV, Excel, PDF
- **Security**: Auto-anonymization, GDPR compliant
- **Files**: `src/components/bank-statement/`, `src/services/bankStatement/`

## Development Guidelines

### Code Standards
- **TypeScript**: Strict mode (currently false for dev velocity)
- **Testing**: 80%+ coverage requirement
- **Mobile-first**: Responsive design
- **Accessibility**: WCAG compliance
- **No mock data**: Production-ready code only

### Bundle Strategy (vite.config.ts)
```javascript
{
  'react-vendor': ['react', 'react-dom'],
  'mapbox-vendor': ['mapbox-gl'],
  'radix-vendor': [...],
  'chart-vendor': ['recharts'],
  'utils-vendor': ['clsx', 'tailwind-merge']
}
```

### Component Template
```typescript
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
  // Implementation
};
```

## Security Best Practices
- Supabase Auth with JWT
- RLS on all tables
- Input validation
- XSS prevention
- Rate limiting
- GDPR compliance

## Common Pitfalls
1. **Port**: Use 8080, NOT 3000
2. **PAM**: Don't create new implementations, fix existing
3. **Env vars**: Use VITE_ prefix for frontend
4. **Staging**: Always test there first
5. **RLS**: Test for recursion

## Key Files
- `vite.config.ts` - Build configuration
- `src/hooks/useUserSettings.ts` - Settings sync
- `backend/app/api/v1/pam.py` - PAM WebSocket
- `docs/pam-current-state-breakdown.md` - Technical debt

## Testing Checklist
- [ ] Mobile responsive (375px, 768px, 1024px)
- [ ] Touch targets (min 44x44px)
- [ ] Dark mode
- [ ] Keyboard navigation
- [ ] Screen reader
- [ ] Loading/error/empty states

## Quick Debug
```bash
# Check TypeScript
npm run type-check

# Full quality check
npm run quality:check:full

# Backend server
cd backend && uvicorn app.main:app --reload --port 8000

# Test coverage
npm run test:coverage
```

---
**Remember**: This is a production app with real users. Test thoroughly, especially on mobile!