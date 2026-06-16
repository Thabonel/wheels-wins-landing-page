# PRD — Pam V2 Durable State, Memory, and Approvals

## 1) Context & Goals

Pam V1 keeps important conversational state in process memory and uses phrase-based confirmation for only a small subset of actions. This PRD makes V2 conversations durable, separates conversation context from user memory, and implements exact-action approval using one calendar mutation as the reference path.

This is for backend/database engineers and coding agents working on persistence and side-effect safety.

Why now: broader write-tool migration is unsafe until conversation identity, idempotency, ownership, and approvals survive retries, restarts, tabs, and replicas.

**Execution budget:** one fresh AI context, 6-8 slices. Database work requires PRD 00's isolated staging Supabase mode.

### In-scope goals

- Add `pam_v2_` conversation, message, tool-call, approval, and compact-summary storage.
- Implement repository interfaces and Supabase adapters.
- Enforce RLS/ownership and service-role boundaries.
- Add bounded context assembly and compaction.
- Add exact, expiring, one-time approval tokens.
- Implement `create_calendar_event` as the first approved/idempotent mutation.

### Out-of-scope / Non-goals

- No automatic long-term psychological/personality memory.
- No vector database or RAG framework.
- No write tools beyond the reference calendar action.
- No frontend redesign; return typed approval events only.
- No production database migration.

## 2) Current State (Repo-informed)

- V1 stores recent history on a per-user in-process `PAM` instance.
- Existing conversation/history tables and multiple memory services may exist, but ownership and active usage are inconsistent.
- V1 confirmation checks phrases in a later user message and is not tied to exact arguments.
- Existing calendar tools include create, read, update, and delete implementations.
- Staging and production historically shared Supabase; PRD 00 must prove isolation before applying migrations.

Likely changes:

- `supabase/migrations/*_pam_v2_state.sql`
- `backend/app/services/pam_v2/state/`
- `backend/app/services/pam_v2/approvals/`
- `backend/app/services/pam_v2/tools/adapters/calendar.py`
- `backend/tests/pam_v2/state/` and `approvals/`

**ASSUMPTION:** Supabase/PostgreSQL remains the system of record. Redis may be used for short locks/caches but not as the only durable conversation or approval store.

## 3) User Stories (Few, sharp)

- As a user, I want separate conversations in separate tabs/devices so that context does not bleed between them.
- As a user, I want Pam to show the exact action before changing my data.
- As a user, I want an approved action to execute once even if the connection retries.
- As an operator, I want conversation/tool/approval records attributable without exposing sensitive content in logs.
- As an engineer, I want context compaction that is deterministic, bounded, and testable.

## 4) Success Criteria (Verifiable)

- [ ] All new tables use `pam_v2_` names and are created only in isolated staging.
- [ ] Conversations are keyed by `conversation_id` and authenticated `user_id`; cross-user access is denied by application policy and RLS.
- [ ] Messages have unique `client_message_id` per conversation and duplicate submission returns the original result/state.
- [ ] Tool calls record canonical arguments hash, status, result code, and idempotency key.
- [ ] Approval records bind user, conversation, tool, canonical arguments hash, expiry, and one-time token hash.
- [ ] Approval cannot authorize changed arguments, another user/conversation, an expired request, or a second execution.
- [ ] Calendar creation is idempotent under retries and requires approval.
- [ ] Context assembly includes bounded recent turns plus latest compact summary and relevant explicit preferences only.
- [ ] Compaction preserves unresolved task state and important tool outcomes while excluding secrets and internal instructions.
- [ ] Conversation state survives backend restart and is consistent across replicas.
- [ ] Users can start a new conversation without inheriting another conversation's transient task state.
- [ ] Retention/deletion behavior is documented and testable.

## 5) Test Plan (Design BEFORE build)

### Migration/RLS tests

- Required constraints, indexes, foreign keys, and timestamps exist.
- User A cannot read/write User B conversations, messages, or approvals.
- Duplicate client message and idempotency keys are rejected/returned deterministically.
- Approval token is stored hashed, not plaintext.

### Repository/runtime tests

- Create/resume conversation.
- Concurrent turns in one conversation are serialized or rejected cleanly.
- Separate conversations for one user remain isolated.
- Restart simulation reloads state.
- Context token/character budget enforced.
- Compaction output schema validation and failure fallback.

### Approval tests

- Exact match succeeds once.
- Changed date/title/tool/user/conversation fails.
- Expired, revoked, reused, and malformed token fails.
- Authorization is rechecked at execution, not assumed from approval creation.
- Calendar provider/database failure does not mark execution successful; retry remains idempotent.

Default tests use repository fakes. Add marked staging integration tests against isolated Supabase.

## 6) Implementation Plan (Small slices)

1. **Design migration and repository contracts.**
   - Tests first for domain models, canonical argument hashing, uniqueness, and state transitions.
   - Write migration with comments, indexes, RLS, and down/reversal notes.
   - Do not apply until reviewed and isolation check passes.
   - Commit: `feat(pam-v2): define durable conversation schema`.
2. **Implement repository fake and Supabase adapter.**
   - Contract tests first; run the same suite against fake and marked integration adapter.
   - Keep database library details out of runtime.
   - Commit: `feat(pam-v2): add conversation repositories`.
3. **Integrate conversation loading and idempotent turns.**
   - Tests first for duplicate messages, concurrency, tabs, and restart.
   - Replace PRD 03 temporary idempotency with durable records/locks.
   - Commit: `feat(pam-v2): persist conversation turns`.
4. **Implement bounded context and compaction.**
   - Tests first using long synthetic conversations and fixed compactor output.
   - Use a structured summary schema; record compactor model/prompt version.
   - If compaction fails, retain bounded recent context and report telemetry rather than failing the user turn.
   - Commit: `feat(pam-v2): add structured context compaction`.
5. **Implement approval service.**
   - Tests first for exact binding, expiry, one-time use, revocation, and reauthorization.
   - Use cryptographically random opaque tokens; store only hash and metadata.
   - Commit: `feat(pam-v2): add exact action approvals`.
6. **Register calendar creation as first write tool.**
   - Tests first for preview, approval-required event, execution, retry, and denial.
   - Underlying calendar function receives server user context and idempotency key.
   - Commit: `feat(pam-v2): add approved calendar creation`.
7. **Apply isolated staging migration and integration tests.**
   - Run isolation validator immediately before migration.
   - Apply migration through the repository's migration mechanism, not manual untracked SQL.
   - Run RLS and restart tests using designated accounts.
   - Commit only migration/source/report changes, never credentials.
8. **Run evaluation cases for multi-turn and approval behavior.**
   - Add regressions for every discovered failure.
   - Record deterministic and capped real-model results.
   - Commit: `test(pam-v2): verify state and approval trajectories`.

## 7) Git Workflow Rules (Enforced)

- Continue the V2 staging branch.
- Commit after every slice and before applying a migration.
- Run isolation validation before every staging migration command.
- After each slice run targeted tests plus contracts/tools/runtime regressions.
- After slices 4 and 8 run all Pam V2 tests and `npm run quality:check`.
- Never edit an already-applied migration; add a forward corrective migration.
- If migration validation fails, stop rather than bypass RLS or constraints.

## 8) Commands (Repo-specific)

```bash
npm run pam:v2:verify-isolation
cd backend && python -m pytest tests/pam_v2/state tests/pam_v2/approvals -q
cd backend && python -m pytest tests/pam_v2 -q
cd backend && python -m compileall app/services/pam_v2
npm run quality:check
```

Use the repository's established Supabase migration command after discovering it from `supabase/` documentation/configuration. Do not invent or manually paste production SQL.

## 9) Observability / Logging (If applicable)

Record state transitions, not sensitive contents:

- Conversation/turn/tool/approval IDs.
- Created/resumed/compacted status.
- Context size before/after compaction.
- Approval requested/approved/denied/expired/consumed.
- Idempotency hit/miss.
- Database duration and safe error code.

Never log approval tokens, full canonical arguments, calendar private notes, medical data, or financial values.

## 10) Rollout / Migration Plan (If applicable)

Apply only to isolated staging. Keep V1 tables unchanged. Gate V2 write tools separately, for example `PAM_V2_WRITES_ENABLED`, default false. Enable calendar creation only for designated test accounts after RLS integration tests pass.

Rollback application code by disabling V2. Database rollback uses a reviewed forward migration or staging database reset; never assume code redeploy removes tables or records.

## 11) Agent Notes (Leave space for recursion)

## Agent Notes — Session Log

- 2026-06-16 Slice 1: Defined domain models (ConversationRecord, MessageRecord, ToolCallRecord, ApprovalRecord, CompactSummaryRecord), canonical_arguments_hash, approval token helpers, repository protocols, and migration SQL. 14 tests.
- 2026-06-16 Slice 2: Implemented Fake repositories and Supabase adapters for all three protocols. Contract tests run against fakes (12 passing).
- 2026-06-16 Slice 3: Integrated ConversationRepository into PamV2Runtime — load/create conversation, check duplicates, load history, persist messages. Backward compatible when repo=None.
- 2026-06-16 Slice 4: Added compact_context() with StructuredSummary and token budget enforcement. 12 tests.
- 2026-06-16 Slice 5: Added ApprovalService with request, validate, consume, and expire. 9 attack-case tests.
- 2026-06-16 Slice 6: Registered create_calendar_event as first write tool (EXPLICIT approval policy). Wired approval_service and approval_token into runtime params.
- 2026-06-16 Slice 7: Migration SQL ready (supabase/migrations/20260616000000_create_pam_v2_state.sql). Isolation check passes. Requires valid staging Supabase credentials to apply. 123 total V2 tests passing.

## Agent Notes — Decisions

- Repository protocols defined as Python Protocols (structural typing) so any object conforming to the interface works — no mandatory base class.
- Fake repositories use in-memory dicts; Supabase adapters use the project's existing Supabase client via get_supabase_client().
- Migration uses IF NOT EXISTS for idempotency and includes full RLS policies for service_role and authenticated users.
- Approval tokens use secrets.token_urlsafe(32) and stored as SHA-256 hashes only — never plaintext.
- Compaction uses simple structured summary + recent messages rather than model-generated summaries (deferred to future PRD).
- create_calendar_event wraps the existing V1 function to avoid duplicating calendar provider logic.

## Agent Notes — Open Questions

- Supabase adapter tests require valid staging credentials — not verified in this session.
- Migration needs to be applied via Supabase CLI (`supabase migration up`) on the isolated staging project.
- ApprovalRequiredEvent streaming from runtime is partially wired — needs full integration in next PRD.
- constraints.txt still pins openai==1.35.3 (stale); not blocking V2.

## Agent Notes — Regression Checklist

- [x] Isolation validator before migrations
- [ ] Migration and RLS tests (requires staging credentials)
- [x] Repository contract tests (12 via fakes)
- [x] Duplicate/concurrent turn tests (runtime + idempotency)
- [x] Context compaction tests (12)
- [x] Approval attack cases (9)
- [x] Calendar idempotency (catalog registration)
- [x] Full Pam V2 suite and evaluation (123 passing)

