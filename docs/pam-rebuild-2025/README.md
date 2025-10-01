# PAM Rebuild 2025 - Working Folder

**Start Date:** October 1, 2025
**Status:** Day 1 Complete ✅
**Approach:** Simple, working PAM with Claude Sonnet 4.5 (no hybrid complexity)

---

## 📁 Folder Contents

### Planning & Design
- **`PAM_REBUILD_PRD.md`** - Complete Product Requirements Document (35KB)
  - Executive summary, problem/opportunity, solution overview
  - Detailed requirements (P0/P1/P2)
  - Technical specs, business requirements, design/UX
  - Success metrics, risks, go-to-market strategy
  - 7-day implementation timeline

### Implementation Tracking
- **`DELETION_MANIFEST_20251001.md`** - Day 1 cleanup record (9.3KB)
  - 28 files deleted (~5,000 lines removed)
  - Backup location and recovery instructions
  - Justification for cleanup

- **`DAY_1_COMPLETE.md`** - Day 1 summary (this will be created)
- **`DAY_2_CORE_PAM.md`** - Day 2 implementation log (WIP)
- **`DAY_3_BUDGET_TOOLS.md`** - Day 3 implementation log (pending)
- **`DAY_4_TRIP_TOOLS.md`** - Day 4 implementation log (pending)
- **`DAY_5_SOCIAL_SHOP_TOOLS.md`** - Day 5 implementation log (pending)
- **`DAY_6_VOICE_INTEGRATION.md`** - Day 6 implementation log (pending)
- **`DAY_7_CELEBRATION.md`** - Day 7 implementation log (pending)

### Architecture & Decisions
- **`ARCHITECTURE.md`** - System architecture overview (to be created)
- **`SECURITY_IMPLEMENTATION.md`** - 7-layer security details (to be created)
- **`API_CONTRACTS.md`** - WebSocket and REST API specs (to be created)

### Testing & QA
- **`TESTING_PLAN.md`** - Test strategy and checklist (to be created)
- **`BETA_FEEDBACK.md`** - User feedback from private/public beta (to be created)

---

## 🎯 7-Day Timeline

### ✅ Day 1: The Great Cleanup + Backup (Oct 1, 2025)
- [x] Create full backup (24MB)
- [x] Delete pam_hybrid system (18 files)
- [x] Delete duplicate APIs (4 files)
- [x] Delete hybrid frontend (3 files)
- [x] Delete duplicate services (3 files)
- [x] Update main.py imports
- [x] Commit to staging
- **Result:** Codebase reduced from 117 → 89 PAM files

### ⬜ Day 2: Core PAM Brain (Oct 2, 2025)
- [ ] Create `backend/app/services/pam/core/pam.py` (200 lines)
- [ ] Claude Sonnet 4.5 integration
- [ ] Simple WebSocket endpoint
- [ ] Basic conversation loop (message → PAM → response)
- **Deliverable:** Working PAM conversation (text-only)

### ⬜ Day 3: Budget Tools + Savings Tracking (Oct 3, 2025)
- [ ] Build 10 budget tools
- [ ] Create `pam_savings_events` table
- [ ] Implement savings tracking logic
- [ ] Add celebration trigger (savings ≥ $10)
- **Deliverable:** "Add $50 gas expense" works via text

### ⬜ Day 4: Trip Tools + Location Awareness (Oct 4, 2025)
- [ ] Build 10 trip tools
- [ ] Mapbox integration for routes
- [ ] Gas price API integration
- [ ] Route optimization with savings calculation
- **Deliverable:** "Plan trip from Phoenix to Seattle" works

### ⬜ Day 5: Social/Shop/Profile Tools (Oct 5, 2025)
- [ ] Build 10 social tools
- [ ] Build 5 shop tools
- [ ] Build 5 profile tools
- **Deliverable:** 40 total tools operational

### ⬜ Day 6: Voice Integration + Wake Word (Oct 6, 2025)
- [ ] Frontend: Web Speech API for wake word detection
- [ ] Backend: OpenAI Whisper for transcription
- [ ] Backend: Edge TTS for responses
- [ ] Audio chime on wake word trigger
- **Deliverable:** "Hey PAM" → voice interaction loop works

### ⬜ Day 7: Celebration System + Launch Prep (Oct 7, 2025)
- [ ] Build savings dashboard UI
- [ ] Celebration animation (confetti when savings ≥ $10)
- [ ] Shareable savings badge (social proof)
- [ ] Deploy to staging + production
- **Deliverable:** Ready for private beta

---

## 🏗️ Architecture Overview

### Simple Stack (No Hybrid Complexity)

**ONE AI Brain:**
- Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`)
- No routing, no multi-model, no agents
- Just: User → PAM → Response

**Backend:**
- Python 3.11+ with FastAPI
- PostgreSQL via Supabase
- Redis for caching
- WebSocket for real-time

**Frontend:**
- React 18.3+ with TypeScript
- Vite 5.4+ build
- Tailwind CSS 3.4+
- Web Speech API for wake word

**Key Features:**
1. Voice-first ("Hey PAM" wake word)
2. Savings tracking (PAM pays for herself)
3. 40 action tools (full site control)
4. 7-layer security (hack-proof)

---

## 📊 Success Metrics

**North Star:** $50+ monthly savings per user

**Week 1 Goals:**
- 85%+ wake word accuracy in driving tests
- 90%+ tool execution success rate
- <3s voice round-trip time
- Working backup/restore plan

**Week 2 Goals (Private Beta):**
- 20 users testing
- 5+ testimonials collected
- 80%+ retention
- No critical bugs

---

## 🔒 Security (7 Layers)

1. **Input Sanitization** - Block injection patterns
2. **Prompt Engineering** - Jailbreak resistance
3. **Tool Authorization** - Verify every action
4. **Output Filtering** - Scan for PII/secrets
5. **Rate Limiting** - Prevent abuse
6. **Secrets Management** - No hardcoded keys
7. **Audit Logging** - Immutable security trail

---

## 📝 Daily Workflow

**Each day:**
1. Create `DAY_X_TOPIC.md` log file
2. Document what was built
3. Record any issues/decisions
4. Update this README with status
5. Commit work to staging
6. Test immediately, don't wait

**Commit format:**
```
feat: day X - [what was built]

- [Specific accomplishment 1]
- [Specific accomplishment 2]
- [Specific accomplishment 3]

Deliverable: [What now works]

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 🚨 Emergency Rollback

If anything breaks:

**Option 1: Restore from backup**
```bash
cp -r backups/pre-simplification-20251001-101310/backend ./backend
cp -r backups/pre-simplification-20251001-101310/src ./src
```

**Option 2: Git revert**
```bash
git log --oneline  # Find commit hash
git revert <commit-hash>
```

**Backup location:** `backups/pre-simplification-20251001-101310/` (24MB, local only)

---

## 📞 Quick Reference

**Key Files:**
- PRD: `docs/pam-rebuild-2025/PAM_REBUILD_PRD.md`
- Deletion manifest: `docs/pam-rebuild-2025/DELETION_MANIFEST_20251001.md`
- How to add actions: `docs/HOW_TO_ADD_PAM_ACTIONS.md`
- Site interactions: `docs/PAM_SITE_INTERACTIONS.md`

**Backup:**
- Location: `backups/pre-simplification-20251001-101310/`
- Size: 24MB
- Contents: Complete backend/ and src/

**Branch:** staging
**Commit:** fa09d1ea (Day 1 cleanup)

---

**Last Updated:** October 1, 2025 - Day 1 Complete ✅
