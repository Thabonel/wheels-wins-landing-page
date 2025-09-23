# Wheels & Wins + PAM 2.0 Comprehensive Build Document

This package contains all essential materials for building PAM 2.0 and running Wheels & Wins as a complete SaaS platform.

---

## 1. Philosophy & Working Principles
(From *This is how we work.txt*)
- Provide complete, copy-pasteable code when modifying.
- One clear action at a time.
- Focus only on fixing identified issues, no overbuilding.
- Be rigorous: analyze assumptions, raise counterpoints, test logic, and suggest alternatives.

---

## 2. Project Structure
(From *Wheels and Wins file structure180525.txt*)
- Standard React frontend using lucide-react icons, TailwindCSS for styling.
- Backend with modular organization under FastAPI.
- Supabase integration for authentication and database.
- Node module dependencies already mapped.

---

## 3. Project Brief & UX Vision
(From *Wheels and Wins Project brief.txt*)
- Target Audience: Grey Nomads, Snowbirds, Full-Time Travellers (55+).
- Navigation: **You, Wheels, Wins, Social, Shop**.
- Pam is fixed sidebar AI assistant on all screens.
- Logged-out homepage: single CTA (“Join Now”).
- Logged-in homepage: Calendar + Dashboard, with Pam always accessible.
- Visual dashboards, icons, and graphs instead of text-heavy forms.
- Social: Facebook-lite with discussions, local groups, trading, geo-aware filters.
- Shop: Admin-curated affiliate store filtered by region.

---

## 4. Core Mission
(From *What is Wheels and Wins.md*)
- SaaS platform simplifying life on the road for mature travelers.
- Pam: proactive personal AI assistant managing travel, finances, and social connection.
- Emotional benefits: peace of mind, confidence, security, connection.

**Key Features:**
- Trip Planning (routes, campsites, itineraries)
- Financial Management (expenses, budgets, goals, tips)
- Social Connectivity (forums, meetups, geo-aware groups)
- Shop & Affiliate Market (curated travel products)

---

## 5. PAM 2.0 Vision
- Modular, future-proof, built in phases.
- Uses Gemini for cost-effective AI calls.
- Supabase schema reused and extended, not duplicated.
- Community-driven trip logging: experiences gleaned passively (Tesla-style).
- Data builds itself from real-world user travel.

---

## 6. Roadmap (Prioritized)
1. **Core Vision & Architecture** (clean modular base, staging branch for PAM 2.0)
2. **Supabase Schema Audit** (reuse, extend with Alembic migrations)
3. **Prompt-to-Code Workflow** (pre-build prompts, generate code in sequence)
4. **Testing Framework** (pytest + Supabase test users + JWT auth)
5. **CI/CD DevOps** (GitHub Actions, Netlify + Render)
6. **Community & Social Features** (posts, feeds, trading, groups)
7. **Rollout & Productization** (alpha → beta → public, feature flags, safe deployment)

---

## 7. Testing & QA Strategy
- Pytest for backend (FastAPI endpoints, Supabase integration).
- Automated Supabase user creation/deletion during tests.
- Test coverage: Trip Planning, Financial Tools, Community, PAM AI workflows.
- End-to-end tests for feed posting and retrieval (Track C).

---

## 8. DevOps & Deployment
- GitHub branching model: `main` (production), `develop` (staging), `pam2.0` (new build).
- CI/CD with GitHub Actions: test → lint → build → deploy staging.
- Netlify for frontend, Render for backend.
- Supabase single instance with versioned migrations.
- Rollback plan via staging snapshots.

---

## 9. Marketing & Growth
- Pricing: AUD $14.99/mo, $149/yr, or lifetime founder option $399–$449.
- AI-powered Marketing Machine: GTM strategy, email sequences, content calendars.
- SEO: location-specific travel content + RV budgeting guides.
- Social virality: users build database by sharing trips, experiences, and recommendations.

---

## 10. Appendices
- **Prompt Library:** Pre-written prompts for AI code generation.
- **Risk Register:** Data privacy (location tracking), adoption friction, schema complexity.
- **Design Principles:** Always visual, Pam-centric, zero clutter, mobile-first.

---

# ✅ Next Steps
- Create **pam2.0 branch** in GitHub.
- Scaffold Supabase migrations for community features (`community_posts`, `community_feed`).
- Run automated tests (pytest) against staging.
- Begin phased rollout per roadmap.
