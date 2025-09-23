# PAM 2.0 Implementation Guide

## Overview
This guide provides step-by-step instructions for implementing PAM 2.0 following the modular architecture and phase-based approach.

## Quick Start for Coder/Codex

### 1. Verify Current Structure
```bash
# Check that PAM 2.0 structure is in place
ls -la backend/app/services/pam_2/

# Should show:
# - core/          (types, exceptions, config)
# - services/      (5 modular services)
# - api/           (routes, models, websocket)
# - integrations/  (gemini, mcp, redis)
# - middleware/    (guardrails, rate limiting)
# - tests/         (test suite)
# - docs/          (this guide)
```

### 2. Current Implementation Status

#### ✅ Phase 1: Complete (Ready for use)
- [x] Directory structure established
- [x] Core types and configuration system
- [x] 5 service stubs with clear interfaces
- [x] Enhanced API router with service integration
- [x] WebSocket handler framework
- [x] Health check endpoints
- [x] Safety and error handling

#### 🔄 Phase 2: Next Priority (Conversational Engine)
- [ ] Google Gemini 1.5 Flash integration
- [ ] Content safety guardrails middleware
- [ ] Redis rate limiting implementation

### 3. Implementation Phases

#### Phase 2: Conversational Engine (Priority 1)
**Goal**: Integrate Google Gemini 1.5 Flash as primary AI provider

**Tasks**:
1. **Install Gemini SDK**: `pip install google-generativeai`
2. **Complete `integrations/gemini.py`**:
   - Implement `initialize()` method
   - Complete `_call_gemini_api()` method
   - Add proper error handling and retries
3. **Update `services/conversational_engine.py`**:
   - Initialize Gemini client in constructor
   - Replace placeholder responses with Gemini calls
   - Add conversation context formatting
4. **Test integration**:
   - Set `GEMINI_API_KEY` in environment
   - Test `/api/v1/pam-2/chat` endpoint
   - Verify responses from Gemini

**Files to modify**:
- `integrations/gemini.py` (lines 45-80, 95-140)
- `services/conversational_engine.py` (lines 70-85, 95-120)

#### Phase 3: Context Manager (Priority 2)
**Goal**: Implement hybrid memory system (Redis + Supabase pgvector)

**Tasks**:
1. **Setup Redis**: Configure Redis connection in `integrations/redis_client.py`
2. **Setup Supabase pgvector**: Create vector embeddings for conversations
3. **Implement context persistence** in `services/context_manager.py`
4. **Add semantic search** for conversation history

#### Phase 4: Trip Logger (Priority 3)
**Goal**: Passive trip activity detection and logging

**Tasks**:
1. **Enhance NLP detection** in `services/trip_logger.py`
2. **Setup Supabase logging** for trip activities
3. **Implement trip insights** generation
4. **Add trip assistance suggestions**

#### Phase 5: Savings Tracker (Priority 4)
**Goal**: Financial analysis and savings recommendations

**Tasks**:
1. **Complete financial analysis** in `services/savings_tracker.py`
2. **Integrate with Supabase financial data**
3. **Implement savings calculations**
4. **Add budget recommendations**

#### Phase 6: Real-time Sync (Priority 5)
**Goal**: WebSocket-based real-time updates

**Tasks**:
1. **Complete WebSocket handlers** in `api/websocket.py`
2. **Implement database change notifications**
3. **Add frontend synchronization**

#### Phase 7: Safety Layer (Priority 6)
**Goal**: Production-ready guardrails and rate limiting

**Tasks**:
1. **Implement Redis rate limiting** in `services/safety_layer.py`
2. **Add content filtering patterns**
3. **Setup incident logging**
4. **Add compliance reporting**

## Development Environment Setup

### 1. Environment Variables
```bash
# Required for Phase 2+
export GEMINI_API_KEY="your-gemini-api-key"
export SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export REDIS_URL="redis://localhost:6379"

# Optional
export PAM2_DEBUG_MODE="true"
export PAM2_MOCK_AI_RESPONSES="false"
```

### 2. Dependencies
```bash
# Core dependencies (already in requirements.txt)
pip install fastapi uvicorn pydantic pydantic-settings

# Phase 2: Gemini integration
pip install google-generativeai

# Phase 3: Redis and vector operations
pip install redis numpy

# Phase 4+: Additional ML libraries
pip install scikit-learn sentence-transformers
```

### 3. Database Setup
```sql
-- Phase 3: Context management tables
CREATE TABLE IF NOT EXISTS pam_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    session_id TEXT NOT NULL,
    messages JSONB NOT NULL,
    current_topic TEXT,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 4: Trip activity logging
CREATE TABLE IF NOT EXISTS pam_trip_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    activity_type TEXT NOT NULL,
    confidence FLOAT NOT NULL,
    entities JSONB,
    message_content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 7: Guardrails configuration
CREATE TYPE safety_level AS ENUM ('low', 'medium', 'high');
CREATE TABLE IF NOT EXISTS pam_guardrails_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    safety_level safety_level DEFAULT 'medium',
    rate_limit_messages_per_hour INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Testing Strategy

### 1. Unit Tests
```bash
# Run individual service tests
pytest backend/app/services/pam_2/tests/test_conversational_engine.py
pytest backend/app/services/pam_2/tests/test_context_manager.py
# ... etc for each service
```

### 2. Integration Tests
```bash
# Test API endpoints
curl -X POST http://localhost:8000/api/v1/pam-2/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test-123", "message": "Plan a trip to Paris"}'

# Test WebSocket
wscat -c ws://localhost:8000/api/v1/pam-2/chat/ws/test-123
```

### 3. Health Checks
```bash
# Overall health
curl http://localhost:8000/api/v1/pam-2/health

# Service-specific health
curl http://localhost:8000/api/v1/pam-2/debug/services
```

## Common Implementation Patterns

### 1. Service Interface Pattern
All services follow this pattern:
```python
class ServiceName:
    def __init__(self):
        # Initialize configuration and dependencies

    async def main_method(self, user_id: str, data: Any) -> ServiceResponse:
        # Main service logic

    async def get_service_health(self) -> Dict[str, Any]:
        # Health check implementation
```

### 2. Error Handling Pattern
```python
try:
    # Service logic
    return ServiceResponse(success=True, data=result)
except SpecificServiceError as e:
    logger.error(f"Service error: {e}")
    raise
except Exception as e:
    logger.error(f"Unexpected error: {e}")
    raise ServiceError(f"Failed to process: {str(e)}")
```

### 3. Configuration Access Pattern
```python
from ..core.config import pam2_settings

# Access configuration
config = pam2_settings.get_gemini_config()
api_key = config.api_key
```

## Performance Guidelines

### 1. Response Time Targets
- Chat responses: < 500ms (target: 200ms)
- Health checks: < 100ms
- WebSocket messages: < 200ms

### 2. Scalability Considerations
- Each service should handle 100+ concurrent requests
- Redis caching for frequently accessed data
- Database connection pooling
- Async/await throughout

### 3. Memory Management
- Limit conversation context to 50 messages
- Use streaming for large responses
- Clean up expired sessions regularly

## Security Guidelines

### 1. API Key Management
- Never log API keys
- Use environment variables only
- Rotate keys regularly

### 2. Rate Limiting
- 100 messages/hour per user (configurable)
- Burst limit: 10 messages/minute
- IP-based limiting for abuse prevention

### 3. Content Safety
- All user input through safety layer
- AI responses filtered for harmful content
- Incident logging for violations

## Troubleshooting

### Common Issues

1. **Import Errors**: Check Python path and dependencies
2. **Configuration Errors**: Verify environment variables
3. **Database Connection**: Check Supabase credentials
4. **API Rate Limits**: Monitor Gemini usage
5. **WebSocket Issues**: Check connection handling

### Debug Endpoints

```bash
# Check configuration
curl http://localhost:8000/api/v1/pam-2/debug/config

# Check service status
curl http://localhost:8000/api/v1/pam-2/debug/services
```

## Next Steps

1. **Start with Phase 2**: Implement Gemini integration first
2. **Test incrementally**: Test each phase before moving to next
3. **Monitor performance**: Use health checks and logging
4. **Iterate on feedback**: Refine based on testing results

## Support Resources

- **Documentation**: `docs/phase_guides/` for detailed phase instructions
- **API Reference**: `docs/api_contracts/` for endpoint specifications
- **Testing Guide**: `docs/testing/` for comprehensive testing strategies
- **GitHub Issues**: Report issues and track progress

Built with ❤️ following the original PAM 2.0 Build Playbook