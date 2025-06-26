
"""
Base Node - Common functionality for all PAM nodes
"""

import logging
from abc import ABC, abstractmethod
from typing import Dict, List, Any

from app.models.domain.pam import PamResponse, PamContext, PamMemory

logger = logging.getLogger("pam.base_node")

class BaseNode(ABC):
    """Base class for all PAM processing nodes"""
    
    def __init__(self, node_name: str):
        self.node_name = node_name
        self.logger = logging.getLogger(f"pam.{node_name}")
    
    @abstractmethod
    async def process(self, message: str, intent: Any, context: PamContext, 
                     memories: List[PamMemory]) -> PamResponse:
        """Process a message and return a response"""
        pass
    
    def _create_error_response(self, error_message: str) -> PamResponse:
        """Create a standardized error response"""
        return PamResponse(
            content=error_message,
            intent=None,
            confidence=0.0,
            suggestions=["Try rephrasing your question", "Ask for help"],
            actions=[],
            requires_followup=False,
            context_updates={},
            voice_enabled=False
        )
    
    def _log_processing(self, message: str, response: PamResponse):
        """Log processing activity"""
        self.logger.info(f"Processed message in {self.node_name} node: confidence={response.confidence}")
