# Production PAM System Inventory
**Date:** September 30, 2025
**Environment:** Staging + Production
**Backend:** pam-backend.onrender.com
**Branch:** staging

## ✅ Currently Active Code (DO NOT DELETE)

### Backend (Production)

#### Core API
- `backend/app/api/v1/pam.py` - **PRIMARY WebSocket endpoint** (~4000 lines)
- `backend/app/api/v1/pam_2.py` - PAM 2.0 alternative endpoint

#### PAM 2.0 Services (OpenAI GPT-5)
- `backend/app/services/pam_2/` - **Active PAM 2.0 implementation**
  - `services/conversational_engine.py` - Main conversation handler
  - `services/memory_service.py` - Context and memory
  - `services/prompt_service.py` - Prompt engineering
  - `services/multimodal_service.py` - Image analysis
  - `services/user_location_service.py` - Location context
  - `core/config.py` - Configuration
  - `core/types.py` - Type definitions
  - `integrations/tool_bridge.py` - Function calling bridge

#### Active AI Services
- `backend/app/services/pam/simple_openai_service.py` - **PRIMARY OpenAI integration**
- `backend/app/services/pam/tools/` - **Active function calling tools**
  - `load_user_profile.py`
  - `mapbox_tool.py`
  - `weather_tool.py`
  - `load_recent_memory.py`
  - Plus ~35 more tools

#### Voice Pipeline (Reusable)
- `backend/app/services/voice/edge_processing_service.py`
- `backend/app/voice/stt_whisper.py`
- `backend/app/services/tts/` - All TTS services
- `backend/app/services/stt/` - Speech-to-text services

#### Core Infrastructure
- `backend/app/core/websocket_manager.py` - Connection management
- `backend/app/core/websocket_keepalive.py` - Keep-alive handler
- `backend/app/services/financial_context_service.py` - Budget integration

---

### Frontend (Production)

#### Primary Service
- `src/services/pamService.ts` - **PRIMARY PAM service** (~400+ lines)

#### Active WebSocket Hook
- `src/hooks/pam/usePamWebSocketCore.ts` - **PRODUCTION WebSocket hook**

#### UI Component
- `src/components/pam/SimplePAM.tsx` - **Current PAM UI**

#### Utilities
- `src/utils/pamLocationContext.ts` - Location context utilities
- `src/lib/logger.ts` - Logging for PAM

---

## 🗑️ To Be Deprecated After Hybrid Launch

### Backend

#### Old Backup Directory (Already Dead)
- `backend/app/services/pam_old_backup/` - **CAN DELETE** (redundant archive)

#### Duplicate/Unused Services
- `backend/app/services/pam/agentic_orchestrator.py`
- `backend/app/services/pam/graph_enhanced_orchestrator.py`
- `backend/app/services/pam/enhanced_orchestrator.py`
- `backend/app/services/pam/unified_orchestrator.py`
- `backend/app/services/pam/intelligent_conversation.py`
- `backend/app/services/pam/advanced_context.py`

### Frontend

#### Duplicate WebSocket Implementations (Deprecate)
- `src/hooks/pam/usePamWebSocket.ts` - Old version
- `src/hooks/pam/usePamWebSocketConnection.ts` - Old version
- `src/hooks/pam/usePamWebSocketV2.ts` - Old version

#### Duplicate Components
- `src/components/pam/Pam.tsx` - Keep SimplePAM.tsx instead
- `src/components/pam/PamAssistant.tsx` - Redundant

#### Unused Services
- `src/services/pamApiOptimized.ts`
- `src/services/pamAgenticService.ts`
- `src/services/pamConnectionService.ts`
- `src/services/pamHealthCheck.ts`
- `src/services/pamFeedbackService.ts`
- `src/services/pamCalendarService.ts`
- `src/services/pamSavingsService.ts`

#### Specialized Hooks (Functionality moving to agents)
- `src/hooks/pam/usePamTripIntegration.ts`
- `src/hooks/pam/usePamCalendarIntegration.ts`
- `src/hooks/pam/usePamExpenseIntegration.ts`
- `src/hooks/pam/usePamMessageHandler.ts`
- `src/hooks/pam/usePamUIActions.ts`
- `src/hooks/pam/usePamVisualControl.ts`
- `src/hooks/pam/usePamErrorRecovery.ts`

---

## 🔄 Reusable Components for Hybrid System

### Voice Pipeline (Copy, Don't Move)
```
backend/app/services/voice/
backend/app/voice/stt_whisper.py
backend/app/services/tts/
```
**Status:** Working perfectly, copy as-is to new system

### Tools (Function Calling)
```
backend/app/services/pam/tools/
```
**Status:** Excellent tools (~40 functions), reuse with new agents

### Database Integration
```
backend/app/core/supabase.py
backend/app/services/financial_context_service.py
```
**Status:** Database access patterns work well

### Location Context
```
src/utils/pamLocationContext.ts
```
**Status:** Useful utility, copy to new frontend

---

## 📊 File Count Summary

**Before Cleanup:**
- Backend PAM files: 54
- Frontend PAM files: 63
- **Total: 117 files**

**After Cleanup (Estimated):**
- Backend production: ~20 files
- Frontend production: ~10 files
- Voice/Tools (reusable): ~15 files
- **Total: ~45 active files**

**Space Savings:** ~60% reduction

---

## 🔒 Critical: Do Not Delete

**These are ACTIVELY USED in production:**

1. `backend/app/api/v1/pam.py` - WebSocket endpoint
2. `backend/app/services/pam_2/` - Current PAM 2.0 system
3. `backend/app/services/pam/simple_openai_service.py` - AI service
4. `backend/app/services/pam/tools/` - Function calling
5. `backend/app/services/voice/` - Voice pipeline
6. `backend/app/services/tts/` - Text-to-speech
7. `src/services/pamService.ts` - Frontend service
8. `src/hooks/pam/usePamWebSocketCore.ts` - WebSocket hook
9. `src/components/pam/SimplePAM.tsx` - UI component

**Deleting these WILL break production!**

---

## 📅 Cleanup Timeline

**Phase 1 (Today):** Archive old code ✅
**Phase 2 (Today):** Remove pam_old_backup/ ⏳
**Phase 3 (Today):** Remove duplicate WebSocket implementations ⏳
**Phase 4 (After Hybrid Launch):** Remove all remaining old code

---

*This inventory was generated before the PAM hybrid migration to ensure no production code is accidentally deleted.*