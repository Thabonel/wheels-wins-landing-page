"""
PAM 2.0 Custom Exceptions
Clean error handling for all PAM services
"""

from typing import Optional, Dict, Any

class PAMBaseException(Exception):
    """Base exception for all PAM 2.0 errors"""

    def __init__(
        self,
        message: str,
        error_code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.error_code = error_code or self.__class__.__name__
        self.details = details or {}
        super().__init__(self.message)

# =====================================================
# Service-Specific Exceptions
# =====================================================

class ConversationalEngineError(PAMBaseException):
    """Errors from the conversational engine service"""
    pass

class GeminiAPIError(ConversationalEngineError):
    """Google Gemini API-specific errors"""
    pass

class ContextManagerError(PAMBaseException):
    """Errors from the context manager service"""
    pass

class TripLoggerError(PAMBaseException):
    """Errors from the trip logger service"""
    pass

class SavingsTrackerError(PAMBaseException):
    """Errors from the savings tracker service"""
    pass

class SafetyLayerError(PAMBaseException):
    """Errors from the safety layer service"""
    pass

# =====================================================
# Integration Exceptions
# =====================================================

class MCPServerError(PAMBaseException):
    """MCP Server integration errors"""
    pass

class RedisConnectionError(PAMBaseException):
    """Redis connection and operation errors"""
    pass

class GuardrailsViolation(PAMBaseException):
    """Content safety or rate limiting violations"""
    pass

# =====================================================
# API Exceptions
# =====================================================

class ValidationError(PAMBaseException):
    """Request validation errors"""
    pass

class AuthenticationError(PAMBaseException):
    """Authentication and authorization errors"""
    pass

class RateLimitExceeded(PAMBaseException):
    """Rate limiting errors"""
    pass

class ServiceUnavailable(PAMBaseException):
    """Service temporarily unavailable"""
    pass

# =====================================================
# Utility Functions
# =====================================================

def format_error_response(exception: PAMBaseException) -> Dict[str, Any]:
    """Format exception for API response"""
    return {
        "error": True,
        "error_code": exception.error_code,
        "message": exception.message,
        "details": exception.details
    }

def create_service_error(
    service_name: str,
    message: str,
    error_code: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
) -> PAMBaseException:
    """Create a service-specific error"""

    service_exceptions = {
        "conversational_engine": ConversationalEngineError,
        "context_manager": ContextManagerError,
        "trip_logger": TripLoggerError,
        "savings_tracker": SavingsTrackerError,
        "safety_layer": SafetyLayerError
    }

    exception_class = service_exceptions.get(service_name, PAMBaseException)
    return exception_class(message, error_code, details)