"""
PAM Hybrid Voice System - Backend Bridge
OpenAI Realtime API (voice I/O) + Claude Sonnet 4.5 (reasoning)

This endpoint creates secure sessions and forwards tool calls to Claude.
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
                        "instructions": _get_minimal_instructions(),
                        "tools": [],
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


def _get_minimal_instructions() -> str:
    """
    Minimal instructions for OpenAI Realtime.

    OpenAI only handles voice I/O - no reasoning, no tools.
    Just transcribe what user says and speak what we send back.
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
    WebSocket bridge between browser and Claude.

    Browser flow:
    1. Browser establishes WebRTC with OpenAI Realtime (voice I/O)
    2. Browser establishes WebSocket with this endpoint (text bridge)
    3. When user speaks, OpenAI transcribes → browser sends text here
    4. We forward to Claude via existing PAM system
    5. Claude responds with text → we send back to browser
    6. Browser sends text to OpenAI Realtime for TTS

    This keeps Claude as the brain, OpenAI as the voice.
    """
    await websocket.accept()

    try:
        # Initialize PAM instance variable (will be set when we receive first message with context)
        pam = None

        pam_logger.info(
            f"🔗 Voice bridge connected for user {user_id}",
            extra={"user_id": user_id, "connection_type": "hybrid_voice"}
        )

        while True:
            # Receive text from browser (transcribed by OpenAI)
            data = await websocket.receive_json()

            message_type = data.get("type")

            if message_type == "user_message":
                # User spoke, OpenAI transcribed, now process with Claude
                user_text = data.get("text", "")
                context = data.get("context", {})

                # Get or update PAM instance with user's language preference
                # Prefer context language if explicitly provided; otherwise read from cached profile
                user_language = context.get("language")
                if not user_language:
                    try:
                        from app.services.pam.cache_warming import get_cache_warming_service
                        cache_service = await get_cache_warming_service()
                        cached_ctx = await cache_service.get_cached_user_context(user_id)
                        user_language = (cached_ctx or {}).get("language", "en")
                    except Exception:
                        user_language = "en"

                pam = await get_pam(user_id, user_language=user_language)

                pam_logger.info(
                    f"👤 User voice input: {user_text[:50]}...",
                    extra={"user_id": user_id, "input_length": len(user_text)}
                )

                # Forward to Claude (existing PAM system)
                claude_response = await pam.chat(
                    message=user_text,
                    context=context,
                    stream=False  # Get complete response
                )

                # Send Claude's response back to browser
                await websocket.send_json({
                    "type": "assistant_response",
                    "text": claude_response,
                    "timestamp": data.get("timestamp")
                })

                pam_logger.info(
                    f"🤖 Claude response sent: {claude_response[:50]}...",
                    extra={"user_id": user_id, "response_length": len(claude_response)}
                )

            elif message_type == "ping":
                # Keepalive
                await websocket.send_json({"type": "pong"})

            else:
                logger.warning(f"Unknown message type: {message_type}")

    except WebSocketDisconnect:
        pam_logger.info(
            f"🔌 Voice bridge disconnected for user {user_id}",
            extra={"user_id": user_id}
        )
    except Exception as e:
        logger.error(f"Error in voice bridge: {e}")
        await websocket.close(code=1011, reason=str(e))


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
