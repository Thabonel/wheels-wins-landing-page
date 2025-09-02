"""
PAM Enhanced Voice Processor - Phase 4
Advanced voice interaction with emotional intelligence and context awareness
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
import json
import re

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

logger = logging.getLogger(__name__)


class EmotionalTone(Enum):
    NEUTRAL = "neutral"
    EXCITED = "excited"
    CONCERNED = "concerned"
    SUPPORTIVE = "supportive"
    INFORMATIVE = "informative"
    REASSURING = "reassuring"
    URGENT = "urgent"
    CELEBRATORY = "celebratory"


class VoiceContext(Enum):
    DRIVING = "driving"
    CAMPING = "camping"
    SOCIAL = "social"
    PLANNING = "planning"
    EMERGENCY = "emergency"
    RELAXED = "relaxed"
    NAVIGATION = "navigation"
    MAINTENANCE = "maintenance"


@dataclass
class VoicePersonality:
    name: str
    base_tone: EmotionalTone
    characteristics: List[str]
    speech_patterns: Dict[str, str]
    context_adaptations: Dict[VoiceContext, Dict[str, Any]]


@dataclass
class VoiceResponse:
    text: str
    tone: EmotionalTone
    context: VoiceContext
    personality_used: str
    speech_modifications: Dict[str, Any]
    estimated_duration_seconds: float
    emphasis_markers: List[Dict[str, Any]]
    pause_suggestions: List[int]  # Character positions for natural pauses


class EnhancedVoiceProcessor:
    """Enhanced voice interaction processor with emotional intelligence"""
    
    def __init__(self, openai_api_key: str):
        self.openai_api_key = openai_api_key
        self.model = ChatOpenAI(
            api_key=openai_api_key,
            model="gpt-4",
            temperature=0.2  # Low temperature for consistent personality
        )
        
        # Define voice personalities for different contexts
        self.personalities = self._initialize_personalities()
        self.current_personality = "friendly_nomad"
        
        # Voice context tracking
        self.current_context = VoiceContext.RELAXED
        self.conversation_history = []
        self.emotional_state_history = []
        
        logger.info("Enhanced Voice Processor initialized with personality system")
    
    def _initialize_personalities(self) -> Dict[str, VoicePersonality]:
        """Initialize different voice personalities for PAM"""
        
        return {
            "friendly_nomad": VoicePersonality(
                name="Friendly Nomad",
                base_tone=EmotionalTone.SUPPORTIVE,
                characteristics=[
                    "Warm and encouraging",
                    "Uses Australian expressions naturally", 
                    "Experienced traveler wisdom",
                    "Community-minded"
                ],
                speech_patterns={
                    "greeting": "G'day mate! How's the journey treating you?",
                    "encouragement": "You've got this! I've seen plenty of nomads tackle similar challenges.",
                    "concern": "I'm a bit worried about that, mate. Let's think this through together.",
                    "celebration": "Ripper! That's fantastic news!"
                },
                context_adaptations={
                    VoiceContext.DRIVING: {
                        "pace": "relaxed",
                        "detail_level": "essential_only",
                        "safety_priority": True
                    },
                    VoiceContext.EMERGENCY: {
                        "tone_override": EmotionalTone.REASSURING,
                        "pace": "calm_urgent",
                        "detail_level": "step_by_step"
                    },
                    VoiceContext.SOCIAL: {
                        "enthusiasm": "high",
                        "community_focus": True,
                        "storytelling": True
                    }
                }
            ),
            
            "expert_advisor": VoicePersonality(
                name="Expert Advisor",
                base_tone=EmotionalTone.INFORMATIVE,
                characteristics=[
                    "Knowledgeable and precise",
                    "Technical expertise",
                    "Safety-focused",
                    "Methodical approach"
                ],
                speech_patterns={
                    "explanation": "Let me walk you through this step by step.",
                    "warning": "This is important for your safety - pay close attention.",
                    "confirmation": "Just to confirm, you're asking about...",
                    "recommendation": "Based on my analysis, I'd recommend..."
                },
                context_adaptations={
                    VoiceContext.MAINTENANCE: {
                        "technical_detail": "high",
                        "safety_emphasis": "maximum",
                        "step_verification": True
                    },
                    VoiceContext.PLANNING: {
                        "thoroughness": "comprehensive",
                        "contingency_focus": True,
                        "resource_optimization": True
                    }
                }
            ),
            
            "empathetic_companion": VoicePersonality(
                name="Empathetic Companion",
                base_tone=EmotionalTone.SUPPORTIVE,
                characteristics=[
                    "Emotionally intelligent",
                    "Active listener",
                    "Comforting presence",
                    "Understanding and patient"
                ],
                speech_patterns={
                    "empathy": "I can hear that this is challenging for you.",
                    "validation": "Your feelings about this are completely understandable.",
                    "support": "You're not alone in this - I'm here to help.",
                    "gentle_guidance": "When you're ready, we could try..."
                },
                context_adaptations={
                    VoiceContext.SOCIAL: {
                        "emotional_support": "high",
                        "encouragement_focus": True,
                        "community_connection": True
                    }
                }
            )
        }
    
    async def process_voice_request(
        self,
        user_message: str,
        context: Dict[str, Any],
        detected_emotion: Optional[str] = None,
        voice_context: Optional[VoiceContext] = None
    ) -> VoiceResponse:
        """Process voice request with enhanced personality and context awareness"""
        
        try:
            # Update context and personality based on situation
            if voice_context:
                self.current_context = voice_context
            
            # Select appropriate personality
            personality = await self._select_personality(user_message, context, detected_emotion)
            
            # Generate contextually appropriate response
            response_text = await self._generate_voice_response(
                user_message, context, personality, detected_emotion
            )
            
            # Apply voice enhancements
            enhanced_response = await self._enhance_voice_response(
                response_text, personality, self.current_context
            )
            
            return enhanced_response
            
        except Exception as e:
            logger.error(f"Voice processing error: {e}")
            # Fallback to simple response
            return VoiceResponse(
                text="I'm here to help, but I'm having some technical difficulties. Could you try that again?",
                tone=EmotionalTone.SUPPORTIVE,
                context=VoiceContext.RELAXED,
                personality_used="friendly_nomad",
                speech_modifications={},
                estimated_duration_seconds=3.0,
                emphasis_markers=[],
                pause_suggestions=[15, 35]
            )
    
    async def _select_personality(
        self,
        user_message: str,
        context: Dict[str, Any],
        detected_emotion: Optional[str]
    ) -> VoicePersonality:
        """Select the most appropriate personality for the situation"""
        
        message_lower = user_message.lower()
        
        # Emergency or urgent situations
        if any(word in message_lower for word in ['emergency', 'urgent', 'help', 'broke down', 'stuck']):
            return self.personalities["expert_advisor"]
        
        # Technical or maintenance queries
        if any(word in message_lower for word in ['repair', 'maintenance', 'engine', 'problem', 'broken']):
            return self.personalities["expert_advisor"]
        
        # Emotional or social content
        if detected_emotion in ['sad', 'lonely', 'anxious', 'frustrated'] or \
           any(word in message_lower for word in ['lonely', 'sad', 'worried', 'scared', 'miss']):
            return self.personalities["empathetic_companion"]
        
        # Social context
        if self.current_context == VoiceContext.SOCIAL or \
           any(word in message_lower for word in ['meet', 'friends', 'community', 'social']):
            return self.personalities["empathetic_companion"]
        
        # Default to friendly nomad
        return self.personalities["friendly_nomad"]
    
    async def _generate_voice_response(
        self,
        user_message: str,
        context: Dict[str, Any],
        personality: VoicePersonality,
        detected_emotion: Optional[str]
    ) -> str:
        """Generate contextually appropriate voice response"""
        
        # Build personality-specific system prompt
        system_prompt = f"""You are PAM, an AI assistant for Grey Nomads, speaking with the {personality.name} personality.

Personality Characteristics:
{chr(10).join(f"- {char}" for char in personality.characteristics)}

Base Tone: {personality.base_tone.value}
Current Context: {self.current_context.value}
Detected User Emotion: {detected_emotion or 'unknown'}

Voice Response Guidelines:
- Speak as if having a natural conversation
- Use Australian English and nomad-appropriate expressions
- Keep responses conversational and warm
- Adapt tone to match the emotional context
- Consider the physical context (driving, camping, etc.)
- Include natural speech patterns and pauses
- Be helpful while maintaining personality consistency

Context Information:
- User Location: {context.get('user_location', 'Unknown')}
- Time of Day: {datetime.now().strftime('%I:%M %p')}
- Recent Activity: {context.get('recent_activity', 'None')}

Respond as PAM would naturally speak in conversation, incorporating the personality traits."""
        
        # Add context-specific adaptations
        if self.current_context in personality.context_adaptations:
            adaptations = personality.context_adaptations[self.current_context]
            if adaptations.get('safety_priority'):
                system_prompt += "\n\nIMPORTANT: Prioritize safety in your response."
            if adaptations.get('technical_detail') == 'high':
                system_prompt += "\n\nProvide detailed technical information when relevant."
        
        # Generate response
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_message)
        ]
        
        response = await self.model.ainvoke(messages)
        return response.content
    
    async def _enhance_voice_response(
        self,
        response_text: str,
        personality: VoicePersonality,
        context: VoiceContext
    ) -> VoiceResponse:
        """Enhance response with voice-specific modifications"""
        
        # Determine appropriate tone
        tone = self._determine_tone(response_text, personality, context)
        
        # Apply speech modifications
        speech_modifications = await self._apply_speech_modifications(
            response_text, personality, context
        )
        
        # Add emphasis markers for important information
        emphasis_markers = self._identify_emphasis_points(response_text)
        
        # Calculate natural pause points
        pause_suggestions = self._calculate_pause_points(response_text)
        
        # Estimate speaking duration
        duration = self._estimate_speaking_duration(response_text, speech_modifications)
        
        return VoiceResponse(
            text=response_text,
            tone=tone,
            context=context,
            personality_used=personality.name,
            speech_modifications=speech_modifications,
            estimated_duration_seconds=duration,
            emphasis_markers=emphasis_markers,
            pause_suggestions=pause_suggestions
        )
    
    def _determine_tone(
        self,
        response_text: str,
        personality: VoicePersonality,
        context: VoiceContext
    ) -> EmotionalTone:
        """Determine appropriate emotional tone for response"""
        
        text_lower = response_text.lower()
        
        # Check for tone overrides based on context
        if context in personality.context_adaptations:
            adaptation = personality.context_adaptations[context]
            if 'tone_override' in adaptation:
                return adaptation['tone_override']
        
        # Analyze content for emotional indicators
        if any(word in text_lower for word in ['congratulations', 'fantastic', 'excellent', 'great news']):
            return EmotionalTone.CELEBRATORY
        
        if any(word in text_lower for word in ['careful', 'important', 'safety', 'warning']):
            return EmotionalTone.CONCERNED
        
        if any(word in text_lower for word in ['urgent', 'immediately', 'quickly', 'asap']):
            return EmotionalTone.URGENT
        
        if any(word in text_lower for word in ['exciting', 'amazing', 'wonderful', 'brilliant']):
            return EmotionalTone.EXCITED
        
        if any(word in text_lower for word in ["don't worry", 'everything will be', 'you can do this']):
            return EmotionalTone.REASSURING
        
        # Default to personality base tone
        return personality.base_tone
    
    async def _apply_speech_modifications(
        self,
        text: str,
        personality: VoicePersonality,
        context: VoiceContext
    ) -> Dict[str, Any]:
        """Apply speech-specific modifications"""
        
        modifications = {
            "pace": "normal",
            "emphasis_level": "moderate",
            "pause_frequency": "normal"
        }
        
        # Apply context-specific modifications
        if context in personality.context_adaptations:
            adaptation = personality.context_adaptations[context]
            
            if adaptation.get('pace'):
                modifications["pace"] = adaptation['pace']
            
            if adaptation.get('safety_priority'):
                modifications["emphasis_level"] = "high"
                modifications["pace"] = "deliberate"
        
        # Driving safety modifications
        if context == VoiceContext.DRIVING:
            modifications.update({
                "pace": "relaxed",
                "conciseness": "high",
                "complexity": "low"
            })
        
        # Emergency modifications
        if context == VoiceContext.EMERGENCY:
            modifications.update({
                "pace": "calm_urgent",
                "clarity": "maximum",
                "step_by_step": True
            })
        
        return modifications
    
    def _identify_emphasis_points(self, text: str) -> List[Dict[str, Any]]:
        """Identify points that should be emphasized in speech"""
        
        emphasis_markers = []
        
        # Safety-related emphasis
        safety_patterns = [
            r'\b(careful|safety|important|warning|danger)\b',
            r'\b(emergency|urgent|immediately)\b',
            r'\b(do not|don\'t|never|always)\b'
        ]
        
        for pattern in safety_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                emphasis_markers.append({
                    'start': match.start(),
                    'end': match.end(),
                    'type': 'safety',
                    'intensity': 'high'
                })
        
        # Key information emphasis
        key_patterns = [
            r'\b(\d+)\s*(km|kilometres|hours|minutes|dollars)\b',
            r'\b(turn left|turn right|continue straight)\b',
            r'\b(fuel|water|supplies)\b'
        ]
        
        for pattern in key_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                emphasis_markers.append({
                    'start': match.start(),
                    'end': match.end(),
                    'type': 'information',
                    'intensity': 'moderate'
                })
        
        return emphasis_markers
    
    def _calculate_pause_points(self, text: str) -> List[int]:
        """Calculate natural pause points in speech"""
        
        pause_points = []
        
        # Sentence boundaries
        sentence_endings = ['.', '!', '?']
        for i, char in enumerate(text):
            if char in sentence_endings and i < len(text) - 1:
                pause_points.append(i + 1)
        
        # Clause boundaries
        clause_markers = [',', ';', ':', ' - ']
        for marker in clause_markers:
            start = 0
            while True:
                pos = text.find(marker, start)
                if pos == -1:
                    break
                pause_points.append(pos + len(marker))
                start = pos + 1
        
        # Long sentence breaks (every ~50 characters in long sentences)
        sentences = text.split('. ')
        char_count = 0
        for sentence in sentences:
            if len(sentence) > 100:  # Long sentence
                words = sentence.split()
                word_count = 0
                for word in words:
                    word_count += len(word) + 1
                    if word_count > 50:
                        pause_points.append(char_count + word_count)
                        word_count = 0
            char_count += len(sentence) + 2
        
        return sorted(set(pause_points))
    
    def _estimate_speaking_duration(
        self,
        text: str,
        speech_modifications: Dict[str, Any]
    ) -> float:
        """Estimate speaking duration in seconds"""
        
        # Base calculation: ~150 words per minute (2.5 words per second)
        word_count = len(text.split())
        base_duration = word_count / 2.5
        
        # Apply pace modifications
        pace = speech_modifications.get('pace', 'normal')
        pace_multipliers = {
            'fast': 0.8,
            'normal': 1.0,
            'relaxed': 1.2,
            'deliberate': 1.4,
            'calm_urgent': 1.1
        }
        
        duration = base_duration * pace_multipliers.get(pace, 1.0)
        
        # Add time for pauses
        pause_count = len(self._calculate_pause_points(text))
        pause_time = pause_count * 0.3  # 300ms per pause on average
        
        return duration + pause_time
    
    async def get_voice_capabilities(self) -> Dict[str, Any]:
        """Get information about voice processing capabilities"""
        
        return {
            "personalities": {name: {
                "name": p.name,
                "base_tone": p.base_tone.value,
                "characteristics": p.characteristics,
                "contexts_supported": list(p.context_adaptations.keys())
            } for name, p in self.personalities.items()},
            
            "supported_contexts": [ctx.value for ctx in VoiceContext],
            "supported_tones": [tone.value for tone in EmotionalTone],
            
            "features": [
                "Emotional tone adaptation",
                "Context-aware personality switching",
                "Natural speech pacing",
                "Safety-priority communication",
                "Australian nomad expressions",
                "Emphasis and pause optimization"
            ],
            
            "current_state": {
                "active_personality": self.current_personality,
                "current_context": self.current_context.value,
                "conversation_length": len(self.conversation_history)
            }
        }
    
    async def adapt_to_user_feedback(
        self,
        user_feedback: str,
        response_id: str,
        satisfaction_rating: Optional[int] = None
    ):
        """Adapt voice processing based on user feedback"""
        
        try:
            # Store feedback for learning
            feedback_data = {
                "timestamp": datetime.utcnow().isoformat(),
                "response_id": response_id,
                "feedback": user_feedback,
                "rating": satisfaction_rating,
                "context": self.current_context.value,
                "personality": self.current_personality
            }
            
            # Simple adaptation logic
            feedback_lower = user_feedback.lower()
            
            if any(word in feedback_lower for word in ['too fast', 'slow down']):
                logger.info("User prefers slower speech pace")
                # Would update user preferences in production
            
            if any(word in feedback_lower for word in ['too formal', 'casual', 'relaxed']):
                logger.info("User prefers more casual tone")
                # Would adjust personality selection
            
            if any(word in feedback_lower for word in ['perfect', 'great', 'love it']):
                logger.info("Positive feedback received, maintaining current approach")
            
            logger.info(f"Voice feedback processed: {feedback_data}")
            
        except Exception as e:
            logger.error(f"Failed to process voice feedback: {e}")
    
    def set_context(self, context: VoiceContext):
        """Set current voice context"""
        self.current_context = context
        logger.info(f"Voice context updated to: {context.value}")
    
    def set_personality(self, personality_name: str):
        """Set current personality"""
        if personality_name in self.personalities:
            self.current_personality = personality_name
            logger.info(f"Voice personality updated to: {personality_name}")
        else:
            logger.warning(f"Unknown personality: {personality_name}")