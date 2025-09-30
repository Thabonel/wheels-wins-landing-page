# Pam 2.0 Quickstart Checklist

This is the one-page, step-by-step version of the **Master Playbook**. Follow each step in order. Everything else (prompts, SQL, tests) is in the detailed documents.

---

## Phase 1 – Repo & Environment
- [ ] Create `pam-2.0` branch in GitHub.
- [ ] Set up staging Netlify (frontend) + Render (backend).
- [ ] Point to existing Supabase instance.

## Phase 2 – Core Setup
- [ ] Keep **existing frontend interface**.
- [ ] Clear backend PAM code.
- [ ] Install minimal FastAPI backend.
- [ ] Add WebSocket + REST skeleton.

## Phase 3 – Gemini Integration
- [ ] Connect Gemini API (cheapest tier).
- [ ] Build thin orchestrator → routes all PAM calls.
- [ ] Add fallback (static text or cached responses).

## Phase 4 – Database
- [ ] Apply schema from **Schema Playbook**.
- [ ] Create migration scripts (no manual edits in prod).
- [ ] Run initial migrations in staging.

## Phase 5 – PAM Modules
- [ ] Trip Planning (location + routes).
- [ ] Wins (budget + expenses).
- [ ] Maintenance (fuel + service logs).
- [ ] Community (trip sharing).

## Phase 6 – Voice Layer
- [ ] Add STT + TTS (minimal first).
- [ ] Test fallback to text-only.

## Phase 7 – Testing
- [ ] Run **Test Playbook** for each module.
- [ ] Run integration tests (WebSocket + Supabase).
- [ ] Fix before moving forward.

## Phase 8 – Staging → Production
- [ ] Validate all features in staging.
- [ ] Merge `pam-2.0` → main.
- [ ] Deploy to production.

---

✅ Done: You now have **Pam 2.0 live**.