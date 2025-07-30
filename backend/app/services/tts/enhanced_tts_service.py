"""
Enhanced TTS Service with 3-Tier Fallback System
Complete text-to-speech solution with robust dependency management and error handling.

Tier 1: Edge TTS (Primary) - Free, high-quality Microsoft Edge TTS
Tier 2: Coqui TTS (Secondary) - Local neural TTS with custom voices  
Tier 3: pyttsx3/System TTS (Fallback) - Simple system TTS as last resort
"""

import asyncio
import logging
import platform
import subprocess
import tempfile
import os
import importlib.util
from typing import Dict, List, Any, Optional, Union, AsyncGenerator
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import json

from app.core.logging import get_logger
from app.core.config import get_settings

logger = get_logger(__name__)
settings = get_settings()


class TTSEngine(Enum):
    """Available TTS engines"""
    EDGE = "edge"
    COQUI = "coqui"
    PYTTSX3 = "pyttsx3"
    SYSTEM = "system"
    DISABLED = "disabled"


class TTSQuality(Enum):
    """TTS quality levels"""
    HIGH = "high"        # Edge TTS, Coqui TTS
    MEDIUM = "medium"    # System TTS with good voices
    LOW = "low"          # Basic system TTS
    FALLBACK = "fallback"  # Text-only response


@dataclass
class TTSResponse:
    """TTS response with metadata"""
    audio_data: Optional[bytes] = None
    text: str = ""
    engine: TTSEngine = TTSEngine.DISABLED
    quality: TTSQuality = TTSQuality.FALLBACK
    duration_ms: int = 0
    cache_hit: bool = False
    voice_id: str = "default"
    error: Optional[str] = None
    fallback_used: bool = False
    processing_time_ms: float = 0.0


@dataclass
class TTSEngineStatus:
    """TTS engine status information"""
    engine: TTSEngine
    available: bool
    initialized: bool
    error: Optional[str] = None
    version: Optional[str] = None
    voices_count: int = 0
    test_passed: bool = False
    dependencies_met: bool = False


class DependencyChecker:
    """Utility class to check and install TTS dependencies"""
    
    @staticmethod
    def check_edge_tts() -> TTSEngineStatus:
        """Check Edge TTS availability"""
        status = TTSEngineStatus(
            engine=TTSEngine.EDGE,
            available=False,
            initialized=False
        )
        
        try:
            import edge_tts
            status.dependencies_met = True
            status.version = getattr(edge_tts, '__version__', 'unknown')
            
            # Test basic functionality
            try:
                # Simple test to see if we can access the service
                voices = asyncio.run(edge_tts.list_voices())
                status.voices_count = len(voices) if voices else 0
                status.test_passed = True
                status.available = True
                logger.info(f"✅ Edge TTS available with {status.voices_count} voices")
            except Exception as e:
                status.error = f"Edge TTS test failed: {str(e)}"
                logger.warning(f"⚠️ Edge TTS test failed: {e}")
                
        except ImportError:
            status.error = "edge-tts package not installed"
            logger.info("💡 Edge TTS not available - install with: pip install edge-tts")
            
        return status
    
    @staticmethod
    def check_coqui_tts() -> TTSEngineStatus:
        """Check Coqui TTS availability"""
        status = TTSEngineStatus(
            engine=TTSEngine.COQUI,
            available=False,
            initialized=False
        )
        
        try:
            import TTS
            status.dependencies_met = True
            status.version = getattr(TTS, '__version__', 'unknown')
            
            # Test basic functionality
            try:
                from TTS.api import TTS as CoquiTTS
                # Don't actually initialize here as it's heavy, just check import
                status.test_passed = True
                status.available = True
                logger.info("✅ Coqui TTS available")
            except Exception as e:
                status.error = f"Coqui TTS test failed: {str(e)}"
                logger.warning(f"⚠️ Coqui TTS test failed: {e}")
                
        except ImportError:
            status.error = "TTS package not installed"
            logger.info("💡 Coqui TTS not available - install with: pip install TTS")
            
        return status
    
    @staticmethod
    def check_pyttsx3() -> TTSEngineStatus:
        """Check pyttsx3 availability"""
        status = TTSEngineStatus(
            engine=TTSEngine.PYTTSX3,
            available=False,
            initialized=False
        )
        
        try:
            import pyttsx3
            status.dependencies_met = True
            
            # Test basic functionality
            try:
                engine = pyttsx3.init()
                voices = engine.getProperty('voices')
                status.voices_count = len(voices) if voices else 0
                engine.stop()
                status.test_passed = True
                status.available = True
                logger.info(f"✅ pyttsx3 available with {status.voices_count} voices")
            except Exception as e:
                status.error = f"pyttsx3 test failed: {str(e)}"
                logger.warning(f"⚠️ pyttsx3 test failed: {e}")
                
        except ImportError:
            status.error = "pyttsx3 package not installed"
            logger.info("💡 pyttsx3 not available - install with: pip install pyttsx3")
            
        return status
    
    @staticmethod
    def check_system_tts() -> TTSEngineStatus:
        """Check system TTS availability"""
        status = TTSEngineStatus(
            engine=TTSEngine.SYSTEM,
            available=False,
            initialized=False,
            dependencies_met=True  # System tools don't need Python packages
        )
        
        system = platform.system()
        
        try:
            if system == "Darwin":  # macOS
                result = subprocess.run(['say', '--version'], 
                                      capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    status.available = True
                    status.test_passed = True
                    status.version = "macOS say command"
                    logger.info("✅ macOS 'say' command available")
                    
            elif system == "Linux":
                # Check for espeak or espeak-ng
                for cmd in ['espeak-ng', 'espeak']:
                    try:
                        result = subprocess.run([cmd, '--version'], 
                                              capture_output=True, text=True, timeout=5)
                        if result.returncode == 0:
                            status.available = True
                            status.test_passed = True
                            status.version = f"Linux {cmd}"
                            logger.info(f"✅ Linux '{cmd}' available")
                            break
                    except FileNotFoundError:
                        continue
                        
            elif system == "Windows":
                # Windows has built-in SAPI
                status.available = True
                status.test_passed = True
                status.version = "Windows SAPI"
                logger.info("✅ Windows SAPI available")
                
        except Exception as e:
            status.error = f"System TTS check failed: {str(e)}"
            logger.warning(f"⚠️ System TTS check failed: {e}")
            
        return status


class EdgeTTSEngine:
    """Enhanced Edge TTS engine implementation"""
    
    def __init__(self):
        self.engine_type = TTSEngine.EDGE
        self.is_initialized = False
        self.voices = []
        
    async def initialize(self) -> bool:
        """Initialize Edge TTS engine"""
        try:
            import edge_tts
            
            # Load available voices
            self.voices = await edge_tts.list_voices()
            self.is_initialized = True
            logger.info(f"✅ Edge TTS initialized with {len(self.voices)} voices")
            return True
            
        except Exception as e:
            logger.error(f"❌ Edge TTS initialization failed: {e}")
            return False
    
    async def synthesize(self, text: str, voice_id: str = "en-US-AriaNeural") -> TTSResponse:
        """Synthesize speech using Edge TTS"""
        start_time = datetime.now()
        
        try:
            import edge_tts
            
            # Create communicate instance
            communicate = edge_tts.Communicate(text, voice_id)
            
            # Generate audio data
            audio_data = b""
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_data += chunk["data"]
            
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            
            return TTSResponse(
                audio_data=audio_data,
                text=text,
                engine=TTSEngine.EDGE,
                quality=TTSQuality.HIGH,
                duration_ms=len(text) * 80,  # Rough estimate
                voice_id=voice_id,
                processing_time_ms=processing_time
            )
            
        except Exception as e:
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            logger.error(f"❌ Edge TTS synthesis failed: {e}")
            return TTSResponse(
                text=text,
                engine=TTSEngine.EDGE,
                quality=TTSQuality.FALLBACK,
                error=str(e),
                processing_time_ms=processing_time
            )


class CoquiTTSEngine:
    """Enhanced Coqui TTS engine implementation"""
    
    def __init__(self):
        self.engine_type = TTSEngine.COQUI
        self.is_initialized = False
        self.tts_model = None
        
    async def initialize(self) -> bool:
        """Initialize Coqui TTS engine"""
        try:
            from TTS.api import TTS
            
            # Use a lightweight model for initialization
            model_name = "tts_models/en/ljspeech/tacotron2-DDC"
            self.tts_model = TTS(model_name=model_name)
            
            self.is_initialized = True
            logger.info("✅ Coqui TTS initialized")
            return True
            
        except Exception as e:
            logger.error(f"❌ Coqui TTS initialization failed: {e}")
            return False
    
    async def synthesize(self, text: str, voice_id: str = "default") -> TTSResponse:
        """Synthesize speech using Coqui TTS"""
        start_time = datetime.now()
        
        try:
            if not self.tts_model:
                raise Exception("Coqui TTS not initialized")
            
            # Create temporary file for audio output
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
                tmp_path = tmp_file.name
            
            # Generate audio
            self.tts_model.tts_to_file(text=text, file_path=tmp_path)
            
            # Read audio data
            with open(tmp_path, 'rb') as f:
                audio_data = f.read()
            
            # Cleanup
            os.unlink(tmp_path)
            
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            
            return TTSResponse(
                audio_data=audio_data,
                text=text,
                engine=TTSEngine.COQUI,
                quality=TTSQuality.HIGH,
                duration_ms=len(text) * 90,  # Rough estimate
                voice_id=voice_id,
                processing_time_ms=processing_time
            )
            
        except Exception as e:
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            logger.error(f"❌ Coqui TTS synthesis failed: {e}")
            return TTSResponse(
                text=text,
                engine=TTSEngine.COQUI,
                quality=TTSQuality.FALLBACK,
                error=str(e),
                processing_time_ms=processing_time
            )


class SystemTTSEngine:
    """System TTS engine (pyttsx3 + system commands)"""
    
    def __init__(self):
        self.engine_type = TTSEngine.SYSTEM
        self.is_initialized = False
        self.pyttsx3_engine = None
        self.system_type = platform.system()
        
    async def initialize(self) -> bool:
        """Initialize system TTS engine"""
        try:
            # Try pyttsx3 first
            try:
                import pyttsx3
                self.pyttsx3_engine = pyttsx3.init()
                self.is_initialized = True
                logger.info("✅ System TTS initialized with pyttsx3")
                return True
            except Exception as pyttsx3_error:
                logger.warning(f"⚠️ pyttsx3 failed: {pyttsx3_error}")
            
            # Fall back to system commands
            if self.system_type in ["Darwin", "Linux", "Windows"]:
                self.is_initialized = True
                logger.info(f"✅ System TTS initialized with {self.system_type} commands")
                return True
                
        except Exception as e:
            logger.error(f"❌ System TTS initialization failed: {e}")
            
        return False
    
    async def synthesize(self, text: str, voice_id: str = "default") -> TTSResponse:
        """Synthesize speech using system TTS"""
        start_time = datetime.now()
        
        try:
            # Try pyttsx3 first if available
            if self.pyttsx3_engine:
                return await self._synthesize_pyttsx3(text, voice_id, start_time)
            else:
                return await self._synthesize_system_command(text, voice_id, start_time)
                
        except Exception as e:
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            logger.error(f"❌ System TTS synthesis failed: {e}")
            return TTSResponse(
                text=text,
                engine=TTSEngine.SYSTEM,
                quality=TTSQuality.FALLBACK,
                error=str(e),
                processing_time_ms=processing_time
            )
    
    async def _synthesize_pyttsx3(self, text: str, voice_id: str, start_time: datetime) -> TTSResponse:
        """Synthesize using pyttsx3"""
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
            tmp_path = tmp_file.name
        
        try:
            self.pyttsx3_engine.save_to_file(text, tmp_path)
            self.pyttsx3_engine.runAndWait()
            
            # Read audio data if file was created
            if os.path.exists(tmp_path) and os.path.getsize(tmp_path) > 0:
                with open(tmp_path, 'rb') as f:
                    audio_data = f.read()
            else:
                # pyttsx3 might not create file, return text-only response
                audio_data = None
            
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            
            return TTSResponse(
                audio_data=audio_data,
                text=text,
                engine=TTSEngine.PYTTSX3,
                quality=TTSQuality.MEDIUM if audio_data else TTSQuality.FALLBACK,
                duration_ms=len(text) * 100,
                voice_id=voice_id,
                processing_time_ms=processing_time,
                fallback_used=audio_data is None
            )
            
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
    
    async def _synthesize_system_command(self, text: str, voice_id: str, start_time: datetime) -> TTSResponse:
        """Synthesize using system commands"""
        try:
            if self.system_type == "Darwin":  # macOS
                # Use 'say' command to generate audio file
                with tempfile.NamedTemporaryFile(suffix='.aiff', delete=False) as tmp_file:
                    tmp_path = tmp_file.name
                
                subprocess.run(['say', '-o', tmp_path, text], check=True, timeout=30)
                
                with open(tmp_path, 'rb') as f:
                    audio_data = f.read()
                os.unlink(tmp_path)
                
            elif self.system_type == "Linux":
                # Use espeak to generate WAV file
                with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
                    tmp_path = tmp_file.name
                
                # Try espeak-ng first, then espeak
                for cmd in ['espeak-ng', 'espeak']:
                    try:
                        subprocess.run([cmd, '-w', tmp_path, text], check=True, timeout=30)
                        break
                    except FileNotFoundError:
                        continue
                
                with open(tmp_path, 'rb') as f:
                    audio_data = f.read()
                os.unlink(tmp_path)
                
            else:  # Windows or other
                # Return text-only response for unsupported systems
                audio_data = None
            
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            
            return TTSResponse(
                audio_data=audio_data,
                text=text,
                engine=TTSEngine.SYSTEM,
                quality=TTSQuality.MEDIUM if audio_data else TTSQuality.FALLBACK,
                duration_ms=len(text) * 120,
                voice_id=voice_id,
                processing_time_ms=processing_time,
                fallback_used=audio_data is None
            )
            
        except Exception as e:
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            return TTSResponse(
                text=text,
                engine=TTSEngine.SYSTEM,
                quality=TTSQuality.FALLBACK,
                error=str(e),
                processing_time_ms=processing_time,
                fallback_used=True
            )


class EnhancedTTSService:
    """
    Enhanced TTS Service with 3-Tier Fallback System
    
    Tier 1: Edge TTS (Primary) - High quality, free, reliable
    Tier 2: Coqui TTS (Secondary) - Local neural TTS
    Tier 3: System TTS (Fallback) - pyttsx3 or system commands
    """
    
    def __init__(self):
        self.is_initialized = False
        self.engines = {}
        self.engine_status = {}
        self.fallback_chain = [TTSEngine.EDGE, TTSEngine.COQUI, TTSEngine.SYSTEM]
        self.stats = {
            "total_requests": 0,
            "successful_syntheses": 0,
            "fallback_uses": 0,
            "engine_usage": {engine.value: 0 for engine in TTSEngine},
            "average_processing_time": 0.0
        }
        
    async def initialize(self) -> bool:
        """Initialize TTS service with all available engines"""
        logger.info("🎙️ Initializing Enhanced TTS Service with 3-tier fallback...")
        
        # Check dependencies first
        dependency_status = {
            TTSEngine.EDGE: DependencyChecker.check_edge_tts(),
            TTSEngine.COQUI: DependencyChecker.check_coqui_tts(),
            TTSEngine.PYTTSX3: DependencyChecker.check_pyttsx3(),
            TTSEngine.SYSTEM: DependencyChecker.check_system_tts()
        }
        
        self.engine_status = dependency_status
        
        # Initialize available engines
        initialized_engines = []
        
        # Tier 1: Edge TTS
        if dependency_status[TTSEngine.EDGE].available:
            try:
                edge_engine = EdgeTTSEngine()
                if await edge_engine.initialize():
                    self.engines[TTSEngine.EDGE] = edge_engine
                    initialized_engines.append(TTSEngine.EDGE)
                    logger.info("✅ Tier 1: Edge TTS initialized")
            except Exception as e:
                logger.warning(f"⚠️ Edge TTS initialization failed: {e}")
        
        # Tier 2: Coqui TTS (only if Edge TTS failed or for specific use cases)
        if dependency_status[TTSEngine.COQUI].available:
            try:
                coqui_engine = CoquiTTSEngine()
                if await coqui_engine.initialize():
                    self.engines[TTSEngine.COQUI] = coqui_engine
                    initialized_engines.append(TTSEngine.COQUI)
                    logger.info("✅ Tier 2: Coqui TTS initialized")
            except Exception as e:
                logger.warning(f"⚠️ Coqui TTS initialization failed: {e}")
        
        # Tier 3: System TTS (always try to initialize as fallback)
        if dependency_status[TTSEngine.PYTTSX3].available or dependency_status[TTSEngine.SYSTEM].available:
            try:
                system_engine = SystemTTSEngine()
                if await system_engine.initialize():
                    self.engines[TTSEngine.SYSTEM] = system_engine
                    initialized_engines.append(TTSEngine.SYSTEM)
                    logger.info("✅ Tier 3: System TTS initialized")
            except Exception as e:
                logger.warning(f"⚠️ System TTS initialization failed: {e}")
        
        # Update initialization status
        self.is_initialized = len(initialized_engines) > 0
        
        if self.is_initialized:
            logger.info(f"🎉 Enhanced TTS Service initialized with {len(initialized_engines)} engines: "
                       f"{[engine.value for engine in initialized_engines]}")
            
            # Log the fallback chain
            available_chain = [engine for engine in self.fallback_chain if engine in self.engines]
            logger.info(f"🔄 Fallback chain: {' → '.join([engine.value for engine in available_chain])}")
        else:
            logger.error("❌ No TTS engines could be initialized")
            
        return self.is_initialized
    
    async def synthesize(
        self,
        text: str,
        voice_id: Optional[str] = None,
        preferred_engine: Optional[TTSEngine] = None,
        max_retries: int = 3
    ) -> TTSResponse:
        """
        Synthesize speech with automatic fallback
        
        Args:
            text: Text to synthesize
            voice_id: Voice ID (engine-specific)
            preferred_engine: Preferred engine to try first
            max_retries: Maximum number of fallback attempts
        """
        self.stats["total_requests"] += 1
        
        if not self.is_initialized:
            logger.error("❌ TTS Service not initialized")
            return TTSResponse(
                text=text,
                engine=TTSEngine.DISABLED,
                quality=TTSQuality.FALLBACK,
                error="TTS Service not initialized"
            )
        
        # Determine engine order
        if preferred_engine and preferred_engine in self.engines:
            engine_order = [preferred_engine] + [e for e in self.fallback_chain if e != preferred_engine and e in self.engines]
        else:
            engine_order = [e for e in self.fallback_chain if e in self.engines]
        
        logger.info(f"🎯 TTS request for: '{text[:50]}...' using chain: {[e.value for e in engine_order]}")
        
        # Try each engine in order
        last_error = None
        for i, engine_type in enumerate(engine_order):
            if i >= max_retries:
                break
                
            try:
                engine = self.engines[engine_type]
                response = await engine.synthesize(text, voice_id or "default")
                
                # Update stats
                self.stats["engine_usage"][engine_type.value] += 1
                if response.processing_time_ms > 0:
                    self._update_average_processing_time(response.processing_time_ms)
                
                if response.audio_data or response.error is None:
                    self.stats["successful_syntheses"] += 1
                    if i > 0:  # Used fallback
                        response.fallback_used = True
                        self.stats["fallback_uses"] += 1
                        logger.info(f"✅ TTS fallback success with {engine_type.value}")
                    else:
                        logger.info(f"✅ TTS primary success with {engine_type.value}")
                    
                    return response
                else:
                    last_error = response.error
                    logger.warning(f"⚠️ {engine_type.value} TTS failed: {response.error}")
                    
            except Exception as e:
                last_error = str(e)
                logger.error(f"❌ {engine_type.value} TTS exception: {e}")
                continue
        
        # All engines failed
        logger.error(f"❌ All TTS engines failed for text: '{text[:50]}...'")
        return TTSResponse(
            text=text,
            engine=TTSEngine.DISABLED,
            quality=TTSQuality.FALLBACK,
            error=f"All TTS engines failed. Last error: {last_error}",
            fallback_used=True
        )
    
    def _update_average_processing_time(self, new_time: float):
        """Update running average of processing time"""
        if self.stats["average_processing_time"] == 0:
            self.stats["average_processing_time"] = new_time
        else:
            # Simple moving average
            self.stats["average_processing_time"] = (
                self.stats["average_processing_time"] * 0.9 + new_time * 0.1
            )
    
    async def get_service_status(self) -> Dict[str, Any]:
        """Get comprehensive service status"""
        return {
            "is_initialized": self.is_initialized,
            "engines": {
                engine_type.value: {
                    "available": engine_type in self.engines,
                    "status": asdict(self.engine_status.get(engine_type, TTSEngineStatus(
                        engine=engine_type, available=False, initialized=False
                    )))
                }
                for engine_type in TTSEngine if engine_type != TTSEngine.DISABLED
            },
            "fallback_chain": [e.value for e in self.fallback_chain if e in self.engines],
            "stats": self.stats,
            "health": await self._perform_health_check()
        }
    
    async def _perform_health_check(self) -> Dict[str, Any]:
        """Perform health check on all engines"""
        health_results = {}
        
        for engine_type, engine in self.engines.items():
            try:
                # Test with a simple phrase
                test_text = "Hello, this is a test."
                start_time = datetime.now()
                result = await engine.synthesize(test_text)
                duration = (datetime.now() - start_time).total_seconds() * 1000
                
                health_results[engine_type.value] = {
                    "healthy": result.error is None,
                    "response_time_ms": duration,
                    "has_audio": result.audio_data is not None,
                    "error": result.error
                }
                
            except Exception as e:
                health_results[engine_type.value] = {
                    "healthy": False,
                    "error": str(e),
                    "response_time_ms": 0,
                    "has_audio": False
                }
        
        return health_results
    
    async def get_available_voices(self) -> Dict[str, List[Dict[str, Any]]]:
        """Get available voices from all engines"""
        voices = {}
        
        for engine_type, engine in self.engines.items():
            try:
                if hasattr(engine, 'voices') and engine.voices:
                    voices[engine_type.value] = [
                        {
                            "id": voice.get("ShortName", voice.get("Name", "unknown")),
                            "name": voice.get("DisplayName", voice.get("Name", "Unknown")),
                            "language": voice.get("Locale", "en-US"),
                            "gender": voice.get("Gender", "Unknown")
                        }
                        for voice in engine.voices[:10]  # Limit to first 10
                    ]
                else:
                    voices[engine_type.value] = [
                        {"id": "default", "name": "Default Voice", "language": "en-US", "gender": "Unknown"}
                    ]
            except Exception as e:
                logger.warning(f"⚠️ Could not get voices for {engine_type.value}: {e}")
                voices[engine_type.value] = []
        
        return voices


# Global service instance
enhanced_tts_service = EnhancedTTSService()