"""
PAM 2.0 Modular Services
========================

Five clean, modular services that implement PAM 2.0 functionality:

1. conversational_engine - AI conversation handling with Gemini 1.5 Flash
2. context_manager - Context persistence and retrieval
3. trip_logger - Travel activity detection and logging
4. savings_tracker - Financial analysis and recommendations
5. safety_layer - Content filtering and rate limiting

Each service is designed to be:
- < 300 lines of code
- Single responsibility
- Clean interfaces
- Easily testable
- Independently deployable
"""

from .conversational_engine import ConversationalEngine, create_conversational_engine
from .context_manager import ContextManager, create_context_manager
from .trip_logger import TripLogger, create_trip_logger
from .savings_tracker import SavingsTracker, create_savings_tracker
from .safety_layer import SafetyLayer, create_safety_layer

__all__ = [
    # Service classes
    "ConversationalEngine",
    "ContextManager",
    "TripLogger",
    "SavingsTracker",
    "SafetyLayer",

    # Factory functions
    "create_conversational_engine",
    "create_context_manager",
    "create_trip_logger",
    "create_savings_tracker",
    "create_safety_layer"
]