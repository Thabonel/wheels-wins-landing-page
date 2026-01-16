"""
PAM Hybrid Voice System - Chat-Supervisor Pattern
OpenAI Realtime API (voice I/O) + Claude Sonnet 4.5 (reasoning/tools)

Architecture: Chat-Supervisor Pattern (OpenAI recommended)
- OpenAI Realtime: Fast voice chat, basic responses, decides when to delegate
- Claude (Supervisor): Complex reasoning, tool execution, maintains context

Key insight: OpenAI has ONE tool (delegate_to_supervisor) that passes
conversation history to Claude for complex tasks. This solves the
"two disconnected AIs" problem by preserving context across the bridge.

Reference: https://github.com/openai/openai-realtime-agents
"""

import os
import json
import logging
import traceback
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
import httpx

from app.api.deps import get_current_user, CurrentUser
from app.services.pam.core.pam import PAM, get_pam
from app.core.logging_config import pam_logger

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pam/voice-hybrid", tags=["pam-voice-hybrid"])


# =====================================================
# MODELS
# =====================================================

class VoiceSessionRequest(BaseModel):
    """Request to create voice session"""
    voice: Optional[str] = "marin"  # Natural, expressive voice
    temperature: Optional[float] = 0.8
    # User context for personalized instructions
    language: Optional[str] = "en"  # Default English
    location: Optional[Dict[str, Any]] = None  # {city, state, country, lat, lng}
    timezone: Optional[str] = None  # e.g., "America/New_York"
    user_name: Optional[str] = None  # User's name for personalization


class VoiceSessionResponse(BaseModel):
    """Ephemeral session token for browser"""
    session_token: str
    expires_at: str
    ws_url: str
    model: str
    voice: str


class ToolExecutionRequest(BaseModel):
    """Tool execution from OpenAI Realtime"""
    tool_name: str
    arguments: Dict[str, Any]
    user_id: str


class SupervisorRequest(BaseModel):
    """Request to delegate to Claude supervisor"""
    user_request: str
    conversation_history: list  # Full conversation for context
    user_id: str
    context: Optional[Dict[str, Any]] = None


# =====================================================
# SESSION CREATION
# =====================================================

@router.post("/create-session", response_model=VoiceSessionResponse)
async def create_hybrid_voice_session(
    request: VoiceSessionRequest = VoiceSessionRequest(),
    current_user: CurrentUser = Depends(get_current_user)
) -> VoiceSessionResponse:
    """
    Create ephemeral OpenAI Realtime session for voice I/O ONLY.

    No tools are passed to OpenAI - it only handles speech-to-text
    and text-to-speech. All reasoning and tool execution happens via Claude.

    Flow:
    1. Browser gets this token
    2. Connects to OpenAI Realtime via WebRTC
    3. User speaks → OpenAI transcribes → sends text to our backend
    4. Backend forwards to Claude via existing PAM system
    5. Claude decides tools, executes them, returns response text
    6. Backend sends response text to OpenAI Realtime
    7. OpenAI Realtime speaks response to user
    """
    try:
        # Log function entry
        logger.info(f"🎤 Voice session creation started for user {current_user.user_id}")

        # Check OpenAI API key
        openai_key = os.getenv('OPENAI_API_KEY')
        logger.info(f"OpenAI API key configured: {bool(openai_key)}")

        if not openai_key:
            logger.error("❌ OpenAI API key not found in environment")
            raise HTTPException(
                status_code=500,
                detail="OpenAI API key not configured. Please contact support."
            )

        # Create ephemeral session with OpenAI
        logger.info(f"📡 Sending request to OpenAI Realtime API...")

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.openai.com/v1/realtime/sessions",
                    headers={
                        "Authorization": f"Bearer {openai_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gpt-4o-realtime-preview",
                        "voice": request.voice,
                        "modalities": ["text", "audio"],
                        "instructions": _get_chat_supervisor_instructions(
                            language=request.language,
                            location=request.location,
                            timezone=request.timezone,
                            user_name=request.user_name
                        ),
                        "tools": _get_supervisor_tool(),
                        "turn_detection": {
                            "type": "server_vad",
                            "threshold": 0.5,
                            "prefix_padding_ms": 300,
                            "silence_duration_ms": 500
                        },
                        "input_audio_format": "pcm16",
                        "output_audio_format": "pcm16",
                        "temperature": request.temperature
                    }
                )

            logger.info(f"📡 OpenAI API response status: {response.status_code}")

        except httpx.TimeoutException as e:
            logger.error(f"⏱️ Timeout connecting to OpenAI API: {e}")
            logger.error(traceback.format_exc())
            raise HTTPException(
                status_code=500,
                detail="Request to OpenAI timed out. Please try again."
            )
        except httpx.ConnectError as e:
            logger.error(f"🔌 Connection error to OpenAI API: {e}")
            logger.error(traceback.format_exc())
            raise HTTPException(
                status_code=500,
                detail="Failed to connect to OpenAI. Please check your network."
            )
        except httpx.HTTPError as e:
            logger.error(f"🌐 HTTP error calling OpenAI API: {type(e).__name__} - {e}")
            logger.error(traceback.format_exc())
            raise HTTPException(
                status_code=500,
                detail=f"Network error: {type(e).__name__}"
            )

        # Check response status
        if response.status_code != 200:
            error_detail = response.text[:500]  # Limit error text
            logger.error(f"❌ OpenAI API returned {response.status_code}: {error_detail}")
            raise HTTPException(
                status_code=500,
                detail=f"OpenAI API error ({response.status_code}): {error_detail}"
            )

        # Parse response
        try:
            session_data = response.json()
            logger.info(f"📦 Received session data with keys: {list(session_data.keys())}")
        except json.JSONDecodeError as e:
            logger.error(f"❌ Failed to parse OpenAI response as JSON: {e}")
            logger.error(f"Response text (first 500 chars): {response.text[:500]}")
            logger.error(traceback.format_exc())
            raise HTTPException(
                status_code=500,
                detail="Invalid response from OpenAI API"
            )

        # Extract session token
        try:
            session_token = session_data["client_secret"]["value"]
            expires_at_raw = session_data["expires_at"]
            # Convert to ISO 8601 string (OpenAI returns Unix timestamp, often 0)
            expires_at = datetime.fromtimestamp(expires_at_raw).isoformat() if expires_at_raw else datetime.utcnow().isoformat()
            logger.info(f"✅ Successfully extracted session token, expires: {expires_at}")
        except KeyError as e:
            logger.error(f"❌ Missing key in OpenAI response: {e}")
            logger.error(f"Session data structure: {json.dumps(session_data, indent=2)}")
            logger.error(traceback.format_exc())
            raise HTTPException(
                status_code=500,
                detail=f"Unexpected response structure from OpenAI (missing {e})"
            )

        pam_logger.info(
            f"✅ Created hybrid voice session for user {current_user.user_id}",
            extra={
                "user_id": current_user.user_id,
                "voice": request.voice,
                "model": "hybrid_openai_claude"
            }
        )

        return VoiceSessionResponse(
            session_token=session_token,
            expires_at=expires_at,
            ws_url="wss://api.openai.com/v1/realtime",
            model="gpt-4o-realtime-preview",
            voice=request.voice
        )

    except HTTPException:
        # Re-raise HTTPExceptions (already logged above)
        raise
    except Exception as e:
        # Catch-all for any unexpected errors
        logger.error(f"💥 Unexpected error in voice session creation: {type(e).__name__} - {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Internal error: {type(e).__name__} - {str(e)}"
        )


def _get_chat_supervisor_instructions(
    language: str = "en",
    location: Optional[Dict[str, Any]] = None,
    timezone: Optional[str] = None,
    user_name: Optional[str] = None
) -> str:
    """
    Chat-Supervisor pattern instructions for OpenAI Realtime.

    OpenAI handles basic chat and delegates complex tasks to Claude supervisor.
    This is the recommended pattern from OpenAI for hybrid voice agents.

    Args:
        language: User's preferred language code (default "en" for English)
        location: User's location dict with city, state, country, lat, lng
        timezone: User's timezone (e.g., "America/New_York")
        user_name: User's name for personalization

    Reference: https://github.com/openai/openai-realtime-agents
    """
    # Build location context string
    location_context = ""
    if location:
        city = location.get("city", "")
        state = location.get("state", "")
        country = location.get("country", "")
        if city and state:
            location_context = f"The user is currently in {city}, {state}"
            if country and country != "USA" and country != "United States":
                location_context += f", {country}"
        elif city:
            location_context = f"The user is currently in {city}"

    # Build timezone context
    timezone_context = ""
    if timezone:
        timezone_context = f"The user's timezone is {timezone}."

    # Build user name context
    name_context = ""
    if user_name:
        name_context = f"The user's name is {user_name}. Feel free to use their name occasionally."

    # Map language code to language name for clarity
    language_names = {
        "en": "English",
        "es": "Spanish",
        "fr": "French",
        "de": "German",
        "it": "Italian",
        "pt": "Portuguese",
        "zh": "Chinese",
        "ja": "Japanese",
        "ko": "Korean"
    }
    language_name = language_names.get(language, "English")

    return f"""You are PAM, a friendly RV travel assistant with a warm, helpful personality.

## CRITICAL: Language Requirement
**ALWAYS speak in {language_name}.** This is your PRIMARY language for this conversation.
Do NOT switch to any other language unless the user explicitly speaks to you in that language first.

## User Context
{location_context}
{timezone_context}
{name_context}

## Your Role
You handle the voice conversation with the user. For simple interactions, respond directly.
For complex tasks, delegate to your supervisor (Claude) who has access to powerful tools.

## What YOU Handle Directly (respond immediately in {language_name}):
- Greetings: "Hi!", "Hello", "Hey PAM"
- Casual chat: "How are you?", "What's up?"
- Simple questions about yourself: "What can you do?"
- Acknowledgments: "Thanks", "Got it", "Okay"
- Clarifications: "What did you mean by...?"

## What You DELEGATE to Supervisor (call delegate_to_supervisor):
Your supervisor (Claude) has access to these powerful tools - ALWAYS delegate for these:
- **Calendar management**: Book appointments, check schedule, set reminders, create events
- **Budget & expenses**: Track spending, log expenses, check budget status, savings goals
- **Trip planning**: Plan routes, find RV parks, gas prices, attractions, road conditions
- **Weather forecasts**: Current weather, forecasts for any location
- **User profile**: Update settings, preferences, vehicle information
- **Social features**: Posts, messages, finding nearby RVers
- **Shopping**: Product recommendations, deals, nearby stores

## When to Delegate (ALWAYS call delegate_to_supervisor for these):
- "Book an appointment" → delegate (calendar)
- "What's on my calendar?" → delegate (calendar)
- "Track this expense" → delegate (budget)
- "How much have I spent?" → delegate (budget)
- "Plan a trip to..." → delegate (trip)
- "Find RV parks near..." → delegate (trip)
- "What's the weather?" → delegate (weather)
- "Find cheap gas" → delegate (trip)
- Any question requiring real data or taking an action

## Conversation Style
- Be warm, friendly, and conversational - in {language_name}
- Keep responses concise (1-2 sentences for simple things)
- When delegating, say something like "Let me check that for you..." or "One moment..."
- After getting supervisor response, speak it naturally (don't just read it robotically)

## Important Rules
1. **ALWAYS speak in {language_name}** unless the user switches languages
2. ALWAYS delegate if the user wants to DO something (book, create, track, find, etc.)
3. NEVER make up information - delegate to get accurate data
4. Keep the conversation flowing naturally even when delegating
5. Remember context from earlier in the conversation

You are NOT just a voice interface - you ARE PAM. Be helpful and personable!"""


def _get_supervisor_tool() -> list:
    """
    The single tool that bridges OpenAI Realtime to Claude supervisor.

    When OpenAI detects a complex request, it calls this tool with:
    - user_request: What the user is asking for
    - conversation_summary: Key context from the conversation

    The tool returns Claude's response which OpenAI then speaks.
    """
    return [
        {
            "type": "function",
            "name": "delegate_to_supervisor",
            "description": """Delegate complex requests to your supervisor (Claude) who has access to tools for:
- Calendar management (create/update/delete events, appointments)
- Budget tracking (expenses, spending summaries, savings)
- Trip planning (routes, RV parks, attractions, gas prices)
- Weather forecasts
- User profile and settings
- Social features (posts, messages)
- Shopping recommendations

Call this for ANY request that requires:
1. Looking up real data (calendar events, expenses, weather)
2. Taking an action (booking appointments, logging expenses)
3. Complex reasoning or recommendations
4. Information you don't have access to

DO NOT try to answer these yourself - always delegate.""",
            "parameters": {
                "type": "object",
                "properties": {
                    "user_request": {
                        "type": "string",
                        "description": "The user's request in their own words. Be specific and include all relevant details they mentioned."
                    },
                    "conversation_summary": {
                        "type": "string",
                        "description": "Brief summary of relevant conversation context (e.g., 'User previously mentioned they are in Denver' or 'Following up on the dentist appointment we discussed')"
                    },
                    "request_type": {
                        "type": "string",
                        "enum": ["calendar", "budget", "trip", "weather", "profile", "social", "shopping", "general"],
                        "description": "Category of the request to help route to appropriate tools"
                    }
                },
                "required": ["user_request", "request_type"]
            }
        }
    ]


def _get_minimal_instructions() -> str:
    """
    @deprecated Use _get_chat_supervisor_instructions instead.
    Kept for reference only.
    """
    return """You are a voice interface for PAM, an RV travel assistant.

Your ONLY job is to:
1. Listen to user speech and transcribe it accurately
2. Speak responses given to you in a natural, conversational tone

You do NOT:
- Make decisions
- Execute actions
- Answer questions
- Process requests

Keep your voice natural, friendly, and brief. Use the personality of a helpful travel companion."""


# =====================================================
# CLAUDE BRIDGE (WebSocket)
# =====================================================

@router.websocket("/bridge/{user_id}")
async def voice_to_claude_bridge(
    websocket: WebSocket,
    user_id: str
):
    """
    WebSocket bridge between browser and Claude (Chat-Supervisor Pattern).

    This bridge handles TWO types of requests:

    1. SUPERVISOR DELEGATION (new pattern):
       - OpenAI Realtime calls delegate_to_supervisor tool
       - Browser forwards tool call here with conversation_history
       - We execute via Claude with full context
       - Return response for OpenAI to speak

    2. DIRECT MESSAGE (legacy fallback):
       - Browser sends user message directly
       - We forward to Claude
       - Return response for OpenAI to speak

    The supervisor pattern is preferred because it:
    - Preserves conversation context across the bridge
    - Lets OpenAI decide when delegation is needed
    - Provides better user experience (faster simple responses)
    """
    await websocket.accept()

    # Conversation history for context preservation
    conversation_history = []

    try:
        # Initialize PAM instance variable
        pam = None

        pam_logger.info(
            f"🔗 Voice bridge connected for user {user_id} (chat-supervisor mode)",
            extra={"user_id": user_id, "connection_type": "chat_supervisor"}
        )

        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")

            # =====================================================
            # SUPERVISOR TOOL CALL (Chat-Supervisor Pattern)
            # OpenAI Realtime called delegate_to_supervisor
            # =====================================================
            if message_type == "supervisor_request":
                user_request = data.get("user_request", "")
                conversation_summary = data.get("conversation_summary", "")
                request_type = data.get("request_type", "general")
                browser_context = data.get("context", {})

                pam_logger.info(
                    f"🎯 Supervisor delegation: type={request_type}, request={user_request[:50]}...",
                    extra={
                        "user_id": user_id,
                        "request_type": request_type,
                        "has_context": bool(conversation_summary)
                    }
                )

                # Load full context
                context = await _load_voice_context(user_id, browser_context)

                # Add conversation summary to context for Claude
                if conversation_summary:
                    context["conversation_summary"] = conversation_summary

                # Add conversation history for multi-turn context
                context["conversation_history"] = conversation_history

                # Get PAM instance
                user_language = context.get("language", "en")
                pam = await get_pam(user_id, user_language=user_language)

                # Build message with context for Claude
                # Include conversation summary if available
                enhanced_message = user_request
                if conversation_summary:
                    enhanced_message = f"[Context: {conversation_summary}]\n\nUser request: {user_request}"

                # Execute via Claude
                pam_result = await pam.chat(
                    message=enhanced_message,
                    context=context,
                    stream=False
                )

                # Extract response
                if isinstance(pam_result, dict):
                    claude_response = pam_result.get("text", "")
                    ui_actions = pam_result.get("ui_actions", [])
                else:
                    claude_response = pam_result
                    ui_actions = []

                # Update conversation history
                conversation_history.append({"role": "user", "content": user_request})
                conversation_history.append({"role": "assistant", "content": claude_response})

                # Keep history manageable (last 20 turns)
                if len(conversation_history) > 40:
                    conversation_history = conversation_history[-40:]

                # Send response back
                await websocket.send_json({
                    "type": "supervisor_response",
                    "text": claude_response,
                    "ui_actions": ui_actions,
                    "request_type": request_type
                })

                pam_logger.info(
                    f"🤖 Supervisor response: {claude_response[:50]}...",
                    extra={"user_id": user_id, "response_length": len(claude_response)}
                )

            # =====================================================
            # LEGACY: DIRECT USER MESSAGE
            # Kept for backward compatibility
            # =====================================================
            elif message_type == "user_message":
                user_text = data.get("text", "")
                browser_context = data.get("context", {})

                pam_logger.info(
                    f"📨 Direct message (legacy mode): {user_text[:50]}...",
                    extra={"user_id": user_id}
                )

                # Load context
                context = await _load_voice_context(user_id, browser_context)
                context["conversation_history"] = conversation_history

                # Get PAM instance
                user_language = context.get("language", "en")
                pam = await get_pam(user_id, user_language=user_language)

                # Execute via Claude
                pam_result = await pam.chat(
                    message=user_text,
                    context=context,
                    stream=False
                )

                # Extract response
                if isinstance(pam_result, dict):
                    claude_response = pam_result.get("text", "")
                    ui_actions = pam_result.get("ui_actions", [])
                else:
                    claude_response = pam_result
                    ui_actions = []

                # Update conversation history
                conversation_history.append({"role": "user", "content": user_text})
                conversation_history.append({"role": "assistant", "content": claude_response})

                # Send response
                await websocket.send_json({
                    "type": "assistant_response",
                    "text": claude_response,
                    "ui_actions": ui_actions,
                    "timestamp": data.get("timestamp")
                })

            elif message_type == "ping":
                await websocket.send_json({"type": "pong"})

            elif message_type == "clear_history":
                # Allow client to reset conversation context
                conversation_history = []
                await websocket.send_json({"type": "history_cleared"})
                pam_logger.info(f"🧹 Conversation history cleared for user {user_id}")

            else:
                logger.warning(f"Unknown message type: {message_type}")

    except WebSocketDisconnect:
        pam_logger.info(
            f"🔌 Voice bridge disconnected for user {user_id}",
            extra={"user_id": user_id}
        )
    except Exception as e:
        logger.error(f"Error in voice bridge: {e}")
        logger.error(traceback.format_exc())
        await websocket.close(code=1011, reason=str(e))


async def _load_voice_context(user_id: str, browser_context: dict) -> dict:
    """
    Load full user context for voice requests.
    Combines cached server-side context with browser-provided context.
    """
    try:
        from app.services.pam.cache_warming import get_cache_warming_service
        cache_service = await get_cache_warming_service()

        # Load cached context (profile, financial, preferences)
        cached_context = await cache_service.get_cached_user_context(user_id)

        # Merge: cached context first, browser context on top
        context = {
            **(cached_context or {}),
            **browser_context,
            "is_voice": True,  # Always true for voice requests
        }

        pam_logger.debug(
            f"📦 Voice context loaded: {list(context.keys())}",
            extra={"user_id": user_id}
        )

        return context

    except Exception as e:
        pam_logger.warning(f"⚠️ Failed to load cached context: {e}")
        return {**browser_context, "is_voice": True}


# =====================================================
# DIRECT TOOL EXECUTION (Alternative Flow)
# =====================================================

@router.post("/execute-tool")
async def execute_tool_for_voice(
    request: ToolExecutionRequest,
    current_user: CurrentUser = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Execute PAM tool and return result.

    Used when browser wants to execute a tool directly
    (e.g., if doing tool calling on frontend side).

    For hybrid approach, this is less common - we prefer
    the WebSocket bridge where Claude decides tools.
    """
    try:
        # Get PAM instance
        pam = await get_pam(request.user_id)

        # Execute tool via PAM's tool system
        result = await pam._execute_tool(
            tool_name=request.tool_name,
            tool_input=request.arguments
        )

        return {
            "success": True,
            "tool": request.tool_name,
            "result": result
        }

    except Exception as e:
        logger.error(f"Tool execution failed: {e}")
        return {
            "success": False,
            "error": str(e)
        }


# =====================================================
# HEALTH CHECK
# =====================================================

@router.get("/health")
async def voice_health_check():
    """Check if voice hybrid system is operational"""

    openai_configured = bool(os.getenv('OPENAI_API_KEY'))

    return {
        "status": "healthy" if openai_configured else "degraded",
        "openai_configured": openai_configured,
        "architecture": "hybrid",
        "voice_provider": "openai_realtime",
        "reasoning_provider": "claude_sonnet_4.5"
    }
