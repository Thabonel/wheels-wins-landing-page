# AI Dual Model Strategy - Claude + GPT for Wheels & Wins

## Overview
Leverage the unique strengths of both Anthropic Claude and OpenAI GPT models to create a superior user experience while optimizing costs and performance.

## 🎯 Model Assignment Strategy

### Anthropic Claude (Primary for Conversational AI)
**Best For:**
- **PAM Conversations** - Long-context trip planning discussions
- **Content Generation** - Travel blogs, itineraries, RV guides
- **Code Analysis** - Trip optimization algorithms
- **Safety & Moderation** - Community content review
- **Complex Reasoning** - Multi-step travel planning logic

### OpenAI GPT (Primary for Structured Tasks)
**Best For:**
- **Vector Embeddings** - Semantic search for trips, RV parks, products
- **Function Calling** - Route optimization, expense calculations
- **Quick Responses** - Simple Q&A, RV specs lookup
- **Data Extraction** - Parsing user inputs into structured data
- **Real-time Features** - Fast response requirements

## 🏗️ Implementation Architecture

### Backend AI Service Structure
```python
backend/app/services/ai/
├── __init__.py
├── ai_coordinator.py      # Routes requests to appropriate model
├── claude_service.py      # Anthropic Claude integration
├── openai_service.py      # OpenAI GPT integration
├── embedding_service.py   # Vector embeddings management
├── cache_service.py       # AI response caching
└── models.py             # Shared data models
```

### Frontend AI Integration
```typescript
src/services/ai/
├── index.ts              # Main AI service exports
├── aiCoordinator.ts      # Client-side request routing
├── claudeClient.ts       # Claude-specific features
├── openaiClient.ts       # OpenAI-specific features
├── types.ts              # TypeScript interfaces
└── cache.ts              # Client-side caching
```

## 📋 Specific Use Case Implementations

### 1. PAM Conversational AI (Claude)
```python
# backend/app/services/ai/claude_service.py
class ClaudeService:
    async def pam_conversation(
        self, 
        message: str, 
        user_context: Dict,
        trip_context: Dict,
        conversation_history: List[Dict]
    ) -> Dict:
        """
        Handle PAM conversations with full context awareness
        """
        system_prompt = f"""
        You are PAM, the Wheels & Wins personal AI travel assistant.
        
        User Profile:
        - Name: {user_context.get('name')}
        - RV Type: {user_context.get('rv_type')}
        - Travel Style: {user_context.get('travel_preferences')}
        
        Current Trip:
        - Destination: {trip_context.get('destination')}
        - Duration: {trip_context.get('duration')}
        - Budget: ${trip_context.get('budget')}
        
        Help the user with trip planning, RV advice, and travel recommendations.
        Be friendly, knowledgeable, and safety-conscious.
        """
        
        response = await self.anthropic_client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=4000,
            temperature=0.7,
            system=system_prompt,
            messages=conversation_history + [{"role": "user", "content": message}]
        )
        
        return {
            "response": response.content[0].text,
            "model": "claude-3.5-sonnet",
            "tokens_used": response.usage.total_tokens
        }
```

### 2. Trip & RV Park Search (OpenAI Embeddings)
```python
# backend/app/services/ai/openai_service.py
class OpenAIService:
    async def create_trip_embeddings(self, trip_data: Dict) -> List[float]:
        """
        Create embeddings for trip data for semantic search
        """
        # Combine relevant trip information
        trip_text = f"""
        {trip_data.get('title', '')}
        {trip_data.get('description', '')}
        Destinations: {', '.join(trip_data.get('destinations', []))}
        Activities: {', '.join(trip_data.get('activities', []))}
        RV Type: {trip_data.get('rv_type', '')}
        Season: {trip_data.get('season', '')}
        """
        
        response = await self.openai_client.embeddings.create(
            model="text-embedding-3-large",
            input=trip_text
        )
        
        return response.data[0].embedding
    
    async def find_similar_trips(
        self, 
        query: str,
        user_preferences: Dict,
        limit: int = 10
    ) -> List[Dict]:
        """
        Find similar trips using vector search
        """
        # Create query embedding
        query_embedding = await self.create_trip_embeddings({
            "description": query,
            **user_preferences
        })
        
        # Search in Supabase vector store
        results = await self.vector_search(
            embedding=query_embedding,
            table="trip_embeddings",
            limit=limit
        )
        
        return results
```

### 3. Route Optimization (OpenAI Function Calling)
```python
# backend/app/services/ai/openai_service.py
async def optimize_rv_route(self, route_request: Dict) -> Dict:
    """
    Use GPT-4 with function calling for route optimization
    """
    tools = [
        {
            "type": "function",
            "function": {
                "name": "calculate_route_metrics",
                "description": "Calculate optimal RV route considering size restrictions, fuel stops, and campgrounds",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "waypoints": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "location": {"type": "string"},
                                    "duration": {"type": "integer"},
                                    "activities": {"type": "array", "items": {"type": "string"}}
                                }
                            }
                        },
                        "rv_specs": {
                            "type": "object",
                            "properties": {
                                "length": {"type": "number"},
                                "height": {"type": "number"},
                                "mpg": {"type": "number"},
                                "tank_size": {"type": "number"}
                            }
                        },
                        "preferences": {
                            "type": "object",
                            "properties": {
                                "avoid_tolls": {"type": "boolean"},
                                "scenic_routes": {"type": "boolean"},
                                "max_daily_miles": {"type": "integer"}
                            }
                        }
                    }
                }
            }
        }
    ]
    
    response = await self.openai_client.chat.completions.create(
        model="gpt-4-turbo-preview",
        messages=[{
            "role": "user",
            "content": f"Optimize this RV route: {route_request}"
        }],
        tools=tools,
        tool_choice="auto"
    )
    
    return self._process_route_optimization(response)
```

### 4. AI Coordinator Pattern
```python
# backend/app/services/ai/ai_coordinator.py
class AICoordinator:
    def __init__(self):
        self.claude = ClaudeService()
        self.openai = OpenAIService()
        self.cache = AICache()
    
    async def process_request(self, request_type: str, **kwargs) -> Dict:
        """
        Route requests to the optimal AI model
        """
        # Check cache first
        cache_key = self._generate_cache_key(request_type, kwargs)
        cached = await self.cache.get(cache_key)
        if cached:
            return cached
        
        # Route to appropriate service
        routing_map = {
            # Claude for conversational and creative tasks
            "pam_conversation": self.claude.pam_conversation,
            "generate_itinerary": self.claude.generate_travel_itinerary,
            "content_moderation": self.claude.moderate_content,
            "travel_blog": self.claude.generate_travel_content,
            
            # OpenAI for structured and search tasks
            "create_embedding": self.openai.create_embedding,
            "find_similar_trips": self.openai.find_similar_trips,
            "optimize_route": self.openai.optimize_rv_route,
            "extract_trip_data": self.openai.extract_structured_data,
            "quick_answer": self.openai.quick_response,
            "expense_categorization": self.openai.categorize_expenses
        }
        
        handler = routing_map.get(request_type)
        if not handler:
            raise ValueError(f"Unknown AI request type: {request_type}")
        
        result = await handler(**kwargs)
        
        # Cache appropriate responses
        if request_type in ["create_embedding", "find_similar_trips", "quick_answer"]:
            await self.cache.set(cache_key, result, ttl=3600)
        
        return result
```

## 🚀 Integration Examples

### PAM WebSocket Integration
```python
# backend/app/api/v1/pam.py
@router.websocket("/ws")
async def pam_websocket_endpoint(websocket: WebSocket, token: str):
    # ... authentication code ...
    
    ai_coordinator = AICoordinator()
    
    while True:
        data = await websocket.receive_json()
        message_type = data.get("type")
        
        if message_type == "chat":
            # Use Claude for conversational responses
            response = await ai_coordinator.process_request(
                "pam_conversation",
                message=data["message"],
                user_context=user_context,
                trip_context=current_trip,
                conversation_history=conversation_history
            )
            
        elif message_type == "search_trips":
            # Use OpenAI embeddings for search
            response = await ai_coordinator.process_request(
                "find_similar_trips",
                query=data["query"],
                user_preferences=user_preferences
            )
            
        elif message_type == "optimize_route":
            # Use OpenAI function calling
            response = await ai_coordinator.process_request(
                "optimize_route",
                route_request=data["route"]
            )
        
        await websocket.send_json(response)
```

### Frontend Usage
```typescript
// src/hooks/usePam.ts
export const usePam = () => {
  const { sendMessage } = useWebSocket();
  
  const askPam = async (message: string) => {
    // Conversational queries go to Claude
    return sendMessage({
      type: 'chat',
      message,
      context: getCurrentTripContext()
    });
  };
  
  const searchTrips = async (query: string) => {
    // Search queries use OpenAI embeddings
    return sendMessage({
      type: 'search_trips',
      query,
      preferences: getUserPreferences()
    });
  };
  
  const optimizeRoute = async (waypoints: Waypoint[]) => {
    // Route optimization uses OpenAI function calling
    return sendMessage({
      type: 'optimize_route',
      route: {
        waypoints,
        rv_specs: getRVSpecs(),
        preferences: getRoutePreferences()
      }
    });
  };
  
  return { askPam, searchTrips, optimizeRoute };
};
```

## 💰 Cost Optimization

### Model Selection by Volume
| Feature | Model | Est. Monthly Calls | Cost/1K calls |
|---------|-------|-------------------|---------------|
| PAM Chat | Claude 3.5 | 50,000 | $3.00 |
| Trip Search | GPT Embeddings | 200,000 | $0.13 |
| Route Optimization | GPT-4 Turbo | 10,000 | $10.00 |
| Quick Answers | GPT-3.5 Turbo | 100,000 | $0.50 |

### Caching Strategy
```python
# Cache embeddings aggressively (24 hours)
# Cache search results (1 hour)
# Cache route optimizations (30 minutes)
# Don't cache conversational responses
```

## 📊 Monitoring & Analytics

### Track Model Performance
```python
# backend/app/services/ai/monitoring.py
class AIMonitoring:
    async def track_request(
        self,
        model: str,
        request_type: str,
        response_time: float,
        tokens_used: int,
        success: bool
    ):
        await self.analytics.track({
            "event": "ai_request",
            "properties": {
                "model": model,
                "type": request_type,
                "response_time_ms": response_time * 1000,
                "tokens": tokens_used,
                "success": success,
                "cost": self._calculate_cost(model, tokens_used)
            }
        })
```

## 🎯 Success Metrics

### Quality Metrics
- PAM conversation satisfaction: >4.5/5
- Search relevance: >85% accuracy
- Route optimization efficiency: >20% improvement vs basic routing

### Performance Metrics
- Claude response time: <3 seconds
- OpenAI embedding generation: <500ms
- Search response time: <1 second
- Route optimization: <2 seconds

### Cost Metrics
- Average cost per user per month: <$0.50
- Cost per PAM conversation: <$0.01
- Cost per trip search: <$0.001

This dual-model strategy leverages each AI's strengths to create a superior user experience while maintaining cost efficiency.