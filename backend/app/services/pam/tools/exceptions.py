"""
PAM Tool Exceptions

Specific exceptions for different failure modes to enable better error handling,
debugging, and user-facing error messages.
"""


class ToolExecutionError(Exception):
    """Base exception for tool execution errors"""

    def __init__(self, message: str, context: dict = None):
        super().__init__(message)
        self.context = context or {}


class ValidationError(ToolExecutionError):
    """Input validation failed - user provided invalid data"""
    pass


class DatabaseError(ToolExecutionError):
    """Database operation failed - could be connection, query, or RLS issue"""
    pass


class ExternalAPIError(ToolExecutionError):
    """External API call failed - timeout, quota, or invalid response"""
    pass


class AuthorizationError(ToolExecutionError):
    """User not authorized for operation - failed RLS or missing permissions"""
    pass


class ResourceNotFoundError(ToolExecutionError):
    """Requested resource does not exist"""
    pass


class ConflictError(ToolExecutionError):
    """Operation conflicts with existing data - duplicate, constraint violation"""
    pass
