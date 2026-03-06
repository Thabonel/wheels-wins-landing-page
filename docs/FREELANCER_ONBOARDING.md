# Freelancer Onboarding - Wheels & Wins

Welcome. This document covers everything you need to orient yourself before writing a line of code.
Reading time: ~80 minutes (all linked docs included).

---

## 1. What This Project Is (2 min)

Wheels & Wins is an RV travel planning app with an integrated AI assistant called **PAM** (Personal AI Mobility assistant).

Core features:
- **Wheels** - Trip planning, route optimization, campground finder, interactive maps
- **Wins** - Expense tracking, budget planning, receipt scanning
- **Social** - Community feed, friend connections, experience sharing
- **Shop** - Affiliate product marketplace
- **PAM** - AI assistant with 47+ tools, voice capabilities, and full context of the user's trip/budget

The app is a PWA (Progressive Web App) - mobile-first, installable, partially offline-capable.

---

## 2. Live URLs

| Environment | Frontend | Backend |
|-------------|----------|---------|
| Production | [wheelsandwins.com](https://wheelsandwins.com) | [pam-backend.onrender.com](https://pam-backend.onrender.com) |
| Staging | [wheels-wins-staging.netlify.app](https://wheels-wins-staging.netlify.app) | [wheels-wins-backend-staging.onrender.com](https://wheels-wins-backend-staging.onrender.com) |
| Dev (local) | http://localhost:8080 | http://localhost:8000 |

Other resources:
- GitHub: https://github.com/Thabonel/wheels-wins-landing-page
- Supabase dashboard: https://kycoklimpzkyrecbjecn.supabase.co

**Always test on staging before anything touches production.**

---

## 3. Non-Negotiable Rules (Read These First)

**Deployment:**
- Never push directly to `main` (production)
- Always push to `staging` first and wait for owner sign-off
- Owner approval requires the explicit word "yes", "approve", or "approved" - nothing else counts

**Authentication code:**
- Never modify `src/integrations/supabase/client.ts` without a staging deploy and multi-device test
- No JavaScript Proxy patterns anywhere near auth - this caused a 4-day production outage in Feb 2026
- See `docs/CRITICAL_FAULT_2025-02-26_SUPABASE_PROXY.md` for the full post-mortem

**Development server:**
- Port is **8080**, NOT 3000

**Database quirks:**
- The `profiles` table uses `id` as the user identifier (NOT `user_id`)
- Every other table uses `user_id`
- Never guess column names - always check `docs/DATABASE_SCHEMA_REFERENCE.md`

**Field naming:**
- Location coordinates: `lat` / `lng` (NOT `latitude` / `longitude`)
- Location context object: `user_location` (NOT `location`)
- See `docs/NAMING_CONVENTIONS_MASTER.md` for the full list

**Code style:**
- No emojis in code or comments (UI strings only)
- No em-dashes (-) - use regular hyphens (-)
- Comments explain WHY, not WHAT
- No mock data outside `__tests__/`

---

## 4. Tech Stack at a Glance

| Layer | Technology |
|-------|------------|
| Frontend | React 18.3 + TypeScript + Vite + Tailwind CSS (port 8080) |
| Backend | FastAPI + Python 3.11+ (port 8000) |
| Database | PostgreSQL via Supabase (with RLS policies) |
| Auth | Supabase Auth (JWT) |
| AI - Primary | Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) |
| AI - Fallback | GPT-5.1 Instant |
| TTS | Edge TTS (primary), ElevenLabs, pyttsx3, gtts |
| Maps | Mapbox GL JS |
| Frontend hosting | Netlify (auto-deploy from `main`) |
| Backend hosting | Render (Docker) |
| Cache | Redis |
| State management | Tanstack Query + Zustand |

---

## 5. Local Setup (Step by Step)

### Prerequisites
- Node.js 18+ (use `nvm use` - the repo has `.nvmrc`)
- Python 3.11+
- Git

### Step 1 - Clone and install frontend deps
```bash
git clone https://github.com/Thabonel/wheels-wins-landing-page.git
cd wheels-wins-landing-page
npm install
```

### Step 2 - Set up Python backend
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r backend/requirements.txt
```

### Step 3 - Configure environment variables
```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

**Frontend (.env) - required keys:**
```bash
VITE_SUPABASE_URL=https://kycoklimpzkyrecbjecn.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_MAPBOX_TOKEN=pk.your_mapbox_token
VITE_GEMINI_API_KEY=your_gemini_key
```

**Backend (backend/.env) - required keys:**
```bash
DATABASE_URL=postgresql://...
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ANTHROPIC_API_KEY=your_anthropic_key    # PRIMARY - Claude Sonnet 4.5
GEMINI_API_KEY=your_gemini_key          # FALLBACK
REDIS_URL=redis://localhost:6379
CORS_ALLOWED_ORIGINS=http://localhost:8080
```

Get real key values from the owner - do not commit keys to git.

### Step 4 - Start dev servers
```bash
# Terminal 1: Frontend
npm run dev
# -> http://localhost:8080

# Terminal 2: Backend
cd backend
uvicorn app.main:app --reload --port 8000
# -> http://localhost:8000
```

---

## 6. Branching and Deployment Workflow

```
feature/your-branch
       |
       v (PR)
   staging  <-- owner tests here
       |
       v (owner approves with "yes"/"approve")
     main   <-- production (auto-deploys to Netlify + Render)
```

**Rules:**
- Cut feature branches from `staging`, not `main`
- Open PRs against `staging`
- The owner tests on [wheels-wins-staging.netlify.app](https://wheels-wins-staging.netlify.app)
- Only after explicit approval does staging get merged to `main`
- Frontend deploys to Netlify automatically on push to `main`
- Backend deploys to Render automatically on push to `main`

---

## 7. What to Read Before Your First Task

Read in this order:

1. **`CLAUDE.md`** (15 min) - All the rules, conventions, and critical warnings
2. **`docs/DATABASE_SCHEMA_REFERENCE.md`** (20 min) - Every table, column, and type
3. **`docs/NAMING_CONVENTIONS_MASTER.md`** (15 min) - Field naming rules with examples
4. **`docs/PAM_SYSTEM_ARCHITECTURE.md`** (30 min) - How PAM works end to end

Total: ~80 minutes. Worth it - these docs will prevent most common mistakes.

---

## 8. Critical Architecture Decisions (Don't Re-litigate These)

These decisions were made deliberately after real incidents. Do not work around them without discussing with the owner.

**No JavaScript Proxy patterns in auth**
Caused a 4-day production outage in February 2026. `src/integrations/supabase/client.ts` must stay simple. See `docs/CRITICAL_FAULT_2025-02-26_SUPABASE_PROXY.md`.

**PAM uses WebSocket, not HTTP polling**
The PAM AI assistant connects via WebSocket at `/api/v1/pam/ws/{user_id}?token={jwt}`. Do not convert this to REST endpoints.

**Two separate tool systems in PAM backend**
`backend/app/services/pam/pam.py` uses `_build_tools_schema()` (primary). `backend/app/services/pam/tool_registry.py` uses `ToolRegistry` (used by the orchestration layer). They are not interchangeable. Ask before modifying either.

**Supabase service role key**
The key named `SUPABASE_SERVICE_ROLE_KEY` in the environment must actually be the service role key (JWT role: "service_role"), not the anon key. Verify by decoding the JWT - the `role` field should say `service_role`. This has caused silent RLS failures in the past.

**`profiles` table primary key**
Uses `id` (not `user_id`). Every other table uses `user_id`. This is a quirk of how Supabase sets up the auth schema. Do not change it.

---

## 9. Common Pitfalls

| Pitfall | What to do instead |
|---------|-------------------|
| Using port 3000 for dev | Use port 8080 (`npm run dev` sets this) |
| Querying `profiles.user_id` | Use `profiles.id` |
| Using `latitude`/`longitude` | Use `lat`/`lng` |
| Sending `location` to PAM backend | Send `user_location` |
| Assuming a column exists | Check `docs/DATABASE_SCHEMA_REFERENCE.md` first |
| Pushing a fix directly to main | Push to staging, wait for owner approval |
| Adding emojis to code/comments | Text only in code; emojis in UI strings only |
| Using `OPENAI_API_KEY` | Use `ANTHROPIC_API_KEY` for the primary AI |
| Creating new PAM implementations | Fix the existing system - don't duplicate |
| Using `VITE_` prefix in backend | Frontend env vars only use `VITE_` prefix |

---

## 10. Getting Help

**First:** Search the codebase and docs - most answers are there.

**GitHub Issues:** https://github.com/Thabonel/wheels-wins-landing-page/issues
- Use the bug report or task template
- Include reproduction steps and environment details

**Escalate to owner for:**
- Production incidents
- Architectural decisions
- Access credentials you're missing
- Anything that requires a `main` branch merge

---

## 11. Project Structure Quick Reference

```
src/
├── components/
│   ├── wheels/     # Trip planning components
│   ├── wins/       # Financial management components
│   ├── social/     # Community features
│   ├── pam/        # AI assistant UI
│   └── shared/     # Shared/reusable components
├── pages/          # Route-level page components
├── hooks/          # Custom React hooks
├── services/       # API client layer (pamService.ts, etc.)
├── integrations/   # Third-party clients (supabase/client.ts)
└── __tests__/      # Tests

backend/
├── app/
│   ├── api/v1/     # FastAPI route handlers
│   ├── services/
│   │   └── pam/    # PAM AI logic and tools
│   ├── models/     # Pydantic schemas
│   └── core/       # Auth, database, middleware
└── docs/           # Backend-specific docs

docs/               # Project documentation (start here)
```

---

*Last updated: March 2026*
