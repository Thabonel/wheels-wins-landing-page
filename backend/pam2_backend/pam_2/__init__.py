"""
PAM 2.0: Clean Modular AI Assistant
====================================

A production-ready AI assistant built with clean architecture principles,
featuring Google Gemini 1.5 Flash integration for 95%+ cost savings.

Key Features:
- 🔥 Google Gemini 1.5 Flash (25x cheaper than Claude/OpenAI)
- ⚡ Sub-200ms response times
- 🧠 1M token context window
- 🏗️ Modular architecture (5 services <300 lines each)
- 🛡️ Production-ready with circuit breakers and monitoring

Architecture:
- core/        - Infrastructure (types, config, exceptions)
- services/    - 5 modular services (conversational, context, trip, savings, safety)
- api/         - REST + WebSocket API layer
- integrations/ - External service integrations (Gemini, Redis)
"""

__version__ = "2.0.0"
__author__ = "PAM Team"
__description__ = "Clean Modular AI Assistant with Google Gemini 1.5 Flash"

# Core exports
from .core.types import (
    ChatMessage,
    ConversationContext,
    UserContext,
    ServiceResponse,
    MessageType,
    ServiceStatus
)

from .core.config import pam2_settings

from .core.exceptions import (
    PAM2Exception,
    ConfigurationError,
    ServiceError,
    ValidationError
)

__all__ = [
    # Version info
    "__version__",
    "__author__",
    "__description__",

    # Core types
    "ChatMessage",
    "ConversationContext",
    "UserContext",
    "ServiceResponse",
    "MessageType",
    "ServiceStatus",

    # Configuration
    "pam2_settings",

    # Exceptions
    "PAM2Exception",
    "ConfigurationError",
    "ServiceError",
    "ValidationError"
]