You are Claude Code running inside a repo. Your job is to
produce a single PRD document that is ALSO the execution prompt for an AI coding agent.

The PRD must be precise, testable, and optimized for minimal back-and-forth. It must enforce:
- Tests + success criteria BEFORE implementation
- A tight Git loop: implement in small slices, run tests, commit often
- Regression checks: re-run relevant prior tests after new changes
- Space for future-session agent notes (self-comments)

========================
SLASH COMMAND ARGUMENTS
========================
Project/Repo Context:
- repo_path: {{repo_path}}
- project_name: {{project_name}}
- stack_guess: {{stack_guess}}          (optional; you can infer from repo)
Feature Request (user input):
- feature_title: {{feature_title}}
- feature_description: {{feature_description}}
Constraints:
- non_goals: {{non_goals}}              (optional)
- must_keep: {{must_keep}}              (optional: "don't change X")
- time_budget: {{time_budget}}          (optional)
Quality Bar:
- test_types_required: {{test_types_required}} (default: unit + integration)
- ci_required: {{ci_required}}          (default: yes if CI exists)
Deployment:
- deploy_target: {{deploy_target}}      (optional)
- env_constraints: {{env_constraints}}  (optional)

If any argument is missing, infer from repo where possible and explicitly mark assumptions.

========================
OUTPUT REQUIREMENTS
========================
Output EXACTLY ONE markdown document.
Name the document in the first line as: "# PRD — {{feature_title}}"
Do NOT implement anything. Do NOT edit code. Only write the PRD/execution prompt.

The PRD must include these sections in this order:

1) Context & Goals
- What problem this feature solves
- Who it's for
- Why now
- In-scope goals (bullet list)
- Out-of-scope / Non-goals (bullet list)

2) Current State (Repo-informed)
- Briefly describe existing relevant modules, endpoints, UI areas, services, data models
- Identify where changes will likely land (file/path guesses allowed)
- Call out risks / unknowns / assumptions

3) User Stories (Few, sharp)
- 3–7 user stories in "As a…, I want…, so that…" format

4) Success Criteria (Verifiable)
- A checklist of pass/fail outcomes
- Include edge cases
- Include performance/UX constraints if relevant
- Include "definition of done" that can be validated by tests or a smoke-run

5) Test Plan (Design BEFORE build)
- Required test categories (unit/integration/e2e)
- Concrete test cases mapped to success criteria
- What to mock vs what to integrate
- Test data/fixtures needed
- If e2e is not feasible, specify a deterministic integration suite + smoke steps

6) Implementation Plan (Small slices)
- A numbered sequence of small, safe increments
- Each increment must specify:
  a) what changes
  b) what tests to add/adjust FIRST
  c) what command(s) to run
  d) expected outputs
  e) when to commit

7) Git Workflow Rules (Enforced)
- Branch naming suggestion
- Commit cadence: "commit after every significant slice"
- Commit message format
- After each slice:
  - run targeted tests
  - run a fast regression subset
- After every 3-5 slices:
  - run full test suite (or best available)
- If a change breaks a prior feature:
  - revert or fix immediately before proceeding

8) Commands (Repo-specific)
- List the exact commands the agent should run for:
  - install
  - unit tests
  - integration tests
  - lint/typecheck
  - build
  - local run
- If unknown, provide best-guess + how to discover (e.g., read package.json / pyproject)

9) Observability / Logging (If applicable)
- What logs/metrics are needed
- How to verify behavior during smoke test

10) Rollout / Migration Plan (If applicable)
- Feature flags, backfills, migrations, data compatibility
- Safe rollout steps
- Rollback plan

11) Agent Notes (Leave space for recursion)
Include these empty subsections with placeholders the agent will fill later:
- ## Agent Notes — Session Log
  - (timestamp) …
- ## Agent Notes — Decisions
  - Decision / rationale / alternatives
- ## Agent Notes — Open Questions
- ## Agent Notes — Regression Checklist
  - (list tests/features to re-run after changes)

========================
STYLE RULES
========================
- Be concrete. Avoid vague language.
- Prefer checklists and tables where helpful.
- Map tests to success criteria explicitly (traceability).
- If you must assume something, label it "ASSUMPTION:" and provide a quick verification step.
- Keep it as short as possible while still being executable and unambiguous.

Now generate the PRD/execution prompt based on the arguments and the repo context.
