"""
PAM 2.0 Advanced Prompt Engineering Service
Phase 2.2: Leverages enhanced memory and context for superior AI responses

Features:
- Memory-aware prompt construction
- Dynamic persona adaptation
- Context-sensitive response optimization
- User preference integration
- Conversation continuity enhancement
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from dataclasses import dataclass

from ..core.types import ConversationContext, MessageType
from ..core.exceptions import PAMBaseException

logger = logging.getLogger(__name__)

@dataclass
class PromptTemplate:
    """Structured prompt template with memory integration"""
    base_persona: str
    memory_context: str
    user_context: str
    conversation_history: str
    system_instructions: str
    user_message: str

class PromptEngineeringService:
    """
    Advanced prompt engineering service for PAM 2.0
    Transforms basic user inputs into rich, context-aware prompts
    """

    def __init__(self):
        self.prompt_cache = {}  # Cache frequently used prompt patterns
        self.persona_templates = self._load_persona_templates()
        self.response_styles = self._load_response_styles()

    def build_enhanced_prompt(
        self,
        user_message: str,
        conversation_context: Optional[ConversationContext] = None,
        user_profile: Optional[Dict[str, Any]] = None,
        location_context: Optional[Dict[str, Any]] = None,
        intent_analysis: Optional[str] = None
    ) -> str:
        """
        Build an advanced, memory-aware prompt for superior AI responses

        Args:
            user_message: The user's current message
            conversation_context: Enhanced memory context from MemoryService
            user_profile: User profile data
            location_context: Location and environment data
            intent_analysis: Classified user intent

        Returns:
            Optimized prompt string for Gemini API
        """
        try:
            logger.info(f"🎯 Building enhanced prompt for message: {user_message[:50]}...")

            # Analyze conversation context for prompt optimization
            memory_summary = self._extract_memory_summary(conversation_context)
            persona_mode = self._determine_persona_mode(user_message, memory_summary, intent_analysis)
            response_style = self._determine_response_style(user_message, conversation_context)

            # Build prompt components
            prompt_template = PromptTemplate(
                base_persona=self._build_base_persona(persona_mode),
                memory_context=self._build_memory_context(memory_summary, conversation_context),
                user_context=self._build_user_context(user_profile, location_context),
                conversation_history=self._build_conversation_history(conversation_context),
                system_instructions=self._build_system_instructions(intent_analysis, response_style),
                user_message=user_message
            )

            # Construct final prompt
            enhanced_prompt = self._construct_final_prompt(prompt_template)

            # Log prompt statistics
            self._log_prompt_statistics(enhanced_prompt, memory_summary, conversation_context)

            return enhanced_prompt

        except Exception as e:
            logger.error(f"❌ Enhanced prompt building failed: {e}")
            # Fallback to basic prompt
            return self._build_fallback_prompt(user_message, user_profile, location_context)

    def _extract_memory_summary(
        self,
        conversation_context: Optional[ConversationContext]
    ) -> Dict[str, Any]:
        """Extract and analyze memory context for prompt optimization"""

        if not conversation_context or not conversation_context.context_data:
            return {
                "has_memory": False,
                "message_count": 0,
                "themes": [],
                "preferences": {},
                "conversation_summaries": [],
                "memory_tokens": 0
            }

        context_data = conversation_context.context_data
        memory_context = context_data.get('memory_context', {})

        return {
            "has_memory": True,
            "message_count": len(conversation_context.messages),
            "themes": memory_context.get('conversation_themes', []),
            "topic_summary": memory_context.get('topic_summary', ''),
            "preferences": context_data.get('user_preferences', {}),
            "conversation_summaries": context_data.get('conversation_summaries', []),
            "memory_tokens": context_data.get('context_tokens', 0),
            "last_update": memory_context.get('last_context_update')
        }

    def _determine_persona_mode(
        self,
        user_message: str,
        memory_summary: Dict[str, Any],
        intent_analysis: Optional[str]
    ) -> str:
        """Determine the optimal persona mode based on context"""

        message_lower = user_message.lower()
        themes = memory_summary.get('themes', [])

        # Travel planning persona
        if any(theme in ['travel_planning', 'location_services'] for theme in themes) or \
           any(word in message_lower for word in ['trip', 'travel', 'destination', 'route', 'plan']):
            return 'travel_expert'

        # Financial advisor persona
        elif any(theme in ['financial_management'] for theme in themes) or \
             any(word in message_lower for word in ['budget', 'money', 'expense', 'cost', 'save']):
            return 'financial_advisor'

        # Technical support persona
        elif any(word in message_lower for word in ['error', 'problem', 'issue', 'broken', 'help', 'fix']):
            return 'technical_support'

        # Lifestyle coach persona for long-term users
        elif memory_summary.get('message_count', 0) > 50:
            return 'lifestyle_coach'

        # Default friendly assistant
        else:
            return 'friendly_assistant'

    def _determine_response_style(
        self,
        user_message: str,
        conversation_context: Optional[ConversationContext]
    ) -> str:
        """Determine optimal response style based on user patterns"""

        message_lower = user_message.lower()

        # Detailed explanations for questions
        if any(word in message_lower for word in ['how', 'why', 'what', 'explain', 'tell me about']):
            return 'detailed_explanation'

        # Quick action for requests
        elif any(word in message_lower for word in ['find', 'book', 'reserve', 'get', 'show me']):
            return 'actionable_response'

        # Step-by-step for complex tasks
        elif any(word in message_lower for word in ['setup', 'configure', 'install', 'create']):
            return 'step_by_step_guide'

        # Conversational for general chat
        else:
            return 'conversational'

    def _build_base_persona(self, persona_mode: str) -> str:
        """Build the base persona prompt based on mode"""

        base_intro = """You are PAM (Personal Assistant Manager), an advanced AI assistant for Wheels & Wins - the premier platform for RV travelers and digital nomads."""

        persona_profiles = {
            'travel_expert': f"""{base_intro}

🎯 **TRAVEL EXPERT MODE ACTIVATED**
You are operating as an expert RV travel advisor with deep knowledge of:
- Route planning and optimization for RVs
- Campground recommendations and booking strategies
- Weather-aware travel timing
- Vehicle-specific travel considerations
- Cost-effective travel planning
- Safety and maintenance tips for road travel

Your expertise shines when helping users plan memorable, safe, and budget-friendly RV adventures.""",

            'financial_advisor': f"""{base_intro}

💰 **FINANCIAL ADVISOR MODE ACTIVATED**
You are operating as a specialized financial advisor for mobile lifestyles with expertise in:
- RV travel budgeting and expense tracking
- Cost optimization for nomadic living
- Income strategies for digital nomads
- Tax considerations for mobile workers
- Emergency fund planning for travelers
- Vehicle maintenance budgeting

Your goal is to help users achieve financial freedom while living their travel dreams.""",

            'technical_support': f"""{base_intro}

🔧 **TECHNICAL SUPPORT MODE ACTIVATED**
You are operating as a knowledgeable technical support specialist with focus on:
- Troubleshooting RV systems and electronics
- Mobile internet and connectivity solutions
- App usage guidance and feature explanations
- Device compatibility and setup assistance
- Problem diagnosis and step-by-step solutions

Your mission is to resolve issues quickly and educate users for future self-sufficiency.""",

            'lifestyle_coach': f"""{base_intro}

🌟 **LIFESTYLE COACH MODE ACTIVATED**
You are operating as a personal lifestyle coach for experienced nomads with focus on:
- Long-term nomadic lifestyle optimization
- Work-life balance for remote workers
- Community building and social connections
- Personal growth through travel experiences
- Sustainable and mindful travel practices

You help seasoned travelers refine their lifestyle and achieve deeper fulfillment.""",

            'friendly_assistant': f"""{base_intro}

🤝 **FRIENDLY ASSISTANT MODE ACTIVATED**
You are operating as a warm, helpful general assistant with:
- Friendly, approachable communication style
- Broad knowledge across all Wheels & Wins features
- Ability to guide users to the right resources
- Encouraging and supportive tone
- Quick problem-solving skills

You're here to make every interaction pleasant and productive."""
        }

        return persona_profiles.get(persona_mode, persona_profiles['friendly_assistant'])

    def _build_memory_context(
        self,
        memory_summary: Dict[str, Any],
        conversation_context: Optional[ConversationContext]
    ) -> str:
        """Build rich memory context section"""

        if not memory_summary.get('has_memory'):
            return ""

        memory_prompt = "\n📚 **CONVERSATION MEMORY CONTEXT**\n"

        # Add topic summary
        if memory_summary.get('topic_summary'):
            memory_prompt += f"**Current conversation focus**: {memory_summary['topic_summary']}\n"

        # Add conversation themes
        if memory_summary.get('themes'):
            themes_str = ', '.join(memory_summary['themes'])
            memory_prompt += f"**Recurring themes**: {themes_str}\n"

        # Add conversation summaries for deeper context
        summaries = memory_summary.get('conversation_summaries', [])
        if summaries:
            memory_prompt += f"**Previous conversation context**: {summaries[0].get('summary_text', '')[:200]}...\n"

        # Add user preferences
        preferences = memory_summary.get('preferences', {})
        if preferences:
            context_prefs = preferences.get('context', {})
            if context_prefs.get('learned_patterns'):
                memory_prompt += f"**User patterns**: {context_prefs['learned_patterns']}\n"

        # Add message count for relationship building
        msg_count = memory_summary.get('message_count', 0)
        if msg_count > 0:
            if msg_count < 5:
                memory_prompt += "**Relationship**: New conversation - be welcoming and establish rapport\n"
            elif msg_count < 20:
                memory_prompt += "**Relationship**: Developing familiarity - build on previous interactions\n"
            else:
                memory_prompt += "**Relationship**: Established user - leverage deep conversation history\n"

        memory_prompt += "\n💡 **Use this memory context to provide personalized, contextually relevant responses that build on previous conversations.**\n"

        return memory_prompt

    def _build_user_context(
        self,
        user_profile: Optional[Dict[str, Any]],
        location_context: Optional[Dict[str, Any]]
    ) -> str:
        """Build comprehensive user context section"""

        context_prompt = ""

        # User profile integration
        if user_profile and user_profile.get('success') and user_profile.get('data', {}).get('profile_exists'):
            profile_data = user_profile['data']
            context_prompt += "\n👤 **USER PROFILE CONTEXT**\n"

            # Personal details
            personal = profile_data.get('personal_details', {})
            if personal.get('full_name'):
                context_prompt += f"**Name**: {personal['full_name']}\n"
            if personal.get('region'):
                context_prompt += f"**Region**: {personal['region']}\n"

            # Vehicle information with enhanced details
            vehicle = profile_data.get('vehicle_info', {})
            if vehicle.get('type') and vehicle.get('make_model_year'):
                context_prompt += f"**Vehicle**: {vehicle['type']} ({vehicle['make_model_year']})\n"
                if vehicle.get('fuel_type'):
                    context_prompt += f"**Fuel type**: {vehicle['fuel_type']}\n"

                # Add vehicle-specific guidance
                context_prompt += "💡 **When discussing vehicle-related topics, reference their specific vehicle for personalized advice.**\n"

            # Travel preferences
            travel = profile_data.get('travel_preferences', {})
            if travel.get('style'):
                context_prompt += f"**Travel style**: {travel['style']}\n"
            if travel.get('camp_types'):
                camp_types = ', '.join(travel['camp_types'])
                context_prompt += f"**Preferred camping**: {camp_types}\n"

        # Location context integration
        if location_context:
            context_prompt += "\n🌍 **LOCATION CONTEXT**\n"

            if location_context.get('location_name'):
                context_prompt += f"**Current location**: {location_context['location_name']}\n"
            elif location_context.get('city') and location_context.get('country'):
                context_prompt += f"**Current location**: {location_context['city']}, {location_context['country']}\n"

            if location_context.get('weather'):
                context_prompt += f"**Weather**: {location_context['weather']}\n"

            context_prompt += "💡 **Provide location-relevant recommendations and advice when appropriate.**\n"

        return context_prompt

    def _build_conversation_history(
        self,
        conversation_context: Optional[ConversationContext]
    ) -> str:
        """Build conversation history section with smart truncation"""

        if not conversation_context or not conversation_context.messages:
            return ""

        history_prompt = "\n💬 **RECENT CONVERSATION HISTORY**\n"

        # Use last 6 messages for context (3 exchanges)
        recent_messages = conversation_context.messages[-6:] if len(conversation_context.messages) > 6 else conversation_context.messages

        for msg in recent_messages:
            role = "User" if msg.type == MessageType.USER else "PAM"
            # Truncate very long messages
            content = msg.content[:150] + "..." if len(msg.content) > 150 else msg.content
            history_prompt += f"**{role}**: {content}\n"

        history_prompt += "\n💡 **Build upon this conversation naturally, referencing previous exchanges when relevant.**\n"

        return history_prompt

    def _build_system_instructions(
        self,
        intent_analysis: Optional[str],
        response_style: str
    ) -> str:
        """Build system instructions based on intent and style"""

        instructions = "\n⚙️ **RESPONSE INSTRUCTIONS**\n"

        # Style-specific instructions
        style_instructions = {
            'detailed_explanation': "Provide comprehensive, well-structured explanations with examples where helpful. Break down complex topics into digestible parts.",
            'actionable_response': "Focus on immediate, actionable steps. Provide clear next actions and relevant links or resources when possible.",
            'step_by_step_guide': "Present information in numbered steps with clear instructions. Include tips and potential troubleshooting points.",
            'conversational': "Maintain a natural, friendly conversation flow. Ask follow-up questions to better understand user needs."
        }

        instructions += f"**Response style**: {style_instructions.get(response_style, style_instructions['conversational'])}\n"

        # Intent-specific guidance
        if intent_analysis:
            instructions += f"**User intent**: {intent_analysis} - tailor your response accordingly\n"

        # General guidelines
        instructions += """
**Key guidelines**:
• Keep responses concise yet comprehensive
• Use emojis sparingly and appropriately
• Reference user context naturally (don't repeat it verbatim)
• Offer specific next steps or resources when helpful
• Maintain PAM's helpful and knowledgeable personality
• If uncertain, acknowledge limitations and suggest alternatives
"""

        return instructions

    def _construct_final_prompt(self, template: PromptTemplate) -> str:
        """Construct the final optimized prompt"""

        prompt_sections = [
            template.base_persona,
            template.memory_context,
            template.user_context,
            template.conversation_history,
            template.system_instructions,
            f"\n**Current user message**: {template.user_message}",
            "\n**PAM's Response**:"
        ]

        # Filter out empty sections
        final_prompt = "\n".join([section for section in prompt_sections if section.strip()])

        return final_prompt

    def _build_fallback_prompt(
        self,
        user_message: str,
        user_profile: Optional[Dict[str, Any]] = None,
        location_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Build a basic fallback prompt if enhancement fails"""

        basic_prompt = """You are PAM (Personal Assistant Manager), a helpful AI assistant for Wheels & Wins, a platform for RV travelers and digital nomads.

You are friendly, knowledgeable, and focused on helping users with travel planning, budgeting, and mobile living advice.

"""
        # Add minimal context if available
        if location_context and location_context.get('location_name'):
            basic_prompt += f"User location: {location_context['location_name']}\n"

        basic_prompt += f"\nUser: {user_message}\nPAM:"

        return basic_prompt

    def _log_prompt_statistics(
        self,
        prompt: str,
        memory_summary: Dict[str, Any],
        conversation_context: Optional[ConversationContext]
    ) -> None:
        """Log prompt statistics for optimization"""

        prompt_length = len(prompt)
        estimated_tokens = prompt_length // 4  # Rough token estimation
        memory_tokens = memory_summary.get('memory_tokens', 0)

        logger.info(f"🎯 Enhanced prompt statistics:")
        logger.info(f"   - Prompt length: {prompt_length} characters (~{estimated_tokens} tokens)")
        logger.info(f"   - Memory tokens: {memory_tokens}")
        logger.info(f"   - Has conversation history: {bool(conversation_context and conversation_context.messages)}")
        logger.info(f"   - Memory themes: {memory_summary.get('themes', [])}")

    def _load_persona_templates(self) -> Dict[str, str]:
        """Load persona templates for different interaction modes"""
        # This could be loaded from a configuration file in production
        return {
            'travel_expert': 'travel_advisor',
            'financial_advisor': 'budget_coach',
            'technical_support': 'tech_helper',
            'lifestyle_coach': 'life_optimizer',
            'friendly_assistant': 'general_helper'
        }

    def _load_response_styles(self) -> Dict[str, str]:
        """Load response style configurations"""
        return {
            'detailed_explanation': 'comprehensive',
            'actionable_response': 'action_oriented',
            'step_by_step_guide': 'instructional',
            'conversational': 'natural_flow'
        }

    def get_prompt_optimization_suggestions(
        self,
        user_message: str,
        response_feedback: Optional[str] = None
    ) -> List[str]:
        """Provide suggestions for prompt optimization based on feedback"""

        suggestions = []

        # Analyze message complexity
        if len(user_message.split()) > 20:
            suggestions.append("Consider breaking down complex queries into simpler parts")

        # Suggest context improvements
        if any(word in user_message.lower() for word in ['my', 'i have', 'i need']):
            suggestions.append("User profile information would enhance personalization")

        if response_feedback == 'too_generic':
            suggestions.append("Increase memory context utilization for more personalized responses")
        elif response_feedback == 'too_verbose':
            suggestions.append("Optimize for more concise response style")

        return suggestions

# Service factory function
def create_prompt_service() -> PromptEngineeringService:
    """Factory function to create PromptEngineeringService instance"""
    return PromptEngineeringService()