Perfect ✅ Let’s lock this in. Below is the **Pam 2.0 PRD (Gemini-First Edition)**. This takes all your research + vision, strips away over-engineering, and ensures **simplicity, modularity, and future-proofing**.

---

# 🚐 Wheels & Wins – Pam 2.0 PRD (Gemini-First Edition)

## 1. Mission

Pam 2.0 is the **personal AI assistant** for Wheels & Wins.
It’s warm, simple, and useful — a trusted travel + money companion for Grey Nomads, Snowbirds, and Full-Time Travellers aged 55+.

**Golden Rule:** Build **only what’s needed**, in **small modular blocks**, so we can upgrade AI tech without ever rewriting the system.

---

## 2. Core Objectives

1. **Conversational Interface:** PAM responds via chat (and later voice).
2. **Trip Planning & Logging (Wheels):** Routes, stops, expenses, fuel, vehicle tracking.
3. **Financial Management (Wins):** Budgeting, savings guarantee, income ideas.
4. **Community:** Shared experiences, subtle trip gleaning from user behavior.
5. **Safety & Trust:** Friendly guidance, emergency redirection, no medical liability.

---

## 3. Tech Stack

* **Frontend:** React/TypeScript (keep existing PAM UI).
* **Backend:** FastAPI (modular service).
* **Database:** Supabase (reuse schema, expand incrementally).
* **AI Provider:** **Gemini API (default)** → fallback to OpenAI/Anthropic via config.
* **Voice (optional):** Browser STT + Gemini.
* **Deployment:**

  * **Staging**: Pam 2.0 branch, isolated backend.
  * **Production**: Switch staging → live once stable.

---

## 4. Modular Architecture

Pam 2.0 is **5 small services**, each <300 lines, easy to swap.

### 4.1 Conversational Engine

* One WebSocket + REST `/chat`.
* Sends text → Gemini → returns response.
* Logs all messages in `pam_messages`.
* Can output `ui_actions` (e.g. “open budget screen”).

### 4.2 Context Manager

* Stores profile: vehicle, budget, preferences.
* Passes context into Gemini requests.
* Example: If user drives a diesel RV → fuel suggestions always diesel.

### 4.3 Passive Trip Logger (Wheels)

* Watches location pings + calendar.
* Gleans trips: overnight stays, routes taken.
* Auto-saves to Supabase `trips`.
* No user input needed — subtle & invisible.

### 4.4 Savings Tracker (Wins)

* Tracks all logged expenses.
* Calculates: “PAM saved you \$X this month.”
* If < subscription fee → mark free month.

### 4.5 Safety Layer (PamGuardian)

* Filters unsafe/emergency cases.
* Redirects: “⚠️ Please call 000 immediately.”
* Logs safety events in Supabase.

---

## 5. AI Strategy

* **Gemini-first** for cost + speed.
* Providers abstracted via `AIProvider` interface.
* Switching provider = 1 config change.

```python
class GeminiProvider(AIProvider): ...
class OpenAIProvider(AIProvider): ...
```

---

## 6. Database Strategy

* **Keep existing Supabase schema.**
* Add **only small, needed tables** (`trips`, `pam_savings`, `safety_events`).
* Avoid schema bloat → no “massive clogging.”
* Rule: “One new table per feature at most.”

---

## 7. Dev Workflow

1. Create **pam-2.0 branch**.
2. Keep **frontend PAM UI** (only swap backend).
3. Build backend modules in order:

   * Conversational → Context → Trip Logger → Savings → Safety.
4. Test each with Supabase staging.
5. Merge into staging site.
6. Switch staging → production when stable.

---

## 8. Non-Goals (for v2.0)

❌ No complex multi-provider orchestration.
❌ No unnecessary microservices.
❌ No overbuilt dashboards.
❌ No experimental features in production (build in staging only).

---

## 9. Success Metrics

* PAM response < 2s (Gemini baseline).
* 80%+ of user questions answered without human help.
* At least 1 logged trip + 5 expenses per user in first month.
* Savings Guarantee tracked correctly.

---

## 10. Future-Proofing

* Modular → can swap AI brains anytime.
* Each feature = self-contained service.
* New modules can be tested in staging, hot-swapped into production.

---

✅ This PRD ensures Pam 2.0 is **cheap, simple, modular, and future-proof**.
It’s designed for a **smooth build → test → launch cycle**, without chaos or technical debt.

---

Do you want me to now **expand this into the Phase-by-Phase Prompt Playbook** (where each module has a ready-to-paste prompt for your dev AI)? That way, you just copy-paste → build → test in order.
