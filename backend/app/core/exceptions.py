"""
PAM Exception Classes and Error Codes
"""
from enum import Enum
from typing import Any, Dict, Optional


class ErrorCode(Enum):
    """Standard error codes for PAM system"""
    # General errors
    INTERNAL_SERVER_ERROR = "internal_server_error"
    INVALID_REQUEST = "invalid_request"
    AUTHENTICATION_FAILED = "authentication_failed"
    PERMISSION_DENIED = "permission_denied"
    CONFIGURATION_ERROR = "configuration_error"
    
    # Database errors
    DATABASE_CONNECTION_ERROR = "database_connection_error"
    DATABASE_OPERATION_ERROR = "database_operation_error"
    
    # Cache errors
    CACHE_CONNECTION_ERROR = "cache_connection_error"
    CACHE_OPERATION_ERROR = "cache_operation_error"
    
    # PAM specific errors
    PAM_ORCHESTRATOR_ERROR = "pam_orchestrator_error"
    PAM_SERVICE_UNAVAILABLE = "pam_service_unavailable"
    PAM_TIMEOUT = "pam_timeout"
    EXTERNAL_SERVICE_UNAVAILABLE = "external_service_unavailable"
    AI_SERVICE_ERROR = "ai_service_error"
    
    # WebSocket errors
    WEBSOCKET_CONNECTION_ERROR = "websocket_connection_error"
    WEBSOCKET_AUTHENTICATION_ERROR = "websocket_authentication_error"
    
    # Voice/TTS errors
    TTS_SERVICE_ERROR = "tts_service_error"
    VOICE_PROCESSING_ERROR = "voice_processing_error"
    
    # Rate limiting errors
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    
    # Validation errors
    INVALID_INPUT = "invalid_input"
    SCHEMA_VALIDATION_ERROR = "schema_validation_error"


class PAMError(Exception):
    """Base exception class for PAM system errors"""
    
    def __init__(
        self,
        message: str,
        error_code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None,
        user_message: Optional[str] = None
    ):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        self.user_message = user_message or message
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for JSON serialization"""
        return {
            "error": True,
            "error_code": self.error_code.value,
            "message": self.message,
            "user_message": self.user_message,
            "details": self.details
        }
    
    def __str__(self) -> str:
        return f"PAMError({self.error_code.value}): {self.message}"


class AuthenticationError(PAMError):
    """Authentication related errors"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code=ErrorCode.AUTHENTICATION_FAILED,
            details=details,
            user_message="Authentication failed. Please log in again."
        )


class PermissionError(PAMError):
    """Permission and authorization errors"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code=ErrorCode.PERMISSION_DENIED,
            details=details,
            user_message="You don't have permission to access this resource."
        )


class ValidationError(PAMError):
    """Input validation errors"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code=ErrorCode.INVALID_INPUT,
            details=details,
            user_message="Invalid input provided."
        )


class ServiceUnavailableError(PAMError):
    """Service unavailability errors"""
    
    def __init__(self, service_name: str, details: Optional[Dict[str, Any]] = None):
        message = f"{service_name} service is currently unavailable"
        super().__init__(
            message=message,
            error_code=ErrorCode.PAM_SERVICE_UNAVAILABLE,
            details=details,
            user_message="Service is temporarily unavailable. Please try again later."
        )


class RateLimitError(PAMError):
    """Rate limiting errors"""
    
    def __init__(self, message: str, retry_after: int = 60, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code=ErrorCode.RATE_LIMIT_EXCEEDED,
            details={**(details or {}), "retry_after": retry_after},
            user_message="Too many requests. Please wait before trying again."
        )