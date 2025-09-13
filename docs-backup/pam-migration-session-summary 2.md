# PAM Migration Session Summary - January 7, 2025

## Session Context
This document summarizes the PAM (Personal AI Mobility Assistant) migration planning and Phase 0 baseline establishment work completed in this session.

## Background
**Objective**: Migrate PAM from complex WebSocket architecture (40% failure rate, 3000+ lines) to Vercel AI SDK (95%+ reliability, ~500 lines)

**Current State**: 
- PAM working in production with microphone permissions fixed
- Staging environment issues resolved
- Git branches properly merged (staging → main)
- Backup created: `backup-2025-01-07-before-ai-sdk`

## Work Completed

### ✅ Phase 0.1: Baseline Metrics (COMPLETED)
**Files Modified**:
- `src/lib/sentry.ts` - Enhanced with PAM-specific tracking
- `src/components/Pam.tsx` - Integrated baseline metrics tracking

**Tracking Added**:
```typescript
// WebSocket connection tracking
trackPAMMetrics.websocketConnection(success, latency, attempt);

// Message response tracking  
trackPAMMetrics.messageResponse(responseTime, success, messageType);

// Voice processing tracking
trackPAMMetrics.voiceProcessing(stage, duration, success);

// Baseline counters
trackPAMMetrics.baseline.record('message' | 'connection_failure' | 'voice_failure');
```

**Metrics Captured**:
- WebSocket connection success/failure rates
- Message response times and success rates  
- Voice processing performance (STT, processing, TTS)
- Daily message counts and failure statistics

### ✅ Phase 0.2: Cost & Quota Analysis (COMPLETED)
**File Created**: `docs/pam-migration-cost-analysis.md`

**Key Findings**:
- **Current Costs**: $152-715/month (WebSocket + Claude API)
- **Projected Costs**: $50-145/month (Vercel AI SDK + optimized models)
- **Potential Savings**: Up to 79% cost reduction
- **Reliability Jump**: 40% → 95% success rate
- **Code Reduction**: 3000 → 500 lines (83% less complexity)

**Recommended Strategy**:
- Primary: Claude-3-Haiku for cost efficiency ($0.53-16/month)
- Fallback: GPT-4-Turbo for complex queries  
- Smart model selection based on query complexity
- Real-time cost monitoring with circuit breakers

**API Quotas Verified**:
- Anthropic Claude: 5K tokens/min (scalable to 400K)
- OpenAI GPT-4: 500 TPM (scalable to 2M)
- Vercel AI SDK: $20/month Pro plan recommended

## Current PAM Usage Patterns Identified

### Message Sources (from codebase analysis):
1. **WinsOverview.tsx**:43 - Auto financial summary requests
2. **ExpenseInput.tsx**:19 - Expense logging (`"Log expense: ${text}"`)
3. **PAMTripIntegration.tsx**:102,121,132 - Trip context and voice commands
4. **Pam.tsx**:2323,2447,2696 - Interactive chat (voice/text)

### Estimated Usage:
- **Daily Active Users**: 50-100 (early stage)
- **Messages per User/Day**: 5-15 average
- **Daily Volume**: 250-1,500 messages
- **Voice vs Text**: 60% voice, 40% text

## Technical Analysis

### Current WebSocket Architecture Issues:
- Complex connection management (40% failure rate)
- Manual message handling and state management
- Voice processing pipeline with multiple fallbacks
- 3000+ lines of complex WebSocket code

### Vercel AI SDK Benefits:
- Built-in streaming with useChat hook
- Automatic retry and error handling  
- Server-Sent Events (more reliable than WebSocket)
- Type-safe API with React integration

### Key Files to Migrate:
- `src/components/Pam.tsx` (3000+ lines) → Simplified with useChat
- `src/hooks/usePamWebSocketConnection.ts` → Replace with useChat
- Remove WebSocket connection management complexity

## Migration Plan Status

### Phase 0 Progress:
- ✅ **0.1 Baseline Metrics**: Sentry tracking implemented
- ✅ **0.2 Cost Analysis**: Comprehensive analysis completed  
- 🔄 **0.3 Proof of Concept**: READY TO START
- ⏳ **0.4 Feature Flags**: Pending

### Remaining Phase 0 Tasks:
1. **PoC Implementation**: Create minimal Vercel AI SDK integration
2. **Feature Flag Setup**: Gradual rollout mechanism
3. **A/B Testing Framework**: Compare old vs new systems

### Next Phase Tasks (Phase 1):
- Replace WebSocket with Vercel AI SDK useChat hook
- Implement streaming responses with better UX
- Add intelligent model selection (Haiku/GPT-4-Turbo/Claude-Opus)
- Real-time cost monitoring integration

## Key Dependencies

### Environment Variables Needed:
```bash
# Current (keep for fallback)
VITE_PAM_WEBSOCKET_URL=wss://backend.wheels-wins.com/ws/pam

# New for Vercel AI SDK  
VITE_OPENAI_API_KEY=sk-...
VITE_ANTHROPIC_API_KEY=sk-...
VITE_AI_MODEL_PRIMARY=claude-3-haiku-20240307
VITE_AI_MODEL_FALLBACK=gpt-4-turbo
VITE_COST_MONITORING_ENABLED=true
```

### New Dependencies to Add:
```json
{
  "ai": "^3.0.0",
  "@ai-sdk/openai": "^0.0.20",  
  "@ai-sdk/anthropic": "^0.0.15",
  "swr": "^2.2.4"
}
```

## Risk Assessment

### Technical Risks: ✅ LOW
- Vercel AI SDK is production-proven
- Gradual migration with feature flags
- Fallback to current WebSocket system

### Financial Risks: ✅ LOW  
- Cost monitoring with circuit breakers
- Pay-as-you-go scales naturally
- Significant projected savings

### Business Risks: ✅ POSITIVE
- 55% reliability improvement
- 83% code reduction enables faster development
- Better streaming UX with perceived performance gains

## Recommended Next Steps

1. **Start Fresh Context**: ✅ Create this summary document
2. **Phase 0.3 PoC**: Implement minimal Vercel AI SDK integration
3. **Feature Flags**: Set up gradual rollout system
4. **Validation**: A/B test new system against baseline metrics
5. **Full Migration**: Execute Phases 1-6 based on PoC results

## Important Notes

### Baseline Metrics Collection:
- Sentry integration is now capturing PAM performance data
- Use this data to validate migration improvements
- Monitor for 1-2 weeks before full migration

### Cost Control Measures:
- Daily budget: $50/day recommended  
- Monthly budget: $1000/month with alerts at 70%/90%
- Rate limiting: 10 messages/day for free users
- Fallback to cheaper models when budget exceeded

### Git Branch Strategy:
- `main` - Production ready code  
- `backup-2025-01-07-before-ai-sdk` - Pre-migration backup
- `feature/vercel-ai-sdk-migration` - New migration branch

## Files Created/Modified This Session

### New Files:
- `docs/pam-migration-cost-analysis.md` - Comprehensive cost analysis
- `docs/pam-migration-session-summary.md` - This summary document

### Modified Files:
- `src/lib/sentry.ts` - Added PAM metrics tracking (lines 98-186)
- `src/components/Pam.tsx` - Integrated baseline tracking calls

### Key Code Locations:
- PAM WebSocket connection: `src/components/Pam.tsx:2323`
- Message handling: `src/components/Pam.tsx:2447,2696`
- Sentry metrics: `src/lib/sentry.ts:98-186`
- Cost calculations: `backend/app/services/ai/anthropic_provider.py:55-57`

## Success Criteria

### Phase 0 Success:
- ✅ Baseline metrics collection active
- ✅ Cost analysis completed  
- 🎯 PoC demonstrates 95%+ reliability
- 🎯 Feature flags working for gradual rollout

### Migration Success:
- Response reliability: 40% → 95%+ 
- Code complexity: 3000 → 500 lines
- Costs: $152-715 → $50-145/month
- User experience: Streaming responses with better perceived performance

---

**Status**: Phase 0.1 and 0.2 complete. Ready to start Phase 0.3 (Proof of Concept) in fresh context window.

**Next Session**: Implement minimal Vercel AI SDK integration with feature flags for A/B testing against current WebSocket system.