"""
PAM 2.0 - Modular AI Assistant Backend
Clean, modular implementation following the original Build Playbook
"""

__version__ = "2.0.0"
__author__ = "Wheels & Wins Team"

# Core service imports (will be implemented in phases)
from .core import types, exceptions
from .api.models import ChatRequest, ChatResponse

__all__ = [
    "types",
    "exceptions",
    "ChatRequest",
    "ChatResponse"
]