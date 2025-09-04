# Enhanced Intent Classification System for PAM

## 🎯 Overview

The enhanced intent classification system provides sophisticated user intent detection, entity extraction, and specialized routing for the PAM AI assistant. It integrates seamlessly with the existing PAMContextManager and Phase 2 memory system.

## 🏗️ Architecture

### Core Components

1. **Intent Classifier** (`app/services/pam/intent_classifier.py`)
   - AI-powered + rule-based hybrid classification
   - Entity extraction (locations, dates, amounts, etc.)
   - Learning from user corrections
   - Pattern recognition and history tracking

2. **Specialized Handlers** (`app/services/pam/intent_handlers.py`)
   - Intent-specific processing logic
   - Structured response generation
   - Clarification question handling
   - Action suggestion system

3. **API Endpoint** (`app/api/v1/intent.py`)
   - RESTful intent classification service
   - Correction learning endpoint
   - Pattern analytics endpoint
   - Health monitoring

4. **Phase 2 Integration** (`app/agents/phase2_integration.py`)
   - Enhanced orchestrator with intent-aware processing
   - Memory search optimization based on intent
   - Specialized handler routing

## 🎛️ Intent Types

### Predefined Intents
```python
- TRIP_PLANNING: Route planning, destinations, itineraries
- EXPENSE_TRACKING: Recording and categorizing expenses  
- BUDGET_MANAGEMENT: Budget setting and analysis
- ROUTE_OPTIMIZATION: Finding optimal travel routes
- CAMPGROUND_SEARCH: Finding accommodations
- WEATHER_INQUIRY: Weather forecasts and conditions
- MAINTENANCE_REMINDER: Vehicle maintenance tracking
- SOCIAL_INTERACTION: Community features
- HELP_REQUEST: User assistance and guidance
- GENERAL_QUERY: Fallback for unclassified intents
- FEEDBACK: User feedback and suggestions
- CORRECTION: Intent correction and learning
```

## 🔧 Entity Extraction

### Supported Entity Types
- **Amounts**: `$123.45`, `50 dollars`, `1,234.56`
- **Dates**: `12/25/2023`, `next week`, `tomorrow`
- **Locations**: `Sydney, NSW`, `National Parks`, `City, State`
- **Durations**: `3 days`, `two weeks`, `5 hours`
- **Distances**: `150km`, `2 hour drive`, `50 miles`

### Entity Structure
```python
@dataclass
class Entity:
    type: str                    # Entity category
    value: str                   # Raw extracted text
    normalized_value: str        # Processed value
    confidence: float           # Extraction confidence
    position: Tuple[int, int]   # Text position
```

## 🎯 Classification Flow

### 1. Hybrid Classification
```
User Message → Rule-Based Analysis → AI Classification → Intent Decision
                     ↓                      ↓              ↓
              Keyword matching        GPT-3.5 analysis   Best result
              Context analysis        Entity awareness   Confidence scoring
```

### 2. Entity Extraction
```
Message Text → Pattern Matching → Entity Validation → Normalization
                     ↓                   ↓                ↓
             RegEx patterns      Confidence scoring   Standardized format
             Context awareness   Overlap removal      Ready for handlers
```

### 3. Handler Routing
```
Classification → Confidence Check → Handler Selection → Specialized Processing
                      ↓                    ↓                    ↓
              High confidence:      Route to handler    Structured response
              Direct routing        Generate actions     Entity integration
              
              Low confidence:       General handler      Clarification
              Fallback routing      Ask questions        User guidance
```

## 🔧 Integration Points

### Frontend Integration (PAMContextManager)
```typescript
// Enhanced intent classification with backend fallback
private async analyzeUserIntent(message: PamMessage): Promise<string> {
  // Try backend classification first
  if (this.options.enableBackendIntentClassification) {
    const response = await fetch('/api/v1/pam/classify-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        context: { current_page, user_id, activity }
      })
    });
  }
  
  // Fallback to enhanced keyword-based classification
  // ... enhanced keyword matching logic
}
```

### Backend Integration (Phase2EnhancedOrchestrator)
```python
async def process_with_memory_enhancement(self, message: str, user_id: str):
  # Step 1: Classify intent
  intent_classification = await self._classify_intent_enhanced(
    message, user_id, context
  )
  
  # Step 2: Route to specialized handler if high confidence
  if intent_classification.confidence > 0.8:
    handler_result = await self._route_to_specialized_handler(
      message, user_id, intent_classification, context
    )
  
  # Step 3: Enhanced memory search with intent context
  memories = await self._search_relevant_memories(
    user_id, message, context, intent_classification.intent.value
  )
```

## 🌐 API Endpoints

### Classification Endpoint
```
POST /api/v1/pam/classify-intent
{
  "message": "I want to plan a trip to Sydney",
  "context": {
    "current_page": "/wheels",
    "user_id": "user123"
  },
  "include_routing": true
}

Response:
{
  "success": true,
  "classification": {
    "intent": "trip_planning",
    "confidence": 0.92,
    "entities": [
      {"type": "location", "value": "Sydney", "normalized_value": "Sydney"}
    ],
    "requires_clarification": false,
    "suggested_handler": "trip_planning_handler"
  },
  "routing_result": {
    "handler": "trip_planning_handler",
    "message": "I can help you plan a trip to Sydney. When are you planning to travel?",
    "suggested_actions": ["Find optimal route", "Search campgrounds"]
  }
}
```

### Learning Endpoint
```
POST /api/v1/pam/learn-from-correction
{
  "original_message": "I need fuel",
  "original_intent": "general_query", 
  "corrected_intent": "expense_tracking",
  "feedback": "This was about recording a fuel expense"
}
```

### Pattern Analytics
```
GET /api/v1/pam/intent-patterns
Response:
{
  "patterns": {
    "top_intents": ["trip_planning", "expense_tracking"],
    "typical_times": {"morning": "trip_planning", "evening": "expense_tracking"},
    "pattern_confidence": 0.85
  }
}
```

## 🎨 Specialized Handlers

### TripPlanningHandler
- Extracts locations, dates, durations
- Suggests route optimization and campgrounds
- Integrates with mapping services
- Provides weather forecasts

### ExpenseTrackingHandler  
- Extracts amounts, categories, dates
- Auto-categorizes expenses (fuel, food, accommodation)
- Creates expense entries automatically
- Updates budget tracking

### BudgetManagementHandler
- Processes budget amounts and timeframes
- Provides spending analysis
- Suggests cost optimizations
- Tracks financial goals

### CampgroundSearchHandler
- Extracts location preferences and dates
- Identifies amenity requirements (wifi, pets, hookups)
- Searches available sites
- Compares prices and features

## 🧠 Learning and Adaptation

### Correction Learning
```python
async def learn_from_correction(
    self, user_id: str, original_message: str,
    original_classification: IntentClassification,
    corrected_intent: IntentType, feedback: str
):
    # Store correction for model improvement
    # Update user-specific patterns
    # Adjust classification weights
```

### Pattern Recognition
- User behavior analysis (time of day, common intents)
- Context-aware adjustments (page-specific patterns)
- Confidence score improvements over time
- Proactive suggestion generation

## 📊 Database Integration

### Intent Patterns Table (`pam_intent_patterns`)
```sql
CREATE TABLE pam_intent_patterns (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    pattern_type VARCHAR(50) NOT NULL,
    pattern_signature TEXT NOT NULL,
    pattern_data JSONB NOT NULL,
    frequency INTEGER DEFAULT 1,
    last_occurrence TIMESTAMP,
    typical_time_of_day INTEGER,
    context JSONB DEFAULT '{}'
);
```

## ⚡ Performance Features

### Caching Strategy
- Intent classification results cached per user
- Pattern data cached for quick access
- Entity extraction patterns optimized

### Fallback Mechanisms
```
AI Classification Failed → Rule-Based Classification → Simple Keywords → General Intent
Backend Unavailable → Frontend Classification → Context Fallback → Default Handler
```

### Rate Limiting
- API endpoints protected with user-based limits
- Bulk classification for testing (max 20 messages)
- Health monitoring and circuit breakers

## 🎯 Usage Examples

### Trip Planning
```
User: "I want to drive from Melbourne to Sydney next weekend"

Classification:
- Intent: trip_planning (confidence: 0.94)
- Entities: [location: "Melbourne", location: "Sydney", date: "next weekend"]

Handler Response:
"I can help you plan a trip from Melbourne to Sydney for next weekend. 
This is about a 9-hour drive. I'll find the best routes, campgrounds 
along the way, and check weather forecasts."

Actions: [Find optimal route, Search campgrounds, Check weather]
```

### Expense Tracking
```
User: "I spent $85 on fuel at Caltex yesterday"

Classification:  
- Intent: expense_tracking (confidence: 0.96)
- Entities: [amount: "$85", location: "Caltex", date: "yesterday"]

Handler Response:
Auto-creates expense entry:
- Amount: $85.00
- Category: fuel  
- Location: Caltex
- Date: [yesterday's date]
- Description: "I spent $85 on fuel at Caltex yesterday"
```

## 🔍 Monitoring and Analytics

### Classification Metrics
- Intent distribution per user
- Confidence score trends
- Entity extraction accuracy
- Handler success rates

### Error Tracking
- Misclassification logging
- Entity extraction failures
- Handler errors and fallbacks
- User correction frequency

## 🚀 Future Enhancements

### Planned Features
1. **Multi-language Support**: Extend classification to multiple languages
2. **Voice Intent Recognition**: Integrate with speech-to-text pipeline
3. **Context History**: Use conversation history for better classification
4. **Custom Intents**: Allow users to define custom intent patterns
5. **A/B Testing**: Test different classification approaches

### Integration Roadmap
1. **Real-time Learning**: Update models based on user corrections
2. **Cross-user Patterns**: Learn from aggregate user behavior
3. **Predictive Intents**: Proactively suggest actions based on patterns
4. **Third-party Integration**: Connect with external travel APIs

## ✅ System Status

All components implemented and tested:
- ✅ Intent classification engine
- ✅ Entity extraction system  
- ✅ Specialized handler routing
- ✅ API endpoints and integration
- ✅ Phase 2 orchestrator integration
- ✅ Frontend context manager updates
- ✅ Database schema and patterns
- ✅ Error handling and fallbacks
- ✅ Syntax validation completed

The enhanced intent classification system is ready for deployment and provides a sophisticated foundation for intelligent user interaction in the PAM AI assistant.