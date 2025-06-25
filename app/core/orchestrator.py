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
from app.nodes.memory_node import MemoryNode
from app.core.intelligent_conversation import IntelligentConversationHandler

# Import the enhanced route intelligence
from app.core.route_intelligence import route_intelligence

# Import the scraping function
try:
    from scraper_service.main import fetch_and_parse
    SCRAPER_AVAILABLE = True
except ImportError as e:
    logging.warning(f"Scraper service not available: {e}")
    SCRAPER_AVAILABLE = False

logger = logging.getLogger("pam")

class ActionPlanner:
    def __init__(self):
        self.memory_node = MemoryNode()
        self.intelligent_handler = IntelligentConversationHandler()

    async def plan(self, message: str, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Intelligent conversation planning using OpenAI"""
        user_id = context.get("user_id")
        session_id = context.get("session_id")
        
        # Get conversation context from memory
        if user_id:
            enhanced_context = await self.memory_node.get_enhanced_context(user_id, message, session_id)
            context.update(enhanced_context)
        
        try:
            # Use intelligent conversation analysis
            analysis = await self.intelligent_handler.analyze_conversation(
                current_message=message,
                conversation_history=context.get("conversation_history", []),
                user_profile=context.get("user_profile", {})
            )
            
            # Extract intent from analysis
            intent_data = analysis.get("intent", {})
            domain_str = intent_data.get("domain", "general")
            
            # Create response from AI analysis
            ai_response = analysis.get("response", {})
            result = {
                "type": ai_response.get("type", "message"),
                "content": ai_response.get("content", "I'm here to help! How can I assist you today?"),
                "suggested_actions": ai_response.get("suggested_actions", [])
            }
            
            # Store interaction in memory
            if user_id:
                await self.memory_node.store_interaction(
                    user_id=user_id,
                    user_message=message,
                    pam_response=result.get("content", ""),
                    session_id=session_id or "default_session",
                    intent=domain_str,
                    intent_confidence=intent_data.get("confidence", 0.5),
                    context_used=context,
                    node_used="intelligent_handler"
                )
            
            return [result]
            
        except Exception as e:
            print(f"❌ Error in intelligent planning: {str(e)}")
            # Fallback to simple response
            return [{
                "type": "message",
                "content": "I'm here to help with your travel planning, budgeting, and social connections. What would you like to do?"
            }]

# Create global orchestrator instance
orchestrator = ActionPlanner()
