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
from app.services.database import get_database_service

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
        
        # Load comprehensive user data across all app sections
        comprehensive_data = {}
        if user_id != "anonymous":
            try:
                db_service = get_database_service()
                
                # Load complete user context - PAM's full knowledge base
                comprehensive_data = await db_service.get_comprehensive_user_context(user_id)
                
                # Add specialized insights
                financial_insights = await db_service.get_financial_travel_insights(user_id)
                social_connections = await db_service.get_social_travel_connections(user_id)
                
                comprehensive_data.update({
                    "financial_insights": financial_insights,
                    "social_connections": social_connections,
                    "has_data": True
                })
                
                logger.info(f"📊 Loaded comprehensive data for user {user_id}: "
                          f"{comprehensive_data.get('activity_summary', {})}")
                          
            except Exception as e:
                logger.warning(f"⚠️ Could not load comprehensive data for user {user_id}: {e}")
                comprehensive_data = {"has_data": False, "error": "Could not load user data"}
        
        # Build the conversation messages for OpenAI
        messages = self._build_conversation_messages(message, context, conversation_history, comprehensive_data)
        
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
        conversation_history: Optional[List[Dict]] = None,
        comprehensive_data: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, str]]:
        """Build the messages array for OpenAI"""
        
        # Build comprehensive user information for system message
        user_info = ""
        if comprehensive_data and comprehensive_data.get("has_data"):
            activity_summary = comprehensive_data.get("activity_summary", {})
            travel_data = comprehensive_data.get("travel", {})
            financial_data = comprehensive_data.get("financial", {})
            social_data = comprehensive_data.get("social", {})
            shopping_data = comprehensive_data.get("shopping", {})
            calendar_data = comprehensive_data.get("calendar", {})
            financial_insights = comprehensive_data.get("financial_insights", {})
            social_connections = comprehensive_data.get("social_connections", {})
            
            user_info = f"""

**COMPLETE USER PROFILE & ACTIVITY ACROSS ALL SECTIONS:**

**ACTIVITY SUMMARY:**
• Total trips: {activity_summary.get('total_trips', 0)}
• Total expenses tracked: {activity_summary.get('total_expenses', 0)}
• Social activity score: {activity_summary.get('total_social_activity', 0)}
• Total purchases: {activity_summary.get('total_purchases', 0)}

**🚐 WHEELS (Travel & Vehicles):**
Recent trips: {travel_data.get('trip_count', 0)}"""
            
            recent_trips = travel_data.get("recent_trips", [])
            for i, trip in enumerate(recent_trips[:3], 1):
                origin = trip.get("origin", {}).get("name", "Unknown") if trip.get("origin") else "Unknown"
                destination = trip.get("destination", {}).get("name", "Unknown") if trip.get("destination") else "Unknown"
                user_info += f"\n• Trip {i}: {trip.get('name', 'Untitled')} - From {origin} to {destination}"
                if trip.get("waypoints"):
                    user_info += f" ({len(trip['waypoints'])} stops)"
            
            user_info += f"""

**💰 WINS (Financial Management):**
• Total expenses: ${financial_data.get('total_expenses', 0):.2f}
• Total budget: ${financial_data.get('total_budget', 0):.2f}
• Travel expenses (6mo): ${financial_insights.get('total_travel_expenses', 0):.2f}
• Average trip cost: ${financial_insights.get('average_trip_cost', 0):.2f}
• Budget adherence: {financial_insights.get('budget_adherence', 0):.1f}%
• Top expense category: {financial_insights.get('most_expensive_category', 'N/A')}

**👥 SOCIAL (Community & Groups):**
• Groups joined: {len(social_data.get('groups', []))}
• Recent posts: {len(social_data.get('posts', []))}
• Social score: {social_data.get('social_score', 0)}
• Travel-social connections: {social_connections.get('travel_social_score', 0)}"""
            
            if social_data.get('groups'):
                user_info += "\n• Active in groups: " + ", ".join([g.get('name', 'Unnamed') for g in social_data['groups'][:3]])
            
            user_info += f"""

**🛒 SHOP (Purchases & Wishlists):**
• Total spent: ${shopping_data.get('total_spent', 0):.2f}
• Purchase history: {len(shopping_data.get('purchase_history', []))} items
• Wishlist items: {len(shopping_data.get('wishlists', []))}

**📅 YOU (Calendar & Personal):**
• Upcoming events: {len(calendar_data.get('upcoming_events', []))}"""
            
            if calendar_data.get('upcoming_events'):
                next_event = calendar_data['upcoming_events'][0]
                user_info += f"\n• Next event: {next_event.get('title', 'Untitled')} on {next_event.get('start_date', 'TBD')}"

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
- IMPORTANT: You have COMPLETE access to the user's data across ALL app sections and can provide intelligent, personalized assistance
- You can correlate data across sections (e.g., link trip expenses to budgets, suggest social groups based on travel, etc.)
- Provide proactive suggestions based on user patterns and preferences
- You can help users manage their entire travel lifestyle - from planning to budgeting to socializing

{user_info}

Current timestamp: {timestamp}
User context: {context}""".format(
                user_info=user_info,
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
        
        # ROBUST MEMORY: Load stored conversation history if not provided
        if not full_context.get("conversation_history") and user_id != "anonymous":
            try:
                db_service = get_database_service()
                stored_conversation = await db_service.get_conversation_context(user_id, limit=5)
                if stored_conversation:
                    # Convert database format to OpenAI format
                    full_context["conversation_history"] = [
                        {
                            "role": msg.get("role", "user"),
                            "content": msg.get("content", "")
                        }
                        for msg in stored_conversation
                        if msg.get("content")
                    ]
                    logger.info(f"📚 Loaded {len(full_context['conversation_history'])} stored messages for user {user_id}")
            except Exception as e:
                logger.warning(f"⚠️ Could not load stored conversation history: {e}")
                # Continue without stored history - don't break the conversation
        
        # Get the response
        response_content = await self.get_response(message, full_context)
        
        # Detect intent and generate UI actions
        intent = self._detect_simple_intent(message)
        ui_actions = self._generate_ui_actions(message, intent, response_content)
        
        # Handle calendar events - actually create them in the database with verification
        calendar_action_result = None
        if intent == "calendar" and any(word in message.lower() for word in ["appointment", "meeting", "schedule", "calendar", "flying", "flight"]):
            event_data = self._extract_calendar_event(message)
            if event_data:
                try:
                    # Create the actual calendar event in the database
                    success = await self.create_calendar_event_for_user(user_id, {
                        'title': event_data.get('title', 'New Event'),
                        'description': f"Created by PAM from: {message}",
                        'start_date': f"{event_data.get('date')}T{event_data.get('time', '09:00')}:00",
                        'end_date': f"{event_data.get('date')}T{event_data.get('time', '10:00')}:00",  # Default 1 hour duration
                        'location': '',
                        'event_type': 'personal',
                        'reminder_minutes': 60  # 1 hour reminder
                    })
                    
                    if success:
                        # VERIFY the event was actually created by checking the database
                        try:
                            db_service = get_database_service()
                            # Check for events created in the last 5 minutes with matching title
                            from datetime import datetime, timedelta
                            recent_time = (datetime.now() - timedelta(minutes=5)).isoformat()
                            
                            verification_result = db_service.client.table('calendar_events').select('*').eq('user_id', user_id).gte('created_at', recent_time).execute()
                            
                            if verification_result.data and any(event.get('title', '').lower() in event_data.get('title', '').lower() for event in verification_result.data):
                                calendar_action_result = "✅ VERIFIED: Calendar event successfully created"
                                logger.info(f"✅ VERIFIED: Calendar event created for user {user_id}")
                            else:
                                calendar_action_result = "❌ FAILED: Event creation reported success but could not verify in database"
                                logger.error(f"❌ VERIFICATION FAILED: Event not found in database for user {user_id}")
                        except Exception as ve:
                            calendar_action_result = "⚠️ UNCERTAIN: Event may have been created but verification failed"
                            logger.warning(f"⚠️ Could not verify calendar event creation: {ve}")
                    else:
                        calendar_action_result = "❌ FAILED: Calendar event creation failed"
                        logger.warning(f"⚠️ Failed to create calendar event for user {user_id}")
                        
                except Exception as e:
                    calendar_action_result = f"❌ ERROR: Calendar event creation failed with error: {str(e)}"
                    logger.error(f"❌ Error creating calendar event for user {user_id}: {e}")
                
                # Update response content to reflect actual result
                if calendar_action_result:
                    if "VERIFIED" in calendar_action_result:
                        # Success - enhance the positive response
                        response_content = response_content.replace(
                            "I'll add", "I have successfully added"
                        ).replace(
                            "I can", "I have"
                        ) + f"\n\n{calendar_action_result}"
                    else:
                        # Failure - be honest about it
                        response_content = f"I attempted to create the calendar event '{event_data.get('title', 'your event')}', but {calendar_action_result.split(': ', 1)[1] if ': ' in calendar_action_result else calendar_action_result}. Please try creating the event manually in your calendar app, or let me try again."
        
        # ROBUST MEMORY: Store conversation to database for persistence
        if user_id != "anonymous":
            try:
                db_service = get_database_service()
                memory_data = {
                    "user_message": message,
                    "assistant_response": response_content,
                    "intent": intent,
                    "confidence": 0.8,
                    "context": {
                        "session_id": session_id,
                        "ui_actions": ui_actions,
                        "timestamp": full_context.get("timestamp")
                    }
                }
                
                success = await db_service.store_conversation(user_id, session_id or "default", memory_data)
                if success:
                    logger.info(f"💾 Stored conversation for user {user_id}")
                else:
                    logger.warning(f"⚠️ Failed to store conversation for user {user_id}")
                    
            except Exception as e:
                logger.warning(f"⚠️ Could not store conversation: {e}")
                # Continue - don't break the response if storage fails
        
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
        
        # Extract event title (enhanced heuristic)
        title_patterns = [
            r'(?:schedule|book|add)\s+(?:a\s+)?(.+?)(?:\s+for|\s+at|\s+on|\s+tomorrow|\s+today|$)',
            r'(?:meeting|appointment)\s+(?:with\s+)?(.+?)(?:\s+at|\s+on|\s+tomorrow|\s+today|$)',
            r'(?:flying|flight)\s+to\s+(.+?)(?:\s+on|\s+at|$)',  # Handle "flying to Brisbane"
            r'i\s+am\s+(.+?)(?:\s+on|\s+at|$)',  # Handle "I am flying to Brisbane"
        ]
        
        for pattern in title_patterns:
            match = re.search(pattern, message_lower)
            if match:
                title = match.group(1).strip()
                if 'flying' in message_lower or 'flight' in message_lower:
                    event_data['title'] = f"Flight to {title.title()}"
                else:
                    event_data['title'] = title.title()
                break
        
        if not event_data.get('title'):
            if 'flying' in message_lower or 'flight' in message_lower:
                event_data['title'] = "Flight"
            else:
                event_data['title'] = "Appointment"
        
        # Extract time (enhanced patterns)
        time_patterns = [
            r'at\s+(\d{1,2})(?:[.:](\d{2}))?\s*(am|pm)',  # "at 9.30am" or "at 9:30am"
            r'(\d{1,2})(?:[.:](\d{2}))?\s*(am|pm)',       # "9.30am" or "9:30am"
            r'at\s+(\d{1,2})(?:[.:](\d{2}))?',            # "at 9.30" or "at 9:30"
            r'(\d{1,2})(?:[.:](\d{2}))?(?:\s+o\'?clock)?', # "9.30" or "9 o'clock"
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
        
        # Extract date (enhanced patterns)
        if 'tomorrow' in message_lower:
            event_data['date'] = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        elif 'today' in message_lower:
            event_data['date'] = datetime.now().strftime('%Y-%m-%d')
        else:
            # Look for specific dates like "on the 26th", "26th", "on 26th"
            date_patterns = [
                r'on\s+the\s+(\d{1,2})(?:st|nd|rd|th)?',
                r'on\s+(\d{1,2})(?:st|nd|rd|th)?',
                r'(\d{1,2})(?:st|nd|rd|th)',
            ]
            
            for pattern in date_patterns:
                match = re.search(pattern, message_lower)
                if match:
                    day = int(match.group(1))
                    current_date = datetime.now()
                    
                    # Assume current month, but if the day has passed, use next month
                    if day < current_date.day:
                        # Next month
                        if current_date.month == 12:
                            target_date = current_date.replace(year=current_date.year + 1, month=1, day=day)
                        else:
                            target_date = current_date.replace(month=current_date.month + 1, day=day)
                    else:
                        # This month
                        target_date = current_date.replace(day=day)
                    
                    event_data['date'] = target_date.strftime('%Y-%m-%d')
                    break
            
            # If no specific date found, default to tomorrow
            if not event_data.get('date'):
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
    
    # Comprehensive PAM Action Methods - Enable PAM to interact with ALL pages
    async def create_social_post_for_user(self, user_id: str, content: str, group_id: str = None) -> bool:
        """Allow PAM to create social posts for users with verification"""
        try:
            db_service = get_database_service()
            success = await db_service.create_social_post(user_id, content, 'text', group_id)
            
            if success:
                logger.info(f"📱 PAM created social post for user {user_id}")
                
                # ACTION VERIFICATION: Check if post was actually created
                try:
                    from datetime import datetime, timedelta
                    recent_time = (datetime.now() - timedelta(minutes=5)).isoformat()
                    
                    verification = db_service.client.table('social_posts').select('*').eq('user_id', user_id).gte('created_at', recent_time).execute()
                    if verification.data and any(post.get('content', '').lower() in content.lower() for post in verification.data):
                        logger.info(f"✅ VERIFIED: Social post successfully created")
                        return True
                    else:
                        logger.error(f"❌ VERIFICATION FAILED: Social post not found in database")
                        return False
                except Exception as ve:
                    logger.warning(f"⚠️ Could not verify social post creation: {ve}")
                    return success  # Return original result if verification fails
            return success
        except Exception as e:
            logger.error(f"❌ Error creating social post via PAM: {e}")
            return False
    
    async def add_to_user_wishlist(self, user_id: str, product_id: str, product_name: str, price: float, notes: str = '') -> bool:
        """Allow PAM to add items to user's wishlist with verification"""
        try:
            db_service = get_database_service()
            success = await db_service.add_to_wishlist(user_id, product_id, product_name, price, notes=notes)
            
            if success:
                logger.info(f"🛒 PAM added item to wishlist for user {user_id}")
                
                # ACTION VERIFICATION: Check if item was actually added
                try:
                    verification = db_service.client.table('wishlists').select('*').eq('user_id', user_id).eq('product_name', product_name).execute()
                    if verification.data:
                        logger.info(f"✅ VERIFIED: Wishlist item '{product_name}' successfully added")
                        return True
                    else:
                        logger.error(f"❌ VERIFICATION FAILED: Wishlist item '{product_name}' not found in database")
                        return False
                except Exception as ve:
                    logger.warning(f"⚠️ Could not verify wishlist addition: {ve}")
                    return success  # Return original result if verification fails
            return success
        except Exception as e:
            logger.error(f"❌ Error adding to wishlist via PAM: {e}")
            return False
    
    async def create_calendar_event_for_user(self, user_id: str, event_data: Dict[str, Any]) -> bool:
        """Allow PAM to create calendar events for users"""
        try:
            db_service = get_database_service()
            success = await db_service.create_calendar_event(user_id, event_data)
            
            if success:
                logger.info(f"📅 PAM created calendar event for user {user_id}")
            return success
        except Exception as e:
            logger.error(f"❌ Error creating calendar event via PAM: {e}")
            return False
    
    async def join_social_group_for_user(self, user_id: str, group_id: str) -> bool:
        """Allow PAM to help users join social groups with verification"""
        try:
            db_service = get_database_service()
            success = await db_service.join_social_group(user_id, group_id)
            
            if success:
                logger.info(f"👥 PAM helped user {user_id} join social group {group_id}")
                
                # ACTION VERIFICATION: Check if user was actually added to group
                try:
                    verification = db_service.client.table('group_memberships').select('*').eq('user_id', user_id).eq('group_id', group_id).execute()
                    if verification.data:
                        logger.info(f"✅ VERIFIED: User {user_id} successfully joined group {group_id}")
                        return True
                    else:
                        logger.error(f"❌ VERIFICATION FAILED: Group membership not found in database")
                        return False
                except Exception as ve:
                    logger.warning(f"⚠️ Could not verify group membership: {ve}")
                    return success  # Return original result if verification fails
            return success
        except Exception as e:
            logger.error(f"❌ Error joining social group via PAM: {e}")
            return False
    
    async def get_trip_expense_correlation(self, user_id: str, trip_id: str) -> Dict[str, Any]:
        """Get detailed correlation between a trip and related expenses"""
        try:
            db_service = get_database_service()
            correlation = await db_service.correlate_trip_expenses(user_id, trip_id)
            
            if correlation:
                logger.info(f"📊 PAM analyzed trip-expense correlation for user {user_id}")
            return correlation
        except Exception as e:
            logger.error(f"❌ Error getting trip expense correlation via PAM: {e}")
            return {}
    
    async def get_user_financial_insights(self, user_id: str) -> Dict[str, Any]:
        """Get comprehensive financial insights for intelligent advice"""
        try:
            db_service = get_database_service()
            insights = await db_service.get_financial_travel_insights(user_id)
            
            if insights:
                logger.info(f"💰 PAM analyzed financial insights for user {user_id}")
            return insights
        except Exception as e:
            logger.error(f"❌ Error getting financial insights via PAM: {e}")
            return {}
    
    async def update_user_trip(self, user_id: str, trip_id: str, updates: Dict[str, Any]) -> bool:
        """Update a user's trip with verification - can be called by PAM when users request trip modifications"""
        try:
            db_service = get_database_service()
            
            # Get original trip data for verification
            original_trip = await db_service.get_trip_details(trip_id)
            if not original_trip or original_trip.get('created_by') != user_id:
                logger.warning(f"🚫 User {user_id} not authorized to update trip {trip_id}")
                return False
            
            success = await db_service.update_trip(trip_id, user_id, updates)
            
            if success:
                logger.info(f"🔄 PAM updated trip {trip_id} for user {user_id}")
                
                # ACTION VERIFICATION: Check if updates were actually applied
                try:
                    updated_trip = await db_service.get_trip_details(trip_id)
                    if updated_trip:
                        # Check if at least one update was applied
                        verification_passed = False
                        for key, value in updates.items():
                            if updated_trip.get(key) == value:
                                verification_passed = True
                                break
                        
                        if verification_passed:
                            logger.info(f"✅ VERIFIED: Trip {trip_id} successfully updated")
                            return True
                        else:
                            logger.error(f"❌ VERIFICATION FAILED: Trip updates not found in database")
                            return False
                    else:
                        logger.error(f"❌ VERIFICATION FAILED: Could not retrieve updated trip")
                        return False
                except Exception as ve:
                    logger.warning(f"⚠️ Could not verify trip update: {ve}")
                    return success  # Return original result if verification fails
            else:
                logger.warning(f"⚠️ PAM failed to update trip {trip_id} for user {user_id}")
            
            return success
        except Exception as e:
            logger.error(f"❌ Error updating trip via PAM: {e}")
            return False
    
    async def get_trip_details_for_user(self, user_id: str, trip_id: str) -> Dict[str, Any]:
        """Get detailed trip information - can be called by PAM when users ask about specific trips"""
        try:
            db_service = get_database_service()
            trip = await db_service.get_trip_details(trip_id)
            
            # Ensure user owns the trip for security
            if trip and trip.get('created_by') == user_id:
                logger.info(f"📋 PAM retrieved trip details for {trip_id}")
                return trip
            else:
                logger.warning(f"🚫 User {user_id} not authorized to access trip {trip_id}")
                return {}
        except Exception as e:
            logger.error(f"❌ Error retrieving trip details via PAM: {e}")
            return {}


# Create a singleton instance
simple_pam_service = SimplePamService()