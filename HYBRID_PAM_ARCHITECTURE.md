# PAM Hybrid Architecture - GPT-4o-mini + Claude Agent SDK

**Version:** 3.0 Hybrid
**Date:** September 30, 2025
**Cost Savings:** 77-90% reduction from GPT-5 system

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                        │
├─────────────────────────────────────────────────────────────┤
│                    PAM Frontend (GPT-4o-mini)                │
│                  - Voice Interface (STT/TTS)                 │
│                  - Natural Conversation Handler               │
│                  - WebSocket Client                          │
├─────────────────────────────────────────────────────────────┤
│                    WebSocket Gateway                         │
│                  - Complexity Router                         │
│                  - Request Classifier                        │
│                  - Response Aggregator                       │
├─────────────────────────────────────────────────────────────┤
│                 Claude Agent SDK Orchestrator                │
│                  - Agent Lifecycle Manager                   │
│                  - Tool Registry                             │
│                  - Context Manager                           │
├─────────────────────────────────────────────────────────────┤
│                    5 Claude Page Agents                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│  │Dashboard │ │  Budget  │ │   Trip   │ │Community │ │  Shop    │
│  │  Agent   │ │  Agent   │ │  Agent   │ │  Agent   │ │  Agent   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
└─────────────────────────────────────────────────────────────┘
```

## Core Design Principles

### 1. Complexity-Based Routing
- **Simple queries** → GPT-4o-mini ($0.075/1M tokens)
- **Complex tasks** → Claude Agent SDK ($3/1M tokens)
- **Dynamic routing** based on intent classification

### 2. Cost Optimization Strategy
```
Current (GPT-5):     $1.25/1M input + $10/1M output
Hybrid (GPT-4o-mini): $0.075/1M input + $0.30/1M output (95% queries)
Hybrid (Claude):      $3/1M input + $15/1M output (5% queries)

Expected Cost Reduction: 77-90%
```

### 3. Agent Specialization
Each Claude agent is an expert in one domain:
- **Dashboard Agent**: Overview, metrics, quick actions
- **Budget Agent**: Financial analysis, expense tracking, budget optimization
- **Trip Agent**: Route planning, RV park recommendations, travel logistics
- **Community Agent**: Social features, content moderation, user engagement
- **Shop Agent**: Product recommendations, purchase history, inventory

## System Components

### Frontend: GPT-4o-mini Conversational Layer

**Purpose**: Fast, cost-effective natural language interface

**Capabilities**:
- Voice input/output (existing STT/TTS)
- Simple Q&A ("What's my balance?")
- Navigation ("Show me my trips")
- Greetings and small talk
- Context awareness
- Response streaming

**Implementation**:
```typescript
// src/services/pam/gpt4oMiniService.ts
- OpenAI SDK integration
- Streaming responses
- Context management
- Voice synthesis integration
```

**When to use**:
- Conversational queries
- Simple lookups
- Navigation requests
- General assistance

### WebSocket Gateway

**Purpose**: Intelligent routing between GPT-4o-mini and Claude agents

**Components**:
1. **Complexity Router**
   - Analyzes incoming messages
   - Determines complexity level
   - Routes to appropriate handler

2. **Request Classifier**
   - Intent detection
   - Domain identification
   - Urgency assessment

3. **Response Aggregator**
   - Combines multi-agent responses
   - Handles streaming from both systems
   - Error recovery

**Implementation**:
```python
# backend/app/services/pam_hybrid/
- gateway.py - Main routing logic
- classifier.py - Intent classification
- router.py - Complexity-based routing
```

**Routing Logic**:
```python
if complexity == "simple":
    # Handle with GPT-4o-mini (95% of queries)
    return await frontend_handler(message)
elif complexity == "complex":
    # Route to appropriate Claude agent (5% of queries)
    agent = select_agent(domain)
    return await agent.execute(task)
```

### Claude Agent SDK Orchestrator

**Purpose**: Manage lifecycle and coordination of specialized agents

**Responsibilities**:
- Agent initialization and teardown
- Tool registration and sharing
- Context synchronization
- Error handling and recovery
- Resource management

**Implementation**:
```python
# backend/app/services/pam_hybrid/orchestrator.py
from anthropic import Anthropic

class AgentOrchestrator:
    def __init__(self):
        self.agents = {}
        self.tool_registry = ToolRegistry()
        self.context_manager = ContextManager()

    async def route_to_agent(self, domain: str, task: dict):
        agent = self.agents.get(domain)
        return await agent.execute(task)
```

**Features**:
- Dynamic agent loading
- Shared tool access (40+ existing tools)
- Context preservation
- Performance monitoring

### 5 Specialized Claude Agents

#### 1. Dashboard Agent
**Domain**: Overview and quick actions
**Tools**: `load_user_profile`, `load_recent_memory`, `get_dashboard_metrics`
**Capabilities**:
- User status overview
- Recent activity summary
- Quick financial insights
- Navigation assistance

#### 2. Budget Agent
**Domain**: Financial management
**Tools**: `load_expenses`, `analyze_budget`, `predict_spending`, `optimize_budget`
**Capabilities**:
- Expense analysis
- Budget optimization
- Spending predictions
- Financial advice
- Receipt processing

#### 3. Trip Agent
**Domain**: Travel planning
**Tools**: `mapbox_tool`, `weather_tool`, `rv_park_search`, `route_optimization`
**Capabilities**:
- Route planning
- RV park recommendations
- Weather forecasts
- Travel cost estimation
- Itinerary management

#### 4. Community Agent
**Domain**: Social features
**Tools**: `load_user_connections`, `content_moderation`, `post_management`
**Capabilities**:
- Social feed management
- Content moderation
- User recommendations
- Community engagement
- Trip sharing

#### 5. Shop Agent
**Domain**: E-commerce
**Tools**: `product_search`, `purchase_history`, `recommendations`
**Capabilities**:
- Product recommendations
- Purchase tracking
- Inventory management
- Order processing
- Digistore24 integration

## Request Flow

### Simple Query Example
```
User: "What's my current balance?"
  ↓
WebSocket Gateway (classify: simple)
  ↓
GPT-4o-mini Handler
  ↓
Tool Call: load_user_profile()
  ↓
Response: "Your current balance is $1,245.30"
  ↓
Stream to Frontend
```

### Complex Task Example
```
User: "Plan a 2-week RV trip from SF to Seattle under $2000"
  ↓
WebSocket Gateway (classify: complex)
  ↓
Complexity Router → Trip Agent
  ↓
Claude Agent SDK
  ├─ Route planning (mapbox)
  ├─ Budget analysis (budget tools)
  ├─ Weather checking (weather tools)
  ├─ RV park search (mapbox)
  └─ Cost estimation (budget tools)
  ↓
Aggregate Response
  ↓
Stream to Frontend
```

## Implementation Plan

### Phase 1: Foundation (Week 1-2)
- [ ] Set up Claude Agent SDK
- [ ] Create orchestrator framework
- [ ] Implement complexity classifier
- [ ] Build WebSocket gateway router

### Phase 2: Agents (Week 3-4)
- [ ] Implement Dashboard Agent
- [ ] Implement Budget Agent
- [ ] Implement Trip Agent
- [ ] Implement Community Agent
- [ ] Implement Shop Agent

### Phase 3: Frontend (Week 5)
- [ ] Integrate GPT-4o-mini service
- [ ] Update WebSocket client
- [ ] Add streaming support
- [ ] Voice integration

### Phase 4: Testing & Optimization (Week 6)
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Cost monitoring
- [ ] User acceptance testing

## Technology Stack

### Backend
- **Python 3.11+**
- **Anthropic Claude SDK** (`anthropic>=0.40.0`)
- **OpenAI SDK** (`openai>=1.50.0`) for GPT-4o-mini
- **FastAPI** (existing)
- **WebSockets** (existing)
- **Redis** (existing, for caching)

### Frontend
- **TypeScript** (existing)
- **OpenAI SDK** (for GPT-4o-mini)
- **WebSocket API** (existing)
- **React** (existing)

### Shared
- **40+ existing tools** from `backend/app/services/pam/tools/`
- **Voice pipeline** (Edge TTS + Whisper STT)
- **Supabase** (database)

## Migration Strategy

### Phase 0: Preparation ✅
- [x] Backup existing system
- [x] Archive old code
- [x] Document production files

### Phase 1: Parallel Deployment
1. Deploy hybrid system alongside existing GPT-5 system
2. A/B test with 10% of users
3. Monitor costs and performance
4. Gradual rollout to 50%, then 100%

### Phase 2: Sunset GPT-5
1. Disable GPT-5 routing
2. Remove GPT-5 dependencies
3. Archive GPT-5 code
4. Update documentation

## Cost Analysis

### Current System (GPT-5)
```
Avg query: 500 input tokens, 150 output tokens
Cost per query: $0.00063 + $0.0015 = $0.00213
Monthly (100K queries): $213
```

### Hybrid System
```
Simple queries (95K): GPT-4o-mini
  Cost: 95K × $0.000075 = $7.13

Complex queries (5K): Claude Sonnet 3.5
  Cost: 5K × $0.004 = $20

Monthly Total: $27.13 (87% savings!)
```

## Error Handling

### Graceful Degradation
1. Claude agent fails → GPT-4o-mini fallback
2. GPT-4o-mini fails → Claude agent fallback
3. Both fail → Cached responses
4. All fail → Friendly error message

### Monitoring
- Request latency per agent
- Cost per query
- Error rates
- User satisfaction

## Security

### API Key Management
- Claude API key in environment variables
- OpenAI API key in environment variables
- No keys in codebase
- Rotation policy: 90 days

### Access Control
- All agents share same RLS policies
- User context passed to all agents
- Tool authorization via user tokens

## Performance Targets

### Latency
- Simple queries: <500ms
- Complex tasks: <3s
- Voice roundtrip: <1.5s

### Availability
- 99.9% uptime
- Graceful degradation
- <5s failover time

### Cost
- Average cost per query: <$0.0005
- Monthly cost: <$50 for 100K queries
- 80%+ cost reduction from current

## Success Metrics

### User Experience
- Response time: <1s average
- Voice quality: >4.5/5 stars
- Task completion rate: >95%

### Business
- Cost reduction: >75%
- User satisfaction: >4.5/5
- Agent accuracy: >90%

### Technical
- Error rate: <1%
- Latency p95: <2s
- Cache hit rate: >60%

## Future Enhancements

### V3.1 (Q1 2026)
- Add Memory Agent for long-term context
- Implement multi-agent collaboration
- Add voice cloning for personalization

### V3.2 (Q2 2026)
- Add Proactive Agent (background monitoring)
- Implement learning from user feedback
- Add custom agent creation

### V3.3 (Q3 2026)
- Multi-modal support (images, documents)
- Real-time collaboration features
- Advanced analytics dashboard

---

**Status**: Implementation Ready
**Next Step**: Begin Phase 1 - Foundation
**Owner**: Engineering Team
**Timeline**: 6 weeks
**Budget**: ~$100/month operational cost