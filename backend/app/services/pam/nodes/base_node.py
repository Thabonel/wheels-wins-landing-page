"""
Base Node - Common functionality for all PAM nodes
"""
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any
from app.models.domain.pam import PamResponse

logger = logging.getLogger(__name__)

class BaseNode(ABC):
    """Base class for all PAM processing nodes"""
    
    def __init__(self, node_name: str):
        self.node_name = node_name
        self.logger = logging.getLogger(f"pam.{node_name}")
    
    @abstractmethod
    async def process(self, input_data: Dict[str, Any]) -> PamResponse:
        """Process input data and return a response"""
        pass
    
    def _create_error_response(self, error_message: str) -> PamResponse:
        """Create a standardized error response"""
        return PamResponse(
            content=error_message,
            confidence=0.0,
            suggestions=["Try rephrasing your question", "Ask for help"],
            requires_followup=False
        )
    
    def _log_processing(self, message: str, response: PamResponse):
        """Log processing activity"""
        self.logger.info(f"Processed message in {self.node_name} node: confidence={response.confidence}")
    
    async def initialize(self):
        """Initialize node - override in subclasses if needed"""
        self.logger.info(f"{self.node_name} node initialized")
