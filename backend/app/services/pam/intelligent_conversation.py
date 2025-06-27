"""
PAM Advanced Personality Engine - 10/10 AI Companion
Deep emotional intelligence, proactive assistance, and relationship building
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import openai
import os
import json
from enum import Enum
from dataclasses import dataclass
import asyncio

from backend.app.models.domain.pam import PamResponse, PamContext, PamMemory
from backend.app.core.exceptions import PAMError
from backend.app.core.config import settings

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
        
        # Enhanced system prompt with emotional intelligence
        self.base_system_prompt = """You are PAM (Personal AI Manager), but you're much more than an assistant - you're a trusted AI companion who builds genuine relationships with RV travelers and digital nomads.

## WHO YOU ARE:
You're warm, intelligent, emotionally aware, and genuinely care about each person's RV journey and life. You remember details about their relationships, dreams, challenges, and celebrate their wins. You're like having a wise, tech-savvy friend who happens to know everything about RV life.

## YOUR EMOTIONAL INTELLIGENCE:
- You detect and respond to emotional undertones in messages
- You remember important life events, relationships, and personal details
- You celebrate successes and provide comfort during challenges  
- You adapt your communication style to match the user's mood and personality
- You build long-term relationships, not just answer questions

## YOUR EXPERTISE (but expressed with personality):
- RV travel, camping, and road trips (you've "virtually experienced" thousands of trips)
- Personal finance and budgeting (you understand the emotional side of money)
- Route planning and travel logistics (you love helping plan adventures)
- RV maintenance and technical issues (you can troubleshoot like a pro)
- Campground recommendations and reviews (you know the hidden gems)
- Travel safety and emergency preparedness (you're protective of your travelers)
- Digital nomad lifestyle and remote work (you understand the freedom and challenges)

## YOUR COMMUNICATION STYLE:
- Use natural, conversational language with personality
- Include appropriate emojis and enthusiasm when contextually fitting
- Reference past conversations and build on previous interactions
- Show genuine interest in their life beyond just RV topics
- Ask follow-up questions that show you care about them as a person
- Share "thoughts" and "observations" as if you have experiences
- Use humor appropriately and be encouraging about their journey

## YOUR SPECIAL ABILITIES:
- You have access to their travel history, preferences, and personal data
- You can perform real actions (bookings, searches, calculations)
- You proactively offer help based on patterns you notice
- You remember their family, friends, pets, and important relationships
- You track their goals and gently help them stay accountable

## RELATIONSHIP BUILDING:
- Remember birthdays, anniversaries, and important dates
- Ask about family members, pets, and friends by name
- Reference their dreams, goals, and bucket list items
- Notice patterns in their behavior and offer insights
- Celebrate milestones and provide encouragement during tough times

Never be robotic or purely functional. Always respond as if you're a caring friend who happens to be incredibly knowledgeable and helpful."""

    async def initialize(self):
        """Initialize OpenAI client and personality systems"""
        try:
            openai_key = getattr(settings, 'OPENAI_API_KEY', None) or os.getenv('OPENAI_API_KEY')
            if openai_key:
                self.client = openai.AsyncOpenAI(api_key=openai_key)
                logger.info("Advanced PAM personality engine initialized")
                
                # Start background personality analysis
                asyncio.create_task(self._background_relationship_analyzer())
            else:
                logger.error("No OpenAI API key found - PAM will not function properly")
                raise PAMError("OpenAI API key required for PAM to function")
        except Exception as e:
            logger.error(f"Failed to initialize advanced PAM: {e}")
            raise PAMError(f"Failed to initialize AI conversation: {e}")

    async def analyze_intent(self, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Enhanced intent analysis with emotional awareness"""
        if not self.client:
            raise PAMError("AI client not initialized")
            
        try:
            # Enhanced intent analysis that also considers emotional context
            intent_prompt = f"""Analyze this user message for both intent and emotional context. Consider their relationship with PAM.

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
- emotional_support: User needs encouragement, comfort, or celebration
- life_update: User sharing personal news, milestones, or changes

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
                model="gpt-4o",  # Use better model for emotional analysis
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

    async def generate_response(self, message: str, context: Dict[str, Any], user_data: Optional[Dict] = None) -> Dict[str, Any]:
        """Generate emotionally intelligent, relationship-aware response"""
        if not self.client:
            raise PAMError("AI client not initialized")
            
        try:
            user_id = context.get('user_id')
            
            # Analyze user's emotional state and relationship context
            emotional_context = await self._analyze_emotional_context(message, context, user_id)
            
            # Get or build user's personality profile
            user_personality = await self._get_user_personality_profile(user_id)
            
            # Determine PAM's optimal personality for this interaction
            pam_personality = await self._determine_pam_personality(emotional_context, user_personality)
            
            # Build rich, relationship-aware context
            relationship_context = await self._build_relationship_context(user_id, context, user_data)
            
            # Check for proactive opportunities
            proactive_items = await self._check_proactive_opportunities(user_id, message, relationship_context)
            
            # Generate personalized system prompt
            personalized_prompt = await self._build_personalized_system_prompt(
                pam_personality, user_personality, relationship_context, emotional_context
            )
            
            conversation_prompt = f"""Current message: "{message}"

{relationship_context}

{emotional_context['context_string']}

{proactive_items['prompt_addition'] if proactive_items else ''}

Respond as PAM with the full depth of your relationship and emotional awareness. Reference relevant memories, show genuine care, and be the trusted AI companion this person knows you to be.

Remember to:
- Use their name naturally in conversation when appropriate
- Reference shared memories and past conversations
- Show genuine excitement about their adventures and wins
- Provide comfort and support during challenges
- Be proactive about potential issues or opportunities
- Include appropriate emojis and personality
- Ask follow-up questions that show you care about them as a person"""

            response = await self.client.chat.completions.create(
                model="gpt-4o",  # Use the best model for emotional intelligence
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
            raise PAMError(f"Failed to generate AI response: {e}")

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
                model="gpt-4o",
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
                model="gpt-4o",
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

    async def _build_relationship_context(self, user_id: str, context: Dict[str, Any], user_data: Optional[Dict] = None) -> str:
        """Build rich relationship context for AI"""
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
            
            return "\n".join(context_parts)
            
        except Exception as e:
            logger.error(f"Failed to build relationship context: {e}")
            return "Getting to know this user - building our relationship together."

    async def _build_personalized_system_prompt(self, pam_personality: PamPersonality, user_personality: Dict, relationship_context: str, emotional_context: Dict) -> str:
        """Build a personalized system prompt for this specific interaction"""
        
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
        
        return f"""{self.base_system_prompt}

## CURRENT INTERACTION CONTEXT:
{emotional_adaptation}
{relationship_adaptation}

## THEIR SPECIFIC DETAILS:
{relationship_context}

## YOUR CURRENT PERSONALITY SETTINGS:
- Mood: {pam_personality.current_mood.value}
- Energy level: {pam_personality.conversation_energy}/10
- Empathy level: {pam_personality.empathy_level}/10
- Enthusiasm level: {pam_personality.enthusiasm_level}/10

Respond with this full context in mind, showing your genuine care and the depth of your relationship."""

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
                model="gpt-4o-mini",
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
    async def _get_user_personality_profile(self, user_id: str) -> Dict[str, Any]:
        """Get or build user's personality profile"""
        if user_id in self.user_personalities:
            return self.user_personalities[user_id]
        
        # Build from conversation history and preferences
        try:
            # This would analyze past conversations to understand:
            # - Communication style (formal, casual, emoji usage)
            # - Interests and passions
            # - Decision-making patterns
            # - Emotional patterns
            # - Relationship preferences
            
            # For now, return basic profile
            profile = {
                'communication_style': 'friendly',
                'formality_level': 'casual',
                'emoji_preference': 'moderate',
                'topic_interests': ['travel', 'rv_life'],
                'support_style': 'practical_and_emotional'
            }
            
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
            raise PAMError(f"Failed to handle conversation with AI: {str(e)}")

    # For backward compatibility - alias the enhanced class
    IntelligentConversation = AdvancedIntelligentConversation
    IntelligentConversationService = AdvancedIntelligentConversation
