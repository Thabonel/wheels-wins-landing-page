"""
OpenAI Whisper STT Engine
Uses OpenAI's Whisper model for speech-to-text
"""

import os
import tempfile
import asyncio
import time
import logging
from typing import Dict, Any, Optional
from io import BytesIO

from ..base import BaseSTTEngine, STTResponse, STTError, AudioFormat
from app.core.config import get_settings

logger = logging.getLogger(__name__)

class WhisperSTTEngine(BaseSTTEngine):
    """OpenAI Whisper STT Engine"""
    
    def __init__(self):
        self.client = None
        self.model = "whisper-1"
        super().__init__("WhisperSTT")
    
    def _setup_engine(self):
        """Setup Whisper STT engine"""
        settings = get_settings()
        
        if not settings.OPENAI_API_KEY:
            raise STTError("OpenAI API key not configured", engine="WhisperSTT")
        
        try:
            from openai import OpenAI
            self.client = OpenAI(api_key=settings.OPENAI_API_KEY.get_secret_value())
            
            # Update supported formats and languages
            self.supported_formats = [
                AudioFormat.MP3,
                AudioFormat.WAV,
                AudioFormat.WEBM,
                AudioFormat.OGG,
                AudioFormat.FLAC
            ]
            
            # Whisper supports many languages
            self.supported_languages = [
                "en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh",
                "ar", "hi", "nl", "pl", "tr", "sv", "da", "no", "fi", "he"
            ]
            
            logger.debug(f"✅ Whisper STT initialized with model: {self.model}")
            
        except ImportError:
            raise STTError("OpenAI package not installed", engine="WhisperSTT")
        except Exception as e:
            raise STTError(f"Failed to initialize Whisper: {e}", engine="WhisperSTT", original_error=e)
    
    async def transcribe(
        self, 
        audio_data: bytes,
        format: AudioFormat = AudioFormat.WAV,
        language: str = "en",
        **kwargs
    ) -> STTResponse:
        """
        Transcribe audio using OpenAI Whisper
        
        Args:
            audio_data: Audio data as bytes
            format: Audio format
            language: Language code for transcription
            **kwargs: Additional parameters (prompt, temperature, etc.)
            
        Returns:
            STTResponse with transcription
        """
        if not self.is_available:
            raise STTError("Whisper STT engine not available", engine="WhisperSTT")
        
        if not self.supports_format(format):
            raise STTError(f"Unsupported audio format: {format.value}", engine="WhisperSTT")
        
        start_time = time.time()
        
        try:
            logger.debug(f"🎤 Transcribing {len(audio_data)} bytes of {format.value} audio")
            
            # Create a file-like object from bytes
            audio_file = BytesIO(audio_data)
            audio_file.name = f"audio.{format.value}"
            
            # Prepare transcription parameters
            params = {
                "model": self.model,
                "file": audio_file,
                "response_format": "verbose_json"  # Get detailed response
            }
            
            # Add language hint if provided and supported
            if language and self.supports_language(language):
                params["language"] = language
            
            # Add optional parameters
            if "prompt" in kwargs:
                params["prompt"] = kwargs["prompt"]
            if "temperature" in kwargs:
                params["temperature"] = kwargs["temperature"]
            
            # Run transcription in executor to avoid blocking
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.client.audio.transcriptions.create(**params)
            )
            
            processing_time = time.time() - start_time
            
            # Parse response
            text = response.text
            language_detected = getattr(response, 'language', language)
            duration = getattr(response, 'duration', None)
            
            # Extract word-level timestamps if available
            words = None
            if hasattr(response, 'words'):
                words = [
                    {
                        "word": word.word,
                        "start": word.start,
                        "end": word.end
                    }
                    for word in response.words
                ]
            
            # Calculate confidence (Whisper doesn't provide confidence scores directly)
            # We'll use a heuristic based on response
            confidence = 0.95 if text and len(text) > 0 else 0.0
            
            logger.debug(f"✅ Whisper transcription completed in {processing_time:.2f}s")
            
            return STTResponse(
                text=text,
                confidence=confidence,
                language=language_detected,
                duration=duration,
                words=words,
                engine_used="WhisperSTT",
                processing_time=processing_time
            )
            
        except Exception as e:
            logger.error(f"❌ Whisper transcription failed: {e}")
            raise STTError(f"Whisper transcription failed: {e}", engine="WhisperSTT", original_error=e)
    
    def get_capabilities(self) -> Dict[str, Any]:
        """Get Whisper engine capabilities"""
        return {
            "name": "WhisperSTT",
            "provider": "OpenAI",
            "model": self.model,
            "supported_formats": [f.value for f in self.supported_formats],
            "supported_languages": self.supported_languages,
            "features": {
                "word_timestamps": True,
                "language_detection": True,
                "punctuation": True,
                "multi_speaker": False,
                "real_time": False,
                "max_duration_seconds": 300  # 5 minutes
            },
            "is_available": self.is_available
        }

# Test function
async def test_whisper_stt():
    """Test Whisper STT functionality"""
    try:
        engine = WhisperSTTEngine()
        if not engine.is_available:
            print("❌ Whisper STT engine not available")
            return False
        
        # Create a simple test audio (silence)
        # In real usage, this would be actual audio data
        import wave
        import io
        
        # Create a simple WAV file with silence
        audio_buffer = io.BytesIO()
        with wave.open(audio_buffer, 'wb') as wav_file:
            wav_file.setnchannels(1)  # Mono
            wav_file.setsampwidth(2)  # 16-bit
            wav_file.setframerate(16000)  # 16kHz
            # Write 1 second of silence
            wav_file.writeframes(b'\x00' * 32000)
        
        audio_data = audio_buffer.getvalue()
        
        # Test transcription
        result = await engine.transcribe(
            audio_data=audio_data,
            format=AudioFormat.WAV,
            language="en"
        )
        
        print(f"✅ Whisper STT test successful")
        print(f"   Text: '{result.text}' (empty expected for silence)")
        print(f"   Processing time: {result.processing_time:.2f}s")
        
        # Test capabilities
        capabilities = engine.get_capabilities()
        print(f"   Capabilities: {capabilities['features']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Whisper STT test failed: {e}")
        return False

if __name__ == "__main__":
    # Test the engine
    asyncio.run(test_whisper_stt())