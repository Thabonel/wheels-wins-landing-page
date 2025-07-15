# app/core/simple_pam_service.py
"""
SimplePamService - Direct OpenAI integration for PAM chat functionality
Replaces the complex ActionPlanner/IntelligentConversationHandler architecture
with a streamlined, reliable implementation.
"""

import json
from typing import Dict, List, Any, Optional
from datetime import datetime
import asyncio
from openai import AsyncOpenAI
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("simple_pam")

class SimplePamService:
    """Simplified PAM service with direct OpenAI integration"""
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.max_retries = 3
        self.retry_delay = 1  # seconds
    
    async def get_response(
        self, 
        message: str, 
        context: Dict[str, Any],
        conversation_history: Optional[List[Dict]] = None
    ) -> str:
        """
        Get PAM's response to a user message with robust error handling
        
        Args:
            message: The user's message
            context: User context including user_id, session_id, etc.
            conversation_history: Previous conversation messages
            
        Returns:
            PAM's response as a string
        """
        user_id = context.get("user_id", "anonymous")
        session_id = context.get("session_id", "default")
        
        logger.info(f"🤖 SimplePamService processing message for user {user_id}: '{message}'")
        
        # Build the conversation messages for OpenAI
        messages = self._build_conversation_messages(message, context, conversation_history)
        
        # Try to get response with retries
        for attempt in range(self.max_retries):
            try:
                response = await self._call_openai(messages)
                logger.info(f"✅ OpenAI response received on attempt {attempt + 1}")
                return response
                
            except Exception as e:
                logger.error(f"❌ OpenAI call failed (attempt {attempt + 1}/{self.max_retries}): {str(e)}")
                
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay * (attempt + 1))
                else:
                    # All retries failed, return a helpful error response
                    return self._get_error_response(message, str(e))
    
    async def _call_openai(self, messages: List[Dict[str, str]]) -> str:
        """Make the actual OpenAI API call"""
        response = await self.client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            temperature=0.7,
            max_tokens=500,
            timeout=30  # 30 second timeout
        )
        
        return response.choices[0].message.content
    
    def _build_conversation_messages(
        self, 
        message: str, 
        context: Dict[str, Any],
        conversation_history: Optional[List[Dict]] = None
    ) -> List[Dict[str, str]]:
        """Build the messages array for OpenAI"""
        
        # System message defining PAM's personality and capabilities
        system_message = {
            "role": "system",
            "content": """You are PAM (Personal AI Manager), a friendly and helpful AI assistant for the Wheels and Wins platform. 
You help mature travelers (Grey Nomads) with:

🚐 **Wheels** - Travel planning, route suggestions, camping spots, vehicle maintenance
💰 **Wins** - Budget tracking, expense management, financial planning  
👥 **Social** - Connecting with other travelers, finding groups and events
👤 **You** - Personal settings, calendar, reminders
🛒 **Shop** - Finding deals on travel gear and supplies

Guidelines:
- Be warm, friendly, and conversational
- Provide practical, actionable advice
- Remember users are traveling in RVs/caravans
- Focus on Australian travel context
- Keep responses concise but helpful
- Use emojis to make responses more engaging
- If unsure, ask clarifying questions

Current timestamp: {timestamp}
User context: {context}""".format(
                timestamp=datetime.utcnow().isoformat(),
                context=json.dumps({
                    "user_id": context.get("user_id"),
                    "session_id": context.get("session_id"),
                    "location": context.get("user_location", "Unknown"),
                    "connection_type": context.get("connection_type", "unknown")
                })
            )
        }
        
        messages = [system_message]
        
        # Add conversation history if available (last 5 messages)
        if conversation_history:
            for msg in conversation_history[-5:]:
                role = "user" if msg.get("role") == "user" else "assistant"
                content = msg.get("content", "")
                if content:
                    messages.append({"role": role, "content": content})
        
        # Add the current user message
        messages.append({"role": "user", "content": message})
        
        return messages
    
    def _get_error_response(self, message: str, error: str) -> str:
        """Generate a helpful error response when OpenAI fails"""
        message_lower = message.lower()
        
        # Provide context-aware fallback responses
        if any(word in message_lower for word in ["hello", "hi", "hey", "g'day"]):
            return "👋 G'day! I'm PAM, your travel companion. I'm having a bit of trouble with my connection right now, but I'm here to help with travel planning, budgets, and connecting with other nomads. What can I help you with today?"
        
        elif any(word in message_lower for word in ["trip", "travel", "route", "drive", "camping"]):
            return "🚐 I'd love to help plan your trip! While I'm having some technical difficulties, here are some popular routes:\n• Brisbane to Cairns via the coast\n• Melbourne to Adelaide via the Great Ocean Road\n• Sydney to Byron Bay\n\nTry asking me again in a moment, and I'll provide more detailed suggestions!"
        
        elif any(word in message_lower for word in ["budget", "expense", "money", "cost", "spend"]):
            return "💰 I can help you track expenses and manage your travel budget! Common categories include:\n• Fuel costs\n• Campsite fees\n• Food & groceries\n• Vehicle maintenance\n\nI'm having connection issues right now, but try again shortly and I'll help you set up your budget tracking!"
        
        elif any(word in message_lower for word in ["help", "what can you do", "features"]):
            return "🌟 I'm PAM, here to help with:\n\n🚐 **Travel** - Route planning, campsite recommendations\n💰 **Budget** - Expense tracking, financial planning\n👥 **Social** - Connect with other travelers\n🛠️ **Vehicle** - Maintenance reminders\n\nI'm experiencing some technical issues, but these features will be fully available once I'm back online!"
        
        else:
            return f"🔧 I'm experiencing some technical difficulties right now, but I'm here to help with your travel needs! I can assist with trip planning, budget tracking, and connecting with other travelers. Please try again in a moment, and I'll be able to provide more detailed assistance."
    
    async def process_message(
        self,
        user_id: str,
        message: str,
        session_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process a message and return a structured response
        Compatible with the existing PAM response format
        """
        # Build complete context
        full_context = {
            "user_id": user_id,
            "session_id": session_id or "default",
            **(context or {})
        }
        
        # Get the response
        response_content = await self.get_response(message, full_context)
        
        # Detect intent and generate UI actions
        intent = self._detect_simple_intent(message)
        ui_actions = self._generate_ui_actions(message, intent, response_content)
        
        # Return in the expected format
        return {
            "content": response_content,
            "intent": intent,
            "confidence": 0.8,
            "suggestions": self._get_suggestions(message),
            "actions": ui_actions,
            "requires_followup": "?" in response_content,
            "context_updates": {},
            "voice_enabled": False
        }
    
    def _detect_simple_intent(self, message: str) -> str:
        """Enhanced intent detection with UI action support"""
        message_lower = message.lower()
        
        # Trip planning keywords
        if any(word in message_lower for word in ["trip", "travel", "route", "camping", "plan a trip", "from", "to"]):
            return "wheels"
        # Calendar/scheduling keywords  
        elif any(word in message_lower for word in ["appointment", "meeting", "schedule", "calendar", "remind", "book"]):
            return "calendar"
        # Budget/financial keywords
        elif any(word in message_lower for word in ["budget", "expense", "money", "cost", "spent", "track"]):
            return "wins"
        elif any(word in message_lower for word in ["group", "meet", "social", "community"]):
            return "social"
        elif any(word in message_lower for word in ["profile", "setting", "preference"]):
            return "you"
        elif any(word in message_lower for word in ["buy", "shop", "product", "deal"]):
            return "shop"
        else:
            return "general"
    
    def _get_suggestions(self, message: str) -> List[str]:
        """Generate relevant suggestions based on the message"""
        message_lower = message.lower()
        suggestions = []
        
        if "travel" in message_lower or "trip" in message_lower:
            suggestions = [
                "Find camping spots nearby",
                "Check weather forecast",
                "Calculate fuel costs"
            ]
        elif "budget" in message_lower or "expense" in message_lower:
            suggestions = [
                "Add new expense",
                "View spending summary",
                "Set budget alerts"
            ]
        
        return suggestions[:3]  # Return max 3 suggestions
    
    def _generate_ui_actions(self, message: str, intent: str, response_content: str) -> List[Dict[str, Any]]:
        """Generate UI actions based on message intent and content"""
        actions = []
        message_lower = message.lower()
        
        # Trip planning actions
        if intent == "wheels" and any(word in message_lower for word in ["plan", "trip", "from", "to", "route"]):
            # Extract locations if possible (simple regex)
            import re
            
            # Look for "from X to Y" pattern
            from_to_pattern = r'from\s+([^,]+?)\s+to\s+([^,\.!?]+)'
            match = re.search(from_to_pattern, message_lower)
            
            if match:
                origin = match.group(1).strip().title()
                destination = match.group(2).strip().title()
                
                actions.extend([
                    {
                        "type": "navigate",
                        "target": "/wheels",
                        "params": {"view": "trip-planner"}
                    },
                    {
                        "type": "display_route",
                        "payload": {
                            "origin": {"name": origin},
                            "destination": {"name": destination},
                            "message": f"Route from {origin} to {destination}"
                        }
                    }
                ])
            else:
                # Just navigate to trip planner
                actions.append({
                    "type": "navigate", 
                    "target": "/wheels",
                    "params": {"view": "trip-planner"}
                })
        
        # Calendar/appointment actions
        elif intent == "calendar" and any(word in message_lower for word in ["appointment", "meeting", "schedule"]):
            # Try to extract date/time info
            event_data = self._extract_calendar_event(message)
            
            if event_data:
                actions.extend([
                    {
                        "type": "navigate",
                        "target": "/you",
                        "params": {"view": "calendar"}
                    },
                    {
                        "type": "add_calendar_event",
                        "payload": event_data
                    }
                ])
            else:
                actions.append({
                    "type": "navigate",
                    "target": "/you", 
                    "params": {"view": "calendar"}
                })
        
        # Budget/expense actions
        elif intent == "wins" and any(word in message_lower for word in ["spent", "expense", "cost"]):
            # Try to extract expense amount
            expense_data = self._extract_expense_data(message)
            
            if expense_data:
                actions.extend([
                    {
                        "type": "navigate",
                        "target": "/wins",
                        "params": {"view": "expenses"}
                    },
                    {
                        "type": "add_expense",
                        "payload": expense_data
                    }
                ])
            else:
                actions.append({
                    "type": "navigate",
                    "target": "/wins"
                })
        
        return actions
    
    def _extract_calendar_event(self, message: str) -> Optional[Dict[str, Any]]:
        """Extract calendar event details from message"""
        import re
        from datetime import datetime, timedelta
        
        message_lower = message.lower()
        
        # Simple event extraction
        event_data = {}
        
        # Extract event title (basic heuristic)
        title_patterns = [
            r'(?:schedule|book|add)\s+(?:a\s+)?(.+?)(?:\s+for|\s+at|\s+on|\s+tomorrow|\s+today|$)',
            r'(?:meeting|appointment)\s+(?:with\s+)?(.+?)(?:\s+at|\s+on|\s+tomorrow|\s+today|$)'
        ]
        
        for pattern in title_patterns:
            match = re.search(pattern, message_lower)
            if match:
                event_data['title'] = match.group(1).strip().title()
                break
        
        if not event_data.get('title'):
            event_data['title'] = "Appointment"
        
        # Extract time (basic patterns)
        time_patterns = [
            r'at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?',
            r'(\d{1,2})(?::(\d{2}))?\s*(am|pm)',
        ]
        
        for pattern in time_patterns:
            match = re.search(pattern, message_lower)
            if match:
                hour = int(match.group(1))
                minute = int(match.group(2)) if match.group(2) else 0
                ampm = match.group(3)
                
                if ampm == 'pm' and hour != 12:
                    hour += 12
                elif ampm == 'am' and hour == 12:
                    hour = 0
                
                event_data['time'] = f"{hour:02d}:{minute:02d}"
                break
        
        # Extract date (basic patterns)
        if 'tomorrow' in message_lower:
            event_data['date'] = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        elif 'today' in message_lower:
            event_data['date'] = datetime.now().strftime('%Y-%m-%d')
        else:
            # Default to tomorrow
            event_data['date'] = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        
        return event_data if event_data.get('title') else None
    
    def _extract_expense_data(self, message: str) -> Optional[Dict[str, Any]]:
        """Extract expense details from message"""
        import re
        
        # Extract amount
        amount_patterns = [
            r'\$(\d+(?:\.\d{2})?)',
            r'(\d+)\s*dollars?',
            r'(\d+(?:\.\d{2})?)\s*\$'
        ]
        
        amount = None
        for pattern in amount_patterns:
            match = re.search(pattern, message)
            if match:
                amount = float(match.group(1))
                break
        
        if not amount:
            return None
        
        # Extract category (basic heuristic)
        category_keywords = {
            'fuel': ['fuel', 'gas', 'petrol', 'diesel'],
            'food': ['food', 'restaurant', 'grocery', 'meal', 'lunch', 'dinner'],
            'accommodation': ['hotel', 'motel', 'camping', 'campsite', 'accommodation'],
            'maintenance': ['repair', 'service', 'maintenance', 'mechanic'],
            'entertainment': ['movie', 'show', 'attraction', 'park', 'entertainment']
        }
        
        category = 'general'
        message_lower = message.lower()
        
        for cat, keywords in category_keywords.items():
            if any(keyword in message_lower for keyword in keywords):
                category = cat
                break
        
        return {
            'amount': amount,
            'category': category,
            'description': f"Expense: ${amount:.2f} for {category}",
            'date': datetime.now().strftime('%Y-%m-%d')
        }


# Create a singleton instance
simple_pam_service = SimplePamService()