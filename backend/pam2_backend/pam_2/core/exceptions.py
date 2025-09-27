"""
PAM 2.0 Custom Exceptions
=========================

Clean, hierarchical exception system for PAM 2.0 with
detailed error messages and context information.
"""

from typing import Dict, Any, Optional


class PAM2Exception(Exception):
    """
    Base exception class for all PAM 2.0 errors

    Provides common functionality for error handling,
    logging, and debugging across all services.
    """

    def __init__(
        self,
        message: str,
        error_code: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        original_error: Optional[Exception] = None
    ):
        self.message = message
        self.error_code = error_code or self.__class__.__name__
        self.context = context or {}
        self.original_error = original_error

        # Create detailed error message
        detailed_message = f"[{self.error_code}] {message}"
        if self.context:
            detailed_message += f" | Context: {self.context}"
        if self.original_error:
            detailed_message += f" | Original: {str(self.original_error)}"

        super().__init__(detailed_message)

    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for API responses"""
        return {
            "error_type": self.__class__.__name__,
            "error_code": self.error_code,
            "message": self.message,
            "context": self.context,
            "original_error": str(self.original_error) if self.original_error else None
        }


class ConfigurationError(PAM2Exception):
    """
    Configuration and setup errors

    Raised when there are issues with:
    - Environment variables
    - Configuration validation
    - Service initialization
    """

    def __init__(self, message: str, setting_name: Optional[str] = None, **kwargs):
        context = kwargs.get('context', {})
        if setting_name:
            context['setting_name'] = setting_name

        super().__init__(
            message=f"Configuration error: {message}",
            error_code="CONFIG_ERROR",
            context=context,
            **{k: v for k, v in kwargs.items() if k != 'context'}
        )


class ServiceError(PAM2Exception):
    """
    Generic service operation errors

    Base class for service-specific errors with
    additional service context information.
    """

    def __init__(self, message: str, service_name: str, operation: Optional[str] = None, **kwargs):
        context = kwargs.get('context', {})
        context.update({
            'service_name': service_name,
            'operation': operation
        })

        super().__init__(
            message=f"Service error in {service_name}: {message}",
            error_code="SERVICE_ERROR",
            context=context,
            **{k: v for k, v in kwargs.items() if k != 'context'}
        )


class ValidationError(PAM2Exception):
    """
    Data validation errors

    Raised when input data doesn't meet
    expected format or business rules.
    """

    def __init__(self, message: str, field_name: Optional[str] = None, value: Any = None, **kwargs):
        context = kwargs.get('context', {})
        if field_name:
            context['field_name'] = field_name
        if value is not None:
            context['invalid_value'] = str(value)

        super().__init__(
            message=f"Validation error: {message}",
            error_code="VALIDATION_ERROR",
            context=context,
            **{k: v for k, v in kwargs.items() if k != 'context'}
        )


# Service-specific exceptions

class ConversationalEngineError(ServiceError):
    """
    Conversational Engine specific errors

    Covers AI model interactions, response generation,
    and conversation management issues.
    """

    def __init__(self, message: str, operation: Optional[str] = None, **kwargs):
        super().__init__(
            message=message,
            service_name="conversational_engine",
            operation=operation,
            **kwargs
        )


class ContextManagerError(ServiceError):
    """
    Context Manager specific errors

    Covers context storage, retrieval, and
    session management issues.
    """

    def __init__(self, message: str, operation: Optional[str] = None, **kwargs):
        super().__init__(
            message=message,
            service_name="context_manager",
            operation=operation,
            **kwargs
        )


class TripLoggerError(ServiceError):
    """
    Trip Logger specific errors

    Covers trip activity detection, entity extraction,
    and travel data processing issues.
    """

    def __init__(self, message: str, operation: Optional[str] = None, **kwargs):
        super().__init__(
            message=message,
            service_name="trip_logger",
            operation=operation,
            **kwargs
        )


class SavingsTrackerError(ServiceError):
    """
    Savings Tracker specific errors

    Covers financial analysis, savings calculations,
    and budget tracking issues.
    """

    def __init__(self, message: str, operation: Optional[str] = None, **kwargs):
        super().__init__(
            message=message,
            service_name="savings_tracker",
            operation=operation,
            **kwargs
        )


class SafetyLayerError(ServiceError):
    """
    Safety Layer specific errors

    Covers content filtering, rate limiting,
    and security policy violations.
    """

    def __init__(self, message: str, operation: Optional[str] = None, **kwargs):
        super().__init__(
            message=message,
            service_name="safety_layer",
            operation=operation,
            **kwargs
        )


# Integration-specific exceptions

class GeminiAPIError(PAM2Exception):
    """
    Google Gemini API errors

    Covers API communication, authentication,
    and response parsing issues.
    """

    def __init__(self, message: str, api_response: Optional[str] = None, status_code: Optional[int] = None, **kwargs):
        context = kwargs.get('context', {})
        if api_response:
            context['api_response'] = api_response
        if status_code:
            context['status_code'] = status_code

        super().__init__(
            message=f"Gemini API error: {message}",
            error_code="GEMINI_API_ERROR",
            context=context,
            **{k: v for k, v in kwargs.items() if k != 'context'}
        )


class RedisError(PAM2Exception):
    """
    Redis connection and operation errors

    Covers cache operations, connection issues,
    and data serialization problems.
    """

    def __init__(self, message: str, operation: Optional[str] = None, **kwargs):
        context = kwargs.get('context', {})
        if operation:
            context['redis_operation'] = operation

        super().__init__(
            message=f"Redis error: {message}",
            error_code="REDIS_ERROR",
            context=context,
            **{k: v for k, v in kwargs.items() if k != 'context'}
        )


class RateLimitExceededError(PAM2Exception):
    """
    Rate limiting violations

    Raised when users exceed configured
    message rate limits.
    """

    def __init__(self, message: str, user_id: str, limit_type: str, **kwargs):
        context = kwargs.get('context', {})
        context.update({
            'user_id': user_id,
            'limit_type': limit_type
        })

        super().__init__(
            message=f"Rate limit exceeded: {message}",
            error_code="RATE_LIMIT_EXCEEDED",
            context=context,
            **{k: v for k, v in kwargs.items() if k != 'context'}
        )


class ContentFilterError(PAM2Exception):
    """
    Content safety filtering errors

    Raised when content violates safety policies
    or filtering rules.
    """

    def __init__(self, message: str, content_type: Optional[str] = None, **kwargs):
        context = kwargs.get('context', {})
        if content_type:
            context['content_type'] = content_type

        super().__init__(
            message=f"Content filter error: {message}",
            error_code="CONTENT_FILTER_ERROR",
            context=context,
            **{k: v for k, v in kwargs.items() if k != 'context'}
        )


# Utility functions for error handling

def handle_service_error(func):
    """
    Decorator for service methods to standardize error handling

    Catches common exceptions and converts them to appropriate
    PAM 2.0 exception types with context information.
    """
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except PAM2Exception:
            # Re-raise PAM 2.0 exceptions as-is
            raise
        except ValueError as e:
            raise ValidationError(str(e), original_error=e)
        except ConnectionError as e:
            raise ServiceError(f"Connection error: {str(e)}", service_name="unknown", original_error=e)
        except Exception as e:
            raise ServiceError(f"Unexpected error: {str(e)}", service_name="unknown", original_error=e)

    return wrapper


async def handle_async_service_error(func):
    """
    Async version of service error handler decorator

    Provides the same error handling for async service methods.
    """
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except PAM2Exception:
            # Re-raise PAM 2.0 exceptions as-is
            raise
        except ValueError as e:
            raise ValidationError(str(e), original_error=e)
        except ConnectionError as e:
            raise ServiceError(f"Connection error: {str(e)}", service_name="unknown", original_error=e)
        except Exception as e:
            raise ServiceError(f"Unexpected error: {str(e)}", service_name="unknown", original_error=e)

    return wrapper