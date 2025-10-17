"""
OpenAI Realtime Session Management
Creates ephemeral session tokens for secure browser connections
"""

import os
import logging
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from openai import AsyncOpenAI

from app.api.deps import get_current_user
from app.models.user import User
from app.services.usage_tracking_service import track_session_start

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pam/realtime", tags=["pam-realtime"])


@router.post("/create-session")
async def create_openai_session(
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Create ephemeral OpenAI Realtime session token

    Returns short-lived token (1 hour) for browser to connect directly to OpenAI.
    Backend never exposes API key in browser - only session tokens.
    """
    try:
        client = AsyncOpenAI(api_key=os.getenv('OPENAI_API_KEY'))

        # Get tool definitions (convert from Claude format)
        tools = await _get_tool_definitions_openai_format()

        # Create ephemeral session
        session = await client.realtime.sessions.create(
            model='gpt-4o-realtime-preview-2024-10-01',
            voice='alloy',
            instructions=_get_pam_system_prompt(),
            modalities=['text', 'audio'],
            input_audio_format='pcm16',
            output_audio_format='pcm16',
            tools=tools,
            temperature=0.8,
            max_response_output_tokens=4096
        )

        # Track session creation
        await track_session_start(current_user.id)

        logger.info(f"✅ Created OpenAI session for user {current_user.id}")

        return {
            'session_token': session.client_secret.value,
            'expires_at': session.expires_at,
            'ws_url': 'wss://api.openai.com/v1/realtime',
            'model': 'gpt-4o-realtime-preview-2024-10-01'
        }

    except Exception as e:
        logger.error(f"❌ Failed to create OpenAI session: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create session: {str(e)}"
        )


def _get_pam_system_prompt() -> str:
    """PAM personality and instructions"""
    return """You are PAM (Personal AI Manager), the AI travel companion for Wheels & Wins RV travelers.

Your Core Identity:
- You're a competent, friendly travel partner (not a servant, not a boss - an equal)
- You help RVers save money, plan trips, manage budgets, and stay connected
- You take ACTION - you don't just answer questions, you DO things

Your Personality:
- Friendly, not cutesy: "I've got you" not "OMG yay!"
- Confident, not arrogant: "I found 3 campgrounds" not "I'm the best"
- Helpful, not pushy: "Want directions?" not "You should go now"
- Brief by default: 1-2 sentences. Expand if user asks "tell me more"

You have access to 40+ tools to help users with:
- Budget tracking and financial management
- Trip planning and route optimization
- Finding campgrounds, gas stations, attractions
- Social features and community
- Shopping and gear recommendations
- Profile and settings management

Use tools proactively when users ask for help. Be conversational and natural."""


async def _get_tool_definitions_openai_format() -> list:
    """
    Convert PAM tools from Claude format to OpenAI format

    Uses automated converter to transform all 40+ tools
    """
    from app.services.pam.tools.tool_registry import get_all_tools
    from app.services.pam.openai_tool_converter import claude_to_openai_tools

    claude_tools = get_all_tools()
    openai_tools = claude_to_openai_tools(claude_tools)

    logger.info(f"✅ Converted {len(openai_tools)} tools to OpenAI format")

    return openai_tools
