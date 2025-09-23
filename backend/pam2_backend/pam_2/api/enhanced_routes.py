"""
Enhanced PAM 2.0 API Routes
===========================

Additional API endpoints for voice, MCP, and advanced features.
"""

import asyncio
import base64
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from ..core.types import ServiceStatus
from ..core.exceptions import PAMServiceError
from ..services.voice_service import get_voice_service, VoiceSettings, VoiceProvider, AudioFormat
from ..integrations.mcp_client import get_mcp_client
from ..services.advanced_features import get_advanced_features_service, MultiModalInput

logger = logging.getLogger(__name__)

# Create enhanced router
enhanced_router = APIRouter(prefix="/api/v1/enhanced", tags=["PAM 2.0 Enhanced"])


# Pydantic models for requests/responses
class TTSRequest(BaseModel):
    text: str
    voice_settings: Optional[Dict[str, Any]] = None
    user_id: Optional[str] = None


class TTSResponse(BaseModel):
    audio_base64: str
    format: str
    cached: bool
    provider: str
    latency_ms: float


class MCPToolRequest(BaseModel):
    tool_name: str
    parameters: Dict[str, Any]
    user_id: Optional[str] = None


class MCPToolResponse(BaseModel):
    success: bool
    output: Any
    error: Optional[str] = None
    execution_time_ms: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None


class IntelligentChatRequest(BaseModel):
    text: Optional[str] = None
    user_id: str
    conversation_history: Optional[List[Dict[str, Any]]] = None
    location: Optional[List[float]] = None  # [lat, lng]
    context_data: Optional[Dict[str, Any]] = None


class IntelligentChatResponse(BaseModel):
    response: Dict[str, Any]
    multimodal_insights: Dict[str, Any]
    personality_profile: Dict[str, float]
    processing_time_ms: float


# Voice Service Endpoints
@enhanced_router.post("/voice/synthesize", response_model=TTSResponse)
async def synthesize_text_to_speech(request: TTSRequest):
    """
    Convert text to speech using TTS service

    - **text**: Text to synthesize
    - **voice_settings**: Optional voice configuration
    - **user_id**: User ID for personalization
    """
    try:
        voice_service = await get_voice_service()

        # Parse voice settings
        settings = VoiceSettings()
        if request.voice_settings:
            for key, value in request.voice_settings.items():
                if hasattr(settings, key):
                    setattr(settings, key, value)

        response = await voice_service.synthesize(
            text=request.text,
            settings=settings,
            user_id=request.user_id
        )

        if response.status != ServiceStatus.SUCCESS:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=response.error or "TTS synthesis failed"
            )

        return TTSResponse(
            audio_base64=response.data["audio"],
            format=response.data["format"],
            cached=response.data["cached"],
            provider=response.data["provider"],
            latency_ms=response.data.get("latency_ms", 0)
        )

    except Exception as e:
        logger.error(f"TTS synthesis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@enhanced_router.post("/voice/transcribe")
async def transcribe_speech_to_text(
    audio_file: UploadFile = File(...),
    user_id: Optional[str] = None
):
    """
    Convert speech to text using STT service

    - **audio_file**: Audio file to transcribe
    - **user_id**: User ID for personalization
    """
    try:
        voice_service = await get_voice_service()

        # Read audio file
        audio_data = await audio_file.read()

        # Determine format from filename
        audio_format = AudioFormat.WEBM  # Default
        if audio_file.filename:
            if audio_file.filename.endswith('.wav'):
                audio_format = AudioFormat.WAV
            elif audio_file.filename.endswith('.mp3'):
                audio_format = AudioFormat.MP3
            elif audio_file.filename.endswith('.ogg'):
                audio_format = AudioFormat.OGG

        response = await voice_service.transcribe(
            audio_data=audio_data,
            format=audio_format,
            user_id=user_id
        )

        if response.status != ServiceStatus.SUCCESS:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=response.error or "STT transcription failed"
            )

        return {
            "text": response.data["text"],
            "confidence": response.data["confidence"],
            "language": response.data["language"],
            "provider": response.data["provider"],
            "latency_ms": response.data.get("latency_ms", 0),
            "alternatives": response.data.get("alternatives", [])
        }

    except Exception as e:
        logger.error(f"STT transcription failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@enhanced_router.get("/voice/stream/{text}")
async def stream_synthesized_audio(text: str, user_id: Optional[str] = None):
    """
    Stream synthesized audio for real-time playback

    - **text**: Text to synthesize and stream
    - **user_id**: User ID for personalization
    """
    try:
        voice_service = await get_voice_service()

        async def audio_stream():
            async for chunk in voice_service.stream_synthesize(
                text=text,
                user_id=user_id
            ):
                yield chunk

        return StreamingResponse(
            audio_stream(),
            media_type="audio/mp3",
            headers={"Content-Disposition": "inline; filename=speech.mp3"}
        )

    except Exception as e:
        logger.error(f"Audio streaming failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# MCP Integration Endpoints
@enhanced_router.post("/mcp/execute", response_model=MCPToolResponse)
async def execute_mcp_tool(request: MCPToolRequest):
    """
    Execute an MCP tool

    - **tool_name**: Name of the tool to execute
    - **parameters**: Tool parameters
    - **user_id**: User ID for authorization
    """
    try:
        mcp_client = await get_mcp_client()

        response = await mcp_client.execute_tool(
            tool_name=request.tool_name,
            parameters=request.parameters,
            user_id=request.user_id
        )

        if response.status != ServiceStatus.SUCCESS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=response.error or "Tool execution failed"
            )

        return MCPToolResponse(
            success=True,
            output=response.data["output"],
            execution_time_ms=response.data.get("execution_time_ms"),
            metadata=response.data.get("metadata")
        )

    except Exception as e:
        logger.error(f"MCP tool execution failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@enhanced_router.get("/mcp/tools")
async def list_mcp_tools():
    """
    List available MCP tools
    """
    try:
        mcp_client = await get_mcp_client()

        tools = mcp_client.get_tool_definitions()

        return {
            "tools": tools,
            "count": len(tools),
            "categories": list(set(tool["category"] for tool in tools))
        }

    except Exception as e:
        logger.error(f"Failed to list MCP tools: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# Advanced Features Endpoints
@enhanced_router.post("/intelligent/chat", response_model=IntelligentChatResponse)
async def intelligent_chat(request: IntelligentChatRequest):
    """
    Intelligent chat with advanced features

    - **text**: Chat message text
    - **user_id**: User ID for personalization
    - **conversation_history**: Recent conversation history
    - **location**: User location [latitude, longitude]
    - **context_data**: Additional context data
    """
    try:
        advanced_service = await get_advanced_features_service()

        # Create multimodal input
        input_data = MultiModalInput(
            text=request.text,
            location=tuple(request.location) if request.location else None,
            metadata=request.context_data
        )

        response = await advanced_service.process_intelligent_request(
            user_id=request.user_id,
            input_data=input_data,
            conversation_history=request.conversation_history
        )

        if response.status != ServiceStatus.SUCCESS:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=response.error or "Intelligent processing failed"
            )

        return IntelligentChatResponse(
            response=response.data["response"],
            multimodal_insights=response.data["multimodal_insights"],
            personality_profile=response.data["personality_profile"],
            processing_time_ms=response.data["processing_time_ms"]
        )

    except Exception as e:
        logger.error(f"Intelligent chat failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@enhanced_router.post("/intelligent/multimodal")
async def process_multimodal_input(
    text: Optional[str] = None,
    user_id: str = None,
    audio_file: Optional[UploadFile] = File(None),
    image_file: Optional[UploadFile] = File(None),
    document_file: Optional[UploadFile] = File(None)
):
    """
    Process multi-modal input (text, audio, images, documents)

    - **text**: Text input
    - **user_id**: User ID for personalization
    - **audio_file**: Audio file (optional)
    - **image_file**: Image file (optional)
    - **document_file**: Document file (optional)
    """
    try:
        advanced_service = await get_advanced_features_service()

        # Read file data
        audio_data = await audio_file.read() if audio_file else None
        image_data = await image_file.read() if image_file else None
        document_data = await document_file.read() if document_file else None

        # Create multimodal input
        input_data = MultiModalInput(
            text=text,
            audio_data=audio_data,
            image_data=image_data,
            document_data=document_data
        )

        response = await advanced_service.process_intelligent_request(
            user_id=user_id,
            input_data=input_data
        )

        if response.status != ServiceStatus.SUCCESS:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=response.error or "Multimodal processing failed"
            )

        return response.data

    except Exception as e:
        logger.error(f"Multimodal processing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# Health and Metrics Endpoints
@enhanced_router.get("/health")
async def enhanced_health_check():
    """
    Health check for enhanced services
    """
    try:
        # Check all enhanced services
        voice_service = await get_voice_service()
        mcp_client = await get_mcp_client()
        advanced_service = await get_advanced_features_service()

        voice_health = await voice_service.health_check()
        mcp_health = await mcp_client.health_check()
        advanced_health = await advanced_service.health_check()

        all_healthy = all([
            voice_health.status == ServiceStatus.SUCCESS,
            mcp_health.status == ServiceStatus.SUCCESS,
            advanced_health.status == ServiceStatus.SUCCESS
        ])

        return {
            "status": "healthy" if all_healthy else "degraded",
            "timestamp": datetime.now().isoformat(),
            "services": {
                "voice": {
                    "status": voice_health.status.value,
                    "providers": voice_health.data.get("healthy_providers", [])
                },
                "mcp": {
                    "status": mcp_health.status.value,
                    "tools": mcp_health.data.get("healthy_tools", [])
                },
                "advanced": {
                    "status": advanced_health.status.value,
                    "components": advanced_health.data.get("components", {})
                }
            }
        }

    except Exception as e:
        logger.error(f"Enhanced health check failed: {e}")
        return {
            "status": "error",
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }


@enhanced_router.get("/metrics")
async def enhanced_metrics():
    """
    Get metrics for enhanced services
    """
    try:
        voice_service = await get_voice_service()
        mcp_client = await get_mcp_client()
        advanced_service = await get_advanced_features_service()

        return {
            "timestamp": datetime.now().isoformat(),
            "voice": voice_service.get_metrics(),
            "mcp": mcp_client.get_metrics(),
            "advanced": advanced_service.get_metrics()
        }

    except Exception as e:
        logger.error(f"Enhanced metrics failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )