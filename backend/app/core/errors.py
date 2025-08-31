"""
Enterprise-Grade Error Handling System
Based on industry best practices from Stripe, Twilio, AWS, etc.
"""

import json
import traceback
from typing import Dict, Any, Optional, List
from enum import Enum
from datetime import datetime
import uuid
import logging
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


class ErrorType(Enum):
    """Standard error types following industry patterns"""
    API_ERROR = "api_error"                    # Server-side API errors
    AUTHENTICATION_ERROR = "authentication_error"  # Authentication failures
    AUTHORIZATION_ERROR = "authorization_error"    # Permission denied
    RATE_LIMIT_ERROR = "rate_limit_error"         # Rate limit exceeded
    VALIDATION_ERROR = "validation_error"          # Invalid input/parameters
    NOT_FOUND_ERROR = "not_found_error"           # Resource not found
    CONFLICT_ERROR = "conflict_error"             # Resource conflict (e.g., duplicate)
    EXTERNAL_SERVICE_ERROR = "external_service_error"  # Third-party service errors
    NETWORK_ERROR = "network_error"               # Network/connectivity issues
    TIMEOUT_ERROR = "timeout_error"               # Request timeout
    INTERNAL_ERROR = "internal_error"             # Internal server errors


class ErrorSeverity(Enum):
    """Error severity levels for monitoring and alerting"""
    CRITICAL = "critical"  # System failure, immediate attention needed
    ERROR = "error"       # Error affecting functionality
    WARNING = "warning"   # Non-critical issues
    INFO = "info"        # Informational


class PAMError(Exception):
    """
    Custom exception class for PAM with rich error information
    Following patterns from Stripe, AWS, and other enterprise services
    """
    
    def __init__(
        self,
        message: str,
        error_type: ErrorType = ErrorType.INTERNAL_ERROR,
        error_code: Optional[str] = None,
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None,
        retry_after: Optional[int] = None,
        severity: ErrorSeverity = ErrorSeverity.ERROR,
        user_message: Optional[str] = None
    ):
        self.message = message
        self.error_type = error_type
        self.error_code = error_code or self._generate_error_code(error_type)
        self.status_code = status_code
        self.details = details or {}
        self.retry_after = retry_after
        self.severity = severity
        self.user_message = user_message or self._get_user_friendly_message(error_type)
        self.request_id = str(uuid.uuid4())
        self.timestamp = datetime.utcnow().isoformat()
        
        super().__init__(self.message)
    
    def _generate_error_code(self, error_type: ErrorType) -> str:
        """Generate standardized error codes"""
        codes = {
            ErrorType.API_ERROR: "PAM_API_001",
            ErrorType.AUTHENTICATION_ERROR: "PAM_AUTH_001",
            ErrorType.AUTHORIZATION_ERROR: "PAM_AUTHZ_001",
            ErrorType.RATE_LIMIT_ERROR: "PAM_RATE_001",
            ErrorType.VALIDATION_ERROR: "PAM_VAL_001",
            ErrorType.NOT_FOUND_ERROR: "PAM_404_001",
            ErrorType.CONFLICT_ERROR: "PAM_CONF_001",
            ErrorType.EXTERNAL_SERVICE_ERROR: "PAM_EXT_001",
            ErrorType.NETWORK_ERROR: "PAM_NET_001",
            ErrorType.TIMEOUT_ERROR: "PAM_TIME_001",
            ErrorType.INTERNAL_ERROR: "PAM_INT_001"
        }
        return codes.get(error_type, "PAM_UNK_001")
    
    def _get_user_friendly_message(self, error_type: ErrorType) -> str:
        """Get user-friendly error messages"""
        messages = {
            ErrorType.API_ERROR: "We're experiencing technical difficulties. Please try again.",
            ErrorType.AUTHENTICATION_ERROR: "Please sign in to continue.",
            ErrorType.AUTHORIZATION_ERROR: "You don't have permission to access this resource.",
            ErrorType.RATE_LIMIT_ERROR: "You're making requests too quickly. Please slow down.",
            ErrorType.VALIDATION_ERROR: "The information provided is invalid. Please check and try again.",
            ErrorType.NOT_FOUND_ERROR: "The requested resource could not be found.",
            ErrorType.CONFLICT_ERROR: "There was a conflict with your request. Please try again.",
            ErrorType.EXTERNAL_SERVICE_ERROR: "One of our services is temporarily unavailable.",
            ErrorType.NETWORK_ERROR: "We're having trouble connecting. Please check your internet connection.",
            ErrorType.TIMEOUT_ERROR: "The request took too long to complete. Please try again.",
            ErrorType.INTERNAL_ERROR: "Something went wrong on our end. We're working to fix it."
        }
        return messages.get(error_type, "An unexpected error occurred.")
    
    def to_dict(self, include_technical: bool = False) -> Dict[str, Any]:
        """Convert error to dictionary format for API responses"""
        error_dict = {
            "error": {
                "type": self.error_type.value,
                "code": self.error_code,
                "message": self.user_message,
                "request_id": self.request_id,
                "timestamp": self.timestamp
            }
        }
        
        # Add retry information if applicable
        if self.retry_after:
            error_dict["error"]["retry_after"] = self.retry_after
        
        # Include technical details in development/debugging
        if include_technical:
            error_dict["error"]["technical_details"] = {
                "message": self.message,
                "details": self.details,
                "severity": self.severity.value
            }
        
        return error_dict


class ErrorTracker:
    """
    Enterprise error tracking with circuit breaker pattern
    Similar to implementations in Netflix Hystrix, AWS SDK, etc.
    """
    
    def __init__(self, threshold: int = 5, timeout: int = 60, window: int = 300):
        self.threshold = threshold  # Number of errors before opening circuit
        self.timeout = timeout      # Seconds to wait before half-opening
        self.window = window        # Time window for error counting
        
        self.errors: List[Dict[str, Any]] = []
        self.circuit_state = "closed"  # closed, open, half-open
        self.last_failure_time = None
        self.consecutive_successes = 0
        
        # Metrics
        self.total_errors = 0
        self.errors_by_type: Dict[str, int] = {}
        self.errors_by_code: Dict[str, int] = {}
    
    def record_error(self, error: PAMError) -> None:
        """Record an error occurrence"""
        self.total_errors += 1
        
        # Track error types
        error_type = error.error_type.value
        self.errors_by_type[error_type] = self.errors_by_type.get(error_type, 0) + 1
        
        # Track error codes
        self.errors_by_code[error.error_code] = self.errors_by_code.get(error.error_code, 0) + 1
        
        # Add to recent errors
        error_record = {
            "timestamp": datetime.utcnow(),
            "error_type": error_type,
            "error_code": error.error_code,
            "message": error.message,
            "severity": error.severity.value,
            "request_id": error.request_id
        }
        
        self.errors.append(error_record)
        self.last_failure_time = datetime.utcnow()
        
        # Clean old errors outside window
        cutoff_time = datetime.utcnow().timestamp() - self.window
        self.errors = [
            e for e in self.errors 
            if e["timestamp"].timestamp() > cutoff_time
        ]
        
        # Check if circuit should open
        recent_errors = len(self.errors)
        if recent_errors >= self.threshold and self.circuit_state == "closed":
            self.open_circuit()
        
        # Log critical errors
        if error.severity == ErrorSeverity.CRITICAL:
            logger.critical(f"Critical error: {error.error_code} - {error.message}")
            # Here you would trigger alerts (PagerDuty, CloudWatch, etc.)
    
    def record_success(self) -> None:
        """Record a successful operation"""
        self.consecutive_successes += 1
        
        # Close circuit after consecutive successes in half-open state
        if self.circuit_state == "half-open" and self.consecutive_successes >= 3:
            self.close_circuit()
    
    def open_circuit(self) -> None:
        """Open the circuit breaker"""
        self.circuit_state = "open"
        self.consecutive_successes = 0
        logger.warning("Circuit breaker opened due to high error rate")
    
    def close_circuit(self) -> None:
        """Close the circuit breaker"""
        self.circuit_state = "closed"
        self.errors = []
        logger.info("Circuit breaker closed")
    
    def half_open_circuit(self) -> None:
        """Put circuit in half-open state for testing"""
        self.circuit_state = "half-open"
        self.consecutive_successes = 0
        logger.info("Circuit breaker half-opened for testing")
    
    def is_open(self) -> bool:
        """Check if circuit breaker is open"""
        if self.circuit_state == "closed":
            return False
        
        if self.circuit_state == "open":
            # Check if timeout has passed
            if self.last_failure_time:
                time_since_failure = (datetime.utcnow() - self.last_failure_time).seconds
                if time_since_failure > self.timeout:
                    self.half_open_circuit()
                    return False
            return True
        
        return False  # half-open allows requests
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get error tracking metrics"""
        return {
            "circuit_state": self.circuit_state,
            "total_errors": self.total_errors,
            "recent_errors": len(self.errors),
            "errors_by_type": self.errors_by_type,
            "errors_by_code": self.errors_by_code,
            "threshold": self.threshold,
            "consecutive_successes": self.consecutive_successes
        }


class ErrorHandler:
    """
    Centralized error handler for the application
    Implements patterns from enterprise SaaS platforms
    """
    
    def __init__(self):
        self.tracker = ErrorTracker()
        
    async def handle_exception(
        self, 
        request: Request, 
        exc: Exception
    ) -> JSONResponse:
        """Global exception handler for FastAPI"""
        
        # Handle PAMError specifically
        if isinstance(exc, PAMError):
            self.tracker.record_error(exc)
            
            # Check if we should include technical details
            include_technical = request.headers.get("X-Debug-Mode") == "true"
            
            response_data = exc.to_dict(include_technical)
            
            # Add CORS headers if needed
            headers = {
                "X-Request-Id": exc.request_id,
                "X-Error-Code": exc.error_code
            }
            
            if exc.retry_after:
                headers["Retry-After"] = str(exc.retry_after)
            
            return JSONResponse(
                status_code=exc.status_code,
                content=response_data,
                headers=headers
            )
        
        # Handle FastAPI/Starlette HTTP exceptions
        if isinstance(exc, (HTTPException, StarletteHTTPException)):
            error = PAMError(
                message=str(exc.detail),
                error_type=self._map_http_to_error_type(exc.status_code),
                status_code=exc.status_code,
                user_message=str(exc.detail)
            )
            self.tracker.record_error(error)
            
            return JSONResponse(
                status_code=exc.status_code,
                content=error.to_dict(),
                headers={"X-Request-Id": error.request_id}
            )
        
        # Handle unexpected exceptions
        request_id = str(uuid.uuid4())
        logger.error(
            f"Unhandled exception (request_id: {request_id}): {exc}",
            exc_info=True,
            extra={
                "request_id": request_id,
                "path": request.url.path,
                "method": request.method
            }
        )
        
        # Create generic error for unexpected exceptions
        error = PAMError(
            message=str(exc),
            error_type=ErrorType.INTERNAL_ERROR,
            status_code=500,
            severity=ErrorSeverity.ERROR
        )
        error.request_id = request_id
        self.tracker.record_error(error)
        
        # Don't expose internal errors in production
        if request.headers.get("X-Debug-Mode") != "true":
            error.message = "An unexpected error occurred"
        
        return JSONResponse(
            status_code=500,
            content=error.to_dict(include_technical=False),
            headers={"X-Request-Id": request_id}
        )
    
    def _map_http_to_error_type(self, status_code: int) -> ErrorType:
        """Map HTTP status codes to error types"""
        if status_code == 401:
            return ErrorType.AUTHENTICATION_ERROR
        elif status_code == 403:
            return ErrorType.AUTHORIZATION_ERROR
        elif status_code == 404:
            return ErrorType.NOT_FOUND_ERROR
        elif status_code == 409:
            return ErrorType.CONFLICT_ERROR
        elif status_code == 422:
            return ErrorType.VALIDATION_ERROR
        elif status_code == 429:
            return ErrorType.RATE_LIMIT_ERROR
        elif status_code == 503:
            return ErrorType.EXTERNAL_SERVICE_ERROR
        elif status_code == 504:
            return ErrorType.TIMEOUT_ERROR
        elif 400 <= status_code < 500:
            return ErrorType.VALIDATION_ERROR
        else:
            return ErrorType.API_ERROR
    
    def check_circuit(self) -> None:
        """Check if circuit breaker allows request"""
        if self.tracker.is_open():
            raise PAMError(
                message="Service temporarily unavailable due to high error rate",
                error_type=ErrorType.EXTERNAL_SERVICE_ERROR,
                status_code=503,
                retry_after=60,
                severity=ErrorSeverity.WARNING
            )


# Global error handler instance
error_handler = ErrorHandler()


# Convenience functions for common errors
def raise_authentication_error(message: str = "Authentication required") -> None:
    """Raise an authentication error"""
    raise PAMError(
        message=message,
        error_type=ErrorType.AUTHENTICATION_ERROR,
        status_code=401
    )


def raise_authorization_error(message: str = "Insufficient permissions") -> None:
    """Raise an authorization error"""
    raise PAMError(
        message=message,
        error_type=ErrorType.AUTHORIZATION_ERROR,
        status_code=403
    )


def raise_validation_error(message: str, details: Optional[Dict] = None) -> None:
    """Raise a validation error"""
    raise PAMError(
        message=message,
        error_type=ErrorType.VALIDATION_ERROR,
        status_code=422,
        details=details
    )


def raise_not_found_error(resource: str = "Resource") -> None:
    """Raise a not found error"""
    raise PAMError(
        message=f"{resource} not found",
        error_type=ErrorType.NOT_FOUND_ERROR,
        status_code=404
    )


def raise_rate_limit_error(retry_after: int = 60) -> None:
    """Raise a rate limit error"""
    raise PAMError(
        message="Rate limit exceeded",
        error_type=ErrorType.RATE_LIMIT_ERROR,
        status_code=429,
        retry_after=retry_after
    )


def raise_external_service_error(service: str, message: str) -> None:
    """Raise an external service error"""
    raise PAMError(
        message=f"{service} error: {message}",
        error_type=ErrorType.EXTERNAL_SERVICE_ERROR,
        status_code=503,
        details={"service": service}
    )