"""
Universal Site Access (USA) Module

Provides browser automation capabilities for PAM to interact with any website.

Components:
- session_manager: Browser session lifecycle management
- element_indexer: Page element discovery and indexing
- element_ref: Stable element references with fallback resolution
- rate_limiter: Request throttling per user
- intent_parser: AI-powered user intent understanding
- action_executor: Browser action execution
- form_detector: Smart form field detection and mapping
- data_extractor: Structured data extraction from pages
- workflow_engine: Multi-step workflow execution
- error_recovery: Error handling and recovery strategies
- pattern_store: Learned site interaction patterns
- models: Data models and types
"""

# Core infrastructure
from .session_manager import session_manager, BrowserSession, BrowserSessionManager
from .element_ref import ElementRef, ElementNotFoundError
from .element_indexer import index_page
from .rate_limiter import rate_limiter, RateLimiter, RateLimitError

# Models and types
from .models import (
    ActionType,
    WaitCondition,
    FieldType,
    RecoveryStrategy,
    PageContext,
    ActionStep,
    ActionPlan,
    ActionResult,
    FormField,
    FormResult,
    WorkflowStep,
    WorkflowResult,
    SitePattern,
    RecoveryResult,
    ProductInfo,
    CampgroundInfo,
)

# AI-powered intent parsing
from .intent_parser import IntentParser

# Action execution
from .action_executor import ActionExecutor

# Form handling
from .form_detector import FormDetector

# Data extraction
from .data_extractor import PageDataExtractor

# Workflow execution
from .workflow_engine import WorkflowEngine

# Error recovery
from .error_recovery import ErrorRecovery

# Pattern storage
from .pattern_store import PatternStore, pattern_store


__all__ = [
    # Session management
    "session_manager",
    "BrowserSession",
    "BrowserSessionManager",
    # Element handling
    "ElementRef",
    "ElementNotFoundError",
    "index_page",
    # Rate limiting
    "rate_limiter",
    "RateLimiter",
    "RateLimitError",
    # Enums
    "ActionType",
    "WaitCondition",
    "FieldType",
    "RecoveryStrategy",
    # Data models
    "PageContext",
    "ActionStep",
    "ActionPlan",
    "ActionResult",
    "FormField",
    "FormResult",
    "WorkflowStep",
    "WorkflowResult",
    "SitePattern",
    "RecoveryResult",
    "ProductInfo",
    "CampgroundInfo",
    # Intent parsing
    "IntentParser",
    # Action execution
    "ActionExecutor",
    # Form detection
    "FormDetector",
    # Data extraction
    "PageDataExtractor",
    # Workflow engine
    "WorkflowEngine",
    # Error recovery
    "ErrorRecovery",
    # Pattern storage
    "PatternStore",
    "pattern_store",
]
