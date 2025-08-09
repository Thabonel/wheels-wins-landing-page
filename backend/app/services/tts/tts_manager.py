"""
TTS Manager - Comprehensive Text-to-Speech System
Multi-engine TTS system with circuit breaker protection and intelligent fallback
"""

import asyncio
import json
import time
from typing import Dict, List, Any, Optional, Union
from datetime import datetime
from dataclasses import dataclass, asdict

from app.core.logging import get_logger
from app.core.config import get_settings
from .circuit_breaker import CircuitBreaker, CircuitConfig
from .base_tts import (
    TTSEngine, VoiceProfile, VoiceSettings, AudioFormat, 
    TTSRequest, TTSResponse, VoiceStyle
)

logger = get_logger(__name__)


@dataclass
class TTSEngineInfo:
    """Information about a TTS engine"""
    name: str
    engine_type: TTSEngine
    priority: int  # Lower number = higher priority
    available: bool
    initialized: bool
    last_used: Optional[datetime] = None
    success_rate: float = 0.0
    avg_response_time_ms: float = 0.0


class TTSManager:
    """
    Comprehensive TTS Manager with multi-engine support
    
    Features:
    - Multi-engine fallback system (Edge TTS -> Coqui TTS -> System TTS)
    - Circuit breaker protection for reliability
    - Intelligent engine selection based on performance
    - Voice profile management and optimization
    - Performance monitoring and health checks
    - Graceful degradation to text-only responses
    """
    
    def __init__(self):
        self.settings = get_settings()
        self.engines: Dict[str, Any] = {}
        self.engine_info: Dict[str, TTSEngineInfo] = {}
        self.circuit_breaker = CircuitBreaker(
            CircuitConfig(
                failure_threshold=3,  # Reduced threshold for TTS
                timeout_seconds=120,   # 2 minute timeout
                success_threshold=2,   # Quick recovery
                max_requests_half_open=3
            )
        )
        
        # Performance tracking
        self.total_requests = 0
        self.successful_requests = 0
        self.fallback_requests = 0
        self.text_only_responses = 0
        
        # Voice management
        self.default_voice_profiles: Dict[str, VoiceProfile] = {}
        self.user_voice_preferences: Dict[str, str] = {}  # user_id -> voice_id
        
        # Initialize engines
        asyncio.create_task(self._initialize_engines())
    
    async def _initialize_engines(self):
        """Initialize all available TTS engines"""
        logger.info("🎤 Initializing TTS engines...")
        
        # Initialize Edge TTS (Primary)
        await self._initialize_edge_tts()
        
        # Initialize Coqui TTS (Fallback 1) 
        await self._initialize_coqui_tts()
        
        # Initialize System TTS (Fallback 2)
        await self._initialize_system_tts()
        
        # Setup default voice profiles
        self._setup_default_voices()
        
        # Log initialization results
        available_engines = [info.name for info in self.engine_info.values() if info.available]
        logger.info(f"✅ TTS Manager initialized with {len(available_engines)} engines: {', '.join(available_engines)}")
    
    async def _initialize_edge_tts(self):
        """Initialize Edge TTS engine"""
        try:
            from .edge_tts import EdgeTTS
            
            engine = EdgeTTS()
            await engine.initialize()
            
            if engine.is_available():
                self.engines["edge"] = engine
                self.engine_info["edge"] = TTSEngineInfo(
                    name="Edge TTS",
                    engine_type=TTSEngine.EDGE,
                    priority=1,  # Highest priority
                    available=True,
                    initialized=True
                )
                logger.info("✅ Edge TTS engine initialized successfully")
            else:
                raise Exception("Edge TTS not available")
                
        except Exception as e:
            logger.warning(f"⚠️ Failed to initialize Edge TTS: {e}")
            self.engine_info["edge"] = TTSEngineInfo(
                name="Edge TTS",
                engine_type=TTSEngine.EDGE,
                priority=1,
                available=False,
                initialized=False
            )
    
    async def _initialize_coqui_tts(self):
        """Initialize Coqui TTS engine"""
        try:
            from .coqui_tts_engine import CoquiTTS
            
            engine = CoquiTTS()
            await engine.initialize()
            
            if engine.is_available():
                self.engines["coqui"] = engine
                self.engine_info["coqui"] = TTSEngineInfo(
                    name="Coqui TTS",
                    engine_type=TTSEngine.COQUI,
                    priority=2,
                    available=True,
                    initialized=True
                )
                logger.info("✅ Coqui TTS engine initialized successfully")
            else:
                raise Exception("Coqui TTS not available")
                
        except Exception as e:
            logger.warning(f"⚠️ Failed to initialize Coqui TTS: {e}")
            self.engine_info["coqui"] = TTSEngineInfo(
                name="Coqui TTS",
                engine_type=TTSEngine.COQUI,
                priority=2,
                available=False,
                initialized=False
            )
    
    async def _initialize_system_tts(self):
        """Initialize System TTS engine (always available fallback)"""
        try:
            from .fallback_tts import SystemTTS
            
            engine = SystemTTS()
            await engine.initialize()
            
            # System TTS should always be available as last resort
            self.engines["system"] = engine
            self.engine_info["system"] = TTSEngineInfo(
                name="System TTS",
                engine_type=TTSEngine.AZURE,  # Generic system TTS
                priority=3,  # Lowest priority
                available=True,
                initialized=True
            )
            logger.info("✅ System TTS engine initialized as fallback")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize System TTS: {e}")
            # Even if system TTS fails, we can still provide text-only responses
            self.engine_info["system"] = TTSEngineInfo(
                name="System TTS",
                engine_type=TTSEngine.AZURE,
                priority=3,
                available=False,
                initialized=False
            )
    
    def _setup_default_voices(self):
        """Setup default voice profiles for different contexts"""
        # PAM Assistant Voice - Friendly and helpful
        self.default_voice_profiles["pam_assistant"] = VoiceProfile(
            voice_id="en-US-AriaNeural",  # Edge TTS voice
            name="PAM Assistant",
            gender="female", 
            age="young",
            accent="american",
            engine=TTSEngine.EDGE,
            settings=VoiceSettings(
                stability=0.8,
                similarity_boost=0.75,
                speed=1.0,
                pitch=1.0,
                volume=1.0,
                style=VoiceStyle.FRIENDLY
            )
        )
        
        # Navigation Voice - Clear and authoritative
        self.default_voice_profiles["navigation"] = VoiceProfile(
            voice_id="en-US-DavisNeural",
            name="Navigation Voice",
            gender="male",
            age="middle", 
            accent="american",
            engine=TTSEngine.EDGE,
            settings=VoiceSettings(
                stability=0.9,
                similarity_boost=0.8,
                speed=0.95,
                pitch=0.9,
                volume=1.0,
                style=VoiceStyle.AUTHORITATIVE
            )
        )
        
        # Emergency Voice - Clear and calm
        self.default_voice_profiles["emergency"] = VoiceProfile(
            voice_id="en-US-JennyNeural",
            name="Emergency Voice",
            gender="female",
            age="middle",
            accent="american",
            engine=TTSEngine.EDGE,
            settings=VoiceSettings(
                stability=1.0,
                similarity_boost=0.9,
                speed=0.9,
                pitch=0.95,
                volume=1.0,
                style=VoiceStyle.CALM
            )
        )
    
    async def synthesize_speech(
        self,
        text: str,
        user_id: Optional[str] = None,
        voice_profile: Optional[str] = "pam_assistant",
        format: AudioFormat = AudioFormat.WAV,
        stream: bool = False
    ) -> Dict[str, Any]:
        """
        Synthesize speech with intelligent engine fallback
        
        Args:
            text: Text to synthesize
            user_id: User ID for personalization
            voice_profile: Voice profile name or custom profile
            format: Audio format
            stream: Whether to stream audio
            
        Returns:
            Dictionary with audio data, metadata, and fallback info
        """
        start_time = time.time()
        self.total_requests += 1
        
        if not text or text.strip() == "":
            return self._create_text_response(text, "Empty text provided")
        
        # Get voice profile
        if isinstance(voice_profile, str):
            profile = self.default_voice_profiles.get(voice_profile)
            if not profile:
                profile = self.default_voice_profiles["pam_assistant"]
        else:
            profile = voice_profile
        
        # Create TTS request
        request = TTSRequest(
            text=text,
            voice_profile=profile,
            format=format,
            stream=stream,
            user_id=user_id,
            cache_key=f"{hash(text)}_{profile.voice_id}_{format.value}"
        )
        
        # Try engines in priority order
        available_engines = self._get_available_engines()
        
        for engine_name in available_engines:
            if self.circuit_breaker.is_open(engine_name):
                logger.debug(f"⏭️ Skipping {engine_name} (circuit breaker open)")
                continue
            
            try:
                logger.debug(f"🎤 Attempting TTS with {engine_name}")
                
                engine = self.engines[engine_name]
                response = await asyncio.wait_for(
                    engine.synthesize(request),
                    timeout=30.0  # 30 second timeout per engine
                )
                
                if response and response.audio_data:
                    # Success - record metrics and return
                    processing_time = (time.time() - start_time) * 1000
                    
                    self.circuit_breaker.record_success(engine_name)
                    self.successful_requests += 1
                    self._update_engine_stats(engine_name, True, processing_time)
                    
                    logger.info(f"✅ TTS successful with {engine_name} in {processing_time:.1f}ms")
                    
                    return {
                        "success": True,
                        "audio_data": response.audio_data,
                        "audio_url": None,  # Could generate URL if needed
                        "text": text,
                        "engine_used": engine_name,
                        "generation_time_ms": processing_time,
                        "voice_profile": profile.name,
                        "format": format.value,
                        "cached": response.cache_hit,
                        "fallback_used": False
                    }
                else:
                    raise Exception(f"No audio data returned from {engine_name}")
                    
            except asyncio.TimeoutError:
                error_msg = f"TTS timeout with {engine_name}"
                logger.warning(f"⏱️ {error_msg}")
                self.circuit_breaker.record_failure(engine_name, TimeoutError(error_msg))
                self._update_engine_stats(engine_name, False, 30000)
                
            except Exception as e:
                error_msg = f"TTS failed with {engine_name}: {str(e)}"
                logger.warning(f"❌ {error_msg}")
                self.circuit_breaker.record_failure(engine_name, e)
                processing_time = (time.time() - start_time) * 1000
                self._update_engine_stats(engine_name, False, processing_time)
        
        # All engines failed - return text-only response
        self.fallback_requests += 1
        self.text_only_responses += 1
        
        logger.warning(f"🔊 All TTS engines failed, returning text-only response")
        
        return self._create_text_response(
            text, 
            "All TTS engines unavailable",
            fallback_used=True
        )
    
    async def synthesize_for_pam(
        self,
        text: str,
        user_id: str,
        context: str = "general",
        stream: bool = False
    ) -> TTSResponse:
        """
        Synthesize speech specifically for PAM responses
        
        Args:
            text: Text to synthesize
            user_id: User ID
            context: Context for voice selection
            stream: Whether to stream response
            
        Returns:
            TTSResponse object
        """
        # Select appropriate voice profile based on context
        voice_profile = "pam_assistant"
        if context in ["navigation", "directions", "route"]:
            voice_profile = "navigation"
        elif context in ["emergency", "warning", "alert"]:
            voice_profile = "emergency"
        
        result = await self.synthesize_speech(
            text=text,
            user_id=user_id,
            voice_profile=voice_profile,
            stream=stream
        )
        
        # Convert to TTSResponse format expected by enhanced orchestrator
        return TTSResponse(
            request=TTSRequest(
                text=text,
                voice_profile=self.default_voice_profiles[voice_profile],
                user_id=user_id
            ),
            audio_data=result.get("audio_data"),
            duration_ms=len(result.get("audio_data", b"")) // 44 if result.get("audio_data") else 0,  # Rough estimate
            generation_time_ms=result.get("generation_time_ms"),
            cache_hit=result.get("cached", False),
            engine_used=TTSEngine.EDGE if result.get("engine_used") == "edge" else TTSEngine.COQUI,
            success=result.get("success", False)
        )
    
    def _get_available_engines(self) -> List[str]:
        """Get list of available engines sorted by priority"""
        available = [
            name for name, info in self.engine_info.items()
            if info.available and info.initialized
        ]
        
        # Sort by priority (lower number = higher priority)
        available.sort(key=lambda x: self.engine_info[x].priority)
        return available
    
    def _update_engine_stats(self, engine_name: str, success: bool, response_time_ms: float):
        """Update engine performance statistics"""
        if engine_name not in self.engine_info:
            return
            
        info = self.engine_info[engine_name]
        info.last_used = datetime.utcnow()
        
        # Update average response time (simple moving average)
        if info.avg_response_time_ms == 0:
            info.avg_response_time_ms = response_time_ms
        else:
            info.avg_response_time_ms = (info.avg_response_time_ms * 0.8) + (response_time_ms * 0.2)
        
        # Success rate would need more detailed tracking - simplified for now
        if success:
            info.success_rate = min(1.0, info.success_rate + 0.1)
        else:
            info.success_rate = max(0.0, info.success_rate - 0.2)
    
    def _create_text_response(
        self, 
        text: str, 
        error_reason: str,
        fallback_used: bool = True
    ) -> Dict[str, Any]:
        """Create a text-only response when TTS fails"""
        return {
            "success": False,
            "audio_data": None,
            "audio_url": None,
            "text": text,
            "engine_used": "text_only",
            "generation_time_ms": 0,
            "voice_profile": "text_only",
            "format": "text",
            "cached": False,
            "fallback_used": fallback_used,
            "error": error_reason
        }
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get comprehensive TTS system health status"""
        return {
            "system_health": {
                "total_engines": len(self.engine_info),
                "available_engines": len([e for e in self.engine_info.values() if e.available]),
                "initialized_engines": len([e for e in self.engine_info.values() if e.initialized])
            },
            "engines": {
                name: {
                    "available": info.available,
                    "initialized": info.initialized,
                    "priority": info.priority,
                    "last_used": info.last_used.isoformat() if info.last_used else None,
                    "success_rate": info.success_rate,
                    "avg_response_time_ms": info.avg_response_time_ms
                }
                for name, info in self.engine_info.items()
            },
            "circuit_breaker": self.circuit_breaker.get_health_summary(),
            "performance": {
                "total_requests": self.total_requests,
                "successful_requests": self.successful_requests,
                "fallback_requests": self.fallback_requests,
                "text_only_responses": self.text_only_responses,
                "success_rate": self.successful_requests / max(1, self.total_requests)
            },
            "voice_profiles": list(self.default_voice_profiles.keys())
        }
    
    def set_user_voice_preference(self, user_id: str, voice_id: str):
        """Set voice preference for a user"""
        self.user_voice_preferences[user_id] = voice_id
        logger.info(f"🎤 Set voice preference for user {user_id}: {voice_id}")
    
    def get_user_voice_preference(self, user_id: str) -> Optional[str]:
        """Get voice preference for a user"""
        return self.user_voice_preferences.get(user_id)
    
    @property
    def is_initialized(self) -> bool:
        """Check if TTS manager is properly initialized"""
        return len([e for e in self.engine_info.values() if e.initialized]) > 0


# Global TTS manager instance
_tts_manager: Optional[TTSManager] = None


def get_tts_manager() -> TTSManager:
    """Get or create the global TTS manager instance"""
    global _tts_manager
    if _tts_manager is None:
        _tts_manager = TTSManager()
    return _tts_manager


# Backward compatibility aliases
tts_service = get_tts_manager()