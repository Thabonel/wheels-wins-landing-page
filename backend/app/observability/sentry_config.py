"""
Sentry Integration for Error Tracking and Performance Monitoring

Provides:
- Automatic error tracking with stack traces
- Performance monitoring (APM)
- Custom context and tags
- Release tracking
- User identification

Configuration via environment variables:
- SENTRY_DSN: Sentry project DSN
- SENTRY_ENVIRONMENT: Environment name (staging/production)
- SENTRY_RELEASE: Release version
- SENTRY_TRACES_SAMPLE_RATE: Percentage of transactions to trace (0.0-1.0)
"""

import os
import logging
from typing import Optional, Dict, Any
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
from sentry_sdk.integrations.asyncio import AsyncioIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

logger = logging.getLogger(__name__)


class SentryConfig:
    """Sentry configuration and initialization"""

    def __init__(self):
        self.dsn = os.getenv("SENTRY_DSN")
        self.environment = os.getenv("SENTRY_ENVIRONMENT", os.getenv("NODE_ENV", "development"))
        self.release = os.getenv("SENTRY_RELEASE", self._get_git_commit())
        self.traces_sample_rate = float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1"))
        self.enabled = bool(self.dsn)

    @staticmethod
    def _get_git_commit() -> Optional[str]:
        """Get current git commit hash for release tracking"""
        try:
            import subprocess
            result = subprocess.run(
                ["git", "rev-parse", "--short", "HEAD"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                return result.stdout.strip()
        except Exception:
            pass
        return None

    def initialize(self) -> bool:
        """Initialize Sentry SDK"""
        if not self.enabled:
            logger.info("Sentry disabled (no DSN configured)")
            return False

        try:
            # Configure logging integration
            logging_integration = LoggingIntegration(
                level=logging.INFO,  # Capture info and above as breadcrumbs
                event_level=logging.ERROR  # Send errors and above as events
            )

            sentry_sdk.init(
                dsn=self.dsn,
                environment=self.environment,
                release=self.release,
                traces_sample_rate=self.traces_sample_rate,

                # Integrations
                integrations=[
                    FastApiIntegration(),
                    StarletteIntegration(),
                    logging_integration,
                    AsyncioIntegration(),
                    RedisIntegration(),
                    SqlalchemyIntegration(),
                ],

                # Performance monitoring
                enable_tracing=True,
                traces_sampler=self._traces_sampler,

                # Error filtering
                before_send=self._before_send,
                before_breadcrumb=self._before_breadcrumb,

                # Performance
                profiles_sample_rate=0.1 if self.environment == "production" else 0.0,

                # Privacy
                send_default_pii=False,  # Don't send PII by default
                max_breadcrumbs=50,
                attach_stacktrace=True,

                # Additional options
                debug=self.environment == "development",
            )

            logger.info(f"✅ Sentry initialized (env: {self.environment}, release: {self.release})")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to initialize Sentry: {e}")
            return False

    def _traces_sampler(self, sampling_context: Dict[str, Any]) -> float:
        """
        Dynamic trace sampling based on context

        Returns:
            Sample rate (0.0-1.0) for this trace
        """
        # Always trace errors
        if sampling_context.get("parent_sampled") is not None:
            return 1.0

        # Get transaction name
        transaction_name = sampling_context.get("transaction_context", {}).get("name", "")

        # Sample health checks less frequently
        if "/health" in transaction_name or "/ping" in transaction_name:
            return 0.01  # 1% of health checks

        # Sample WebSocket connections more frequently
        if "/ws/" in transaction_name:
            return 0.5  # 50% of WebSocket connections

        # Sample API endpoints moderately
        if "/api/" in transaction_name:
            return 0.2  # 20% of API calls

        # Default sampling rate
        return self.traces_sample_rate

    def _before_send(self, event: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Filter and modify events before sending to Sentry

        Returns:
            Modified event or None to drop the event
        """
        # Don't send events in development unless DEBUG is set
        if self.environment == "development" and not os.getenv("SENTRY_DEBUG"):
            return None

        # Filter out noisy errors
        if "exc_info" in hint:
            exc_type, exc_value, tb = hint["exc_info"]

            # Ignore connection errors (expected in production)
            if exc_type.__name__ in ["ConnectionError", "TimeoutError", "ConnectionResetError"]:
                return None

            # Ignore WebSocket disconnect errors (normal)
            if "WebSocketDisconnect" in str(exc_type):
                return None

        # Add custom tags
        event.setdefault("tags", {})
        event["tags"]["environment"] = self.environment

        if self.release:
            event["tags"]["release"] = self.release

        return event

    def _before_breadcrumb(self, crumb: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Filter and modify breadcrumbs before adding to event

        Returns:
            Modified breadcrumb or None to drop it
        """
        # Filter out sensitive data from breadcrumbs
        if crumb.get("category") == "http":
            # Remove authorization headers
            if "data" in crumb and "headers" in crumb["data"]:
                headers = crumb["data"]["headers"]
                if isinstance(headers, dict):
                    headers.pop("authorization", None)
                    headers.pop("cookie", None)

        # Limit breadcrumb message length
        if "message" in crumb and len(crumb["message"]) > 1000:
            crumb["message"] = crumb["message"][:1000] + "..."

        return crumb


# Global instance
sentry_config = SentryConfig()


def setup_sentry() -> bool:
    """
    Initialize Sentry for the application

    Call this at application startup.

    Returns:
        True if Sentry was initialized, False otherwise
    """
    return sentry_config.initialize()


def capture_exception(
    error: Exception,
    context: Optional[Dict[str, Any]] = None,
    user: Optional[Dict[str, Any]] = None,
    tags: Optional[Dict[str, str]] = None
) -> Optional[str]:
    """
    Capture an exception with additional context

    Args:
        error: The exception to capture
        context: Additional context data
        user: User information (id, email, etc.)
        tags: Custom tags for filtering

    Returns:
        Event ID if sent to Sentry, None otherwise

    Example:
        capture_exception(
            error,
            context={"conversation_id": conv_id},
            user={"id": user_id},
            tags={"feature": "pam"}
        )
    """
    if not sentry_config.enabled:
        return None

    with sentry_sdk.push_scope() as scope:
        # Add context
        if context:
            scope.set_context("additional", context)

        # Add user
        if user:
            scope.set_user(user)

        # Add tags
        if tags:
            for key, value in tags.items():
                scope.set_tag(key, value)

        # Capture exception
        return sentry_sdk.capture_exception(error)


def capture_message(
    message: str,
    level: str = "info",
    context: Optional[Dict[str, Any]] = None,
    tags: Optional[Dict[str, str]] = None
) -> Optional[str]:
    """
    Capture a message event

    Args:
        message: The message to capture
        level: Severity level (debug, info, warning, error, fatal)
        context: Additional context data
        tags: Custom tags for filtering

    Returns:
        Event ID if sent to Sentry, None otherwise
    """
    if not sentry_config.enabled:
        return None

    with sentry_sdk.push_scope() as scope:
        if context:
            scope.set_context("additional", context)

        if tags:
            for key, value in tags.items():
                scope.set_tag(key, value)

        return sentry_sdk.capture_message(message, level=level)


def start_transaction(
    name: str,
    op: str = "http.server",
    description: Optional[str] = None
) -> Any:
    """
    Start a performance monitoring transaction

    Args:
        name: Transaction name (e.g., "POST /api/chat")
        op: Operation type (e.g., "http.server", "db.query")
        description: Additional description

    Returns:
        Transaction object

    Example:
        with start_transaction("PAM Message Processing", op="ai.inference"):
            # Process message
            pass
    """
    if not sentry_config.enabled:
        # Return a no-op context manager
        from contextlib import nullcontext
        return nullcontext()

    return sentry_sdk.start_transaction(
        name=name,
        op=op,
        description=description
    )


def set_user(user_id: str, email: Optional[str] = None, **kwargs):
    """
    Set user context for error tracking

    Args:
        user_id: User identifier
        email: User email (optional)
        **kwargs: Additional user fields
    """
    if not sentry_config.enabled:
        return

    sentry_sdk.set_user({
        "id": user_id,
        "email": email,
        **kwargs
    })


def set_tag(key: str, value: str):
    """
    Set a tag for filtering events

    Args:
        key: Tag key
        value: Tag value
    """
    if not sentry_config.enabled:
        return

    sentry_sdk.set_tag(key, value)


def set_context(key: str, context: Dict[str, Any]):
    """
    Set additional context data

    Args:
        key: Context key
        context: Context data
    """
    if not sentry_config.enabled:
        return

    sentry_sdk.set_context(key, context)


# Convenience decorators for async functions
def trace_async(name: Optional[str] = None, op: str = "function"):
    """
    Decorator to trace async function performance

    Args:
        name: Transaction name (defaults to function name)
        op: Operation type

    Example:
        @trace_async(op="ai.safety_check")
        async def check_message_safety(message: str):
            # ...
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            transaction_name = name or f"{func.__module__}.{func.__name__}"

            if not sentry_config.enabled:
                return await func(*args, **kwargs)

            with sentry_sdk.start_transaction(name=transaction_name, op=op):
                return await func(*args, **kwargs)

        return wrapper
    return decorator
