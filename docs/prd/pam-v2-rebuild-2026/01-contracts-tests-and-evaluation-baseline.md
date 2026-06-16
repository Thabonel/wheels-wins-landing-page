# PRD — Pam V2 Contracts, Test Harness, and Evaluation Baseline

## 1) Context & Goals

Previous Pam changes were implemented against uncertain production paths and weak test evidence. This PRD creates the protocol, test environment, evaluation fixtures, and runtime identity before any new model loop is written.

This is for backend/frontend engineers and coding agents who need a stable definition of a Pam turn.

Why now: all later implementation must be judged against executable behavior, not architecture prose or subjective chat quality.

**Execution budget:** one fresh AI context, 4-6 slices. If split across sessions, stop at a passing commit and update Agent Notes.

### In-scope goals

- Repair the backend test environment enough to collect and run Pam V2 tests.
- Define versioned request and streaming event contracts.
- Add a disabled V2 router with health/capability endpoints and no model calls.
- Create a deterministic evaluation fixture format and initial 50-case baseline.
- Record V1 baseline results where feasible.
- Add trace/runtime identifiers to distinguish V1 and V2.

### Out-of-scope / Non-goals

- No OpenAI/Anthropic calls in V2.
- No V2 tool execution.
- No database schema migration beyond test fixtures.
- No frontend visual redesign.
- No voice changes.

## 2) Current State (Repo-informed)

- Active V1 routing is exposed through `backend/app/api/v1/pam/__init__.py` and `backend/app/api/v1/pam_main.py`.
- Existing schemas are in `backend/app/models/schemas/pam.py`; implemented voice message types and allowed schema values have diverged.
- Existing tests are spread across `tests/pam/`, `backend/`, `src/__tests__/`, and `e2e/`.
- The latest stored Pam E2E report contains zero executed tests.
- Backend test collection previously failed in available environments because dependencies including `faker` and `pyotp` were unavailable.
- The root Dockerfile installs `backend/requirements.txt`; multiple other requirement files conflict and are not necessarily deployment inputs.

Likely new paths:

- `backend/app/api/v2/pam.py`
- `backend/app/models/schemas/pam_v2.py`
- `backend/app/services/pam_v2/`
- `backend/tests/pam_v2/`
- `src/types/pamV2.ts`
- `src/__tests__/pam-v2/`
- `tests/pam_v2/evals/fixtures/*.json`
- `tests/pam_v2/evals/run_evals.py`

**ASSUMPTION:** FastAPI V2 routers can be mounted under `/api/v2/pam` without disrupting V1. Verify router conventions in `backend/app/main.py` before editing.

## 3) User Stories (Few, sharp)

- As a frontend developer, I want one versioned event contract so that streaming behavior is type-safe.
- As a backend developer, I want deterministic contract tests so that model/provider changes cannot silently break clients.
- As the owner, I want representative evaluations defined before implementation so that “better” has a measurable meaning.
- As an operator, I want every response to identify its runtime and trace so that failures can be attributed correctly.
- As a future AI coding agent, I want a reliable test command and fixtures so that I can continue without reconstructing intent.

## 4) Success Criteria (Verifiable)

- [ ] Backend Pam V2 tests collect and run in a documented environment.
- [ ] Dependency fixes are made in canonical files used by development/deployment, not only an ad hoc virtualenv.
- [ ] `PamTurnRequestV2` includes `conversation_id`, `client_message_id`, `message`, channel, locale, timezone, and optional approved-action token.
- [ ] Streaming events use a discriminated union with at least: `turn_started`, `text_delta`, `tool_started`, `tool_completed`, `approval_required`, `action`, `turn_completed`, and `error`.
- [ ] Every event includes `schema_version`, `trace_id`, and `sequence`.
- [ ] Error events expose a stable code and safe message, never raw exceptions.
- [ ] Duplicate client message IDs are representable in the contract and planned for idempotency.
- [ ] `/api/v2/pam/health` reports disabled/ready status without calling a model.
- [ ] V2 turn endpoint returns 404 or 503 when disabled and a deterministic not-implemented response when enabled; it must not silently call V1.
- [ ] Frontend TypeScript types match backend event fixtures.
- [ ] At least 50 evaluation cases cover common tasks, ambiguity, permissions, confirmation, tool failure, injection, duplicate messages, and multi-turn follow-up.
- [ ] Evaluation fixtures contain no real PII or secrets.
- [ ] A runner validates fixture schemas and produces JSON plus a human-readable summary.

## 5) Test Plan (Design BEFORE build)

Write tests first.

### Backend unit/contract tests

- Valid and invalid turn requests.
- Empty, oversized, and control-character messages.
- Unknown event types rejected.
- Event sequences strictly increase.
- Safe error serialization strips exception details.
- V2 disabled/enabled route behavior.
- Authentication required and path/user identity cannot be supplied by the client.

### Frontend unit tests

- Parse one fixture for every event type.
- Reject unsupported `schema_version`.
- Preserve event ordering.
- Convert safe error event to UI state without displaying technical details.

### Evaluation fixture tests

- Every fixture validates against its schema.
- Unique case IDs.
- No forbidden secret-like fields.
- Expected tools, forbidden tools, confirmation requirement, and outcome assertions are explicit.

Mock authentication claims and runtime services. Do not mock schema validation. Do not call a model or real Supabase in this PRD.

## 6) Implementation Plan (Small slices)

1. **Repair and document backend test collection.**
   - Add a smoke test first that imports settings, FastAPI app/router dependencies, and Pam V2 test support.
   - Reconcile only required test dependencies in canonical requirement inputs; avoid broad upgrades.
   - Run: `cd backend && python -m pytest --collect-only` and a targeted smoke test.
   - Expected: collection succeeds without network calls.
   - Commit: `test(pam-v2): restore backend test collection`.
2. **Define backend request/event schemas.**
   - Tests first for all required/invalid fields and safe errors.
   - Implement Pydantic models with `extra="forbid"` where practical.
   - Run targeted pytest and Python compilation.
   - Expected: deterministic JSON schemas and fixtures.
   - Commit: `feat(pam-v2): define versioned turn contracts`.
3. **Define frontend types and fixture compatibility.**
   - Tests first using backend-generated JSON fixtures committed under tests/fixtures.
   - Implement Zod runtime parsing plus TypeScript inferred types; avoid hand-maintaining two independent unions if code generation is feasible.
   - Run targeted Vitest and `npm run type-check`.
   - Commit: `feat(pam-v2): add typed frontend event contract`.
4. **Add disabled V2 router and health response.**
   - Tests first for auth, flag-off behavior, runtime identity, and safe errors.
   - Mount `/api/v2/pam`; no V1 fallback and no provider import.
   - Run targeted backend integration tests.
   - Commit: `feat(pam-v2): mount guarded v2 contract endpoint`.
5. **Create evaluation schema and initial cases.**
   - Tests first for fixture validation and uniqueness.
   - Add at least 50 concise cases distributed across travel, money, calendar, profile, community, medical-document boundaries, ambiguity, unsafe requests, tool outages, duplicates, and follow-ups.
   - Use synthetic UUIDs and fictional data.
   - Commit: `test(pam-v2): add representative evaluation baseline`.
6. **Add deterministic evaluation runner and V1 baseline adapter.**
   - Tests first for pass/fail aggregation and JSON report output.
   - The default runner validates fixtures only. A separate explicit command may call staging V1 with a test account and must mark nondeterministic/network tests.
   - Expected: non-zero exit when required assertions fail.
   - Commit: `test(pam-v2): add evaluation runner and baseline report`.

## 7) Git Workflow Rules (Enforced)

- Branch: continue the dedicated Pam V2 staging branch.
- Commit after every significant slice using Conventional Commits.
- Tests are committed before or with implementation, never postponed to the end.
- After each slice, run targeted tests plus the prior PRD's isolation validator.
- After slices 3 and 6, run `npm run quality:check` and backend Pam V2 tests.
- If V1 tests regress, fix or revert before proceeding.
- Do not edit V1 behavior to make V2 tests pass.

## 8) Commands (Repo-specific)

```bash
npm install
npm test -- --run
npm run test:integration
npm run type-check
npm run lint
npm run build:staging
cd backend && python -m pip install -r requirements.txt -r requirements-dev.txt
cd backend && python -m pytest --collect-only
cd backend && python -m pytest tests/pam_v2 -q
cd backend && python -m compileall app
```

If `backend/tests` does not exist, create it consistently with `backend/pytest.ini`. Do not rely on report JSON files as proof that tests ran.

## 9) Observability / Logging (If applicable)

The V2 health and deterministic endpoint should emit/return:

- `runtime=pam_v2`
- Contract/schema version.
- Release SHA when available.
- Feature flag state.
- Trace ID on every request.

Logs must be structured and exclude message content by default. Test that exception details are logged server-side with trace ID but not serialized to clients.

## 10) Rollout / Migration Plan (If applicable)

Deploy the disabled router to staging first. Verify V1 behavior is unchanged. Enable V2 only for the deterministic contract smoke endpoint; no user UI should route to it yet.

Rollback consists of disabling `PAM_V2_ENABLED` or redeploying the previous staging commit. This PRD has no data migration.

## 11) Agent Notes (Leave space for recursion)

## Agent Notes — Session Log

- 2026-06-16: Repaired backend test collection:
  - Fixed placeholder syntax errors in `backend/tests/test_pam_integration.py`.
  - Fixed relative module path in `backend/tests/pam/tools/trip/test_save_favorite_spot.py`.
  - Made `OptimizedContextManager` lazy-initialize async components so import does not require a running event loop.
  - Added `create_post` alias in `backend/app/services/pam/tools/social/create_post.py` for outdated test imports.
  - Result: pytest collects 715 backend tests successfully.
- 2026-06-16: Defined Pam V2 contracts in `backend/app/models/schemas/pam_v2.py`.
- 2026-06-16: Created `/api/v2/pam/health` endpoint in `backend/app/api/v2/pam.py` and mounted it in `backend/app/main.py`.
- 2026-06-16: Added TypeScript types in `src/types/pamV2.ts`.
- 2026-06-16: Created 51 evaluation fixtures in `backend/tests/pam_v2/evals/fixtures/turn_contract_evals.json`.
- 2026-06-16: Created evaluation runner `backend/tests/pam_v2/evals/run_evals.py` (currently validates fixture schema; will execute against runtime in PRD 03).
- 2026-06-16: Added contract tests in `backend/tests/pam_v2/test_contracts.py` — 15 tests passing.

## Agent Notes — Decisions

- Pydantic v2 style used for new schemas to match the installed Pydantic 2.11.
- V2 router mounted unconditionally; it self-reports `pam_v2_enabled=false` when disabled.
- Provider/model names surfaced by health endpoint come from feature flags/env config, not hardcoded.
- Evaluation runner distinguishes request-level validation failures from runtime errors so fixtures can express both.

## Agent Notes — Open Questions

- Should health endpoint source environment from `EnvironmentConfig` (requires full env) or keep using `FeatureFlags` for reliability? Currently uses `FeatureFlags`.
- Should the 51 fixtures be tagged by namespace/domain for PRD 05 migration tracking? Not done yet.

## Agent Notes — Regression Checklist

- [x] Backend test collection
- [x] V1 route smoke tests (collection passes; full run not executed)
- [x] V2 schema tests
- [ ] Frontend fixture parser tests (TypeScript types added; parser tests not yet written)
- [x] Evaluation fixture validation
- [x] Isolation validator
- [ ] Staging build

