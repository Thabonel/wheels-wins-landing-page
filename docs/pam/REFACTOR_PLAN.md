# PAM Refactor Plan

Goal: Improve maintainability, testability, and scalability by decomposing large modules, centralizing shared logic, and preparing for horizontal scaling.

## 1) Decompose `backend/app/api/v1/pam_main.py`

Current file mixes WebSocket chat, REST chat, TTS, analytics, cache ops, security views, and agentic endpoints. Split by concern:

- pam_ws.py: WebSocket (/ws/{user_id}) connection, keepalive, rate limiting, safety, streaming.
- pam_chat.py: REST chat (/chat), message validation, auth, orchestration.
- pam_tts.py: TTS-related endpoints, voice tests and diagnostics.
- pam_analytics.py: savings, analytics, logging endpoints.
- pam_cache.py: cache status/invalidate/warm/clear.
- pam_security.py: security status/audit/reset endpoints.

Each submodule registers its router; `pam_main` becomes a package that exposes a composed router.

## 2) Extract Tool Schema/Registry

Problem: Tool schemas and function maps are embedded inside `services/pam/core/pam.py` (large blocks). Duplicate/variant schemas exist in edge/deprecated files.

Action:
- Create `services/pam/tools/registry.py` that exports:
  - `get_tool_schemas()` – canonical tool definition list for the AI provider
  - `get_tool_function_map()` – maps tool name to callable
  - (Optional) `get_minimal_core_tools()` for fallback/basic conversations
- Update `core/pam.py` to import from registry; remove inline schema duplication.
- Update edge functions to call a formatter (OpenAI/Claude adapters) to convert from canonical schema.

## 3) Centralize Safety Middleware

Problem: Safety checks used in multiple paths (WS/REST/edge). Ensure consistent behavior and logging.

Action:
- Create `services/pam/security/middleware.py` with helpers:
  - `validate_and_sanitize_message(payload) -> SecureWebSocketMessage` (shared schema validation)
  - `run_safety_checks(text, ctx) -> SafetyResult`
  - `log_security_event(event, ctx)`
- Use from WS and REST paths; remove duplicated validation blocks.

## 4) Introduce Redis-backed PAM Instance Store

Problem: `_pam_instances` is in-memory; multi-instance deployments will diverge and lose context.

Action:
- Abstract PAM instance cache behind an interface `PamInstanceStore` with implementations:
  - `InMemoryPamInstanceStore` (dev/test)
  - `RedisPamInstanceStore` (prod)
- Store minimal state: language, brief context snapshot, last activity. Conversation history persists in DB.

## 5) Consistent Timeouts/Retry Policies

Problem: Claude/OpenAI calls have varied retry/timeout handling across code paths.

Action:
- Define provider-level defaults (timeout, retries, backoff) in one config module.
- Apply to `core/pam.py`, `claude_service.py`, `openai_provider.py`, edge functions (Supabase/Netlify) for uniform behavior.

## 6) Stronger Typing & Validation (TS)

Problem: Some `any` usage in frontend services and mixed field names.

Action:
- Use `Pam2ChatRequest/Response` and `PamContext` across all services.
- Enforce `validatePamContext` before send; build a small logger to collect warnings during development.

## 7) Testing Strategy

- Unit: tool registry mapping, safety middleware decisions, model router selection fallback.
- Integration: REST /chat happy path (mock AI), auth failures (401), invalid payload (422), savings endpoints.
- E2E: WS connect, message send, response stream, TTS optional path.

## 8) Migration/Adoption Plan

1. Land tool registry extraction (no behavior change).
2. Split pam_main into subrouters; wire in `main.py`.
3. Add Redis instance store behind feature flag.
4. Normalize timeouts/retries.
5. Expand test coverage as above.

Risks: Ensure router prefixes and dependencies remain identical; add compatibility shims and deprecation notes where needed.

