```python
# app/core/orchestrator.py
from typing import Dict, List, Any
from enum import Enum
import json
import logging
from app.core.config import settings
from app.nodes.wins_node import wins_node
from app.nodes.wheels_node import wheels_node
from app.nodes.social_node import social_node
from app.nodes.you_node import you_node
import openai

# Import the scraping function
from scraper_service.main import fetch_and_parse

logger = logging.getLogger("pam")

class Domain(Enum):
    WHEELS = "wheels"
    WINS = "wins"
    SOCIAL = "social"
    YOU = "you"
    SHOP = "shop"
    GENERAL = "general"

class ActionType(Enum):
    VIEW = "view"
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    NAVIGATE = "navigate"
    HELP = "help"
    PLAN = "plan"
    TRACK = "track"
    ANALYZE = "analyze"

class Intent:
    def __init__(self, domain: Domain, action: ActionType, entities: Dict[str, Any], confidence: float):
        self.domain = domain
        self.action = action
        self.entities = entities
        self.confidence = confidence

# ... include existing classifier and planner code here ...

class ActionPlanner:
    def __init__(self):
        self.classifier = IntentClassifier()

    async def plan(self, message: str, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Create comprehensive action plan from user message"""
        intent = self.classifier.classify(message, context)
        actions = []
        # If user asks for campsites, trigger scraper
        if intent.domain == Domain.WHEELS and "camp" in message.lower():
            # Use OVERPASS_URL from config
            # settings.OVERPASS_URL includes the Overpass query
            results = await fetch_and_parse(settings.OVERPASS_URL)
            # Add summary message
            actions.append({
                "type": "message",
                "content": f"Found {len(results)} free campsites nearby."
            })
            # Add data_render action with full results
            actions.append({
                "type": "data_render",
                "data": results
            })
            return actions
        # Fallback to existing node-based planning
        try:
            # existing intent routing...
            pass
        except Exception as e:
            logger.error(f"Error in action planning: {e}")
            return [{
                "type": "error",
                "content": f"I encountered an error: {e}"
            }]
        return actions

# Create global orchestrator instance
orchestrator = ActionPlanner()
```
