
"""
Comprehensive exception handling system for PAM backend.
Provides structured error handling with proper HTTP status code mapping.
"""

from typing import Optional, Dict, Any
from enum import Enum


class ErrorCode(Enum):
    """Error codes for categorizing different types of errors."""
    
    # Authentication & Authorization
    AUTH_INVALID_CREDENTIALS = "AUTH_001"
    AUTH_TOKEN_EXPIRED = "AUTH_002"
    AUTH_TOKEN_INVALID = "AUTH_003"
    AUTH_INSUFFICIENT_PERMISSIONS = "AUTH_004"
    AUTH_ACCOUNT_DISABLED = "AUTH_005"
    
    # Validation
    VALIDATION_REQUIRED_FIELD = "VAL_001"
    VALIDATION_INVALID_FORMAT = "VAL_002"
    VALIDATION_OUT_OF_RANGE = "VAL_003"
    VALIDATION_DUPLICATE_VALUE = "VAL_004"
    
    # External Services
    EXTERNAL_SERVICE_UNAVAILABLE = "EXT_001"
    EXTERNAL_API_ERROR = "EXT_002"
    EXTERNAL_TIMEOUT = "EXT_003"
    EXTERNAL_RATE_LIMITED = "EXT_004"
    
    # Database
    DATABASE_CONNECTION_ERROR = "DB_001"
    DATABASE_QUERY_ERROR = "DB_002"
    DATABASE_CONSTRAINT_ERROR = "DB_003"
    DATABASE_TRANSACTION_ERROR = "DB_004"
    
    # Cache
    CACHE_CONNECTION_ERROR = "CACHE_001"
    CACHE_OPERATION_ERROR = "CACHE_002"
    CACHE_SERIALIZATION_ERROR = "CACHE_003"
    
    # Rate Limiting
    RATE_LIMIT_EXCEEDED = "RATE_001"
    RATE_LIMIT_WINDOW_ERROR = "RATE_002"
    
    # WebSocket
    WEBSOCKET_CONNECTION_ERROR = "WS_001"
    WEBSOCKET_MESSAGE_ERROR = "WS_002"
    WEBSOCKET_AUTHENTICATION_ERROR = "WS_003"
    
    # PAM Node Processing
    NODE_PROCESSING_ERROR = "NODE_001"
    NODE_INITIALIZATION_ERROR = "NODE_002"
    NODE_COMMUNICATION_ERROR = "NODE_003"
    NODE_TIMEOUT_ERROR = "NODE_004"
    
    # PAM Memory System
    MEMORY_STORAGE_ERROR = "MEM_001"
    MEMORY_RETRIEVAL_ERROR = "MEM_002"
    MEMORY_CONTEXT_ERROR = "MEM_003"
    MEMORY_OVERFLOW_ERROR = "MEM_004"
    
    # General
    INTERNAL_SERVER_ERROR = "GEN_001"
    CONFIGURATION_ERROR = "GEN_002"
    RESOURCE_NOT_FOUND = "GEN_003"


class PamException(Exception):
    """
    Base exception class for all PAM-related errors.
    Provides structured error information for consistent handling.
    """
    
    def __init__(
        self,
        message: str,
        error_code: ErrorCode,
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None,
        user_message: Optional[str] = None
    ):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        self.user_message = user_message or self._get_default_user_message()
    
    def _get_default_user_message(self) -> str:
        """Generate a user-friendly message based on error code."""
        return "An error occurred while processing your request. Please try again."
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for API responses."""
        return {
            "error": {
                "code": self.error_code.value,
                "message": self.user_message,
                "details": self.details
            }
        }


class AuthenticationError(PamException):
    """Raised when authentication fails."""
    
    def __init__(
        self,
        message: str = "Authentication failed",
        error_code: ErrorCode = ErrorCode.AUTH_INVALID_CREDENTIALS,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=401,
            details=details,
            user_message="Please check your credentials and try again."
        )


class AuthorizationError(PamException):
    """Raised when user lacks necessary permissions."""
    
    def __init__(
        self,
        message: str = "Access denied",
        error_code: ErrorCode = ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=403,
            details=details,
            user_message="You don't have permission to access this resource."
        )


class ValidationError(PamException):
    """Raised when input validation fails."""
    
    def __init__(
        self,
        message: str = "Validation failed",
        error_code: ErrorCode = ErrorCode.VALIDATION_REQUIRED_FIELD,
        details: Optional[Dict[str, Any]] = None,
        field_name: Optional[str] = None
    ):
        if field_name:
            details = details or {}
            details["field"] = field_name
            
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=400,
            details=details,
            user_message="Please check your input and try again."
        )


class ExternalServiceError(PamException):
    """Raised when external service calls fail."""
    
    def __init__(
        self,
        message: str = "External service error",
        error_code: ErrorCode = ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
        details: Optional[Dict[str, Any]] = None,
        service_name: Optional[str] = None
    ):
        if service_name:
            details = details or {}
            details["service"] = service_name
            
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=502,
            details=details,
            user_message="A required service is currently unavailable. Please try again later."
        )


class DatabaseError(PamException):
    """Raised when database operations fail."""
    
    def __init__(
        self,
        message: str = "Database operation failed",
        error_code: ErrorCode = ErrorCode.DATABASE_CONNECTION_ERROR,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=500,
            details=details,
            user_message="A database error occurred. Please try again."
        )


class CacheError(PamException):
    """Raised when cache operations fail."""
    
    def __init__(
        self,
        message: str = "Cache operation failed",
        error_code: ErrorCode = ErrorCode.CACHE_CONNECTION_ERROR,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=500,
            details=details,
            user_message="A temporary error occurred. Please try again."
        )


class RateLimitError(PamException):
    """Raised when rate limits are exceeded."""
    
    def __init__(
        self,
        message: str = "Rate limit exceeded",
        error_code: ErrorCode = ErrorCode.RATE_LIMIT_EXCEEDED,
        details: Optional[Dict[str, Any]] = None,
        retry_after: Optional[int] = None
    ):
        if retry_after:
            details = details or {}
            details["retry_after"] = retry_after
            
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=429,
            details=details,
            user_message="You're making requests too quickly. Please wait and try again."
        )


class WebSocketError(PamException):
    """Raised when WebSocket operations fail."""
    
    def __init__(
        self,
        message: str = "WebSocket error",
        error_code: ErrorCode = ErrorCode.WEBSOCKET_CONNECTION_ERROR,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=500,
            details=details,
            user_message="Connection error. Please refresh and try again."
        )


class NodeProcessingError(PamException):
    """Raised when PAM node processing fails."""
    
    def __init__(
        self,
        message: str = "Node processing failed",
        error_code: ErrorCode = ErrorCode.NODE_PROCESSING_ERROR,
        details: Optional[Dict[str, Any]] = None,
        node_type: Optional[str] = None
    ):
        if node_type:
            details = details or {}
            details["node_type"] = node_type
            
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=500,
            details=details,
            user_message="PAM encountered an error processing your request. Please try again."
        )


class MemoryError(PamException):
    """Raised when PAM memory system operations fail."""
    
    def __init__(
        self,
        message: str = "Memory system error",
        error_code: ErrorCode = ErrorCode.MEMORY_STORAGE_ERROR,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=500,
            details=details,
            user_message="PAM's memory system encountered an error. Please try again."
        )


# Exception mapping for HTTP status codes
EXCEPTION_STATUS_MAP = {
    AuthenticationError: 401,
    AuthorizationError: 403,
    ValidationError: 400,
    ExternalServiceError: 502,
    DatabaseError: 500,
    CacheError: 500,
    RateLimitError: 429,
    WebSocketError: 500,
    NodeProcessingError: 500,
    MemoryError: 500,
    PamException: 500,
}


def get_exception_status_code(exception: Exception) -> int:
    """Get HTTP status code for an exception."""
    for exc_type, status_code in EXCEPTION_STATUS_MAP.items():
        if isinstance(exception, exc_type):
            return status_code
    return 500  # Default to internal server error


# Aliases for backward compatibility
PAMError = PamException
PermissionError = AuthorizationError
