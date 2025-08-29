"""
STT Engines Package
Available speech-to-text engines
"""

from .whisper_stt import WhisperSTTEngine
from .browser_stt import BrowserSTTEngine

__all__ = [
    "WhisperSTTEngine",
    "BrowserSTTEngine"
]