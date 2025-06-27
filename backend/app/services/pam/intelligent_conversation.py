"""
Intelligent Conversation Handler for PAM
True AI-powered conversation using OpenAI, no canned responses
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import openai
import os
import json

from backend.app.models.domain.pam import PamResponse, PamContext, PamMemory
from backend.app.core.exceptions import PAMError
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

class IntelligentConversation:
    """AI-powered conversation handler using OpenAI - no canned responses"""
    
    def __init__(self):
        self.client = None
        self.system_prompt = """You are PAM (Personal AI Manager), an intelligent AI assistant specifically designed for RV travelers and digital nomads. You are knowledgeable, helpful, and conversational - just like ChatGPT, but with specialized knowledge about:

- RV travel, camping, and road trips
- Personal finance and budgeting for travelers
- Route planning and travel logistics
- RV maintenance and technical issues
- Campground recommendations and reviews
- Travel safety and emergency preparedness
- Digital nomad lifestyle and remote work

Your personality:
- Enthusiastic about travel and the RV lifestyle
- Practical and solution-oriented
- Friendly and conversational (not robotic)
- Knowledgeable but humble - admit when you don't know something
- Supportive and encouraging about travel dreams and financial goals

You have access to the user's:
- Travel history and preferences
- Budget and expense data
- Current location and planned routes
- Previous conversations and context

Respond naturally and conversationally, just as ChatGPT would, but with your specialized knowledge and access to the user's data. Never use canned or templated responses."""

    async def initialize(self):
        """Initialize OpenAI client"""
        try:
            openai_key = getattr(settings, 'OPENAI_API_KEY', None) or os.getenv('OPENAI_API_KEY')
            if openai_key:
                self.client = openai.AsyncOpenAI(api_key=openai_key)
                logger.info("OpenAI client initialized for PAM")
            else:
                logger.error("No OpenAI API key found - PAM will not function properly")
                raise PAMError("OpenAI API key required for PAM to function")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {e}")
            raise PAMError(f"Failed to initialize AI conversation: {e}")

    async def analyze_intent(self, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze message intent using AI"""
        if not self.client:
            raise PAMError("AI client not initialized")
            
        try:
            intent_prompt = f"""Analyze this user message and determine the intent. Consider the context provided.

User message: "{message}"
Context: {json.dumps(context, default=str)}

Available intents:
- budget_query: Questions about spending, money, financial status
- expense_log: User wants to record/log an expense
- income_tracking: Recording income or earnings
- route_planning: Planning travel routes, asking for directions
- campground_search: Looking for camping spots, RV parks
- fuel_prices: Gas prices, fuel stop information
- weather_check: Weather information requests
- maintenance_reminder: Vehicle maintenance questions/reminders
- social_interaction: Connecting with other travelers, finding groups
- general_chat: Casual conversation, greetings, general questions
- emergency_help: Urgent help needed

Return ONLY a JSON object with:
{{
    "intent": "intent_name",
    "confidence": 0.0-1.0,
    "entities": {{"key": "extracted_value"}},
    "required_data": ["what_additional_info_needed"],
    "context_triggers": {{"relevant_context_key": "value"}}
}}"""

            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",  # Fast and cost-effective for classification
                messages=[
                    {"role": "system", "content": "You are an expert intent classifier. Return only valid JSON."},
                    {"role": "user", "content": intent_prompt}
                ],
                temperature=0.2,
                max_tokens=300
            )
            
            result = json.loads(response.choices[0].message.content)
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI intent response: {e}")
            return self._fallback_intent_analysis(message)
        except Exception as e:
            logger.error(f"AI intent analysis failed: {e}")
            return self._fallback_intent_analysis(message)

    async def generate_response(self, message: str, context: Dict[str, Any], user_data: Optional[Dict] = None) -> Dict[str, Any]:
        """Generate intelligent, natural response using AI"""
        if not self.client:
            raise PAMError("AI client not initialized")
            
        try:
            # Build context for AI
            context_info = self._build_context_string(context, user_data)
            
            conversation_prompt = f"""User message: "{message}"

{context_info}

Respond naturally and helpfully as PAM. If the user is asking about their data (expenses, routes, etc.), acknowledge that you can access it and provide relevant insights. If you need to perform actions (like looking up campgrounds or calculating budgets), mention that you can do that for them.

Be conversational and helpful, not robotic. Respond exactly as ChatGPT would, but with your specialized RV/travel knowledge and access to their personal data."""

            response = await self.client.chat.completions.create(
                model="gpt-4o",  # Use the best model for natural conversation
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": conversation_prompt}
                ],
                temperature=0.7,
                max_tokens=500
            )
            
            content = response.choices[0].message.content
            
            # Generate smart suggestions based on the conversation
            suggestions = await self._generate_smart_suggestions(message, content, context)
            
            return {
                'content': content,
                'suggestions': suggestions
            }
            
        except Exception as e:
            logger.error(f"AI response generation failed: {e}")
            raise PAMError(f"Failed to generate AI response: {e}")

    async def _generate_smart_suggestions(self, user_message: str, ai_response: str, context: Dict[str, Any]) -> List[str]:
        """Generate contextual follow-up suggestions"""
        if not self.client:
            return ["Tell me more", "What else can you help with?", "Show me my data"]
            
        try:
            suggestions_prompt = f"""Based on this conversation, suggest 3-4 natural follow-up questions or requests the user might want to make.

User: "{user_message}"
PAM: "{ai_response}"
Context: {json.dumps(context, default=str)}

Generate practical, specific suggestions that would be helpful for an RV traveler. Make them conversational, not robotic.

Return ONLY a JSON array of strings: ["suggestion1", "suggestion2", "suggestion3"]"""

            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "Generate helpful follow-up suggestions. Return only a JSON array."},
                    {"role": "user", "content": suggestions_prompt}
                ],
                temperature=0.8,
                max_tokens=150
            )
            
            suggestions = json.loads(response.choices[0].message.content)
            return suggestions[:4]  # Limit to 4 suggestions
            
        except Exception as e:
            logger.error(f"Failed to generate smart suggestions: {e}")
            return [
                "Tell me more about this",
                "What are my options?", 
                "Help me with something else",
                "Show me my current data"
            ]

    def _build_context_string(self, context: Dict[str, Any], user_data: Optional[Dict] = None) -> str:
        """Build context information for AI"""
        context_parts = []
        
        if context.get('conversation_history'):
            context_parts.append(f"Recent conversation: {context['conversation_history'][-3:]}")
        
        if context.get('preferences'):
            context_parts.append(f"User preferences: {context['preferences']}")
        
        if user_data:
            if user_data.get('current_location'):
                context_parts.append(f"Current location: {user_data['current_location']}")
            if user_data.get('budget_summary'):
                context_parts.append(f"Budget info: {user_data['budget_summary']}")
            if user_data.get('recent_expenses'):
                context_parts.append(f"Recent expenses: {user_data['recent_expenses']}")
            if user_data.get('travel_plans'):
                context_parts.append(f"Travel plans: {user_data['travel_plans']}")
        
        return "\n".join(context_parts) if context_parts else "No additional context available."

    def _fallback_intent_analysis(self, message: str) -> Dict[str, Any]:
        """Simple keyword-based fallback if AI fails"""
        message_lower = message.lower()
        
        # Basic keyword matching
        if any(word in message_lower for word in ['budget', 'money', 'spend', 'cost', 'expense']):
            return {'intent': 'budget_query', 'confidence': 0.6, 'entities': {}, 'required_data': [], 'context_triggers': {}}
        elif any(word in message_lower for word in ['route', 'drive', 'travel', 'direction']):
            return {'intent': 'route_planning', 'confidence': 0.6, 'entities': {}, 'required_data': [], 'context_triggers': {}}
        elif any(word in message_lower for word in ['camp', 'park', 'rv park', 'campground']):
            return {'intent': 'campground_search', 'confidence': 0.6, 'entities': {}, 'required_data': [], 'context_triggers': {}}
        else:
            return {'intent': 'general_chat', 'confidence': 0.5, 'entities': {}, 'required_data': [], 'context_triggers': {}}

    async def handle_general_conversation(self, message: str, context: PamContext, 
                                        memories: List[PamMemory]) -> PamResponse:
        """Handle conversation using AI, not canned responses"""
        try:
            # Convert context and memories to usable format
            context_dict = context.dict() if hasattr(context, 'dict') else {}
            
            # Add memories to context
            if memories:
                context_dict['relevant_memories'] = [
                    {'content': mem.content, 'created_at': str(mem.created_at)} 
                    for mem in memories[-5:]  # Last 5 memories
                ]
            
            # Generate AI response
            ai_response = await self.generate_response(message, context_dict)
            
            return PamResponse(
                content=ai_response['content'],
                confidence=0.9,  # High confidence since it's AI-generated
                suggestions=ai_response['suggestions'],
                requires_followup=False
            )
            
        except Exception as e:
            logger.error(f"AI conversation handling failed: {str(e)}")
            raise PAMError(f"Failed to handle conversation with AI: {str(e)}")
