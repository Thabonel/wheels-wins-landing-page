"""
Intent-based specialized handlers for PAM
Routes classified intents to appropriate specialized processing
"""

from typing import Dict, Any, Optional, List
from abc import ABC, abstractmethod
import logging
from datetime import datetime
from .intent_classifier import IntentClassification, IntentType, Entity

logger = logging.getLogger(__name__)


class BaseIntentHandler(ABC):
    """Base class for intent handlers"""
    
    def __init__(self, handler_name: str):
        self.handler_name = handler_name
    
    @abstractmethod
    async def handle(
        self, 
        message: str, 
        user_id: str,
        classification: IntentClassification,
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Handle the classified intent"""
        pass
    
    def _extract_entities_by_type(self, entities: List[Entity], entity_type: str) -> List[Entity]:
        """Helper to extract entities of a specific type"""
        return [e for e in entities if e.type == entity_type]


class TripPlanningHandler(BaseIntentHandler):
    """Handle trip planning related intents"""
    
    def __init__(self):
        super().__init__("trip_planning_handler")
    
    async def handle(
        self, 
        message: str, 
        user_id: str,
        classification: IntentClassification,
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Handle trip planning requests"""
        try:
            locations = self._extract_entities_by_type(classification.entities, 'location')
            dates = self._extract_entities_by_type(classification.entities, 'date')
            durations = self._extract_entities_by_type(classification.entities, 'duration')
            
            response = {
                "handler": self.handler_name,
                "intent": classification.intent.value,
                "response_type": "structured",
                "data": {
                    "planning_assistance": True,
                    "extracted_info": {
                        "destinations": [loc.value for loc in locations],
                        "travel_dates": [date.value for date in dates],
                        "duration": durations[0].value if durations else None
                    }
                }
            }
            
            # Generate helpful response based on extracted entities
            if locations:
                if len(locations) >= 2:
                    response["message"] = f"I can help you plan a trip from {locations[0].value} to {locations[1].value}. "
                else:
                    response["message"] = f"I can help you plan a trip to {locations[0].value}. "
                    
                if dates:
                    response["message"] += f"For {dates[0].value}, I'll find the best routes, campgrounds, and attractions. "
                else:
                    response["message"] += "When are you planning to travel? "
                    
                response["suggested_actions"] = [
                    "Find optimal route",
                    "Search campgrounds along the way", 
                    "Check weather forecasts",
                    "Estimate travel costs"
                ]
            else:
                response["message"] = "I'd love to help you plan a trip! Where are you thinking of traveling to?"
                response["clarification_needed"] = True
                response["suggested_questions"] = [
                    "What's your destination?",
                    "Where are you starting from?",
                    "When do you want to travel?"
                ]
            
            logger.info(f"Trip planning handled for user {user_id}: {len(locations)} locations")
            return response
            
        except Exception as e:
            logger.error(f"Trip planning handler error: {e}")
            return {
                "handler": self.handler_name,
                "error": str(e),
                "message": "I had trouble processing your trip planning request. Could you rephrase it?"
            }


class ExpenseTrackingHandler(BaseIntentHandler):
    """Handle expense tracking related intents"""
    
    def __init__(self):
        super().__init__("expense_tracking_handler")
    
    async def handle(
        self, 
        message: str, 
        user_id: str,
        classification: IntentClassification,
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Handle expense tracking requests"""
        try:
            amounts = self._extract_entities_by_type(classification.entities, 'amount')
            dates = self._extract_entities_by_type(classification.entities, 'date')
            locations = self._extract_entities_by_type(classification.entities, 'location')
            
            response = {
                "handler": self.handler_name,
                "intent": classification.intent.value,
                "response_type": "structured",
                "data": {
                    "expense_tracking": True,
                    "extracted_info": {
                        "amounts": [amt.normalized_value or amt.value for amt in amounts],
                        "dates": [date.value for date in dates],
                        "locations": [loc.value for loc in locations]
                    }
                }
            }
            
            # Determine expense category from context
            category = self._infer_expense_category(message, context)
            if category:
                response["data"]["suggested_category"] = category
            
            if amounts:
                amount_text = amounts[0].normalized_value or amounts[0].value
                response["message"] = f"I'll help you track the ${amount_text} expense. "
                
                if category:
                    response["message"] += f"This looks like a {category} expense. "
                
                if locations:
                    response["message"] += f"at {locations[0].value}. "
                
                if not dates:
                    response["message"] += "When did this expense occur? "
                else:
                    response["message"] += f"on {dates[0].value}. "
                
                response["suggested_actions"] = [
                    "Categorize expense",
                    "Add to trip budget",
                    "Generate receipt",
                    "Update spending summary"
                ]
                
                # Auto-create expense entry if we have enough info
                if category and (dates or context.get('current_date')):
                    response["auto_create_expense"] = {
                        "amount": amount_text,
                        "category": category,
                        "date": dates[0].value if dates else context.get('current_date'),
                        "location": locations[0].value if locations else None,
                        "description": message[:100]  # Truncated description
                    }
            else:
                response["message"] = "I can help you track an expense. How much did you spend?"
                response["clarification_needed"] = True
                response["suggested_questions"] = [
                    "What was the amount?",
                    "What category is this expense?",
                    "When did you make this purchase?"
                ]
            
            logger.info(f"Expense tracking handled for user {user_id}: {len(amounts)} amounts")
            return response
            
        except Exception as e:
            logger.error(f"Expense tracking handler error: {e}")
            return {
                "handler": self.handler_name,
                "error": str(e),
                "message": "I had trouble processing your expense. Could you tell me the amount and category?"
            }
    
    def _infer_expense_category(self, message: str, context: Dict[str, Any] = None) -> Optional[str]:
        """Infer expense category from message content"""
        message_lower = message.lower()
        
        category_keywords = {
            "fuel": ["gas", "fuel", "petrol", "diesel", "station", "chevron", "shell"],
            "food": ["food", "restaurant", "eat", "meal", "lunch", "dinner", "grocery", "cafe"],
            "accommodation": ["hotel", "motel", "campground", "park", "accommodation", "stay", "night"],
            "maintenance": ["repair", "service", "oil", "tire", "brake", "maintenance", "mechanic"],
            "entertainment": ["movie", "show", "attraction", "museum", "park", "entry", "ticket"],
            "supplies": ["supplies", "equipment", "gear", "tools", "parts", "store", "walmart"]
        }
        
        for category, keywords in category_keywords.items():
            if any(keyword in message_lower for keyword in keywords):
                return category
        
        return None


class BudgetManagementHandler(BaseIntentHandler):
    """Handle budget management related intents"""
    
    def __init__(self):
        super().__init__("budget_management_handler")
    
    async def handle(
        self, 
        message: str, 
        user_id: str,
        classification: IntentClassification,
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Handle budget management requests"""
        try:
            amounts = self._extract_entities_by_type(classification.entities, 'amount')
            durations = self._extract_entities_by_type(classification.entities, 'duration')
            
            response = {
                "handler": self.handler_name,
                "intent": classification.intent.value,
                "response_type": "structured",
                "data": {
                    "budget_management": True,
                    "extracted_info": {
                        "amounts": [amt.normalized_value or amt.value for amt in amounts],
                        "durations": [dur.value for dur in durations]
                    }
                }
            }
            
            # Determine if this is budget setting or budget inquiry
            if any(word in message.lower() for word in ['set', 'create', 'plan', 'allocate']):
                response["action_type"] = "budget_setting"
                if amounts:
                    amount_text = amounts[0].normalized_value or amounts[0].value
                    duration = durations[0].value if durations else "this trip"
                    response["message"] = f"I'll help you set a ${amount_text} budget for {duration}. "
                    response["suggested_actions"] = [
                        "Break down by categories",
                        "Set spending limits",
                        "Create savings goals",
                        "Track daily allowance"
                    ]
                else:
                    response["message"] = "I can help you create a budget. What's your total budget amount?"
                    response["clarification_needed"] = True
            else:
                response["action_type"] = "budget_inquiry"
                response["message"] = "Let me check your current budget status. "
                response["suggested_actions"] = [
                    "Show spending summary",
                    "Compare to budget limits",
                    "Project remaining funds",
                    "Suggest cost savings"
                ]
            
            logger.info(f"Budget management handled for user {user_id}")
            return response
            
        except Exception as e:
            logger.error(f"Budget management handler error: {e}")
            return {
                "handler": self.handler_name,
                "error": str(e),
                "message": "I had trouble with your budget request. What would you like to know about your budget?"
            }


class CampgroundSearchHandler(BaseIntentHandler):
    """Handle campground search related intents"""
    
    def __init__(self):
        super().__init__("campground_search_handler")
    
    async def handle(
        self, 
        message: str, 
        user_id: str,
        classification: IntentClassification,
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Handle campground search requests"""
        try:
            locations = self._extract_entities_by_type(classification.entities, 'location')
            dates = self._extract_entities_by_type(classification.entities, 'date')
            durations = self._extract_entities_by_type(classification.entities, 'duration')
            
            response = {
                "handler": self.handler_name,
                "intent": classification.intent.value,
                "response_type": "structured",
                "data": {
                    "campground_search": True,
                    "search_params": {
                        "locations": [loc.value for loc in locations],
                        "dates": [date.value for date in dates],
                        "duration": durations[0].value if durations else None
                    }
                }
            }
            
            if locations:
                location_text = locations[0].value
                response["message"] = f"I'll find campgrounds near {location_text}. "
                
                if dates:
                    response["message"] += f"for {dates[0].value}. "
                else:
                    response["message"] += "When do you need them? "
                
                # Extract preferences from message
                preferences = self._extract_campground_preferences(message)
                if preferences:
                    response["data"]["preferences"] = preferences
                    response["message"] += f"Looking for {', '.join(preferences)}. "
                
                response["suggested_actions"] = [
                    "Search available sites",
                    "Check amenities",
                    "Compare prices",
                    "Make reservations"
                ]
            else:
                response["message"] = "I can help you find campgrounds! Where are you looking to stay?"
                response["clarification_needed"] = True
                response["suggested_questions"] = [
                    "What area or city?",
                    "What dates do you need?",
                    "Any specific amenities you need?"
                ]
            
            logger.info(f"Campground search handled for user {user_id}: {len(locations)} locations")
            return response
            
        except Exception as e:
            logger.error(f"Campground search handler error: {e}")
            return {
                "handler": self.handler_name,
                "error": str(e),
                "message": "I had trouble with your campground search. Where are you looking to camp?"
            }
    
    def _extract_campground_preferences(self, message: str) -> List[str]:
        """Extract campground preferences from message"""
        message_lower = message.lower()
        preferences = []
        
        preference_keywords = {
            "hookups": ["hookup", "electric", "water", "sewer", "utilities"],
            "pet_friendly": ["pet", "dog", "cat", "animal"],
            "wifi": ["wifi", "internet", "connection"],
            "pool": ["pool", "swimming"],
            "quiet": ["quiet", "peaceful", "secluded"],
            "family_friendly": ["family", "kids", "children", "playground"]
        }
        
        for pref_type, keywords in preference_keywords.items():
            if any(keyword in message_lower for keyword in keywords):
                preferences.append(pref_type)
        
        return preferences


class GeneralHandler(BaseIntentHandler):
    """Handle general queries and fallback cases"""
    
    def __init__(self):
        super().__init__("general_handler")
    
    async def handle(
        self, 
        message: str, 
        user_id: str,
        classification: IntentClassification,
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Handle general queries"""
        try:
            response = {
                "handler": self.handler_name,
                "intent": classification.intent.value,
                "response_type": "conversational",
                "message": "I'm here to help with your travel and RV needs! I can assist with trip planning, expense tracking, campground searches, and more. What would you like to know?"
            }
            
            # Suggest based on context
            current_page = context.get('current_page', '') if context else ''
            if 'expense' in current_page:
                response["suggested_actions"] = [
                    "Track a new expense",
                    "View expense summary",
                    "Set budget limits",
                    "Categorize expenses"
                ]
            elif 'trip' in current_page or 'wheel' in current_page:
                response["suggested_actions"] = [
                    "Plan a new trip",
                    "Find campgrounds",
                    "Check weather",
                    "Optimize routes"
                ]
            else:
                response["suggested_actions"] = [
                    "Plan a trip",
                    "Track expenses",
                    "Find campgrounds",
                    "Get travel tips"
                ]
            
            logger.info(f"General handler processed for user {user_id}")
            return response
            
        except Exception as e:
            logger.error(f"General handler error: {e}")
            return {
                "handler": self.handler_name,
                "error": str(e),
                "message": "I'm here to help! What can I assist you with today?"
            }


class IntentRouter:
    """Routes classified intents to appropriate specialized handlers"""
    
    def __init__(self):
        self.handlers = {
            IntentType.TRIP_PLANNING: TripPlanningHandler(),
            IntentType.EXPENSE_TRACKING: ExpenseTrackingHandler(),
            IntentType.BUDGET_MANAGEMENT: BudgetManagementHandler(),
            IntentType.ROUTE_OPTIMIZATION: TripPlanningHandler(),  # Reuse trip planning
            IntentType.CAMPGROUND_SEARCH: CampgroundSearchHandler(),
            IntentType.WEATHER_INQUIRY: GeneralHandler(),  # TODO: Create weather handler
            IntentType.MAINTENANCE_REMINDER: GeneralHandler(),  # TODO: Create maintenance handler
            IntentType.SOCIAL_INTERACTION: GeneralHandler(),
            IntentType.HELP_REQUEST: GeneralHandler(),
            IntentType.GENERAL_QUERY: GeneralHandler(),
            IntentType.FEEDBACK: GeneralHandler(),  # TODO: Create feedback handler
            IntentType.CORRECTION: GeneralHandler(),  # TODO: Create correction handler
        }
        
        logger.info(f"Intent router initialized with {len(self.handlers)} handlers")
    
    async def route_intent(
        self,
        message: str,
        user_id: str,
        classification: IntentClassification,
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Route classified intent to appropriate handler"""
        try:
            handler = self.handlers.get(classification.intent, self.handlers[IntentType.GENERAL_QUERY])
            
            logger.info(f"Routing {classification.intent.value} to {handler.handler_name} for user {user_id}")
            
            # Add routing metadata to response
            response = await handler.handle(message, user_id, classification, context)
            response["routing"] = {
                "intent": classification.intent.value,
                "confidence": classification.confidence,
                "handler": handler.handler_name,
                "entities_found": len(classification.entities),
                "timestamp": datetime.utcnow().isoformat()
            }
            
            return response
            
        except Exception as e:
            logger.error(f"Intent routing error: {e}")
            # Fallback to general handler
            return await self.handlers[IntentType.GENERAL_QUERY].handle(
                message, user_id, classification, context
            )


# Global router instance
intent_router = None

def get_intent_router() -> IntentRouter:
    """Get global intent router instance"""
    global intent_router
    if intent_router is None:
        intent_router = IntentRouter()
    return intent_router