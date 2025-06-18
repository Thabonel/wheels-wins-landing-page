from typing import Dict, List, Optional, Any
from enum import Enum
import json
import logging
from app.core.config import settings
import openai

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
        """Classify user intent from message"""
        # For now, simple keyword-based classification
        # Later: Use OpenAI for better understanding
        
        message_lower = message.lower()
        
        # Domain detection
        if any(word in message_lower for word in ["trip", "fuel", "maintenance", "vehicle", "route"]):
            domain = Domain.WHEELS
        elif any(word in message_lower for word in ["budget", "expense", "income", "money", "spend"]):
            domain = Domain.WINS
        elif any(word in message_lower for word in ["group", "post", "hustle", "marketplace"]):
            domain = Domain.SOCIAL
        elif any(word in message_lower for word in ["calendar", "event", "schedule", "profile"]):
            domain = Domain.YOU
        elif any(word in message_lower for word in ["shop", "product", "buy", "purchase"]):
            domain = Domain.SHOP
        else:
            domain = Domain.GENERAL
            
        # Action detection
        if any(word in message_lower for word in ["show", "view", "see", "check", "look"]):
            action = ActionType.VIEW
        elif any(word in message_lower for word in ["create", "add", "new", "make"]):
            action = ActionType.CREATE
        elif any(word in message_lower for word in ["update", "change", "modify", "edit"]):
            action = ActionType.UPDATE
        elif any(word in message_lower for word in ["delete", "remove", "cancel"]):
            action = ActionType.DELETE
        elif any(word in message_lower for word in ["go to", "navigate", "open"]):
            action = ActionType.NAVIGATE
        else:
            action = ActionType.HELP
            
        # Extract entities (simplified)
        entities = self._extract_entities(message, domain)
        
        return Intent(domain, action, entities, 0.8)
    
    def _extract_entities(self, message: str, domain: Domain) -> Dict[str, Any]:
        """Extract relevant entities from message"""
        entities = {}
        
        # Extract amounts (for expenses/budgets)
        import re
        amounts = re.findall(r'\$?(\d+(?:\.\d{2})?)', message)
        if amounts:
            entities['amount'] = float(amounts[0])
            
        # Extract dates
        if "today" in message.lower():
            entities['date'] = 'today'
        elif "yesterday" in message.lower():
            entities['date'] = 'yesterday'
            
        return entities

class ActionPlanner:
    def __init__(self):
        self.classifier = IntentClassifier()
        
    def plan(self, message: str, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Create action plan from user message"""
        intent = self.classifier.classify(message, context)
        
        actions = []
        
        # Create action plan based on intent
        if intent.domain == Domain.WINS and intent.action == ActionType.CREATE:
            if 'amount' in intent.entities:
                actions.append({
                    "type": "navigate",
                    "target": "/wins/expenses"
                })
                actions.append({
                    "type": "fill_form",
                    "form_id": "expense-form",
                    "data": {
                        "amount": intent.entities['amount'],
                        "date": intent.entities.get('date', 'today')
                    }
                })
                actions.append({
                    "type": "submit_form",
                    "form_id": "expense-form"
                })
        elif intent.domain == Domain.WHEELS and intent.action == ActionType.CREATE:
            actions.append({
                "type": "navigate",
                "target": "/wheels/trip-planner"
            })
        else:
            # Default action
            actions.append({
                "type": "message",
                "content": f"I understand you want to {intent.action.value} something in {intent.domain.value}. Let me help you with that."
            })
            
        return actions

orchestrator = ActionPlanner()
