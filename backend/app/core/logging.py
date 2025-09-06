"""
Core logging setup for PAM Backend
"""
import logging
import os
import sys
from typing import Dict, Any, Optional
from contextvars import ContextVar
import structlog

# Context variables for request tracking
request_context: ContextVar[Dict[str, Any]] = ContextVar('request_context', default={})


def setup_logging(log_level: str = "INFO") -> None:
    """Setup structured logging with structlog"""
    
    # Configure standard logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, log_level.upper())
    )
    
    # Configure structlog
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.StackInfoRenderer(),
            structlog.dev.set_exc_info,
            structlog.processors.JSONRenderer() if os.getenv("ENVIRONMENT") == "production" 
            else structlog.dev.ConsoleRenderer(colors=True)
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, log_level.upper())
        ),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=False,
    )


def get_logger(name: str = __name__) -> structlog.BoundLogger:
    """Get a structured logger instance"""
    return structlog.get_logger(name)


def set_request_context(**kwargs) -> None:
    """Set request context for logging"""
    current_context = request_context.get({})
    current_context.update(kwargs)
    request_context.set(current_context)


def get_request_context() -> Dict[str, Any]:
    """Get current request context"""
    return request_context.get({})


def clear_request_context() -> None:
    """Clear request context"""
    request_context.set({})


# Initialize logging on import
log_level = os.getenv("LOG_LEVEL", "INFO")
setup_logging(log_level)

# Create a default logger
logger = get_logger("pam.backend")