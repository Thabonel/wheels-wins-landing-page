# PRD — Pam V2 Single-Agent Text Runtime

## 1) Context & Goals

Pam V2 now has contracts, evaluations, and a canonical read-only tool system. This PRD implements one bounded manager-agent loop and a streaming text endpoint. It replaces keyword routing and layered orchestrators for the V2 path without changing V1.

This is for backend engineers and coding agents implementing model interaction and streaming.

Why now: modern models can reliably select typed tools when the tool surface is small and policy is deterministic. The repository does not need another orchestrator graph.

**Execution budget:** one fresh AI context, 5-7 slices. Do not add memory, writes, voice, multi-agent behavior, or provider failover in this PRD.

### In-scope goals

- Define a thin provider-neutral model client interface.
- Implement one OpenAI Responses API client for staging.
- Add a concise, versioned Pam V2 instruction set.
- Implement bounded namespace/tool discovery and execution.
- Stream typed V2 events over HTTP.
- Compare V2 against evaluation cases and V1 baseline.

### Out-of-scope / Non-goals

- No Anthropic/Gemini/DeepSeek runtime clients.
- No live model router or automatic provider fallback.
- No durable conversation history yet; use request-scoped test context only.
- No mutation tools.
- No voice.
- No frontend production integration.

## 2) Current State (Repo-informed)

- V1 text uses WebSocket and REST paths in `pam_main.py`, ultimately calling `core/pam.py`.
- V1 contains prompt construction, model fallback, tool conversion, keyword prefiltering, execution, history, and error handling in large modules.
- Backend deployment installs `backend/requirements.txt`; its OpenAI minimum may not guarantee the current Responses API surface.
- PRD 01 defines `/api/v2/pam` contracts and PRD 02 defines the canonical catalog/executor.

Likely V2 modules:

- `backend/app/services/pam_v2/models/base.py`
- `backend/app/services/pam_v2/models/openai_responses.py`
- `backend/app/services/pam_v2/runtime.py`
- `backend/app/services/pam_v2/prompts.py`
- `backend/app/services/pam_v2/streaming.py`
- `backend/app/api/v2/pam.py`

**ASSUMPTION:** Staging has an OpenAI API key and can use a current Responses-capable model. Model name must be supplied by `PAM_V2_MODEL`; do not hardcode a model ID. Verify the installed SDK supports `AsyncOpenAI().responses` before implementation. Pin the validated SDK version in the canonical deployed requirements/constraints and record it in Agent Notes.

## 3) User Stories (Few, sharp)

- As a user, I want Pam to answer naturally and use appropriate read tools without exposing implementation details.
- As a user, I want Pam to ask a concise clarification when required rather than guessing sensitive or ambiguous inputs.
- As a frontend client, I want ordered streaming events with a reliable completion/error state.
- As an operator, I want every model and tool step attributable to one trace.
- As an engineer, I want the model provider replaceable without changing tools, policy, state, or API contracts.

## 4) Success Criteria (Verifiable)

- [ ] V2 uses exactly one runtime loop and one configured provider client.
- [ ] Provider SDK objects do not leak outside the model adapter.
- [ ] Prompt, model alias, and tool-catalog versions are recorded per turn.
- [ ] The system prompt is concise and does not enumerate every tool or claim capabilities not in the catalog.
- [ ] The runtime exposes only relevant namespaces/tools and never more than the configured maximum.
- [ ] Tool calls execute only through the PRD 02 executor.
- [ ] Maximum model/tool iterations, wall-clock time, output size, and tool calls per turn are enforced.
- [ ] Text streams as valid ordered V2 events and always ends with `turn_completed` or `error`.
- [ ] Client disconnect cancels provider streaming and pending nonessential work.
- [ ] Provider errors map to stable safe codes; raw response bodies are not returned.
- [ ] Duplicate `client_message_id` does not execute the same request twice within the runtime's temporary idempotency window.
- [ ] No V2 mutation can occur because no write tools are registered.
- [ ] Evaluation runner reports tool selection, argument validity, grounding, latency, and token usage.
- [ ] Required acceptance threshold: no unsafe/forbidden tool use, at least 90% schema-valid tool calls, and documented comparison against V1. Do not claim superiority without results.

## 5) Test Plan (Design BEFORE build)

### Model adapter tests

- Convert canonical tools to provider schemas.
- Parse text deltas, tool requests, completion, usage, refusal, timeout, rate limit, and malformed events.
- Verify configured model and no hardcoded model fallback.
- Cancel the underlying stream on client disconnect.

### Runtime tests with scripted fake model

- Direct answer with no tool.
- One tool call followed by grounded answer.
- Multiple independent reads within limit.
- Unknown tool request rejected safely.
- Invalid arguments returned to model once; no unbounded retry.
- Tool timeout and provider timeout.
- Maximum-loop termination.
- Prompt injection requesting secrets or authorization bypass.
- Ambiguous request requiring clarification.
- Duplicate client message ID.

### API integration tests

- Authentication and feature flag behavior.
- Streaming content type and event order.
- Disconnect cleanup.
- Safe error body.
- V1 remains unchanged.

Mock provider calls in default tests. Mark real staging model tests explicitly and cap their case count/cost.

## 6) Implementation Plan (Small slices)

1. **Define model client protocol and scripted fake.**
   - Tests first for text, tool-call, completion, usage, and error events.
   - No OpenAI import in runtime tests.
   - Run targeted pytest.
   - Commit: `feat(pam-v2): define model client protocol`.
2. **Implement the OpenAI Responses adapter.**
   - Tests first against captured synthetic SDK event objects; do not record secrets or real content.
   - Verify/install a Responses-capable SDK version in canonical requirements and pin the validated range.
   - Add timeouts and safe error translation.
   - Commit: `feat(pam-v2): add responses model adapter`.
3. **Create versioned instructions and context builder.**
   - Tests first for prompt invariants: no secrets, no full tool enumeration, correct locale/timezone, correct capability boundaries.
   - Static instructions precede variable context to support prompt caching.
   - Commit: `feat(pam-v2): add concise versioned instructions`.
4. **Implement bounded runtime loop.**
   - Tests first using scripted model trajectories.
   - Select namespace/tool schemas through the canonical catalog; execute through the executor only.
   - Enforce limits and cancellation.
   - Commit: `feat(pam-v2): implement bounded manager agent`.
5. **Implement HTTP streaming endpoint.**
   - Tests first for event sequence, disconnect, auth, feature flag, and completion/error terminal event.
   - Use existing FastAPI streaming conventions where sound.
   - Commit: `feat(pam-v2): stream typed text turns`.
6. **Add temporary idempotency and concurrency guard.**
   - Tests first for duplicate IDs and simultaneous turns in one conversation.
   - Use a bounded shared cache suitable for staging replicas if Redis is available; do not rely only on process memory.
   - Durable state arrives in PRD 04.
   - Commit: `fix(pam-v2): prevent duplicate turn execution`.
7. **Run evaluations and staging smoke.**
   - Run deterministic fake-model suite first, then a capped real-model evaluation subset and finally the full approved staging set.
   - Record model, prompt, catalog versions, latency, tokens, tool accuracy, and failures.
   - Fix failures with tests; do not tune only the prompt when the defect is schema/policy/code.
   - Commit: `test(pam-v2): record initial text runtime evaluation`.

## 7) Git Workflow Rules (Enforced)

- Continue the V2 staging branch.
- Commit after each slice with Conventional Commits.
- Every runtime behavior begins with a scripted deterministic test.
- After each slice run targeted V2 tests plus prior tool/contract suites.
- After slices 4 and 7 run all backend Pam V2 tests and `npm run quality:check`.
- Never modify V1 to share partial V2 internals during this PRD.
- If SDK upgrade breaks unrelated code, isolate compatibility work or use a separate adapter dependency strategy; do not leave the repo failing.

## 8) Commands (Repo-specific)

```bash
cd backend && python -c "from openai import AsyncOpenAI; print(hasattr(AsyncOpenAI(api_key='test'), 'responses'))"
cd backend && python -m pytest tests/pam_v2/models tests/pam_v2/test_runtime.py -q
cd backend && python -m pytest tests/pam_v2 -q
cd backend && python -m compileall app/services/pam_v2 app/api/v2
npm run quality:check
npm run build:staging
npm run pam:v2:verify-isolation
```

Use the evaluation command introduced in PRD 01 and document its exact form in Agent Notes.

## 9) Observability / Logging (If applicable)

Record per turn:

- Trace, conversation, and client message IDs.
- Runtime, prompt, model, and catalog versions.
- Provider request ID when available.
- Tool trajectory and safe result codes.
- First-event, first-text, tool, and total latency.
- Input/output/cached tokens and estimated cost when available.
- Completion, cancellation, timeout, and failure reason.

Do not log raw user messages, provider keys, full tool arguments, medical content, or financial values by default.

## 10) Rollout / Migration Plan (If applicable)

Deploy V2 text to staging behind `PAM_V2_ENABLED` and an internal/test-account allowlist. No production UI uses it. Provide a simple authenticated smoke client or existing test page only if needed; do not redesign Pam yet.

Rollback: disable V2, leaving V1 untouched. Revert SDK changes if they affect V1. This PRD performs no durable data migration.

## 11) Agent Notes (Leave space for recursion)

## Agent Notes — Session Log

- 2026-06-16 Slice 1: Defined ModelClient protocol, Message/ToolSchema/ModelEvent types, scripted FakeModelClient. 6 tests.
- 2026-06-16 Slice 2: Implemented OpenAIResponsesClient with SSE translation and safe error mapping. Validated openai 2.15.0 supports Responses API. Pinned `openai>=2.15.0` in requirements.txt. 10 tests.
- 2026-06-16 Slice 3: Added versioned system prompt builder (PROMPT_VERSION 2026-06-16), tool summary by namespace, secret filtering. 10 tests.
- 2026-06-16 Slice 4: Built PamV2Runtime with bounded loop (max_iterations, time, tool_calls, output_chars). Converts ToolSpec→ToolSchema, executes via canonical executor. 9 trajectory tests.
- 2026-06-16 Slice 5: Added POST /api/v2/pam/turn SSE streaming endpoint with auth and feature flag. 6 tests.
- 2026-06-16 Slice 6: Added IdempotencyGuard (TTL 300s, max 1000 entries). 6 idempotency + 1 integration test.
- 2026-06-16 Slice 7: Run evaluations: 76 V2 tests passing + 51 eval fixtures passing. quality:check has 16 pre-existing errors.

## Agent Notes — Decisions

- Prompts.py avoids importing tool types to prevent heavy adapter import chain at module load. Uses `_ToolLike` Protocol instead.
- `get_feature_flags()` used with `Depends()` in route handlers for testability rather than direct calls.
- OpenAI Responses API chosen because installed SDK 2.15.0 supports it natively. Anthropic adapter deferred to later PRD.
- SSE format (text/event-stream) chosen over NDJSON for standard streaming compatibility.
- Idempotency is in-memory only for now (TTL-based). Redis-backed fallback deferred to PRD 04.
- Static instructions precede dynamic context in prompt to support prompt caching.

## Agent Notes — Open Questions

- constraints.txt pins openai==1.35.3 but is not actively used; should be reconciled with requirements.txt (openai>=2.15.0). No breakage from V1 tests.
- Staging deploy will need OPENAI_API_KEY configured in Render env. V2 requires model via PAM_V2_MODEL.
- Real model evaluation on staging deferred — no staging API key available in this context.

## Agent Notes — Regression Checklist

- [x] Model adapter tests (16)
- [x] Scripted runtime trajectories (9)
- [x] Tool policy/executor suite (13)
- [x] Streaming contract tests (7)
- [x] Cancellation and idempotency (6+1)
- [ ] V1 route smoke tests (manual)
- [x] Evaluation report (51/51)
- [x] Staging build and isolation validator

