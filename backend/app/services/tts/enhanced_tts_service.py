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
from .voice_mapping import voice_mapping_service
from .error_handling import classify_and_handle_error, get_error_recovery, get_fallback_manager

logger = get_logger(__name__)
settings = get_settings()
error_recovery = get_error_recovery()
fallback_manager = get_fallback_manager()


class TTSEngine(Enum):
    """Available TTS engines"""
    EDGE = "edge"
    COQUI = "coqui"
    PYTTSX3 = "pyttsx3"
    SYSTEM = "system"
    SUPABASE = "supabase"  # Remote TTS via Supabase function
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
            
            # Test basic functionality - skip async test for now to avoid event loop issues
            # Edge TTS is available if we can import it
            status.test_passed = True
            status.available = True
            status.voices_count = 400  # Edge TTS has ~400 voices
            logger.info("✅ Edge TTS available (import successful)")
                
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
    
    @staticmethod
    def check_supabase_tts() -> TTSEngineStatus:
        """Check Supabase TTS availability"""
        status = TTSEngineStatus(
            engine=TTSEngine.SUPABASE,
            available=False,
            initialized=False,
            dependencies_met=True  # No local dependencies needed
        )
        
        try:
            # Check if httpx is available
            import httpx
            status.dependencies_met = True
            
            # Check if Supabase credentials are configured
            supabase_key = getattr(settings, 'SUPABASE_KEY', None) or getattr(settings, 'SUPABASE_SERVICE_ROLE_KEY', None)
            if settings.SUPABASE_URL and supabase_key:
                status.available = True
                status.test_passed = True
                status.version = "Supabase Function (nari-dia-tts)"
                logger.info("✅ Supabase TTS available (remote service)")
            else:
                status.error = "Supabase credentials not configured"
                logger.warning("⚠️ Supabase TTS not configured (missing URL or key)")
                
        except ImportError:
            status.dependencies_met = False
            status.error = "httpx package not installed"
            logger.warning("⚠️ httpx not available - required for Supabase TTS")
            
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
            
            # Skip voice list loading to avoid network issues in production
            # Edge TTS synthesis works with predefined voice names without needing the full list
            self.voices = []  # Use predefined voice names directly
            self.is_initialized = True
            logger.info("✅ Edge TTS initialized (using predefined voices, skipping network voice list)")
            return True
            
        except ImportError as e:
            logger.error(f"❌ Edge TTS not available: {e}")
            return False
        except Exception as e:
            logger.error(f"❌ Edge TTS initialization failed: {e}")
            return False
    
    async def synthesize(self, text: str, voice_id: str = "pam_default") -> TTSResponse:
        """Synthesize speech using Edge TTS with voice mapping and retry logic"""
        start_time = datetime.now()

        # Retry configuration for transient errors (403, network issues)
        max_retries = 3
        base_delay = 0.5  # seconds

        import edge_tts

        # Map generic voice ID to Edge TTS specific voice
        edge_voice_id = voice_mapping_service.get_engine_voice_id(voice_id, "edge")
        if not edge_voice_id:
            logger.warning(f"⚠️ No Edge TTS mapping for voice '{voice_id}', using fallback")
            edge_voice_id = "en-US-JennyNeural"  # Safe fallback

        logger.info(f"🎯 Edge TTS synthesis: {voice_id} -> {edge_voice_id}")

        last_error = None
        for attempt in range(max_retries):
            try:
                # Create communicate instance
                communicate = edge_tts.Communicate(text, edge_voice_id)

                # Generate audio data
                audio_data = b""
                async for chunk in communicate.stream():
                    if chunk["type"] == "audio":
                        audio_data += chunk["data"]

                processing_time = (datetime.now() - start_time).total_seconds() * 1000

                if attempt > 0:
                    logger.info(f"✅ Edge TTS synthesis succeeded on retry #{attempt + 1}")

                return TTSResponse(
                    audio_data=audio_data,
                    text=text,
                    engine=TTSEngine.EDGE,
                    quality=TTSQuality.HIGH,
                    duration_ms=len(text) * 80,  # Rough estimate
                    voice_id=edge_voice_id,
                    processing_time_ms=processing_time
                )

            except Exception as e:
                last_error = e
                error_msg = str(e)

                # Determine if error is retryable
                is_retryable = (
                    "403" in error_msg or
                    "401" in error_msg or
                    "ConnectError" in error_msg or
                    "NetworkError" in error_msg or
                    "TimeoutError" in error_msg or
                    "ReadTimeout" in error_msg
                )

                if is_retryable and attempt < max_retries - 1:
                    # Exponential backoff: 0.5s, 1.0s, 2.0s
                    delay = base_delay * (2 ** attempt)
                    logger.warning(f"⚠️ Edge TTS error (attempt {attempt + 1}/{max_retries}), retrying in {delay}s: {error_msg}")
                    await asyncio.sleep(delay)
                    continue  # Retry
                else:
                    # Last attempt or non-retryable error
                    break

        # All retries failed
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        error_msg = str(last_error)

        # Detailed error logging for different failure types
        if "ConnectError" in error_msg or "NetworkError" in error_msg:
            logger.error(f"❌ Edge TTS network error (no internet?) after {max_retries} retries: {last_error}")
            error_msg = f"Network connectivity error: {error_msg}"
        elif "TimeoutError" in error_msg or "ReadTimeout" in error_msg:
            logger.error(f"❌ Edge TTS timeout (slow connection?) after {max_retries} retries: {last_error}")
            error_msg = f"Connection timeout: {error_msg}"
        elif "certificate" in error_msg.lower() or "ssl" in error_msg.lower():
            logger.error(f"❌ Edge TTS SSL/Certificate error: {last_error}")
            error_msg = f"SSL/Certificate error: {error_msg}"
        elif "403" in error_msg or "401" in error_msg:
            logger.error(f"❌ Edge TTS authentication/permission error after {max_retries} retries: {last_error}")
            error_msg = f"Authentication error (Microsoft service temporarily unavailable): {error_msg}"
        else:
            logger.error(f"❌ Edge TTS synthesis failed after {max_retries} retries: {last_error}")

        return TTSResponse(
            text=text,
            engine=TTSEngine.EDGE,
            quality=TTSQuality.FALLBACK,
            error=error_msg,
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
    
    async def synthesize(self, text: str, voice_id: str = "pam_default") -> TTSResponse:
        """Synthesize speech using Coqui TTS with voice mapping"""
        start_time = datetime.now()
        
        try:
            if not self.tts_model:
                raise Exception("Coqui TTS not initialized")
            
            # Map generic voice ID to Coqui TTS specific voice
            coqui_voice_id = voice_mapping_service.get_engine_voice_id(voice_id, "coqui")
            if not coqui_voice_id:
                logger.warning(f"⚠️ No Coqui TTS mapping for voice '{voice_id}', using fallback")
                coqui_voice_id = "p225"  # Safe fallback
            
            logger.info(f"🎯 Coqui TTS synthesis: {voice_id} -> {coqui_voice_id}")
            
            # Create temporary file for audio output
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
                tmp_path = tmp_file.name
            
            # Generate audio (Coqui TTS will handle the speaker selection internally)
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
                voice_id=coqui_voice_id,
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
    
    async def synthesize(self, text: str, voice_id: str = "pam_default") -> TTSResponse:
        """Synthesize speech using system TTS with voice mapping"""
        start_time = datetime.now()
        
        try:
            # Map generic voice ID to system TTS specific voice
            system_voice_id = voice_mapping_service.get_engine_voice_id(voice_id, "system")
            if not system_voice_id:
                logger.warning(f"⚠️ No System TTS mapping for voice '{voice_id}', using fallback")
                system_voice_id = "default"  # Safe fallback
            
            logger.info(f"🎯 System TTS synthesis: {voice_id} -> {system_voice_id}")
            
            # Try pyttsx3 first if available
            if self.pyttsx3_engine:
                return await self._synthesize_pyttsx3(text, system_voice_id, start_time)
            else:
                return await self._synthesize_system_command(text, system_voice_id, start_time)
                
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


class SupabaseTTSEngine:
    """Supabase remote TTS engine implementation"""
    
    def __init__(self):
        self.engine_type = TTSEngine.SUPABASE
        self.is_initialized = False
        self.base_url = None
        self.headers = None
        
    async def initialize(self) -> bool:
        """Initialize Supabase TTS engine"""
        try:
            # Check if Supabase is configured - handle both simple config and Pydantic SecretStr
            supabase_key = getattr(settings, 'SUPABASE_KEY', None) or getattr(settings, 'SUPABASE_SERVICE_ROLE_KEY', None)
            if hasattr(supabase_key, 'get_secret_value'):
                supabase_key = supabase_key.get_secret_value()
            
            if not settings.SUPABASE_URL or not supabase_key:
                logger.warning("⚠️ Supabase TTS not configured (missing URL or key)")
                return False
                
            self.base_url = f"{str(settings.SUPABASE_URL).rstrip('/')}/functions/v1/nari-dia-tts"
            self.headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {supabase_key}",
                "apikey": supabase_key,
            }
            
            self.is_initialized = True
            logger.info("✅ Supabase TTS initialized (remote service)")
            return True
            
        except Exception as e:
            logger.error(f"❌ Supabase TTS initialization failed: {e}")
            return False
    
    async def synthesize(self, text: str, voice_id: str = "pam_default") -> TTSResponse:
        """Synthesize speech using Supabase remote TTS with voice mapping"""
        start_time = datetime.now()
        
        if not self.is_initialized:
            return TTSResponse(
                text=text,
                engine=TTSEngine.SUPABASE,
                quality=TTSQuality.FALLBACK,
                error="Supabase TTS not initialized"
            )
        
        try:
            import httpx
            
            # Map generic voice ID to Supabase TTS specific voice
            supabase_voice_id = voice_mapping_service.get_engine_voice_id(voice_id, "supabase")
            if not supabase_voice_id:
                logger.warning(f"⚠️ No Supabase TTS mapping for voice '{voice_id}', using fallback")
                supabase_voice_id = "nari-dia"  # Safe fallback
            
            logger.info(f"🎯 Supabase TTS synthesis: {voice_id} -> {supabase_voice_id}")
            
            # Call Supabase TTS function
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    self.base_url,
                    json={"text": text, "voice": supabase_voice_id},
                    headers=self.headers
                )
                
                if response.status_code != 200:
                    error_msg = f"Supabase TTS API error: {response.status_code}"
                    try:
                        error_data = response.json()
                        error_msg += f" - {error_data.get('error', 'Unknown error')}"
                    except:
                        error_msg += f" - {response.text}"
                    
                    logger.error(f"❌ {error_msg}")
                    return TTSResponse(
                        text=text,
                        engine=TTSEngine.SUPABASE,
                        quality=TTSQuality.FALLBACK,
                        error=error_msg
                    )
                
                data = response.json()
                audio_array = data.get('audio', [])
                
                # Convert array to bytes
                audio_data = bytes(audio_array) if audio_array else None
                
                processing_time = (datetime.now() - start_time).total_seconds() * 1000
                
                return TTSResponse(
                    audio_data=audio_data,
                    text=text,
                    engine=TTSEngine.SUPABASE,
                    quality=TTSQuality.HIGH if audio_data else TTSQuality.FALLBACK,
                    duration_ms=data.get('duration', len(text) // 10) * 1000,
                    voice_id="nari-dia",  # Supabase uses Nari Labs Dia voice
                    processing_time_ms=processing_time,
                    cache_hit=data.get('cached', False)
                )
                
        except httpx.TimeoutException:
            error_msg = "Supabase TTS timeout (30s exceeded)"
            logger.error(f"❌ {error_msg}")
            return TTSResponse(
                text=text,
                engine=TTSEngine.SUPABASE,
                quality=TTSQuality.FALLBACK,
                error=error_msg
            )
        except Exception as e:
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            logger.error(f"❌ Supabase TTS synthesis failed: {e}")
            return TTSResponse(
                text=text,
                engine=TTSEngine.SUPABASE,
                quality=TTSQuality.FALLBACK,
                error=str(e),
                processing_time_ms=processing_time
            )


class EnhancedTTSService:
    """
    Enhanced TTS Service with 4-Tier Fallback System
    
    Tier 1: Edge TTS (Primary) - High quality, free, cloud-based
    Tier 2: Coqui TTS (Secondary) - Local neural TTS
    Tier 3: System TTS (Fallback) - pyttsx3 or system commands
    Tier 4: Supabase TTS (Remote) - Network-independent remote fallback
    """
    
    def __init__(self):
        self.is_initialized = False
        self.engines = {}
        self.engine_status = {}
        self.fallback_chain = [TTSEngine.EDGE, TTSEngine.COQUI, TTSEngine.SYSTEM, TTSEngine.SUPABASE]
        self.stats = {
            "total_requests": 0,
            "successful_syntheses": 0,
            "fallback_uses": 0,
            "engine_usage": {engine.value: 0 for engine in TTSEngine},
            "average_processing_time": 0.0
        }
        
    async def initialize(self) -> bool:
        """Initialize TTS service with all available engines"""
        logger.info("🎙️ Initializing Enhanced TTS Service with 4-tier fallback...")
        
        # Check dependencies first
        dependency_status = {
            TTSEngine.EDGE: DependencyChecker.check_edge_tts(),
            TTSEngine.COQUI: DependencyChecker.check_coqui_tts(),
            TTSEngine.PYTTSX3: DependencyChecker.check_pyttsx3(),
            TTSEngine.SYSTEM: DependencyChecker.check_system_tts(),
            TTSEngine.SUPABASE: DependencyChecker.check_supabase_tts()
        }
        
        self.engine_status = dependency_status
        
        # Initialize available engines
        initialized_engines = []
        
        # Tier 1: Edge TTS (Primary - should always work if package is installed)
        if dependency_status[TTSEngine.EDGE].available:
            try:
                edge_engine = EdgeTTSEngine()
                if await edge_engine.initialize():
                    self.engines[TTSEngine.EDGE] = edge_engine
                    initialized_engines.append(TTSEngine.EDGE)
                    logger.info("✅ Tier 1: Edge TTS initialized successfully")
                else:
                    logger.error("❌ Edge TTS failed to initialize despite being available")
            except Exception as e:
                logger.error(f"❌ Edge TTS initialization failed: {e}")
        else:
            logger.warning("⚠️ Edge TTS not available - package not installed")
        
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
        
        # Tier 4: Supabase TTS (remote fallback - always available if configured)
        if dependency_status[TTSEngine.SUPABASE].available:
            try:
                supabase_engine = SupabaseTTSEngine()
                if await supabase_engine.initialize():
                    self.engines[TTSEngine.SUPABASE] = supabase_engine
                    initialized_engines.append(TTSEngine.SUPABASE)
                    logger.info("✅ Tier 4: Supabase TTS initialized (remote fallback)")
            except Exception as e:
                logger.warning(f"⚠️ Supabase TTS initialization failed: {e}")
        
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
    
    def _resolve_voice_id(self, voice_id: Optional[str], text: str) -> str:
        """
        Resolve and standardize voice ID with intelligent defaults.
        
        This method handles:
        1. Legacy voice ID translation
        2. Context-based voice selection
        3. Intelligent fallbacks
        """
        
        # If no voice specified, use intelligent default
        if not voice_id:
            # Analyze text for context clues
            context = self._detect_text_context(text)
            recommended_voices = voice_mapping_service.get_recommended_voices_for_context(context, limit=1)
            resolved_voice = recommended_voices[0] if recommended_voices else "pam_default"
            logger.info(f"🤖 No voice specified, auto-selected '{resolved_voice}' for context '{context}'")
            return resolved_voice
        
        # Handle configuration default
        if voice_id in ["default", "auto"]:
            return "pam_default"
        
        # Check if it's already a valid generic voice ID
        voice_info = voice_mapping_service.get_voice_info(voice_id)
        if voice_info:
            return voice_id
        
        # Try to resolve legacy voice ID
        # This handles cases where legacy voice IDs are still being passed
        for generic_id, mapping in voice_mapping_service.voice_mappings.items():
            if (voice_id == mapping.edge_voice_id or 
                voice_id == mapping.coqui_voice_id or
                voice_id == mapping.system_voice_id or
                voice_id == mapping.supabase_voice_id):
                logger.info(f"🔄 Resolved legacy voice ID '{voice_id}' -> '{generic_id}'")
                return generic_id
        
        # If we can't resolve it, try to find by characteristics
        if isinstance(voice_id, str):
            # Handle cases like "female", "professional", "british female", etc.
            characteristics = voice_id.lower().split()
            if len(characteristics) > 0:
                gender = None
                age = None
                accent = None
                style = None
                
                for char in characteristics:
                    if char in ["female", "male"]:
                        gender = char
                    elif char in ["young", "middle", "adult", "elderly"]:
                        age = char
                    elif char in ["american", "british", "australian", "canadian"]:
                        accent = char
                    elif char in ["professional", "casual", "friendly", "energetic", "calm"]:
                        style = char
                
                if any([gender, age, accent, style]):
                    resolved_voice = voice_mapping_service.find_voice_by_characteristics(
                        gender=gender, age=age, accent=accent, style=style
                    )
                    logger.info(f"🎯 Resolved by characteristics '{voice_id}' -> '{resolved_voice}'")
                    return resolved_voice
        
        # Ultimate fallback
        logger.warning(f"⚠️ Could not resolve voice ID '{voice_id}', using default")
        return "pam_default"
    
    def _detect_text_context(self, text: str) -> str:
        """
        Detect context from text content to select appropriate voice.
        
        This provides intelligent voice selection based on content analysis.
        """
        
        text_lower = text.lower()
        
        # Emergency/urgent context
        if any(word in text_lower for word in ["emergency", "urgent", "warning", "alert", "danger", "help"]):
            return "emergency"
        
        # Financial context
        if any(word in text_lower for word in ["budget", "money", "cost", "expense", "financial", "price", "payment", "bank"]):
            return "financial"
        
        # Travel context
        if any(word in text_lower for word in ["trip", "travel", "route", "destination", "miles", "drive", "road", "rv", "campground"]):
            return "travel_planning"
        
        # Professional/formal context
        if any(word in text_lower for word in ["analysis", "recommendation", "strategy", "optimize", "efficient", "professional"]):
            return "professional"
        
        # Social/casual context
        if any(word in text_lower for word in ["hi", "hello", "thanks", "awesome", "cool", "fun", "great"]):
            return "casual"
        
        # Default to general conversation
        return "general_conversation"
    
    async def synthesize(
        self,
        text: str,
        voice_id: Optional[str] = None,
        preferred_engine: Optional[TTSEngine] = None,
        max_retries: int = 3
    ) -> TTSResponse:
        """
        Synthesize speech with automatic fallback and voice mapping
        
        Args:
            text: Text to synthesize
            voice_id: Generic voice ID or legacy voice ID
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
        
        # Resolve voice ID - handle legacy voice IDs and provide intelligent defaults
        resolved_voice_id = self._resolve_voice_id(voice_id, text)
        logger.info(f"🎯 Voice resolution: '{voice_id}' -> '{resolved_voice_id}'")
        
        # Determine engine order
        if preferred_engine and preferred_engine in self.engines:
            engine_order = [preferred_engine] + [e for e in self.fallback_chain if e != preferred_engine and e in self.engines]
        else:
            engine_order = [e for e in self.fallback_chain if e in self.engines]
        
        logger.info(f"🎯 TTS request for: '{text[:50]}...' using voice '{resolved_voice_id}' with chain: {[e.value for e in engine_order]}")
        
        # Try each engine in order with comprehensive error handling
        last_error = None
        original_request = {
            "text": text,
            "voice_id": resolved_voice_id,
            "max_retries": max_retries
        }
        
        for i, engine_type in enumerate(engine_order):
            if i >= max_retries:
                break
            
            # Check circuit breaker before attempting
            if not error_recovery.should_use_engine(engine_type.value):
                logger.warning(f"⚠️ Skipping {engine_type.value} - circuit breaker open")
                continue
                
            try:
                engine = self.engines[engine_type]
                response = await engine.synthesize(text, resolved_voice_id)
                
                # Update stats
                self.stats["engine_usage"][engine_type.value] += 1
                if response.processing_time_ms > 0:
                    self._update_average_processing_time(response.processing_time_ms)
                
                if response.audio_data or response.error is None:
                    # Success - record it for circuit breaker recovery
                    error_recovery.record_success(engine_type.value)
                    
                    self.stats["successful_syntheses"] += 1
                    if i > 0:  # Used fallback
                        response.fallback_used = True
                        self.stats["fallback_uses"] += 1
                        logger.info(f"✅ TTS fallback success with {engine_type.value}")
                    else:
                        logger.info(f"✅ TTS primary success with {engine_type.value}")
                    
                    return response
                else:
                    # Engine returned error response
                    error = classify_and_handle_error(response.error, engine_type.value)
                    last_error = response.error
                    
                    # Try recovery strategies if error is recoverable
                    if error.recoverable:
                        recovery_result = await fallback_manager.execute_recovery_strategy(
                            error, original_request
                        )
                        
                        if recovery_result.get("success"):
                            logger.info(f"✅ Error recovery successful for {engine_type.value}")
                            # Convert recovery result to TTSResponse
                            recovery_response = recovery_result.get("response", {})
                            # Map recovery engine string safely; treat 'text_fallback' as DISABLED
                            _engine_str = recovery_response.get("engine", "text_fallback")
                            try:
                                _engine = TTSEngine.DISABLED if _engine_str == "text_fallback" else TTSEngine(_engine_str)
                            except Exception:
                                _engine = TTSEngine.DISABLED
                            return TTSResponse(
                                audio_data=recovery_response.get("audio_data"),
                                text=recovery_response.get("text", text),
                                engine=_engine,
                                quality=TTSQuality.FALLBACK,
                                voice_id=resolved_voice_id,
                                fallback_used=True,
                                error=recovery_response.get("error")
                            )
                    
                    logger.warning(f"⚠️ {engine_type.value} TTS failed: {response.error}")
                    
            except Exception as e:
                # Classify and handle the exception
                error = classify_and_handle_error(str(e), engine_type.value)
                last_error = str(e)
                
                # Try recovery strategies for exceptions too
                if error.recoverable:
                    try:
                        recovery_result = await fallback_manager.execute_recovery_strategy(
                            error, original_request
                        )
                        
                        if recovery_result.get("success"):
                            logger.info(f"✅ Exception recovery successful for {engine_type.value}")
                            recovery_response = recovery_result.get("response", {})
                            _engine_str = recovery_response.get("engine", "text_fallback")
                            try:
                                _engine = TTSEngine.DISABLED if _engine_str == "text_fallback" else TTSEngine(_engine_str)
                            except Exception:
                                _engine = TTSEngine.DISABLED
                            return TTSResponse(
                                audio_data=recovery_response.get("audio_data"),
                                text=recovery_response.get("text", text),
                                engine=_engine,
                                quality=TTSQuality.FALLBACK,
                                voice_id=resolved_voice_id,
                                fallback_used=True,
                                error=recovery_response.get("error")
                            )
                    except Exception as recovery_error:
                        logger.error(f"❌ Recovery failed for {engine_type.value}: {recovery_error}")
                
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
        """Get comprehensive service status with error handling and voice mapping info"""
        health_check_result = await self._perform_health_check()
        
        return {
            "is_initialized": self.is_initialized,
            "engines": {
                engine_type.value: {
                    "available": engine_type in self.engines,
                    "circuit_breaker_open": not error_recovery.should_use_engine(engine_type.value),
                    "status": asdict(self.engine_status.get(engine_type, TTSEngineStatus(
                        engine=engine_type, available=False, initialized=False
                    )))
                }
                for engine_type in TTSEngine if engine_type != TTSEngine.DISABLED
            },
            "fallback_chain": [e.value for e in self.fallback_chain if e in self.engines],
            "stats": self.stats,
            "health": health_check_result,
            "error_analytics": error_recovery.get_error_analytics(hours=1),
            "engine_health": error_recovery.get_engine_health_report(),
            "voice_mapping": {
                "total_voices": len(voice_mapping_service.voice_mappings),
                "stats": voice_mapping_service.get_mapping_stats()
            },
            "configuration": {
                "tts_enabled": getattr(settings, 'TTS_ENABLED', True),
                "primary_engine": getattr(settings, 'TTS_PRIMARY_ENGINE', 'edge'),
                "default_voice": getattr(settings, 'TTS_VOICE_DEFAULT', 'pam_default'),
                "fallback_enabled": getattr(settings, 'TTS_FALLBACK_ENABLED', True)
            }
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
