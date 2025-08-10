"""
Text-to-Speech Services for Wheels & Wins
Provides multi-engine TTS with intelligent fallbacks
"""

from .manager import TTSManager, get_tts_manager
from .engines.edge_tts import EdgeTTSEngine
from .engines.system_tts import SystemTTSEngine

__all__ = [
    'TTSManager',
    'get_tts_manager',
    'EdgeTTSEngine', 
    'SystemTTSEngine'
]