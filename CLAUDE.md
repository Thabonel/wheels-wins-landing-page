# Claude Code Instructions for Wheels & Wins Project

## Project Overview
This is a React/TypeScript trip planning application with Mapbox integration and a Python backend. The app helps users plan RV and travel routes with various overlays and features.

## Key Commands & Workflows

### Testing Commands
- `npm run dev` - Start development server on port 8080
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript checks

### Important Project Structure
- `/src/components/wheels/trip-planner/` - Main trip planning components
- `/backend/` - Python FastAPI backend
- `.env` - Environment variables (not in git, set in Netlify)

## Coding Guidelines

### Always Follow These Rules
1. **NO MOCK DATA**: Never use mock data, never build mock interfaces - always build for production with real data sources
2. **PRODUCTION-READY CODE**: All implementations must be production-ready, functional, and connected to real APIs/services
3. **Environment Variables**: Remember that .env files are excluded from git - Netlify needs environment variables set in dashboard
4. **Map Token**: Use `import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN` or `import.meta.env.VITE_MAPBOX_TOKEN`
5. **Non-Breaking Changes**: Always ensure changes don't break existing functionality
6. **Testing**: Run lint and typecheck before commits
7. **Incremental Changes**: Make small, focused commits with clear messages

### Code Style
- Use TypeScript strict mode
- Prefer functional components with hooks
- Use Tailwind CSS for styling
- Follow existing naming conventions
- Add proper error handling for external APIs

### Map Integration
- Mapbox GL JS is the primary mapping library
- Token access: Direct environment variable access (no complex async initialization)
- Overlays: Implement with proper layer management and cleanup using REAL data sources (NASA FIRMS, NOAA, USDA, etc.)
- Base Maps: Use official Mapbox styles for consistency
- NO PLACEHOLDER DATA: All map layers must use real, functional data sources

## Deployment Notes
- **Frontend**: Deployed to Netlify (pulls from GitHub)
- **Backend**: Deployed to Render (pulls from GitHub)
- **Database**: Supabase (connection via environment variables)

## Common Issues & Solutions
1. **Map not loading**: Check Netlify environment variables
2. **Build failures**: Run `npm run typecheck` and fix TypeScript errors
3. **Database errors**: Check Supabase connection and table permissions

## Development Workflow
1. Make changes locally
2. Test with `npm run dev`
3. Run `npm run lint` and `npm run typecheck`
4. Commit and push to GitHub
5. Netlify auto-deploys from main branch

---
*This file provides context and instructions for Claude Code when working on this project.*