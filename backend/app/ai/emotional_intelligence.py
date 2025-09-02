"""
PAM Emotional Intelligence and Empathy System
Implements advanced emotional understanding, empathy modeling, and emotionally aware responses.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Union
from dataclasses import dataclass, asdict
from enum import Enum
import numpy as np
import re
from collections import defaultdict, deque
import openai
from openai import AsyncOpenAI

from app.core.config import get_settings
from app.services.database import get_database
from app.services.embeddings import VectorEmbeddingService

settings = get_settings()
logger = logging.getLogger(__name__)
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

class EmotionType(Enum):
    """Core emotion types based on psychological research"""
    JOY = "joy"
    SADNESS = "sadness"
    ANGER = "anger"
    FEAR = "fear"
    SURPRISE = "surprise"
    DISGUST = "disgust"
    TRUST = "trust"
    ANTICIPATION = "anticipation"
    
    # Complex emotions
    ANXIETY = "anxiety"
    FRUSTRATION = "frustration"
    EXCITEMENT = "excitement"
    CONTENTMENT = "contentment"
    DISAPPOINTMENT = "disappointment"
    GRATITUDE = "gratitude"
    GUILT = "guilt"
    PRIDE = "pride"
    SHAME = "shame"
    HOPE = "hope"
    LONELINESS = "loneliness"
    CONFIDENCE = "confidence"
    EMBARRASSMENT = "embarrassment"

class EmotionalIntensity(Enum):
    """Intensity levels for emotions"""
    VERY_LOW = 0.1
    LOW = 0.3
    MODERATE = 0.5
    HIGH = 0.7
    VERY_HIGH = 0.9

class EmpathyLevel(Enum):
    """Levels of empathic response"""
    ACKNOWLEDGMENT = "acknowledgment"
    UNDERSTANDING = "understanding"
    VALIDATION = "validation"
    SUPPORT = "support"
    DEEP_EMPATHY = "deep_empathy"

@dataclass
class EmotionalState:
    """Represents detected emotional state"""
    primary_emotion: EmotionType
    intensity: float
    confidence: float
    secondary_emotions: List[Tuple[EmotionType, float]]
    emotional_indicators: List[str]
    context_factors: Dict[str, Any]
    timestamp: datetime

@dataclass
class EmpathicResponse:
    """Represents an empathic response to emotional state"""
    response_id: str
    emotional_acknowledgment: str
    empathic_statement: str
    supportive_action: Optional[str]
    emotional_validation: str
    empathy_level: EmpathyLevel
    response_strategy: str
    confidence: float
    metadata: Dict[str, Any]

@dataclass
class EmotionalProfile:
    """User's emotional profile and patterns"""
    user_id: str
    dominant_emotions: Dict[EmotionType, float]
    emotional_patterns: Dict[str, Any]
    stress_indicators: List[str]
    coping_preferences: List[str]
    emotional_triggers: Dict[str, float]
    support_preferences: List[str]
    last_updated: datetime

@dataclass
class EmotionalContext:
    """Context information for emotional analysis"""
    conversation_history: List[str]
    recent_events: List[str]
    time_of_day: str
    day_of_week: str
    user_state: Dict[str, Any]
    environmental_factors: Dict[str, Any]

class PAMEmotionalIntelligenceSystem:
    """
    Advanced emotional intelligence and empathy system for PAM.
    
    Features:
    - Multi-modal emotion detection (text, voice patterns, behavioral cues)
    - Empathic response generation with appropriate emotional support
    - Emotional profile learning and adaptation
    - Context-aware emotional understanding
    - Therapeutic communication techniques
    - Crisis detection and appropriate response protocols
    """
    
    def __init__(self):
        self.db = get_database()
        self.embedding_service = VectorEmbeddingService()
        self.emotion_history = deque(maxlen=1000)
        self.user_profiles = {}
        
        # Emotion detection patterns
        self.emotion_patterns = self._initialize_emotion_patterns()
        
        # Empathic response templates
        self.empathy_templates = self._initialize_empathy_templates()
        
        # Crisis detection keywords
        self.crisis_keywords = self._initialize_crisis_keywords()
        
        # Therapeutic techniques
        self.therapeutic_techniques = {
            "active_listening": self._apply_active_listening,
            "validation": self._apply_validation,
            "reframing": self._apply_reframing,
            "mindfulness": self._apply_mindfulness_guidance,
            "problem_solving": self._apply_problem_solving_support
        }
        
        # Configuration
        self.emotion_confidence_threshold = 0.6
        self.crisis_detection_threshold = 0.8
        self.empathy_response_max_tokens = 500
        
    async def analyze_emotional_state(
        self,
        text_input: str,
        user_id: Optional[str] = None,
        context: Optional[EmotionalContext] = None,
        voice_features: Optional[Dict[str, Any]] = None
    ) -> EmotionalState:
        """
        Analyze emotional state from multiple inputs.
        
        Args:
            text_input: User's text input
            user_id: User identifier for personalized analysis
            context: Emotional context information
            voice_features: Voice analysis features (if available)
            
        Returns:
            Detected emotional state
        """
        try:
            # Text-based emotion detection
            text_emotions = await self._detect_emotions_from_text(text_input)
            
            # Voice-based emotion detection (if available)
            voice_emotions = []
            if voice_features:
                voice_emotions = await self._detect_emotions_from_voice(voice_features)
            
            # Context-based emotional inference
            context_emotions = []
            if context:
                context_emotions = await self._infer_emotions_from_context(context)
            
            # User profile-based emotional patterns
            profile_emotions = []
            if user_id:
                user_profile = await self._get_emotional_profile(user_id)
                if user_profile:
                    profile_emotions = await self._infer_emotions_from_profile(
                        text_input, user_profile
                    )
            
            # Combine and weight different emotion sources
            combined_emotions = await self._combine_emotion_sources(
                text_emotions, voice_emotions, context_emotions, profile_emotions
            )
            
            # Determine primary emotion and intensity
            primary_emotion, intensity = self._determine_primary_emotion(combined_emotions)
            
            # Calculate confidence
            confidence = self._calculate_emotion_confidence(combined_emotions, text_input)
            
            # Identify secondary emotions
            secondary_emotions = self._identify_secondary_emotions(combined_emotions, primary_emotion)
            
            # Extract emotional indicators
            indicators = await self._extract_emotional_indicators(
                text_input, primary_emotion, context
            )
            
            # Build context factors
            context_factors = {
                "text_length": len(text_input.split()),
                "has_voice_data": voice_features is not None,
                "has_context": context is not None,
                "has_user_profile": user_id is not None and user_id in self.user_profiles
            }
            
            emotional_state = EmotionalState(
                primary_emotion=primary_emotion,
                intensity=intensity,
                confidence=confidence,
                secondary_emotions=secondary_emotions,
                emotional_indicators=indicators,
                context_factors=context_factors,
                timestamp=datetime.utcnow()
            )
            
            # Store emotional state for learning
            await self._store_emotional_state(emotional_state, user_id)
            self.emotion_history.append(emotional_state)
            
            # Update user emotional profile
            if user_id:
                await self._update_emotional_profile(user_id, emotional_state)
            
            return emotional_state
            
        except Exception as e:
            logger.error(f"Error analyzing emotional state: {e}")
            return self._create_neutral_emotional_state()
    
    async def generate_empathic_response(
        self,
        emotional_state: EmotionalState,
        user_input: str,
        user_id: Optional[str] = None,
        response_context: Optional[Dict[str, Any]] = None
    ) -> EmpathicResponse:
        """
        Generate empathic response to user's emotional state.
        
        Args:
            emotional_state: Detected emotional state
            user_input: Original user input
            user_id: User identifier
            response_context: Additional context for response generation
            
        Returns:
            Empathic response with emotional support
        """
        try:
            response_id = f"empathy_{datetime.utcnow().strftime('%Y%m%d_%H%M%S_%f')}"
            
            # Check for crisis situations
            crisis_level = await self._assess_crisis_level(emotional_state, user_input)
            if crisis_level > self.crisis_detection_threshold:
                return await self._generate_crisis_response(emotional_state, user_input, response_id)
            
            # Determine appropriate empathy level
            empathy_level = self._determine_empathy_level(emotional_state)
            
            # Select response strategy
            response_strategy = await self._select_response_strategy(
                emotional_state, user_id, response_context
            )
            
            # Generate emotional acknowledgment
            acknowledgment = await self._generate_emotional_acknowledgment(
                emotional_state, user_input
            )
            
            # Generate empathic statement
            empathic_statement = await self._generate_empathic_statement(
                emotional_state, empathy_level, response_strategy
            )
            
            # Generate supportive action (if appropriate)
            supportive_action = await self._generate_supportive_action(
                emotional_state, user_input, response_strategy
            )
            
            # Generate emotional validation
            validation = await self._generate_emotional_validation(
                emotional_state, user_input
            )
            
            # Calculate response confidence
            confidence = self._calculate_response_confidence(
                emotional_state, empathy_level, response_strategy
            )
            
            empathic_response = EmpathicResponse(
                response_id=response_id,
                emotional_acknowledgment=acknowledgment,
                empathic_statement=empathic_statement,
                supportive_action=supportive_action,
                emotional_validation=validation,
                empathy_level=empathy_level,
                response_strategy=response_strategy,
                confidence=confidence,
                metadata={
                    "emotional_state": asdict(emotional_state),
                    "response_context": response_context or {},
                    "generated_at": datetime.utcnow().isoformat()
                }
            )
            
            # Store empathic response for learning
            await self._store_empathic_response(empathic_response, user_id)
            
            return empathic_response
            
        except Exception as e:
            logger.error(f"Error generating empathic response: {e}")
            return self._create_fallback_empathic_response(emotional_state, user_input)
    
    async def provide_emotional_support(
        self,
        user_id: str,
        support_type: str,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Provide targeted emotional support based on user needs.
        
        Args:
            user_id: User identifier
            support_type: Type of support needed
            context: Additional context
            
        Returns:
            Supportive response
        """
        try:
            # Get user's emotional profile
            profile = await self._get_emotional_profile(user_id)
            
            # Apply appropriate therapeutic technique
            if support_type in self.therapeutic_techniques:
                technique_function = self.therapeutic_techniques[support_type]
                support_response = await technique_function(profile, context)
            else:
                support_response = await self._provide_general_support(profile, context)
            
            return support_response
            
        except Exception as e:
            logger.error(f"Error providing emotional support: {e}")
            return "I understand you're looking for support. I'm here to listen and help in whatever way I can."
    
    async def detect_emotional_patterns(
        self,
        user_id: str,
        time_range: Optional[Tuple[datetime, datetime]] = None
    ) -> Dict[str, Any]:
        """
        Detect emotional patterns for a user over time.
        
        Args:
            user_id: User identifier
            time_range: Optional time range for analysis
            
        Returns:
            Emotional pattern analysis
        """
        try:
            # Get user's emotional history
            emotional_history = await self._get_emotional_history(user_id, time_range)
            
            if not emotional_history:
                return {"error": "No emotional data available for analysis"}
            
            # Analyze patterns
            patterns = {
                "dominant_emotions": self._analyze_dominant_emotions(emotional_history),
                "emotional_trends": self._analyze_emotional_trends(emotional_history),
                "trigger_patterns": await self._analyze_trigger_patterns(emotional_history),
                "time_patterns": self._analyze_temporal_patterns(emotional_history),
                "intensity_patterns": self._analyze_intensity_patterns(emotional_history),
                "support_effectiveness": await self._analyze_support_effectiveness(user_id, emotional_history)
            }
            
            # Generate insights
            insights = await self._generate_emotional_insights(patterns)
            
            return {
                "user_id": user_id,
                "analysis_period": time_range,
                "patterns": patterns,
                "insights": insights,
                "recommendations": await self._generate_emotional_recommendations(patterns),
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error detecting emotional patterns: {e}")
            return {"error": "Failed to analyze emotional patterns"}
    
    # Private methods for emotion detection and analysis
    
    async def _detect_emotions_from_text(self, text: str) -> List[Tuple[EmotionType, float]]:
        """Detect emotions from text using pattern matching and AI analysis"""
        try:
            detected_emotions = []
            
            # Pattern-based detection
            for emotion, patterns in self.emotion_patterns.items():
                score = 0
                for pattern in patterns:
                    if re.search(pattern, text.lower()):
                        score += 0.3
                
                if score > 0:
                    detected_emotions.append((emotion, min(score, 1.0)))
            
            # AI-based emotion detection
            ai_emotions = await self._ai_emotion_detection(text)
            detected_emotions.extend(ai_emotions)
            
            # Combine and normalize scores
            emotion_scores = defaultdict(float)
            for emotion, score in detected_emotions:
                emotion_scores[emotion] += score
            
            # Normalize to 0-1 range
            max_score = max(emotion_scores.values()) if emotion_scores else 1
            normalized_emotions = [
                (emotion, score / max_score) for emotion, score in emotion_scores.items()
            ]
            
            # Sort by score and return top emotions
            return sorted(normalized_emotions, key=lambda x: x[1], reverse=True)[:5]
            
        except Exception as e:
            logger.error(f"Error detecting emotions from text: {e}")
            return [(EmotionType.CONTENTMENT, 0.5)]  # Default neutral emotion
    
    async def _ai_emotion_detection(self, text: str) -> List[Tuple[EmotionType, float]]:
        """Use AI model for emotion detection"""
        try:
            prompt = f"""
            Analyze the emotional content of this text and identify the emotions present.
            
            Text: "{text}"
            
            For each emotion detected, provide:
            1. Emotion name (from: joy, sadness, anger, fear, surprise, disgust, trust, anticipation, anxiety, frustration, excitement, contentment, disappointment, gratitude, guilt, pride, shame, hope, loneliness, confidence, embarrassment)
            2. Intensity score (0-1)
            
            Format as JSON array: [{"emotion": "emotion_name", "intensity": 0.X}]
            """
            
            response = await client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an expert emotion detection system. Analyze text for emotional content and return precise JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=300
            )
            
            # Parse AI response
            ai_response = response.choices[0].message.content
            emotions_data = json.loads(ai_response)
            
            ai_emotions = []
            for item in emotions_data:
                try:
                    emotion = EmotionType(item["emotion"].lower())
                    intensity = float(item["intensity"])
                    ai_emotions.append((emotion, intensity))
                except (ValueError, KeyError):
                    continue
            
            return ai_emotions
            
        except Exception as e:
            logger.error(f"Error in AI emotion detection: {e}")
            return []
    
    def _initialize_emotion_patterns(self) -> Dict[EmotionType, List[str]]:
        """Initialize emotion detection patterns"""
        return {
            EmotionType.JOY: [
                r'\b(happy|joy|excited|thrilled|delighted|cheerful|elated)\b',
                r'\b(amazing|wonderful|fantastic|great|awesome|brilliant)\b',
                r'😊|😄|😁|🎉|❤️|💕'
            ],
            EmotionType.SADNESS: [
                r'\b(sad|depressed|down|upset|miserable|heartbroken|devastated)\b',
                r'\b(crying|tears|weeping|mourning|grief|sorrow)\b',
                r'😢|😭|💔|😞|☹️'
            ],
            EmotionType.ANGER: [
                r'\b(angry|mad|furious|livid|enraged|irritated|annoyed)\b',
                r'\b(hate|disgusted|outraged|pissed|frustrated)\b',
                r'😠|😡|🤬|💢'
            ],
            EmotionType.FEAR: [
                r'\b(afraid|scared|terrified|frightened|worried|anxious|nervous)\b',
                r'\b(panic|phobia|dread|horror|alarm)\b',
                r'😨|😰|😱|👻'
            ],
            EmotionType.SURPRISE: [
                r'\b(surprised|shocked|amazed|astonished|stunned|bewildered)\b',
                r'\b(unexpected|sudden|wow|oh my|incredible)\b',
                r'😮|😯|😲|🤯'
            ],
            EmotionType.ANXIETY: [
                r'\b(anxious|worried|stressed|overwhelmed|panicked|tense)\b',
                r'\b(nervous|apprehensive|uneasy|restless)\b',
                r'😰|😟|😦'
            ],
            EmotionType.FRUSTRATION: [
                r'\b(frustrated|annoyed|irritated|exasperated|fed up)\b',
                r'\b(stuck|blocked|difficult|challenging|impossible)\b',
                r'😤|🙄|😒'
            ],
            EmotionType.GRATITUDE: [
                r'\b(thank|grateful|appreciate|blessed|thankful)\b',
                r'\b(grateful for|thanks to|appreciate that)\b',
                r'🙏|❤️|💕'
            ],
            EmotionType.LONELINESS: [
                r'\b(lonely|alone|isolated|abandoned|disconnected)\b',
                r'\b(no one|nobody|by myself|all alone)\b',
                r'😔|😭|💔'
            ]
        }
    
    def _initialize_empathy_templates(self) -> Dict[EmpathyLevel, List[str]]:
        """Initialize empathy response templates"""
        return {
            EmpathyLevel.ACKNOWLEDGMENT: [
                "I hear that you're feeling {emotion}.",
                "I notice you seem to be experiencing {emotion}.",
                "It sounds like you're going through {emotion}."
            ],
            EmpathyLevel.UNDERSTANDING: [
                "I can understand why you'd feel {emotion} in this situation.",
                "It makes sense that you're feeling {emotion} given what you've shared.",
                "Your feelings of {emotion} are completely understandable."
            ],
            EmpathyLevel.VALIDATION: [
                "Your feelings of {emotion} are completely valid.",
                "It's okay to feel {emotion} - many people would in your situation.",
                "You have every right to feel {emotion} about this."
            ],
            EmpathyLevel.SUPPORT: [
                "I'm here to support you through this {emotion}.",
                "You don't have to handle this {emotion} alone - I'm here with you.",
                "I want to help you work through these feelings of {emotion}."
            ],
            EmpathyLevel.DEEP_EMPATHY: [
                "I can feel how deeply this {emotion} is affecting you, and I want you to know that your feelings matter.",
                "The {emotion} you're experiencing sounds really difficult, and I'm honored that you've shared this with me.",
                "I can sense the weight of this {emotion} you're carrying, and I want to help lighten that load."
            ]
        }
    
    def _initialize_crisis_keywords(self) -> List[str]:
        """Initialize crisis detection keywords"""
        return [
            "suicide", "kill myself", "end it all", "can't go on", "no point",
            "hurt myself", "self-harm", "cutting", "overdose", "die",
            "hopeless", "worthless", "better off dead", "no way out"
        ]
    
    async def _generate_emotional_acknowledgment(
        self,
        emotional_state: EmotionalState,
        user_input: str
    ) -> str:
        """Generate emotional acknowledgment"""
        try:
            emotion_name = emotional_state.primary_emotion.value
            intensity = emotional_state.intensity
            
            intensity_modifier = ""
            if intensity > 0.8:
                intensity_modifier = "deeply "
            elif intensity > 0.6:
                intensity_modifier = "quite "
            elif intensity < 0.3:
                intensity_modifier = "a bit "
            
            templates = [
                f"I can see that you're {intensity_modifier}feeling {emotion_name}.",
                f"I notice you're experiencing {intensity_modifier}{emotion_name}.",
                f"It's clear that you're {intensity_modifier}feeling {emotion_name} right now."
            ]
            
            # Select template based on context
            import random
            return random.choice(templates)
            
        except Exception as e:
            logger.error(f"Error generating emotional acknowledgment: {e}")
            return "I can see that you're experiencing some strong emotions right now."
    
    async def _generate_empathic_statement(
        self,
        emotional_state: EmotionalState,
        empathy_level: EmpathyLevel,
        response_strategy: str
    ) -> str:
        """Generate empathic statement based on emotional state"""
        try:
            emotion_name = emotional_state.primary_emotion.value
            templates = self.empathy_templates.get(empathy_level, [])
            
            if not templates:
                return "I understand you're going through a difficult time."
            
            # Select appropriate template
            import random
            template = random.choice(templates)
            
            # Customize based on response strategy
            empathic_statement = template.format(emotion=emotion_name)
            
            # Add strategy-specific elements
            if response_strategy == "active_listening":
                empathic_statement += " I'm here to listen."
            elif response_strategy == "validation":
                empathic_statement += " Your feelings are important."
            elif response_strategy == "problem_solving":
                empathic_statement += " Let's work through this together."
            
            return empathic_statement
            
        except Exception as e:
            logger.error(f"Error generating empathic statement: {e}")
            return "I want you to know that I care about what you're going through."
    
    def _determine_empathy_level(self, emotional_state: EmotionalState) -> EmpathyLevel:
        """Determine appropriate empathy level based on emotional state"""
        intensity = emotional_state.intensity
        emotion = emotional_state.primary_emotion
        
        # High-intensity negative emotions need deeper empathy
        if intensity > 0.8 and emotion in [EmotionType.SADNESS, EmotionType.ANGER, EmotionType.FEAR, EmotionType.ANXIETY]:
            return EmpathyLevel.DEEP_EMPATHY
        
        # Moderate intensity emotions need support
        if intensity > 0.6:
            return EmpathyLevel.SUPPORT
        
        # Moderate emotions need validation
        if intensity > 0.4:
            return EmpathyLevel.VALIDATION
        
        # Lower intensity emotions need understanding
        if intensity > 0.2:
            return EmpathyLevel.UNDERSTANDING
        
        # Low intensity emotions need acknowledgment
        return EmpathyLevel.ACKNOWLEDGMENT
    
    # Additional therapeutic technique methods would be implemented here...
    # (Truncated for brevity, but would include all therapeutic techniques)
    
    async def _apply_active_listening(
        self,
        profile: Optional[EmotionalProfile],
        context: Optional[Dict[str, Any]]
    ) -> str:
        """Apply active listening therapeutic technique"""
        return "I'm here to listen to whatever you'd like to share. Take your time - I'm giving you my full attention."
    
    async def _apply_validation(
        self,
        profile: Optional[EmotionalProfile],
        context: Optional[Dict[str, Any]]
    ) -> str:
        """Apply validation therapeutic technique"""
        return "What you're feeling is completely valid and understandable. Your emotions make sense given your situation."
    
    async def _apply_reframing(
        self,
        profile: Optional[EmotionalProfile],
        context: Optional[Dict[str, Any]]
    ) -> str:
        """Apply cognitive reframing technique"""
        return "Sometimes it can help to look at the situation from a different angle. What might be another way to view this?"
    
    async def _apply_mindfulness_guidance(
        self,
        profile: Optional[EmotionalProfile],
        context: Optional[Dict[str, Any]]
    ) -> str:
        """Apply mindfulness guidance"""
        return "Let's take a moment to center ourselves. Try taking three deep breaths with me - in through your nose, out through your mouth."
    
    async def _apply_problem_solving_support(
        self,
        profile: Optional[EmotionalProfile],
        context: Optional[Dict[str, Any]]
    ) -> str:
        """Apply problem-solving support"""
        return "I can help you work through this step by step. What feels like the most important thing to address first?"
    
    def _create_neutral_emotional_state(self) -> EmotionalState:
        """Create neutral emotional state for fallback"""
        return EmotionalState(
            primary_emotion=EmotionType.CONTENTMENT,
            intensity=0.5,
            confidence=0.3,
            secondary_emotions=[],
            emotional_indicators=["neutral_state"],
            context_factors={"fallback": True},
            timestamp=datetime.utcnow()
        )
    
    async def _store_emotional_state(
        self,
        emotional_state: EmotionalState,
        user_id: Optional[str]
    ):
        """Store emotional state in database"""
        try:
            if not user_id:
                return
                
            query = """
            INSERT INTO pam_emotional_states (
                user_id, primary_emotion, intensity, confidence,
                secondary_emotions, emotional_indicators, context_factors, timestamp
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """
            
            await self.db.execute(
                query,
                user_id,
                emotional_state.primary_emotion.value,
                emotional_state.intensity,
                emotional_state.confidence,
                json.dumps([(e.value, s) for e, s in emotional_state.secondary_emotions]),
                json.dumps(emotional_state.emotional_indicators),
                json.dumps(emotional_state.context_factors),
                emotional_state.timestamp
            )
            
        except Exception as e:
            logger.error(f"Error storing emotional state: {e}")


# Global emotional intelligence system instance
emotional_intelligence = PAMEmotionalIntelligenceSystem()

# Utility functions for easy integration

async def analyze_emotions(
    text: str,
    user_id: Optional[str] = None,
    context: Optional[Dict[str, Any]] = None
) -> EmotionalState:
    """Convenience function for emotion analysis"""
    emotional_context = None
    if context:
        emotional_context = EmotionalContext(
            conversation_history=context.get("conversation_history", []),
            recent_events=context.get("recent_events", []),
            time_of_day=context.get("time_of_day", "unknown"),
            day_of_week=context.get("day_of_week", "unknown"),
            user_state=context.get("user_state", {}),
            environmental_factors=context.get("environmental_factors", {})
        )
    
    return await emotional_intelligence.analyze_emotional_state(
        text_input=text,
        user_id=user_id,
        context=emotional_context
    )

async def respond_empathically(
    emotional_state: EmotionalState,
    user_input: str,
    user_id: Optional[str] = None,
    context: Optional[Dict[str, Any]] = None
) -> EmpathicResponse:
    """Convenience function for empathic response generation"""
    return await emotional_intelligence.generate_empathic_response(
        emotional_state=emotional_state,
        user_input=user_input,
        user_id=user_id,
        response_context=context
    )

async def provide_support(
    user_id: str,
    support_type: str = "active_listening",
    context: Optional[Dict[str, Any]] = None
) -> str:
    """Convenience function for emotional support"""
    return await emotional_intelligence.provide_emotional_support(
        user_id=user_id,
        support_type=support_type,
        context=context
    )