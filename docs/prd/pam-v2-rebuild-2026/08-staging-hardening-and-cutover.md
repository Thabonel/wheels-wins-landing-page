# PRD — Pam V2 Staging Hardening and Cutover

## 1) Context & Goals

Pam V2 is implemented on staging across text, tools, state, frontend, and voice. This PRD proves it as a coherent product, removes obsolete Pam paths from the rebuild branch, and creates a production promotion package. Production itself is not changed without an explicit owner decision.

This is for the repository owner, QA/security engineers, and coding agents completing the rebuild.

Why now: legacy deletion is where simplification becomes real, but deletion must follow complete staging evidence and a tested recovery path.

**Execution budget:** multiple fresh contexts. Run audit, hardening, deletion, and final verification as separate passing commits.

### In-scope goals

- Execute full functional, security, reliability, accessibility, performance, and cost validation on staging.
- Exercise rollback to the production code baseline and back to the V2 candidate.
- Remove obsolete V1 orchestrators, registries, transports, provider clients, feature flags, dependencies, routes, and documentation from the rebuild branch.
- Confirm one active Pam architecture remains.
- Produce a release/promotion checklist and known-risk report.

### Out-of-scope / Non-goals

- No production deployment without explicit owner instruction.
- No new Pam capabilities.
- No prompt/model experimentation unrelated to failing acceptance criteria.
- No unrelated repository-wide refactor.
- No destructive production database changes.

## 2) Current State (Repo-informed)

- V1 includes large API/core/orchestrator/tool/voice/frontend surfaces and several disabled experimental paths.
- PRD 05 produced a machine-readable tool disposition/deletion manifest.
- PRDs 06-07 leave V1 frontend/voice available for rollback during staging development.
- Existing E2E reports are not reliable evidence unless the runner proves tests executed.
- Production code remains the recovery source; staging and production data isolation was addressed in PRD 00.

Likely deletion candidates, subject to import/traffic/test proof:

- Redundant enhanced/legacy/LangGraph/multi-agent/proactive runtime paths.
- Duplicate V1 tool schema/registry/prefilter ownership.
- Direct browser Claude/Gemini provider clients.
- V1 text WebSocket service/hooks replaced by V2.
- Hybrid Claude/OpenAI voice bridge and deprecated voice helpers.
- Stale feature flags, startup initialization, dependencies, environment variables, and docs.

**ASSUMPTION:** The owner wants the staging rebuild branch to become the future production candidate, while the existing production branch/tag remains untouched as rollback. Confirm branch/deployment mapping before deletion.

## 3) User Stories (Few, sharp)

- As the owner, I want objective evidence that V2 works before considering production promotion.
- As a user, I want core Pam tasks reliable across text and voice with safe approvals.
- As an operator, I want one runtime and useful diagnostics instead of several ambiguous systems.
- As a maintainer, I want obsolete code and dependencies removed so future agents cannot revive the wrong path.
- As the owner, I want a practiced rollback procedure and a clear list of residual risks.

## 4) Success Criteria (Verifiable)

- [ ] All required evaluation cases pass their deterministic assertions; model-quality thresholds are documented and met.
- [ ] Mutation authorization and approval compliance is 100%; duplicate/unauthorized mutations are zero.
- [ ] Full Pam V2 backend, frontend, integration, E2E, accessibility, and voice suites execute non-zero test counts and pass.
- [ ] Core staging journeys pass on desktop and supported mobile browsers.
- [ ] P50/P95 text and voice latency, error rate, reconnect rate, and cost per successful task are measured against written limits.
- [ ] Failure injection covers provider timeout, tool timeout, database outage, Redis outage, dropped stream, duplicate request, and expired auth.
- [ ] Client responses expose no raw exceptions, credentials, provider bodies, or cross-user data.
- [ ] Staging rollback to recorded production code and restoration to V2 are both exercised.
- [ ] One backend Pam runtime, tool catalog, state service, text route, and voice route remain active on the rebuild branch.
- [ ] One frontend Pam shell, text transport, and voice transport remain active.
- [ ] Removed modules have no imports, startup hooks, routes, feature flags, scheduled jobs, tests, or dependencies.
- [ ] Build artifacts contain no browser provider keys.
- [ ] Architecture, environment, operations, incident, and rollback documentation match code.
- [ ] Production promotion remains a separate explicit decision.

## 5) Test Plan (Design BEFORE build)

Create a release matrix mapping every success criterion to a command/report and owner.

### Required suites

- Backend unit/contract/integration and RLS tests.
- Frontend reducer/transport/component tests.
- Pam text and voice E2E.
- Evaluation trajectories for every retained tool.
- Security tests: auth, cross-user, injection, unsafe tool arguments, approval replay, secret scanning.
- Reliability/chaos tests for controlled dependency failures.
- Accessibility automation plus keyboard/screen-reader manual checks.
- Performance/cost test with a fixed synthetic workload.
- Import/route/dependency/dead-code checks after deletion.

Every report must include timestamp, release SHA, environment, test count, pass/fail count, and command. A zero-test run is a failure.

## 6) Implementation Plan (Small slices)

1. **Create release acceptance matrix and run baseline.**
   - Tests/check scripts first ensure every report has non-zero tests and release metadata.
   - Run all suites without deleting anything.
   - Classify failures as blocking, accepted risk, or flaky with evidence.
   - Commit: `test(pam-v2): establish staging release baseline`.
2. **Security and privacy hardening.**
   - Add failing tests for every discovered issue before fixes.
   - Review auth, RLS, approvals, logging, browser bundle, CORS/CSP, rate limits, retention, and admin boundaries.
   - Commit: `fix(pam-v2): close staging security findings`.
3. **Reliability, performance, and cost hardening.**
   - Add deterministic failure-injection tests.
   - Fix cancellation, timeout, retries, circuit behavior, connection cleanup, and payload limits.
   - Record fixed workload metrics.
   - Commit: `fix(pam-v2): meet reliability and performance gates`.
4. **Accessibility and cross-browser hardening.**
   - Add automated regressions before fixes.
   - Verify mobile/desktop, light/dark, long text, keyboard, reduced motion, microphone permissions, and unsupported voice fallback.
   - Commit: `fix(pam-v2): complete accessibility and browser matrix`.
5. **Exercise recovery.**
   - Run isolation check.
   - Deploy the recorded production commit to staging and run health/login/Pam smoke.
   - Restore the exact V2 candidate SHA and rerun smoke.
   - Document elapsed time, configuration steps, and any data caveats.
   - Commit: `docs(pam-v2): record tested recovery drill`.
6. **Remove backend legacy paths.**
   - Tests first: add architecture/import assertions allowing only approved V2 runtime owners.
   - Delete in small groups following the PRD 05 manifest: routes/startup, orchestrators, duplicate tools, provider routers, flags/dependencies.
   - After each group run backend tests and start/import smoke.
   - Commit each group separately using `refactor(pam): remove ...`.
7. **Remove frontend/voice legacy paths.**
   - Tests first: architecture/bundle assertions prevent imports of removed services and browser provider clients.
   - Delete V1 singleton/hooks/components/hybrid voice only after V2 flag is made the staging default.
   - Run unit, E2E, build, and bundle audit after each group.
   - Commit each group separately.
8. **Consolidate configuration, dependencies, and docs.**
   - Remove unused environment variables and packages only after reference scans and builds.
   - Update `CODEX.md`, `ENVIRONMENT.md`, architecture ADR, operations/rollback docs, and health expectations.
   - Commit: `docs(pam-v2): make v2 the documented pam architecture`.
9. **Final release candidate verification.**
   - Run every command in the acceptance matrix from a clean install/build where feasible.
   - Produce final results, residual risks, code/route/dependency deletion totals, and promotion checklist.
   - Tag or record immutable candidate SHA; do not deploy production.
   - Commit: `chore(pam-v2): finalize staging release candidate`.

## 7) Git Workflow Rules (Enforced)

- Continue the staging rebuild branch; preserve the production branch/tag.
- Commit before deletion begins and after every deletion group.
- Never combine security fixes and broad deletion in one commit.
- After each deletion group run targeted tests, import/start smoke, and a fast regression set.
- After every 3-5 deletion commits run the complete acceptance matrix subset.
- If a prior capability breaks, restore/fix it before proceeding.
- Do not use destructive Git history operations; rollback by deploying immutable commits.

## 8) Commands (Repo-specific)

```bash
npm install
npm run type-check
npm run lint
npm run test:coverage
npm run test:integration:coverage
npm run e2e:ci
npm run test:pam:auto
npm run quality:check:full
npm run security:audit
npm run build:staging
npm run pam:v2:verify-isolation
npm run pam:validate-removal
cd backend && python -m pytest -q
cd backend && python -m compileall app
```

Also run the PRD 01 evaluation command, namespace integration suites, voice test matrix, dead-import/reference scans with `rg`, and backend local startup/health smoke.

## 9) Observability / Logging (If applicable)

Final dashboards/reports need task completion, tool accuracy, approval outcomes, auth denials, duplicate prevention, safe error code, text/voice latency, reconnect, provider/tool/database failures, token/cost usage, and active runtime version.

Verify alerts for authorization bypass, unapproved mutation, repeated provider failure, database/RLS failure, elevated P95 latency, and voice session failure. Confirm redaction using automated log samples.

## 10) Rollout / Migration Plan (If applicable)

Staging sequence:

1. Make V2 default with legacy kill switch still available.
2. Complete acceptance matrix.
3. Exercise production-code recovery and V2 restoration.
4. Delete legacy paths on the rebuild branch.
5. Repeat complete acceptance matrix.
6. Record immutable release candidate SHA.

Production promotion is a new explicit operation after owner review. It must include database migration plan, backups, environment values, monitoring window, and immutable rollback release. Never describe “overwrite from production” as a database rollback.

## 11) Agent Notes (Leave space for recursion)

## Agent Notes — Session Log

- (timestamp) …

## Agent Notes — Decisions

- Decision / rationale / alternatives

## Agent Notes — Open Questions

- …

## Agent Notes — Regression Checklist

- [ ] Release matrix with non-zero test counts
- [ ] Security/privacy suite
- [ ] Reliability/failure injection
- [ ] Performance/cost report
- [ ] Accessibility/browser/voice matrix
- [ ] Recovery drill both directions
- [ ] Backend legacy deletion verification
- [ ] Frontend legacy deletion verification
- [ ] Clean build/full tests/evaluations
- [ ] Release candidate SHA and residual-risk report

