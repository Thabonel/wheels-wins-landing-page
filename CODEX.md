# Codex Instructions for Wheels & Wins

## Quick Start
- Dev server runs at `http://localhost:8080` (do not use 3000).
- Frontend stack: React 18.3, TypeScript, Vite 5.4, Tailwind 3.4, Supabase clients.
- Backend helpers: FastAPI services with Celery workers and Redis caches.

## Core Commands
```bash
npm run dev                 # Start Vite with Tailwind integrations
npm run build               # Production bundle for Netlify
npm run quality:check:full  # Type check, lint, unit + e2e suites
npm test                    # Vitest unit/integration runner
npm run lint                # ESLint using shared config
npm run type-check          # tsc --noEmit
```

## Git Safety Protocols
- Use scripts in `scripts/` for guarded Git actions:
  - `scripts/git-safe` for commits/recoveries.
  - `scripts/git-network-resilient` for pushes/pulls with retry logic.
  - `scripts/git-health-monitor` to inspect repo state before heavy work.
  - `scripts/git-script-auditor` to flag unsafe Git usage inside scripts.
- Keep generated audit artifacts (`.git/git-safe/`, `.git/git-script-auditor/`, `*.git-safe.backup`, `REPO_HEALTH_CHECK.md`) out of commits.
- If corruption occurs, run `scripts/git-safe recover` first, then `scripts/git-safe repair` (or `--nuclear` as last resort).

## Infrastructure & Environments
- Two mirrored systems share a single Supabase database:
  - **Production**: Netlify (`wheelsandwins.com`) ↔ Render (`pam-backend.onrender.com`), Redis, Celery worker & beat.
  - **Staging**: Netlify (`wheels-wins-staging.netlify.app`) ↔ Render (`wheels-wins-backend-staging.onrender.com`), staging Redis and worker.
  - Shared services: `wheels-wins-data-collector` plus Supabase/PostgreSQL.
- Always pair frontend with the matching backend; mismatches surface as JWT verification or JSON parse errors.

## Environment Configuration
### Frontend `.env`
```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_MAPBOX_TOKEN=...
VITE_GEMINI_API_KEY=...
VITE_API_BASE_URL=https://pam-backend.onrender.com        # staging URL in staging builds
```

### Backend `backend/.env`
```bash
DATABASE_URL=postgresql://...
SUPABASE_SERVICE_ROLE_KEY=...
GEMINI_API_KEY=...
ANTHROPIC_API_KEY=...           # Claude fallback
REDIS_URL=redis://...
TTS_ENABLED=true
```
- Update CORS origins in `backend/main.py` to include both production and staging URLs whenever domains change.

## PAM Assistant Notes
- Legacy duplication: four WebSocket helpers (`pamService.ts`, `usePamWebSocket.ts`, `usePamWebSocketConnection.ts`, `usePamWebSocketV2.ts`) and both `Pam.tsx` + `PamAssistant.tsx`; avoid adding new variants.
- WebSocket endpoint pattern: `wss://<backend>/api/v1/pam/ws/{userId}?token={jwt}`; ensure userId and token are supplied.
- Known regression triggers: switching environments without clearing cached tokens, missing JWT secrets alignment.

## Development Workflow & Quality Gates
1. Plan changes with `PLAN.md` and record key decisions in ADRs (`docs/decisions/`).
2. Define TypeScript types and tests up front; Vitest specs should accompany features (`*.test.tsx` / `*.spec.ts`).
3. Use parallel agents (`/double escape`) only after documenting coordination steps.
4. Run `npm run quality:check` before every commit; expect TypeScript strictness and security review for auth flows.
5. Update contextual docs (`cloud.md`, `ENVIRONMENT.md`) when architecture shifts occur.

## Testing & Tooling
- Coverage goals: 80%+ for new feature code, enforced via `npm run test:coverage` or `npm run test:integration:coverage`.
- Playwright suites live in `e2e/`; run `npm run e2e` locally and `npm run e2e:ci` for CI-parity HTML reports.
- Python automation lives in `backend/`, `pam-backend/`, and root scripts (`main.py`); validate with `pytest` when touched.
- Quick debug helpers: `npm run type-check`, `npm run quality:check:full`, and `cd backend && uvicorn app.main:app --reload --port 8000`.

## Common Pitfalls
- Accidentally running on port 3000—always use 8080.
- Forgetting the `VITE_` prefix for frontend env vars (values silently drop in build).
- Connecting staging frontend to production backend (JWT errors, 403s).
- Reintroducing mock data or disabling RLS protections; maintain production parity.
- Omitting mobile, accessibility, or dark-mode checks; follow the testing checklist in `CLAUDE.md` when validating UI.

## Key References
- `vite.config.ts` – bundle strategy and vendor chunking.
- `src/hooks/useUserSettings.ts` – critical settings sync logic.
- `backend/app/api/v1/pam.py` – PAM WebSocket implementation.
- `docs/pam-current-state-breakdown.md` and `PROJECT_CONTEXT.md` – deep architectural context.

---
Treat every change as production-facing: verify in staging, document decisions, and keep automation scripts aligned with these guidelines.
