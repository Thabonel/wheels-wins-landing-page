from typing import Dict, Any
from app.core.logging import setup_logging
from .base_node import BaseNode

class AdminNode(BaseNode):
    """Administrative control node"""

    def __init__(self):
        super().__init__("admin")

    async def process(self, input_data: Dict[str, Any]):
        self.logger.info("Admin node invoked")
        return {
            "content": "Admin features are under construction.",
            "confidence": 0.5,
            "actions": [],
        }

admin_node = AdminNode()
