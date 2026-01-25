# Project Handover Document

**Date**: January 26, 2025
**Project**: Wheels & Wins
**Branch**: staging

---

## Current State Summary

The Wheels & Wins platform is a production application for Grey Nomads and RV travelers featuring PAM (Personal AI Manager), trip planning, budgeting, and social features.

### Deployment Status

| Environment | Frontend | Backend | Status |
|-------------|----------|---------|--------|
| Production | wheelsandwins.com | pam-backend.onrender.com | Stable |
| Staging | wheels-wins-staging.netlify.app | wheels-wins-backend-staging.onrender.com | 9 commits ahead |

### Commits on Staging (Not Yet in Production)

```
87462af1 feat: make PAM use profile data automatically instead of asking
cea066b0 feat: add instant local greeting to eliminate wake word delay
7df3500c fix: remove invalid user_context parameter from get_pam calls in voice bridge
578e03a9 fix: make PAM action-oriented for calendar commands - no clarifying questions
b972f5d0 fix: exempt PAM endpoints from WAF to prevent false positives
2209b42f fix: add legacy-peer-deps to resolve tfjs-tflite version conflict on Netlify
4f38deab fix: make PAM action-oriented for calendar commands - no clarifying questions
1a048073 fix: prevent silence timeout from killing Claude bridge during supervisor delegation
78cdfb79 feat: add bulletproof Hey Pam wake word + change voice to coral
```

---

## Recent Work Completed

### 1. PAM Voice Improvements

**Instant Local Greetings** (`cea066b0`)
- Pre-recorded greeting audio files play immediately when user says "Hey Pam"
- Eliminates 2-3 second delay waiting for AI response
- Files: `public/audio/greetings/greeting-1.mp3` through `greeting-4.mp3`
- Generator script: `scripts/generate-greetings.js`

**Bulletproof Wake Word** (`78cdfb79`)
- Improved "Hey Pam" detection reliability
- Changed TTS voice to "coral" for better clarity
- File: `src/services/pamVoiceHybridService.ts`

**Silence Timeout Fix** (`1a048073`)
- Prevented silence timeout from killing Claude bridge during supervisor delegation
- Allows longer processing for complex requests

### 2. PAM Behavior Improvements

**Profile Data Auto-Use** (`87462af1`)
- PAM now checks user's profile (location, timezone, preferences) before asking
- No longer asks "What city are you in?" when location is in profile
- File: `backend/app/services/pam/prompts/enhanced_pam_prompt.py`

**Action-Oriented Calendar** (`578e03a9`, `4f38deab`)
- Calendar commands execute immediately without clarifying questions
- "Book appointment Tuesday 9am Sam" just books it
- File: `backend/app/services/pam/prompts/enhanced_pam_prompt.py`

### 3. Infrastructure Fixes

**WAF Exemption for PAM** (`b972f5d0`)
- PAM WebSocket endpoints exempted from WAF false positives
- File: `backend/app/core/waf_middleware.py`

**Netlify Build Fix** (`2209b42f`)
- Added `--legacy-peer-deps` to resolve tfjs-tflite version conflict

---

## Uncommitted Changes

### Modified Files
| File | Status | Notes |
|------|--------|-------|
| `src/components/wheels/TripPlannerApp.tsx` | Modified | Trip planner changes |
| `src/components/wheels/trip-planner/fresh/FreshTripPlanner.tsx` | Modified | Fresh trip planner |
| `src/components/wheels/trip-planner/fresh/components/FreshTemplatesPanel.tsx` | Modified | Templates panel |
| `src/services/tripTemplateService.ts` | Modified | Template service |
| `public/sitemap.xml` | Modified | Sitemap updates |
| `public/sitemap-index.xml` | Modified | Sitemap index |

### New Untracked Files
| File | Notes |
|------|-------|
| `docs/PAM_CAPABILITIES_REFERENCE.md` | Comprehensive PAM capabilities documentation |
| `docs/pam/pam-avatar.png` | PAM avatar image |
| `docs/pam/*.mp4` | Video assets for PAM |

---

## Architecture Overview

### Tech Stack
- **Frontend**: React 18.3 + TypeScript + Vite + Tailwind
- **Backend**: FastAPI (Python)
- **Database**: Supabase PostgreSQL
- **AI**: Claude Sonnet 4.5 (primary), GPT-5.1 Instant (fallback)
- **Hosting**: Netlify (frontend), Render (backend)

### Key Services
- **PAM**: AI assistant with 47+ tools via WebSocket
- **Trip Planner**: Route optimization with weather/campsite integration
- **Budget Tracker**: Expense logging and alerts
- **Social**: Community features and marketplace

### Important Endpoints
- WebSocket (Production): `wss://pam-backend.onrender.com/api/v1/pam/ws/{user_id}?token={jwt}`
- WebSocket (Staging): `wss://wheels-wins-backend-staging.onrender.com/api/v1/pam/ws/{user_id}?token={jwt}`

---

## Key Files Reference

### PAM System
| File | Purpose |
|------|---------|
| `backend/app/services/pam/prompts/enhanced_pam_prompt.py` | PAM personality and behavior |
| `backend/app/services/pam/core/pam.py` | Core PAM logic |
| `backend/app/api/v1/pam_main.py` | PAM API endpoints |
| `src/services/pamService.ts` | Frontend PAM client |
| `src/services/pamVoiceHybridService.ts` | Voice interaction service |

### Documentation
| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project instructions for AI assistants |
| `docs/PAM_SYSTEM_ARCHITECTURE.md` | Complete PAM technical docs |
| `docs/DATABASE_SCHEMA_REFERENCE.md` | Database schema reference |
| `docs/PAM_CAPABILITIES_REFERENCE.md` | What PAM can do (user-facing) |

---

## Known Issues / Technical Debt

### Active Issues
1. **Trip Planner Templates** - Uncommitted changes in progress
2. **Sitemap** - Needs regeneration after content changes

### Technical Debt
1. Some duplicate code in trip planner components
2. Voice service could use better error recovery
3. Test coverage could be improved for PAM tools

---

## Environment Variables

### Frontend (.env)
```bash
VITE_SUPABASE_URL=https://kycoklimpzkyrecbjecn.supabase.co
VITE_SUPABASE_ANON_KEY=<key>
VITE_MAPBOX_TOKEN=<token>
VITE_GEMINI_API_KEY=<key>
```

### Backend (backend/.env)
```bash
DATABASE_URL=<supabase_connection_string>
SUPABASE_SERVICE_ROLE_KEY=<key>
ANTHROPIC_API_KEY=<key>  # Primary AI
GEMINI_API_KEY=<key>     # Fallback
REDIS_URL=redis://localhost:6379
```

---

## Common Commands

```bash
# Start frontend dev server (port 8080, NOT 3000)
npm run dev

# Start backend
cd backend && uvicorn app.main:app --reload --port 8000

# Run quality checks
npm run quality:check:full
npm run type-check

# Run tests
npm test
```

---

## Next Steps / Pending Work

### Ready for Production
The 9 commits on staging are ready for production merge after testing:
- PAM profile auto-use
- Instant greetings
- Calendar improvements
- WAF fixes

### In Progress
- Trip planner template improvements (uncommitted)

### Suggested Future Work
1. Add more pre-recorded PAM greetings for variety
2. Improve PAM's proactive suggestions
3. Add offline mode for trip planning
4. Expand free camping database coverage

---

## Contacts / Resources

- **Supabase Project**: https://kycoklimpzkyrecbjecn.supabase.co (Wheels and Wins)
- **GitHub Issues**: Use for bug reports and feature requests
- **Production**: https://wheelsandwins.com
- **Staging**: https://wheels-wins-staging.netlify.app

---

## Production Push Checklist

Before merging staging to main:

1. [ ] Test all PAM voice features on staging
2. [ ] Verify calendar commands work without questions
3. [ ] Confirm weather queries use profile location
4. [ ] Check instant greetings play correctly
5. [ ] Run `npm run quality:check:full`
6. [ ] Get explicit "yes" or "approve" from user
7. [ ] Merge staging to main
8. [ ] Verify production deployment succeeds

---

*Last Updated: January 26, 2025*
