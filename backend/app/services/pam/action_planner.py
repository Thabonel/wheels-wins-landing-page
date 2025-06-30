from typing import Dict, Any
from .intent_classifier import IntentClassifier, IntentType, IntentResult
from .nodes.wins_node import wins_node
from .nodes.wheels_node import wheels_node
from .nodes.social_node import social_node
from .nodes.you_node import you_node
from .nodes.shop_node import shop_node
from .nodes.admin_node import admin_node

class ActionPlanner:
    def __init__(self):
        self.classifier = IntentClassifier()
        self.node_map = {
            IntentType.WINS: wins_node,
            IntentType.WHEELS: wheels_node,
            IntentType.SOCIAL: social_node,
            IntentType.YOU: you_node,
            IntentType.SHOP: shop_node,
            IntentType.ADMIN: admin_node,
        }

    async def plan(self, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        result: IntentResult = await self.classifier.classify(message)
        node = self.node_map.get(result.intent)
        if node and hasattr(node, "process"):
            return await node.process(message, context)
        return {
            "type": "message",
            "content": message,
        }

orchestrator = ActionPlanner()
