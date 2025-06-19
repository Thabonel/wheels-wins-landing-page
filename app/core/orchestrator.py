from typing import Dict, List, Optional, Any
from enum import Enum
import json
import logging
import re
from app.core.config import settings
from app.nodes.wins_node import wins_node
from app.nodes.wheels_node import wheels_node
from app.nodes.social_node import social_node
from app.nodes.you_node import you_node
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
        openai.api_key = settings.OPENAI_API_KEY
          
    def classify(self, message: str, context: Dict[str, Any]) -> Intent:
        """Classify user intent from message with enhanced domain detection"""
        message_lower = message.lower()
        
        # Enhanced domain detection with specific keywords
        domain = self._detect_domain(message_lower)
        action = self._detect_action(message_lower)
        entities = self._extract_entities(message, domain)
        
        return Intent(domain, action, entities, 0.85)
    
    def _detect_domain(self, message_lower: str) -> Domain:
        """Enhanced domain detection"""
        
        # WINS domain - money, expenses, income, budgets
        if any(word in message_lower for word in [
            "spent", "spend", "expense", "budget", "money", "cost", "paid", "pay",
            "income", "earn", "salary", "tip", "save", "saving", "financial",
            "hustle", "make money", "side income", "freelance", "affiliate"
        ]):
            return Domain.WINS
            
        # WHEELS domain - travel, vehicles, trips, fuel
        elif any(word in message_lower for word in [
            "trip", "travel", "route", "drive", "fuel", "gas", "maintenance", 
            "vehicle", "car", "rv", "caravan", "camp", "camping", "park",
            "destination", "journey", "road", "mile", "km", "service"
        ]):
            return Domain.WHEELS
            
        # SOCIAL domain - community, groups, marketplace
        elif any(word in message_lower for word in [
            "group", "community", "post", "share", "marketplace", "sell",
            "buy", "friend", "meet", "social", "chat", "forum", "board"
        ]):
            return Domain.SOCIAL
            
        # YOU domain - calendar, personal, profile, events
        elif any(word in message_lower for word in [
            "calendar", "event", "schedule", "appointment", "reminder",
            "profile", "settings", "preferences", "personal", "dashboard",
            "timeline", "meeting", "plan my day", "organize"
        ]):
            return Domain.YOU
            
        # SHOP domain - products, purchasing
        elif any(word in message_lower for word in [
            "shop", "product", "buy", "purchase", "store", "cart", "order"
        ]):
            return Domain.SHOP
            
        else:
            return Domain.GENERAL
    
    def _detect_action(self, message_lower: str) -> ActionType:
        """Enhanced action detection"""
        
        if any(word in message_lower for word in [
            "add", "create", "new", "record", "log", "make", "start"
        ]):
            return ActionType.CREATE
            
        elif any(word in message_lower for word in [
            "show", "view", "see", "check", "look", "display", "get", "find"
        ]):
            return ActionType.VIEW
            
        elif any(word in message_lower for word in [
            "update", "change", "modify", "edit", "adjust", "set"
        ]):
            return ActionType.UPDATE
            
        elif any(word in message_lower for word in [
            "delete", "remove", "cancel", "clear"
        ]):
            return ActionType.DELETE
            
        elif any(word in message_lower for word in [
            "plan", "organize", "arrange", "prepare", "design"
        ]):
            return ActionType.PLAN
            
        elif any(word in message_lower for word in [
            "track", "monitor", "follow", "watch", "measure"
        ]):
            return ActionType.TRACK
            
        elif any(word in message_lower for word in [
            "analyze", "review", "evaluate", "assess", "compare"
        ]):
            return ActionType.ANALYZE
            
        elif any(word in message_lower for word in [
            "go to", "navigate", "open", "visit"
        ]):
            return ActionType.NAVIGATE
            
        else:
            return ActionType.HELP
      
    def _extract_entities(self, message: str, domain: Domain) -> Dict[str, Any]:
        """Extract relevant entities from message based on domain"""
        entities = {}
        
        # Extract amounts (for expenses/budgets)
        amounts = re.findall(r'\$?(\d+(?:\.\d{2})?)', message)
        if amounts:
            entities['amount'] = float(amounts[0])
        
        # Extract locations
        locations = re.findall(r'\b([A-Z][a-z]+ [A-Z][a-z]+|[A-Z][a-z]+)\b', message)
        if locations:
            entities['location'] = locations[0]
        
        # Extract dates
        if "today" in message.lower():
            entities['date'] = 'today'
        elif "yesterday" in message.lower():
            entities['date'] = 'yesterday'
        elif "tomorrow" in message.lower():
            entities['date'] = 'tomorrow'
        
        # Domain-specific entity extraction
        if domain == Domain.WINS:
            entities.update(self._extract_wins_entities(message))
        elif domain == Domain.WHEELS:
            entities.update(self._extract_wheels_entities(message))
        elif domain == Domain.SOCIAL:
            entities.update(self._extract_social_entities(message))
        elif domain == Domain.YOU:
            entities.update(self._extract_you_entities(message))
            
        return entities
    
    def _extract_wins_entities(self, message: str) -> Dict[str, Any]:
        """Extract WINS-specific entities"""
        entities = {}
        
        # Categories
        categories = {
            'fuel': ['fuel', 'gas', 'petrol', 'gasoline'],
            'food': ['food', 'groceries', 'restaurant', 'dining', 'meal'],
            'accommodation': ['camping', 'caravan park', 'hotel', 'cabin'],
            'maintenance': ['maintenance', 'repair', 'service', 'fix'],
            'entertainment': ['entertainment', 'movie', 'tour', 'activity']
        }
        
        for category, keywords in categories.items():
            if any(keyword in message.lower() for keyword in keywords):
                entities['category'] = category
                break
                
        return entities
    
    def _extract_wheels_entities(self, message: str) -> Dict[str, Any]:
        """Extract WHEELS-specific entities"""
        entities = {}
        
        # Trip types
        if any(word in message.lower() for word in ['weekend', 'short']):
            entities['trip_type'] = 'weekend'
        elif any(word in message.lower() for word in ['long', 'extended', 'month']):
            entities['trip_type'] = 'extended'
            
        # Vehicle mentions
        if any(word in message.lower() for word in ['rv', 'motorhome']):
            entities['vehicle_type'] = 'rv'
        elif any(word in message.lower() for word in ['caravan', 'trailer']):
            entities['vehicle_type'] = 'caravan'
            
        return entities
    
    def _extract_social_entities(self, message: str) -> Dict[str, Any]:
        """Extract SOCIAL-specific entities"""
        entities = {}
        
        # Group types
        if any(word in message.lower() for word in ['grey nomads', 'nomad']):
            entities['group_type'] = 'grey_nomads'
        elif any(word in message.lower() for word in ['local', 'area']):
            entities['group_type'] = 'local'
            
        return entities
    
    def _extract_you_entities(self, message: str) -> Dict[str, Any]:
        """Extract YOU-specific entities"""
        entities = {}
        
        # Time periods
        if any(word in message.lower() for word in ['week', 'weekly']):
            entities['timeframe'] = 'week'
        elif any(word in message.lower() for word in ['month', 'monthly']):
            entities['timeframe'] = 'month'
        elif any(word in message.lower() for word in ['day', 'daily']):
            entities['timeframe'] = 'day'
            
        return entities

class ActionPlanner:
    def __init__(self):
        self.classifier = IntentClassifier()
        
    async def plan(self, message: str, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Create comprehensive action plan from user message"""
        intent = self.classifier.classify(message, context)
        actions = []
        user_id = context.get('user_id', 'demo_user')
        
        try:
            # Route to appropriate node based on domain
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
            actions = [{
                "type": "error",
                "content": f"I encountered an error processing your request: {str(e)}"
            }]
            
        return actions
    
    async def _handle_wins_intent(self, intent: Intent, user_id: str, message: str, context: Dict) -> List[Dict[str, Any]]:
        """Handle WINS domain intents"""
        if intent.action == ActionType.CREATE and 'amount' in intent.entities:
            # Add expense
            expense_data = {
                "amount": intent.entities['amount'],
                "category": intent.entities.get('category', 'miscellaneous'),
                "description": message,
                "date": intent.entities.get('date', 'today')
            }
            result = await wins_node.add_expense(user_id, expense_data)
            return self._format_node_response(result, "expense added")
            
        elif intent.action == ActionType.VIEW:
            if 'category' in intent.entities:
                result = await wins_node.check_budget_status(user_id, intent.entities['category'])
            else:
                result = await wins_node.get_expense_analytics(user_id)
            return self._format_node_response(result, "budget information")
            
        elif intent.action == ActionType.PLAN:
            # Budget planning
            result = await wins_node.create_budget_plan(user_id, intent.entities)
            return self._format_node_response(result, "budget plan")
            
        else:
            return [{
                "type": "message",
                "content": f"I can help you with expenses, budgets, and income tracking. What specifically would you like to do?"
            }]
    
    async def _handle_wheels_intent(self, intent: Intent, user_id: str, message: str, context: Dict) -> List[Dict[str, Any]]:
        """Handle WHEELS domain intents"""
        if intent.action == ActionType.PLAN:
            # Trip planning
            trip_data = {
                "origin": intent.entities.get('origin'),
                "destination": intent.entities.get('destination'),
                "trip_type": intent.entities.get('trip_type', 'general'),
                "constraints": {}
            }
            result = await wheels_node.plan_trip(user_id, trip_data)
            return self._format_node_response(result, "trip planned")
            
        elif intent.action == ActionType.CREATE and intent.entities.get('category') == 'fuel':
            # Log fuel purchase
            fuel_data = {
                "amount_litres": intent.entities.get('amount', 50),
                "cost": intent.entities.get('amount', 75),
                "location": intent.entities.get('location', 'Unknown'),
                "odometer": 45000  # TODO: Get from user profile
            }
            result = await wheels_node.log_fuel_purchase(user_id, fuel_data)
            return self._format_node_response(result, "fuel logged")
            
        elif intent.action == ActionType.VIEW and 'maintenance' in message.lower():
            result = await wheels_node.check_maintenance_schedule(user_id)
            return self._format_node_response(result, "maintenance check")
            
        elif intent.action == ActionType.VIEW and 'weather' in message.lower():
            location = intent.entities.get('location', 'current location')
            result = await wheels_node.get_weather_forecast(location)
            return self._format_node_response(result, "weather forecast")
            
        else:
            return [{
                "type": "message",
                "content": f"I can help you plan trips, track fuel, check maintenance, and get weather updates. What would you like to do?"
            }]
    
    async def _handle_social_intent(self, intent: Intent, user_id: str, message: str, context: Dict) -> List[Dict[str, Any]]:
        """Handle SOCIAL domain intents"""
        if 'hustle' in message.lower() or 'income' in message.lower():
            user_profile = context.get('user_profile', {})
            result = await social_node.get_hustle_recommendations(user_id, user_profile)
            return self._format_node_response(result, "hustle recommendations")
            
        elif intent.action == ActionType.CREATE and 'group' in message.lower():
            group_data = {
                "group_name": intent.entities.get('group_name'),
                "location": intent.entities.get('location'),
                "interests": intent.entities.get('interests', [])
            }
            result = await social_node.join_community_group(user_id, group_data)
            return self._format_node_response(result, "group joined")
            
        elif intent.action == ActionType.CREATE and ('post' in message.lower() or 'share' in message.lower()):
            post_data = {
                "content": message,
                "type": "general",
                "location": intent.entities.get('location')
            }
            result = await social_node.post_to_social_feed(user_id, post_data)
            return self._format_node_response(result, "post created")
            
        elif 'marketplace' in message.lower() or 'sell' in message.lower():
            listing_data = {
                "item_name": intent.entities.get('item_name', 'item'),
                "category": intent.entities.get('category', 'general'),
                "price": intent.entities.get('amount', 0)
            }
            result = await social_node.create_marketplace_listing(user_id, listing_data)
            return self._format_node_response(result, "listing created")
            
        else:
            return [{
                "type": "message",
                "content": f"I can help you with community groups, hustles, marketplace listings, and social posts. What interests you?"
            }]
    
    async def _handle_you_intent(self, intent: Intent, user_id: str, message: str, context: Dict) -> List[Dict[str, Any]]:
        """Handle YOU domain intents"""
        if intent.action == ActionType.CREATE and 'event' in message.lower():
            event_data = {
                "title": intent.entities.get('title', 'New Event'),
                "start_time": intent.entities.get('date', 'today'),
                "location": intent.entities.get('location', ''),
                "type": intent.entities.get('event_type', 'general')
            }
            result = await you_node.create_calendar_event(user_id, event_data)
            return self._format_node_response(result, "event created")
            
        elif intent.action == ActionType.VIEW and 'dashboard' in message.lower():
            result = await you_node.get_personalized_dashboard(user_id)
            return self._format_node_response(result, "dashboard loaded")
            
        elif intent.action == ActionType.UPDATE and 'profile' in message.lower():
            profile_data = intent.entities
            result = await you_node.update_user_profile(user_id, profile_data)
            return self._format_node_response(result, "profile updated")
            
        elif 'timeline' in message.lower() or 'travel schedule' in message.lower():
            timeframe = intent.entities.get('timeframe', 'month')
            result = await you_node.get_travel_timeline(user_id, timeframe)
            return self._format_node_response(result, "timeline generated")
            
        else:
            return [{
                "type": "message",
                "content": f"I can help you manage your calendar, profile, preferences, and personal dashboard. What would you like to do?"
            }]
    
    async def _handle_general_intent(self, intent: Intent, user_id: str, message: str, context: Dict) -> List[Dict[str, Any]]:
        """Handle general conversation and help"""
        return [{
            "type": "message", 
            "content": f"I'm PAM, your AI travel companion! I can help you with:\n\n" +
                      "🚗 **WHEELS**: Plan trips, track fuel, vehicle maintenance\n" +
                      "💰 **WINS**: Manage budgets, track expenses, find income opportunities\n" +
                      "👥 **SOCIAL**: Join groups, share posts, explore hustles\n" +
                      "📅 **YOU**: Manage calendar, update profile, view dashboard\n\n" +
                      "Try saying something like 'Plan a trip to Brisbane' or 'I spent $50 on fuel today'"
        }]
    
    def _format_node_response(self, node_result: Dict[str, Any], action_description: str) -> List[Dict[str, Any]]:
        """Format node response into action list"""
        actions = []
        
        if node_result.get("success"):
            # Add main message
            if "message" in node_result:
                actions.append({
                    "type": "message",
                    "content": node_result["message"]
                })
            
            # Add any UI actions from the node
            if "actions" in node_result.get("data", {}):
                actions.extend(node_result["data"]["actions"])
            elif "actions" in node_result:
                actions.extend(node_result["actions"])
                
        else:
            # Handle errors
            actions.append({
                "type": "error",
                "content": node_result.get("message", f"Failed to complete {action_description}")
            })
            
        return actions

# Create global orchestrator instance
orchestrator = ActionPlanner()
