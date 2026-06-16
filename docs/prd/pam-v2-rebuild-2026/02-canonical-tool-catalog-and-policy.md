# PRD — Pam V2 Canonical Tool Catalog and Policy Engine

## 1) Context & Goals

Pam currently defines tools and execution behavior in multiple places, including the active core and a separate large registry. Confirmation and authorization rules are inconsistent. This PRD creates one provider-neutral tool catalog and one execution gateway for V2.

This is for backend engineers and coding agents implementing the safety boundary between the model and application services.

Why now: the model runtime must not be implemented until tool ownership, validation, authorization, timeout, logging, and approval policy are deterministic.

**Execution budget:** one fresh AI context, 5-7 slices. Implement only five read-only wrappers in this PRD.

### In-scope goals

- Define immutable `ToolSpec`, `ToolContext`, result, error, and policy types.
- Create a single V2 catalog and executor.
- Enforce server-derived user identity and authorization.
- Implement namespace discovery without keyword routing.
- Wrap five useful read-only existing services/tools.
- Add structured audit events and safe failures.

### Out-of-scope / Non-goals

- No model calls.
- No write/mutation tool execution.
- No migration of all V1 tools.
- No modification of V1 tool schemas or dispatch.
- No dynamic multi-provider schema conversion.
- No MCP server or multi-agent framework.

## 2) Current State (Repo-informed)

- `backend/app/services/pam/core/pam.py` builds its own tool schemas and dispatch dictionary.
- `backend/app/services/pam/tools/tool_registry.py` independently defines/loads many tools.
- `backend/app/services/pam/tools/tool_prefilter.py` uses keywords/regex to select tools.
- Individual tools include profile, calendar, weather, Mapbox, social context, memory, browser, and other functions.
- V1 injects user IDs at execution time, but policy is not represented consistently in metadata.

Create V2 modules under `backend/app/services/pam_v2/tools/`, likely:

- `types.py`
- `catalog.py`
- `executor.py`
- `policy.py`
- `namespaces.py`
- `adapters/`

Tests belong under `backend/tests/pam_v2/tools/`.

**ASSUMPTION:** The initial five read-only capabilities can be adapted from existing implementations for user profile, weather, calendar listing, route/place lookup, and one low-risk travel information source. Verify exact function signatures before choosing adapters. If one implementation is unsafe or coupled to V1 globals, select another read-only capability and document the substitution.

## 3) User Stories (Few, sharp)

- As a user, I want Pam to read only data I am authorized to access.
- As an engineer, I want each tool defined once so that provider and runtime changes cannot create divergent schemas.
- As an operator, I want every tool attempt to have a traceable success or safe failure.
- As a model runtime, I want a small namespace of relevant tools rather than every Pam capability at once.
- As a future agent, I want adding a tool to require tests for schema, policy, timeout, and result shape.

## 4) Success Criteria (Verifiable)

- [ ] `ToolSpec` includes name, description, input/output model, namespace, effect, risk, required scope, approval policy, timeout, retry policy, idempotency policy, and implementation reference.
- [ ] V2 has exactly one catalog owner; duplicate names fail startup/tests.
- [ ] `ToolContext.user_id` comes only from authenticated server context and cannot be overridden by model arguments.
- [ ] Unknown and extra arguments are rejected before execution.
- [ ] Authorization runs before implementation code.
- [ ] Read-only tools cannot be registered with mutation metadata accidentally; invalid metadata combinations fail validation.
- [ ] Timeout produces a stable safe error and cannot leave an untracked task.
- [ ] Retry is disabled by default and enabled only for explicitly idempotent reads.
- [ ] Tool results use a typed success/error envelope.
- [ ] Raw exceptions and secrets never appear in model-facing or client-facing results.
- [ ] Namespaces contain no more than ten tools and can return provider-specific schemas from the canonical definitions.
- [ ] Five read-only adapters pass unit and integration tests.
- [ ] V1 remains behaviorally unchanged.

## 5) Test Plan (Design BEFORE build)

### Unit tests

- Duplicate names and invalid metadata combinations rejected.
- Model-supplied `user_id`, auth scope, trace ID, or timeout rejected as tool arguments.
- Input and output schema validation.
- Unauthorized user never invokes implementation mock.
- Timeout, cancellation, known domain error, and unknown exception mapping.
- Retry only for an idempotent read and only within configured limit.
- Namespace list and schema conversion are deterministic.
- Secret-like values are redacted from logs/results.

### Adapter tests

- Each adapter maps canonical input to existing implementation correctly.
- User ownership reaches the underlying service through `ToolContext`, not model input.
- Empty/not-found results are distinct from infrastructure failure.
- External API adapters are mocked; database adapters use a repository fake or staging integration marker.

### Integration tests

- Authenticated V2 test endpoint or direct executor can list namespace schemas and execute a selected read.
- Cross-user read attempt is denied.
- Trace/audit record emitted once per attempt.

Fixtures use synthetic users and records. Do not call paid APIs in default tests.

## 6) Implementation Plan (Small slices)

1. **Define tool metadata and invariants.**
   - Tests first for valid/invalid `ToolSpec` combinations and duplicate names.
   - Implement provider-neutral types only.
   - Run targeted pytest and mypy/compile checks available in repo.
   - Expected: no imports from OpenAI, Anthropic, or V1 core.
   - Commit: `feat(pam-v2): define canonical tool specifications`.
2. **Implement policy and authorization interface.**
   - Tests first proving model arguments cannot influence identity or scopes.
   - Add policy decisions: allow, deny, approval-required.
   - The default for unknown tools/scopes is deny.
   - Commit: `feat(pam-v2): add deny-by-default tool policy`.
3. **Implement executor and safe result envelope.**
   - Tests first for validation, timeout, cancellation, retries, and error redaction.
   - Emit one structured audit event per execution.
   - Run targeted tests plus previous contract tests.
   - Commit: `feat(pam-v2): add validated tool executor`.
4. **Implement catalog and namespaces.**
   - Tests first for deterministic listing, maximum namespace size, schema generation, and duplicate rejection.
   - Do not implement keyword matching. The runtime will choose namespaces/tools later.
   - Commit: `feat(pam-v2): add namespaced tool catalog`.
5. **Wrap profile, weather, and calendar-read capabilities.**
   - Tests first using fakes at external/database boundaries.
   - Preserve existing deterministic service behavior; adapters translate types only.
   - Run integration tests with synthetic data.
   - Commit each coherent adapter group: `feat(pam-v2): adapt core read tools`.
6. **Wrap two travel read capabilities.**
   - Tests first for invalid locations, no results, upstream timeout, and result size limits.
   - Do not expose universal browser/extraction tools in the initial catalog.
   - Commit: `feat(pam-v2): adapt travel read tools`.
7. **Add catalog health and audit verification.**
   - Tests first for available/unavailable counts and safe metadata.
   - Extend V2 health without exposing implementations or secrets.
   - Run all Pam V2 backend tests and V1 smoke subset.
   - Commit: `feat(pam-v2): expose safe tool catalog health`.

## 7) Git Workflow Rules (Enforced)

- Continue the Pam V2 staging branch.
- Commit after every significant slice; adapter groups may use separate commits.
- After each slice run targeted tests, contract tests, and the isolation validator.
- After slices 3 and 7 run the complete backend Pam V2 suite and `npm run quality:check`.
- Do not edit V1 registries to reduce duplication yet.
- If an adapter requires changing domain logic, stop and isolate that change into its own tested commit.

## 8) Commands (Repo-specific)

```bash
cd backend && python -m pytest tests/pam_v2/tools -q
cd backend && python -m pytest tests/pam_v2 -q
cd backend && python -m compileall app/services/pam_v2 app/api/v2
npm run type-check
npm run quality:check
npm run pam:v2:verify-isolation
```

Use the exact backend test path established in PRD 01 if it differs.

## 9) Observability / Logging (If applicable)

One structured tool audit event must include:

- Trace, conversation, and tool-call IDs.
- Tool name, namespace, catalog version, effect, and risk.
- Authorization/approval decision.
- Success/failure code and duration.
- Retry count.
- Redacted argument/result metadata such as field names and payload sizes, not sensitive values.

Logging failure must not change the tool result, but it must be observable through an internal metric.

## 10) Rollout / Migration Plan (If applicable)

Deploy catalog and tests to staging with no model/UI route using it. V1 remains untouched. Health may report the V2 catalog only when V2 is enabled and authenticated/appropriately protected.

Rollback: disable V2 or revert these isolated modules. No database migration is required.

## 11) Agent Notes (Leave space for recursion)

## Agent Notes — Session Log

- (timestamp) …

## Agent Notes — Decisions

- Decision / rationale / alternatives

## Agent Notes — Open Questions

- …

## Agent Notes — Regression Checklist

- [ ] Tool metadata invariants
- [ ] Authorization denial tests
- [ ] Timeout/retry/error redaction tests
- [ ] Five adapter suites
- [ ] V2 contracts/evaluations
- [ ] V1 Pam smoke tests
- [ ] Isolation validator

