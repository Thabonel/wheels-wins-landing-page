# Repository Guidelines

Codex operators should pair this guide with [CODEX.md](CODEX.md) for tooling-specific cautions.

## Project Structure & Module Organization
- React + TypeScript code lives in `src/`; feature folders sit in `components/`, `pages/`, `stores/`, with shared helpers in `lib/` and `hooks/`.
- Python automation spans `backend/`, `pam-backend/`, and root scripts such as `main.py`; assets live in `public/` and `assets/`, configs in `config/`, `netlify/`, and `supabase/`.
- Tests are split across `src/__tests__/` (unit), `tests/` (integration), and `e2e/` (Playwright journeys).

## Build, Test, and Development Commands
- `npm install` prepares dependencies; `npm run dev` starts Vite locally.
- `npm run build` creates the optimized bundle; confirm output with `npm run preview`.
- Quick feedback: `npm run test`, `npm run lint`, `npm run type-check`; bundle checks with `npm run quality:check` or `npm run quality:check:full`.
- E2E coverage runs via `npm run e2e` locally or `npm run e2e:ci` to mirror CI.
- Agent scripts bootstrap with `npm run agents:init` and health-check through `npm run ai:status`.

## Coding Style & Naming Conventions
- Prettier defaults apply (two-space indentation, trailing semicolons, double quotes); run `npm run lint:fix` to resolve issues.
- Components are PascalCase (`TripPlannerPanel.tsx`), hooks camelCase prefixed with `use`, and providers live in `contexts/`.
- Share types in `types/` with explicit interfaces, and keep Python helpers PEP 8 compliant with snake_case names.

## Testing Guidelines
- Co-locate unit specs with `*.test.tsx` or `*.spec.ts` filenames.
- Integration suites live in `tests/` and leverage `scripts/test-sentry.js` when relevant.
- Use `npm run test:coverage` or `npm run test:integration:coverage` to watch coverage targets.
- Keep Playwright journeys in `e2e/`, favour resilient selectors, and run them with `npm run e2e`.
- For Python automation, extend the nearest `test_*.py` and validate via `pytest`.

## Commit & Pull Request Guidelines
- Adopt Conventional Commits (`feat:`, `fix:`, `chore:`); e.g., `feat: add itinerary budget panel`.
- Each commit should build cleanly and pass `npm run quality:check` before pushing.
- Pull requests include a short summary, linked issue, verification notes, and UI evidence when behaviour changes; clear lint, test, and `npm run security:audit` noise first.

## Agent & Automation Notes
Automation scripts live under `scripts/` and expect Node 18 (`nvm use`) plus Python 3.11 for speech tooling. Regenerate AI documentation via `npm run ai:docs`, and orchestrate multi-agent tasks with `npm run ai:all` when validating voice workflows. Store API keys in `.env.local`, follow the patterns in `ENVIRONMENT.md`, and run `npm run check-main` before merging.
