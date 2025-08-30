"""
Base TTS Engine Interface
Defines the contract for all TTS engines
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class VoiceSettings:
    """Voice configuration settings"""
    voice: str = "en-US-AriaNeural"
    speed: float = 1.0
    volume: float = 1.0
    pitch: float = 1.0

@dataclass 
class TTSResponse:
    """TTS generation response"""
    audio_data: bytes
    format: str = "mp3"
    duration: Optional[float] = None
    voice_used: Optional[str] = None
    engine_used: Optional[str] = None

class BaseTTSEngine(ABC):
    """Base class for all TTS engines"""
    
    def __init__(self, name: str):
        self.name = name
        self.is_available = False
        self._initialize()
    
    def _initialize(self):
        """Initialize the TTS engine"""
        try:
            self._setup_engine()
            self.is_available = True
            logger.info(f"✅ {self.name} TTS engine initialized successfully")
        except Exception as e:
            self.is_available = False
            logger.warning(f"❌ {self.name} TTS engine initialization failed: {e}")
    
    @abstractmethod
    def _setup_engine(self):
        """Setup the specific TTS engine"""
        pass
    
    @abstractmethod
    async def synthesize(
        self, 
        text: str, 
        settings: VoiceSettings = None
    ) -> TTSResponse:
        """
        Synthesize text to speech
        
        Args:
            text: Text to synthesize
            settings: Voice settings to use
            
        Returns:
            TTSResponse with audio data and metadata
            
        Raises:
            TTSError: If synthesis fails
        """
        pass
    
    @abstractmethod
    def get_available_voices(self) -> List[Dict[str, Any]]:
        """
        Get list of available voices
        
        Returns:
            List of voice information dictionaries
        """
        pass
    
    def health_check(self) -> bool:
        """Check if engine is healthy and available"""
        return self.is_available
    
    def __str__(self):
        return f"{self.name}TTSEngine(available={self.is_available})"

class TTSError(Exception):
    """TTS-specific exception"""
    
    def __init__(self, message: str, engine: str = None, original_error: Exception = None):
        self.engine = engine
        self.original_error = original_error
        super().__init__(message)