"""
PAM Turn Handler - Unified message processing for text and voice

This module provides a single entry point for processing PAM conversations,
used by both text chat (REST/WebSocket) and voice endpoints.
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime

from app.core.logging import get_logger
from app.services.pam.enhanced_orchestrator import get_enhanced_orchestrator, ResponseMode

logger = get_logger(__name__)


async def handle_pam_turn(
    user_id: str,
    message: str,
    frontend_context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Unified PAM conversation turn handler for both text and voice.

    This function encapsulates all PAM processing logic:
    - Builds full context (profile, financial, social, location)
    - Calls AI orchestrator with appropriate tools
    - Persists conversation to database
    - Returns structured response

    Args:
        user_id: User UUID string
        message: User's message (from text input or STT transcription)
        frontend_context: Optional context from frontend (location, page, etc.)

    Returns:
        Dict with keys:
            - response_text: str - PAM's response message
            - confidence: float - Response confidence (0.0-1.0)
            - suggestions: list - Optional follow-up suggestions
            - actions: list - Optional UI actions to trigger
            - processing_time_ms: int - Time taken to process
            - service_status: str - Health status of services used
            - capabilities_used: list - Which PAM capabilities were invoked

    Example:
        >>> result = await handle_pam_turn(
        ...     user_id="user-123",
        ...     message="What's the weather like?",
        ...     frontend_context={"user_location": {"lat": -33.8688, "lng": 151.2093}}
        ... )
        >>> print(result["response_text"])
        "It's currently 72°F and sunny in Sydney..."
    """

    start_time = datetime.utcnow()

    try:
        # Get enhanced orchestrator instance (initializes if needed)
        orchestrator = await get_enhanced_orchestrator()

        # Build context dictionary for orchestrator
        context = frontend_context or {}
        context["user_id"] = user_id

        # Extract location if provided (frontend may send as userLocation or user_location)
        if "userLocation" in context and "user_location" not in context:
            context["user_location"] = context["userLocation"]

        # Extract user_location for orchestrator parameter (expects tuple)
        user_location = None
        if "user_location" in context and isinstance(context["user_location"], dict):
            loc = context["user_location"]
            if "lat" in loc and "lng" in loc:
                user_location = (loc["lat"], loc["lng"])

        # Generate session_id if not provided
        session_id = context.get("session_id") or context.get("conversation_id")

        # Determine response mode (voice requests should use ADAPTIVE or VOICE mode)
        response_mode = ResponseMode.ADAPTIVE
        if context.get("voice_mode") or context.get("input_mode") == "voice":
            response_mode = ResponseMode.ADAPTIVE  # Let orchestrator decide voice vs text

        logger.info(f"🎯 handle_pam_turn: user={user_id}, message='{message[:50]}...', location={user_location}, mode={response_mode}")

        # Call enhanced orchestrator's process_message
        response = await orchestrator.process_message(
            user_id=user_id,
            message=message,
            session_id=session_id,
            context=context,
            response_mode=response_mode,
            user_location=user_location
        )

        # Calculate processing time
        processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000

        # Normalize response to consistent structure
        normalized_response = {
            "response_text": response.get("content", ""),
            "confidence": response.get("confidence", 0.5),
            "suggestions": response.get("suggestions", []),
            "actions": response.get("actions", []),
            "processing_time_ms": int(response.get("processing_time_ms", processing_time)),
            "service_status": response.get("service_status", "unknown"),
            "capabilities_used": response.get("capabilities_used", []),
            # Pass through additional fields for specific use cases
            "audio_data": response.get("audio_data"),  # For voice responses
            "knowledge_enhanced": response.get("knowledge_enhanced", False),
            "voice_enabled": response.get("voice_enabled", False),
            "response_mode": response.get("response_mode", "text_only"),
            "proactive_suggestions": response.get("proactive_suggestions"),  # For voice proactive features
        }

        logger.info(f"✅ handle_pam_turn completed in {processing_time:.2f}ms")

        return normalized_response

    except Exception as e:
        processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        logger.error(f"❌ handle_pam_turn error: {e}")
        logger.error(f"❌ Exception type: {type(e).__name__}")

        # Return error response with consistent structure
        return {
            "response_text": "I encountered an issue processing your request. Please try again.",
            "confidence": 0.0,
            "suggestions": [],
            "actions": [],
            "processing_time_ms": int(processing_time),
            "service_status": "error",
            "capabilities_used": [],
            "error": str(e),
            "error_type": type(e).__name__
        }
