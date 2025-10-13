"""
PAM 2.0 Core Infrastructure
============================

Core infrastructure components for PAM 2.0 including:
- TypeScript-style type definitions
- Configuration management
- Custom exceptions
- Shared utilities

This module provides the foundation for all PAM 2.0 services
with clean, typed interfaces and robust error handling.
"""

from .types import (
    ChatMessage,
    ConversationContext,
    UserContext,
    ServiceResponse,
    MessageType,
    ServiceStatus,
    TripData,
    FinancialData
)

from .config import pam2_settings, PAM2Settings

from .exceptions import (
    PAM2Exception,
    ConfigurationError,
    ServiceError,
    ValidationError,
    ConversationalEngineError,
    ContextManagerError,
    TripLoggerError,
    SavingsTrackerError,
    SafetyLayerError
)

__all__ = [
    # Types
    "ChatMessage",
    "ConversationContext",
    "UserContext",
    "ServiceResponse",
    "MessageType",
    "ServiceStatus",
    "TripData",
    "FinancialData",

    # Configuration
    "pam2_settings",
    "PAM2Settings",

    # Exceptions
    "PAM2Exception",
    "ConfigurationError",
    "ServiceError",
    "ValidationError",
    "ConversationalEngineError",
    "ContextManagerError",
    "TripLoggerError",
    "SavingsTrackerError",
    "SafetyLayerError"
]