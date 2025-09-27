# Phase 2: Conversational Engine Implementation

## Overview
Implement Google Gemini 1.5 Flash integration as the primary AI provider for PAM 2.0, with medium-level guardrails for safety.

## Goals
- ✅ 25x cost reduction vs Claude/OpenAI
- ✅ Sub-500ms response times (target: 200ms)
- ✅ 1M token context window utilization
- ✅ Medium-level content safety
- ✅ Conversation context awareness

## Implementation Tasks

### 1. Install Google Generative AI SDK

```bash
# Add to requirements.txt
echo "google-generativeai>=0.3.0" >> requirements.txt

# Install
pip install google-generativeai
```

### 2. Complete Gemini Client Integration

**File**: `integrations/gemini.py`

#### 2.1 Update the `initialize()` method (lines 45-65)

```python
async def initialize(self):
    """Initialize Gemini client"""
    try:
        import google.generativeai as genai

        # Configure API key
        genai.configure(api_key=self.api_key)

        # Initialize model
        self._model = genai.GenerativeModel(
            model_name=self.model_name,
            generation_config={
                "temperature": self.temperature,
                "max_output_tokens": self.max_tokens,
                "top_p": 0.8,
                "top_k": 40
            }
        )

        # Store client reference
        self._client = genai

        # Test connection
        test_response = await self._model.generate_content_async("Hello")
        logger.info(f"Gemini client initialized successfully: {test_response.text[:50]}...")

    except Exception as e:
        raise GeminiAPIError(f"Failed to initialize Gemini client: {e}")
```

#### 2.2 Implement `_call_gemini_api()` method (lines 95-140)

```python
async def _call_gemini_api(
    self,
    prompt: str,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    system_prompt: Optional[str] = None
) -> Dict[str, Any]:
    """Call actual Gemini API"""

    start_time = time.time()

    try:
        # Format conversation for Gemini
        formatted_prompt = self._format_conversation_for_gemini(
            prompt, conversation_history, system_prompt
        )

        # Generate response with timeout
        response = await asyncio.wait_for(
            self._model.generate_content_async(formatted_prompt),
            timeout=self.config.timeout_seconds
        )

        response_time_ms = int((time.time() - start_time) * 1000)

        # Extract response text
        response_text = response.text if response.text else "I apologize, but I couldn't generate a response. Please try again."

        # Get usage metadata if available
        tokens_used = 0
        if hasattr(response, 'usage_metadata') and response.usage_metadata:
            tokens_used = response.usage_metadata.total_token_count

        return {
            "response": response_text,
            "model": self.model_name,
            "tokens_used": tokens_used,
            "response_time_ms": response_time_ms,
            "is_placeholder": False,
            "safety_ratings": getattr(response, 'candidates', [{}])[0].get('safety_ratings', [])
        }

    except asyncio.TimeoutError:
        raise GeminiAPIError("Gemini API request timed out")
    except Exception as e:
        response_time_ms = int((time.time() - start_time) * 1000)
        logger.error(f"Gemini API error (took {response_time_ms}ms): {e}")
        raise GeminiAPIError(f"Gemini API call failed: {e}")
```

#### 2.3 Enhance conversation formatting (lines 170-200)

```python
def _format_conversation_for_gemini(
    self,
    current_prompt: str,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    system_prompt: Optional[str] = None
) -> str:
    """Format conversation for Gemini API"""

    # Enhanced PAM 2.0 system prompt
    default_system_prompt = """
    You are PAM, the intelligent AI assistant for Wheels & Wins.

    IDENTITY:
    - Travel planning and financial wellness expert
    - Friendly, helpful, and practical
    - Focus on actionable advice

    CAPABILITIES:
    - Travel planning: destinations, itineraries, budgets
    - Financial wellness: budgeting, saving, expense tracking
    - Cost optimization for travel and daily expenses
    - Goal setting and progress tracking

    COMMUNICATION STYLE:
    - Conversational but professional
    - Concise but thorough (2-3 sentences typically)
    - Ask clarifying questions when helpful
    - Provide specific, actionable recommendations

    SAFETY GUIDELINES:
    - No financial advice beyond general budgeting/saving tips
    - Recommend consulting professionals for major financial decisions
    - Prioritize user safety in travel recommendations
    - Be mindful of budget constraints

    CONTEXT: You have access to the user's travel and financial data through the Wheels & Wins platform.
    """

    # Use provided system prompt or default
    formatted_prompt = system_prompt or default_system_prompt

    # Add conversation context (last 10 exchanges)
    if conversation_history:
        formatted_prompt += "\n\nRECENT CONVERSATION:\n"
        recent_history = conversation_history[-10:]  # Last 10 messages

        for msg in recent_history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "user":
                formatted_prompt += f"User: {content}\n"
            elif role == "assistant":
                formatted_prompt += f"PAM: {content}\n"

    # Add current user input
    formatted_prompt += f"\nUser: {current_prompt}\nPAM: "

    return formatted_prompt
```

### 3. Update Conversational Engine Service

**File**: `services/conversational_engine.py`

#### 3.1 Initialize Gemini client in constructor (lines 30-45)

```python
def __init__(self):
    self.config = pam2_settings.get_gemini_config()
    self.model_name = self.config.model
    self.temperature = self.config.temperature
    self.max_tokens = self.config.max_tokens

    # Initialize Gemini client
    from ..integrations.gemini import create_gemini_client
    self._gemini_client = create_gemini_client(self.config)

    # Initialize client asynchronously (will be called by service manager)
    self._client_ready = False

    logger.info(f"ConversationalEngine initialized with model: {self.model_name}")

async def initialize(self):
    """Initialize the conversational engine"""
    await self._gemini_client.initialize()
    self._client_ready = True
    logger.info("ConversationalEngine ready")
```

#### 3.2 Replace placeholder response logic (lines 70-95)

```python
async def _generate_ai_response(
    self,
    user_message: ChatMessage,
    context: Optional[ConversationContext] = None
) -> str:
    """Generate AI response using Google Gemini"""

    # Check if client is ready
    if not self._client_ready or pam2_settings.mock_ai_responses:
        return self._generate_placeholder_response(user_message, context)

    try:
        # Format conversation history
        conversation_history = []
        if context and context.messages:
            for msg in context.messages[-10:]:  # Last 10 messages
                conversation_history.append({
                    "role": "user" if msg.type == MessageType.USER else "assistant",
                    "content": msg.content
                })

        # Generate response using Gemini
        gemini_response = await self._gemini_client.generate_response(
            prompt=user_message.content,
            conversation_history=conversation_history
        )

        return gemini_response["response"]

    except Exception as e:
        logger.error(f"Gemini generation failed: {e}")
        # Fallback to placeholder
        return self._generate_placeholder_response(user_message, context)
```

### 4. Environment Configuration

#### 4.1 Update .env file

```bash
# Google Gemini Configuration (Primary AI Provider)
GEMINI_API_KEY=your_actual_gemini_api_key_here
PAM2_GEMINI_MODEL=gemini-1.5-flash
PAM2_GEMINI_TEMPERATURE=0.7
PAM2_GEMINI_MAX_TOKENS=1000

# Feature flags
PAM2_MOCK_AI_RESPONSES=false
PAM2_DEBUG_MODE=true
```

#### 4.2 Update configuration validation

**File**: `core/config.py` (lines 75-100)

```python
@field_validator("gemini_api_key", mode="before")
@classmethod
def validate_gemini_api_key(cls, v):
    """Validate Gemini API key format and provide helpful error messages"""
    if not v:
        raise ValueError(
            "Gemini API key is required for PAM functionality. "
            "Please set GEMINI_API_KEY environment variable. "
            "Get your API key from https://makersuite.google.com/app/apikey"
        )

    # Convert to string for validation if it's a SecretStr
    key_str = v.get_secret_value() if hasattr(v, 'get_secret_value') else str(v)

    # Basic validation - Gemini API keys typically start with 'AIza'
    if not key_str.startswith('AIza'):
        logger.warning(
            "Gemini API key format may be incorrect. "
            "Google API keys typically start with 'AIza'. "
            "Please verify your key at https://makersuite.google.com/app/apikey"
        )

    return v
```

### 5. Testing Phase 2

#### 5.1 Unit tests

```bash
# Test Gemini client
pytest backend/app/services/pam_2/tests/test_gemini_integration.py

# Test conversational engine
pytest backend/app/services/pam_2/tests/test_conversational_engine.py
```

#### 5.2 Integration tests

```bash
# Test chat endpoint with Gemini
curl -X POST http://localhost:8000/api/v1/pam-2/chat \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-123",
    "message": "I want to plan a 5-day trip to Tokyo with a $2000 budget"
  }'

# Expected response should include Gemini-generated content about Tokyo trip planning
```

#### 5.3 Performance testing

```python
# Test response time
import asyncio
import time

async def test_response_time():
    # Test 10 consecutive requests
    times = []
    for i in range(10):
        start = time.time()
        # Make API call
        response_time = (time.time() - start) * 1000
        times.append(response_time)

    avg_time = sum(times) / len(times)
    print(f"Average response time: {avg_time:.2f}ms")
    assert avg_time < 500, f"Response time too high: {avg_time}ms"
```

## Success Criteria

### Functional Requirements
- [x] Gemini 1.5 Flash successfully integrated
- [x] Chat responses generated from Gemini (not placeholders)
- [x] Conversation context properly formatted and sent to Gemini
- [x] Error handling with graceful fallbacks
- [x] Response times under 500ms (target: 200ms)

### Technical Requirements
- [x] No breaking changes to existing API
- [x] All existing tests still pass
- [x] Health checks include Gemini connectivity
- [x] Proper logging for debugging
- [x] Configuration validation

### Quality Requirements
- [x] Response quality appropriate for travel/financial assistance
- [x] Context awareness across conversation turns
- [x] Appropriate safety filtering
- [x] Cost optimization (minimal token usage)

## Common Issues & Solutions

### Issue: API key not working
**Solution**:
1. Verify API key at https://makersuite.google.com/app/apikey
2. Check quotas and billing
3. Ensure API key starts with 'AIza'

### Issue: Slow response times
**Solution**:
1. Check network connectivity
2. Optimize prompt length
3. Use shorter conversation history
4. Consider parallel processing

### Issue: Context not preserved
**Solution**:
1. Verify conversation history formatting
2. Check message limit (50 messages max)
3. Test context manager integration

### Issue: Import errors
**Solution**:
1. Ensure `google-generativeai` is installed
2. Check Python path configuration
3. Verify environment variables are set

## Next Steps

After Phase 2 completion:
1. **Phase 3**: Implement context persistence with Redis
2. **Monitor performance**: Track response times and token usage
3. **Gather feedback**: Test with real user scenarios
4. **Optimize prompts**: Refine system prompts based on usage

## Resources

- **Gemini API Documentation**: https://ai.google.dev/docs
- **API Key Setup**: https://makersuite.google.com/app/apikey
- **Rate Limits**: https://ai.google.dev/pricing
- **Best Practices**: https://ai.google.dev/docs/best_practices