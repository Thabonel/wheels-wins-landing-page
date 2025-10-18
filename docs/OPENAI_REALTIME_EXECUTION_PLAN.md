# OpenAI Realtime PAM - Execution Plan

**Status:** 95% Complete - Just Wire Frontend to OpenAI
**Date:** October 18, 2025
**Target:** Launch in 2-3 hours

---

## What We Have vs What We Need

### ✅ COMPLETE - Backend (100%)

| Component | Status | Location |
|-----------|--------|----------|
| Session Token API | ✅ Built | `backend/app/api/v1/pam_realtime.py` |
| Tool Execution API | ✅ Built | `backend/app/api/v1/pam_tools.py` |
| Tool Converter | ✅ Built | `backend/app/services/pam/openai_tool_converter.py` |
| Usage Tracking Models | ✅ Built | `backend/app/models/usage_tracking.py` |
| Usage Tracking Service | ✅ Built | `backend/app/services/usage_tracking_service.py` |
| Analytics Dashboard | ✅ Built | `backend/app/api/v1/analytics.py` |
| Routes Registered | ✅ Done | `backend/app/main.py` (lines 77, 741) |
| Deployment Fixes | ✅ Done | Decimal type + import fixes committed |

### ✅ COMPLETE - Frontend Service (100%)

| Component | Status | Location |
|-----------|--------|----------|
| OpenAI Realtime Client | ✅ Built | `src/services/openaiRealtimeService.ts` |

### ❌ INCOMPLETE - Frontend Integration (0%)

| Component | Status | What's Needed |
|-----------|--------|---------------|
| Pam.tsx Wiring | ❌ Not Connected | Wire OpenAI service to existing UI |
| Voice Mode Toggle | ❌ Using Claude | Switch to OpenAI when voice enabled |
| Text Mode Fallback | ✅ Keep Claude | Use Claude for text-only interactions |

### ⬜ PENDING - Database Schema (Not Critical for Launch)

| Component | Status | Notes |
|-----------|--------|-------|
| usage_events table | ⬜ Need to create | Can launch without, add later |
| daily_usage_stats | ⬜ Need to create | Can launch without, add later |
| user_activity | ⬜ Need to create | Can launch without, add later |

---

## Execution Plan: 3 Hours to Launch

### Hour 1: Frontend Integration (60 mins)

**Task 1.1: Wire OpenAI Service to Pam.tsx (30 mins)**

File: `src/components/Pam.tsx`

Changes needed:
```typescript
// Add import
import { OpenAIRealtimeService } from '@/services/openaiRealtimeService';

// Add state
const [realtimeService, setRealtimeService] = useState<OpenAIRealtimeService | null>(null);
const [useOpenAI, setUseOpenAI] = useState(false); // Toggle for testing

// Replace startContinuousVoiceMode
const startContinuousVoiceMode = async () => {
  try {
    const service = new OpenAIRealtimeService(user.id, token);
    await service.connect();
    await service.startVoiceMode();

    setRealtimeService(service);
    setIsContinuousMode(true);
    setUseOpenAI(true);

    toast.success('Voice mode active (OpenAI Realtime)');
  } catch (error) {
    console.error('Failed to start OpenAI voice mode:', error);
    toast.error('Failed to start voice mode');
  }
};

// Replace stopContinuousVoiceMode
const stopContinuousVoiceMode = async () => {
  realtimeService?.stopVoiceMode();
  setRealtimeService(null);
  setIsContinuousMode(false);
  setUseOpenAI(false);
};

// Keep existing text chat using Claude
// Only use OpenAI when voice mode is active
```

**Task 1.2: Test Voice Mode (30 mins)**
- Start dev server
- Login to app
- Click voice mode button
- Verify OpenAI connection
- Test tool calling ("add a $50 gas expense")
- Verify audio works

### Hour 2: Database Schema + Deployment (60 mins)

**Task 2.1: Create Database Tables (15 mins)**

Create: `docs/sql-fixes/usage_tracking_tables.sql`

```sql
CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  cost_estimate DECIMAL(10,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_events_user_date
ON usage_events(user_id, DATE(timestamp));

CREATE INDEX IF NOT EXISTS idx_usage_events_type
ON usage_events(event_type);

CREATE TABLE IF NOT EXISTS daily_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  total_voice_minutes INT DEFAULT 0,
  total_tool_calls INT DEFAULT 0,
  unique_users INT DEFAULT 0,
  total_sessions INT DEFAULT 0,
  estimated_cost DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_activity (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  first_seen DATE NOT NULL,
  last_seen DATE NOT NULL,
  total_sessions INT DEFAULT 0,
  total_voice_minutes INT DEFAULT 0,
  total_tool_calls INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage events"
ON usage_events FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service can insert usage events"
ON usage_events FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view own activity"
ON user_activity FOR SELECT
USING (auth.uid() = user_id);
```

**Task 2.2: Run SQL in Supabase (5 mins)**
- Go to Supabase SQL editor
- Paste SQL
- Run

**Task 2.3: Commit and Push (10 mins)**
```bash
git add src/components/Pam.tsx
git add docs/sql-fixes/usage_tracking_tables.sql
git commit -m "feat: wire OpenAI Realtime to PAM voice mode

- Connect OpenAI Realtime service to Pam.tsx
- Add voice mode toggle (OpenAI vs Claude)
- Keep Claude for text-only interactions
- Create usage tracking database tables

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin staging
```

**Task 2.4: Wait for Deployment (30 mins)**
- Monitor Render deployment logs
- Verify backend starts successfully
- Check Netlify deployment

### Hour 3: Testing + Launch (60 mins)

**Task 3.1: Staging Testing (30 mins)**

Test checklist:
- [ ] Voice mode starts successfully
- [ ] Can hear PAM's voice (OpenAI TTS)
- [ ] PAM hears user (mic works)
- [ ] Tool calling works ("add expense", "plan trip")
- [ ] Text mode still works (Claude fallback)
- [ ] No console errors
- [ ] Usage tracking logs events

**Task 3.2: Production Deployment (15 mins)**

If staging works:
```bash
git checkout main
git merge staging
git push origin main
```

**Task 3.3: Verification (15 mins)**
- Test production site
- Create test user
- Test voice mode
- Check analytics dashboard

---

## Rollback Plan

If anything breaks:

**Option 1: Disable OpenAI, Keep Claude**
```typescript
// In Pam.tsx
const USE_OPENAI_REALTIME = false; // Set to false
```

**Option 2: Revert Commits**
```bash
git log --oneline | head -5  # Find commit hash
git revert <commit-hash>
git push origin staging
```

**Option 3: Restore Complete Backup**
```bash
git checkout v1.0-CLAUDE-VOICE-COMPLETE-BACKUP-OCT-2025
```

---

## Success Criteria

### Minimum Viable Launch
- ✅ Voice mode connects to OpenAI
- ✅ Audio in/out works
- ✅ Tool calling works (1-2 tools tested)
- ✅ No crashes or errors
- ✅ Can fallback to Claude text mode

### Ideal Launch
- ✅ All above
- ✅ Usage tracking capturing events
- ✅ Analytics dashboard showing data
- ✅ Sub-second response time
- ✅ 90%+ voice recognition accuracy

---

## Post-Launch Monitoring

### Day 1-7: Watch Metrics
- Daily active users
- Voice minutes per user
- Tool call success rate
- Error rate
- Cost estimates

### Week 2-4: Gather Feedback
- User satisfaction
- Voice quality ratings
- Feature requests
- Bug reports

### Month 1-3: Optimization Decision
Monitor dashboard for trigger:
```
IF monthly_cost > $150 AND monthly_revenue > $500
THEN consider hiring engineer for optimization
```

---

## What We're NOT Building (Intentionally)

❌ Backend proxy (adds latency)
❌ Custom VAD (OpenAI handles it)
❌ Custom TTS/STT (OpenAI handles it)
❌ Complex routing logic (direct connection)
❌ Optimization now (wait for revenue)

---

## Key Files Reference

### Backend
- Session tokens: `backend/app/api/v1/pam_realtime.py`
- Tool execution: `backend/app/api/v1/pam_tools.py`
- Tool converter: `backend/app/services/pam/openai_tool_converter.py`
- Usage tracking: `backend/app/services/usage_tracking_service.py`
- Analytics: `backend/app/api/v1/analytics.py`

### Frontend
- OpenAI client: `src/services/openaiRealtimeService.ts`
- PAM UI: `src/components/Pam.tsx`

### Documentation
- Full plan: `docs/OPENAI_REALTIME_LAUNCH_PLAN.md`
- This execution plan: `docs/OPENAI_REALTIME_EXECUTION_PLAN.md`

---

## Time Estimate Summary

| Phase | Time | Task |
|-------|------|------|
| Hour 1 | 60 min | Frontend integration + local testing |
| Hour 2 | 60 min | Database schema + deployment |
| Hour 3 | 60 min | Staging testing + production launch |
| **Total** | **3 hours** | **Complete OpenAI integration** |

---

## Next Steps: Start Now!

1. Open `src/components/Pam.tsx`
2. Wire OpenAI service to voice mode
3. Test locally
4. Deploy to staging
5. Test staging
6. Deploy to production
7. Monitor and celebrate! 🎉
