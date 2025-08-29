"""
Browser-Native STT Engine
Uses browser's built-in Web Speech API for speech-to-text
This is a placeholder that signals frontend to use browser STT
"""

import logging
from typing import Dict, Any
import json

from ..base import BaseSTTEngine, STTResponse, STTError, AudioFormat

logger = logging.getLogger(__name__)

class BrowserSTTEngine(BaseSTTEngine):
    """Browser-native STT Engine (client-side)"""
    
    def __init__(self):
        super().__init__("BrowserSTT")
    
    def _setup_engine(self):
        """Setup browser STT engine"""
        # Browser STT doesn't require server-side setup
        # This engine acts as a signal to use client-side STT
        
        # Update supported formats (browser handles these)
        self.supported_formats = [
            AudioFormat.WEBM,
            AudioFormat.WAV,
            AudioFormat.OGG
        ]
        
        # Browser STT typically supports major languages
        self.supported_languages = [
            "en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh",
            "ar", "hi", "nl", "pl", "tr"
        ]
        
        logger.debug("✅ Browser STT engine configured (client-side processing)")
    
    async def transcribe(
        self, 
        audio_data: bytes,
        format: AudioFormat = AudioFormat.WEBM,
        language: str = "en",
        **kwargs
    ) -> STTResponse:
        """
        Browser STT doesn't process on server - returns instruction for client
        
        Args:
            audio_data: Not used for browser STT
            format: Expected audio format
            language: Language code
            **kwargs: Additional parameters
            
        Returns:
            STTResponse with client instruction
        """
        # Browser STT is handled client-side
        # Return a response indicating client should handle this
        
        return STTResponse(
            text="[BROWSER_STT_REQUIRED]",
            confidence=1.0,
            language=language,
            engine_used="BrowserSTT",
            processing_time=0.0,
            words=[{
                "instruction": "use_browser_stt",
                "language": language,
                "continuous": kwargs.get("continuous", True),
                "interim_results": kwargs.get("interim_results", True)
            }]
        )
    
    def get_capabilities(self) -> Dict[str, Any]:
        """Get browser STT engine capabilities"""
        return {
            "name": "BrowserSTT",
            "provider": "Browser Web Speech API",
            "supported_formats": [f.value for f in self.supported_formats],
            "supported_languages": self.supported_languages,
            "features": {
                "word_timestamps": False,
                "language_detection": False,
                "punctuation": True,
                "multi_speaker": False,
                "real_time": True,  # Browser STT is real-time
                "continuous": True,
                "interim_results": True,
                "client_side": True  # Processed on client
            },
            "is_available": self.is_available,
            "notes": "Requires client-side implementation using Web Speech API"
        }