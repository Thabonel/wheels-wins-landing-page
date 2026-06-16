# PRD — Pam V2 Domain Tool Migration

## 1) Context & Goals

Pam V2 has a tested agent loop, canonical tool policy, durable state, and one approved mutation. This PRD migrates the product capabilities that users actually need and intentionally drops redundant, unsafe, or speculative tools.

This is for backend/domain engineers and coding agents adapting existing deterministic services into V2 namespaces.

Why now: migrating by product domain prevents another unbounded registry and makes each namespace independently testable and handoff-ready.

**Execution budget:** this PRD is designed for multiple fresh contexts. Complete one namespace slice per session and update Agent Notes. Do not load or migrate all 126 tool files at once.

### In-scope goals

- Build a machine-readable inventory classifying existing tools as adapt, merge, replace, or retire.
- Migrate required travel, money, calendar, account/profile, community, and document capabilities.
- Apply effect/risk/scope/approval/idempotency metadata to every migrated tool.
- Keep each namespace to ten or fewer tools.
- Add deterministic tests and evaluation cases per namespace.
- Produce a deletion manifest for PRD 08.

### Out-of-scope / Non-goals

- No new product capability merely because an old tool exists.
- No universal browser/extraction or unrestricted arbitrary HTTP tool by default.
- No autonomous proactive actions.
- No admin mutation through ordinary user tools.
- No frontend or voice implementation.
- No deletion of V1 tools yet.

## 2) Current State (Repo-informed)

- `backend/app/services/pam/tools/` contains more than 100 files, while active V1 schemas/dispatch live partly in `core/pam.py` and `tool_registry.py`.
- Tool availability, schema ownership, and actual production use differ.
- Existing domains include travel/maps/weather, money/budgets/expenses/savings, calendar, social/community, profile/settings, medical documents, memory, web browsing, timers, and admin knowledge.
- PRD 02 supplies the V2 catalog/executor; PRD 04 supplies approvals and state.

Create an inventory such as `docs/pam/PAM_V2_TOOL_MIGRATION_MATRIX.md` plus a machine-readable JSON/YAML source used by tests. Each row must name the V1 implementations and the one V2 disposition.

**ASSUMPTION:** Product priorities remain travel and finances first, then calendar/profile/community. Medical tools remain retrieval/display helpers and must not diagnose. Confirm priorities against current UI routes and user flows, not old roadmap documents.

## 3) User Stories (Few, sharp)

- As a traveler, I want route, place, weather, and trip information grounded in current services.
- As a user, I want Pam to read and update finances only with transparent exact actions.
- As a user, I want calendar changes previewed and approved.
- As a user, I want profile/community actions to respect privacy and sharing permissions.
- As an engineer, I want every capability to have one V2 tool owner and clear retirement mapping.

## 4) Success Criteria (Verifiable)

- [ ] Inventory covers every V1 tool/schema/dispatch entry discovered in active and legacy owners.
- [ ] Every entry has one disposition: `ADAPT`, `MERGE_INTO`, `REPLACE_WITH_SERVICE`, `RETAIN_V1_TEMPORARILY`, or `RETIRE`.
- [ ] Duplicate capabilities map to one V2 tool.
- [ ] Each V2 namespace contains at most ten tools with distinct descriptions.
- [ ] Every tool declares effect, risk, scope, approval, timeout, retry, and idempotency policy.
- [ ] All writes require exact approval unless explicitly documented as a reversible low-risk preference toggle.
- [ ] Money and social writes are never automatically retried without idempotency.
- [ ] Medical/document tools return source metadata and boundaries; they do not diagnose or invent records.
- [ ] Tool results are size-bounded and normalized before returning to the model.
- [ ] Cross-user, missing-scope, invalid-input, timeout, empty-result, and duplicate-write tests exist for each relevant tool.
- [ ] Evaluation cases cover every migrated tool and common multi-tool flows.
- [ ] No V2 tool imports `core/pam.py` or the V1 registry.
- [ ] A deletion manifest identifies V1 files/registrations made obsolete.

## 5) Test Plan (Design BEFORE build)

For each namespace, write tests before adapters:

- Schema valid/invalid/extra fields.
- Authorization and cross-user denial.
- Read result normalization and size limits.
- Write preview, approval, idempotency, and failure recovery.
- Domain edge cases: timezone/date, currency/decimal, location ambiguity, privacy, missing document.
- External service timeout/rate limit/unavailable.
- Model trajectory cases selecting the tool and grounding the final response.

Mock external providers. Use repository fakes for unit tests and isolated staging integration tests for Supabase. Never use real production users or records.

Required namespace coverage:

| Namespace | Priority tests |
| --- | --- |
| `travel` | ambiguous place, route constraints, stale/missing weather, no result |
| `money` | decimal precision, currency, ownership, duplicate expense, approval |
| `calendar` | timezone, all-day events, update/delete exact approval |
| `account` | profile read, preference update, privacy scope |
| `community` | audience, location sharing, content preview/moderation, duplicate post |
| `documents` | ownership, retrieval source, unsupported advice, missing file |

## 6) Implementation Plan (Small slices)

1. **Inventory and classification.**
   - Tests first: inventory parser rejects duplicate tool names, missing disposition, unknown owners, or V2 namespaces over ten tools.
   - Search active schemas, dispatch dictionaries, registrations, imports, routes, and UI action types.
   - Produce matrix and deletion manifest skeleton.
   - Commit: `docs(pam-v2): inventory and classify pam tools`.
2. **Travel namespace.**
   - Tests first for selected route/place/weather/trip tools.
   - Adapt deterministic existing services; merge overlapping weather/map tools.
   - Run travel evaluations and prior suite.
   - Commit: `feat(pam-v2): migrate travel tools`.
3. **Money namespace.**
   - Tests first for reads, exact decimals, writes, approval, idempotency, and RLS.
   - Keep calculations in domain code, not prompts.
   - Commit: `feat(pam-v2): migrate money tools`.
4. **Calendar namespace.**
   - Extend reference create action to list/update/delete with timezone-safe schemas and exact approval.
   - Tests first for changed arguments and repeated approval tokens.
   - Commit: `feat(pam-v2): complete calendar tools`.
5. **Account/profile namespace.**
   - Tests first for ownership, allowed fields, privacy-sensitive settings, and preference update approval policy.
   - Do not expose auth/security settings unless separately reauthenticated.
   - Commit: `feat(pam-v2): migrate account tools`.
6. **Community namespace.**
   - Tests first for audience, location privacy, content preview, moderation result, and duplicate submission.
   - Require approval immediately before publish/share/message.
   - Commit: `feat(pam-v2): migrate community tools`.
7. **Documents namespace.**
   - Tests first for ownership, source references, safe boundaries, and no diagnostic claims.
   - Limit content passed to the model; retrieve only relevant sections.
   - Commit: `feat(pam-v2): migrate document tools`.
8. **Utility decisions and retirement manifest.**
   - Evaluate timers, web search, admin knowledge, memory, proactive messages, and universal browser tools individually.
   - Default to retire or leave out unless a current user flow and policy can be demonstrated.
   - Finalize machine-readable deletion manifest.
   - Commit: `docs(pam-v2): finalize tool retirement manifest`.
9. **Full namespace evaluation.**
   - Run deterministic and approved staging model cases.
   - Fix defects in schemas/policy/domain code before prompt tuning.
   - Record coverage and unresolved retained-V1 capabilities.
   - Commit: `test(pam-v2): verify migrated domain tools`.

## 7) Git Workflow Rules (Enforced)

- One namespace per fresh context/session where possible.
- One namespace per commit series; do not mix unrelated domains.
- Begin each session by rerunning the previous namespace's tests.
- After each namespace run targeted tests, all Pam V2 policy tests, and relevant V1 smoke tests.
- After every two namespaces run all Pam V2 tests and `npm run quality:check`.
- Do not delete V1 files in this PRD.
- Update Agent Notes and inventory status before ending every session.

## 8) Commands (Repo-specific)

```bash
rg -n "tool|input_schema|tool_functions|register_tool" backend/app/services/pam backend/app/agents backend/app/api/v1
cd backend && python -m pytest tests/pam_v2/tools -q
cd backend && python -m pytest tests/pam_v2 -q
npm run test:pam:auto
npm run quality:check
npm run pam:v2:verify-isolation
```

Use namespace-specific pytest markers/paths created during implementation.

## 9) Observability / Logging (If applicable)

Add dashboard/report dimensions for namespace, tool, effect, risk, authorization decision, approval outcome, duration, safe error code, and idempotency result. Track unused V2 tools and V1 capabilities with no V2 mapping.

Do not log full arguments/results. Financial, location, community, and document content require field-level redaction.

## 10) Rollout / Migration Plan (If applicable)

Enable namespaces independently for designated staging accounts. Start read-only, then enable writes after their approval/RLS integration tests pass. Keep a namespace-level kill switch.

Rollback disables the affected namespace and leaves V1 available. Database writes remain and must be reversed through normal domain operations, not code rollback.

## 11) Agent Notes (Leave space for recursion)

## Agent Notes — Session Log

- (timestamp) …

## Agent Notes — Decisions

- Decision / rationale / alternatives

## Agent Notes — Open Questions

- …

## Agent Notes — Regression Checklist

- [ ] Inventory completeness
- [ ] Travel namespace
- [ ] Money namespace
- [ ] Calendar namespace
- [ ] Account namespace
- [ ] Community namespace
- [ ] Documents namespace
- [ ] Policy/RLS/approval regressions
- [ ] Full evaluation report
- [ ] Deletion manifest

