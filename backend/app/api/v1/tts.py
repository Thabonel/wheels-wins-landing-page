"""
TTS API Endpoints
RESTful API for text-to-speech functionality
"""

from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
import io
import logging

from app.api.deps import get_current_user
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()

# Pydantic models for API requests/responses
class VoiceSettings(BaseModel):
    stability: float = Field(default=0.75, ge=0.0, le=1.0)
    similarity_boost: float = Field(default=0.75, ge=0.0, le=1.0)
    speed: float = Field(default=1.0, ge=0.25, le=4.0)
    pitch: float = Field(default=1.0, ge=0.5, le=2.0)
    volume: float = Field(default=1.0, ge=0.0, le=1.0)
    style: str = Field(default="friendly")

class VoiceProfile(BaseModel):
    voice_id: str
    name: str
    gender: str
    age: str
    accent: str
    language: str = "en"
    engine: str
    settings: VoiceSettings

class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="Text to synthesize")
    voice_id: Optional[str] = Field(None, description="Specific voice ID to use")
    format: str = Field(default="mp3", description="Audio format (mp3, wav, ogg)")
    sample_rate: int = Field(default=22050, description="Audio sample rate")
    use_cache: bool = Field(default=True, description="Use cached audio if available")
    context: str = Field(default="general_conversation", description="Conversation context")

class VoicePreferenceRequest(BaseModel):
    voice_profile: VoiceProfile
    context: Optional[str] = None
    is_default: bool = False

class VoiceRatingRequest(BaseModel):
    voice_profile: VoiceProfile
    rating: float = Field(..., ge=1.0, le=5.0)
    feedback: Optional[str] = None

@router.post("/synthesize")
async def synthesize_speech(
    request: TTSRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Synthesize text to speech
    Returns audio data as bytes
    """
    try:
        # Import TTS service
        from app.services.tts.tts_service import tts_service
        
        if not tts_service.is_initialized:
            raise HTTPException(status_code=503, detail="TTS service not available")
        
        user_id = current_user.get("id")
        
        # Synthesize speech
        response = await tts_service.synthesize_for_pam(
            text=request.text,
            user_id=user_id,
            context=request.context,
            voice_preference=request.voice_id,
            stream=False
        )
        
        if not response or not response.success:
            error_msg = response.error if response else "TTS synthesis failed"
            raise HTTPException(status_code=500, detail=error_msg)
        
        # Determine content type
        content_type_map = {
            "mp3": "audio/mpeg",
            "wav": "audio/wav", 
            "ogg": "audio/ogg"
        }
        content_type = content_type_map.get(request.format, "audio/mpeg")
        
        # Return audio data
        return Response(
            content=response.audio_data,
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename=speech.{request.format}",
                "X-Generation-Time": str(response.generation_time_ms),
                "X-Duration": str(response.duration_ms),
                "X-Engine": response.engine_used.value if response.engine_used else "unknown",
                "X-Cache-Hit": str(response.cache_hit)
            }
        )
        
    except Exception as e:
        logger.error(f"❌ TTS synthesis API error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/synthesize/stream")
async def synthesize_speech_stream(
    request: TTSRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Synthesize text to speech with streaming
    Returns audio chunks as they're generated
    """
    try:
        from app.services.tts.tts_service import tts_service
        
        if not tts_service.is_initialized:
            raise HTTPException(status_code=503, detail="TTS service not available")
        
        user_id = current_user.get("id")
        
        # Get streaming generator
        audio_stream = await tts_service.synthesize_for_pam(
            text=request.text,
            user_id=user_id,
            context=request.context,
            voice_preference=request.voice_id,
            stream=True
        )
        
        if not audio_stream:
            raise HTTPException(status_code=500, detail="TTS streaming failed")
        
        # Stream audio chunks
        async def audio_generator():
            try:
                async for chunk in audio_stream:
                    if chunk.data:
                        yield chunk.data
                    if chunk.is_final:
                        break
            except Exception as e:
                logger.error(f"❌ Audio streaming error: {e}")
                # Yield empty bytes to end stream gracefully
                yield b''
        
        content_type_map = {
            "mp3": "audio/mpeg",
            "wav": "audio/wav",
            "ogg": "audio/ogg"
        }
        content_type = content_type_map.get(request.format, "audio/mpeg")
        
        return StreamingResponse(
            audio_generator(),
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename=speech_stream.{request.format}",
                "X-Streaming": "true"
            }
        )
        
    except Exception as e:
        logger.error(f"❌ TTS streaming API error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/voices")
async def get_available_voices(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get available TTS voices
    Returns personalized recommendations if user_id provided
    """
    try:
        from app.services.tts.tts_service import tts_service
        
        if not tts_service.is_initialized:
            raise HTTPException(status_code=503, detail="TTS service not available")
        
        user_id = current_user.get("id")
        voices = await tts_service.get_available_voices(user_id)
        
        return {
            "voices": voices,
            "total_count": len(voices),
            "personalized": bool(user_id)
        }
        
    except Exception as e:
        logger.error(f"❌ Get voices API error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/voices/preference")
async def set_voice_preference(
    request: VoicePreferenceRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Set user voice preference"""
    try:
        from app.services.tts.tts_service import tts_service
        
        if not tts_service.is_initialized:
            raise HTTPException(status_code=503, detail="TTS service not available")
        
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User authentication required")
        
        # Convert Pydantic model to dict
        voice_data = request.voice_profile.dict()
        
        success = await tts_service.set_user_voice_preference(
            user_id=user_id,
            voice_data=voice_data,
            context=request.context,
            is_default=request.is_default
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to set voice preference")
        
        return {
            "success": True,
            "message": "Voice preference saved successfully"
        }
        
    except Exception as e:
        logger.error(f"❌ Set voice preference API error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/voices/rate")
async def rate_voice(
    request: VoiceRatingRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Rate a voice interaction"""
    try:
        from app.services.tts.tts_service import tts_service
        
        if not tts_service.is_initialized:
            raise HTTPException(status_code=503, detail="TTS service not available")
        
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User authentication required")
        
        voice_data = request.voice_profile.dict()
        
        success = await tts_service.rate_voice(
            user_id=user_id,
            voice_data=voice_data,
            rating=request.rating,
            feedback=request.feedback
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to save voice rating")
        
        return {
            "success": True,
            "message": "Voice rating saved successfully"
        }
        
    except Exception as e:
        logger.error(f"❌ Rate voice API error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def get_tts_status():
    """Get TTS service status and health"""
    try:
        from app.services.tts.tts_service import tts_service
        
        status = await tts_service.get_service_status()
        return status
        
    except Exception as e:
        logger.error(f"❌ TTS status API error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics")
async def get_user_analytics(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get user TTS usage analytics"""
    try:
        from app.services.tts.tts_service import tts_service
        
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User authentication required")
        
        analytics = await tts_service.get_user_analytics(user_id)
        return analytics
        
    except Exception as e:
        logger.error(f"❌ TTS analytics API error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/cache/clear")
async def clear_tts_cache(
    older_than_hours: Optional[int] = Query(None, description="Clear entries older than X hours"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Clear TTS cache (admin only)"""
    try:
        # Check if user is admin
        if not current_user.get("is_admin", False):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        from app.services.tts.tts_service import tts_service
        
        result = await tts_service.clear_cache(older_than_hours)
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Clear cache API error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/quality/report")
async def get_quality_report(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get TTS quality monitoring report (admin only)"""
    try:
        # Check if user is admin
        if not current_user.get("is_admin", False):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        from app.services.tts.quality_monitor import quality_monitor
        
        report = quality_monitor.get_quality_report()
        return report
        
    except Exception as e:
        logger.error(f"❌ Quality report API error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/test")
async def test_tts():
    """Test TTS functionality"""
    try:
        from app.services.tts.tts_service import tts_service
        
        if not tts_service.is_initialized:
            return {
                "status": "not_available",
                "message": "TTS service not initialized"
            }
        
        # Test synthesis with a simple phrase
        test_text = "Hello! This is a test of the TTS system."
        
        response = await tts_service.synthesize_for_pam(
            text=test_text,
            context="test",
            stream=False
        )
        
        if response and response.success:
            return {
                "status": "healthy",
                "message": "TTS test successful",
                "generation_time_ms": response.generation_time_ms,
                "engine_used": response.engine_used.value if response.engine_used else "unknown",
                "audio_size_bytes": len(response.audio_data) if response.audio_data else 0
            }
        else:
            return {
                "status": "unhealthy",
                "message": "TTS test failed",
                "error": response.error if response else "Unknown error"
            }
            
    except Exception as e:
        logger.error(f"❌ TTS test error: {e}")
        return {
            "status": "error",
            "message": str(e)
        }