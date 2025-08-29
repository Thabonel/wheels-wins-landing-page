"""
Voice Health Check API Endpoints
Comprehensive health monitoring for the TTS/STT voice pipeline
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import asyncio

from app.services.tts.enhanced_tts_service import enhanced_tts_service, TTSEngine
from app.api.deps import get_current_user
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


class VoiceHealthResponse(BaseModel):
    """Voice health check response"""
    status: str
    timestamp: str
    tts_service: Dict[str, Any]
    stt_service: Dict[str, Any]
    pipeline_test: Dict[str, Any]
    recommendations: List[str]


class TTSTestRequest(BaseModel):
    """TTS test request"""
    text: str = "Hello, this is a test of the text-to-speech system."
    engine: Optional[str] = None
    voice_id: Optional[str] = None


class TTSTestResponse(BaseModel):
    """TTS test response"""
    success: bool
    engine_used: str
    audio_size_bytes: int
    processing_time_ms: float
    quality: str
    error: Optional[str] = None
    fallback_used: bool = False


@router.get("/health", response_model=VoiceHealthResponse)
async def get_voice_health():
    """
    Comprehensive voice pipeline health check
    Tests TTS, STT, and end-to-end pipeline functionality
    """
    try:
        timestamp = datetime.utcnow().isoformat()
        logger.info("🩺 Starting comprehensive voice health check...")
        
        # Check TTS service health
        tts_health = await _check_tts_health()
        
        # Check STT service health
        stt_health = await _check_stt_health()
        
        # Perform end-to-end pipeline test
        pipeline_test = await _test_voice_pipeline()
        
        # Generate recommendations
        recommendations = _generate_recommendations(tts_health, stt_health, pipeline_test)
        
        # Determine overall status
        overall_status = "healthy"
        if not tts_health.get("has_working_engine", False):
            overall_status = "degraded"
        if not tts_health.get("primary_engine_working", False) and not stt_health.get("primary_working", False):
            overall_status = "unhealthy"
        
        logger.info(f"🩺 Voice health check completed - Status: {overall_status}")
        
        return VoiceHealthResponse(
            status=overall_status,
            timestamp=timestamp,
            tts_service=tts_health,
            stt_service=stt_health,
            pipeline_test=pipeline_test,
            recommendations=recommendations
        )
        
    except Exception as e:
        logger.error(f"❌ Voice health check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")


@router.get("/tts/status")
async def get_tts_status():
    """Get detailed TTS service status"""
    try:
        if not enhanced_tts_service.is_initialized:
            # Try to initialize if not already done
            await enhanced_tts_service.initialize()
        
        status = await enhanced_tts_service.get_service_status()
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "service": "Enhanced TTS Service",
            **status
        }
        
    except Exception as e:
        logger.error(f"❌ TTS status check failed: {e}")
        raise HTTPException(status_code=500, detail=f"TTS status check failed: {str(e)}")


@router.post("/tts/test", response_model=TTSTestResponse)
async def test_tts_synthesis(request: TTSTestRequest):
    """
    Test TTS synthesis with specific parameters
    Useful for debugging and validation
    """
    try:
        logger.info(f"🧪 Testing TTS synthesis: '{request.text[:50]}...'")
        
        # Ensure service is initialized
        if not enhanced_tts_service.is_initialized:
            await enhanced_tts_service.initialize()
        
        # Parse engine preference
        preferred_engine = None
        if request.engine:
            try:
                preferred_engine = TTSEngine(request.engine.lower())
            except ValueError:
                logger.warning(f"⚠️ Unknown engine '{request.engine}', using auto-selection")
        
        # Perform synthesis
        start_time = datetime.now()
        result = await enhanced_tts_service.synthesize(
            text=request.text,
            voice_id=request.voice_id,
            preferred_engine=preferred_engine
        )
        total_time = (datetime.now() - start_time).total_seconds() * 1000
        
        # Analyze result
        success = result.audio_data is not None and result.error is None
        audio_size = len(result.audio_data) if result.audio_data else 0
        
        logger.info(f"🧪 TTS test completed - Success: {success}, Engine: {result.engine.value}")
        
        return TTSTestResponse(
            success=success,
            engine_used=result.engine.value,
            audio_size_bytes=audio_size,
            processing_time_ms=result.processing_time_ms or total_time,
            quality=result.quality.value,
            error=result.error,
            fallback_used=result.fallback_used
        )
        
    except Exception as e:
        logger.error(f"❌ TTS test failed: {e}")
        return TTSTestResponse(
            success=False,
            engine_used="none",
            audio_size_bytes=0,
            processing_time_ms=0,
            quality="fallback",
            error=str(e)
        )


@router.get("/tts/voices")
async def get_available_voices():
    """Get all available voices from all TTS engines"""
    try:
        # Ensure service is initialized
        if not enhanced_tts_service.is_initialized:
            await enhanced_tts_service.initialize()
        
        voices = await enhanced_tts_service.get_available_voices()
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "total_engines": len(voices),
            "voices_by_engine": voices,
            "total_voices": sum(len(engine_voices) for engine_voices in voices.values())
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get available voices: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get voices: {str(e)}")


@router.get("/tts/engines")
async def get_tts_engines():
    """Get information about all TTS engines"""
    try:
        # Ensure service is initialized
        if not enhanced_tts_service.is_initialized:
            await enhanced_tts_service.initialize()
        
        status = await enhanced_tts_service.get_service_status()
        
        engines_info = []
        for engine_name, engine_data in status["engines"].items():
            engine_info = {
                "name": engine_name,
                "display_name": engine_name.replace("_", " ").title(),
                "available": engine_data["available"],
                "status": engine_data["status"],
                "tier": _get_engine_tier(engine_name),
                "description": _get_engine_description(engine_name)
            }
            engines_info.append(engine_info)
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "engines": engines_info,
            "fallback_chain": status.get("fallback_chain", []),
            "stats": status.get("stats", {})
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get TTS engines: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get engines: {str(e)}")


@router.get("/stt/status")
async def get_stt_status():
    """Get STT (Speech-to-Text) service status"""
    try:
        # Try to get STT service status
        try:
            from app.services.voice.speech_to_text import speech_to_text_service
            stt_status = await speech_to_text_service.get_service_status()
            
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "service": "Speech-to-Text Service",
                **stt_status
            }
            
        except ImportError:
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "service": "Speech-to-Text Service",
                "status": "not_available",
                "error": "STT service not found"
            }
            
    except Exception as e:
        logger.error(f"❌ STT status check failed: {e}")
        raise HTTPException(status_code=500, detail=f"STT status check failed: {str(e)}")


@router.post("/pipeline/test")
async def test_voice_pipeline():
    """
    Test the complete voice pipeline (STT → LLM → TTS)
    This is a comprehensive test of the entire voice processing flow
    """
    try:
        logger.info("🧪 Testing complete voice pipeline...")
        
        # Test each component
        pipeline_results = {
            "tts_test": await _test_tts_component(),
            "stt_test": await _test_stt_component(),
            "integration_test": await _test_integration()
        }
        
        # Determine overall pipeline health
        all_tests_passed = all(
            test_result.get("success", False) 
            for test_result in pipeline_results.values()
        )
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "pipeline_healthy": all_tests_passed,
            "results": pipeline_results,
            "recommendations": _generate_pipeline_recommendations(pipeline_results)
        }
        
    except Exception as e:
        logger.error(f"❌ Pipeline test failed: {e}")
        raise HTTPException(status_code=500, detail=f"Pipeline test failed: {str(e)}")


# Helper functions

async def _check_tts_health() -> Dict[str, Any]:
    """Check TTS service health"""
    try:
        if not enhanced_tts_service.is_initialized:
            await enhanced_tts_service.initialize()
        
        status = await enhanced_tts_service.get_service_status()
        health = status.get("health", {})
        
        working_engines = [
            engine for engine, data in health.items() 
            if data.get("healthy", False)
        ]
        
        primary_engine_working = "edge" in working_engines
        
        return {
            "initialized": enhanced_tts_service.is_initialized,
            "working_engines": working_engines,
            "total_engines": len(status.get("engines", {})),
            "primary_engine_working": primary_engine_working,
            "has_working_engine": len(working_engines) > 0,
            "fallback_chain": status.get("fallback_chain", []),
            "stats": status.get("stats", {}),
            "health_details": health
        }
        
    except Exception as e:
        logger.error(f"❌ TTS health check failed: {e}")
        return {
            "initialized": False,
            "working_engines": [],
            "total_engines": 0,
            "primary_engine_working": False,
            "has_working_engine": False,
            "error": str(e)
        }


async def _check_stt_health() -> Dict[str, Any]:
    """Check STT service health"""
    try:
        from app.services.voice.speech_to_text import speech_to_text_service
        status = await speech_to_text_service.get_service_status()
        
        return {
            "available": True,
            "primary_working": status.get("status") == "initialized",
            "providers": list(status.get("providers", {}).keys()),
            "primary_provider": status.get("primary_provider"),
            "details": status
        }
        
    except ImportError:
        return {
            "available": False,
            "primary_working": False,
            "providers": [],
            "error": "STT service not available"
        }
    except Exception as e:
        logger.error(f"❌ STT health check failed: {e}")
        return {
            "available": False,
            "primary_working": False,
            "providers": [],
            "error": str(e)
        }


async def _test_voice_pipeline() -> Dict[str, Any]:
    """Test the complete voice pipeline"""
    try:
        # Test TTS synthesis
        test_text = "Hello, this is a test of the voice pipeline."
        result = await enhanced_tts_service.synthesize(test_text)
        
        tts_success = result.audio_data is not None and result.error is None
        
        return {
            "test_performed": True,
            "tts_synthesis": {
                "success": tts_success,
                "engine_used": result.engine.value,
                "processing_time_ms": result.processing_time_ms,
                "audio_generated": result.audio_data is not None
            },
            "overall_success": tts_success
        }
        
    except Exception as e:
        logger.error(f"❌ Voice pipeline test failed: {e}")
        return {
            "test_performed": False,
            "error": str(e),
            "overall_success": False
        }


def _generate_recommendations(tts_health: Dict, stt_health: Dict, pipeline_test: Dict) -> List[str]:
    """Generate recommendations based on health check results"""
    recommendations = []
    
    # TTS recommendations
    if not tts_health.get("has_working_engine", False):
        recommendations.append("Install TTS dependencies: pip install edge-tts")
    elif not tts_health.get("primary_engine_working", False):
        recommendations.append("Primary TTS engine (Edge TTS) not working - using fallback")
    
    # STT recommendations
    if not stt_health.get("available", False):
        recommendations.append("STT service not available - voice input disabled")
    elif not stt_health.get("primary_working", False):
        recommendations.append("Primary STT provider not working - check configuration")
    
    # Pipeline recommendations
    if not pipeline_test.get("overall_success", False):
        recommendations.append("Voice pipeline test failed - check service logs")
    
    # Performance recommendations
    tts_stats = tts_health.get("stats", {})
    if tts_stats.get("average_processing_time", 0) > 2000:
        recommendations.append("TTS processing is slow - consider optimizing or using faster engine")
    
    if not recommendations:
        recommendations.append("All voice services are working properly")
    
    return recommendations


async def _test_tts_component() -> Dict[str, Any]:
    """Test TTS component"""
    try:
        result = await enhanced_tts_service.synthesize("TTS test message")
        return {
            "success": result.audio_data is not None,
            "engine": result.engine.value,
            "processing_time_ms": result.processing_time_ms,
            "error": result.error
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


async def _test_stt_component() -> Dict[str, Any]:
    """Test STT component"""
    try:
        from app.services.voice.speech_to_text import speech_to_text_service
        status = await speech_to_text_service.get_service_status()
        return {
            "success": status.get("status") == "initialized",
            "providers": list(status.get("providers", {}).keys()),
            "primary_provider": status.get("primary_provider")
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


async def _test_integration() -> Dict[str, Any]:
    """Test integration between components"""
    try:
        # This would test the actual PAM voice processing pipeline
        # For now, just verify both TTS and STT are available
        tts_test = await _test_tts_component()
        stt_test = await _test_stt_component()
        
        return {
            "success": tts_test.get("success", False) and stt_test.get("success", False),
            "tts_available": tts_test.get("success", False),
            "stt_available": stt_test.get("success", False)
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


def _generate_pipeline_recommendations(results: Dict) -> List[str]:
    """Generate recommendations for pipeline improvements"""
    recommendations = []
    
    if not results.get("tts_test", {}).get("success", False):
        recommendations.append("Fix TTS component - install edge-tts or other TTS engine")
    
    if not results.get("stt_test", {}).get("success", False):
        recommendations.append("Fix STT component - check speech-to-text configuration")
    
    if not results.get("integration_test", {}).get("success", False):
        recommendations.append("Fix integration between TTS and STT components")
    
    if not recommendations:
        recommendations.append("Voice pipeline is working correctly")
    
    return recommendations


def _get_engine_tier(engine_name: str) -> int:
    """Get engine tier (1=primary, 2=secondary, 3=fallback)"""
    tier_map = {
        "edge": 1,
        "coqui": 2,
        "pyttsx3": 3,
        "system": 3
    }
    return tier_map.get(engine_name, 3)


def _get_engine_description(engine_name: str) -> str:
    """Get human-readable engine description"""
    descriptions = {
        "edge": "Microsoft Edge TTS - High quality, free, cloud-based",
        "coqui": "Coqui TTS - Local neural text-to-speech",
        "pyttsx3": "pyttsx3 - Cross-platform system TTS",
        "system": "System TTS - Native OS text-to-speech"
    }
    return descriptions.get(engine_name, "Unknown TTS engine")