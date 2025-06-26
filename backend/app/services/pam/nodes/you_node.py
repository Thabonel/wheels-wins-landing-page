
"""
YOU Node - Personal Assistant and General Chat
Handles personal conversations, goal setting, and general assistance.
"""

import json
from typing import Dict, Any, List, Optional
from datetime import datetime, date

from backend.app.core.logging import setup_logging
from backend.app.services.database import get_database_service
from backend.app.models.domain.pam import PamResponse
from backend.app.services.pam.nodes.base_node import BaseNode

logger = setup_logging()

class YouNode(BaseNode):
    """YOU node for personal assistance and general chat"""
    
    def __init__(self):
        super().__init__("you")
        self.database_service = None
    
    async def initialize(self):
        """Initialize YOU node"""
        self.database_service = await get_database_service()
        logger.info("YOU node initialized")
    
    async def process(self, input_data: Dict[str, Any]) -> PamResponse:
        """Process personal and general chat requests"""
        if not self.database_service:
            await self.initialize()
        
        user_id = input_data.get('user_id')
        message = input_data.get('message', '').lower()
        intent = input_data.get('intent')
        entities = input_data.get('entities', {})
        
        try:
            if any(word in message for word in ['goal', 'plan', 'dream', 'want to', 'hope to']):
                return await self._handle_goal_setting(user_id, message, entities)
            elif any(word in message for word in ['day', 'today', 'yesterday', 'tomorrow']):
                return await self._handle_daily_conversation(user_id, message, entities)
            elif any(word in message for word in ['help', 'emergency', 'problem', 'issue', 'stuck']):
                return await self._handle_help_requests(user_id, message, entities)
            elif any(word in message for word in ['thank', 'thanks', 'good job', 'great']):
                return await self._handle_appreciation(user_id, message)
            elif any(word in message for word in ['how are you', 'what\'s up', 'hello', 'hi']):
                return await self._handle_greetings(user_id, message)
            else:
                return await self._handle_general_conversation(user_id, message, entities)
                
        except Exception as e:
            logger.error(f"YOU node processing error: {e}")
            return PamResponse(
                content="I'm here for you! How can I help make your RV life better today?",
                confidence=0.6,
                requires_followup=True
            )
    
    async def _handle_goal_setting(self, user_id: str, message: str, entities: Dict[str, Any]) -> PamResponse:
        """Handle goal setting and planning conversations"""
        try:
            # Store the goal/plan in life memory
            query = """
                INSERT INTO pam_life_memory (user_id, content, topic)
                VALUES ($1, $2, 'goals')
                RETURNING id
            """
            
            await self.database_service.execute_single(
                query, user_id, message, 
            )
            
            # Provide encouraging response with actionable suggestions
            goal_responses = [
                "🎯 I love that you're setting goals! Planning is so important for RV life.",
                "✨ That sounds like an exciting plan! Let me help you think through it.",
                "🚀 Goals keep us moving forward! What's the first step you want to take?",
                "💫 I'm excited to help you achieve that! Let's break it down into smaller steps."
            ]
            
            import random
            main_response = random.choice(goal_responses)
            
            response_parts = [main_response, ""]
            
            # Provide relevant suggestions based on goal type
            if any(word in message for word in ['travel', 'visit', 'go to', 'trip']):
                response_parts.extend([
                    "🗺️ **For Travel Goals:**",
                    "• Plan your route and stops",
                    "• Research campgrounds and attractions", 
                    "• Budget for fuel and activities",
                    "• Check weather and road conditions",
                    "• Make reservations if needed"
                ])
                suggestions = [
                    "Help me plan this route",
                    "Find campgrounds along the way",
                    "Check travel costs"
                ]
            elif any(word in message for word in ['money', 'save', 'earn', 'budget', 'financial']):
                response_parts.extend([
                    "💰 **For Financial Goals:**",
                    "• Set up a specific budget",
                    "• Track your expenses daily",
                    "• Look for money-saving opportunities",
                    "• Consider income sources on the road",
                    "• Review and adjust regularly"
                ])
                suggestions = [
                    "Set up a budget plan",
                    "Track my expenses", 
                    "Find money-making ideas"
                ]
            else:
                response_parts.extend([
                    "📋 **Making Goals Happen:**",
                    "• Write down specific, measurable steps",
                    "• Set realistic timelines",
                    "• Track your progress regularly",
                    "• Celebrate small wins along the way",
                    "• Adjust as needed - flexibility is key in RV life!"
                ])
                suggestions = [
                    "Help me make a plan",
                    "Set reminders for progress",
                    "Track my achievements"
                ]
            
            return PamResponse(
                content="\n".join(response_parts),
                confidence=0.8,
                suggestions=suggestions,
                requires_followup=True
            )
            
        except Exception as e:
            logger.error(f"Goal setting error: {e}")
            return PamResponse(
                content="I love that you're setting goals! Planning ahead makes RV life so much more enjoyable. What's the first step you want to take toward achieving this?",
                confidence=0.7,
                suggestions=[
                    "Help me make a plan",
                    "Set up reminders",
                    "Track my progress"
                ],
                requires_followup=True
            )
    
    async def _handle_daily_conversation(self, user_id: str, message: str, entities: Dict[str, Any]) -> PamResponse:
        """Handle daily life conversations"""
        try:
            # Store in conversation memory
            memory_query = """
                INSERT INTO pam_life_memory (user_id, content, topic)
                VALUES ($1, $2, 'daily_life')
            """
            
            await self.database_service.execute_mutation(memory_query, user_id, message)
            
            # Provide supportive responses based on content
            if any(word in message for word in ['bad', 'terrible', 'awful', 'difficult', 'hard']):
                return PamResponse(
                    content="""😔 I'm sorry you're having a tough time. RV life has its challenges, but you're handling it!

🤗 **Remember:**
• Every RVer has difficult days - you're not alone
• Tomorrow often brings new scenery and opportunities
• The RV community is incredibly supportive
• Sometimes a change of location helps reset your mood

💪 **Things that might help:**
• Take a walk outside and enjoy nature
• Connect with other RVers online or at your campground
• Plan something fun for tomorrow
• Remember why you chose this lifestyle

Is there anything specific I can help you with to improve your day?""",
                    confidence=0.8,
                    suggestions=[
                        "Find nearby activities",
                        "Connect with other RVers",
                        "Plan tomorrow's adventure",
                        "Show me inspiring RV stories"
                    ],
                    requires_followup=True
                )
            
            elif any(word in message for word in ['good', 'great', 'amazing', 'wonderful', 'beautiful']):
                return PamResponse(
                    content="""🌟 That's wonderful to hear! I love when RVers are having great experiences!

✨ **I'm so glad you're:**
• Enjoying the freedom of RV life
• Making positive memories on the road
• Appreciating all the beautiful places you can explore

📸 **Don't forget to:**
• Take photos of special moments
• Share your joy with other RVers
• Remember this feeling on tougher days
• Maybe plan your next amazing destination!

What made today especially great for you?""",
                    confidence=0.9,
                    suggestions=[
                        "Plan my next adventure",
                        "Share with the community",
                        "Find similar experiences",
                        "Save this memory"
                    ],
                    requires_followup=True
                )
            
            else:
                return PamResponse(
                    content="""Thanks for sharing about your day! I love hearing about RV life experiences.

🚐 **Every day on the road is unique** - some are adventures, some are rest days, and some are just about enjoying the simple freedom of mobile living.

What's the best part about where you are right now?""",
                    confidence=0.7,
                    suggestions=[
                        "Tell me about your location",
                        "Plan tomorrow's activities", 
                        "Share your experience",
                        "Find things to do nearby"
                    ],
                    requires_followup=True
                )
            
        except Exception as e:
            logger.error(f"Daily conversation error: {e}")
            return PamResponse(
                content="Thanks for sharing! I love hearing about your RV adventures. How can I help make your day even better?",
                confidence=0.6,
                requires_followup=True
            )
    
    async def _handle_help_requests(self, user_id: str, message: str, entities: Dict[str, Any]) -> PamResponse:
        """Handle requests for help or emergency situations"""
        if any(word in message for word in ['emergency', 'urgent', 'stuck', 'broken down']):
            return PamResponse(
                content="""🚨 **RV Emergency Resources**

**Immediate Safety:**
• If life-threatening: Call 911
• For roadside assistance: Contact your provider (Good Sam, AAA, etc.)
• Share your location with someone you trust

📞 **Common RV Emergency Contacts:**
• Good Sam Emergency Road Service: 1-877-475-2596
• Coach-Net: 1-800-562-5683
• FMCA Emergency Road Service: 1-800-543-3622
• AAA: 1-800-AAA-HELP

🛠️ **Common Quick Fixes:**
• Tire issues: Check your spare and tools
• Electrical: Check breakers and fuses
• Water: Know your shutoff locations
• Propane: Keep spare tanks and know shutoffs

👥 **Community Help:**
• Post in local RV Facebook groups
• Ask nearby campers for assistance
• Contact campground management
• Use RV forums for technical questions

Are you safe right now? What specific issue can I help you troubleshoot?""",
                confidence=0.9,
                suggestions=[
                    "Find roadside assistance",
                    "Connect with local RVers",
                    "Troubleshoot specific issue",
                    "Emergency preparedness tips"
                ],
                requires_followup=True
            )
        
        else:
            return PamResponse(
                content="""🤝 **I'm here to help!**

I can assist you with:
• 💰 Financial tracking and budgeting
• 🗺️ Route planning and travel advice
• 🏕️ Finding campgrounds and attractions
• 👥 Connecting with the RV community  
• 🔧 Basic RV maintenance reminders
• 📱 General RV life questions and support

What specific area would you like help with? Don't hesitate to ask - the RV community is all about helping each other!""",
                confidence=0.8,
                suggestions=[
                    "Help with my budget",
                    "Plan my next route",
                    "Find nearby campgrounds", 
                    "RV maintenance questions"
                ],
                requires_followup=True
            )
    
    async def _handle_appreciation(self, user_id: str, message: str) -> PamResponse:
        """Handle expressions of gratitude"""
        appreciation_responses = [
            "🤗 You're so welcome! I'm here to make your RV journey easier and more enjoyable.",
            "😊 It makes me happy to help! That's what the RV community is all about - supporting each other.",
            "✨ Thank you for the kind words! I love being part of your RV adventure.",
            "🚐 Glad I could help! Safe travels and happy camping!"
        ]
        
        import random
        response = random.choice(appreciation_responses)
        
        return PamResponse(
            content=f"{response}\n\nIs there anything else I can help you with today?",
            confidence=0.9,
            suggestions=[
                "Plan my next stop",
                "Check my budget",
                "Find things to do",
                "Just chat"
            ],
            requires_followup=False
        )
    
    async def _handle_greetings(self, user_id: str, message: str) -> PamResponse:
        """Handle greetings and casual conversation starters"""
        try:
            # Get time-based greeting
            current_hour = datetime.now().hour
            if current_hour < 12:
                time_greeting = "Good morning"
            elif current_hour < 17:
                time_greeting = "Good afternoon" 
            else:
                time_greeting = "Good evening"
            
            greeting_responses = [
                f"{time_greeting}! Ready for another day of RV adventures?",
                f"{time_greeting}! How's life on the road treating you today?",
                f"{time_greeting}! What can I help you with in your RV journey?",
                f"{time_greeting}! Hope you're enjoying the freedom of the open road!"
            ]
            
            import random
            main_greeting = random.choice(greeting_responses)
            
            return PamResponse(
                content=f"👋 {main_greeting}",
                confidence=0.8,
                suggestions=[
                    "What's the weather like ahead?",
                    "Help me plan my route",
                    "Check my budget status",
                    "Find campgrounds nearby"
                ],
                requires_followup=True
            )
            
        except Exception as e:
            logger.error(f"Greeting handling error: {e}")
            return PamResponse(
                content="👋 Hello there! I'm PAM, your RV life assistant. How can I help make your journey better today?",
                confidence=0.7,
                requires_followup=True
            )
    
    async def _handle_general_conversation(self, user_id: str, message: str, entities: Dict[str, Any]) -> PamResponse:
        """Handle general conversation that doesn't fit other categories"""
        try:
            # Store in general conversation memory
            memory_query = """
                INSERT INTO pam_life_memory (user_id, content, topic)
                VALUES ($1, $2, 'general')
            """
            
            await self.database_service.execute_mutation(memory_query, user_id, message)
            
            return PamResponse(
                content="""That's interesting! I love learning about your RV experiences and thoughts.

🚐 **I'm here to chat about anything related to your RV life:**
• Your daily adventures and experiences
• Questions about RV living
• Planning future trips and goals
• Managing life on the road
• Connecting with the RV community

RV life is about so much more than just travel - it's about freedom, community, and making every day an adventure!

What's on your mind today?""",
                confidence=0.6,
                suggestions=[
                    "Tell me about your current location",
                    "Help me plan something fun",
                    "Share RV life tips",
                    "Just keep chatting"
                ],
                requires_followup=True
            )
            
        except Exception as e:
            logger.error(f"General conversation error: {e}")
            return PamResponse(
                content="I'm here to chat and help with whatever's on your mind about RV life! What would you like to talk about?",
                confidence=0.5,
                requires_followup=True
            )

# Global YOU node instance
you_node = YouNode()
