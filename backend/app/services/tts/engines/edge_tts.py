"""
Microsoft Edge TTS Engine
Primary TTS engine using Microsoft's high-quality neural voices
"""

import asyncio
import io
import logging
from typing import Dict, Any, List
import tempfile
import os

try:
    import edge_tts
    EDGE_TTS_AVAILABLE = True
except ImportError:
    EDGE_TTS_AVAILABLE = False
    edge_tts = None

from ..base import BaseTTSEngine, VoiceSettings, TTSResponse, TTSError

logger = logging.getLogger(__name__)

class EdgeTTSEngine(BaseTTSEngine):
    """Microsoft Edge TTS Engine"""
    
    def __init__(self):
        self.voices_cache = None
        super().__init__("EdgeTTS")
    
    def _setup_engine(self):
        """Setup Edge TTS engine"""
        if not EDGE_TTS_AVAILABLE:
            raise TTSError("edge-tts package not installed", engine="EdgeTTS")
        
        # Test basic functionality
        asyncio.create_task(self._test_connection())
    
    async def _test_connection(self):
        """Test Edge TTS connection"""
        try:
            # Simple test synthesis
            communicate = edge_tts.Communicate("test", "en-US-AriaNeural")
            audio_chunks = []
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_chunks.append(chunk["data"])
            
            if not audio_chunks:
                raise TTSError("No audio data received from Edge TTS")
                
            logger.debug("✅ Edge TTS connection test successful")
        except Exception as e:
            logger.error(f"❌ Edge TTS connection test failed: {e}")
            raise TTSError(f"Edge TTS connection failed: {e}", engine="EdgeTTS", original_error=e)
    
    async def synthesize(
        self, 
        text: str, 
        settings: VoiceSettings = None
    ) -> TTSResponse:
        """
        Synthesize text using Edge TTS
        
        Args:
            text: Text to synthesize
            settings: Voice settings (optional)
            
        Returns:
            TTSResponse with MP3 audio data
        """
        if not EDGE_TTS_AVAILABLE:
            raise TTSError("Edge TTS not available", engine="EdgeTTS")
        
        if not text or not text.strip():
            raise TTSError("Empty text provided", engine="EdgeTTS")
        
        # Use provided settings or defaults
        if settings is None:
            settings = VoiceSettings()
        
        try:
            logger.debug(f"🎵 Synthesizing text with Edge TTS: '{text[:50]}...'")
            
            # Create Edge TTS communicate instance
            communicate = edge_tts.Communicate(
                text=text.strip(),
                voice=settings.voice,
                rate=f"{int((settings.speed - 1) * 100):+}%",
                volume=f"{int((settings.volume - 1) * 100):+}%",
                pitch=f"{int((settings.pitch - 1) * 100):+}Hz"
            )
            
            # Collect audio chunks
            audio_chunks = []
            subtitle_chunks = []
            
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_chunks.append(chunk["data"])
                elif chunk["type"] == "WordBoundary":
                    subtitle_chunks.append(chunk)
            
            if not audio_chunks:
                raise TTSError("No audio data generated", engine="EdgeTTS")
            
            # Combine audio chunks
            audio_data = b''.join(audio_chunks)
            
            # Calculate approximate duration (rough estimate)
            duration = len(text.split()) * 0.6  # ~0.6 seconds per word
            
            logger.debug(f"✅ Edge TTS synthesis completed: {len(audio_data)} bytes")
            
            return TTSResponse(
                audio_data=audio_data,
                format="mp3",
                duration=duration,
                voice_used=settings.voice,
                engine_used="EdgeTTS"
            )
            
        except Exception as e:
            logger.error(f"❌ Edge TTS synthesis failed: {e}")
            raise TTSError(f"Edge TTS synthesis failed: {e}", engine="EdgeTTS", original_error=e)
    
    def get_available_voices(self) -> List[Dict[str, Any]]:
        """
        Get available Edge TTS voices
        
        Returns:
            List of voice dictionaries
        """
        if not EDGE_TTS_AVAILABLE:
            return []
        
        # Return common voices for now - Edge TTS has hundreds
        # In production, you'd want to cache the full list from edge_tts.list_voices()
        common_voices = [
            {
                "id": "en-US-AriaNeural",
                "name": "Aria (US English)",
                "language": "en-US",
                "gender": "Female",
                "quality": "Neural"
            },
            {
                "id": "en-US-DavisNeural", 
                "name": "Davis (US English)",
                "language": "en-US",
                "gender": "Male",
                "quality": "Neural"
            },
            {
                "id": "en-US-JennyNeural",
                "name": "Jenny (US English)", 
                "language": "en-US",
                "gender": "Female",
                "quality": "Neural"
            },
            {
                "id": "en-GB-SoniaNeural",
                "name": "Sonia (UK English)",
                "language": "en-GB", 
                "gender": "Female",
                "quality": "Neural"
            },
            {
                "id": "en-GB-RyanNeural",
                "name": "Ryan (UK English)",
                "language": "en-GB",
                "gender": "Male", 
                "quality": "Neural"
            }
        ]
        
        return common_voices

# Async helper function for testing
async def test_edge_tts():
    """Test Edge TTS functionality"""
    if not EDGE_TTS_AVAILABLE:
        print("❌ Edge TTS not available")
        return False
    
    try:
        engine = EdgeTTSEngine()
        if not engine.is_available:
            print("❌ Edge TTS engine not available")
            return False
        
        # Test synthesis
        settings = VoiceSettings(voice="en-US-AriaNeural", speed=1.0, volume=1.0)
        result = await engine.synthesize("Hello, this is a test of Edge TTS.", settings)
        
        print(f"✅ Edge TTS test successful: {len(result.audio_data)} bytes generated")
        return True
        
    except Exception as e:
        print(f"❌ Edge TTS test failed: {e}")
        return False

if __name__ == "__main__":
    # Test the engine
    asyncio.run(test_edge_tts())