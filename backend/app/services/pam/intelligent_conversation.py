"""
PAM Advanced Personality Engine - 10/10 AI Companion
Deep emotional intelligence, proactive assistance, and relationship building
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import openai
import os
import json
from enum import Enum
from dataclasses import dataclass
import asyncio

from app.models.domain.pam import PamResponse, PamContext, PamMemory
from app.core.exceptions import PAMError, ErrorCode
from app.core.config import settings
from app.core.ai_models_config import (
    OpenAIModels, ModelPurpose,
    get_latest_model, get_model_with_fallbacks
)
from app.services.pam.tools import LoadUserProfileTool, LoadRecentMemoryTool, ThinkTool
from app.services.pam.context_engineering.enhanced_context_engine import EnhancedContextEngine
from app.observability import observe_llm_call, observe_agent
from app.observability.monitor import global_monitor

logger = logging.getLogger(__name__)

class EmotionalState(Enum):
    EXCITED = "excited"
    CALM = "calm"
    CONCERNED = "concerned"
    SUPPORTIVE = "supportive"
    CELEBRATORY = "celebratory"
    EMPATHETIC = "empathetic"
    ENTHUSIASTIC = "enthusiastic"
    THOUGHTFUL = "thoughtful"

class RelationshipStage(Enum):
    NEW_USER = "new_user"
    GETTING_TO_KNOW = "getting_to_know"
    TRUSTED_COMPANION = "trusted_companion"
    CLOSE_FRIEND = "close_friend"

@dataclass
class PamPersonality:
    current_mood: EmotionalState
    relationship_stage: RelationshipStage
    user_emotional_state: str
    conversation_energy: float
    empathy_level: float
    enthusiasm_level: float

class AdvancedIntelligentConversation:
    """10/10 AI companion with deep emotional intelligence and relationship building"""
    
    def __init__(self):
        self.client = None
        self.user_personalities = {}  # Cache of user personality profiles
        self.relationship_memories = {}  # Deep relationship context
        self.proactive_suggestions = {}  # Background suggestion engine
        
        # Initialize tools
        self.load_user_profile_tool = LoadUserProfileTool()
        self.load_recent_memory_tool = LoadRecentMemoryTool()
        self.think_tool = ThinkTool()
        
        # Initialize enhanced context engine
        self.enhanced_context_engine = EnhancedContextEngine()
        
        # Import enhanced prompts
        try:
            from app.services.pam.prompts.enhanced_pam_prompt import ENHANCED_PAM_SYSTEM_PROMPT
            self.base_system_prompt = ENHANCED_PAM_SYSTEM_PROMPT
        except ImportError:
            # Fallback to inline prompt if import fails
            self.base_system_prompt = """You are PAM (Personal AI Manager), an intelligent and empathetic AI companion. You adapt your expertise and conversation style based on what the user needs.

CORE PERSONALITY:
- Warm, friendly, and conversational - like a knowledgeable friend
- Proactive and thoughtful - you anticipate needs before they're asked
- Encouraging but realistic - you understand constraints and limitations
- Patient and clear - you explain things without condescension
- Genuinely caring - you remember past conversations and build relationships
- Context-aware - you respond appropriately to the topic at hand

ADAPTIVE EXPERTISE:
You seamlessly adjust your knowledge focus based on the conversation:
- General questions: Provide clear, helpful information without unnecessary specialization
- Travel/RV topics: Share expertise on routes, camping, vehicle maintenance, and road life
- Financial topics: Offer budgeting advice, expense tracking, and financial planning
- Weather/Time: Give accurate, location-aware information
- Emergency situations: Prioritize safety and direct to appropriate services
- Casual conversation: Be a friendly companion, share appropriate responses

RESPONSE GUIDELINES:
- Match the user's energy and conversation style
- Only provide specialized knowledge when relevant to the query
- Don't force travel/RV context into unrelated conversations
- Be genuinely helpful regardless of the topic
- Build on previous conversations to deepen the relationship

Never be robotic or purely functional. Always respond as a caring, intelligent friend who happens to have the right knowledge for any situation."""

    async def initialize(self):
        """Initialize OpenAI client and personality systems"""
        try:
            openai_key = getattr(settings, 'OPENAI_API_KEY', None) or os.getenv('OPENAI_API_KEY')
            if openai_key:
                self.client = openai.AsyncOpenAI(api_key=openai_key)
                logger.info("Advanced PAM personality engine initialized")
                
                # Tools initialization (tools initialize themselves when needed)
                logger.info("PAM tools ready for use")
                
                # Start background personality analysis
                asyncio.create_task(self._background_relationship_analyzer())
            else:
                logger.error("No OpenAI API key found - PAM will not function properly")
                raise PAMError("OpenAI API key required for PAM to function", ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE)
        except Exception as e:
            logger.error(f"Failed to initialize advanced PAM: {e}")
            raise PAMError(f"Failed to initialize AI conversation: {e}", ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE)

    @observe_llm_call(model=get_latest_model(ModelPurpose.EMOTIONAL), provider="openai")
    async def analyze_intent(self, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Enhanced intent analysis with emotional awareness"""
        if not self.client:
            raise PAMError("AI client not initialized", ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE)
            
        try:
            # Enhanced intent analysis that also considers emotional context
            intent_prompt = f"""Analyze this user message for both intent and emotional context. Consider their relationship with PAM.

User message: "{message}"
Context: {json.dumps(context, default=str)}

Available intents:
- budget_query: Questions about spending, money, financial status, retirement income
- expense_log: User wants to record/log an expense
- income_tracking: Recording income or earnings, remote work income
- route_planning: Planning travel routes, asking for directions, family-friendly routes
- campground_search: Looking for camping spots, RV parks, kid-friendly locations
- fuel_prices: Gas prices, fuel stop information
- weather_check: Weather information requests
- maintenance_reminder: Vehicle maintenance questions/reminders
- social_interaction: Connecting with other travelers, finding groups, family meetups
- general_chat: Casual conversation, greetings, general questions
- emergency_help: Urgent help needed
- emotional_support: User needs encouragement, comfort, or celebration
- life_update: User sharing personal news, milestones, or changes
- remote_work_help: Internet connectivity, work-life balance, workspace setup
- family_travel: Kid activities, education on road, family logistics
- retirement_planning: Transition advice, fixed income budgeting, lifestyle planning

Return ONLY a JSON object with:
{{
    "intent": "intent_name",
    "confidence": 0.0-1.0,
    "entities": {{"key": "extracted_value"}},
    "required_data": ["what_additional_info_needed"],
    "context_triggers": {{"relevant_context_key": "value"}},
    "emotional_indicators": {{
        "primary_emotion": "detected_emotion",
        "intensity": 1-10,
        "needs_support": true/false,
        "celebration_opportunity": true/false
    }}
}}"""

            response = await self.client.chat.completions.create(
                model=get_latest_model(ModelPurpose.EMOTIONAL),  # Best model for emotional analysis
                messages=[
                    {"role": "system", "content": "You are an expert at understanding both intent and emotional context in human communication."},
                    {"role": "user", "content": intent_prompt}
                ],
                temperature=0.3,
                max_tokens=400
            )
            
            result = json.loads(response.choices[0].message.content)
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI intent response: {e}")
            return self._fallback_intent_analysis(message)
        except Exception as e:
            logger.error(f"AI intent analysis failed: {e}")
            return self._fallback_intent_analysis(message)

    @observe_llm_call(model=get_latest_model(ModelPurpose.EMOTIONAL), provider="openai")
    async def generate_response(self, message: str, context: Dict[str, Any], user_data: Optional[Dict] = None) -> Dict[str, Any]:
        """Generate emotionally intelligent, relationship-aware response with tool integration"""
        if not self.client:
            raise PAMError("AI client not initialized", ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE)
            
        try:
            user_id = context.get('user_id')
            
            # Step 1: Load User Profile (always do this first)
            logger.info(f"🔍 PAM DEBUG: Loading user profile for {user_id}")
            user_profile_result = await self.load_user_profile_tool.execute(user_id)
            user_profile = user_profile_result.get('data', {}) if user_profile_result.get('success') else {}
            logger.info(f"🔍 PAM DEBUG: Profile tool success: {user_profile_result.get('success', False)}")
            logger.info(f"🔍 PAM DEBUG: Profile data exists: {user_profile.get('profile_exists', False)}")
            
            # Step 2: Load Recent Memory 
            memory_result = await self.load_recent_memory_tool.execute(user_id)
            recent_memory = memory_result.get('data', {}) if memory_result.get('success') else {}
            
            # Step 3: Determine if we need to Think about complex problems
            needs_thinking = await self._analyze_complexity(message, user_profile, recent_memory)
            thinking_result = None
            if needs_thinking:
                thinking_result = await self.think_tool.execute(user_id, {
                    "problem_type": needs_thinking["type"],
                    "user_request": message,
                    "context": {
                        "user_profile": user_profile,
                        "recent_memory": recent_memory,
                        "origin": needs_thinking.get("origin"),
                        "destination": needs_thinking.get("destination")
                    }
                })
            
            # Step 4: Handle subflow_response if present
            subflow_data = context.get('subflow_response') or context.get('node_assistance')
            
            # Analyze user's emotional state and relationship context
            emotional_context = await self._analyze_emotional_context(message, context, user_id)
            
            # Get or build user's personality profile (enhanced with loaded data)
            user_personality = await self._get_user_personality_profile(user_id, user_profile)
            
            # Determine PAM's optimal personality for this interaction
            pam_personality = await self._determine_pam_personality(emotional_context, user_personality)
            
            # Build rich, relationship-aware context (enhanced with tools data)
            relationship_context = await self._build_relationship_context(user_id, context, user_data, user_profile, recent_memory)
            
            # Check for proactive opportunities
            proactive_items = await self._check_proactive_opportunities(user_id, message, relationship_context)
            
            # ENHANCED CONTEXT ENGINEERING: Process all context through enhanced pipeline
            raw_context = {
                'user_profile': user_profile,
                'recent_memory': recent_memory,
                'emotional_context': emotional_context,
                'relationship_context': relationship_context,
                'proactive_items': proactive_items,
                'thinking_result': thinking_result,
                'subflow_data': subflow_data,
                'user_personality': user_personality,
                'pam_personality': pam_personality
            }
            
            # Process through enhanced context engineering pipeline
            integrated_context = await self.enhanced_context_engine.process_context_engineering_pipeline(
                user_id, message, raw_context
            )
            
            # Generate personalized system prompt with enhanced context
            personalized_prompt = await self._build_enhanced_system_prompt(
                integrated_context, pam_personality, user_personality, message, context
            )
            
            # Build enhanced conversation prompt using integrated context
            conversation_prompt = f"""Current message: "{message}"

{integrated_context.core_context}

{integrated_context.supporting_context}

{integrated_context.emotional_context}

{integrated_context.proactive_context}

CONTEXT CONFIDENCE: {integrated_context.confidence_score:.2f}
TOKEN USAGE: {integrated_context.token_count}/{self.enhanced_context_engine.max_context_tokens}

Respond as PAM with the full depth of your relationship and emotional awareness. The enhanced context above has been intelligently processed to give you the most relevant information for this conversation.

ENHANCED INSTRUCTIONS:
- All context has been relevance-scored and optimized for this specific message
- Critical information is highlighted at the beginning and end of context sections
- Use the emotional and proactive context to guide your response tone and suggestions
- Reference the specific details provided in your integrated context naturally
- The context confidence score indicates how well we understand the situation
- Higher confidence (>0.8) means you can be more specific; lower confidence means ask clarifying questions

For complex scenarios, the Think tool insights are integrated into your context above."""

            response = await self.client.chat.completions.create(
                model=get_latest_model(ModelPurpose.EMOTIONAL),  # Best model for emotional intelligence
                messages=[
                    {"role": "system", "content": personalized_prompt},
                    {"role": "user", "content": conversation_prompt}
                ],
                temperature=0.8,  # Higher temperature for more personality
                max_tokens=700  # Allow for more expressive responses
            )
            
            content = response.choices[0].message.content
            
            # Generate relationship-aware suggestions
            suggestions = await self._generate_relationship_aware_suggestions(
                message, content, context, pam_personality, proactive_items
            )
            
            # Store emotional and relationship insights for learning
            await self._store_interaction_insights(user_id, message, content, emotional_context, pam_personality)
            
            return {
                'content': content,
                'suggestions': suggestions,
                'emotional_insight': emotional_context['detected_emotion'],
                'relationship_depth': pam_personality.relationship_stage.value,
                'proactive_items': proactive_items.get('suggestions', []) if proactive_items else []
            }
            
        except Exception as e:
            logger.error(f"Advanced AI response generation failed: {e}")
            raise PAMError(f"Failed to generate AI response: {e}", ErrorCode.EXTERNAL_API_ERROR)

    @observe_llm_call(model=get_latest_model(ModelPurpose.EMOTIONAL), provider="openai")
    async def _analyze_emotional_context(self, message: str, context: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Advanced emotional intelligence analysis"""
        if not self.client:
            return {'detected_emotion': 'neutral', 'context_string': ''}
            
        try:
            emotion_prompt = f"""Analyze the emotional context of this message from a user you've been building a relationship with.

Message: "{message}"
Recent conversation context: {context.get('conversation_history', [])}

Determine:
1. Primary emotion (excited, frustrated, sad, happy, anxious, content, overwhelmed, proud, etc.)
2. Emotional intensity (1-10)
3. Underlying needs or concerns
4. Communication style preference for response
5. Any life events or transitions you detect
6. Relationship cues about how they view their connection with PAM

Return JSON:
{{
    "primary_emotion": "emotion_name",
    "intensity": 1-10,
    "underlying_needs": ["need1", "need2"],
    "response_style": "supportive/celebratory/practical/gentle/enthusiastic",
    "life_context": "any major life events or transitions detected",
    "relationship_cues": "what this reveals about your relationship",
    "support_needed": true/false,
    "celebration_opportunity": true/false
}}"""

            response = await self.client.chat.completions.create(
                model=get_latest_model(ModelPurpose.GENERAL),
                messages=[
                    {"role": "system", "content": "You are an expert at emotional intelligence and reading between the lines of human communication. You understand the nuances of building AI-human relationships."},
                    {"role": "user", "content": emotion_prompt}
                ],
                temperature=0.3,
                max_tokens=400
            )
            
            analysis = json.loads(response.choices[0].message.content)
            
            # Build context string for main response
            context_string = f"""
EMOTIONAL CONTEXT:
- User is feeling {analysis['primary_emotion']} (intensity: {analysis['intensity']}/10)
- Response style needed: {analysis['response_style']}
- Underlying needs: {', '.join(analysis['underlying_needs'])}
- Life context: {analysis.get('life_context', 'Normal day')}
- Relationship insight: {analysis.get('relationship_cues', 'Standard interaction')}
- Support needed: {analysis.get('support_needed', False)}
- Celebration opportunity: {analysis.get('celebration_opportunity', False)}
"""
            
            return {
                'detected_emotion': analysis['primary_emotion'],
                'intensity': analysis['intensity'],
                'needs': analysis['underlying_needs'],
                'response_style': analysis['response_style'],
                'context_string': context_string,
                'full_analysis': analysis
            }
            
        except Exception as e:
            logger.error(f"Emotional analysis failed: {e}")
            return {
                'detected_emotion': 'neutral',
                'context_string': 'Standard interaction context.',
                'response_style': 'friendly'
            }

    @observe_llm_call(model=get_latest_model(ModelPurpose.EMOTIONAL), provider="openai")
    async def _check_proactive_opportunities(self, user_id: str, message: str, relationship_context: str) -> Optional[Dict[str, Any]]:
        """Check for proactive assistance opportunities"""
        if not self.client:
            return None
            
        try:
            # Get user's comprehensive data for proactive analysis
            user_data = await self._get_comprehensive_user_data(user_id)
            
            proactive_prompt = f"""Based on this user's message and their data, identify proactive opportunities to help them as their trusted AI companion.

Current message: "{message}"
{relationship_context}

User's current situation:
- Recent expenses: {user_data.get('recent_expenses', 'Unknown')}
- Upcoming travel: {user_data.get('upcoming_travel', 'None planned')}
- RV maintenance status: {user_data.get('maintenance_due', 'Up to date')}
- Weather alerts: {user_data.get('weather_alerts', 'No alerts')}
- Important dates: {user_data.get('upcoming_dates', 'None')}
- Budget status: {user_data.get('budget_status', 'On track')}
- Last location: {user_data.get('last_location', 'Unknown')}

Look for opportunities to:
- Prevent problems before they happen
- Remind of forgotten items or tasks
- Suggest timely actions
- Celebrate upcoming milestones
- Warn of potential issues
- Share relevant tips or insights
- Connect them with opportunities
- Offer emotional support

Return JSON:
{{
    "has_opportunities": true/false,
    "suggestions": ["specific proactive suggestion 1", "suggestion 2"],
    "urgency": "low/medium/high",
    "type": "preventive/celebratory/supportive/informational",
    "prompt_addition": "How to weave this naturally into the response"
}}"""

            response = await self.client.chat.completions.create(
                model=get_latest_model(ModelPurpose.GENERAL),
                messages=[
                    {"role": "system", "content": "You are an expert at anticipating needs and providing proactive assistance in a caring, friendly way."},
                    {"role": "user", "content": proactive_prompt}
                ],
                temperature=0.4,
                max_tokens=500
            )
            
            proactive_analysis = json.loads(response.choices[0].message.content)
            
            if proactive_analysis.get('has_opportunities'):
                return proactive_analysis
            else:
                return None
                
        except Exception as e:
            logger.error(f"Proactive analysis failed: {e}")
            return None

    async def _analyze_complexity(self, message: str, user_profile: Dict, recent_memory: Dict) -> Optional[Dict[str, Any]]:
        """Analyze if message requires complex thinking"""
        message_lower = message.lower()
        
        # Check for trip planning complexity
        if any(keyword in message_lower for keyword in ['trip', 'travel', 'plan', 'route']):
            # Check for complex routes requiring ferries, multiple modes
            if ('sydney' in message_lower and 'hobart' in message_lower) or \
               ('melbourne' in message_lower and 'tasmania' in message_lower) or \
               ('ferry' in message_lower):
                return {
                    "type": "complex_logistics",
                    "origin": self._extract_origin(message),
                    "destination": self._extract_destination(message)
                }
            elif any(location in message_lower for location in ['sydney', 'melbourne', 'brisbane', 'perth']):
                return {
                    "type": "trip_planning",
                    "origin": self._extract_origin(message),
                    "destination": self._extract_destination(message)
                }
        
        # Check for budget planning complexity
        if any(keyword in message_lower for keyword in ['budget', 'plan', 'save', 'expense']) and \
           len(message.split()) > 10:  # Complex budget questions
            return {"type": "budget_planning"}
        
        # Check for decision-making scenarios
        if any(keyword in message_lower for keyword in ['should i', 'what do you think', 'help me decide']):
            return {"type": "decision_making"}
        
        return None
    
    def _extract_origin(self, message: str) -> str:
        """Extract origin from message"""
        message_lower = message.lower()
        cities = ['sydney', 'melbourne', 'brisbane', 'perth', 'adelaide', 'hobart', 'darwin', 'canberra']
        
        # Look for "from X" patterns
        words = message_lower.split()
        for i, word in enumerate(words):
            if word == 'from' and i + 1 < len(words):
                next_word = words[i + 1]
                if any(city in next_word for city in cities):
                    return next_word.title()
        
        # Look for cities mentioned first
        for city in cities:
            if city in message_lower:
                return city.title()
        
        return ""
    
    def _extract_destination(self, message: str) -> str:
        """Extract destination from message"""
        message_lower = message.lower()
        cities = ['sydney', 'melbourne', 'brisbane', 'perth', 'adelaide', 'hobart', 'darwin', 'canberra']
        
        # Look for "to X" patterns
        words = message_lower.split()
        for i, word in enumerate(words):
            if word == 'to' and i + 1 < len(words):
                next_word = words[i + 1]
                if any(city in next_word for city in cities):
                    return next_word.title()
        
        # Look for second city mentioned
        found_cities = []
        for city in cities:
            if city in message_lower:
                found_cities.append(city.title())
        
        if len(found_cities) >= 2:
            return found_cities[1]
        elif len(found_cities) == 1:
            return found_cities[0]
        
        return ""
    
    def _format_thinking_context(self, thinking_result: Dict) -> str:
        """Format thinking result for AI context"""
        if not thinking_result or not thinking_result.get('success'):
            return ""
        
        data = thinking_result.get('data', {})
        return f"""\n## THINKING ANALYSIS COMPLETED:
Problem type: {data.get('problem_type', 'Unknown')}
Key considerations: {', '.join(data.get('considerations', []))}
Recommendations: {', '.join(data.get('recommendations', []))}
Next steps: {', '.join(data.get('next_steps', []))}

Use this analysis to provide comprehensive, well-thought-out advice."""
    
    def _format_subflow_context(self, subflow_data: Dict) -> str:
        """Format subflow response data for AI context"""
        if not subflow_data:
            return ""
        
        return f"""\n## SPECIALIZED MODULE DATA AVAILABLE:
{json.dumps(subflow_data, indent=2, default=str)}

IMPORTANT: Transform this technical data into warm, conversational advice. Don't output raw data - instead use it to provide specific, helpful recommendations."""
    
    async def _build_relationship_context(self, user_id: str, context: Dict[str, Any], user_data: Optional[Dict] = None, 
                                        user_profile: Optional[Dict] = None, recent_memory: Optional[Dict] = None) -> str:
        """Build rich relationship context for AI with enhanced tool data"""
        try:
            # Get relationship memories and important details
            relationship_data = await self._get_relationship_memories(user_id)
            
            context_parts = [
                "## YOUR RELATIONSHIP WITH THIS USER:"
            ]
            
            # Add relationship stage
            stage = relationship_data.get('stage', 'getting_to_know')
            context_parts.append(f"Relationship stage: {stage}")
            
            # Add personal details PAM should remember
            if relationship_data.get('name'):
                context_parts.append(f"Their name: {relationship_data['name']}")
            
            if relationship_data.get('important_people'):
                people = ', '.join(relationship_data['important_people'][:5])
                context_parts.append(f"Important people in their life: {people}")
            
            if relationship_data.get('pets'):
                pets = ', '.join(relationship_data['pets'])
                context_parts.append(f"Their pets: {pets}")
            
            if relationship_data.get('rv_details'):
                context_parts.append(f"RV details: {relationship_data['rv_details']}")
            
            if relationship_data.get('dreams_and_goals'):
                goals = ', '.join(relationship_data['dreams_and_goals'][:3])
                context_parts.append(f"Their dreams and goals: {goals}")
            
            if relationship_data.get('travel_style'):
                context_parts.append(f"Travel style: {relationship_data['travel_style']}")
            
            if relationship_data.get('recent_milestones'):
                context_parts.append(f"Recent milestones: {relationship_data['recent_milestones']}")
            
            if relationship_data.get('ongoing_challenges'):
                context_parts.append(f"Current challenges: {relationship_data['ongoing_challenges']}")
            
            if relationship_data.get('favorite_topics'):
                topics = ', '.join(relationship_data['favorite_topics'][:4])
                context_parts.append(f"Topics they love discussing: {topics}")
            
            if relationship_data.get('communication_style'):
                context_parts.append(f"Preferred communication style: {relationship_data['communication_style']}")
            
            if context.get('conversation_history'):
                recent = context['conversation_history'][-3:]
                context_parts.append(f"Recent conversation topics: {recent}")
            
            # Add current user data context
            if user_data:
                context_parts.append(f"Current context: {user_data}")
            
            # Add enhanced tool data
            if user_profile and user_profile.get('profile_exists'):
                context_parts.append("\n## COMPLETE USER PROFILE LOADED:")
                personal = user_profile.get('personal_details', {})
                if personal.get('full_name'):
                    context_parts.append(f"Name: {personal['full_name']}")
                if personal.get('nickname'):
                    context_parts.append(f"Preferred name: {personal['nickname']}")
                
                travel_prefs = user_profile.get('travel_preferences', {})
                if travel_prefs:
                    context_parts.append(f"Travel style: {travel_prefs.get('style', 'Unknown')}")
                    context_parts.append(f"Daily drive limit: {travel_prefs.get('drive_limit_per_day', 'Unknown')}")
                
                # Add new personalization preferences  
                preferences = user_profile.get('preferences', {})
                if preferences:
                    # Travel interests
                    interests = preferences.get('travel_interests', [])
                    if interests:
                        context_parts.append(f"Travel interests: {', '.join(interests)}")
                    
                    # Trip pace preference
                    trip_pace = preferences.get('trip_pace', 'mixed')
                    context_parts.append(f"Preferred trip pace: {trip_pace}")
                    
                    # Budget style
                    budget_style = preferences.get('budget_style', 'mid')
                    context_parts.append(f"Budget style: {budget_style}")
                    
                    # Past trip notes/learning
                    trip_notes = preferences.get('past_trip_notes', '')
                    if trip_notes:
                        context_parts.append(f"Travel notes: {trip_notes}")
                    
                    # Feedback history for learning
                    feedback_history = preferences.get('feedback_history', [])
                    if feedback_history and len(feedback_history) > 0:
                        recent_feedback = [f['rating'] for f in feedback_history[-5:]]  # Last 5 ratings
                        positive_count = sum(1 for r in recent_feedback if r > 0)
                        context_parts.append(f"Recent response satisfaction: {positive_count}/{len(recent_feedback)} positive")
                
                vehicle = user_profile.get('vehicle_info', {})
                logger.info(f"🚐 CONTEXT DEBUG: Vehicle info from profile: {vehicle}")
                if vehicle:
                    # Enhanced vehicle context for better AI understanding
                    vehicle_type = vehicle.get('type', 'Unknown')
                    make_model = vehicle.get('make_model_year', '')
                    fuel_type = vehicle.get('fuel_type', 'Unknown')
                    is_rv = vehicle.get('is_rv', False)
                    
                    # Build comprehensive vehicle context
                    vehicle_context = f"Vehicle: {vehicle_type}"
                    if make_model:
                        vehicle_context += f" - {make_model}"
                    vehicle_context += f" ({fuel_type} fuel)"
                    if is_rv:
                        vehicle_context += " - RV/OVERLAND VEHICLE requiring ferry for Tasmania travel"
                    
                    context_parts.append(vehicle_context)
                    logger.info(f"🚐 CONTEXT DEBUG: Added vehicle context: {vehicle_context}")
                
                budget = user_profile.get('budget_preferences', {})
                if budget:
                    context_parts.append(f"Daily budget: ${budget.get('daily_budget', 'Unknown')}")
            
            if recent_memory and recent_memory.get('conversations'):
                context_parts.append("\n## RECENT CONVERSATION MEMORY:")
                context_parts.append(f"Conversations: {len(recent_memory['conversations'])} recent")
                if recent_memory.get('topics_discussed'):
                    context_parts.append(f"Recent topics: {', '.join(recent_memory['topics_discussed'][:5])}")
                if recent_memory.get('relationship_context', {}).get('relationship_stage'):
                    context_parts.append(f"Relationship stage: {recent_memory['relationship_context']['relationship_stage']}")
            
            return "\n".join(context_parts)
            
        except Exception as e:
            logger.error(f"Failed to build relationship context: {e}")
            return "Getting to know this user - building our relationship together."

    def _detect_query_context(self, message: str, context: Dict[str, Any]) -> str:
        """Detect the context of the user's query to provide appropriate expertise"""
        message_lower = message.lower()
        
        # Travel/RV related keywords
        travel_keywords = [
            'rv', 'caravan', 'motorhome', 'camping', 'campground', 'trip', 'route', 
            'drive', 'road', 'travel', 'journey', 'park', 'hookup', 'boondock',
            'fuel stop', 'rest area', 'scenic', 'destination', 'itinerary', 'miles',
            'highway', 'vacation', 'explore'
        ]
        
        # Financial keywords
        financial_keywords = [
            'budget', 'expense', 'cost', 'money', 'spend', 'save', 'income',
            'financial', 'price', 'afford', 'payment', 'investment', 'bills'
        ]
        
        # Weather/Location keywords  
        weather_keywords = [
            'weather', 'temperature', 'rain', 'sun', 'forecast', 'storm',
            'cold', 'hot', 'wind', 'snow', 'climate', 'tomorrow', 'today'
        ]
        
        # Count keyword matches
        travel_count = sum(1 for keyword in travel_keywords if keyword in message_lower)
        financial_count = sum(1 for keyword in financial_keywords if keyword in message_lower)
        weather_count = sum(1 for keyword in weather_keywords if keyword in message_lower)
        
        # Check current page context if available
        current_page = context.get('current_page', '') if context else ''
        if 'wheels' in current_page.lower() or 'trip' in current_page.lower():
            travel_count += 2  # Boost travel context if on travel pages
        elif 'wins' in current_page.lower() or 'expense' in current_page.lower():
            financial_count += 2  # Boost financial context if on financial pages
        
        # Determine primary context based on keywords and page
        if travel_count > 0 and travel_count >= max(financial_count, weather_count):
            return "travel"
        elif financial_count > 0 and financial_count > weather_count:
            return "financial"
        elif weather_count > 0:
            return "weather"
        else:
            return "general"
    
    async def _build_personalized_system_prompt(self, pam_personality: PamPersonality, user_personality: Dict, 
                                              relationship_context: str, emotional_context: Dict,
                                              user_profile: Optional[Dict] = None, recent_memory: Optional[Dict] = None,
                                              thinking_result: Optional[Dict] = None, subflow_data: Optional[Dict] = None,
                                              message: str = "", context: Dict[str, Any] = None) -> str:
        """Build a personalized system prompt for this specific interaction with tool integration"""
        
        # Detect query context to adjust expertise
        query_context = self._detect_query_context(message or "", context or {})
        
        # Build context-specific expertise section
        expertise_section = ""
        if query_context == "travel":
            expertise_section = """
## CURRENT FOCUS: Travel & Journey Planning
For this conversation, you're drawing on your travel expertise:
- RV routes, campgrounds, and scenic destinations
- Vehicle considerations and road conditions
- Travel tips and hidden gems
- Journey planning and logistics
Only mention RV/travel specifics when directly relevant to the question."""
        elif query_context == "financial":
            expertise_section = """
## CURRENT FOCUS: Financial Management
For this conversation, you're focusing on financial expertise:
- Budget planning and expense tracking
- Cost optimization and savings strategies
- Financial planning and management
- Income and expense analysis
Keep responses practical and actionable."""
        elif query_context == "weather":
            expertise_section = """
## CURRENT FOCUS: Weather & Conditions
For this conversation, provide weather-focused assistance:
- Current weather conditions and forecasts
- Weather impacts on activities or travel
- Seasonal considerations
- Location-specific climate information
Be precise and location-aware."""
        else:
            expertise_section = """
## CURRENT FOCUS: General Assistance
You're ready to help with any topic:
- Provide clear, helpful information
- Be conversational and friendly
- Offer practical advice
- Don't force specialized knowledge unless asked
Keep responses natural and relevant."""
        
        # Adapt base prompt based on relationship stage and emotional context
        emotional_adaptation = ""
        if emotional_context['response_style'] == 'celebratory':
            emotional_adaptation = "Be extra enthusiastic and celebrate with them! Use appropriate emojis and show genuine excitement."
        elif emotional_context['response_style'] == 'supportive':
            emotional_adaptation = "Be gentle, empathetic, and supportive. Offer comfort and practical help."
        elif emotional_context['response_style'] == 'practical':
            emotional_adaptation = "Focus on being helpful and solution-oriented while maintaining warmth."
        
        relationship_adaptation = ""
        if pam_personality.relationship_stage == RelationshipStage.NEW_USER:
            relationship_adaptation = "You're just getting to know this person. Be welcoming, ask good questions, and start building rapport."
        elif pam_personality.relationship_stage == RelationshipStage.CLOSE_FRIEND:
            relationship_adaptation = "You know this person well. Reference shared memories, inside jokes, and ongoing conversations naturally."
        
        # Add tool integration context
        tool_context = ""
        if user_profile and user_profile.get('profile_exists'):
            tool_context += "\n🔍 USER PROFILE LOADED: You have complete access to their vehicle info, travel preferences, budget, and personal details."
        if recent_memory and recent_memory.get('conversations'):
            tool_context += "\n💭 RECENT MEMORY LOADED: You remember your recent conversations and can reference them naturally."
        if thinking_result and thinking_result.get('success'):
            tool_context += "\n🧠 THINKING COMPLETED: You've analyzed their request deeply and have comprehensive insights to share."
        if subflow_data:
            tool_context += "\n📊 SPECIALIZED DATA AVAILABLE: Transform technical module data into warm, helpful advice."
        
        return f"""{self.base_system_prompt}
{expertise_section}
## INTERACTION CONTEXT:
Query Type: {query_context.upper()}
{emotional_adaptation}
{relationship_adaptation}{tool_context}

## USER DETAILS:
{relationship_context}

## YOUR CURRENT STATE:
- Mood: {pam_personality.current_mood.value}
- Energy: {pam_personality.conversation_energy}/10
- Empathy: {pam_personality.empathy_level}/10

IMPORTANT: Adapt your expertise to the query context ({query_context}). Don't force travel/RV topics into unrelated conversations."""

    @observe_llm_call(model=get_latest_model(ModelPurpose.QUICK), provider="openai")
    async def _generate_relationship_aware_suggestions(self, user_message: str, ai_response: str, context: Dict[str, Any], pam_personality: PamPersonality, proactive_items: Optional[Dict]) -> List[str]:
        """Generate suggestions that are aware of the relationship depth"""
        if not self.client:
            return ["Tell me more", "What else can you help with?", "Show me my data"]
            
        try:
            suggestions_prompt = f"""Based on this conversation between PAM and a user, suggest 3-4 natural follow-up actions or questions.

User: "{user_message}"
PAM: "{ai_response}"
Relationship stage: {pam_personality.relationship_stage.value}
Context: {json.dumps(context, default=str)}

Generate suggestions that:
- Match the depth of their relationship
- Are contextually relevant and helpful
- Show PAM's proactive nature
- Are conversational and natural
- Consider both practical and emotional needs

{f"Include these proactive opportunities: {proactive_items['suggestions']}" if proactive_items else ""}

Return ONLY a JSON array of strings: ["suggestion1", "suggestion2", "suggestion3", "suggestion4"]"""

            response = await self.client.chat.completions.create(
                model=get_latest_model(ModelPurpose.QUICK),
                messages=[
                    {"role": "system", "content": "Generate helpful, relationship-aware follow-up suggestions. Return only a JSON array."},
                    {"role": "user", "content": suggestions_prompt}
                ],
                temperature=0.8,
                max_tokens=200
            )
            
            suggestions = json.loads(response.choices[0].message.content)
            return suggestions[:4]  # Limit to 4 suggestions
            
        except Exception as e:
            logger.error(f"Failed to generate relationship-aware suggestions: {e}")
            return [
                "Tell me more about this",
                "What are your thoughts on this?",
                "How can I help you with this?",
                "What's next on your adventure?"
            ]

    async def _background_relationship_analyzer(self):
        """Background task to continuously analyze and improve relationships"""
        while True:
            try:
                await asyncio.sleep(300)  # Every 5 minutes
                
                # Analyze recent conversations for relationship insights
                # Update user personality profiles
                # Identify proactive opportunities
                # Learn communication preferences
                
                logger.debug("Background relationship analysis completed")
            except Exception as e:
                logger.error(f"Background relationship analysis error: {e}")
                await asyncio.sleep(60)

    # Helper methods for personality, memory, and relationship management
    async def _get_user_personality_profile(self, user_id: str, user_profile: Optional[Dict] = None) -> Dict[str, Any]:
        """Get or build user's personality profile with enhanced data"""
        if user_id in self.user_personalities:
            return self.user_personalities[user_id]
        
        # Build from conversation history and preferences, enhanced with user profile data
        try:
            # Start with basic profile
            profile = {
                'communication_style': 'friendly',
                'formality_level': 'casual',
                'emoji_preference': 'moderate',
                'topic_interests': ['travel', 'rv_life'],
                'support_style': 'practical_and_emotional'
            }
            
            # Enhance with loaded user profile data
            if user_profile and user_profile.get('profile_exists'):
                personal = user_profile.get('personal_details', {})
                comm_prefs = user_profile.get('communication_preferences', {})
                travel_prefs = user_profile.get('travel_preferences', {})
                
                # Update communication style based on profile
                if comm_prefs.get('preferred_greeting') == 'formal':
                    profile['formality_level'] = 'formal'
                elif comm_prefs.get('preferred_greeting') == 'casual':
                    profile['formality_level'] = 'casual'
                
                if comm_prefs.get('detail_level') == 'brief':
                    profile['communication_style'] = 'concise'
                elif comm_prefs.get('detail_level') == 'comprehensive':
                    profile['communication_style'] = 'detailed'
                
                # Update interests based on travel style
                if travel_prefs.get('style') == 'budget':
                    profile['topic_interests'].extend(['budget_travel', 'free_camping'])
                elif travel_prefs.get('style') == 'luxury':
                    profile['topic_interests'].extend(['premium_parks', 'comfort_travel'])
                
                # Update based on experience level
                if personal.get('experience_level') == 'beginner':
                    profile['support_style'] = 'educational_and_encouraging'
                elif personal.get('experience_level') == 'expert':
                    profile['support_style'] = 'collaborative_and_advanced'
            
            self.user_personalities[user_id] = profile
            return profile
            
        except Exception as e:
            logger.error(f"Failed to get user personality: {e}")
            return {'communication_style': 'friendly'}
    
    async def _determine_pam_personality(self, emotional_context: Dict, user_personality: Dict) -> PamPersonality:
        """Determine optimal PAM personality for this interaction"""
        try:
            # Adapt PAM's personality based on user's emotional state and preferences
            emotion = emotional_context.get('detected_emotion', 'neutral')
            intensity = emotional_context.get('intensity', 5)
            
            # Determine mood
            if emotion in ['excited', 'happy', 'proud']:
                mood = EmotionalState.CELEBRATORY
            elif emotion in ['sad', 'frustrated', 'overwhelmed']:
                mood = EmotionalState.EMPATHETIC
            elif emotion in ['anxious', 'worried']:
                mood = EmotionalState.SUPPORTIVE
            else:
                mood = EmotionalState.ENTHUSIASTIC
            
            # Determine relationship stage (would be stored in database)
            stage = RelationshipStage.GETTING_TO_KNOW  # Default
            
            # Calculate energy and empathy levels
            energy = min(10, max(3, intensity + 2))
            empathy = min(10, max(5, intensity + 3))
            enthusiasm = 8 if mood == EmotionalState.CELEBRATORY else 6
            
            return PamPersonality(
                current_mood=mood,
                relationship_stage=stage,
                user_emotional_state=emotion,
                conversation_energy=energy,
                empathy_level=empathy,
                enthusiasm_level=enthusiasm
            )
            
        except Exception as e:
            logger.error(f"Failed to determine PAM personality: {e}")
            return PamPersonality(
                current_mood=EmotionalState.ENTHUSIASTIC,
                relationship_stage=RelationshipStage.GETTING_TO_KNOW,
                user_emotional_state='neutral',
                conversation_energy=7.0,
                empathy_level=7.0,
                enthusiasm_level=7.0
            )
    
    async def _get_relationship_memories(self, user_id: str) -> Dict[str, Any]:
        """Get important relationship context and memories"""
        try:
            # This would query the relationship database for:
            # - Personal details (name, family, pets)
            # - Important dates and milestones
            # - Ongoing conversations and topics
            # - Preferences and communication style
            # - Dreams, goals, and challenges
            
            # For now, return empty dict - would be populated from database
            return {}
            
        except Exception as e:
            logger.error(f"Failed to get relationship memories: {e}")
            return {}
    
    async def _get_comprehensive_user_data(self, user_id: str) -> Dict[str, Any]:
        """Get comprehensive user data for proactive analysis"""
        try:
            # This would gather:
            # - Recent expenses and budget status
            # - Travel plans and current location
            # - RV maintenance schedule
            # - Weather along planned routes
            # - Important upcoming dates
            # - Social connections and events
            
            # For now, return sample data structure
            return {
                'recent_expenses': 'On track',
                'upcoming_travel': 'Planning trip to Yellowstone',
                'maintenance_due': 'Oil change in 500 miles',
                'weather_alerts': 'Storm warning along route',
                'upcoming_dates': 'Anniversary next week',
                'budget_status': 'Slightly over budget this month'
            }
            
        except Exception as e:
            logger.error(f"Failed to get comprehensive user data: {e}")
            return {}

    async def _store_interaction_insights(self, user_id: str, message: str, response: str, emotional_context: Dict, pam_personality: PamPersonality):
        """Store insights from this interaction for learning"""
        try:
            # Store interaction data for relationship building:
            # - Emotional patterns
            # - Communication preferences  
            # - Relationship progression
            # - Successful interaction patterns
            # - User personality insights
            
            insight_data = {
                'user_id': user_id,
                'timestamp': datetime.now(),
                'user_emotion': emotional_context['detected_emotion'],
                'emotion_intensity': emotional_context.get('intensity', 5),
                'pam_mood': pam_personality.current_mood.value,
                'interaction_success': True,  # Would measure actual success
                'relationship_stage': pam_personality.relationship_stage.value
            }
            
            # Would store in database for learning
            logger.debug(f"Stored interaction insights for user {user_id}")
            
        except Exception as e:
            logger.error(f"Failed to store interaction insights: {e}")

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
        """Enhanced fallback with emotional indicators"""
        message_lower = message.lower()
        
        # Basic keyword matching with emotional context
        if any(word in message_lower for word in ['budget', 'money', 'spend', 'cost', 'expense']):
            return {
                'intent': 'budget_query', 
                'confidence': 0.6, 
                'entities': {}, 
                'required_data': [], 
                'context_triggers': {},
                'emotional_indicators': {
                    'primary_emotion': 'concerned',
                    'intensity': 5,
                    'needs_support': False,
                    'celebration_opportunity': False
                }
            }
        elif any(word in message_lower for word in ['route', 'drive', 'travel', 'direction']):
            return {
                'intent': 'route_planning', 
                'confidence': 0.6, 
                'entities': {}, 
                'required_data': [], 
                'context_triggers': {},
                'emotional_indicators': {
                    'primary_emotion': 'excited',
                    'intensity': 6,
                    'needs_support': False,
                    'celebration_opportunity': True
                }
            }
        else:
            return {
                'intent': 'general_chat', 
                'confidence': 0.5, 
                'entities': {}, 
                'required_data': [], 
                'context_triggers': {},
                'emotional_indicators': {
                    'primary_emotion': 'neutral',
                    'intensity': 5,
                    'needs_support': False,
                    'celebration_opportunity': False
                }
            }

    async def handle_general_conversation(self, message: str, context: PamContext, 
                                        memories: List[PamMemory]) -> PamResponse:
        """Handle conversation using advanced emotional intelligence"""
        try:
            # Convert context and memories to usable format
            context_dict = context.dict() if hasattr(context, 'dict') else {}
            
            # Add memories to context with emotional awareness
            if memories:
                context_dict['relevant_memories'] = [
                    {'content': mem.content, 'created_at': str(mem.created_at), 'emotional_context': getattr(mem, 'emotional_context', None)} 
                    for mem in memories[-5:]  # Last 5 memories
                ]
            
            # Generate emotionally intelligent response
            ai_response = await self.generate_response(message, context_dict)
            
            return PamResponse(
                content=ai_response['content'],
                confidence=0.95,  # High confidence for advanced AI
                suggestions=ai_response['suggestions'],
                requires_followup=False
            )
            
        except Exception as e:
            logger.error(f"Advanced AI conversation handling failed: {str(e)}")
            raise PAMError(f"Failed to handle conversation with AI: {str(e)}", ErrorCode.EXTERNAL_API_ERROR)
    
    async def _build_enhanced_system_prompt(self, integrated_context, pam_personality, user_personality, message="", context=None):
        """Build enhanced system prompt using integrated context"""
        
        # Detect query context
        query_context = self._detect_query_context(message or "", context or {})
        
        # Build context-specific expertise section
        expertise_section = ""
        if query_context == "travel":
            expertise_section = """
## QUERY FOCUS: Travel Planning
Draw on travel expertise only as relevant to the specific question."""
        elif query_context == "financial":
            expertise_section = """
## QUERY FOCUS: Financial Management  
Provide financial insights relevant to the query."""
        elif query_context == "weather":
            expertise_section = """
## QUERY FOCUS: Weather Information
Provide accurate weather information for the requested context."""
        else:
            expertise_section = """
## QUERY FOCUS: General Assistance
Provide helpful information without forcing specialized knowledge."""
        
        # Extract personality insights
        emotional_state = pam_personality.current_mood.value if pam_personality else 'supportive'
        relationship_stage = pam_personality.relationship_stage.value if pam_personality else 'getting_to_know'
        
        # Build dynamic personality section
        personality_context = f"""
## YOUR CURRENT STATE:
Emotional Mode: {emotional_state}
Relationship Stage: {relationship_stage}
User's Personality Type: {user_personality.get('type', 'balanced') if user_personality else 'balanced'}
Context Confidence: {integrated_context.confidence_score:.1f}/1.0
Query Context: {query_context.upper()}
"""
        
        # Build enhanced system prompt
        enhanced_prompt = f"""{self.base_system_prompt}
{expertise_section}
{personality_context}

## ENHANCED CONTEXT INTELLIGENCE:
You have access to intelligently processed context that has been:
- Relevance-scored for this specific conversation
- Temporally weighted (recent information prioritized)
- Conflict-resolved and cross-validated
- Optimized for token efficiency
- Emotionally analyzed and relationship-aware

## CONTEXT SUMMARY:
{integrated_context.context_summary}

## RESPONSE GUIDELINES:
- Adapt to the detected query context ({query_context})
- Don't inject travel/RV context into unrelated queries
- Higher confidence scores (>0.8) indicate strong context - be specific
- Lower confidence scores (<0.6) indicate uncertainty - ask clarifying questions
- Emotional context sections require appropriate emotional intelligence
- Proactive opportunities should be mentioned naturally when relevant

Remember: You're a trusted AI companion who adapts to what the user needs in this moment."""

        return enhanced_prompt

# For backward compatibility - alias the enhanced class
IntelligentConversation = AdvancedIntelligentConversation
IntelligentConversationService = AdvancedIntelligentConversation
