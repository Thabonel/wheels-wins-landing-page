"""
Fallback Speech-to-Text Service
Works without external API keys for testing/demo purposes
"""

import asyncio
import tempfile
import os
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


class FallbackSTTService:
    """
    Simple STT service for testing without external dependencies
    Returns mock transcriptions or uses basic audio analysis
    """
    
    def __init__(self):
        self.is_initialized = False
        self.mock_responses = [
            "Hello PAM, this is a test message",
            "PAM tell me a joke",
            "What's the weather like today?",
            "PAM help me with my travel plans", 
            "Hello there, can you hear me?",
            "PAM what time is it?",
            "Tell me something interesting",
            "PAM how are you doing today?",
            "I need some assistance please",
            "PAM can you help me?"
        ]
        self.response_index = 0
    
    async def initialize(self) -> bool:
        """Initialize the fallback STT service"""
        try:
            self.is_initialized = True
            logger.info("✅ Fallback STT Service initialized (testing mode)")
            return True
        except Exception as e:
            logger.error(f"❌ Fallback STT initialization failed: {e}")
            return False
    
    async def transcribe(self, audio_data: bytes) -> Optional[str]:
        """
        Mock transcription - returns rotating test phrases
        In a real implementation, this could use local STT libraries
        """
        if not self.is_initialized:
            await self.initialize()
        
        try:
            # Simple audio analysis - check if we have audio data
            if not audio_data or len(audio_data) < 1000:
                return "I couldn't hear anything clearly"
            
            # Return rotating mock responses for testing
            response = self.mock_responses[self.response_index]
            self.response_index = (self.response_index + 1) % len(self.mock_responses)
            
            logger.info(f"🎤 Fallback STT transcribed: '{response}' (mock response)")
            return response
            
        except Exception as e:
            logger.error(f"❌ Fallback STT transcription failed: {e}")
            return "Sorry, I couldn't understand that"
    
    async def transcribe_file(self, file_path: str) -> Optional[str]:
        """Transcribe from audio file"""
        try:
            # Read file to check if it exists and has content
            with open(file_path, 'rb') as f:
                audio_data = f.read()
            
            return await self.transcribe(audio_data)
            
        except Exception as e:
            logger.error(f"❌ Fallback STT file transcription failed: {e}")
            return "Sorry, I couldn't process that audio file"
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get service health status"""
        return {
            "status": "healthy" if self.is_initialized else "unhealthy",
            "service": "fallback_stt",
            "mode": "testing",
            "features": ["mock_transcription", "basic_audio_analysis"]
        }


# Global instance
fallback_stt_service = FallbackSTTService()