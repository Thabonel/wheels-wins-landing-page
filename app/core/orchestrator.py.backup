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

class IntentClassifier:
    def __init__(self):
        pass
    
    def classify(self, message: str, context: Dict[str, Any]) -> Intent:
        """Basic intent classification"""
        message_lower = message.lower()
        
        # Simple keyword-based classification
        if any(word in message_lower for word in ["camp", "travel", "route", "wheel"]):
            return Intent(Domain.WHEELS, ActionType.VIEW, {}, 0.8)
        elif any(word in message_lower for word in ["win", "goal", "achieve"]):
            return Intent(Domain.WINS, ActionType.VIEW, {}, 0.8)
        elif any(word in message_lower for word in ["social", "friend", "connect"]):
            return Intent(Domain.SOCIAL, ActionType.VIEW, {}, 0.8)
        elif any(word in message_lower for word in ["you", "profile", "personal"]):
            return Intent(Domain.YOU, ActionType.VIEW, {}, 0.8)
        else:
            return Intent(Domain.GENERAL, ActionType.VIEW, {}, 0.5)

class ActionPlanner:
    def __init__(self):
        self.classifier = IntentClassifier()

    async def plan(self, message: str, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Create comprehensive action plan from user message"""
        intent = self.classifier.classify(message, context)
        actions = []
        
        # If user asks for campsites, trigger scraper
        if intent.domain == Domain.WHEELS and "camp" in message.lower():
            try:
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
            except Exception as e:
                logger.error(f"Error fetching campsites: {e}")
                actions.append({
                    "type": "error",
                    "content": f"Error fetching campsites: {e}"
                })
                return actions
        
        # Route to appropriate node based on domain
        try:
            if intent.domain == Domain.WHEELS:
                result = await wheels_node.process(message, context)
            elif intent.domain == Domain.WINS:
                result = await wins_node.process(message, context)
            elif intent.domain == Domain.SOCIAL:
                result = await social_node.process(message, context)
            elif intent.domain == Domain.YOU:
                result = await you_node.process(message, context)
            else:
                result = {
                    "type": "message",
                    "content": "I'm not sure how to help with that. Could you be more specific?"
                }
            
            actions.append(result)
            
        except Exception as e:
            logger.error(f"Error in action planning: {e}")
            return [{
                "type": "error",
                "content": f"I encountered an error: {e}"
            }]
        
        return actions

# Create global orchestrator instance
orchestrator = ActionPlanner()