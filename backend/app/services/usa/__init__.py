"""
Universal Site Access (USA) Module

Provides browser automation capabilities for PAM to interact with any website.
"""

from .session_manager import session_manager, BrowserSession, BrowserSessionManager
from .element_ref import ElementRef, ElementNotFoundError
from .element_indexer import index_page
from .rate_limiter import rate_limiter, RateLimiter, RateLimitError

__all__ = [
    "session_manager",
    "BrowserSession",
    "BrowserSessionManager",
    "ElementRef",
    "ElementNotFoundError",
    "index_page",
    "rate_limiter",
    "RateLimiter",
    "RateLimitError",
]
