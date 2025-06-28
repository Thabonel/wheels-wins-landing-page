
import logging
import logging.config
import sys
import time
from functools import wraps
from typing import Any, Dict, Optional, Callable
from contextvars import ContextVar
import structlog
from structlog.typing import FilteringBoundLogger
import sentry_sdk
from sentry_sdk.integrations.logging import LoggingIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from pydantic_settings import BaseSettings

# Context variable for request correlation
request_id_var: ContextVar[Optional[str]] = ContextVar('request_id', default=None)
user_id_var: ContextVar[Optional[str]] = ContextVar('user_id', default=None)

class LoggingSettings(BaseSettings):
    """Logging configuration settings."""
    
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"  # json or console
    ENABLE_SENTRY: bool = False
    SENTRY_DSN: Optional[str] = None
    SENTRY_ENVIRONMENT: str = "development"
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1
    
    class Config:
        env_prefix = "LOGGING_"

settings = LoggingSettings()

def add_request_context(logger: FilteringBoundLogger, method_name: str, event_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Add request context to log entries."""
    request_id = request_id_var.get()
    user_id = user_id_var.get()
    
    if request_id:
        event_dict["request_id"] = request_id
    if user_id:
        event_dict["user_id"] = user_id
    
    return event_dict

def add_timestamp(logger: FilteringBoundLogger, method_name: str, event_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Add timestamp to log entries."""
    event_dict["timestamp"] = time.time()
    return event_dict

def setup_sentry() -> None:
    """Configure Sentry integration."""
    if not settings.ENABLE_SENTRY or not settings.SENTRY_DSN:
        return
    
    sentry_logging = LoggingIntegration(
        level=logging.INFO,
        event_level=logging.ERROR
    )
    
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.SENTRY_ENVIRONMENT,
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
        integrations=[
            sentry_logging,
            SqlalchemyIntegration(),
        ],
        attach_stacktrace=True,
        send_default_pii=False,
    )

def configure_structlog() -> None:
    """Configure structlog processors and formatters."""
    processors = [
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        add_request_context,
        add_timestamp,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
    ]
    
    if settings.LOG_FORMAT == "json":
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(structlog.dev.ConsoleRenderer(colors=True))
    
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        logger_factory=structlog.stdlib.LoggerFactory(),
        context_class=dict,
        cache_logger_on_first_use=True,
    )

def setup_logging() -> None:
    """Setup logging configuration."""
    # Configure standard library logging
    logging_config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "json": {
                "format": "%(message)s"
            },
            "console": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            }
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "stream": sys.stdout,
                "formatter": settings.LOG_FORMAT,
                "level": settings.LOG_LEVEL,
            }
        },
        "root": {
            "level": settings.LOG_LEVEL,
            "handlers": ["console"]
        },
        "loggers": {
            "uvicorn": {
                "level": "INFO",
                "handlers": ["console"],
                "propagate": False,
            },
            "uvicorn.access": {
                "level": "INFO",
                "handlers": ["console"],
                "propagate": False,
            },
            "fastapi": {
                "level": "INFO",
                "handlers": ["console"],
                "propagate": False,
            },
            "sqlalchemy": {
                "level": "WARNING",
                "handlers": ["console"],
                "propagate": False,
            }
        }
    }
    
    logging.config.dictConfig(logging_config)
    
    # Configure structlog
    configure_structlog()
    
    # Setup Sentry
    setup_sentry()

def get_logger(name: str = None) -> FilteringBoundLogger:
    """Get a structured logger instance."""
    return structlog.get_logger(name)

def set_request_context(request_id: str, user_id: str = None) -> None:
    """Set request context for logging correlation."""
    request_id_var.set(request_id)
    if user_id:
        user_id_var.set(user_id)

def clear_request_context() -> None:
    """Clear request context."""
    request_id_var.set(None)
    user_id_var.set(None)

def log_performance(logger_name: str = None):
    """Decorator to log function performance."""
    def decorator(func: Callable) -> Callable:
        logger = get_logger(logger_name or func.__module__)
        
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            function_name = f"{func.__module__}.{func.__name__}"
            
            try:
                logger.info(
                    "Function started",
                    function=function_name,
                    args_count=len(args),
                    kwargs_keys=list(kwargs.keys())
                )
                
                result = await func(*args, **kwargs)
                
                duration = time.time() - start_time
                logger.info(
                    "Function completed",
                    function=function_name,
                    duration_seconds=duration,
                    success=True
                )
                
                return result
                
            except Exception as e:
                duration = time.time() - start_time
                logger.error(
                    "Function failed",
                    function=function_name,
                    duration_seconds=duration,
                    error=str(e),
                    error_type=type(e).__name__,
                    success=False,
                    exc_info=True
                )
                raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            function_name = f"{func.__module__}.{func.__name__}"
            
            try:
                logger.info(
                    "Function started",
                    function=function_name,
                    args_count=len(args),
                    kwargs_keys=list(kwargs.keys())
                )
                
                result = func(*args, **kwargs)
                
                duration = time.time() - start_time
                logger.info(
                    "Function completed",
                    function=function_name,
                    duration_seconds=duration,
                    success=True
                )
                
                return result
                
            except Exception as e:
                duration = time.time() - start_time
                logger.error(
                    "Function failed",
                    function=function_name,
                    duration_seconds=duration,
                    error=str(e),
                    error_type=type(e).__name__,
                    success=False,
                    exc_info=True
                )
                raise
        
        # Return appropriate wrapper based on function type
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator

def log_api_call(logger_name: str = None):
    """Decorator to log API calls with request/response details."""
    def decorator(func: Callable) -> Callable:
        logger = get_logger(logger_name or "api")
        
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            endpoint = f"{func.__module__}.{func.__name__}"
            
            # Extract request details from kwargs
            request_data = {}
            for key, value in kwargs.items():
                if hasattr(value, 'dict'):  # Pydantic model
                    request_data[key] = value.dict()
                elif not callable(value):
                    request_data[key] = str(value)[:200]  # Truncate long values
            
            logger.info(
                "API call started",
                endpoint=endpoint,
                request_data=request_data
            )
            
            try:
                result = await func(*args, **kwargs)
                
                duration = time.time() - start_time
                logger.info(
                    "API call completed",
                    endpoint=endpoint,
                    duration_seconds=duration,
                    status="success"
                )
                
                return result
                
            except Exception as e:
                duration = time.time() - start_time
                logger.error(
                    "API call failed",
                    endpoint=endpoint,
                    duration_seconds=duration,
                    error=str(e),
                    error_type=type(e).__name__,
                    status="error",
                    exc_info=True
                )
                
                # Send to Sentry with additional context
                if settings.ENABLE_SENTRY:
                    sentry_sdk.set_context("api_call", {
                        "endpoint": endpoint,
                        "duration": duration,
                        "request_data": request_data
                    })
                    sentry_sdk.capture_exception(e)
                
                raise
        
        return wrapper
    return decorator

def log_database_operation(operation: str, table: str = None):
    """Decorator to log database operations."""
    def decorator(func: Callable) -> Callable:
        logger = get_logger("database")
        
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            
            logger.info(
                "Database operation started",
                operation=operation,
                table=table,
                function=func.__name__
            )
            
            try:
                result = await func(*args, **kwargs)
                
                duration = time.time() - start_time
                logger.info(
                    "Database operation completed",
                    operation=operation,
                    table=table,
                    function=func.__name__,
                    duration_seconds=duration,
                    success=True
                )
                
                return result
                
            except Exception as e:
                duration = time.time() - start_time
                logger.error(
                    "Database operation failed",
                    operation=operation,
                    table=table,
                    function=func.__name__,
                    duration_seconds=duration,
                    error=str(e),
                    error_type=type(e).__name__,
                    success=False,
                    exc_info=True
                )
                raise
        
        return wrapper
    return decorator

class LoggerAdapter:
    """Adapter for backward compatibility with existing logging code."""
    
    def __init__(self, name: str = None):
        self._logger = get_logger(name)
    
    def info(self, message: str, **kwargs):
        self._logger.info(message, **kwargs)
    
    def debug(self, message: str, **kwargs):
        self._logger.debug(message, **kwargs)
    
    def warning(self, message: str, **kwargs):
        self._logger.warning(message, **kwargs)
    
    def error(self, message: str, **kwargs):
        self._logger.error(message, **kwargs)
    
    def critical(self, message: str, **kwargs):
        self._logger.critical(message, **kwargs)
    
    def exception(self, message: str, **kwargs):
        self._logger.error(message, exc_info=True, **kwargs)

# Initialize logging on module import
setup_logging()

# Export commonly used items
__all__ = [
    'setup_logging',
    'get_logger',
    'set_request_context',
    'clear_request_context',
    'log_performance',
    'log_api_call',
    'log_database_operation',
    'LoggerAdapter'
]
