"""
Speech-to-Text Service Package
Provides multi-engine STT with automatic fallback
"""

from .base import BaseSTTEngine, STTResponse, STTError, AudioFormat
from .manager import STTManager, get_stt_manager

__all__ = [
    "BaseSTTEngine",
    "STTResponse", 
    "STTError",
    "AudioFormat",
    "STTManager",
    "get_stt_manager"
]