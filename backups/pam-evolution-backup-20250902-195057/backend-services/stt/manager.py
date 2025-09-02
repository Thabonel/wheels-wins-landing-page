"""
STT Manager
Orchestrates multiple STT engines with automatic fallback
"""

import logging
import time
from typing import List, Optional, Dict, Any
import asyncio

from .base import BaseSTTEngine, STTResponse, STTError, AudioFormat
from .engines import WhisperSTTEngine, BrowserSTTEngine

logger = logging.getLogger(__name__)

class STTManager:
    """
    Manages multiple STT engines with fallback support
    """
    
    def __init__(self):
        """Initialize STT manager with available engines"""
        self.engines: List[BaseSTTEngine] = []
        self.primary_engine: Optional[BaseSTTEngine] = None
        self._initialize_engines()
    
    def _initialize_engines(self):
        """Initialize all available STT engines"""
        logger.info("🎤 Initializing STT engines...")
        
        # Initialize engines in priority order
        engine_classes = [
            WhisperSTTEngine,    # Primary: OpenAI Whisper
            BrowserSTTEngine     # Fallback: Browser-native
        ]
        
        for engine_class in engine_classes:
            try:
                engine = engine_class()
                if engine.is_available:
                    self.engines.append(engine)
                    if not self.primary_engine:
                        self.primary_engine = engine
                    logger.info(f"✅ Loaded STT engine: {engine.name}")
                else:
                    logger.warning(f"⚠️ STT engine not available: {engine.name}")
            except Exception as e:
                logger.error(f"❌ Failed to initialize STT engine {engine_class.__name__}: {e}")
        
        if not self.engines:
            logger.error("❌ No STT engines available!")
        else:
            logger.info(f"✅ STT Manager initialized with {len(self.engines)} engines")
            logger.info(f"   Primary engine: {self.primary_engine.name if self.primary_engine else 'None'}")
    
    async def transcribe(
        self,
        audio_data: bytes,
        format: AudioFormat = AudioFormat.WAV,
        language: str = "en",
        prefer_engine: Optional[str] = None,
        **kwargs
    ) -> STTResponse:
        """
        Transcribe audio using available engines with fallback
        
        Args:
            audio_data: Audio data to transcribe
            format: Audio format
            language: Language code
            prefer_engine: Preferred engine name (optional)
            **kwargs: Additional engine-specific parameters
            
        Returns:
            STTResponse with transcription
        """
        if not self.engines:
            raise STTError("No STT engines available")
        
        # Select engines to try
        engines_to_try = self.engines.copy()
        
        # If a specific engine is preferred, try it first
        if prefer_engine:
            preferred = [e for e in engines_to_try if e.name == prefer_engine]
            if preferred:
                engines_to_try.remove(preferred[0])
                engines_to_try.insert(0, preferred[0])
        
        # Try each engine until one succeeds
        last_error = None
        
        for engine in engines_to_try:
            # Check if engine supports the format and language
            if not engine.supports_format(format):
                logger.debug(f"⚠️ {engine.name} doesn't support format {format.value}")
                continue
            
            if not engine.supports_language(language):
                logger.debug(f"⚠️ {engine.name} doesn't support language {language}")
                continue
            
            try:
                logger.debug(f"🎤 Attempting transcription with {engine.name}")
                
                start_time = time.time()
                result = await engine.transcribe(
                    audio_data=audio_data,
                    format=format,
                    language=language,
                    **kwargs
                )
                
                # Log success metrics
                elapsed = time.time() - start_time
                logger.info(
                    f"✅ STT successful with {engine.name} "
                    f"({elapsed:.2f}s, {len(result.text)} chars)"
                )
                
                return result
                
            except Exception as e:
                logger.warning(f"❌ {engine.name} transcription failed: {e}")
                last_error = e
                continue
        
        # All engines failed
        error_msg = f"All STT engines failed. Last error: {last_error}"
        logger.error(error_msg)
        raise STTError(error_msg)
    
    def get_available_engines(self) -> List[str]:
        """Get list of available engine names"""
        return [engine.name for engine in self.engines]
    
    def get_engine_capabilities(self, engine_name: str = None) -> Dict[str, Any]:
        """
        Get capabilities of a specific engine or all engines
        
        Args:
            engine_name: Name of specific engine (optional)
            
        Returns:
            Dictionary of capabilities
        """
        if engine_name:
            engine = next((e for e in self.engines if e.name == engine_name), None)
            if engine:
                return engine.get_capabilities()
            return {"error": f"Engine {engine_name} not found"}
        
        # Return all engine capabilities
        return {
            "engines": [engine.get_capabilities() for engine in self.engines],
            "primary_engine": self.primary_engine.name if self.primary_engine else None,
            "total_engines": len(self.engines)
        }
    
    def supports_format(self, format: AudioFormat) -> bool:
        """Check if any engine supports a format"""
        return any(engine.supports_format(format) for engine in self.engines)
    
    def supports_language(self, language: str) -> bool:
        """Check if any engine supports a language"""
        return any(engine.supports_language(language) for engine in self.engines)
    
    def get_supported_formats(self) -> List[AudioFormat]:
        """Get all supported audio formats across engines"""
        formats = set()
        for engine in self.engines:
            formats.update(engine.supported_formats)
        return list(formats)
    
    def get_supported_languages(self) -> List[str]:
        """Get all supported languages across engines"""
        languages = set()
        for engine in self.engines:
            languages.update(engine.supported_languages)
        return sorted(list(languages))
    
    async def health_check(self) -> Dict[str, Any]:
        """Check health of all STT engines"""
        health = {
            "healthy": len(self.engines) > 0,
            "total_engines": len(self.engines),
            "engines": []
        }
        
        for engine in self.engines:
            engine_health = {
                "name": engine.name,
                "available": engine.is_available,
                "capabilities": engine.get_capabilities()
            }
            health["engines"].append(engine_health)
        
        return health

# Global instance
_stt_manager = None

def get_stt_manager() -> STTManager:
    """Get or create the global STT manager instance"""
    global _stt_manager
    if _stt_manager is None:
        _stt_manager = STTManager()
    return _stt_manager

# Test function
async def test_stt_manager():
    """Test STT manager functionality"""
    try:
        manager = get_stt_manager()
        
        print("🎤 Testing STT Manager")
        print(f"   Available engines: {manager.get_available_engines()}")
        print(f"   Supported formats: {[f.value for f in manager.get_supported_formats()]}")
        print(f"   Supported languages: {manager.get_supported_languages()[:10]}...")  # First 10
        
        # Test health check
        health = await manager.health_check()
        print(f"   Health: {'✅ Healthy' if health['healthy'] else '❌ Unhealthy'}")
        print(f"   Total engines: {health['total_engines']}")
        
        # Test capabilities
        capabilities = manager.get_engine_capabilities()
        print(f"   Primary engine: {capabilities['primary_engine']}")
        
        return True
        
    except Exception as e:
        print(f"❌ STT Manager test failed: {e}")
        return False

if __name__ == "__main__":
    # Test the manager
    asyncio.run(test_stt_manager())