# PAM 2.0 Integration Architecture

## Research Summary

Based on analysis of the existing codebase, the following features need to be integrated into PAM 2.0:

### 1. Voice Integration (TTS/STT)
**Current Implementation:**
- Multiple TTS engines with fallback chain (ElevenLabs → Edge TTS → System TTS)
- STT service with streaming support
- Voice settings management and optimization
- Redis caching for TTS responses
- Circuit breaker pattern for resilience

**Key Files:**
- `backend/app/services/tts/manager.py` - TTS orchestration
- `backend/app/services/stt/manager.py` - STT orchestration
- Voice quality monitoring and error handling

### 2. MCP (Model Context Protocol) Integration
**Current Implementation:**
- MCP configuration in AI orchestrator
- Support for Anthropic provider with MCP tools
- Tool registry integration for function calling
- Direct Supabase access via MCP

**Key Features:**
- Direct database operations bypassing RLS
- File system access
- GitHub integration
- Memory/context preservation

### 3. Advanced AI Features
**Current Implementation:**
- Multi-provider AI orchestration (Gemini, Claude, OpenAI)
- Intelligent conversation management
- Domain-specific nodes (wheels, wins, social, memory, etc.)
- Context management with memory persistence
- Performance tracking and metrics
- Adaptive response modes (text, voice, multimodal)

## Integration Plan for PAM 2.0

### Phase 1: Voice Service Module
Create a new voice service that integrates TTS and STT capabilities:

```python
pam_2/services/voice_service.py
- VoiceEngine class with TTS/STT integration
- Support for multiple providers (ElevenLabs, Edge TTS, System)
- Streaming capabilities for real-time voice
- Voice settings and preferences management
```

### Phase 2: MCP Integration Module
Add MCP protocol support for enhanced capabilities:

```python
pam_2/integrations/mcp_client.py
- MCPClient class for protocol handling
- Tool registration and execution
- Direct database operations
- Context preservation across sessions
```

### Phase 3: Advanced Features Module
Implement advanced AI capabilities:

```python
pam_2/services/advanced_features.py
- Multi-modal processing
- Proactive suggestions
- Domain-specific intelligence
- Adaptive response generation
```

## Architecture Diagram

```
PAM 2.0 Enhanced Architecture
┌─────────────────────────────────────────────────────┐
│                    API Layer                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │  REST   │ │WebSocket│ │  Voice  │ │   MCP   │  │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘  │
└───────┼───────────┼───────────┼───────────┼────────┘
        │           │           │           │
┌───────▼───────────▼───────────▼───────────▼────────┐
│                 Core Services Layer                  │
│  ┌──────────────────────────────────────────────┐  │
│  │        Conversational Engine (Gemini)        │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │          Context Manager (Redis)             │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │      NEW: Voice Service (TTS/STT)           │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │      NEW: Advanced Features Service          │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │           Trip Logger Service                │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │         Savings Tracker Service              │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │          Safety Layer Service                │  │
│  └──────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
        │           │           │           │
┌───────▼───────────▼───────────▼───────────▼────────┐
│                Integration Layer                     │
│  ┌──────────────────────────────────────────────┐  │
│  │         Google Gemini 1.5 Flash              │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │              Redis Cache                     │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │      NEW: MCP Protocol Client                │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │      NEW: Voice Providers (Multi)            │  │
│  └──────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

## Implementation Priority

1. **Voice Service** (High Priority)
   - Essential for production parity
   - Direct user experience impact
   - Already has proven patterns from existing code

2. **MCP Integration** (Medium Priority)
   - Enhances capabilities significantly
   - Enables direct database operations
   - Provides tool execution framework

3. **Advanced Features** (Lower Priority)
   - Nice-to-have enhancements
   - Can be added incrementally
   - Focus on most impactful features first

## Next Steps

1. Implement Voice Service Module
2. Add MCP Protocol Integration
3. Implement Advanced Features
4. Update Tests
5. Update Deployment Configuration