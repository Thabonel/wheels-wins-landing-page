from typing import Dict, Any
from app.core.logging import setup_logging
from .base_node import BaseNode

class ShopNode(BaseNode):
    """Handles e-commerce features"""

    def __init__(self):
        super().__init__("shop")

    async def process(self, input_data: Dict[str, Any]):
        self.logger.info("Shop node invoked")
        return {
            "content": "Shopping features are not implemented yet.",
            "confidence": 0.5,
            "actions": [],
        }

shop_node = ShopNode()
