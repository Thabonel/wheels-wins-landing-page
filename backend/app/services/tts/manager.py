"""
TTS Manager - Orchestrates multiple TTS engines with intelligent fallbacks
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import time

from .base import BaseTTSEngine, VoiceSettings, TTSResponse, TTSError
from .engines.elevenlabs_tts import ElevenLabsTTSEngine
from .engines.edge_tts import EdgeTTSEngine
from .engines.system_tts import SystemTTSEngine

logger = logging.getLogger(__name__)

@dataclass
class TTSEngineStats:
    """Statistics for a TTS engine"""
    name: str
    requests: int = 0
    successes: int = 0
    failures: int = 0
    avg_response_time: float = 0.0
    last_used: Optional[float] = None
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate percentage"""
        if self.requests == 0:
            return 0.0
        return (self.successes / self.requests) * 100
    
    @property
    def is_healthy(self) -> bool:
        """Check if engine is considered healthy"""
        if self.requests < 5:  # Not enough data
            return True
        return self.success_rate >= 80  # 80% success rate threshold

class TTSManager:
    """
    TTS Manager with intelligent fallbacks
    
    Features:
    - Multi-engine support with fallback chain
    - Performance tracking and health monitoring
    - Automatic engine recovery and retry logic
    - Voice preference and engine selection
    """
    
    def __init__(self):
        self.engines: List[BaseTTSEngine] = []
        self.engine_stats: Dict[str, TTSEngineStats] = {}
        self.default_settings = VoiceSettings()
        self._initialize_engines()
    
    def _initialize_engines(self):
        """Initialize all TTS engines in priority order"""
        logger.info("🚀 Initializing TTS engines...")
        
        # Priority order: ElevenLabs -> Edge TTS -> System TTS
        engine_classes = [
            ElevenLabsTTSEngine,  # Premium quality (requires API key)
            EdgeTTSEngine,        # Free, good quality fallback
            SystemTTSEngine       # Last resort system fallback
        ]
        
        for engine_class in engine_classes:
            try:
                engine = engine_class()
                if engine.is_available:
                    self.engines.append(engine)
                    self.engine_stats[engine.name] = TTSEngineStats(name=engine.name)
                    logger.info(f"✅ {engine.name} engine initialized and available")
                else:
                    logger.warning(f"⚠️ {engine.name} engine initialized but not available")
                    
            except Exception as e:
                logger.error(f"❌ Failed to initialize {engine_class.__name__}: {e}")
        
        if not self.engines:
            logger.error("❌ No TTS engines available!")
            raise TTSError("No TTS engines could be initialized")
        
        logger.info(f"🎵 TTS Manager initialized with {len(self.engines)} engines")
    
    async def synthesize(
        self, 
        text: str, 
        settings: VoiceSettings = None,
        preferred_engine: str = None
    ) -> TTSResponse:
        """
        Synthesize text to speech with intelligent fallbacks
        
        Args:
            text: Text to synthesize
            settings: Voice settings (optional)
            preferred_engine: Preferred engine name (optional)
            
        Returns:
            TTSResponse with audio data
            
        Raises:
            TTSError: If all engines fail
        """
        if not text or not text.strip():
            raise TTSError("Empty text provided for synthesis")
        
        if settings is None:
            settings = self.default_settings
        
        # Determine engine order
        engines_to_try = self._get_engine_order(preferred_engine)
        
        last_error = None
        
        for engine in engines_to_try:
            if not engine.is_available:
                continue
                
            stats = self.engine_stats[engine.name]
            
            # Skip unhealthy engines (unless it's the last option)
            if not stats.is_healthy and engine != engines_to_try[-1]:
                logger.warning(f"⚠️ Skipping unhealthy engine {engine.name} (success rate: {stats.success_rate:.1f}%)")
                continue
            
            try:
                start_time = time.time()
                
                logger.debug(f"🎵 Attempting synthesis with {engine.name}")
                
                # Attempt synthesis
                response = await engine.synthesize(text, settings)
                
                # Record success
                response_time = time.time() - start_time
                self._record_success(engine.name, response_time)
                
                logger.info(f"✅ TTS synthesis successful with {engine.name} ({response_time:.2f}s)")
                
                return response
                
            except Exception as e:
                # Record failure
                response_time = time.time() - start_time
                self._record_failure(engine.name, response_time)
                
                logger.warning(f"❌ TTS synthesis failed with {engine.name}: {e}")
                last_error = e
                
                # Continue to next engine
                continue
        
        # All engines failed
        logger.error("❌ All TTS engines failed")
        raise TTSError(f"All TTS engines failed. Last error: {last_error}")
    
    def _get_engine_order(self, preferred_engine: str = None) -> List[BaseTTSEngine]:
        """
        Get engines in optimal order for synthesis attempt
        
        Args:
            preferred_engine: Name of preferred engine
            
        Returns:
            List of engines in priority order
        """
        available_engines = [e for e in self.engines if e.is_available]
        
        if not available_engines:
            return []
        
        # If preferred engine specified and available, try it first
        if preferred_engine:
            preferred = next((e for e in available_engines if e.name == preferred_engine), None)
            if preferred:
                other_engines = [e for e in available_engines if e.name != preferred_engine]
                return [preferred] + other_engines
        
        # Sort by health and performance
        def engine_priority(engine):
            stats = self.engine_stats[engine.name]
            # Prioritize healthy engines with good performance
            health_score = stats.success_rate if stats.requests > 0 else 100
            speed_score = 1 / (stats.avg_response_time + 0.1)  # Faster is better
            return health_score + speed_score
        
        return sorted(available_engines, key=engine_priority, reverse=True)
    
    def _record_success(self, engine_name: str, response_time: float):
        """Record successful synthesis"""
        stats = self.engine_stats[engine_name]
        stats.requests += 1
        stats.successes += 1
        stats.last_used = time.time()
        
        # Update average response time (moving average)
        if stats.avg_response_time == 0:
            stats.avg_response_time = response_time
        else:
            stats.avg_response_time = (stats.avg_response_time * 0.8) + (response_time * 0.2)
    
    def _record_failure(self, engine_name: str, response_time: float):
        """Record failed synthesis"""
        stats = self.engine_stats[engine_name]
        stats.requests += 1
        stats.failures += 1
        
        # Still update response time for failed attempts
        if stats.avg_response_time == 0:
            stats.avg_response_time = response_time
        else:
            stats.avg_response_time = (stats.avg_response_time * 0.9) + (response_time * 0.1)
    
    def get_available_voices(self) -> List[Dict[str, Any]]:
        """
        Get all available voices from all engines
        
        Returns:
            Consolidated list of available voices
        """
        all_voices = []
        
        for engine in self.engines:
            if engine.is_available:
                try:
                    engine_voices = engine.get_available_voices()
                    for voice in engine_voices:
                        voice["engine"] = engine.name
                        all_voices.append(voice)
                except Exception as e:
                    logger.warning(f"⚠️ Failed to get voices from {engine.name}: {e}")
        
        return all_voices
    
    def get_engine_status(self) -> Dict[str, Any]:
        """
        Get status of all TTS engines
        
        Returns:
            Dictionary with engine status information
        """
        status = {
            "total_engines": len(self.engines),
            "available_engines": len([e for e in self.engines if e.is_available]),
            "engines": {}
        }
        
        for engine in self.engines:
            stats = self.engine_stats[engine.name]
            status["engines"][engine.name] = {
                "available": engine.is_available,
                "healthy": stats.is_healthy,
                "requests": stats.requests,
                "success_rate": stats.success_rate,
                "avg_response_time": stats.avg_response_time,
                "last_used": stats.last_used
            }
        
        return status
    
    def health_check(self) -> bool:
        """
        Perform health check on TTS system
        
        Returns:
            True if at least one engine is available and healthy
        """
        for engine in self.engines:
            if engine.is_available:
                stats = self.engine_stats[engine.name]
                if stats.is_healthy:
                    return True
        return False

# Global TTS manager instance
_tts_manager = None

def get_tts_manager() -> TTSManager:
    """
    Get the global TTS manager instance
    
    Returns:
        TTSManager instance
    """
    global _tts_manager
    if _tts_manager is None:
        _tts_manager = TTSManager()
    return _tts_manager

# Async helper functions for easy use
async def synthesize_text(
    text: str, 
    voice: str = None,
    speed: float = 1.0,
    volume: float = 1.0,
    preferred_engine: str = None
) -> TTSResponse:
    """
    Convenience function for text synthesis
    
    Args:
        text: Text to synthesize
        voice: Voice to use (optional)
        speed: Speech speed (optional) 
        volume: Speech volume (optional)
        preferred_engine: Preferred engine (optional)
        
    Returns:
        TTSResponse with audio data
    """
    manager = get_tts_manager()
    settings = VoiceSettings(
        voice=voice or "en-US-AriaNeural",
        speed=speed,
        volume=volume
    )
    
    return await manager.synthesize(text, settings, preferred_engine)

# PAM-specific methods for compatibility with existing PAM orchestrator
class PAMVoiceProfile:
    """PAM voice profile constants"""
    PAM_ASSISTANT = "pam_assistant"
    NAVIGATION = "navigation" 
    EMERGENCY = "emergency"
    CASUAL = "casual"
    PROFESSIONAL = "professional"

class ResponseMode:
    """PAM response mode constants"""
    TEXT_ONLY = "text_only"
    VOICE_ONLY = "voice_only"
    MULTIMODAL = "multimodal"
    ADAPTIVE = "adaptive"

async def synthesize_for_pam(
    text: str,
    voice_profile: str = PAMVoiceProfile.PAM_ASSISTANT,
    response_mode: str = ResponseMode.ADAPTIVE,
    user_id: str = None,
    context: dict = None
) -> Dict[str, Any]:
    """
    PAM-optimized text-to-speech synthesis
    
    This method provides compatibility with PAM's orchestrator expectations
    while leveraging our new ElevenLabs-powered TTS system.
    
    Args:
        text: Text to synthesize
        voice_profile: PAM voice profile (pam_assistant, navigation, emergency, etc.)
        response_mode: Response mode (text_only, voice_only, multimodal, adaptive)
        user_id: User identifier for personalization
        context: Additional context for synthesis optimization
        
    Returns:
        Dict with audio_data, format, duration, and PAM-specific metadata
    """
    manager = get_tts_manager()
    
    # Map PAM voice profiles to appropriate voice settings
    voice_mapping = {
        PAMVoiceProfile.PAM_ASSISTANT: VoiceSettings(voice="alloy", speed=1.0, volume=0.8),
        PAMVoiceProfile.NAVIGATION: VoiceSettings(voice="nova", speed=1.1, volume=0.9),
        PAMVoiceProfile.EMERGENCY: VoiceSettings(voice="onyx", speed=1.2, volume=1.0),
        PAMVoiceProfile.CASUAL: VoiceSettings(voice="alloy", speed=0.9, volume=0.7),
        PAMVoiceProfile.PROFESSIONAL: VoiceSettings(voice="echo", speed=1.0, volume=0.8)
    }
    
    # Use default if voice profile not found
    voice_settings = voice_mapping.get(voice_profile, voice_mapping[PAMVoiceProfile.PAM_ASSISTANT])
    
    # Handle response mode preferences
    if response_mode == ResponseMode.TEXT_ONLY:
        # Return text-only response
        return {
            "success": True,
            "audio_data": None,
            "format": "text",
            "duration": 0.0,
            "text_response": text,
            "voice_profile": voice_profile,
            "response_mode": response_mode,
            "engine_used": "text_only"
        }
    
    try:
        # Synthesize using our new TTS manager
        response = await manager.synthesize(text, voice_settings)
        
        # Return in PAM-expected format
        return {
            "success": True,
            "audio_data": response.audio_data,
            "format": response.format,
            "duration": response.duration,
            "text_response": text,
            "voice_profile": voice_profile,
            "response_mode": response_mode,
            "engine_used": response.engine_used,
            "voice_used": response.voice_used,
            "pam_optimized": True
        }
        
    except Exception as e:
        logger.error(f"❌ PAM TTS synthesis failed: {e}")
        
        # Return text-only fallback for PAM
        return {
            "success": False,
            "audio_data": None,
            "format": "text",
            "duration": 0.0,
            "text_response": text,
            "voice_profile": voice_profile,
            "response_mode": ResponseMode.TEXT_ONLY,
            "engine_used": "fallback_text",
            "error": str(e)
        }

def get_pam_voice_profiles() -> List[str]:
    """Get available PAM voice profiles"""
    return [
        PAMVoiceProfile.PAM_ASSISTANT,
        PAMVoiceProfile.NAVIGATION,
        PAMVoiceProfile.EMERGENCY,
        PAMVoiceProfile.CASUAL,
        PAMVoiceProfile.PROFESSIONAL
    ]

def supports_streaming() -> bool:
    """Check if TTS manager supports streaming (future enhancement)"""
    return False  # Not implemented yet, but ready for future expansion

async def get_pam_tts_health() -> Dict[str, Any]:
    """Get PAM-specific TTS health information"""
    manager = get_tts_manager()
    engine_status = manager.get_engine_status()
    is_healthy = manager.health_check()
    
    return {
        "healthy": is_healthy,
        "available_engines": engine_status["available_engines"],
        "total_engines": engine_status["total_engines"],
        "voice_profiles_available": get_pam_voice_profiles(),
        "streaming_supported": supports_streaming(),
        "engines": engine_status["engines"],
        "pam_integration": "active"
    }

async def test_tts_manager():
    """Test the TTS manager functionality"""
    try:
        print("🧪 Testing TTS Manager...")
        
        manager = get_tts_manager()
        
        # Test basic synthesis
        result = await manager.synthesize("Hello, this is a test of the TTS manager.")
        print(f"✅ TTS Manager test successful: {result.engine_used} generated {len(result.audio_data)} bytes")
        
        # Test engine status
        status = manager.get_engine_status()
        print(f"📊 Engine status: {status['available_engines']}/{status['total_engines']} engines available")
        
        # Test voice listing
        voices = manager.get_available_voices()
        print(f"🎤 Available voices: {len(voices)} voices from {len(set(v['engine'] for v in voices))} engines")
        
        return True
        
    except Exception as e:
        print(f"❌ TTS Manager test failed: {e}")
        return False

if __name__ == "__main__":
    # Test the manager
    asyncio.run(test_tts_manager())