"""
Speech-to-Text Service
Handles speech recognition for voice conversations using multiple providers
"""

import asyncio
import io
import logging
import tempfile
from typing import Optional, Dict, Any
from abc import ABC, abstractmethod

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

class BaseSpeechToText(ABC):
    """Base class for speech-to-text providers"""
    
    @abstractmethod
    async def transcribe(self, audio_data: bytes) -> Optional[str]:
        """Transcribe audio data to text"""
        pass
    
    @abstractmethod
    async def is_available(self) -> bool:
        """Check if the STT service is available"""
        pass

class OpenAIWhisperSTT(BaseSpeechToText):
    """OpenAI Whisper speech-to-text service"""
    
    def __init__(self):
        self.client = None
        self.is_initialized = False
    
    async def initialize(self):
        """Initialize OpenAI Whisper client"""
        try:
            # Try to import and initialize OpenAI client
            try:
                import openai
                from app.core.config import settings
                
                if hasattr(settings, 'OPENAI_API_KEY') and settings.OPENAI_API_KEY:
                    self.client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
                    self.is_initialized = True
                    logger.info("✅ OpenAI Whisper STT initialized")
                    return True
                else:
                    logger.warning("⚠️ OpenAI API key not found")
                    return False
                    
            except ImportError:
                logger.warning("⚠️ OpenAI library not installed")
                return False
                
        except Exception as e:
            logger.error(f"❌ Failed to initialize OpenAI Whisper: {e}")
            return False
    
    async def transcribe(self, audio_data: bytes) -> Optional[str]:
        """Transcribe audio using OpenAI Whisper"""
        if not self.is_initialized or not self.client:
            return None
        
        try:
            # Create temporary file for audio data
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                temp_file.write(audio_data)
                temp_file.flush()
                
                # Transcribe using OpenAI Whisper
                with open(temp_file.name, "rb") as audio_file:
                    transcript = await self.client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file,
                        language="en"  # Can be made configurable
                    )
                
                return transcript.text.strip() if transcript.text else None
                
        except Exception as e:
            logger.error(f"❌ OpenAI Whisper transcription failed: {e}")
            return None
    
    async def is_available(self) -> bool:
        """Check if OpenAI Whisper is available"""
        return self.is_initialized and self.client is not None

class BrowserWebSpeechSTT(BaseSpeechToText):
    """Placeholder for browser-based Web Speech API"""
    
    async def transcribe(self, audio_data: bytes) -> Optional[str]:
        """Browser-based STT handled on frontend"""
        # This is handled by the browser's Web Speech API
        # Audio data here would be the result passed from frontend
        logger.debug("🎤 Browser Web Speech API transcription")
        return None
    
    async def is_available(self) -> bool:
        """Browser Web Speech API availability"""
        return True

class LocalWhisperSTT(BaseSpeechToText):
    """Local Whisper model for offline usage"""
    
    def __init__(self):
        self.model = None
        self.is_initialized = False
    
    async def initialize(self):
        """Initialize local Whisper model"""
        try:
            import whisper
            
            # Load smallest model for speed (can be configurable)
            self.model = whisper.load_model("base")
            self.is_initialized = True
            logger.info("✅ Local Whisper STT initialized")
            return True
            
        except ImportError:
            logger.warning("⚠️ Whisper library not installed for local STT")
            return False
        except Exception as e:
            logger.error(f"❌ Failed to initialize local Whisper: {e}")
            return False
    
    async def transcribe(self, audio_data: bytes) -> Optional[str]:
        """Transcribe audio using local Whisper model"""
        if not self.is_initialized or not self.model:
            return None
        
        try:
            # Create temporary audio file
            with tempfile.NamedTemporaryFile(suffix=".wav") as temp_file:
                temp_file.write(audio_data)
                temp_file.flush()
                
                # Transcribe using local Whisper
                result = self.model.transcribe(temp_file.name)
                return result["text"].strip() if result.get("text") else None
                
        except Exception as e:
            logger.error(f"❌ Local Whisper transcription failed: {e}")
            return None
    
    async def is_available(self) -> bool:
        """Check if local Whisper is available"""
        return self.is_initialized and self.model is not None

class SpeechToTextService:
    """Manages multiple STT providers with fallback support"""
    
    def __init__(self):
        self.providers = {}
        self.primary_provider = None
        self.fallback_providers = []
        self.is_initialized = False
    
    async def initialize(self):
        """Initialize STT service with multiple providers"""
        try:
            logger.info("🎤 Initializing Speech-to-Text Service...")
            
            # Initialize providers in order of preference
            providers_to_init = [
                ("openai_whisper", OpenAIWhisperSTT()),
                ("local_whisper", LocalWhisperSTT()),
                ("browser_webspeech", BrowserWebSpeechSTT())
            ]
            
            available_providers = []
            
            for name, provider in providers_to_init:
                if hasattr(provider, 'initialize'):
                    success = await provider.initialize()
                else:
                    success = await provider.is_available()
                
                if success:
                    self.providers[name] = provider
                    available_providers.append(name)
                    logger.info(f"✅ STT Provider {name} initialized")
            
            # Set primary provider (prefer OpenAI Whisper)
            if "openai_whisper" in self.providers:
                self.primary_provider = self.providers["openai_whisper"]
                self.fallback_providers = [p for name, p in self.providers.items() if name != "openai_whisper"]
            elif "local_whisper" in self.providers:
                self.primary_provider = self.providers["local_whisper"]
                self.fallback_providers = [p for name, p in self.providers.items() if name != "local_whisper"]
            elif self.providers:
                provider_name = list(self.providers.keys())[0]
                self.primary_provider = self.providers[provider_name]
                self.fallback_providers = []
            
            if self.primary_provider:
                self.is_initialized = True
                logger.info(f"🎤 STT Service initialized with {len(available_providers)} providers")
                return True
            else:
                logger.warning("⚠️ No STT providers available - voice input will be limited")
                return False
                
        except Exception as e:
            logger.error(f"❌ Failed to initialize STT Service: {e}")
            return False
    
    async def transcribe(self, audio_data: bytes, provider: Optional[str] = None) -> Optional[str]:
        """Transcribe audio data to text"""
        if not self.is_initialized:
            logger.warning("⚠️ STT Service not initialized")
            return None
        
        # Use specific provider if requested
        if provider and provider in self.providers:
            try:
                result = await self.providers[provider].transcribe(audio_data)
                if result:
                    logger.debug(f"🎤 Transcription successful using {provider}")
                    return result
            except Exception as e:
                logger.error(f"❌ STT provider {provider} failed: {e}")
        
        # Try primary provider
        if self.primary_provider:
            try:
                result = await self.primary_provider.transcribe(audio_data)
                if result:
                    logger.debug("🎤 Transcription successful using primary provider")
                    return result
            except Exception as e:
                logger.error(f"❌ Primary STT provider failed: {e}")
        
        # Try fallback providers
        for i, provider in enumerate(self.fallback_providers):
            try:
                result = await provider.transcribe(audio_data)
                if result:
                    logger.debug(f"🎤 Transcription successful using fallback provider {i}")
                    return result
            except Exception as e:
                logger.error(f"❌ Fallback STT provider {i} failed: {e}")
        
        logger.warning("⚠️ All STT providers failed")
        return None
    
    async def get_available_providers(self) -> Dict[str, bool]:
        """Get list of available STT providers"""
        availability = {}
        for name, provider in self.providers.items():
            try:
                availability[name] = await provider.is_available()
            except Exception:
                availability[name] = False
        return availability
    
    async def get_service_status(self) -> Dict[str, Any]:
        """Get STT service status"""
        if not self.is_initialized:
            return {
                "status": "not_initialized",
                "providers": {},
                "primary_provider": None
            }
        
        provider_status = await self.get_available_providers()
        
        return {
            "status": "initialized" if self.is_initialized else "not_initialized",
            "providers": provider_status,
            "primary_provider": type(self.primary_provider).__name__ if self.primary_provider else None,
            "fallback_count": len(self.fallback_providers)
        }

# Global STT service instance
speech_to_text_service = SpeechToTextService()