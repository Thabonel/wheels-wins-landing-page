# PAM Final Build

## 1. Project Overview
- **Name:** **PAM** (Personal Autonomous Mechanic)
- **Goal:** Provide an agentic AI assistant for mature travelers on Wheels & Wins
- **Stack:** LangChain, MCP architecture, Celery, Supabase, Mapbox, FastAPI, Render

## 2. Architecture Diagram
```
+-------------+        +-------------+        +-----------+
|  Frontend   | <----> | FastAPI API | <----> | LangChain |
|  React/Vite |        |  PAM agent  |        |  Tools    |
+-------------+        +-------------+        +-----------+
        |                     |                      |
        |                     v                      |
   Mapbox &            Supabase DB            Background
  other APIs                 |                Celery workers
        |                     |                      |
        +-------------------- Render ----------------+
```
Core pieces include the LangChain agent, tool handlers, the Supabase database, FastAPI API routes, background Celery workers and Render deployment.

## 3. Core Modules
- **`/agents/pam/agent.py`** – routes flow requests such as onboarding to specific handlers.
- **`/services/pam/mcp/tools/`** – suite of LangChain tools:
  - `plan_trip.py` – builds routes using Mapbox and weather data
  - `track_expense.py` – records expenses in Supabase
  - `get_user_context.py` – validates and enriches context
  - `finance.py` – log expenses, suggest budgets, fetch summaries
  - `social.py` – post updates and suggest groups
  - `moneymaker.py` – manage hustle ideas and income estimates
  - `shop.py` – affiliate product suggestions
  - `feedback.py` – record thumbs-up/down on PAM messages
- **`/flows/onboarding_welcome.flow.json`** – defines the starter onboarding flow (currently empty placeholder).
- **`/scripts/report_affiliate_revenue.py`** – reports month‑to‑date affiliate revenue from Supabase.
- **Celery tasks** – workers in `backend/app/workers/tasks/` handle emails, maintenance checks, analytics, cleanups and notifications.
- **Proactive modules** – `backend/app/tasks/proactive_checks.py` and the Supabase `proactive-monitor` function push weather, budget and campsite alerts.
- **Feedback handlers** – the `record_user_feedback` tool stores user reactions.

## 4. Phases Completed
### Phase 1
1. **Prompt 1:** initialized backend project structure
2. **Prompt 2:** configured FastAPI with CORS and logging
3. **Prompt 3:** added JWT authentication basics
4. **Prompt 4:** created Supabase client and database models
5. **Prompt 5:** implemented health check endpoints
6. **Prompt 6:** set up development environment instructions
7. **Prompt 7:** prepared Docker configuration
8. **Prompt 8:** configured Render for initial deployment
9. **Prompt 9:** connected Mapbox and weather APIs
10. **Prompt 10:** created simple chat endpoint
11. **Prompt 11:** added environment variable templates
12. **Prompt 12:** documented setup steps
13. **Prompt 13:** wrote initial unit tests
14. **Prompt 14:** performed first deployment verification
15. **Prompt 15:** enabled GitHub Actions CI
### Phase 2
16. **Prompt 16:** implemented WebSocket manager
17. **Prompt 17:** added WebSocket routes
18. **Prompt 18:** integrated reconnection logic
19. **Prompt 19:** created Redis cache and rate limits
20. **Prompt 20:** built chat orchestrator skeleton
21. **Prompt 21:** connected OpenAI for conversation
22. **Prompt 22:** logged messages in Supabase
23. **Prompt 23:** added wins and wheels specialist nodes
24. **Prompt 24:** created social and shop nodes
25. **Prompt 25:** implemented money maker module
26. **Prompt 26:** added analytics logging tables
27. **Prompt 27:** expanded unit tests for nodes
28. **Prompt 28:** deployed updated backend
29. **Prompt 29:** validated WebSocket operation
30. **Prompt 30:** documented new endpoints
### Phase 3
31. **Prompt 31:** created Celery worker setup
32. **Prompt 32:** implemented maintenance reminder tasks
33. **Prompt 33:** built cleanup tasks for old data
34. **Prompt 34:** added analytics processors
35. **Prompt 35:** developed daily digest notifications
36. **Prompt 36:** wrote proactive checks for weather alerts
37. **Prompt 37:** added affiliate revenue script
38. **Prompt 38:** expanded security middleware
39. **Prompt 39:** improved logging configuration
40. **Prompt 40:** created Docker production compose file
41. **Prompt 41:** enabled Render worker service
42. **Prompt 42:** documented deployment steps
43. **Prompt 43:** created additional tests
44. **Prompt 44:** integrated Mapbox campsite search
45. **Prompt 45:** deployed proactive monitor function
46. **Prompt 46:** verified background schedules
47. **Prompt 47:** updated README with Phase 3 features
48. **Prompt 48:** added income tracking endpoints
### Phase 4
49. **Prompt 49:** started UI controller planning
50. **Prompt 50:** outlined front‑end integration hooks
51. **Prompt 51:** added feedback recording feature
52. **Prompt 52:** drafted offline message queue design
53. **Prompt 53:** improved type hints and docs
54. **Prompt 54:** added database migrations for new tables
55. **Prompt 55:** expanded test coverage targets
56. **Prompt 56:** prepared Render YAML for worker service
57. **Prompt 57:** created docker-compose overrides for prod
58. **Prompt 58:** finalized documentation of open tasks

## 5. Deployment & CI
- **`docker-compose.prod.yml`** defines three services: `web` (FastAPI server), `worker` (Celery worker) and `beat` (Celery beat scheduler). Each shares the production image and logs volume.
- **GitHub Actions CI** (`.github/workflows/ci.yml`) installs Python dependencies and runs pytest with fake Supabase credentials on every push or pull request.
- **Render.com** (`render.yaml`) provisions the `pam-backend` web service, a Redis instance and the `pam-celery-worker`. Environment variables such as `OPENAI_API_KEY`, `SUPABASE_URL` and `REDIS_URL` are synced from the dashboard.

## 6. Testing & Safety
- **Pytest** is used for backend API and unit tests. Running `pytest` executes the suite under `tests/` and `backend/tests/`.
- **Secret Scanning** relies on GitHub’s built‑in secret scanning with guidelines to avoid committing keys in `.env` files.
- **Environment Variables** are loaded via Pydantic settings from `.env`, ensuring API keys and secrets stay outside source control.

## 7. Known Limitations & TODOs
- Heartbeat mechanism and offline message queue for WebSockets remain unimplemented.
- The frontend `PamUIController` and workflow executor are placeholders.
- Learning system and workflow optimization in the intelligence layer are still marked TODO.
- Tests currently fail without full environment configuration.

