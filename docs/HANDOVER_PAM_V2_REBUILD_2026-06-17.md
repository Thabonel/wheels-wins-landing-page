# Pam V2 Rebuild Handover — 2026-06-17

## Current State

- **Branch:** `pam-v2-rebuild`
- **Latest commit:** `714b8925` — `chore(staging): integrate latest origin/staging into pam-v2-rebuild`
- **Pushed to:** `origin/pam-v2-rebuild` at `714b8925`
- **Staging branch:** `origin/staging` not yet updated with V2 work

## What is Done

### PRD 00 — Staging Isolation and Recovery
- `pam-v2-rebuild` branch created.
- Isolated staging Supabase project `fxdixausvpzmytyxfqhv`.
- Render staging backend `wheels-wins-backend-staging.onrender.com` exists.
- Recovery tag `prod-recovery-2026-06-16` points at production baseline.

### PRD 01 — Contracts, Tests, and Evaluation Baseline
- `backend/app/models/schemas/pam_v2.py` and `src/types/pamV2.ts` define V2 contracts.
- `/api/v2/pam/health` mounted.
- 51 evaluation fixtures and contract tests added.

### PRD 02 — Canonical Tool Catalog and Policy
- V2 tools layer in `backend/app/services/pam_v2/tools/`.
- Initial read-only adapters: `load_profile`, `get_weather`, `list_calendar_events`, `optimize_route`, `find_campgrounds`.

### PRD 03 — Single-Agent Text Runtime
- Provider-neutral `ModelClient` protocol.
- `OpenAIResponsesClient` with safe error mapping.
- Bounded `PamV2Runtime` manager-agent loop.
- Streaming `POST /api/v2/pam/turn` endpoint.
- In-memory `IdempotencyGuard`.

### PRD 04 — Durable State, Memory, and Approvals
- Supabase-backed repositories for conversations, approvals, compact summaries.
- `ConversationRepository` integrated into runtime.
- `ApprovalService` with opaque tokens + SHA-256 hashes.
- `create_calendar_event` registered as first approved write tool.
- Migration applied to isolated staging Supabase.

### PRD 05 — Domain Tool Migration
- Machine-readable migration matrix for 96 V1 tools.
- Migrated money, travel, profile, and community namespaces (26 tools across 5 namespaces).

### PRD 06 — Frontend Replacement
- Pure reducer: `src/services/pamV2/pamV2Reducer.ts`.
- Typed SSE transport: `src/services/pamV2/pamV2Transport.ts`.
- Hook using `useAuth`: `src/services/pamV2/usePamV2Chat.ts`.
- Accessible chat shell: `src/components/PamV2.tsx`.
- Action registry: `src/services/pamV2/actions/PamActionRegistry.tsx`.
- 37 new unit/component tests (all passing).
- V2 UI wired behind `VITE_USE_PAM_2=true` in `src/components/Layout.tsx`.
- Default V2 text model updated to `gpt-5.4-mini` in docs.

### Helper Scripts
- `scripts/trigger-staging-deploy.mjs` — Render deploy trigger (needs `RENDER_API_KEY` + `RENDER_STAGING_SERVICE_ID`).
- `scripts/pam-v2-staging-smoke.mjs` — health + authenticated turn smoke test.

## What Just Happened

User asked to "push to git staging". To prepare for that, I merged `origin/staging` into `pam-v2-rebuild` and resolved conflicts in:
- `backend/app/services/pam/core/pam.py`
- `src/components/admin/observability/APIKeyManagement.tsx`
- `src/integrations/supabase/client.ts`

The merge also pulled in changes to `src/components/pam/SimplePAM.tsx` that imported from a V1 "skills" system. Because `pam-v2-rebuild` does not contain that skills system, I restored `SimplePAM.tsx` to its pre-merge V2-rebuild state (commit `7ad749ff`).

The merge brought in useful staging-only fixes:
- Escaped angle brackets in `APIKeyManagement.tsx` so staging builds.
- Supabase client uses `VITE_SUPABASE_ANON_KEY` correctly.
- Staging migration chunk fixes.

## Current Blockers

1. **Staging backend is still on the old build.**
   - `GET https://wheels-wins-backend-staging.onrender.com/api/v2/pam/health` returns `404`.
   - Need to deploy current `pam-v2-rebuild` to staging backend.

2. **Staging branch not updated yet.**
   - `origin/staging` still points at the pre-V2 staging branch.
   - Pushing `pam-v2-rebuild` to `origin/staging` will overwrite staging-specific commits (skills system, migration fixes).
   - The merge commit `714b8925` preserves the staging-critical build/config fixes but drops the V1 skills system.

3. **No Render/Netlify API tokens available in this environment.**
   - `RENDER_API_KEY` and `RENDER_STAGING_SERVICE_ID` are not set locally.
   - Cannot trigger deploys automatically from the CLI.

4. **No staging test credentials available.**
   - `STAGING_EMAIL`, `STAGING_PASSWORD`, `STAGING_SUPABASE_ANON_KEY` not set.
   - Cannot run the authenticated part of the smoke test yet.

## Recommended Next Steps

### Option A — Deploy via GitHub Actions (recommended)

1. Update `origin/staging` to point at the current `pam-v2-rebuild` HEAD.
   ```bash
   git push origin pam-v2-rebuild:staging --force-with-lease
   ```
   This triggers:
   - `.github/workflows/backend-staging-deploy.yml` (backend deploy to Render)
   - `.github/workflows/staging-deploy.yml` (frontend deploy to Netlify)

2. Wait for workflows to complete.

3. Set Render environment variables on `wheels-wins-backend-staging`:
   - `PAM_V2_ENABLED=true`
   - `PAM_V2_PROVIDER=openai`
   - `PAM_V2_MODEL=gpt-5.4-mini`
   - `OPENAI_API_KEY=<key>`

4. Set Netlify/Vite build environment variable on staging frontend:
   - `VITE_USE_PAM_2=true`

5. Redeploy after env vars are set.

6. Run smoke test:
   ```bash
   STAGING_EMAIL=... STAGING_PASSWORD=... STAGING_SUPABASE_ANON_KEY=... \
     node scripts/pam-v2-staging-smoke.mjs
   ```

### Option B — Manual Deploy via Dashboard

1. Render dashboard → `wheels-wins-backend-staging` → Manual Deploy → latest `pam-v2-rebuild`.
2. Set backend env vars as above.
3. Netlify dashboard → `wheels-wins-staging` → deploy latest `pam-v2-rebuild` with `VITE_USE_PAM_2=true`.
4. Run smoke test.

## Verification Commands

```bash
# Unauthenticated health check
curl https://wheels-wins-backend-staging.onrender.com/api/v2/pam/health

# Authenticated smoke
STAGING_EMAIL=... STAGING_PASSWORD=... STAGING_SUPABASE_ANON_KEY=... \
  node scripts/pam-v2-staging-smoke.mjs

# Local tests
npm run type-check
npm test -- src/services/pamV2 src/components/__tests__/PamV2.test.tsx
npm run build:staging
```

## Key Decisions to Preserve

- V2 runtime is provider-neutral; OpenAI Responses API is the first adapter.
- V2 text model default is `gpt-5.4-mini`, not `gpt-4o-mini`.
- Approval tokens are opaque, SHA-256 hashed server-side, and never logged in the browser.
- V2 frontend uses SSE to `/api/v2/pam/turn`; no WebSocket, no browser provider keys.
- V1 frontend/voice remain untouched on this branch until PRD 08.
- Voice is out of scope until PRD 07, after text V2 is validated on staging.

## Risks / Watchouts

- Force-pushing `pam-v2-rebuild` to `origin/staging` will drop the V1 skills system that exists on the current staging branch. This is intentional for the rebuild, but confirm with owner if staging users rely on those features.
- Staging Supabase migration `supabase/migrations/20260616000000_create_pam_v2_state.sql` must already be applied before the backend deploy.
- `backend/requirements.txt` pins `openai>=2.15.0`; `backend/constraints.txt` still pins `openai==1.35.3`. Reconcile before production.
- The current branch has many untracked files (docs, images, scripts, migration chunks). These are not part of the V2 rebuild and should not be committed unless intentional.

## Open Work

- PRD 07 — Realtime Voice Replacement (deferred until text V2 is validated on staging).
- PRD 08 — Staging Hardening and Cutover (requires staging text validation first).
- Reconcile `openai` version pinning between `requirements.txt` and `constraints.txt`.
- Add Playwright E2E tests for V2 text journeys.
- Run backend test suite and address any new failures after the staging merge.
