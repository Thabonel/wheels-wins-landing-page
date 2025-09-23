# PAM 2.0 - Modular AI Assistant Backend

## Overview
PAM 2.0 is a complete rebuild of the PAM AI assistant backend, designed with modularity, performance, and maintainability in mind. This implementation follows the original Build Playbook with Google Gemini 1.5 Flash as the primary AI provider.

## Architecture Principles
- **Modular Design**: 5 core services, each under 300 lines
- **Google Gemini Primary**: 25x cost reduction, 1M context window
- **Safety First**: Medium-level guardrails, non-intrusive but secure
- **Real-time Ready**: WebSocket synchronization for instant UI updates
- **MCP Integration**: Direct Supabase read/write for true interactivity

## Core Services

### 1. Conversational Engine (`services/conversational_engine.py`)
- **Phase 2 Implementation**
- Google Gemini 1.5 Flash integration
- Medium-level guardrails middleware
- Context-aware conversations

### 2. Context Manager (`services/context_manager.py`)
- **Phase 3 Implementation**
- Hybrid memory system (Supabase pgvector + Redis + LangGraph)
- Conversation context preservation
- User preference learning

### 3. Trip Logger (`services/trip_logger.py`)
- **Phase 4 Implementation**
- Passive trip activity detection
- Intelligent logging without interruption
- Integration with Wheels components

### 4. Savings Tracker (`services/savings_tracker.py`)
- **Phase 5 Implementation**
- Financial goal tracking
- Budget monitoring
- Savings recommendations

### 5. Safety Layer (`services/safety_layer.py`)
- **Phase 7 Implementation**
- Content filtering and moderation
- Rate limiting (Redis-based: 100 messages/hour per user)
- User safety monitoring

## Implementation Status

### ✅ Phase 1: Setup Complete
- [x] Directory structure created
- [x] Basic FastAPI router (`api/routes.py`)
- [x] Health check endpoint
- [x] Placeholder chat endpoints (REST + WebSocket)

### 🔄 Phase 2: Conversational Engine (Next)
- [ ] Google Gemini client integration
- [ ] Guardrails middleware implementation
- [ ] Chat endpoint enhancement

### 📋 Upcoming Phases
- Phase 3: Context Manager
- Phase 4: Trip Logger
- Phase 5: Savings Tracker
- Phase 6: Real-time Frontend Sync
- Phase 7: Safety Layer

## Quick Start

### Development Setup
```bash
# Install dependencies
cd backend
pip install -r requirements.txt

# Set environment variables (see .env.example)
export GEMINI_API_KEY="your-gemini-api-key"
export SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run development server
uvicorn app.main:app --reload --port 8000
```

### Testing PAM 2.0 Endpoints
```bash
# Health check
curl http://localhost:8000/api/v1/pam-2/health

# Chat endpoint
curl -X POST http://localhost:8000/api/v1/pam-2/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test-123", "message": "Hello PAM!"}'

# WebSocket (use wscat or similar)
wscat -c ws://localhost:8000/api/v1/pam-2/chat/ws
```

## File Structure
```
pam_2/
├── README.md                    # This file
├── core/                        # Core infrastructure
├── services/                    # 5 modular services
├── api/                         # API layer
├── integrations/                # External integrations
├── middleware/                  # Custom middleware
├── tests/                       # Test suite
└── docs/                        # Implementation guides
```

## Documentation
- **Implementation Guide**: `docs/implementation_guide.md`
- **Phase Guides**: `docs/phase_guides/`
- **API Contracts**: `docs/api_contracts/`
- **Testing Strategy**: `docs/testing/`

## Key Technologies
- **FastAPI**: High-performance web framework
- **Google Gemini 1.5 Flash**: Primary AI provider
- **LangGraph**: Agent framework (Klarna-proven, 85M users)
- **Supabase**: Database with pgvector for embeddings
- **Redis**: Rate limiting and caching
- **MCP Protocol**: Direct database read/write access

## Success Metrics
- Response time < 500ms (target: 200ms)
- 99.9% uptime
- Cost reduction: 25x vs Claude/OpenAI
- User safety: Medium-level guardrails
- Rate limit: 100 messages/hour per user

Built with ❤️ following the original PAM 2.0 Build Playbook