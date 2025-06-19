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
    WEB_FETCH = "web_fetch"

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
    
    # existing detection methods...
    
class ActionPlanner:
    def __init__(self):
        self.classifier = IntentClassifier()
        logger.info("Orchestrator initialized with scraping support")
        
    async def plan(self, message: str, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        intent = self.classifier.classify(message, context)
        message_lower = message.lower()

        # === Web fetch special case ===
        if "campsite" in message_lower or "camp site" in message_lower:
            # Use Overpass API configured in scraper
            url = context.get("data_source_url") or settings.OVERPASS_URL
            items = await fetch_and_parse(url)
            # Prepare actions
            actions = [
                {"type": "message", "content": f"Found {len(items)} campsites:"},
                {"type": "data_render", "content": items}
            ]
            return actions

        actions = []
        user_id = context.get('user_id', 'demo_user')
        try:
            if intent.domain == Domain.WINS:
                actions = await self._handle_wins_intent(intent, user_id, message, context)
            elif intent.domain == Domain.WHEELS:
                actions = await self._handle_wheels_intent(intent, user_id, message, context)
            elif intent.domain == Domain.SOCIAL:
                actions = await self._handle_social_intent(intent, user_id, message, context)
            elif intent.domain == Domain.YOU:
                actions = await self._handle_you_intent(intent, user_id, message, context)
            else:
                actions = await self._handle_general_intent(intent, user_id, message, context)
        except Exception as e:
            logger.error(f"Error in action planning: {e}")
            actions = [{"type": "error", "content": f"Error processing: {e}"}]
        return actions

    # existing handler methods...

# Set global orchestrator
orchestrator = ActionPlanner()
