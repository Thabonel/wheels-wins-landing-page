# OpenAI Realtime API Launch Plan

**Date:** October 18, 2025
**Strategy:** Launch fast with GPT, optimize later when profitable
**Backup:** `v1.0-CLAUDE-VOICE-COMPLETE-BACKUP-OCT-2025` tag in GitHub

---

## Strategic Decision

**Problem:** Complex Claude voice system is hard to get working perfectly
**Solution:** Use OpenAI Realtime API for launch, optimize later with revenue

### The Plan

1. **Backup Complete** ✅ - Tagged as `v1.0-CLAUDE-VOICE-COMPLETE-BACKUP-OCT-2025`
2. **Launch with GPT** - Fast, reliable, amazing voice quality
3. **Track Usage** - Minutes, tool calls, retention from day 1
4. **Get Revenue** - Focus on users and growth
5. **Optimization Trigger** - When cost justifies engineering ($150+/month)
6. **Hire Engineer** - Build optimized Claude system (target: $50/month)
7. **Swap Back** - When optimized system is ready and tested

---

## Cost Analysis

### OpenAI Realtime API (Launch)
- **Input:** $32 per million audio tokens
- **Output:** $64 per million audio tokens
- **Combined:** ~$50/million tokens
- **Estimate:** 10 mins conversation = ~$0.50 (rough estimate)
- **Expected:** $150-300/month for initial users
- **Benefit:** Zero engineering time, works perfectly, ChatGPT quality

### Optimized System (Future)
- **Claude Sonnet 4.5:** $3 input + $15 output per million tokens
- **Self-hosted TTS/STT:** Minimal cost on own servers
- **Target Cost:** $50/month (3-6x cheaper)
- **Engineering Cost:** $5,000-10,000 (one-time)
- **Break-even:** 3-6 months at $100/month savings

### Decision Trigger
```
IF monthly_cost > $150 AND monthly_revenue > $500
THEN hire_engineer_to_optimize()
```

---

## Phase 1: Usage Tracking (Build This First)

### What to Track

```python
# backend/app/models/usage_tracking.py

class UsageEvent:
    user_id: UUID
    event_type: str  # 'voice_minute', 'tool_call', 'session_start', 'session_end'
    timestamp: datetime
    metadata: dict
    cost_estimate: float  # Track estimated cost per event

class DailyUsageStats:
    date: date
    total_voice_minutes: int
    total_tool_calls: int
    unique_users: int
    total_sessions: int
    estimated_cost: float
    retention_rate: float
```

### Metrics Dashboard
- **Daily Active Users (DAU)**
- **Voice minutes per user**
- **Tool calls per session**
- **Retention:** D1, D7, D30
- **Cost per user per month**
- **Revenue per user per month** (when billing launches)

### Implementation
```python
# Add to every PAM interaction
async def track_usage(user_id: UUID, event_type: str, metadata: dict):
    cost = estimate_cost(event_type, metadata)
    await db.usage_events.create({
        'user_id': user_id,
        'event_type': event_type,
        'timestamp': datetime.utcnow(),
        'metadata': metadata,
        'cost_estimate': cost
    })
```

---

## Phase 2: OpenAI Realtime Integration

### Backend Implementation

**1. New Service: `backend/app/services/pam/openai_realtime_service.py`**

```python
"""
OpenAI Realtime API Integration for PAM Voice
Simple, fast, reliable - ChatGPT quality voice
"""

import os
import json
import asyncio
from typing import Dict, Any, List, Optional
import websockets
from openai import AsyncOpenAI

class OpenAIRealtimeService:
    """
    PAM Voice powered by OpenAI Realtime API
    - Native speech-to-speech (no pipeline complexity)
    - Function calling for our 40+ tools
    - ChatGPT voice quality
    """

    def __init__(self, user_id: str):
        self.user_id = user_id
        self.api_key = os.getenv('OPENAI_API_KEY')
        self.ws_url = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01'
        self.ws = None
        self.tools = self._build_tool_definitions()

    def _build_tool_definitions(self) -> List[Dict]:
        """
        Convert our existing 40+ PAM tools to OpenAI format
        Reuse all existing tool implementations - just change schema format
        """
        # Import existing tools
        from app.services.pam.tools.budget import (
            create_expense, analyze_budget, track_savings, # ... all 10 budget tools
        )
        from app.services.pam.tools.trip import (
            plan_trip, find_rv_parks, get_weather_forecast, # ... all 10 trip tools
        )
        # ... etc for all tools

        # Convert to OpenAI function calling format
        tools = []
        # Each tool becomes:
        # {
        #     "type": "function",
        #     "name": "create_expense",
        #     "description": "...",
        #     "parameters": { "type": "object", "properties": {...} }
        # }
        return tools

    async def connect(self):
        """Establish WebSocket connection with session config"""
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'OpenAI-Beta': 'realtime=v1'
        }

        self.ws = await websockets.connect(self.ws_url, extra_headers=headers)

        # Send session.update with tools
        await self.ws.send(json.dumps({
            'type': 'session.update',
            'session': {
                'modalities': ['text', 'audio'],
                'instructions': 'You are PAM, the AI travel companion...',
                'voice': 'alloy',
                'input_audio_format': 'pcm16',
                'output_audio_format': 'pcm16',
                'tools': self.tools,
                'temperature': 0.8
            }
        }))

    async def handle_audio_input(self, audio_data: bytes):
        """Send user audio to OpenAI"""
        # Track usage
        await track_usage(self.user_id, 'audio_input', {
            'duration_seconds': len(audio_data) / 16000,  # 16kHz audio
        })

        await self.ws.send(json.dumps({
            'type': 'input_audio_buffer.append',
            'audio': audio_data.hex()  # Base64 or hex encoding
        }))

    async def handle_function_call(self, function_name: str, arguments: dict):
        """Execute PAM tool and return result to OpenAI"""
        # Track usage
        await track_usage(self.user_id, 'tool_call', {
            'function': function_name,
            'arguments': arguments
        })

        # Execute the actual tool (reuse existing implementations)
        result = await self._execute_tool(function_name, arguments)

        # Send result back to OpenAI
        await self.ws.send(json.dumps({
            'type': 'conversation.item.create',
            'item': {
                'type': 'function_call_output',
                'call_id': function_call_id,
                'output': json.dumps(result)
            }
        }))

    async def listen(self):
        """Listen for OpenAI events"""
        async for message in self.ws:
            data = json.loads(message)
            event_type = data.get('type')

            if event_type == 'response.audio.delta':
                # Stream audio back to user
                audio_chunk = bytes.fromhex(data['delta'])
                yield {'type': 'audio', 'data': audio_chunk}

            elif event_type == 'response.function_call_arguments.done':
                # Execute tool
                function_name = data['name']
                arguments = json.loads(data['arguments'])
                await self.handle_function_call(function_name, arguments)

            # ... handle other events
```

**2. FastAPI WebSocket Endpoint**

```python
# backend/app/api/v1/pam_realtime.py

@router.websocket("/ws/realtime/{user_id}")
async def realtime_websocket(websocket: WebSocket, user_id: str):
    """
    WebSocket endpoint for OpenAI Realtime PAM
    Browser → This endpoint → OpenAI Realtime API
    """
    await websocket.accept()

    # Create OpenAI Realtime service
    realtime = OpenAIRealtimeService(user_id)
    await realtime.connect()

    try:
        # Bidirectional streaming
        async def forward_from_browser():
            """Browser audio → OpenAI"""
            async for message in websocket.iter_bytes():
                await realtime.handle_audio_input(message)

        async def forward_from_openai():
            """OpenAI audio → Browser"""
            async for event in realtime.listen():
                if event['type'] == 'audio':
                    await websocket.send_bytes(event['data'])

        # Run both directions concurrently
        await asyncio.gather(
            forward_from_browser(),
            forward_from_openai()
        )

    except WebSocketDisconnect:
        await realtime.disconnect()
```

### Frontend Implementation

**3. Simple Frontend Client: `src/services/openaiRealtimeService.ts`**

```typescript
/**
 * OpenAI Realtime API Client
 * Direct WebSocket to OpenAI (via our backend proxy)
 * No VAD, no speech recognition, no TTS - all handled by OpenAI
 */

export class OpenAIRealtimeService {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext;
  private mediaStream: MediaStream | null = null;

  constructor(private userId: string) {
    this.audioContext = new AudioContext({ sampleRate: 24000 });
  }

  async connect(token: string) {
    const wsUrl = `wss://wheels-wins-backend-staging.onrender.com/api/v1/pam/ws/realtime/${this.userId}?token=${token}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onmessage = (event) => {
      // Audio from OpenAI - play it
      this.playAudio(event.data);
    };
  }

  async startVoiceMode() {
    // Get microphone
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { sampleRate: 24000 }
    });

    // Stream audio to OpenAI via WebSocket
    const processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);

    processor.onaudioprocess = (e) => {
      const audioData = e.inputBuffer.getChannelData(0);
      this.ws?.send(audioData.buffer);
    };

    source.connect(processor);
    processor.connect(this.audioContext.destination);
  }

  private playAudio(audioData: ArrayBuffer) {
    // Decode and play audio from OpenAI
    this.audioContext.decodeAudioData(audioData, (buffer) => {
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start(0);
    });
  }

  stopVoiceMode() {
    this.mediaStream?.getTracks().forEach(t => t.stop());
    this.ws?.close();
  }
}
```

**4. Wire to Existing PAM UI**

```typescript
// src/components/Pam.tsx - MINIMAL changes

// Replace imports
- import { vadService } from '@/services/voiceActivityDetection';
- import { pamVoiceService } from '@/lib/voiceService';
+ import { OpenAIRealtimeService } from '@/services/openaiRealtimeService';

// Replace voice mode handlers
const startContinuousVoiceMode = async () => {
  const realtimeService = new OpenAIRealtimeService(user.id);
  await realtimeService.connect(token);
  await realtimeService.startVoiceMode();
  setIsContinuousMode(true);
};

const stopContinuousVoiceMode = async () => {
  realtimeService.stopVoiceMode();
  setIsContinuousMode(false);
};

// That's it! Everything else stays the same
```

---

## Phase 3: Usage Tracking Implementation

### Database Schema

```sql
-- backend/docs/sql-fixes/usage_tracking.sql

CREATE TABLE usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  event_type TEXT NOT NULL,  -- 'voice_minute', 'tool_call', 'session_start'
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  cost_estimate DECIMAL(10,4),  -- Estimated cost in USD
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_events_user_date ON usage_events(user_id, DATE(timestamp));
CREATE INDEX idx_usage_events_type ON usage_events(event_type);

-- Aggregate stats for fast queries
CREATE TABLE daily_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  total_voice_minutes INT DEFAULT 0,
  total_tool_calls INT DEFAULT 0,
  unique_users INT DEFAULT 0,
  total_sessions INT DEFAULT 0,
  estimated_cost DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date)
);

-- Retention tracking
CREATE TABLE user_activity (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  first_seen DATE NOT NULL,
  last_seen DATE NOT NULL,
  total_sessions INT DEFAULT 0,
  total_voice_minutes INT DEFAULT 0,
  total_tool_calls INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Analytics Dashboard Endpoint

```python
# backend/app/api/v1/analytics.py

@router.get("/dashboard")
async def get_usage_dashboard(admin_user: User = Depends(require_admin)):
    """
    Analytics dashboard for optimization decision
    Shows when to pull the trigger on engineering optimization
    """

    # Last 30 days stats
    stats = await db.execute("""
        SELECT
            SUM(total_voice_minutes) as voice_minutes,
            SUM(total_tool_calls) as tool_calls,
            SUM(estimated_cost) as total_cost,
            AVG(unique_users) as avg_daily_users
        FROM daily_usage_stats
        WHERE date >= CURRENT_DATE - INTERVAL '30 days'
    """)

    # Calculate key metrics
    monthly_cost = stats['total_cost']
    cost_per_user = monthly_cost / stats['avg_daily_users']

    # Retention rates
    retention = await calculate_retention_rates()

    # Optimization trigger
    should_optimize = (
        monthly_cost > 150 and  # Cost threshold
        stats['avg_daily_users'] > 50  # Sufficient scale
    )

    return {
        'monthly_cost': monthly_cost,
        'cost_per_user': cost_per_user,
        'daily_active_users': stats['avg_daily_users'],
        'voice_minutes_per_month': stats['voice_minutes'],
        'tool_calls_per_month': stats['tool_calls'],
        'retention': retention,
        'optimization_trigger': {
            'should_optimize': should_optimize,
            'reason': 'Cost justifies engineering investment' if should_optimize else 'Keep using OpenAI',
            'estimated_savings': monthly_cost * 0.66  # ~66% savings with optimization
        }
    }
```

---

## Implementation Timeline

### Week 1: Usage Tracking + OpenAI Integration
- **Day 1-2:** Implement usage tracking (database, API)
- **Day 3-4:** OpenAI Realtime backend service
- **Day 5:** OpenAI Realtime frontend client
- **Day 6:** Wire to existing PAM UI
- **Day 7:** Testing, deployment to staging

### Week 2: Launch
- **Day 8:** Deploy to production
- **Day 9-14:** User testing, bug fixes, monitoring

### Month 1-3: Growth & Monitoring
- Monitor usage dashboard daily
- Focus on user acquisition and retention
- Track costs vs revenue
- Wait for optimization trigger

### When to Optimize (Decision Criteria)
```
IF:
  monthly_cost > $150 AND
  monthly_revenue > $500 AND
  daily_active_users > 50
THEN:
  Post job for experienced backend engineer
  Budget: $5,000-10,000 for optimization work
  Goal: Reduce costs by 66% (OpenAI → Claude + self-hosted)
```

### Optimization Phase (When Triggered)
1. **Hire Engineer:** Find someone with experience in:
   - Claude API optimization
   - Audio processing (TTS/STT)
   - Self-hosted services

2. **Engineer Tasks:**
   - Restore from `v1.0-CLAUDE-VOICE-COMPLETE-BACKUP-OCT-2025`
   - Finish Claude voice system (fix remaining bugs)
   - Self-host TTS/STT (Mozilla TTS, Whisper)
   - Optimize for cost (caching, batching, etc)
   - Target: $50/month operational cost

3. **Testing Phase:**
   - Run optimized system on staging
   - A/B test: 90% OpenAI, 10% optimized system
   - Verify quality, reliability, cost

4. **Migration:**
   - Gradual rollout: 50/50 → 75/25 → 100% optimized
   - Keep OpenAI as fallback for 1 month
   - Monitor for regressions

---

## Files to Create/Modify

### New Files
```
backend/app/services/pam/openai_realtime_service.py
backend/app/api/v1/pam_realtime.py
backend/app/models/usage_tracking.py
backend/app/api/v1/analytics.py
src/services/openaiRealtimeService.ts
docs/sql-fixes/usage_tracking.sql
```

### Modified Files
```
src/components/Pam.tsx (minimal changes - swap voice service)
backend/app/main.py (register new routes)
backend/requirements.txt (ensure openai>=1.50.0)
```

### Files to Archive (not delete)
```
src/services/voiceActivityDetection.ts → KEEP (might need for optimization)
src/lib/voiceService.ts → KEEP
backend/app/services/voice/ → KEEP
```

---

## Success Metrics

### Launch Phase (Weeks 1-4)
- ✅ Voice mode works reliably
- ✅ 40+ tools callable via voice
- ✅ Usage tracking operational
- ✅ <100ms voice latency
- ✅ 90%+ user satisfaction

### Growth Phase (Months 1-3)
- 🎯 50+ daily active users
- 🎯 5+ min avg session length
- 🎯 60%+ D7 retention
- 🎯 $150+ monthly cost (triggers optimization)
- 🎯 $500+ monthly revenue

### Optimization Trigger
```
When: Cost/Revenue ratio justifies engineering investment
Action: Hire engineer to cut costs by 66%
Result: Sustainable business with optimized costs
```

---

## Backup & Rollback Plan

### Backup Created ✅
- **Tag:** `v1.0-CLAUDE-VOICE-COMPLETE-BACKUP-OCT-2025`
- **Branch:** `staging` at commit `42a1eb8f`
- **Location:** GitHub remote
- **Contents:** Complete Claude-based system

### To Restore Backup
```bash
git checkout v1.0-CLAUDE-VOICE-COMPLETE-BACKUP-OCT-2025
git checkout -b optimize-claude-system
# Engineer works from here
```

### To Rollback OpenAI Launch (if needed)
```bash
git checkout staging
git revert <openai-commits>
git push origin staging
```

---

## Cost Projections

### Scenario 1: Small Scale (50 users)
- **Usage:** 5 min/day/user = 250 min/day = 7,500 min/month
- **OpenAI Cost:** ~$375/month
- **Revenue Needed:** $500/month = $10/user/month
- **Decision:** Stay on OpenAI (not worth optimizing yet)

### Scenario 2: Medium Scale (200 users)
- **Usage:** 5 min/day/user = 1,000 min/day = 30,000 min/month
- **OpenAI Cost:** ~$1,500/month
- **Optimized Cost:** ~$500/month (Claude + self-hosted)
- **Savings:** $1,000/month = $12,000/year
- **Decision:** OPTIMIZE NOW (pay engineer $10k, ROI in 10 months)

### Scenario 3: Large Scale (1,000 users)
- **Usage:** 5 min/day/user = 5,000 min/day = 150,000 min/month
- **OpenAI Cost:** ~$7,500/month
- **Optimized Cost:** ~$2,500/month (Claude + self-hosted)
- **Savings:** $5,000/month = $60,000/year
- **Decision:** Must optimize (ROI in 2 months)

---

## Next Steps

1. ✅ **Backup created** - `v1.0-CLAUDE-VOICE-COMPLETE-BACKUP-OCT-2025` in GitHub
2. ⏳ **Build usage tracking** - Start here (most important for decision-making)
3. ⏳ **Implement OpenAI Realtime** - Backend + Frontend
4. ⏳ **Deploy to staging** - Test thoroughly
5. ⏳ **Launch to production** - Get users!
6. ⏳ **Monitor dashboard** - Wait for optimization trigger
7. ⏳ **Hire engineer** - When cost justifies it
8. ⏳ **Swap to optimized** - When ready

---

**Remember:**
- Launch fast with OpenAI (amazing quality, zero engineering)
- Track everything from day 1 (data drives decisions)
- Optimize when profitable (let revenue pay for engineering)
- Keep backup safe (restore and finish later)

This is a **smart business strategy**, not a technical compromise.
