# Wheels & Wins - Essential Instructions

## 🚀 Quick Start
**Dev Server**: http://localhost:8080 (NOT 3000!)
**Stack**: React 18.3 + TypeScript + Vite + FastAPI + Supabase

## Critical Commands
```bash
npm run dev               # Start dev server (port 8080)
npm run build             # Production build
npm run quality:check:full # Run all quality checks
npm test                  # Run tests
```

## Project Structure
```
src/
├── components/          # UI components
│   ├── wheels/         # Trip planning
│   ├── wins/           # Financial
│   ├── social/         # Community
│   └── pam/            # AI assistant
├── pages/              # Routes
├── services/           # API clients
└── __tests__/          # Tests
```

## Environment Variables
```bash
# Frontend (.env) - Must use VITE_ prefix!
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
VITE_MAPBOX_TOKEN=your_token

# Backend (backend/.env)
DATABASE_URL=postgresql://...
OPENAI_API_KEY=your_key
```

## ⚠️ Critical Rules
1. **Dev Port**: Always use 8080, never 3000
2. **Env Vars**: Frontend vars MUST have `VITE_` prefix
3. **TypeScript**: `"strict": false` in development
4. **PAM WebSocket**: Include user_id: `/api/v1/pam/ws/${userId}?token=${token}`
5. **Staging First**: Test on staging before production
6. **Quality Checks**: Run `npm run quality:check:full` before commits

## Deployment
- **Frontend**: Netlify (auto-deploy from main/staging branches)
- **Backend**: Render.com (4 services: pam-backend, redis, workers)
- **Database**: Supabase with RLS policies
- **Staging**: `https://staging--[site-id].netlify.app`

## Known Issues & Solutions

### PAM Technical Debt
- Multiple WebSocket implementations exist (use `pamService.ts`)
- Duplicate components: `Pam.tsx` and `PamAssistant.tsx`
- Always include user_id in WebSocket URL

### Common Fixes
- **Map not loading**: Check Mapbox token
- **Settings not syncing**: Check `useUserSettings` hook
- **Build errors**: Clear node_modules and reinstall
- **WebSocket errors**: Verify user_id in URL path

## Testing Requirements
- 80%+ coverage target (currently 0% - needs work!)
- Run tests: `npm test`
- E2E tests: `npm run e2e`

## Bundle Optimization
Configured in `vite.config.ts` with 12 manual chunks:
- react-vendor, mapbox-vendor, radix-vendor, chart-vendor
- calendar-vendor, icons-vendor, utils-vendor, etc.

## Key Files
- `vite.config.ts` - Build configuration
- `src/hooks/useUserSettings.ts` - Settings sync
- `backend/app/api/v1/pam.py` - PAM WebSocket
- `docs/` folder - Detailed documentation

## Recent Fixes (2025)
✅ Animation system removed (performance fix)
✅ WebSocket stability improved
✅ Environment variable auto-detection
✅ Database RLS policies fixed
✅ Serena MCP server integrated

## Priority QA Issues
1. Income page duplicate buttons
2. Broken avatars in social
3. Join Savings Challenge - no functionality
4. Edit Budgets clarity needed
5. Money Maker feature needs guidance

## Development Tips
- Mobile-first design (test at 375px, 768px, 1024px)
- Use Tailwind utilities for styling
- Functional components only (no class components)
- Use Tanstack Query for server state
- Test on staging before production deploy

---
**Note**: For detailed documentation, see `/docs` folder. This file contains only essential quick-reference information.