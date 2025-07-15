# app/core/intelligent_conversation.py
"""
PAM Intelligent Conversation Handler - OpenAI-powered natural language understanding
Replaces rigid keyword matching with intelligent conversation understanding
"""

import json
from typing import Dict, List, Any, Optional
from openai import AsyncOpenAI
from app.core.config import settings

class IntelligentConversationHandler:
    """Handles natural language conversation understanding using OpenAI"""
    
    def __init__(self):
        try:
            if not settings.OPENAI_API_KEY:
                print("⚠️ OpenAI API key not configured - using fallback analysis only")
                self.client = None
            else:
                self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
                print("✅ OpenAI client initialized for intelligent conversation")
        except Exception as e:
            print(f"❌ Failed to initialize OpenAI client: {e}")
            self.client = None
        
    async def analyze_conversation(
        self, 
        current_message: str, 
        conversation_history: List[Dict] = None,
        user_profile: Dict = None
    ) -> Dict[str, Any]:
        """Analyze the conversation and determine intent, context, and appropriate response"""
        
        # Build context for OpenAI
        context_prompt = self._build_context_prompt(current_message, conversation_history, user_profile)
        
        if not self.client:
            print("⚠️ OpenAI client not available, using fallback analysis")
            return self._fallback_analysis(current_message)
            
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system", 
                        "content": self._get_system_prompt()
                    },
                    {
                        "role": "user",
                        "content": context_prompt
                    }
                ],
                temperature=0.3,
                max_tokens=1000
            )
            
            # Parse the structured response
            analysis = json.loads(response.choices[0].message.content)
            return analysis
            
        except Exception as e:
            print(f"❌ Error in conversation analysis: {str(e)}")
            # Fallback to basic analysis
            return self._fallback_analysis(current_message)
    
    def _get_system_prompt(self) -> str:
        """System prompt that defines PAM's role and response structure"""
        return """You are PAM, an intelligent travel companion AI for Grey Nomads (RV travelers). 

Your role is to analyze conversations and determine:
1. What the user is trying to accomplish
2. What domain this relates to (wheels=travel, wins=money, social=community, you=profile)
3. Whether this continues a previous conversation
4. What specific actions to take
5. How to respond helpfully

You must respond with a JSON object containing:
{
    "intent": {
        "domain": "wheels|wins|social|you|general",
        "action": "plan|track|view|help|create|update",
        "confidence": 0.0-1.0,
        "is_continuation": true/false,
        "entities": {"extracted": "values"}
    },
    "response": {
        "type": "message|action|question",
        "content": "Your helpful response text",
        "suggested_actions": ["action1", "action2"]
    },
    "context_understanding": {
        "user_goal": "what user wants to accomplish",
        "missing_info": ["what info is needed"],
        "next_step": "what should happen next"
    }
}

Guidelines:
- Be conversational and helpful like ChatGPT
- Understand natural language, not just keywords
- Consider conversation flow and context
- For travel planning, be proactive about route suggestions
- Remember Grey Nomads travel in RVs/caravans
- Always try to move the conversation forward productively"""

    def _build_context_prompt(
        self, 
        current_message: str, 
        conversation_history: List[Dict] = None,
        user_profile: Dict = None
    ) -> str:
        """Build the context prompt for OpenAI analysis"""
        
        prompt = f"Current user message: '{current_message}'\n\n"
        
        # Add conversation history if available
        if conversation_history and len(conversation_history) > 0:
            prompt += "Recent conversation history:\n"
            for msg in conversation_history[-6:]:  # Last 6 messages
                role = "User" if msg.get("role") == "user" else "PAM"
                content = msg.get("content", "")
                prompt += f"{role}: {content}\n"
            prompt += "\n"
        
        # Add user profile context if available
        if user_profile:
            vehicle_info = user_profile.get("vehicle_info", {})
            travel_prefs = user_profile.get("travel_preferences", {})
            location_data = user_profile.get("location_data", {})
            
            prompt += "User profile context:\n"
            if vehicle_info.get("type"):
                prompt += f"- Vehicle: {vehicle_info.get('type')} {vehicle_info.get('make_model', '')}\n"
            if travel_prefs.get("style"):
                prompt += f"- Travel style: {travel_prefs.get('style')}\n"
            if travel_prefs.get("camp_types"):
                prompt += f"- Preferred camping: {travel_prefs.get('camp_types')}\n"
            if location_data.get("current_latitude"):
                prompt += f"- Has current location data\n"
            prompt += "\n"
        
        prompt += "Analyze this conversation and provide your structured JSON response:"
        
        return prompt
    
    def _fallback_analysis(self, message: str) -> Dict[str, Any]:
        """Fallback analysis when OpenAI fails"""
        message_lower = message.lower()
        
        # Simple keyword-based fallback
        if any(word in message_lower for word in ["trip", "travel", "route", "plan", "from", "to", "drive"]):
            domain = "wheels"
            action = "plan"
            confidence = 0.7
        elif any(word in message_lower for word in ["money", "budget", "expense", "cost", "spend"]):
            domain = "wins"
            action = "track" 
            confidence = 0.7
        elif any(word in message_lower for word in ["social", "group", "meet", "community"]):
            domain = "social"
            action = "view"
            confidence = 0.7
        elif any(word in message_lower for word in ["profile", "account", "settings", "me"]):
            domain = "you"
            action = "view"
            confidence = 0.7
        else:
            domain = "general"
            action = "help"
            confidence = 0.5
        
        return {
            "intent": {
                "domain": domain,
                "action": action,
                "confidence": confidence,
                "is_continuation": False,
                "entities": {}
            },
            "response": {
                "type": "message",
                "content": "I'd be happy to help! Could you tell me more about what you're looking for?",
                "suggested_actions": []
            },
            "context_understanding": {
                "user_goal": "unclear",
                "missing_info": ["clarification needed"],
                "next_step": "ask for more details"
            }
        }
