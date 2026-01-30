"""
Error Handling and Resilience for Proactive PAM System

Provides comprehensive error handling, retry logic, and graceful degradation
for real data integrations and external API calls.
"""

import asyncio
import logging
from typing import Any, Callable, Dict, Optional, TypeVar
from functools import wraps
from datetime import datetime, timedelta

from app.core.logging import get_logger

logger = get_logger(__name__)

T = TypeVar('T')

class ProactiveError(Exception):
    """Base exception for proactive system errors"""
    def __init__(self, message: str, context: Optional[Dict[str, Any]] = None):
        self.message = message
        self.context = context or {}
        super().__init__(message)

class DataSourceError(ProactiveError):
    """Error accessing data sources (database, PAM tools)"""
    pass

class ExternalAPIError(ProactiveError):
    """Error calling external APIs"""
    pass

class RetryableError(ProactiveError):
    """Error that should trigger a retry"""
    pass

def retry_on_failure(
    max_retries: int = 3,
    delay: float = 1.0,
    exponential_backoff: bool = True,
    exceptions: tuple = (Exception,)
):
    """Decorator to retry function calls on failure with exponential backoff"""

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            last_exception = None

            for attempt in range(max_retries + 1):
                try:
                    if asyncio.iscoroutinefunction(func):
                        return await func(*args, **kwargs)
                    else:
                        return func(*args, **kwargs)

                except exceptions as e:
                    last_exception = e

                    if attempt == max_retries:
                        logger.error(
                            f"Function {func.__name__} failed after {max_retries} retries",
                            extra={"error": str(e), "attempt": attempt + 1}
                        )
                        break

                    wait_time = delay * (2 ** attempt) if exponential_backoff else delay
                    logger.warning(
                        f"Function {func.__name__} failed on attempt {attempt + 1}, retrying in {wait_time}s",
                        extra={"error": str(e), "wait_time": wait_time}
                    )

                    await asyncio.sleep(wait_time)

            # All retries failed
            raise RetryableError(
                f"Function {func.__name__} failed after {max_retries} retries",
                context={"last_error": str(last_exception), "function": func.__name__}
            )

        return wrapper
    return decorator

def fallback_on_error(fallback_value: Any):
    """Decorator to return fallback value if function fails"""

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                if asyncio.iscoroutinefunction(func):
                    return await func(*args, **kwargs)
                else:
                    return func(*args, **kwargs)
            except Exception as e:
                logger.error(
                    f"Function {func.__name__} failed, using fallback value",
                    extra={"error": str(e), "fallback_value": fallback_value}
                )
                return fallback_value

        return wrapper
    return decorator

def log_errors(func: Callable[..., T]) -> Callable[..., T]:
    """Decorator to log errors with context"""

    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            if asyncio.iscoroutinefunction(func):
                return await func(*args, **kwargs)
            else:
                return func(*args, **kwargs)
        except Exception as e:
            logger.error(
                f"Error in {func.__name__}",
                extra={
                    "function": func.__name__,
                    "error": str(e),
                    "args": str(args)[:200],  # Truncate long args
                    "kwargs": str(kwargs)[:200]
                },
                exc_info=True
            )
            raise

    return wrapper

class CircuitBreaker:
    """Circuit breaker pattern for external service calls"""

    def __init__(
        self,
        failure_threshold: int = 5,
        timeout_duration: int = 60,
        expected_exception: tuple = (Exception,)
    ):
        self.failure_threshold = failure_threshold
        self.timeout_duration = timeout_duration
        self.expected_exception = expected_exception
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN

    def __call__(self, func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            if self.state == "OPEN":
                if self._should_attempt_reset():
                    self.state = "HALF_OPEN"
                else:
                    raise ExternalAPIError(
                        f"Circuit breaker is OPEN for {func.__name__}",
                        context={"failure_count": self.failure_count}
                    )

            try:
                if asyncio.iscoroutinefunction(func):
                    result = await func(*args, **kwargs)
                else:
                    result = func(*args, **kwargs)

                # Success - reset circuit breaker
                self.failure_count = 0
                self.state = "CLOSED"
                return result

            except self.expected_exception as e:
                self.failure_count += 1
                self.last_failure_time = datetime.now()

                if self.failure_count >= self.failure_threshold:
                    self.state = "OPEN"
                    logger.warning(
                        f"Circuit breaker opened for {func.__name__}",
                        extra={
                            "failure_count": self.failure_count,
                            "threshold": self.failure_threshold
                        }
                    )

                raise ExternalAPIError(
                    f"Service call failed: {str(e)}",
                    context={"failure_count": self.failure_count, "function": func.__name__}
                )

        return wrapper

    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to attempt reset"""
        if not self.last_failure_time:
            return True

        time_since_failure = datetime.now() - self.last_failure_time
        return time_since_failure.total_seconds() > self.timeout_duration

class DataValidator:
    """Validates data from external sources"""

    @staticmethod
    def validate_user_id(user_id: str) -> bool:
        """Validate user ID format"""
        if not user_id or not isinstance(user_id, str):
            return False
        # UUID format check (basic)
        if len(user_id.strip()) < 10:
            return False
        return True

    @staticmethod
    def validate_financial_data(data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and sanitize financial data"""
        validated = {}

        # Spending amount
        spent = data.get("spent", 0)
        if isinstance(spent, (int, float, str)):
            try:
                validated["spent"] = max(0, float(spent))
            except (ValueError, TypeError):
                validated["spent"] = 0.0
        else:
            validated["spent"] = 0.0

        # Budget amount
        budget = data.get("budget", 0)
        if isinstance(budget, (int, float, str)):
            try:
                validated["budget"] = max(0, float(budget))
            except (ValueError, TypeError):
                validated["budget"] = 0.0
        else:
            validated["budget"] = 0.0

        return validated

    @staticmethod
    def validate_weather_data(data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate weather forecast data"""
        validated = {
            "clear_days": 0,
            "error": None
        }

        if isinstance(data.get("clear_days"), (int, float)):
            validated["clear_days"] = max(0, int(data["clear_days"]))

        if data.get("error"):
            validated["error"] = str(data["error"])

        if "forecast" in data and isinstance(data["forecast"], list):
            validated["forecast"] = data["forecast"]

        return validated

class ProactiveErrorHandler:
    """Centralized error handling for the proactive system"""

    def __init__(self):
        self.error_counts = {}
        self.circuit_breakers = {}

    async def safe_execute(
        self,
        func: Callable,
        function_name: str,
        fallback_value: Any = None,
        user_id: Optional[str] = None,
        max_retries: int = 2
    ) -> Any:
        """Safely execute a function with comprehensive error handling"""

        try:
            # Validate user_id if provided
            if user_id and not DataValidator.validate_user_id(user_id):
                raise DataSourceError(
                    f"Invalid user_id: {user_id}",
                    context={"function": function_name}
                )

            # Track error count for this function
            if function_name not in self.error_counts:
                self.error_counts[function_name] = 0

            # Apply retry logic
            @retry_on_failure(max_retries=max_retries, exceptions=(DataSourceError, ExternalAPIError))
            async def execute_with_retry():
                return await func() if asyncio.iscoroutinefunction(func) else func()

            result = await execute_with_retry()

            # Reset error count on success
            self.error_counts[function_name] = 0

            return result

        except RetryableError as e:
            logger.error(
                f"Function {function_name} failed after retries",
                extra={
                    "user_id": user_id,
                    "error": str(e),
                    "fallback_value": fallback_value
                }
            )

            # Increment error count
            self.error_counts[function_name] += 1

            # Return fallback value if available
            if fallback_value is not None:
                return fallback_value

            raise

        except Exception as e:
            logger.error(
                f"Unexpected error in {function_name}",
                extra={
                    "user_id": user_id,
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )

            # Return fallback value if available
            if fallback_value is not None:
                return fallback_value

            raise ProactiveError(
                f"Failed to execute {function_name}",
                context={"user_id": user_id, "original_error": str(e)}
            )

    def get_error_stats(self) -> Dict[str, Any]:
        """Get error statistics for monitoring"""
        return {
            "error_counts": self.error_counts.copy(),
            "timestamp": datetime.now().isoformat(),
            "circuit_breaker_states": {
                name: cb.state for name, cb in self.circuit_breakers.items()
            }
        }

# Global error handler instance
error_handler = ProactiveErrorHandler()