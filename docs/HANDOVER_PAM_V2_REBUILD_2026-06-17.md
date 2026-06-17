# Pam V2 Rebuild Handover — 2026-06-17

## Current State

- **Branch:** `pam-v2-rebuild`
- **Cleanup status:** local branch has been reconciled with `origin/pam-v2-rebuild` and merged with current `origin/staging`.
- **Staging branch:** not updated yet. Do not force-push this branch to staging without a final owner check.
- **Untracked artifact cleanup:** pre-cleanup untracked files were preserved in `stash@{0}` as `cleanup: untracked artifacts before pam-v2 recovery`.

This handover supersedes the earlier pasted handover that incorrectly said `714b8925` was the latest pushed commit and recommended an immediate force push to `staging`.

## What Is Done

### PRD 00 — Staging Isolation and Recovery
- `pam-v2-rebuild` branch exists.
- Isolated staging Supabase project reference recorded as `fxdixausvpzmytyxfqhv`.
- Render staging backend `wheels-wins-backend-staging.onrender.com` exists.
- Recovery tag `prod-recovery-2026-06-16` points at production baseline `6b91f7ad49bdd6f9995807249702150fa1d8c087`.
- Recovery drill is still not fully exercised.

### PRD 01 — Contracts, Tests, and Evaluation Baseline
- `backend/app/models/schemas/pam_v2.py` and `src/types/pamV2.ts` define V2 contracts.
- `/api/v2/pam/health` is mounted in the V2 backend code.
- Evaluation fixtures and Pam V2 contract tests exist.

### PRD 02 — Canonical Tool Catalog and Policy
- V2 tools layer exists in `backend/app/services/pam_v2/tools/`.
- Read and approved-write tools are routed through the V2 catalog, policy, and executor.

### PRD 03 — Single-Agent Text Runtime
- Provider-neutral model protocol exists.
- OpenAI Responses adapter exists.
- Bounded `PamV2Runtime` manager-agent loop exists.
- Streaming `POST /api/v2/pam/turn` endpoint exists.
- Idempotency guard exists.

### PRD 04 — Durable State, Memory, and Approvals
- Supabase-backed repository code exists.
- Approval service with opaque tokens and hashed storage exists.
- Approved calendar creation exists as the first write-path example.
- Staging database state must be verified before deploy.

### PRD 05 — Domain Tool Migration
- Tool migration matrix exists under `docs/pam/`.
- Money, travel, profile, and community adapters exist in V2.

### PRD 06 — Frontend Replacement
- Reducer: `src/services/pamV2/pamV2Reducer.ts`.
- SSE transport: `src/services/pamV2/pamV2Transport.ts`.
- Hook: `src/services/pamV2/usePamV2Chat.ts`.
- UI shell: `src/components/PamV2.tsx`.
- Action registry: `src/services/pamV2/actions/PamActionRegistry.tsx`.
- V2 routing uses `VITE_USE_PAM_2=true` in `src/components/Layout.tsx`.
- Staging build config now sets `VITE_USE_PAM_2=true` in:
  - `.github/workflows/staging-deploy.yml`
  - `netlify.toml` staging and branch-deploy contexts
  - `.env.staging.example`

## Verification Completed During Cleanup

```bash
npm run type-check
npm test -- src/services/pamV2 src/components/__tests__/PamV2.test.tsx
npm run build:staging
cd backend && python -m pytest tests/pam_v2 -q
```

Results:
- TypeScript passed.
- Pam V2 frontend tests passed: 37/37.
- Staging build passed.
- Pam V2 backend tests passed: 124/124.
- Backend tests emitted warnings for coverage parsing and fake-model close coroutine cleanup; no Pam V2 test failed.

## Important Corrections

- `714b8925` was not a real merge of `origin/staging`; it had only one parent. The branch has now been merged with `origin/staging` for real.
- The earlier handover claimed `714b8925` had been pushed to `origin/pam-v2-rebuild`; that was false. The remote branch previously pointed at `7ad749ff`.
- Do not use the old `git push origin pam-v2-rebuild:staging --force-with-lease` instruction as the default path.
- Staging deploys require both backend flags and frontend `VITE_USE_PAM_2=true`. The frontend flag was missing from the GitHub Actions staging workflow before cleanup.

## Current Blockers

1. **Staging backend likely still needs redeploy.**
   - Verify `https://wheels-wins-backend-staging.onrender.com/api/v2/pam/health` after pushing/deploying.

2. **Backend staging env vars must be set in Render.**
   - `PAM_V2_ENABLED=true`
   - `PAM_V2_PROVIDER=openai`
   - `PAM_V2_MODEL=gpt-5.4-mini`
   - `OPENAI_API_KEY=<staging key>`

3. **Staging database state must be confirmed.**
   - `supabase/migrations/20260616000000_create_pam_v2_state.sql` must be applied to the isolated staging Supabase project.
   - Staging baseline chunks and V1 skills migration are preserved from current `origin/staging`.

4. **Authenticated smoke test still needs credentials.**
   - `STAGING_EMAIL`
   - `STAGING_PASSWORD`
   - `STAGING_SUPABASE_ANON_KEY`

## Recommended Next Steps

1. Push `pam-v2-rebuild` to `origin/pam-v2-rebuild` normally.
   ```bash
   git push origin pam-v2-rebuild
   ```

2. Open a PR from `pam-v2-rebuild` into `staging`, or have the owner explicitly approve a direct staging update after reviewing this branch.

3. Confirm GitHub Actions staging build uses `VITE_USE_PAM_2=true`.

4. Confirm Render staging backend environment variables and redeploy.

5. Run smoke tests:
   ```bash
   curl https://wheels-wins-backend-staging.onrender.com/api/v2/pam/health
   STAGING_EMAIL=... STAGING_PASSWORD=... STAGING_SUPABASE_ANON_KEY=... \
     node scripts/pam-v2-staging-smoke.mjs
   ```

## Open Work

- Verify staging database migrations against `fxdixausvpzmytyxfqhv`.
- Run browser-based V2 text journey on staging.
- Add Playwright E2E coverage for V2 text journeys.
- Reconcile `backend/requirements.txt` (`openai>=2.15.0`) with `backend/constraints.txt` (`openai==1.35.3`) before production.
- PRD 07 voice remains deferred until text V2 is validated on staging.
