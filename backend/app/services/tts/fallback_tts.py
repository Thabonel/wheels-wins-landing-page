"""
Fallback TTS Service - Works without external dependencies
Provides basic TTS functionality using system tools or simple alternatives
"""

import asyncio
import platform
import subprocess
import tempfile
import os
from typing import Optional, Dict, Any

from app.core.logging import get_logger

logger = get_logger(__name__)


class FallbackTTSService:
    """
    Simple TTS service that works without complex dependencies
    Uses system TTS when available, otherwise provides text-only responses
    """
    
    def __init__(self):
        self.is_initialized = False
        self.available_engines = []
        
    async def initialize(self) -> bool:
        """Initialize fallback TTS with available system tools"""
        try:
            # Check for system TTS capabilities
            system = platform.system()
            
            if system == "Darwin":  # macOS
                # Test if 'say' command is available
                try:
                    result = subprocess.run(['say', '--version'], 
                                          capture_output=True, 
                                          text=True, 
                                          timeout=5)
                    if result.returncode == 0:
                        self.available_engines.append("macos_say")
                        logger.info("✅ macOS 'say' command available")
                except:
                    pass
                    
            elif system == "Linux":
                # Test if espeak is available
                try:
                    result = subprocess.run(['espeak', '--version'], 
                                          capture_output=True, 
                                          text=True, 
                                          timeout=5)
                    if result.returncode == 0:
                        self.available_engines.append("espeak")
                        logger.info("✅ espeak command available")
                except:
                    pass
                    
            elif system == "Windows":
                # Windows has built-in PowerShell TTS
                self.available_engines.append("powershell_tts")
                logger.info("✅ Windows PowerShell TTS available")
            
            # Always add text-only fallback
            self.available_engines.append("text_only")
            
            self.is_initialized = True
            logger.info(f"✅ Fallback TTS initialized with engines: {self.available_engines}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Fallback TTS initialization failed: {e}")
            # Even if everything fails, we can still provide text responses
            self.available_engines = ["text_only"]
            self.is_initialized = True
            return True
    
    async def synthesize_speech(self, text: str, user_id: str = None) -> Optional[Dict[str, Any]]:
        """
        Synthesize speech using available system tools
        Returns audio data or text-only response
        """
        if not self.is_initialized:
            await self.initialize()
            
        try:
            # Try system TTS first
            if "macos_say" in self.available_engines:
                return await self._synthesize_macos(text)
            elif "espeak" in self.available_engines:
                return await self._synthesize_espeak(text)
            elif "powershell_tts" in self.available_engines:
                return await self._synthesize_windows(text)
            else:
                # Fallback to text-only response
                return self._synthesize_text_only(text)
                
        except Exception as e:
            logger.warning(f"⚠️ TTS synthesis failed, using text fallback: {e}")
            return self._synthesize_text_only(text)
    
    async def _synthesize_macos(self, text: str) -> Dict[str, Any]:
        """Use macOS 'say' command to generate speech"""
        try:
            with tempfile.NamedTemporaryFile(suffix=".aiff", delete=False) as temp_file:
                temp_path = temp_file.name
                
            # Use 'say' command to generate audio file
            process = await asyncio.create_subprocess_exec(
                'say', text, '-o', temp_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=30)
            
            if process.returncode == 0 and os.path.exists(temp_path):
                # Read the generated audio file
                with open(temp_path, 'rb') as f:
                    audio_data = f.read()
                
                # Clean up temp file
                os.unlink(temp_path)
                
                return {
                    "audio_data": audio_data,
                    "format": "aiff",
                    "duration": len(text) / 15,  # Rough estimate
                    "engine": "macos_say",
                    "success": True
                }
            else:
                logger.warning(f"⚠️ macOS say command failed: {stderr.decode()}")
                return self._synthesize_text_only(text)
                
        except Exception as e:
            logger.warning(f"⚠️ macOS TTS failed: {e}")
            return self._synthesize_text_only(text)
    
    async def _synthesize_espeak(self, text: str) -> Dict[str, Any]:
        """Use espeak to generate speech"""
        try:
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                temp_path = temp_file.name
                
            # Use espeak to generate audio file
            process = await asyncio.create_subprocess_exec(
                'espeak', text, '-w', temp_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=30)
            
            if process.returncode == 0 and os.path.exists(temp_path):
                with open(temp_path, 'rb') as f:
                    audio_data = f.read()
                
                os.unlink(temp_path)
                
                return {
                    "audio_data": audio_data,
                    "format": "wav",
                    "duration": len(text) / 15,
                    "engine": "espeak",
                    "success": True
                }
            else:
                return self._synthesize_text_only(text)
                
        except Exception as e:
            logger.warning(f"⚠️ espeak TTS failed: {e}")
            return self._synthesize_text_only(text)
    
    async def _synthesize_windows(self, text: str) -> Dict[str, Any]:
        """Use Windows PowerShell TTS"""
        try:
            # PowerShell command for TTS
            ps_command = f'''
            Add-Type -AssemblyName System.Speech
            $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
            $synth.Speak("{text}")
            '''
            
            process = await asyncio.create_subprocess_exec(
                'powershell', '-Command', ps_command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=30)
            
            # Windows TTS doesn't easily generate files, so return text indication
            return {
                "audio_data": None,
                "format": "system_audio",
                "duration": len(text) / 15,
                "engine": "powershell_tts",
                "success": True,
                "message": "Audio played via system TTS"
            }
            
        except Exception as e:
            logger.warning(f"⚠️ Windows TTS failed: {e}")
            return self._synthesize_text_only(text)
    
    def _synthesize_text_only(self, text: str) -> Dict[str, Any]:
        """Fallback to text-only response"""
        return {
            "audio_data": None,
            "format": "text",
            "duration": 0,
            "engine": "text_only",
            "success": True,
            "text_response": text,
            "message": "Voice synthesis not available - text response provided"
        }
    
    async def shutdown(self):
        """Cleanup resources"""
        self.is_initialized = False
        logger.info("✅ Fallback TTS service shutdown")


# Global instance
fallback_tts_service = FallbackTTSService()