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
try:
    from scraper_service.main import fetch_and_parse
except ImportError:
    fetch_and_parse = None

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
    DATA_RENDER = "data_render"

class Intent:
    def __init__(self, domain: Domain, action: ActionType, entities: Dict[str, Any], confidence: float):
        self.domain = domain
        self.action = action
        self.entities = entities
        self.confidence = confidence

class IntentClassifier:
    def __init__(self):
        openai.api_key = settings.OPENAI_API_KEY
          
    def classify(self, message: str, context: Dict[str, Any]) -> Intent:
        message_lower = message.lower()
        domain = self._detect_domain(message_lower)
        action = self._detect_action(message_lower)
        entities = self._extract_entities(message, domain)
        return Intent(domain, action, entities, 0.85)
    
    # (retain existing _detect_domain, _detect_action, _extract_entities, etc...)

class ActionPlanner:
    def __init__(self):
        self.classifier = IntentClassifier()
        
    async def plan(self, message: str, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        intent = self.classifier.classify(message, context)
        message_lower = message.lower()
        # Handle web-scraping for free camping
        if fetch_and_parse and intent.domain == Domain.WHEELS and ("camp" in message_lower or "campsite" in message_lower):
            # Use static Overpass API endpoint or build dynamically from context
            overpass_url = "https://overpass-api.de/api/interpreter?data=[out:json];node[\"tourism\"=\"camp_site\"](around:50000,-33.86,151.21);out;"
            results = await fetch_and_parse(overpass_url)
            return [
                {"type": "message", "content": f"Found {len(results)} free campsites near you:"},
                {"type": ActionType.DATA_RENDER.value, "data": results}
            ]
        # Otherwise route to nodes
        try:
            if intent.domain == Domain.WINS:
                return await self._handle_wins_intent(intent, context["user_id"], message, context)
            elif intent.domain == Domain.WHEELS:
                return await self._handle_wheels_intent(intent, context["user_id"], message, context)
            elif intent.domain == Domain.SOCIAL:
                return await self._handle_social_intent(intent, context["user_id"], message, context)
            elif intent.domain == Domain.YOU:
                return await self._handle_you_intent(intent, context["user_id"], message, context)
            else:
                return await self._handle_general_intent(intent, context["user_id"], message, context)
        except Exception as e:
            logger.error(f"Error in action planning: {e}")
            return [{"type": "error", "content": f"I encountered an error: {str(e)}"}]

# Instantiate global orchestrator
orchestrator = ActionPlanner()
