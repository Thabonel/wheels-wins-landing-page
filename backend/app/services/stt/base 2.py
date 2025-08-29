"""
Base STT Engine Interface
Defines the contract for all STT engines
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class AudioFormat(Enum):
    """Supported audio formats for STT"""
    WAV = "wav"
    MP3 = "mp3"
    WEBM = "webm"
    OGG = "ogg"
    FLAC = "flac"
    RAW = "raw"

@dataclass
class STTResponse:
    """STT transcription response"""
    text: str
    confidence: float = 1.0
    language: Optional[str] = None
    duration: Optional[float] = None
    words: Optional[List[Dict[str, Any]]] = None  # Word-level timestamps
    engine_used: Optional[str] = None
    processing_time: Optional[float] = None

class STTError(Exception):
    """STT-specific error"""
    def __init__(self, message: str, engine: str = None, original_error: Exception = None):
        self.engine = engine
        self.original_error = original_error
        super().__init__(message)

class BaseSTTEngine(ABC):
    """Base class for all STT engines"""
    
    def __init__(self, name: str):
        self.name = name
        self.is_available = False
        self.supported_formats = [AudioFormat.WAV, AudioFormat.MP3]
        self.supported_languages = ["en"]
        self._initialize()
    
    def _initialize(self):
        """Initialize the STT engine"""
        try:
            self._setup_engine()
            self.is_available = True
            logger.info(f"✅ {self.name} STT engine initialized successfully")
        except Exception as e:
            self.is_available = False
            logger.warning(f"❌ {self.name} STT engine initialization failed: {e}")
    
    @abstractmethod
    def _setup_engine(self):
        """Setup the specific STT engine"""
        pass
    
    @abstractmethod
    async def transcribe(
        self, 
        audio_data: bytes,
        format: AudioFormat = AudioFormat.WAV,
        language: str = "en",
        **kwargs
    ) -> STTResponse:
        """
        Transcribe audio to text
        
        Args:
            audio_data: Audio data as bytes
            format: Audio format
            language: Language code (e.g., "en", "es")
            **kwargs: Engine-specific parameters
            
        Returns:
            STTResponse with transcription result
        """
        pass
    
    def supports_format(self, format: AudioFormat) -> bool:
        """Check if engine supports a specific audio format"""
        return format in self.supported_formats
    
    def supports_language(self, language: str) -> bool:
        """Check if engine supports a specific language"""
        return language in self.supported_languages
    
    @abstractmethod
    def get_capabilities(self) -> Dict[str, Any]:
        """
        Get engine capabilities
        
        Returns:
            Dictionary describing engine features
        """
        pass