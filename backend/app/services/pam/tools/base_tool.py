"""
Base Tool - Common functionality for all PAM tools
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from app.core.logging import get_logger

# Import unified capabilities to prevent conflicts
from .tool_capabilities import ToolCapability, normalize_capability

logger = get_logger(__name__)

@dataclass
class ToolResult:
    """Standard result format for tool execution"""
    success: bool
    data: Any = None
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "success": self.success,
            "data": self.data,
            # Maintain backward compatibility for callers expecting a
            # ``result`` field while aligning with the newer ``data`` key.
            "result": self.data,
            "error": self.error,
            "metadata": self.metadata or {}
        }

class BaseTool(ABC):
    """Base class for all PAM tools"""

    def __init__(self, tool_name: str, description: str = "", capabilities: Optional[List[ToolCapability]] = None, user_jwt: Optional[str] = None):
        self.tool_name = tool_name
        self.description = description
        self.capabilities = capabilities or []
        self.user_jwt = user_jwt  # Store user JWT for database authentication
        self.logger = get_logger(f"pam.tools.{tool_name}")
        self.is_initialized = False
    
    @abstractmethod
    async def execute(self, user_id: str, parameters: Dict[str, Any] = None) -> ToolResult:
        """Execute the tool with given parameters"""
        pass
    
    def _create_error_result(self, error_message: str, metadata: Optional[Dict[str, Any]] = None) -> ToolResult:
        """Create a standardized error result"""
        return ToolResult(
            success=False,
            error=error_message,
            data=None,
            metadata=metadata
        )
    
    def _create_success_result(self, data: Any, metadata: Optional[Dict[str, Any]] = None) -> ToolResult:
        """Create a standardized success result"""
        return ToolResult(
            success=True,
            data=data,
            error=None,
            metadata=metadata
        )
    
    # Backward compatibility methods
    def _create_error_response(self, error_message: str) -> Dict[str, Any]:
        """Create a standardized error response (deprecated - use _create_error_result)"""
        return self._create_error_result(error_message).to_dict()
    
    def _create_success_response(self, data: Any) -> Dict[str, Any]:
        """Create a standardized success response (deprecated - use _create_success_result)"""
        return self._create_success_result(data).to_dict()
    
    async def initialize(self):
        """Initialize tool - override in subclasses if needed"""
        self.is_initialized = True
        self.logger.info(f"{self.tool_name} tool initialized")
        return True
    
    def get_capabilities(self) -> List[ToolCapability]:
        """Get tool capabilities"""
        return self.capabilities.copy()
    
    def has_capability(self, capability: ToolCapability) -> bool:
        """Check if tool has specific capability"""
        return capability in self.capabilities