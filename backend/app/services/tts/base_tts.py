"""
Base TTS Service Interface
Defines the common interface for all TTS engines
"""

import asyncio
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict, List, Any, Optional, AsyncGenerator, Union
from datetime import datetime
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class TTSEngine(Enum):
    """Available TTS engines"""
    ELEVENLABS = "elevenlabs"
    OPENAI = "openai"
    COQUI = "coqui"
    AZURE = "azure"
    GOOGLE = "google"
    EDGE = "edge"

class AudioFormat(Enum):
    """Supported audio formats"""
    WAV = "wav"
    MP3 = "mp3"
    OGG = "ogg"
    WEBM = "webm"
    PCM = "pcm"

class VoiceStyle(Enum):
    """Voice style presets"""
    FRIENDLY = "friendly"
    PROFESSIONAL = "professional"
    CASUAL = "casual"
    ENERGETIC = "energetic"
    CALM = "calm"
    AUTHORITATIVE = "authoritative"

@dataclass
class VoiceSettings:
    """Voice configuration settings"""
    stability: float = 0.75  # 0.0 - 1.0
    similarity_boost: float = 0.75  # 0.0 - 1.0
    speed: float = 1.0  # 0.25 - 4.0
    pitch: float = 1.0  # 0.5 - 2.0
    volume: float = 1.0  # 0.0 - 1.0
    style: VoiceStyle = VoiceStyle.FRIENDLY

@dataclass
class VoiceProfile:
    """Complete voice profile definition"""
    voice_id: str
    name: str
    gender: str  # "male", "female", "neutral"
    age: str  # "young", "middle", "old"
    accent: str  # "american", "british", "australian", etc.
    language: str = "en"
    engine: TTSEngine = TTSEngine.ELEVENLABS
    settings: VoiceSettings = None
    
    def __post_init__(self):
        if self.settings is None:
            self.settings = VoiceSettings()

@dataclass
class AudioChunk:
    """Audio chunk for streaming"""
    data: bytes
    sample_rate: int
    format: AudioFormat
    chunk_index: int
    is_final: bool = False
    metadata: Optional[Dict[str, Any]] = None

@dataclass
class TTSRequest:
    """TTS generation request"""
    text: str
    voice_profile: VoiceProfile
    format: AudioFormat = AudioFormat.WAV
    sample_rate: int = 22050
    stream: bool = False
    cache_key: Optional[str] = None
    priority: int = 1  # 1=high, 2=medium, 3=low
    user_id: Optional[str] = None
    session_id: Optional[str] = None

@dataclass
class TTSResponse:
    """TTS generation response"""
    request: TTSRequest
    audio_data: Optional[bytes] = None
    chunks: Optional[List[AudioChunk]] = None
    duration_ms: Optional[int] = None
    generation_time_ms: Optional[int] = None
    cache_hit: bool = False
    engine_used: Optional[TTSEngine] = None
    error: Optional[str] = None
    success: bool = True

class BaseTTSEngine(ABC):
    """Abstract base class for TTS engines"""
    
    def __init__(self, engine_type: TTSEngine):
        self.engine_type = engine_type
        self.is_initialized = False
        self.available_voices: List[VoiceProfile] = []
        self.rate_limit_delay = 0.1  # Default delay between requests
        
    @abstractmethod
    async def initialize(self) -> bool:
        """Initialize the TTS engine"""
        pass
    
    @abstractmethod
    async def synthesize(self, request: TTSRequest) -> TTSResponse:
        """Synthesize speech from text"""
        pass
    
    @abstractmethod
    async def synthesize_stream(self, request: TTSRequest) -> AsyncGenerator[AudioChunk, None]:
        """Synthesize speech with streaming"""
        pass
    
    @abstractmethod
    async def get_available_voices(self) -> List[VoiceProfile]:
        """Get list of available voices"""
        pass
    
    @abstractmethod
    async def health_check(self) -> Dict[str, Any]:
        """Check engine health status"""
        pass
    
    async def close(self):
        """Cleanup resources"""
        pass
    
    def supports_streaming(self) -> bool:
        """Check if engine supports streaming"""
        return False
    
    def supports_voice_cloning(self) -> bool:
        """Check if engine supports voice cloning"""
        return False
    
    def get_supported_formats(self) -> List[AudioFormat]:
        """Get supported audio formats"""
        return [AudioFormat.WAV]
    
    def estimate_duration(self, text: str, voice_profile: VoiceProfile) -> float:
        """Estimate audio duration in seconds"""
        # Basic estimation: ~150 words per minute, ~5 characters per word
        words = len(text) / 5
        return (words / 150) * 60
    
    def validate_request(self, request: TTSRequest) -> bool:
        """Validate TTS request"""
        if not request.text or not request.text.strip():
            return False
        
        if request.format not in self.get_supported_formats():
            return False
        
        if len(request.text) > self.get_max_text_length():
            return False
        
        return True
    
    def get_max_text_length(self) -> int:
        """Get maximum text length supported"""
        return 1000  # Default limit
    
    def prepare_text(self, text: str) -> str:
        """Prepare text for synthesis (cleanup, SSML, etc.)"""
        # Basic text cleanup
        text = text.strip()
        
        # Remove multiple spaces
        import re
        text = re.sub(r'\s+', ' ', text)
        
        # Basic punctuation fixes
        text = text.replace('...', '.')
        text = text.replace('..', '.')
        
        return text

class TTSEngineManager:
    """Manages multiple TTS engines with fallbacks"""
    
    def __init__(self):
        self.engines: Dict[TTSEngine, BaseTTSEngine] = {}
        self.primary_engine: Optional[TTSEngine] = None
        self.fallback_engines: List[TTSEngine] = []
        
    def register_engine(self, engine: BaseTTSEngine, is_primary: bool = False):
        """Register a TTS engine"""
        self.engines[engine.engine_type] = engine
        
        if is_primary:
            self.primary_engine = engine.engine_type
        else:
            self.fallback_engines.append(engine.engine_type)
    
    async def initialize_all(self):
        """Initialize all registered engines"""
        initialization_results = {}
        
        for engine_type, engine in self.engines.items():
            try:
                result = await engine.initialize()
                initialization_results[engine_type.value] = result
                logger.info(f"✅ {engine_type.value} TTS engine initialized: {result}")
            except Exception as e:
                initialization_results[engine_type.value] = False
                logger.error(f"❌ Failed to initialize {engine_type.value} TTS engine: {e}")
        
        return initialization_results
    
    async def get_best_engine(self, request: TTSRequest) -> Optional[BaseTTSEngine]:
        """Get the best available engine for a request"""
        # Try primary engine first
        if self.primary_engine and self.primary_engine in self.engines:
            engine = self.engines[self.primary_engine]
            if engine.is_initialized and engine.validate_request(request):
                return engine
        
        # Try fallback engines
        for engine_type in self.fallback_engines:
            if engine_type in self.engines:
                engine = self.engines[engine_type]
                if engine.is_initialized and engine.validate_request(request):
                    return engine
        
        return None
    
    async def synthesize_with_fallback(self, request: TTSRequest) -> TTSResponse:
        """Synthesize with automatic fallback"""
        engines_to_try = []
        
        # Build engine priority list
        if self.primary_engine:
            engines_to_try.append(self.primary_engine)
        
        engines_to_try.extend(self.fallback_engines)
        
        last_error = None
        
        for engine_type in engines_to_try:
            if engine_type not in self.engines:
                continue
                
            engine = self.engines[engine_type]
            
            if not engine.is_initialized:
                continue
            
            try:
                logger.info(f"🔊 Attempting TTS with {engine_type.value}")
                response = await engine.synthesize(request)
                
                if response.success:
                    response.engine_used = engine_type
                    return response
                else:
                    last_error = response.error
                    
            except Exception as e:
                last_error = str(e)
                logger.warning(f"⚠️ TTS failed with {engine_type.value}: {e}")
                continue
        
        # All engines failed
        return TTSResponse(
            request=request,
            success=False,
            error=f"All TTS engines failed. Last error: {last_error}"
        )
    
    async def health_check_all(self) -> Dict[str, Any]:
        """Check health of all engines"""
        health_status = {
            "overall_status": "healthy",
            "engines": {}
        }
        
        healthy_engines = 0
        total_engines = len(self.engines)
        
        for engine_type, engine in self.engines.items():
            try:
                engine_health = await engine.health_check()
                health_status["engines"][engine_type.value] = engine_health
                
                if engine_health.get("status") == "healthy":
                    healthy_engines += 1
                    
            except Exception as e:
                health_status["engines"][engine_type.value] = {
                    "status": "unhealthy",
                    "error": str(e)
                }
        
        # Determine overall status
        if healthy_engines == 0:
            health_status["overall_status"] = "unhealthy"
        elif healthy_engines < total_engines:
            health_status["overall_status"] = "degraded"
        
        health_status["healthy_engines"] = healthy_engines
        health_status["total_engines"] = total_engines
        
        return health_status
    
    async def close_all(self):
        """Close all engines"""
        for engine in self.engines.values():
            try:
                await engine.close()
            except Exception as e:
                logger.error(f"❌ Error closing engine: {e}")

# Global engine manager instance
tts_manager = TTSEngineManager()