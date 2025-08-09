"""
Base Tool - Common functionality for all PAM tools
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from app.core.logging import get_logger

logger = get_logger(__name__)

class BaseTool(ABC):
    """Base class for all PAM tools"""
    
    def __init__(self, tool_name: str):
        self.tool_name = tool_name
        self.logger = get_logger(f"pam.tools.{tool_name}")
    
    @abstractmethod
    async def execute(self, user_id: str, parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        """Execute the tool with given parameters"""
        pass
    
    def _create_error_response(self, error_message: str) -> Dict[str, Any]:
        """Create a standardized error response"""
        return {
            "success": False,
            "error": error_message,
            "data": None
        }
    
    def _create_success_response(self, data: Any) -> Dict[str, Any]:
        """Create a standardized success response"""
        return {
            "success": True,
            "error": None,
            "data": data
        }
    
    async def initialize(self):
        """Initialize tool - override in subclasses if needed"""
        self.logger.info(f"{self.tool_name} tool initialized")