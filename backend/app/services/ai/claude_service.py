"""
Claude Service - Anthropic AI Integration
Handles conversational AI, content generation, and complex reasoning
"""
import os
from typing import Dict, List, Any, Optional
from datetime import datetime

# Safe import of anthropic
try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    anthropic = None
    ANTHROPIC_AVAILABLE = False

from app.core.logging import logger
from app.core.config import get_settings


class ClaudeService:
    """
    Service for interacting with Anthropic's Claude AI
    Optimized for conversational AI and creative tasks
    """
    
    def __init__(self):
        settings = get_settings()
        api_key = os.getenv("ANTHROPIC-WHEELS-KEY") or settings.ANTHROPIC_API_KEY
        
        if not ANTHROPIC_AVAILABLE:
            logger.warning("⚠️ Anthropic package not installed - Claude service unavailable")
            self.client = None
        elif not api_key:
            logger.warning("⚠️ Anthropic API key not found")
            self.client = None
        else:
            self.client = anthropic.Anthropic(api_key=api_key)
            logger.info("✅ Claude service initialized")
    
    async def pam_conversation(
        self,
        message: str,
        user_context: Dict[str, Any],
        trip_context: Optional[Dict[str, Any]] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Handle PAM conversational AI with full context
        
        Args:
            message: User's message
            user_context: User profile and preferences
            trip_context: Current trip information
            conversation_history: Previous messages in conversation
            
        Returns:
            Dict with response and metadata
        """
        if not self.client:
            return {
                "response": "I'm sorry, I'm having trouble connecting to my AI service. Please try again later.",
                "error": "Anthropic client not initialized",
                "model": "claude-unavailable"
            }
        
        try:
            # Build system prompt with context
            system_prompt = self._build_pam_system_prompt(user_context, trip_context)
            
            # Format conversation history
            messages = []
            if conversation_history:
                messages.extend(conversation_history)
            messages.append({"role": "user", "content": message})
            
            # Make API call
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4000,
                temperature=0.7,
                system=system_prompt,
                messages=messages
            )
            
            # Extract response
            response_text = response.content[0].text
            
            return {
                "response": response_text,
                "model": "claude-3.5-sonnet",
                "tokens_used": response.usage.input_tokens + response.usage.output_tokens,
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Claude conversation error: {str(e)}")
            return {
                "response": "I apologize, but I'm having trouble processing your request. Please try again.",
                "error": str(e),
                "model": "claude-error"
            }
    
    async def generate_travel_itinerary(
        self,
        trip_details: Dict[str, Any],
        preferences: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate a detailed travel itinerary
        """
        if not self.client:
            return {"error": "Claude service not available"}
        
        try:
            prompt = f"""
            Create a detailed RV travel itinerary based on these details:
            
            Trip Details:
            - Start: {trip_details.get('start_location')}
            - End: {trip_details.get('end_location')}
            - Duration: {trip_details.get('duration_days')} days
            - RV Type: {trip_details.get('rv_type')}
            - Budget: ${trip_details.get('budget')}
            
            Preferences:
            - Travel Style: {preferences.get('travel_style')}
            - Interests: {', '.join(preferences.get('interests', []))}
            - Daily Driving Limit: {preferences.get('max_daily_miles', 300)} miles
            
            Include:
            1. Day-by-day breakdown with destinations
            2. RV-friendly campgrounds with amenities
            3. Must-see attractions along the route
            4. Estimated costs (fuel, camping, activities)
            5. Alternative routes for weather or preferences
            6. Safety tips and RV-specific considerations
            """
            
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4000,
                temperature=0.8,
                messages=[{"role": "user", "content": prompt}]
            )
            
            return {
                "itinerary": response.content[0].text,
                "model": "claude-3.5-sonnet",
                "tokens_used": response.usage.input_tokens + response.usage.output_tokens
            }
            
        except Exception as e:
            logger.error(f"❌ Itinerary generation error: {str(e)}")
            return {"error": str(e)}
    
    async def moderate_content(
        self,
        content: str,
        context: str = "community_post"
    ) -> Dict[str, Any]:
        """
        Moderate user-generated content for safety
        """
        if not self.client:
            return {"error": "Claude service not available"}
        
        try:
            prompt = f"""
            Analyze this {context} for content moderation.
            
            Content: "{content}"
            
            Check for:
            1. Inappropriate language or harassment
            2. Spam or promotional content
            3. Safety concerns or dangerous advice
            4. Misinformation about RV travel or camping
            
            Respond with:
            - approved: true/false
            - reason: if not approved, explain why
            - suggestions: how to improve the content if needed
            """
            
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=500,
                temperature=0.3,
                messages=[{"role": "user", "content": prompt}]
            )
            
            # Parse response (in production, use structured output)
            response_text = response.content[0].text
            
            return {
                "moderation_result": response_text,
                "model": "claude-3.5-sonnet",
                "tokens_used": response.usage.input_tokens + response.usage.output_tokens
            }
            
        except Exception as e:
            logger.error(f"❌ Content moderation error: {str(e)}")
            return {"error": str(e)}
    
    async def generate_travel_content(
        self,
        topic: str,
        style: str = "informative",
        length: str = "medium"
    ) -> Dict[str, Any]:
        """
        Generate travel-related content (blogs, guides, tips)
        """
        if not self.client:
            return {"error": "Claude service not available"}
        
        try:
            length_tokens = {"short": 500, "medium": 1500, "long": 3000}
            
            prompt = f"""
            Write a {style} {length} article about: {topic}
            
            Context: This is for RV travelers and camping enthusiasts.
            
            Include:
            - Practical tips and advice
            - Safety considerations
            - Cost-saving suggestions
            - Personal anecdotes or examples
            - Resources or links (as appropriate)
            
            Style: {style} (informative/conversational/technical/inspirational)
            """
            
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=length_tokens.get(length, 1500),
                temperature=0.8,
                messages=[{"role": "user", "content": prompt}]
            )
            
            return {
                "content": response.content[0].text,
                "model": "claude-3.5-sonnet",
                "tokens_used": response.usage.input_tokens + response.usage.output_tokens
            }
            
        except Exception as e:
            logger.error(f"❌ Content generation error: {str(e)}")
            return {"error": str(e)}
    
    async def analyze_trip_data(
        self,
        trip_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Analyze trip data for insights and recommendations
        """
        if not self.client:
            return {"error": "Claude service not available"}
        
        try:
            prompt = f"""
            Analyze this RV trip data and provide insights:
            
            Trip Data:
            {trip_data}
            
            Provide:
            1. Cost analysis and budget recommendations
            2. Route efficiency suggestions
            3. Safety considerations based on the route
            4. Best times to visit destinations
            5. Hidden gems or alternative stops
            6. Potential challenges and solutions
            """
            
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=2000,
                temperature=0.6,
                messages=[{"role": "user", "content": prompt}]
            )
            
            return {
                "analysis": response.content[0].text,
                "model": "claude-3.5-sonnet",
                "tokens_used": response.usage.input_tokens + response.usage.output_tokens
            }
            
        except Exception as e:
            logger.error(f"❌ Trip analysis error: {str(e)}")
            return {"error": str(e)}
    
    def _build_pam_system_prompt(
        self,
        user_context: Dict[str, Any],
        trip_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Build PAM's system prompt with user context"""
        
        prompt = f"""You are PAM (Personal Assistant Manager), the friendly and knowledgeable AI travel assistant for Wheels & Wins.

User Profile:
- Name: {user_context.get('name', 'Traveler')}
- RV Type: {user_context.get('rv_type', 'Not specified')}
- Experience Level: {user_context.get('experience_level', 'Beginner')}
- Travel Style: {user_context.get('travel_style', 'Casual')}
- Interests: {', '.join(user_context.get('interests', ['General RV travel']))}

"""
        
        if trip_context:
            prompt += f"""
Current Trip:
- Destination: {trip_context.get('destination', 'Planning')}
- Duration: {trip_context.get('duration', 'TBD')}
- Budget: ${trip_context.get('budget', 'Flexible')}
- Travelers: {trip_context.get('travelers', 1)}
- Special Requirements: {trip_context.get('requirements', 'None')}

"""
        
        prompt += """Your role:
1. Provide helpful, accurate RV travel advice
2. Be safety-conscious and practical
3. Consider the user's experience level
4. Offer cost-effective solutions
5. Be encouraging and supportive
6. Use a friendly, conversational tone
7. Ask clarifying questions when needed
8. Reference Wheels & Wins features when relevant

Remember: You're not just an AI, you're PAM - a trusted travel companion who wants to make every RV adventure safe, enjoyable, and memorable."""
        
        return prompt
    
    async def health_check(self) -> Dict[str, Any]:
        """Check if Claude service is operational"""
        try:
            if not self.client:
                return {
                    "status": "error",
                    "message": "Claude client not initialized",
                    "available": False
                }
            
            # Simple test message
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=10,
                messages=[{"role": "user", "content": "Hi"}]
            )
            
            return {
                "status": "healthy",
                "model": "claude-3.5-sonnet",
                "available": True,
                "response_time": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "available": False
            }