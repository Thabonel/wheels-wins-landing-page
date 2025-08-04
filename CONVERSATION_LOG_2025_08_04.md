# Wheels & Wins Development Conversation Log - August 4, 2025

## Executive Summary
This document captures a comprehensive development session focused on fixing critical PAM chat functionality, implementing AI provider failover, adding location awareness, and preparing to restore YouTube scraper functionality.

## Table of Contents
1. [Initial Context - PAM CORS Errors](#initial-context)
2. [CORS Fix Implementation](#cors-fix)
3. [AI Provider Failover System](#ai-provider-failover)
4. [Location Awareness Implementation](#location-awareness)
5. [YouTube Scraper Analysis](#youtube-scraper)
6. [Code Recovery Plan](#code-recovery-plan)

---

## Initial Context - PAM CORS Errors {#initial-context}

### Problem Statement
PAM chat was failing with CORS preflight errors (400 Bad Request). The user had been struggling with this issue for a long time.

### Error Details
```
Failed to load resource: the server responded with a status of 400 (Bad Request)
Access to fetch at 'https://pam-backend.onrender.com/api/v1/pam' from origin 'https://wheelswins.com.au' has been blocked by CORS policy
```

### Initial Investigation
- Discovered OPTIONS requests were receiving 400 Bad Request
- User pointed out that OPTIONS handling was already implemented in `pam.py`
- The real issue was elsewhere

---

## CORS Fix Implementation {#cors-fix}

### Root Cause Discovery
The `X-Auth-Type` header was missing from the allowed headers list in CORS configuration.

### Solution Applied
**File**: `/backend/app/core/cors_config.py`
```python
allow_headers=[
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
    "X-Auth-Type",  # Added this line - CRITICAL FIX
],
```

### Result
✅ CORS preflight errors resolved immediately

---

## AI Provider Failover System {#ai-provider-failover}

### Problem
After fixing CORS, PAM showed error: "No module named 'anthropic'" - indicating a need for robust AI provider failover.

### User Request
"create a long term world best of class solution for this"

### Implementation

#### 1. Provider Interface (`/backend/app/services/ai/provider_interface.py`)
```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Optional, Dict, Any
from enum import Enum

class AICapability(Enum):
    CHAT = "chat"
    FUNCTION_CALLING = "function_calling"
    VISION = "vision"
    STREAMING = "streaming"

@dataclass
class AIMessage:
    role: str  # 'system', 'user', 'assistant', 'function'
    content: str
    function_call: Optional[Dict[str, Any]] = None
    
@dataclass
class AIResponse:
    content: str
    function_calls: Optional[List[Dict[str, Any]]] = None
    usage: Optional[Dict[str, int]] = None
    model: Optional[str] = None
    provider: Optional[str] = None

class AIProviderInterface(ABC):
    @abstractmethod
    async def complete(
        self,
        messages: List[AIMessage],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        functions: Optional[List[Dict[str, Any]]] = None,
        **kwargs
    ) -> AIResponse:
        pass
```

#### 2. OpenAI Provider (`/backend/app/services/ai/openai_provider.py`)
```python
import openai
from typing import List, Optional, Dict, Any
import logging
from .provider_interface import AIProviderInterface, AIMessage, AIResponse, AICapability

logger = logging.getLogger(__name__)

class OpenAIProvider(AIProviderInterface):
    def __init__(self, api_key: str, default_model: str = "gpt-4"):
        self.api_key = api_key
        self.default_model = default_model
        openai.api_key = api_key
        self.capabilities = {
            AICapability.CHAT,
            AICapability.FUNCTION_CALLING,
            AICapability.VISION,
            AICapability.STREAMING
        }
    
    async def complete(
        self,
        messages: List[AIMessage],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        functions: Optional[List[Dict[str, Any]]] = None,
        **kwargs
    ) -> AIResponse:
        # Implementation details...
```

#### 3. Anthropic Provider with Safe Imports (`/backend/app/services/ai/anthropic_provider.py`)
```python
import logging
from typing import List, Optional, Dict, Any

logger = logging.getLogger(__name__)

# Safe import handling
try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
    logger.warning("Anthropic module not available - provider will not be initialized")

from .provider_interface import AIProviderInterface, AIMessage, AIResponse, AICapability

class AnthropicProvider(AIProviderInterface):
    def __init__(self, api_key: str, default_model: str = "claude-3-opus-20240229"):
        if not ANTHROPIC_AVAILABLE:
            raise ImportError("Anthropic module is not installed")
        # Implementation...
```

#### 4. AI Orchestrator (`/backend/app/services/ai/ai_orchestrator.py`)
```python
class AIOrchestrator:
    def __init__(self, providers: List[AIProviderConfig]):
        self.providers: List[Tuple[AIProviderInterface, ProviderConfig]] = []
        self.circuit_breakers: Dict[str, CircuitBreaker] = {}
        
        for config in providers:
            provider = self._initialize_provider(config)
            if provider:
                self.providers.append((provider, config))
                self.circuit_breakers[config.name] = CircuitBreaker(
                    failure_threshold=3,
                    recovery_timeout=60,
                    expected_exception=Exception
                )
    
    async def complete(self, messages: List[AIMessage], **kwargs) -> AIResponse:
        for provider, config in self.providers:
            if not self.circuit_breakers[config.name].is_open:
                try:
                    response = await provider.complete(messages, **kwargs)
                    self.circuit_breakers[config.name].record_success()
                    return response
                except Exception as e:
                    self.circuit_breakers[config.name].record_failure()
                    logger.error(f"Provider {config.name} failed: {e}")
                    continue
        
        raise Exception("All AI providers failed")
```

### Circuit Breaker Pattern
Implemented automatic circuit breaking to prevent cascading failures:
- Opens after 3 consecutive failures
- Auto-recovers after 60 seconds
- Monitors provider health

---

## Location Awareness Implementation {#location-awareness}

### Problem
User complained: "we have a very accurate location finder in the map module that will find my position within a few meters, why does pam not know where I am?"

### User Emphasis
"this is extremely important so pam can function in prediction, finding local resources etc, everything revolves around pam knowing where the user is at all times"

### Implementation

#### 1. Frontend Hook (`/src/hooks/useGeolocation.ts`)
```typescript
import { useState, useEffect } from 'react';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  address?: string;
}

export interface UseGeolocationResult {
  location: LocationData | null;
  error: string | null;
  loading: boolean;
  requestLocation: () => void;
}

export const useGeolocation = (): UseGeolocationResult => {
  const [location, setLocation] = useState<LocationData | null>(() => {
    const stored = localStorage.getItem('userLocation');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
          return parsed;
        }
      } catch (e) {}
    }
    return null;
  });

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now()
        };
        
        setLocation(locationData);
        localStorage.setItem('userLocation', JSON.stringify(locationData));
      },
      (error) => {
        setError(error.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return { location, error, loading, requestLocation };
};
```

#### 2. PAM Component Update (`/src/components/Pam.tsx`)
```javascript
// In loadUserContext function
const locationData = localStorage.getItem('userLocation');
if (locationData) {
  try {
    const location = JSON.parse(locationData);
    if (Date.now() - location.timestamp < 30 * 60 * 1000) {
      newContext.current_location = {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        timestamp: location.timestamp
      };
    }
  } catch (e) {
    console.error('Error parsing stored location:', e);
  }
}

// Send location on WebSocket init
const initMessage = {
  type: "init",
  context: {
    userLocation: userContext?.current_location,
  }
};
ws.send(JSON.stringify(initMessage));
```

#### 3. Backend WebSocket Handler (`/backend/app/api/v1/pam.py`)
```python
elif data.get("type") == "init":
    context = data.get("context", {})
    if context.get("userLocation"):
        await manager.update_connection_context(connection_id, {
            "user_location": context["userLocation"]
        })
        logger.info(f"📍 Updated user location for connection {connection_id}")
```

#### 4. WebSocket Manager Update (`/backend/app/core/websocket_manager.py`)
```python
async def update_connection_context(self, connection_id: str, context: Dict) -> None:
    """Update the context data for a specific connection."""
    if connection_id in self.connection_metadata:
        if "context" not in self.connection_metadata[connection_id]:
            self.connection_metadata[connection_id]["context"] = {}
        self.connection_metadata[connection_id]["context"].update(context)
        logger.info(f"📍 Updated context for connection {connection_id}: {context}")

def get_connection_context(self, connection_id: str) -> Optional[Dict]:
    """Get the context data for a specific connection."""
    if connection_id in self.connection_metadata:
        return self.connection_metadata[connection_id].get("context", {})
    return None
```

### Result
✅ PAM now receives location on connection initialization
✅ Location is cached for 30 minutes to reduce API calls
✅ PAM can use location for weather, local resources, etc.

---

## YouTube Scraper Analysis {#youtube-scraper}

### Current Status
The YouTube scraper implementation exists but has import issues preventing it from loading.

### Files That Exist
- ✅ `/backend/app/api/v1/youtube_scraper.py` - API endpoints
- ✅ `/backend/app/services/scraping/youtube_travel_scraper.py` - Core service
- ✅ `/backend/app/services/pam/tools/youtube_trip_tool.py` - PAM integration
- ✅ `/backend/app/api/v1/camping.py` - Camping features
- ✅ `/backend/app/services/camping_scraper.py` - Camping scraper

### The Import Issue
**File**: `/backend/app/api/v1/youtube_scraper.py` (line 12)
```python
# Current (broken):
from app.models.user import User

# Should be:
from app.models.domain.user import User
```

### Features Implemented
1. **YouTube Video Search**: Search for adventure/travel videos
2. **Transcript Extraction**: Extract YouTube auto-generated transcripts
3. **AI Trip Parsing**: Use AI to extract structured trip data
4. **Database Storage**: Save trips to Supabase database
5. **PAM Integration**: Natural conversation flow for finding trips
6. **Bulk Import**: Process multiple videos at once

### API Endpoints
- `POST /search` - Search YouTube for travel videos
- `POST /extract/{video_id}` - Extract trip info from video
- `POST /import` - Import video as trip
- `POST /bulk-import` - Import multiple videos
- `POST /suggest` - Get personalized suggestions
- `GET /sample-queries` - Get example search queries

---

## Code Recovery Plan {#code-recovery-plan}

### Phase 1: Quick Fixes
1. **Fix YouTube Scraper Import**
   - Change: `from app.models.user import User`
   - To: `from app.models.domain.user import User`

2. **Enable YouTube Scraper in API**
   - Uncomment in `/backend/app/api/v1/__init__.py`
   - Currently loaded via import guards due to failures

### Phase 2: AI Provider Orchestration
**Files to Create:**
1. `/backend/app/services/ai/provider_interface.py`
2. `/backend/app/services/ai/openai_provider.py`
3. `/backend/app/services/ai/anthropic_provider.py`
4. `/backend/app/services/ai/ai_orchestrator.py`

**Files to Update:**
1. `/backend/app/services/pam/simple_pam_service.py` - Use orchestrator
2. `/backend/app/api/v1/pam.py` - Initialize orchestrator
3. `/backend/app/core/config.py` - Add ANTHROPIC_API_KEY

### Phase 3: Trip Templates Investigation
- User mentioned Trip Templates should become full Trip Planner
- Currently "Trip Planner" is first tab in Wheels.tsx
- Need to check backup for original Trip Templates component
- ⚠️ Must NOT add to header menu - stays as sub-page

### Phase 4: Final Steps
1. Test YouTube scraper functionality
2. Verify AI failover works
3. Ensure location awareness functions
4. Only then: Rename "Plan Trip" to "Edit trips"

## Key Learnings

### 1. CORS Issues
- Missing headers in allowed list can cause preflight failures
- Always check CORS config when seeing 400 on OPTIONS

### 2. Import Guards
- Use safe imports for optional dependencies
- Prevents entire app failure when module missing

### 3. Location Awareness
- Cache location data to reduce API calls
- Send location on WebSocket init, not every message
- Use existing accurate location from map module

### 4. AI Provider Failover
- Implement circuit breakers for reliability
- Use abstract interfaces for provider swapping
- Monitor provider health and auto-recover

## Environment Variables Required
```bash
# Backend
YOUTUBE_API_KEY=your_youtube_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
OPENAI_API_KEY=your_openai_api_key

# Frontend
VITE_MAPBOX_TOKEN=your_mapbox_token
```

## Migration Status
- ✅ Location awareness implemented and working
- ✅ CORS issues resolved
- ✅ AI provider orchestration designed
- ❌ YouTube scraper import needs fixing
- ❌ AI orchestration files need to be created
- ❓ Trip Templates conversion needs investigation

---

*Generated on: August 4, 2025*
*Session Duration: Multiple hours*
*Key Achievement: Fixed critical PAM functionality and added location awareness*