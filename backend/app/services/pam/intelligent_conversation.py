
"""
Intelligent Conversation Handler for PAM
"""

import logging
from typing import List, Dict, Any
from datetime import datetime

from app.models.domain.pam import PamResponse, PamContext, PamMemory
from app.core.exceptions import PAMError

logger = logging.getLogger("pam.conversation")

class IntelligentConversationHandler:
    """Handles general conversation and context-aware responses"""
    
    def __init__(self):
        self.default_responses = {
            "greeting": [
                "Hello! I'm PAM, your Personal AI Manager. How can I help you today?",
                "Hi there! I'm here to help with your travels, finances, and more. What's on your mind?",
                "Hey! Ready to tackle your day? I can help with budgets, routes, or just chat!"
            ],
            "help": [
                "I can help you with:\n• Budget tracking and expense management\n• Route planning and travel tips\n• Social connections and groups\n• Personal organization",
                "Here's what I can do:\n• Track your expenses and create budgets\n• Plan routes and find campsites\n• Connect you with RV communities\n• Manage your travel plans"
            ],
            "unknown": [
                "I'm not sure I understand. Could you be more specific?",
                "Let me help you with that. Could you provide more details?",
                "I want to help! Can you rephrase that or tell me what specific area you need assistance with?"
            ]
        }
    
    async def handle_general_conversation(self, message: str, context: PamContext, 
                                        memories: List[PamMemory]) -> PamResponse:
        """Handle general conversation using context and memories"""
        try:
            message_lower = message.lower()
            
            # Greeting detection
            if any(word in message_lower for word in ['hello', 'hi', 'hey', 'good morning', 'good afternoon']):
                return self._create_greeting_response(context)
            
            # Help request detection
            if any(word in message_lower for word in ['help', 'what can you do', 'assistance']):
                return self._create_help_response(context)
            
            # Context-aware response using memories
            if memories:
                return self._create_memory_based_response(message, memories, context)
            
            # Default response
            return self._create_default_response(message, context)
            
        except Exception as e:
            logger.error(f"General conversation handling failed: {str(e)}")
            raise PAMError(f"Failed to handle conversation: {str(e)}")
    
    def _create_greeting_response(self, context: PamContext) -> PamResponse:
        """Create a personalized greeting response"""
        suggestions = [
            "Show my budget summary",
            "Plan a new route",
            "Find nearby campgrounds",
            "Check my expenses"
        ]
        
        # Personalize based on context
        if context.recent_expenses:
            suggestions.insert(0, "Review recent expenses")
        
        if context.travel_plans:
            suggestions.insert(0, "Check travel plans")
        
        return PamResponse(
            content=self.default_responses["greeting"][0],
            intent=None,
            confidence=0.9,
            suggestions=suggestions[:4],  # Limit to 4 suggestions
            actions=[],
            requires_followup=False,
            context_updates={},
            voice_enabled=True
        )
    
    def _create_help_response(self, context: PamContext) -> PamResponse:
        """Create a help response with available actions"""
        suggestions = [
            "Create a new budget",
            "Track an expense",
            "Plan a route",
            "Find RV groups"
        ]
        
        return PamResponse(
            content=self.default_responses["help"][0],
            intent=None,
            confidence=0.95,
            suggestions=suggestions,
            actions=[
                {"type": "navigate", "target": "/wins", "label": "Go to Wins"},
                {"type": "navigate", "target": "/wheels", "label": "Go to Wheels"},
                {"type": "navigate", "target": "/social", "label": "Go to Social"}
            ],
            requires_followup=False,
            context_updates={},
            voice_enabled=True
        )
    
    def _create_memory_based_response(self, message: str, memories: List[PamMemory], 
                                    context: PamContext) -> PamResponse:
        """Create response based on relevant memories"""
        # Use the most relevant memory
        relevant_memory = memories[0]
        
        suggestions = [
            "Tell me more about this",
            "Show related information",
            "What else can you help with?"
        ]
        
        content = f"Based on our previous conversations, I remember you were interested in {relevant_memory.content[:100]}... How can I help you with that today?"
        
        return PamResponse(
            content=content,
            intent=None,
            confidence=0.8,
            suggestions=suggestions,
            actions=[],
            requires_followup=True,
            context_updates={"last_memory_used": relevant_memory.id},
            voice_enabled=True
        )
    
    def _create_default_response(self, message: str, context: PamContext) -> PamResponse:
        """Create a default response when intent is unclear"""
        suggestions = [
            "Help with budget",
            "Plan a route",
            "Find groups",
            "Ask a different question"
        ]
        
        return PamResponse(
            content=self.default_responses["unknown"][0],
            intent=None,
            confidence=0.3,
            suggestions=suggestions,
            actions=[],
            requires_followup=True,
            context_updates={},
            voice_enabled=True
        )
