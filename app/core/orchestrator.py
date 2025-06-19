from typing import Dict, List, Optional, Any
from enum import Enum
import json
import logging
import re
from app.core.config import settings
from app.nodes.wins_node import wins_node
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
        message_lower = message.lower()
        
        # Enhanced domain detection for WINS
        if any(word in message_lower for word in [
            "spent", "spend", "expense", "budget", "money", "cost", "paid", "pay",
            "income", "earn", "salary", "tip", "save", "saving", "financial"
        ]):
            domain = Domain.WINS
        elif any(word in message_lower for word in ["trip", "fuel", "maintenance", "vehicle", "route"]):
            domain = Domain.WHEELS
        elif any(word in message_lower for word in ["group", "post", "hustle", "marketplace"]):
            domain = Domain.SOCIAL
        elif any(word in message_lower for word in ["calendar", "event", "schedule", "profile"]):
            domain = Domain.YOU
        elif any(word in message_lower for word in ["shop", "product", "buy", "purchase"]):
            domain = Domain.SHOP
        else:
            domain = Domain.GENERAL
            
        # Enhanced action detection
        if any(word in message_lower for word in ["add", "create", "new", "record", "log"]):
            action = ActionType.CREATE
        elif any(word in message_lower for word in ["show", "view", "see", "check", "look", "display"]):
            action = ActionType.VIEW
        elif any(word in message_lower for word in ["update", "change", "modify", "edit"]):
            action = ActionType.UPDATE
        elif any(word in message_lower for word in ["delete", "remove", "cancel"]):
            action = ActionType.DELETE
        elif any(word in message_lower for word in ["go to", "navigate", "open"]):
            action = ActionType.NAVIGATE
        else:
            action = ActionType.HELP
            
        # Extract entities
        entities = self._extract_entities(message, domain)
        
        return Intent(domain, action, entities, 0.8)
    
    def _extract_entities(self, message: str, domain: Domain) -> Dict[str, Any]:
        """Extract relevant entities from message"""
        entities = {}
        
        # Extract amounts (for expenses/budgets)
        amounts = re.findall(r'\$?(\d+(?:\.\d{2})?)', message)
        if amounts:
            entities['amount'] = float(amounts[0])
            
        # Extract categories
        categories = {
            'fuel': ['fuel', 'gas', 'petrol', 'gasoline'],
            'food': ['food', 'groceries', 'restaurant', 'dining', 'meal'],
            'transport': ['transport', 'uber', 'taxi', 'bus', 'train'],
            'entertainment': ['entertainment', 'movie', 'cinema', 'game'],
            'utilities': ['utilities', 'electric', 'water', 'internet', 'phone'],
            'maintenance': ['maintenance', 'repair', 'service', 'fix']
        }
        
        for category, keywords in categories.items():
            if any(keyword in message.lower() for keyword in keywords):
                entities['category'] = category
                break
                
        # Extract dates
        if "today" in message.lower():
            entities['date'] = 'today'
        elif "yesterday" in message.lower():
            entities['date'] = 'yesterday'
            
        return entities

class ActionPlanner:
    def __init__(self):
        self.classifier = IntentClassifier()
        
    async def plan(self, message: str, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Create action plan from user message"""
        intent = self.classifier.classify(message, context)
        actions = []
        user_id = context.get('user_id', 'demo_user')
        
        # WINS domain actions
        if intent.domain == Domain.WINS:
            if intent.action == ActionType.CREATE:
                if 'amount' in intent.entities:
                    # Add expense
                    expense_data = {
                        "amount": intent.entities['amount'],
                        "category": intent.entities.get('category', 'miscellaneous'),
                        "description": f"Added via PAM: {message}",
                        "date": intent.entities.get('date', 'today')
                    }
                    
                    # Execute backend action
                    result = await wins_node.add_expense(user_id, expense_data)
                    
                    if result.get("success"):
                        actions.append({
                            "type": "message",
                            "content": f"✅ Added ${intent.entities['amount']} expense to {intent.entities.get('category', 'miscellaneous')} category."
                        })
                        
                        if result.get("alert"):
                            actions.append({
                                "type": "alert",
                                "content": result["alert"]
                            })
                            
                        # Navigate to show the updated expenses
                        actions.append({
                            "type": "navigate",
                            "target": "/wins/expenses"
                        })
                    else:
                        actions.append({
                            "type": "error",
                            "content": f"Failed to add expense: {result.get('error', 'Unknown error')}"
                        })
                        
            elif intent.action == ActionType.VIEW:
                if 'category' in intent.entities:
                    # Show budget status for category
                    budget_status = await wins_node.check_budget_status(user_id, intent.entities['category'])
                    
                    if budget_status.get("status") == "active":
                        actions.append({
                            "type": "message",
                            "content": f"💰 {intent.entities['category'].title()} Budget:\n" +
                                     f"Budget: ${budget_status['budget_amount']}\n" +
                                     f"Spent: ${budget_status['spent']}\n" +
                                     f"Remaining: ${budget_status['remaining']}\n" +
                                     f"Used: {budget_status['percentage_used']:.1f}%"
                        })
                    else:
                        actions.append({
                            "type": "message",
                            "content": f"No budget found for {intent.entities['category']} category."
                        })
                else:
                    # Show general financial overview
                    analytics = await wins_node.get_expense_analytics(user_id)
                    
                    if analytics:
                        actions.append({
                            "type": "message",
                            "content": f"📊 Financial Overview:\n" +
                                     f"This month: ${analytics.get('current_month_total', 0)}\n" +
                                     f"Daily average: ${analytics.get('daily_average', 0):.2f}\n" +
                                     f"Top category: {analytics.get('top_category', 'None')}"
                        })
                    
                    actions.append({
                        "type": "navigate",
                        "target": "/wins"
                    })
                    
        # WHEELS domain actions
        elif intent.domain == Domain.WHEELS:
            if intent.action == ActionType.CREATE:
                actions.append({
                    "type": "navigate",
                    "target": "/wheels/trip-planner"
                })
                actions.append({
                    "type": "message",
                    "content": "🚗 Let me help you plan a trip. Opening the trip planner..."
                })
            elif intent.action == ActionType.VIEW:
                actions.append({
                    "type": "navigate",
                    "target": "/wheels"
                })
                
        # Default actions
        else:
            actions.append({
                "type": "message",
                "content": f"I understand you want to {intent.action.value} something in {intent.domain.value}. Let me help you with that."
            })
            
        return actions

orchestrator = ActionPlanner()
