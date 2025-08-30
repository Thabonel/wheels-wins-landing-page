"""
Health Consultation API endpoint
Uses existing OpenAI/Anthropic keys from PAM configuration
"""

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import logging
from datetime import datetime
import openai
from openai import AsyncOpenAI
import os

from app.middleware.rate_limiting import check_rest_api_rate_limit

logger = logging.getLogger(__name__)
router = APIRouter()

# Import configuration with fallback (similar to main.py pattern)
try:
    from app.core.config import settings
    print("✅ Health consultation using full Pydantic configuration")
except Exception as config_error:
    print(f"⚠️ Health consultation failed to load full config: {config_error}")
    try:
        from app.core.simple_config import settings
        print("✅ Health consultation using simple config")
    except Exception as simple_config_error:
        print(f"⚠️ Health consultation simple config failed: {simple_config_error}")
        from app.core.emergency_config import settings
        print("✅ Health consultation using emergency config")

# Import dependencies with fallback for get_current_user
try:
    from app.api.deps import get_current_user
except Exception as deps_error:
    logger.warning(f"⚠️ Could not import get_current_user: {deps_error}")
    # Create a simple fallback dependency
    async def get_current_user():
        """Fallback dependency when main deps are unavailable"""
        return {"id": "fallback-user", "sub": "anonymous"}

# Request/Response models
class HealthContext(BaseModel):
    medications: List[str] = Field(default_factory=list)
    allergies: List[str] = Field(default_factory=list)
    conditions: List[str] = Field(default_factory=list)

class HealthConsultationRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    context: Optional[HealthContext] = None
    emergency_number: str = Field(default="911")
    disclaimer_accepted: bool = Field(default=True)

class HealthConsultationResponse(BaseModel):
    success: bool
    response: str
    has_emergency: bool = False
    timestamp: str
    disclaimer: str = "This is health information only, not medical advice. Always consult healthcare professionals."

# Emergency keywords
EMERGENCY_KEYWORDS = [
    'chest pain', 'can\'t breathe', 'difficulty breathing', 'severe bleeding',
    'unconscious', 'stroke', 'heart attack', 'severe allergic reaction',
    'suicidal', 'overdose', 'poisoning', 'severe head injury'
]

# Health consultation system prompt
HEALTH_SYSTEM_PROMPT = """You are a health information assistant, similar to how ChatGPT provides health information.

IMPORTANT GUIDELINES:
1. Provide helpful, practical health information (not medical advice)
2. Be specific and actionable like ChatGPT's health responses
3. Include "Check the basics", "Do immediately", and "Seek medical care if" sections when relevant
4. Always end with a disclaimer about seeing a healthcare professional
5. Identify emergencies and advise immediate medical attention

For example, if someone says "I have a rash on my elbow", provide:
- Check the basics (is it itchy, painful, spreading?)
- Immediate care steps (wash gently, moisturize, avoid scratching)
- When to seek medical care (if spreading, fever, severe symptoms)
- Note that only a clinician can confirm the cause

Provide comprehensive, helpful information while maintaining appropriate medical disclaimers."""

def check_for_emergency(message: str) -> bool:
    """Check if message contains emergency keywords"""
    lower_message = message.lower()
    return any(keyword in lower_message for keyword in EMERGENCY_KEYWORDS)

@router.post("/health-consultation", response_model=HealthConsultationResponse)
async def health_consultation(
    request: HealthConsultationRequest,
    current_user: Dict = Depends(get_current_user),
    rate_limit: Any = Depends(check_rest_api_rate_limit)
):
    """
    Provide health information consultation (not medical advice)
    Similar to ChatGPT's health responses
    """
    try:
        # Check for emergency
        has_emergency = check_for_emergency(request.message)
        
        # Build context message
        context_parts = []
        if request.context:
            if request.context.medications:
                context_parts.append(f"Current medications: {', '.join(request.context.medications)}")
            if request.context.allergies:
                context_parts.append(f"Known allergies: {', '.join(request.context.allergies)}")
            if request.context.conditions:
                context_parts.append(f"Medical conditions: {', '.join(request.context.conditions)}")
        
        context_info = "\n".join(context_parts) if context_parts else "No medical context provided"
        
        # Prepare messages for OpenAI
        messages = [
            {"role": "system", "content": HEALTH_SYSTEM_PROMPT},
            {"role": "system", "content": f"User medical context:\n{context_info}\n\nEmergency number for user's location: {request.emergency_number}"},
            {"role": "user", "content": request.message}
        ]
        
        # If emergency detected, add urgent instruction
        if has_emergency:
            messages.insert(2, {
                "role": "system", 
                "content": f"⚠️ EMERGENCY KEYWORDS DETECTED! Start response by advising to call {request.emergency_number} immediately if experiencing these symptoms."
            })
        
        # Get API key from settings (same as PAM uses)
        api_key = settings.OPENAI_API_KEY
        if not api_key:
            # Try Anthropic as fallback
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if not api_key:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="AI service not configured. Please contact support."
                )
        
        # Initialize OpenAI client
        client = AsyncOpenAI(api_key=api_key.get_secret_value() if hasattr(api_key, 'get_secret_value') else api_key)
        
        # Get AI response
        completion = await client.chat.completions.create(
            model="gpt-4-turbo-preview",  # Same model PAM uses
            messages=messages,
            temperature=0.7,
            max_tokens=1000
        )
        
        ai_response = completion.choices[0].message.content
        
        # Add disclaimer if not present
        if "not medical advice" not in ai_response.lower() and "not a doctor" not in ai_response.lower():
            ai_response += f"\n\n⚠️ This is health information only, not medical advice. Always consult healthcare professionals for medical concerns. In emergencies, call {request.emergency_number}."
        
        # Log consultation (optional - for analytics)
        logger.info(f"Health consultation for user {current_user.get('id')}: {request.message[:50]}...")
        
        return HealthConsultationResponse(
            success=True,
            response=ai_response,
            has_emergency=has_emergency,
            timestamp=datetime.utcnow().isoformat()
        )
        
    except openai.RateLimitError:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="AI service rate limit exceeded. Please try again in a moment."
        )
    except openai.AuthenticationError:
        logger.error("OpenAI authentication failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service authentication failed. Please contact support."
        )
    except Exception as e:
        logger.error(f"Health consultation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process health consultation: {str(e)}"
        )

@router.get("/health-consultation/status")
async def health_consultation_status(
    current_user: Dict = Depends(get_current_user)
):
    """Check if health consultation service is available"""
    try:
        # Check if API keys are configured
        has_openai = bool(settings.OPENAI_API_KEY)
        has_anthropic = bool(os.getenv("ANTHROPIC_API_KEY"))
        
        return {
            "available": has_openai or has_anthropic,
            "provider": "OpenAI" if has_openai else "Anthropic" if has_anthropic else None,
            "message": "Health consultation service is available" if (has_openai or has_anthropic) else "Service not configured"
        }
    except Exception as e:
        logger.error(f"Status check error: {str(e)}")
        return {
            "available": False,
            "provider": None,
            "message": "Service status unknown"
        }