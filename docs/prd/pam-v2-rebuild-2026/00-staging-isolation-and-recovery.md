# PRD — Pam V2 Staging Isolation and Recovery

## 1) Context & Goals

Pam will be rebuilt aggressively on staging while production remains unchanged and can restore the application code if staging fails. The current repository instructions state that both environments share Supabase, so code rollback alone is insufficient.

This PRD is for the repository owner and any coding agent preparing the rebuild environment.

Why now: every later PRD assumes staging experimentation cannot corrupt production users, records, authentication, or schema.

**Execution budget:** one focused AI context, normally 3-5 implementation slices. Stop after a passing commit if the context is running low.

### In-scope goals

- Prove frontend, backend, Redis, worker, secrets, and database environment pairings.
- Preferably move staging to a separate Supabase project.
- Add automated environment-isolation validation without logging secrets.
- Establish V2 feature flags disabled in production and enabled only deliberately in staging.
- Record the exact production recovery commit and test restoration procedure.
- Establish designated staging test accounts and mutation boundaries.

### Out-of-scope / Non-goals

- No Pam behavior or model changes.
- No V2 endpoints or tool implementations.
- No destructive database migration.
- No production deployment.
- No copying real production personal data into staging.

## 2) Current State (Repo-informed)

- `netlify.toml` has production, staging, and deploy-preview backend URLs.
- `render.yaml` defines the production-named backend and Celery worker; actual staging service configuration may live in Render rather than this file.
- `CODEX.md` says staging and production have separate Netlify, Render, Redis, worker, and beat services but share Supabase/PostgreSQL.
- `ENVIRONMENT.md` documents staging and production environment files but may contain stale names.
- The root `Dockerfile` installs `backend/requirements.txt` and starts `backend/app/main.py` through Uvicorn.
- V1 feature flags live in `backend/app/core/feature_flags.py`.

Likely changes:

- `scripts/verify-pam-environment-isolation.mjs` or an equivalent existing environment-validation script.
- `src`/backend configuration modules only where needed to expose non-secret environment identity.
- `backend/app/core/feature_flags.py` or a new V2 settings module.
- `ENVIRONMENT.md`, `docs/deployment/`, and CI configuration.

**ASSUMPTION:** The owner can create or configure a separate staging Supabase project. Verify through the Supabase project reference in staging and production URLs. If this is impossible, record that decision and enforce the restricted shared-database mode below.

Risks:

- Environment files may be stale relative to Netlify/Render dashboards.
- A staging worker could process production rows because the database is shared.
- OAuth redirect configuration may still point to production.
- A database copy may contain personal data and require sanitization.

## 3) User Stories (Few, sharp)

- As the owner, I want staging isolated so that an experimental Pam cannot modify production users or data.
- As a coding agent, I want a deterministic isolation check so that I cannot accidentally deploy against mixed environments.
- As the owner, I want a tested restoration procedure so that staging can be reset to the production code baseline quickly.
- As an operator, I want environment identity visible in health output without exposing secrets.

## 4) Success Criteria (Verifiable)

- [ ] A machine-readable check reports the frontend API URL, backend environment name, Supabase project reference, and Redis host identity with secrets redacted.
- [ ] The check fails non-zero when staging frontend points to production backend or vice versa.
- [ ] The check fails when staging and production Supabase project references match, unless `ALLOW_SHARED_STAGING_DATABASE=true` is explicitly set.
- [ ] Preferred mode: staging uses a separate Supabase project and sanitized/test-only data.
- [ ] Restricted fallback mode: all later database migrations are prohibited and staging tools are limited to designated test-user IDs.
- [ ] Staging background workers cannot consume production queues or unrestricted production rows.
- [ ] `PAM_V2_ENABLED=false` is the production default.
- [ ] Staging can enable V2 without changing production configuration.
- [ ] The production recovery source is recorded as a branch and immutable commit SHA or tag.
- [ ] A staging reset drill restores that commit and passes health checks.
- [ ] No secret values appear in console output, generated reports, or committed files.
- [ ] Documentation clearly states that code restore does not restore database state.

## 5) Test Plan (Design BEFORE build)

Create tests before the validation implementation.

| Test | Type | Expected result |
| --- | --- | --- |
| Matching staging/production backend URL | Unit | Validator fails |
| Matching Supabase refs without override | Unit | Validator fails |
| Matching Supabase refs with explicit restricted override | Unit | Validator warns and succeeds only in restricted mode |
| Distinct fully paired environments | Unit | Validator succeeds |
| Missing required environment identity | Unit | Validator fails with variable name, not secret |
| Secret redaction | Unit | Output contains only host/project identifiers |
| Staging health smoke | Integration | Frontend/backend environment identities agree |
| Recovery drill | Manual deterministic smoke | Staging deploys recorded production commit and health checks pass |

Mock environment variables in unit tests. Do not call Netlify, Render, or Supabase from unit tests. The integration smoke may call staging health endpoints but must not mutate data.

Test fixtures must use fake URLs, project references, and credentials.

## 6) Implementation Plan (Small slices)

1. **Document the observed environment map.**
   - Tests first: add fixture cases for valid and invalid environment pairings.
   - Implement only the parser and report data structure.
   - Run: `npm test -- --run <new-test-file>` and `npm run type-check`.
   - Expected: fixture tests pass; no real environment required.
   - Commit: `test(pam-v2): define staging isolation cases`.
2. **Implement the isolation command.**
   - Tests first: add redaction and non-zero exit tests.
   - Add an npm script such as `pam:v2:verify-isolation`.
   - Run targeted tests, then the command with a synthetic fixture.
   - Expected: clear PASS/FAIL table with no secrets.
   - Commit: `feat(pam-v2): add environment isolation validator`.
3. **Add V2 environment settings.**
   - Tests first: verify production defaults off and staging requires explicit enablement.
   - Add `PAM_V2_ENABLED`, `PAM_V2_MODEL`, and environment identity settings centrally; do not wire a runtime yet.
   - Run backend settings tests and Python compilation.
   - Expected: production-safe defaults.
   - Commit: `feat(pam-v2): add production-safe v2 settings`.
4. **Isolate Supabase and workers.**
   - External configuration: create/use a separate staging project, Redis, and queues. Apply only baseline schema needed for existing staging login and application smoke tests.
   - If separate Supabase is not available, implement restricted mode that rejects non-test user IDs at the future V2 boundary and blocks migration commands.
   - Run isolation command against actual staging and production identities.
   - Expected: distinct projects or an explicit restricted-mode warning.
   - Commit documentation/config templates only; never commit secrets.
5. **Exercise recovery.**
   - Record production branch and immutable SHA/tag.
   - Deploy that SHA to staging, run frontend/backend health and login smoke tests, then return staging to the rebuild branch.
   - Expected: both transitions are documented and successful.
   - Commit: `docs(pam-v2): document staging recovery drill`.

## 7) Git Workflow Rules (Enforced)

- Suggested branch: `codex/pam-v2-rebuild` or a dedicated `pam-v2-rebuild` staging branch.
- Do not commit directly to the production deployment branch.
- Commit after every significant slice using Conventional Commits.
- After each slice, run targeted tests and `npm run type-check` where TypeScript changed.
- After every 3-5 slices, run `npm run quality:check`.
- If a previous environment or auth behavior breaks, fix or revert before continuing.
- Do not use destructive Git commands. Record the recovery SHA; do not reset production.

## 8) Commands (Repo-specific)

```bash
npm install
npm test
npm run type-check
npm run lint
npm run build:staging
npm run test:staging
npm run dev -- --host 127.0.0.1 --port 8080
cd backend && python -m pytest
cd backend && python -m compileall app
```

Use `npm run pam:v2:verify-isolation` after that script is added. Discover the deployed backend dependency source from the root `Dockerfile`; it currently installs `backend/requirements.txt`.

## 9) Observability / Logging (If applicable)

Add a safe environment identity block to a protected or non-sensitive health response:

- Application environment: staging/production/development.
- Release commit SHA.
- API/runtime version.
- Supabase project reference or irreversible short hash, never keys.
- Redis/queue environment label, never credentials.
- `pam_v2_enabled` boolean.

Verify that logs and health output contain no tokens, database passwords, service keys, or full connection strings.

## 10) Rollout / Migration Plan (If applicable)

Apply configuration to staging only. Production retains `PAM_V2_ENABLED=false` and its current branch. Before later PRDs, capture screenshots or command output proving environment separation.

Rollback: redeploy staging from the recorded production commit. If any shared-database mutation occurred, code rollback is insufficient; stop and restore affected data from a verified backup or reverse migration.

## 11) Agent Notes (Leave space for recursion)

## Agent Notes — Session Log

- 2026-06-16: Separate staging Supabase project created (`fxdixausvpzmytyxfqhv`) and migration chunks applied successfully.
- 2026-06-16: Render staging backend `wheels-wins-backend-staging` deployed and healthy.
- 2026-06-16: Isolation validator `scripts/verify-pam-environment-isolation.mjs` verified PASS against repo config files.
- 2026-06-16: Added `PAM_V2_ENABLED`, `PAM_V2_PROVIDER`, `PAM_V2_MODEL` to `FeatureFlags` and `EnvironmentConfig`.
- 2026-06-16: Added npm script `pam:v2:verify-isolation` to `package.json`.
- 2026-06-16: Production recovery baseline recorded as tag `prod-recovery-2026-06-16` → SHA `6b91f7ad49bdd6f9995807249702150fa1d8c087`.

## Agent Notes — Decisions

- Keep provider-neutral V2 runtime: support both OpenAI Responses API and Anthropic-compatible (Kimi) adapters, selected by `PAM_V2_PROVIDER`.
- Voice will use simplest option first (OpenAI Realtime API with backend ephemeral credentials), defer self-hosted near-realtime solution until after launch.
- Complete PRD 00 before starting PRD 01.

## Agent Notes — Open Questions

- None remaining for PRD 00.

## Agent Notes — Regression Checklist

- [x] Isolation validator fixture suite
- [x] Staging frontend/backend pairing
- [x] Supabase project separation or restricted-mode enforcement
- [ ] Worker/queue separation (validated via Render dashboard, not yet via validator)
- [x] Login and health smoke (Render staging healthy)
- [ ] Recovery drill (tag recorded; actual deploy-and-restore drill pending owner decision)

