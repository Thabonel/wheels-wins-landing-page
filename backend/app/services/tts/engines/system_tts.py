"""
System TTS Engine
Fallback TTS engine using operating system native TTS
"""

import subprocess
import asyncio
import tempfile
import os
import platform
import logging
from typing import Dict, Any, List
import shutil

from ..base import BaseTTSEngine, VoiceSettings, TTSResponse, TTSError

logger = logging.getLogger(__name__)

class SystemTTSEngine(BaseTTSEngine):
    """System-native TTS Engine (fallback)"""
    
    def __init__(self):
        self.system = platform.system()
        self.tts_command = None
        super().__init__("SystemTTS")
    
    def _setup_engine(self):
        """Setup system TTS based on operating system"""
        self.system = platform.system().lower()
        
        if self.system == "darwin":  # macOS
            self.tts_command = "say"
            if not shutil.which("say"):
                raise TTSError("macOS 'say' command not available", engine="SystemTTS")
                
        elif self.system == "linux":  # Linux
            # Try different Linux TTS options
            if shutil.which("espeak"):
                self.tts_command = "espeak"
            elif shutil.which("festival"):
                self.tts_command = "festival"
            elif shutil.which("spd-say"):
                self.tts_command = "spd-say"
            else:
                raise TTSError("No Linux TTS command found (espeak, festival, spd-say)", engine="SystemTTS")
                
        elif self.system == "windows":  # Windows
            # Windows will use PowerShell Add-Type for TTS
            self.tts_command = "powershell"
            
        else:
            raise TTSError(f"Unsupported operating system: {self.system}", engine="SystemTTS")
        
        logger.debug(f"✅ System TTS initialized for {self.system} using {self.tts_command}")
    
    async def synthesize(
        self, 
        text: str, 
        settings: VoiceSettings = None
    ) -> TTSResponse:
        """
        Synthesize text using system TTS
        
        Args:
            text: Text to synthesize
            settings: Voice settings (limited support)
            
        Returns:
            TTSResponse with WAV audio data
        """
        if not text or not text.strip():
            raise TTSError("Empty text provided", engine="SystemTTS")
        
        if settings is None:
            settings = VoiceSettings()
        
        try:
            logger.debug(f"🔊 Synthesizing text with System TTS: '{text[:50]}...'")
            
            # Create temporary file for audio output
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                temp_path = temp_file.name
            
            try:
                if self.system == "darwin":
                    await self._synthesize_macos(text, temp_path, settings)
                elif self.system == "linux":
                    await self._synthesize_linux(text, temp_path, settings)
                elif self.system == "windows":
                    await self._synthesize_windows(text, temp_path, settings)
                else:
                    raise TTSError(f"Unsupported system: {self.system}", engine="SystemTTS")
                
                # Read the generated audio file
                if not os.path.exists(temp_path) or os.path.getsize(temp_path) == 0:
                    raise TTSError("No audio file generated", engine="SystemTTS")
                
                with open(temp_path, "rb") as audio_file:
                    audio_data = audio_file.read()
                
                # Estimate duration (very rough)
                duration = len(text.split()) * 0.7  # ~0.7 seconds per word for system TTS
                
                logger.debug(f"✅ System TTS synthesis completed: {len(audio_data)} bytes")
                
                return TTSResponse(
                    audio_data=audio_data,
                    format="wav",
                    duration=duration,
                    voice_used="system_default",
                    engine_used="SystemTTS"
                )
                
            finally:
                # Clean up temporary file
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
                    
        except Exception as e:
            logger.error(f"❌ System TTS synthesis failed: {e}")
            raise TTSError(f"System TTS synthesis failed: {e}", engine="SystemTTS", original_error=e)
    
    async def _synthesize_macos(self, text: str, output_path: str, settings: VoiceSettings):
        """Synthesize using macOS say command"""
        cmd = [
            "say",
            "-o", output_path,
            "-r", str(int(settings.speed * 200)),  # Rate in words per minute
            text
        ]
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            raise TTSError(f"macOS say failed: {stderr.decode()}", engine="SystemTTS")
    
    async def _synthesize_linux(self, text: str, output_path: str, settings: VoiceSettings):
        """Synthesize using Linux TTS commands"""
        if self.tts_command == "espeak":
            cmd = [
                "espeak",
                "-s", str(int(settings.speed * 175)),  # Speed in words per minute
                "-w", output_path,
                text
            ]
        elif self.tts_command == "festival":
            # Festival is more complex, create a script
            with tempfile.NamedTemporaryFile(mode='w', suffix='.scm', delete=False) as script_file:
                script_content = f'''
(voice_kal_diphone)
(Parameter.set 'Duration_Stretch {1/settings.speed})
(utt.save.wave (SayText "{text}") "{output_path}" 'riff)
'''
                script_file.write(script_content)
                script_path = script_file.name
            
            try:
                cmd = ["festival", "-b", script_path]
            finally:
                if os.path.exists(script_path):
                    os.unlink(script_path)
        elif self.tts_command == "spd-say":
            cmd = [
                "spd-say",
                "-r", str(int((settings.speed - 1) * 50)),  # Rate adjustment
                "-o", output_path,
                text
            ]
        else:
            raise TTSError(f"Unknown Linux TTS command: {self.tts_command}", engine="SystemTTS")
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            raise TTSError(f"Linux TTS failed: {stderr.decode()}", engine="SystemTTS")
    
    async def _synthesize_windows(self, text: str, output_path: str, settings: VoiceSettings):
        """Synthesize using Windows PowerShell"""
        # PowerShell script for Windows TTS
        ps_script = f'''
Add-Type -AssemblyName System.Speech;
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;
$synth.Rate = {int((settings.speed - 1) * 5)};
$synth.Volume = {int(settings.volume * 100)};
$synth.SetOutputToWaveFile("{output_path}");
$synth.Speak("{text}");
$synth.Dispose();
'''
        
        cmd = ["powershell", "-Command", ps_script]
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            raise TTSError(f"Windows TTS failed: {stderr.decode()}", engine="SystemTTS")
    
    def get_available_voices(self) -> List[Dict[str, Any]]:
        """
        Get available system voices
        
        Returns:
            List of available voices (limited for system TTS)
        """
        # System TTS typically has limited voice options
        if self.system == "darwin":
            return [
                {
                    "id": "system_default",
                    "name": "System Default (macOS)",
                    "language": "en-US",
                    "gender": "Unknown",
                    "quality": "Standard"
                }
            ]
        elif self.system == "linux":
            return [
                {
                    "id": "system_default",
                    "name": f"System Default ({self.tts_command})",
                    "language": "en-US", 
                    "gender": "Unknown",
                    "quality": "Standard"
                }
            ]
        elif self.system == "windows":
            return [
                {
                    "id": "system_default",
                    "name": "System Default (Windows)",
                    "language": "en-US",
                    "gender": "Unknown", 
                    "quality": "Standard"
                }
            ]
        else:
            return []

# Test function
async def test_system_tts():
    """Test System TTS functionality"""
    try:
        engine = SystemTTSEngine()
        if not engine.is_available:
            print("❌ System TTS engine not available")
            return False
        
        # Test synthesis
        settings = VoiceSettings(speed=1.0, volume=1.0)
        result = await engine.synthesize("Hello, this is a test of system TTS.", settings)
        
        print(f"✅ System TTS test successful: {len(result.audio_data)} bytes generated")
        return True
        
    except Exception as e:
        print(f"❌ System TTS test failed: {e}")
        return False

if __name__ == "__main__":
    # Test the engine
    asyncio.run(test_system_tts())