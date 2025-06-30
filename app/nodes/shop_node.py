from typing import Dict, Any
from app.core.logging import setup_logging

class ShopNode:
    """Handles e-commerce related requests"""

    def __init__(self):
        self.logger = setup_logging("shop_node")

    async def process(self, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Process shop-related messages"""
        self.logger.info("Shop node invoked")
        return {
            "type": "message",
            "content": "Shopping features are not implemented yet.",
        }

shop_node = ShopNode()
