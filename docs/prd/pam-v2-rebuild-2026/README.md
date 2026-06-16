# Pam V2 Rebuild PRD Set

**Created:** June 15, 2026  
**Target:** Staging-first replacement of Pam. Production remains the recovery source until the new system is accepted.

## Important Environment Constraint

`CODEX.md` states that staging and production currently share one Supabase database. Replacing staging code from production does **not** reverse database migrations or data mutations. PRD 00 must therefore complete before database-changing work begins. The preferred outcome is a separate staging Supabase project. Until then, agents must not run destructive migrations and must use designated test accounts only.

## How To Use This Set

Run one PRD at a time in numeric order. Start each PRD in a fresh AI context. Give the coding agent:

1. `AGENTS.md` and `CODEX.md`.
2. The single PRD being executed.
3. The immediately preceding PRD's completed Agent Notes, if relevant.
4. Access to the repository and staging environment.

Do not load the entire historical `docs/` directory. Each PRD lists the minimum required files. The agent should inspect additional files only when a named dependency requires it.

## Token-Window Rules

- One PRD is one bounded work package.
- A PRD may span multiple sessions, but each session must complete and commit one numbered implementation slice.
- At the end of every session, update that PRD's Agent Notes with files changed, tests run, commit hash, unresolved issues, and the exact next slice.
- When fewer than roughly 20% of the context tokens remain, stop coding after reaching a passing commit and write the handoff notes.
- Never begin the next PRD in the same context window.
- DeepSeek or another agent must verify the previous commit and tests before continuing; it must not trust prose-only claims.

## PRD Sequence

| Order | Document | Outcome |
| --- | --- | --- |
| 00 | [Staging Isolation and Recovery](00-staging-isolation-and-recovery.md) | Staging can be rebuilt without damaging production data; rollback is tested |
| 01 | [Contracts, Test Harness, and Evaluation Baseline](01-contracts-tests-and-evaluation-baseline.md) | Executable protocol and quality baseline exist before AI implementation |
| 02 | [Canonical Tool Catalog and Policy Engine](02-canonical-tool-catalog-and-policy.md) | One typed tool definition and execution path exists |
| 03 | [Single-Agent Text Runtime](03-single-agent-text-runtime.md) | Pam V2 can answer and call read-only tools through one agent loop |
| 04 | [Durable State, Memory, and Approvals](04-state-memory-and-approvals.md) | Conversations survive restarts and mutations require exact approval |
| 05 | [Domain Tool Migration](05-domain-tool-migration.md) | Required product capabilities move to namespaced V2 tools |
| 06 | [Frontend Pam Replacement](06-frontend-pam-replacement.md) | The large Pam UI/service is replaced by typed state and transport modules |
| 07 | [Realtime Voice Replacement](07-realtime-voice-replacement.md) | Voice uses WebRTC and the same tools, policy, and state as text |
| 08 | [Staging Hardening and Cutover](08-staging-hardening-and-cutover.md) | Staging is validated, legacy paths are removed there, and promotion is documented |

## Global Architecture Decisions

- Build V2 beside V1 until PRD 08. Do not incrementally mutate the 5,500-line V1 router into V2.
- Use one manager agent, one bounded tool loop, and one canonical tool catalog.
- Keep deterministic business logic and existing database services; wrap them before rewriting them.
- Use HTTP streaming for text and WebRTC for browser voice.
- Keep authorization, approvals, validation, idempotency, and audit logs outside the model.
- Use one configured primary provider in staging. Do not implement live multi-provider routing.
- Model names come from environment configuration and are recorded in traces.
- Every client-visible error uses a stable code and trace ID; raw exceptions remain server-side.
- New database objects use a `pam_v2_` prefix until cutover.

## Global Stop Conditions

Stop and document the blocker when:

- Staging points at production backend or frontend endpoints unexpectedly.
- A planned migration could alter the shared production database before isolation is complete.
- Tests cannot run because dependencies are missing; repair the test environment in the current PRD before feature work.
- Existing user changes overlap with files being modified and intent cannot be established.
- A tool cannot prove user ownership or required authorization.
- A mutation lacks an idempotency strategy.
- A provider API behavior is assumed but not supported by the installed SDK or official documentation.

## Program Completion Definition

The rebuild is complete only when all nine PRDs meet their success criteria, staging passes the deterministic evaluation and E2E suites, the rollback procedure has been exercised, and the active Pam architecture has one documented runtime, tool catalog, state service, text transport, and voice transport.

