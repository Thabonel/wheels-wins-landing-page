# Quick Start for Claude Code Sessions

## 🚀 For New Claude Sessions

Start your message with:
```
Please read the docs/PROJECT_CONTEXT folder to understand the Wheels & Wins project.
```

## 📋 Essential Information

### Project
- **Name**: Wheels & Wins
- **Type**: RV Travel Planning + Financial Management PWA
- **Stack**: React + TypeScript + Vite + Supabase + FastAPI

### Critical Points
- **Dev Port**: 8080 (NOT 3000!)
- **Main Branch**: Production
- **Staging Branch**: Development
- **User**: Thabonel (thabonel0@gmail.com)

### Common Commands
```bash
npm run dev              # Start dev (port 8080)
npm run build           # Build for production
npm run quality:check:full  # Run all checks
npm test                # Run tests
```

### Key Files
- `/CLAUDE.md` - Project instructions
- `~/.claude/CLAUDE.md` - User preferences
- `/docs/PROJECT_CONTEXT/` - This folder
- `/src/components/wheels/TripPlannerApp.tsx` - Main trip planner
- `/src/components/pam/PamAssistant.tsx` - AI assistant

### Recent Context (Jan 31, 2025)
- ✅ Merged 134 commits from staging to main
- ✅ Fixed enhanced trip planner integration
- ✅ Fixed Netlify deployment (removed Darwin packages)
- ✅ Updated Supabase authentication keys
- ⚠️ PAM WebSocket needs consolidation (4 implementations)

### Current Issues
1. **PAM WebSocket** - Multiple implementations need consolidation
2. **TypeScript Strict** - Currently disabled, 80+ errors when enabled
3. **Test Coverage** - At 60%, target 80%

### Environment Variables
```bash
# Frontend (VITE_ prefix required!)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_MAPBOX_TOKEN=

# Backend
DATABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
```

### Database
- **Provider**: Supabase (PostgreSQL)
- **Key Tables**: profiles, user_trips, expenses, budgets, trip_templates
- **RLS**: Enabled on all tables
- **Migrations**: In `supabase/migrations/`

### Deployment
- **Frontend**: Netlify (auto-deploy from GitHub)
- **Backend**: Render (4 services)
- **Database**: Supabase cloud

## 🎯 Common Tasks

### Fix Supabase Error
```typescript
// Use 'user_trips' not 'saved_trips'
await supabase.from('user_trips').select('*')
```

### Fix PAM WebSocket
```typescript
// Correct URL format
`wss://pam-backend.onrender.com/api/v1/pam/ws/${userId}?token=${token}`
```

### Deploy to Production
```bash
git checkout main
git merge staging
git push origin main
```

## 📚 Read More

For detailed information, read the numbered files in order:
1. [01-PROJECT-OVERVIEW.md](01-PROJECT-OVERVIEW.md)
2. [02-TECH-STACK.md](02-TECH-STACK.md)
3. [03-CURRENT-STATE.md](03-CURRENT-STATE.md)
4. [04-KEY-FEATURES.md](04-KEY-FEATURES.md)
5. [05-COMMON-TASKS.md](05-COMMON-TASKS.md)
6. [06-DEPLOYMENT.md](06-DEPLOYMENT.md)