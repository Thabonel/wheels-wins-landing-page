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
    current_user: Dict[str, Any] = Depends(get_current_user),
    simulate_error: Optional[str] = Query(None, description="Simulate error for testing recovery")
):
    """
    Synthesize text to speech with error recovery support
    Returns audio data as bytes
    """
    try:
        # Simulate errors for testing recovery system
        if simulate_error:
            await _simulate_error_for_testing(simulate_error)
        
        # Import TTS service - use new TTS Manager if available
        try:
            from app.services.tts.tts_manager import get_tts_manager
            tts_service = get_tts_manager()
            use_new_manager = True
        except ImportError:
            from app.services.tts.tts_service import tts_service
            use_new_manager = False
        
        if not tts_service.is_initialized:
            raise HTTPException(
                status_code=503, 
                detail={
                    "error": "TTS service not available",
                    "error_type": "service_unavailable",
                    "recoverable": True,
                    "retry_after": 5000
                }
            )
        
        user_id = current_user.get("id")
        
        # Synthesize speech with error recovery support
        if use_new_manager:
            response = await tts_service.synthesize_for_pam(
                text=request.text,
                user_id=str(user_id),
                context=request.context,
                stream=False
            )
        else:
            response = await tts_service.synthesize_for_pam(
                text=request.text,
                user_id=user_id,
                context=request.context,
                voice_preference=request.voice_id,
                stream=False
            )
        
        if not response or not response.success:
            error_msg = response.error if response else "TTS synthesis failed"
            
            # Enhanced error response for recovery system
            raise HTTPException(
                status_code=503,  # Service Temporarily Unavailable
                detail={
                    "error": error_msg,
                    "error_type": "synthesis_failure",
                    "recoverable": True,
                    "suggested_action": "retry_with_fallback",
                    "retry_after": 2000,
                    "fallback_available": True
                }
            )
        
        # Determine content type
        content_type_map = {
            "mp3": "audio/mpeg",
            "wav": "audio/wav", 
            "ogg": "audio/ogg"
        }
        content_type = content_type_map.get(request.format, "audio/mpeg")
        
        # Return audio data with recovery metadata
        return Response(
            content=response.audio_data,
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename=speech.{request.format}",
                "X-Generation-Time": str(response.generation_time_ms),
                "X-Duration": str(response.duration_ms),
                "X-Engine": response.engine_used.value if response.engine_used else "unknown",
                "X-Cache-Hit": str(response.cache_hit),
                "X-Recovery-Status": "no_recovery_needed",
                "X-Fallback-Used": str(getattr(response, 'fallback_used', False))
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ TTS synthesis API error: {e}")
        
        # Enhanced error response for recovery system
        raise HTTPException(
            status_code=500,
            detail={
                "error": str(e),
                "error_type": "internal_error",
                "recoverable": True,
                "retry_after": 3000
            }
        )

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

@router.get("/health")
async def get_tts_health():
    """
    Get comprehensive TTS system health status for error recovery monitoring
    Enhanced endpoint that works with both old and new TTS systems
    """
    try:
        # Try new TTS Manager first
        try:
            from app.services.tts.tts_manager import get_tts_manager
            tts_manager = get_tts_manager()
            
            if not tts_manager.is_initialized:
                return {
                    "status": "initializing",
                    "system_health": {
                        "available_engines": 0,
                        "total_engines": 3,  # Expected: edge, coqui, system
                        "initialization_status": "pending"
                    },
                    "timestamp": "now",
                    "recovery_info": {
                        "fallback_chain": ["edge", "coqui", "system"],
                        "error_recovery_enabled": True
                    }
                }
            
            # Get comprehensive health status from TTS Manager
            health_status = tts_manager.get_health_status()
            
            # Add recovery-specific information
            health_status.update({
                "recovery_info": {
                    "fallback_chain": ["edge", "coqui", "system"],
                    "circuit_breaker_status": health_status.get("circuit_breaker", {}),
                    "last_health_check": "now",
                    "error_recovery_enabled": True,
                    "manual_recovery_available": True
                }
            })
            
            return health_status
            
        except ImportError:
            # Fallback to old TTS service
            from app.services.tts.tts_service import tts_service
            
            if not tts_service.is_initialized:
                return {
                    "status": "unhealthy",
                    "error": "TTS service not initialized",
                    "system_health": {
                        "available_engines": 0,
                        "total_engines": 1,
                        "initialization_status": "failed"
                    },
                    "recovery_info": {
                        "fallback_chain": ["default"],
                        "error_recovery_enabled": False
                    }
                }
            
            # Get basic status from old service
            status = await tts_service.get_service_status()
            
            # Enhance with recovery info
            return {
                **status,
                "recovery_info": {
                    "fallback_chain": ["default"],
                    "error_recovery_enabled": False,
                    "legacy_service": True
                }
            }
        
    except Exception as e:
        logger.error(f"❌ TTS health check error: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "system_health": {
                "available_engines": 0,
                "total_engines": 0,
                "initialization_status": "failed"
            },
            "recovery_info": {
                "error_recovery_enabled": False,
                "health_check_failed": True
            }
        }

@router.post("/recovery/trigger")
async def trigger_tts_recovery(
    recovery_data: Optional[Dict[str, Any]] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Manually trigger TTS system recovery
    """
    try:
        recovery_data = recovery_data or {}
        recovery_type = recovery_data.get("type", "full")  # full, engine, circuit_breaker
        target_engine = recovery_data.get("engine")  # specific engine to recover
        test_text = recovery_data.get("test_text", "Recovery test successful")
        
        logger.info(f"🔧 TTS recovery triggered: type={recovery_type}, engine={target_engine}, user={current_user.get('id')}")
        
        # Try new TTS Manager first
        try:
            from app.services.tts.tts_manager import get_tts_manager
            tts_manager = get_tts_manager()
            
            if recovery_type == "full":
                # Full system recovery - reinitialize all engines
                await tts_manager._initialize_engines()
                
            elif recovery_type == "circuit_breaker" and target_engine:
                # Reset specific circuit breaker
                tts_manager.circuit_breaker.reset(target_engine)
                
            elif recovery_type == "engine" and target_engine:
                # Recover specific engine
                if target_engine == "edge":
                    await tts_manager._initialize_edge_tts()
                elif target_engine == "coqui":
                    await tts_manager._initialize_coqui_tts()
                elif target_engine == "system":
                    await tts_manager._initialize_system_tts()
            
            # Test recovery with sample text
            test_result = await tts_manager.synthesize_for_pam(
                text=test_text,
                user_id=str(current_user.get("id")),
                context="recovery_test"
            )
            
            return {
                "success": True,
                "recovery_type": recovery_type,
                "target_engine": target_engine,
                "test_synthesis": {
                    "success": test_result.success if test_result else False,
                    "engine_used": test_result.engine_used.value if test_result and test_result.engine_used else None
                },
                "new_health_status": tts_manager.get_health_status()
            }
            
        except ImportError:
            # Fallback to old TTS service
            from app.services.tts.tts_service import tts_service
            
            # Basic recovery - reinitialize service
            await tts_service.initialize()
            
            return {
                "success": True,
                "recovery_type": "basic",
                "message": "Legacy TTS service reinitialized",
                "new_health_status": await tts_service.get_service_status()
            }
        
    except Exception as e:
        logger.error(f"❌ TTS recovery error: {e}")
        raise HTTPException(status_code=500, detail=f"Recovery failed: {str(e)}")

@router.post("/recovery/test_error")
async def test_error_recovery(
    error_data: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Test error recovery by simulating various error conditions
    """
    try:
        error_type = error_data.get("type", "generic")
        
        logger.info(f"🧪 Testing error recovery: type={error_type}, user={current_user.get('id')}")
        
        # Simulate the error
        await _simulate_error_for_testing(error_type)
        
        # Should not reach here if error simulation worked
        return {
            "error_simulated": error_type,
            "message": "Error simulation completed"
        }
        
    except HTTPException as e:
        # This is expected - re-raise for frontend to handle
        raise e
    except Exception as e:
        logger.error(f"❌ Error simulation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Error simulation failed: {str(e)}")

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

# Error simulation helper function
async def _simulate_error_for_testing(error_type: str):
    """Simulate different types of errors for testing error recovery system"""
    import asyncio
    from datetime import datetime
    
    if error_type == "network":
        await asyncio.sleep(2)  # Simulate network delay
        raise HTTPException(
            status_code=503, 
            detail={
                "error": "Network timeout - connection to TTS service failed",
                "error_type": "network",
                "recoverable": True,
                "retry_after": 3000
            }
        )
        
    elif error_type == "synthesis":
        raise HTTPException(
            status_code=500, 
            detail={
                "error": "TTS synthesis engine failure - audio generation failed",
                "error_type": "tts_synthesis", 
                "recoverable": True,
                "retry_after": 2000
            }
        )
        
    elif error_type == "audio_playback":
        raise HTTPException(
            status_code=500, 
            detail={
                "error": "Audio playback device unavailable",
                "error_type": "audio_playback",
                "recoverable": True,
                "retry_after": 1000
            }
        )
        
    elif error_type == "permission":
        raise HTTPException(
            status_code=403, 
            detail={
                "error": "Microphone permission denied by user",
                "error_type": "permission",
                "recoverable": False
            }
        )
        
    elif error_type == "quota":
        raise HTTPException(
            status_code=429, 
            detail={
                "error": "API quota exceeded - too many requests",
                "error_type": "api_quota",
                "recoverable": True,
                "retry_after": 10000
            }
        )
        
    elif error_type == "authentication":
        raise HTTPException(
            status_code=401, 
            detail={
                "error": "Invalid API credentials for TTS service",
                "error_type": "authentication",
                "recoverable": False
            }
        )
        
    elif error_type == "browser_compatibility":
        raise HTTPException(
            status_code=400, 
            detail={
                "error": "Browser does not support Web Audio API",
                "error_type": "browser_compatibility",
                "recoverable": False
            }
        )
        
    else:
        raise HTTPException(
            status_code=500, 
            detail={
                "error": f"Unknown TTS error: {error_type}",
                "error_type": "unknown",
                "recoverable": True,
                "retry_after": 2000
            }
        )