"""
Streaming TTS Service
High-level TTS service with streaming, caching, and multi-engine support
"""

import asyncio
import time
from typing import Dict, List, Any, Optional, AsyncGenerator, Union
from datetime import datetime
import logging

from .base_tts import (
    BaseTTSEngine, TTSEngine, VoiceProfile, AudioFormat, 
    TTSRequest, TTSResponse, AudioChunk, tts_manager
)
from .coqui_tts_engine import CoquiTTSEngine
from .edge_tts import EdgeTTS
from .voice_manager import voice_manager
from .tts_cache import tts_cache
from .quality_monitor import quality_monitor
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

class StreamingTTSService:
    """High-level streaming TTS service with intelligent engine selection"""
    
    def __init__(self):
        self.tts_manager = tts_manager
        self.voice_manager = voice_manager
        self.cache = tts_cache
        self.is_initialized = False
        
        # Performance tracking
        self.performance_stats = {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "total_generation_time_ms": 0,
            "total_audio_duration_ms": 0,
            "cache_hits": 0,
            "engine_usage": {}
        }
        
        # Quality monitoring
        self.quality_metrics = {
            "user_ratings": [],
            "generation_failures": [],
            "latency_issues": [],
            "engine_health": {}
        }
    
    async def initialize(self):
        """Initialize the streaming TTS service"""
        try:
            logger.info("🔊 Initializing Streaming TTS Service...")
            
            # Initialize cache
            await self.cache.start_background_cleanup()
            await self.cache.load_persistent_cache()
            
            # Initialize quality monitoring
            await quality_monitor.start_monitoring()
            
            # Register TTS engines
            engines_to_register = []
            
            # Coqui TTS (primary - open source, local)
            coqui_engine = CoquiTTSEngine()
            engines_to_register.append((coqui_engine, True))  # Primary
            
            # Edge TTS (free fallback)
            edge_engine = EdgeTTS()
            engines_to_register.append((edge_engine, False))
            
            # Register engines
            for engine, is_primary in engines_to_register:
                self.tts_manager.register_engine(engine, is_primary)
            
            # Initialize all engines
            init_results = await self.tts_manager.initialize_all()
            
            # Check if at least one engine initialized
            if any(init_results.values()):
                self.is_initialized = True
                logger.info("✅ Streaming TTS Service initialized successfully")
                
                # Log available engines
                available_engines = [engine for engine, result in init_results.items() if result]
                logger.info(f"🔊 Available TTS engines: {', '.join(available_engines)}")
                
                return True
            else:
                logger.error("❌ No TTS engines could be initialized")
                return False
                
        except Exception as e:
            logger.error(f"❌ Failed to initialize Streaming TTS Service: {e}")
            return False
    
    async def synthesize_text(
        self,
        text: str,
        user_id: Optional[str] = None,
        context: str = "general_conversation",
        voice_preference: Optional[VoiceProfile] = None,
        format: AudioFormat = AudioFormat.MP3,
        sample_rate: int = 22050,
        use_cache: bool = True,
        stream: bool = False
    ) -> Union[TTSResponse, AsyncGenerator[AudioChunk, None]]:
        """
        Synthesize text to speech with intelligent voice selection and caching
        """
        
        if not self.is_initialized:
            error_response = TTSResponse(
                request=None,
                success=False,
                error="TTS service not initialized"
            )
            
            if stream:
                async def error_stream():
                    yield AudioChunk(
                        data=b'',
                        sample_rate=sample_rate,
                        format=format,
                        chunk_index=0,
                        is_final=True,
                        metadata={"error": "TTS service not initialized"}
                    )
                return error_stream()
            else:
                return error_response
        
        start_time = time.time()
        self.performance_stats["total_requests"] += 1
        
        try:
            # Get appropriate voice profile
            if voice_preference:
                voice_profile = voice_preference
            else:
                voice_profile = await self.voice_manager.get_user_voice_profile(
                    user_id or "default",
                    context
                )
            
            # Create TTS request
            request = TTSRequest(
                text=text,
                voice_profile=voice_profile,
                format=format,
                sample_rate=sample_rate,
                stream=stream,
                user_id=user_id
            )
            
            # Check cache first (if not streaming and cache enabled)
            cached_response = None
            cache_key = None
            
            if use_cache and not stream:
                cache_key = self.cache.generate_cache_key(request)
                cached_response = await self.cache.get(cache_key)
                
                if cached_response:
                    cached_response.request = request
                    self.performance_stats["cache_hits"] += 1
                    
                    # Log usage for analytics
                    if user_id:
                        await self.voice_manager.log_voice_usage(
                            user_id=user_id,
                            voice_profile=voice_profile,
                            context=context,
                            text_length=len(text),
                            generation_time_ms=0  # Cached
                        )
                    
                    return cached_response
            
            # Get best available engine
            engine = await self.tts_manager.get_best_engine(request)
            if not engine:
                error_msg = "No suitable TTS engine available"
                if stream:
                    async def error_stream():
                        yield AudioChunk(
                            data=b'',
                            sample_rate=sample_rate,
                            format=format,
                            chunk_index=0,
                            is_final=True,
                            metadata={"error": error_msg}
                        )
                    return error_stream()
                else:
                    return TTSResponse(request=request, success=False, error=error_msg)
            
            # Generate speech
            if stream:
                return self._synthesize_with_streaming(
                    request, engine, user_id, context, start_time
                )
            else:
                response = await engine.synthesize(request)
                
                # Cache successful response
                if response.success and use_cache and cache_key:
                    await self.cache.put(cache_key, response, request)
                
                # Update statistics
                await self._update_performance_stats(response, engine, start_time)
                
                # Log usage for analytics
                if user_id and response.success:
                    await self.voice_manager.log_voice_usage(
                        user_id=user_id,
                        voice_profile=voice_profile,
                        context=context,
                        text_length=len(text),
                        generation_time_ms=response.generation_time_ms or 0
                    )
                
                return response
                
        except Exception as e:
            logger.error(f"❌ TTS synthesis failed: {e}")
            self.performance_stats["failed_requests"] += 1
            
            error_response = TTSResponse(
                request=request if 'request' in locals() else None,
                success=False,
                error=str(e)
            )
            
            if stream:
                async def error_stream():
                    yield AudioChunk(
                        data=b'',
                        sample_rate=sample_rate,
                        format=format,
                        chunk_index=0,
                        is_final=True,
                        metadata={"error": str(e)}
                    )
                return error_stream()
            else:
                return error_response
    
    async def _synthesize_with_streaming(
        self,
        request: TTSRequest,
        engine: BaseTTSEngine,
        user_id: Optional[str],
        context: str,
        start_time: float
    ) -> AsyncGenerator[AudioChunk, None]:
        """Handle streaming synthesis with error recovery"""
        
        try:
            chunk_count = 0
            total_audio_data = b''
            
            async for chunk in engine.synthesize_stream(request):
                chunk_count += 1
                
                # Accumulate audio data for analytics
                if chunk.data:
                    total_audio_data += chunk.data
                
                yield chunk
                
                # If this is the final chunk, update statistics
                if chunk.is_final:
                    # Create mock response for stats
                    mock_response = TTSResponse(
                        request=request,
                        audio_data=total_audio_data,
                        generation_time_ms=int((time.time() - start_time) * 1000),
                        engine_used=engine.engine_type,
                        success=True
                    )
                    
                    await self._update_performance_stats(mock_response, engine, start_time)
                    
                    # Log usage
                    if user_id:
                        await self.voice_manager.log_voice_usage(
                            user_id=user_id,
                            voice_profile=request.voice_profile,
                            context=context,
                            text_length=len(request.text),
                            generation_time_ms=mock_response.generation_time_ms
                        )
                    
                    logger.info(f"🔊 Streaming synthesis completed: {chunk_count} chunks, {len(total_audio_data)} bytes")
                    break
                    
        except Exception as e:
            logger.error(f"❌ Streaming synthesis failed: {e}")
            self.performance_stats["failed_requests"] += 1
            
            # Send error chunk
            yield AudioChunk(
                data=b'',
                sample_rate=request.sample_rate,
                format=request.format,
                chunk_index=0,
                is_final=True,
                metadata={"error": str(e)}
            )
    
    async def _update_performance_stats(
        self,
        response: TTSResponse,
        engine: BaseTTSEngine,
        start_time: float
    ):
        """Update performance statistics"""
        
        if response.success:
            self.performance_stats["successful_requests"] += 1
            
            if response.generation_time_ms:
                self.performance_stats["total_generation_time_ms"] += response.generation_time_ms
            
            if response.duration_ms:
                self.performance_stats["total_audio_duration_ms"] += response.duration_ms
        else:
            self.performance_stats["failed_requests"] += 1
        
        # Track engine usage
        engine_name = engine.engine_type.value
        if engine_name not in self.performance_stats["engine_usage"]:
            self.performance_stats["engine_usage"][engine_name] = 0
        self.performance_stats["engine_usage"][engine_name] += 1
    
    async def get_recommended_voices(
        self,
        user_id: str,
        context: str,
        limit: int = 5
    ) -> List[VoiceProfile]:
        """Get personalized voice recommendations for user"""
        
        # Get available voices from all engines
        all_voices = []
        for engine in self.tts_manager.engines.values():
            if engine.is_initialized:
                voices = await engine.get_available_voices()
                all_voices.extend(voices)
        
        # Get personalized recommendations
        recommendations = await self.voice_manager.get_recommended_voices(
            user_id=user_id,
            context=context,
            available_voices=all_voices,
            limit=limit
        )
        
        return recommendations
    
    async def rate_voice_interaction(
        self,
        user_id: str,
        voice_profile: VoiceProfile,
        rating: float,
        feedback: Optional[str] = None
    ):
        """Rate a voice interaction for learning"""
        
        await self.voice_manager.rate_voice_interaction(
            user_id=user_id,
            voice_profile=voice_profile,
            rating=rating,
            feedback=feedback
        )
        
        # Store in quality metrics
        self.quality_metrics["user_ratings"].append({
            "user_id": user_id,
            "voice_id": voice_profile.voice_id,
            "engine": voice_profile.engine.value,
            "rating": rating,
            "feedback": feedback,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    async def get_service_health(self) -> Dict[str, Any]:
        """Get comprehensive service health status"""
        
        # Get engine health
        engine_health = await self.tts_manager.health_check_all()
        
        # Get cache statistics
        cache_stats = self.cache.get_cache_stats()
        
        # Calculate performance metrics
        total_requests = max(self.performance_stats["total_requests"], 1)
        success_rate = (self.performance_stats["successful_requests"] / total_requests) * 100
        
        avg_generation_time = 0
        if self.performance_stats["successful_requests"] > 0:
            avg_generation_time = (
                self.performance_stats["total_generation_time_ms"] / 
                self.performance_stats["successful_requests"]
            )
        
        # Calculate quality scores
        avg_user_rating = 0
        if self.quality_metrics["user_ratings"]:
            ratings = [r["rating"] for r in self.quality_metrics["user_ratings"]]
            avg_user_rating = sum(ratings) / len(ratings)
        
        return {
            "service_status": "healthy" if self.is_initialized else "unhealthy",
            "engines": engine_health,
            "cache": cache_stats,
            "performance": {
                "total_requests": self.performance_stats["total_requests"],
                "success_rate_percent": round(success_rate, 1),
                "avg_generation_time_ms": round(avg_generation_time, 1),
                "engine_usage": self.performance_stats["engine_usage"]
            },
            "quality": {
                "avg_user_rating": round(avg_user_rating, 2),
                "total_ratings": len(self.quality_metrics["user_ratings"]),
                "recent_failures": len(self.quality_metrics["generation_failures"][-10:])
            },
            "initialized": self.is_initialized
        }
    
    async def get_user_analytics(self, user_id: str) -> Dict[str, Any]:
        """Get user-specific voice analytics"""
        return await self.voice_manager.get_user_analytics(user_id)
    
    async def set_user_voice_preference(
        self,
        user_id: str,
        voice_profile: VoiceProfile,
        context: Optional[str] = None,
        is_default: bool = False
    ):
        """Set user voice preference"""
        await self.voice_manager.set_user_voice_preference(
            user_id=user_id,
            voice_profile=voice_profile,
            context=context,
            is_default=is_default
        )
    
    async def shutdown(self):
        """Shutdown the TTS service"""
        try:
            # Stop background tasks
            await self.cache.stop_background_cleanup()
            await quality_monitor.stop_monitoring()
            
            # Close all engines
            await self.tts_manager.close_all()
            
            self.is_initialized = False
            logger.info("🛑 Streaming TTS Service shutdown completed")
            
        except Exception as e:
            logger.error(f"❌ Error during TTS service shutdown: {e}")

# Global streaming TTS service instance
streaming_tts_service = StreamingTTSService()