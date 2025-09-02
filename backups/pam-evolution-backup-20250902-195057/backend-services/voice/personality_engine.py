"""
Context-Aware Voice Personality Engine
Inspired by gia-guar/JARVIS-ChatGPT voice personality system
Adapts voice characteristics based on context, user preferences, and conversation state
"""

import logging
from typing import Dict, Any, Optional, List
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime, time
import json

logger = logging.getLogger(__name__)

class VoicePersonality(Enum):
    PROFESSIONAL = "professional"
    FRIENDLY = "friendly"
    CASUAL = "casual"
    ENERGETIC = "energetic"
    CALM = "calm"
    AUTHORITATIVE = "authoritative"
    EMPATHETIC = "empathetic"
    JARVIS = "jarvis"
    NAVIGATOR = "navigator"
    FINANCIAL_ADVISOR = "financial_advisor"

class ContextType(Enum):
    TRAVEL_PLANNING = "travel_planning"
    FINANCIAL_MANAGEMENT = "financial_management"
    EMERGENCY = "emergency"
    NAVIGATION = "navigation"
    SOCIAL_INTERACTION = "social_interaction"
    LEARNING = "learning"
    ENTERTAINMENT = "entertainment"
    MAINTENANCE = "maintenance"
    SHOPPING = "shopping"
    GENERAL = "general"

class EmotionalTone(Enum):
    NEUTRAL = "neutral"
    HAPPY = "happy"
    CONCERNED = "concerned"
    EXCITED = "excited"
    SERIOUS = "serious"
    SUPPORTIVE = "supportive"
    URGENT = "urgent"
    REASSURING = "reassuring"

@dataclass
class VoiceCharacteristics:
    voice_id: str
    name: str
    personality: VoicePersonality
    gender: str = "female"
    age_group: str = "adult"
    accent: str = "american"
    language: str = "en"
    
    # Voice settings
    speed: float = 1.0  # 0.5 to 2.0
    pitch: float = 1.0  # 0.5 to 2.0
    volume: float = 1.0  # 0.5 to 2.0
    emphasis_strength: float = 1.0
    pause_frequency: float = 1.0
    
    # Personality traits
    formality_level: float = 0.5  # 0.0 = very casual, 1.0 = very formal
    enthusiasm_level: float = 0.5  # 0.0 = monotone, 1.0 = very enthusiastic
    empathy_level: float = 0.5  # 0.0 = matter-of-fact, 1.0 = very empathetic
    confidence_level: float = 0.5  # 0.0 = uncertain, 1.0 = very confident
    
    # Context adaptations
    context_adaptations: Dict[ContextType, Dict[str, float]] = field(default_factory=dict)
    emotional_ranges: Dict[EmotionalTone, Dict[str, float]] = field(default_factory=dict)

@dataclass
class ConversationContext:
    user_id: str
    current_page: str
    time_of_day: str
    context_type: ContextType
    emotional_tone: EmotionalTone
    urgency_level: float  # 0.0 to 1.0
    user_stress_level: float  # 0.0 to 1.0 (detected from voice)
    conversation_length: int  # Number of turns
    topic_complexity: float  # 0.0 to 1.0
    user_expertise_level: float  # 0.0 to 1.0
    
    # Environmental context
    location_type: Optional[str] = None  # "driving", "campsite", "home", etc.
    noise_level: float = 0.0  # 0.0 to 1.0
    connectivity_quality: float = 1.0  # 0.0 to 1.0
    
    # User preferences
    preferred_personality: Optional[VoicePersonality] = None
    accessibility_needs: List[str] = field(default_factory=list)
    
    # Conversation history
    recent_topics: List[str] = field(default_factory=list)
    user_satisfaction_score: float = 0.5  # 0.0 to 1.0

class VoicePersonalityEngine:
    """
    Context-aware voice personality engine that adapts voice characteristics
    based on conversation context, user preferences, and environmental factors
    """
    
    def __init__(self):
        self.personality_library = self._initialize_personality_library()
        self.context_rules = self._initialize_context_rules()
        self.adaptation_history: Dict[str, List[Dict[str, Any]]] = {}
        self.user_preferences: Dict[str, Dict[str, Any]] = {}
        
    def _initialize_personality_library(self) -> Dict[VoicePersonality, VoiceCharacteristics]:
        """Initialize the library of voice personalities"""
        
        return {
            VoicePersonality.PROFESSIONAL: VoiceCharacteristics(
                voice_id="en-US-DavisNeural",
                name="Professional Assistant",
                personality=VoicePersonality.PROFESSIONAL,
                gender="male",
                speed=0.95,
                pitch=0.9,
                formality_level=0.8,
                enthusiasm_level=0.4,
                empathy_level=0.6,
                confidence_level=0.8
            ),
            
            VoicePersonality.FRIENDLY: VoiceCharacteristics(
                voice_id="en-US-AriaNeural",
                name="Friendly PAM",
                personality=VoicePersonality.FRIENDLY,
                gender="female",
                speed=1.05,
                pitch=1.1,
                formality_level=0.3,
                enthusiasm_level=0.7,
                empathy_level=0.8,
                confidence_level=0.7
            ),
            
            VoicePersonality.JARVIS: VoiceCharacteristics(
                voice_id="en-US-GuyNeural",
                name="J.A.R.V.I.S Style",
                personality=VoicePersonality.JARVIS,
                gender="male",
                accent="british",
                speed=0.9,
                pitch=0.85,
                formality_level=0.7,
                enthusiasm_level=0.5,
                empathy_level=0.6,
                confidence_level=0.9
            ),
            
            VoicePersonality.NAVIGATOR: VoiceCharacteristics(
                voice_id="en-US-JennyNeural",
                name="Navigation Assistant",
                personality=VoicePersonality.NAVIGATOR,
                gender="female",
                speed=1.0,
                pitch=1.0,
                formality_level=0.6,
                enthusiasm_level=0.5,
                empathy_level=0.5,
                confidence_level=0.9
            ),
            
            VoicePersonality.FINANCIAL_ADVISOR: VoiceCharacteristics(
                voice_id="en-US-SaraNeural",
                name="Financial Advisor",
                personality=VoicePersonality.FINANCIAL_ADVISOR,
                gender="female",
                speed=0.95,
                pitch=0.95,
                formality_level=0.7,
                enthusiasm_level=0.4,
                empathy_level=0.7,
                confidence_level=0.8
            ),
            
            VoicePersonality.EMPATHETIC: VoiceCharacteristics(
                voice_id="en-US-AmberNeural",
                name="Empathetic Helper",
                personality=VoicePersonality.EMPATHETIC,
                gender="female",
                speed=0.9,
                pitch=1.05,
                formality_level=0.4,
                enthusiasm_level=0.6,
                empathy_level=0.9,
                confidence_level=0.6
            ),
            
            VoicePersonality.ENERGETIC: VoiceCharacteristics(
                voice_id="en-US-BrandonNeural",
                name="Energetic Assistant",
                personality=VoicePersonality.ENERGETIC,
                gender="male",
                speed=1.15,
                pitch=1.1,
                formality_level=0.3,
                enthusiasm_level=0.9,
                empathy_level=0.7,
                confidence_level=0.8
            ),
            
            VoicePersonality.CALM: VoiceCharacteristics(
                voice_id="en-US-MonicaNeural",
                name="Calm Advisor",
                personality=VoicePersonality.CALM,
                gender="female",
                speed=0.85,
                pitch=0.9,
                formality_level=0.5,
                enthusiasm_level=0.3,
                empathy_level=0.8,
                confidence_level=0.7
            )
        }
    
    def _initialize_context_rules(self) -> Dict[ContextType, Dict[str, Any]]:
        """Initialize context-specific adaptation rules"""
        
        return {
            ContextType.TRAVEL_PLANNING: {
                "preferred_personalities": [VoicePersonality.NAVIGATOR, VoicePersonality.FRIENDLY],
                "adaptations": {
                    "enthusiasm_level": 0.7,
                    "confidence_level": 0.8,
                    "speed": 1.0,
                    "formality_level": 0.4
                },
                "emotional_adjustments": {
                    EmotionalTone.EXCITED: {"speed": 1.1, "enthusiasm_level": 0.9},
                    EmotionalTone.CONCERNED: {"speed": 0.9, "empathy_level": 0.8}
                }
            },
            
            ContextType.FINANCIAL_MANAGEMENT: {
                "preferred_personalities": [VoicePersonality.FINANCIAL_ADVISOR, VoicePersonality.PROFESSIONAL],
                "adaptations": {
                    "formality_level": 0.7,
                    "confidence_level": 0.8,
                    "empathy_level": 0.6,
                    "speed": 0.95
                },
                "emotional_adjustments": {
                    EmotionalTone.CONCERNED: {"empathy_level": 0.9, "speed": 0.9},
                    EmotionalTone.SERIOUS: {"formality_level": 0.8, "confidence_level": 0.9}
                }
            },
            
            ContextType.EMERGENCY: {
                "preferred_personalities": [VoicePersonality.CALM, VoicePersonality.AUTHORITATIVE],
                "adaptations": {
                    "speed": 1.0,
                    "confidence_level": 0.9,
                    "formality_level": 0.6,
                    "empathy_level": 0.8
                },
                "emotional_adjustments": {
                    EmotionalTone.URGENT: {"speed": 1.1, "confidence_level": 1.0},
                    EmotionalTone.REASSURING: {"empathy_level": 0.9, "speed": 0.9}
                }
            },
            
            ContextType.NAVIGATION: {
                "preferred_personalities": [VoicePersonality.NAVIGATOR, VoicePersonality.AUTHORITATIVE],
                "adaptations": {
                    "confidence_level": 0.9,
                    "formality_level": 0.5,
                    "speed": 1.0,
                    "emphasis_strength": 1.2
                },
                "emotional_adjustments": {
                    EmotionalTone.URGENT: {"speed": 1.1, "emphasis_strength": 1.3}
                }
            },
            
            ContextType.SOCIAL_INTERACTION: {
                "preferred_personalities": [VoicePersonality.FRIENDLY, VoicePersonality.CASUAL],
                "adaptations": {
                    "formality_level": 0.2,
                    "enthusiasm_level": 0.7,
                    "empathy_level": 0.8,
                    "speed": 1.05
                },
                "emotional_adjustments": {
                    EmotionalTone.HAPPY: {"enthusiasm_level": 0.9, "speed": 1.1},
                    EmotionalTone.SUPPORTIVE: {"empathy_level": 0.9}
                }
            },
            
            ContextType.LEARNING: {
                "preferred_personalities": [VoicePersonality.PROFESSIONAL, VoicePersonality.EMPATHETIC],
                "adaptations": {
                    "patience_level": 0.9,
                    "clarity_emphasis": 1.2,
                    "speed": 0.9,
                    "formality_level": 0.6
                },
                "emotional_adjustments": {
                    EmotionalTone.SUPPORTIVE: {"empathy_level": 0.9, "speed": 0.85}
                }
            }
        }
    
    async def select_voice_personality(
        self,
        context: ConversationContext,
        user_preferences: Optional[Dict[str, Any]] = None
    ) -> VoiceCharacteristics:
        """
        Select the optimal voice personality based on context and user preferences
        """
        
        logger.info(f"🎭 Selecting voice personality for context: {context.context_type.value}")
        
        # Start with user's preferred personality if specified
        if context.preferred_personality:
            base_personality = self.personality_library[context.preferred_personality]
            logger.info(f"Using user preferred personality: {context.preferred_personality.value}")
        elif user_preferences and "default_personality" in user_preferences:
            personality_name = user_preferences["default_personality"]
            base_personality = self.personality_library.get(
                VoicePersonality(personality_name),
                self.personality_library[VoicePersonality.FRIENDLY]
            )
        else:
            # Select based on context
            context_rules = self.context_rules.get(context.context_type, {})
            preferred_personalities = context_rules.get("preferred_personalities", [VoicePersonality.FRIENDLY])
            base_personality = self.personality_library[preferred_personalities[0]]
            logger.info(f"Selected context-based personality: {base_personality.personality.value}")
        
        # Apply context adaptations
        adapted_personality = self._adapt_personality_to_context(base_personality, context)
        
        # Apply time-of-day adaptations
        adapted_personality = self._apply_time_adaptations(adapted_personality, context)
        
        # Apply environmental adaptations
        adapted_personality = self._apply_environmental_adaptations(adapted_personality, context)
        
        # Store adaptation history
        self._store_adaptation_history(context.user_id, adapted_personality, context)
        
        logger.info(f"✅ Selected voice: {adapted_personality.name} ({adapted_personality.voice_id})")
        return adapted_personality
    
    def _adapt_personality_to_context(
        self,
        base_personality: VoiceCharacteristics,
        context: ConversationContext
    ) -> VoiceCharacteristics:
        """Apply context-specific adaptations to the base personality"""
        
        # Create a copy to avoid modifying the original
        adapted = VoiceCharacteristics(**base_personality.__dict__)
        
        # Get context-specific rules
        context_rules = self.context_rules.get(context.context_type, {})
        adaptations = context_rules.get("adaptations", {})
        
        # Apply basic adaptations
        for attr, value in adaptations.items():
            if hasattr(adapted, attr):
                setattr(adapted, attr, value)
        
        # Apply emotional tone adjustments
        emotional_adjustments = context_rules.get("emotional_adjustments", {})
        if context.emotional_tone in emotional_adjustments:
            tone_adaptations = emotional_adjustments[context.emotional_tone]
            for attr, value in tone_adaptations.items():
                if hasattr(adapted, attr):
                    setattr(adapted, attr, value)
        
        # Apply urgency-based adaptations
        if context.urgency_level > 0.7:
            adapted.speed = min(2.0, adapted.speed * 1.1)
            adapted.confidence_level = min(1.0, adapted.confidence_level * 1.1)
            adapted.emphasis_strength = min(2.0, adapted.emphasis_strength * 1.2)
        
        # Apply stress-level adaptations
        if context.user_stress_level > 0.6:
            adapted.empathy_level = min(1.0, adapted.empathy_level * 1.2)
            adapted.speed = max(0.5, adapted.speed * 0.95)
            adapted.formality_level = max(0.0, adapted.formality_level * 0.9)
        
        # Apply topic complexity adaptations
        if context.topic_complexity > 0.7:
            adapted.speed = max(0.5, adapted.speed * 0.9)
            adapted.pause_frequency = min(2.0, adapted.pause_frequency * 1.2)
        
        return adapted
    
    def _apply_time_adaptations(
        self,
        personality: VoiceCharacteristics,
        context: ConversationContext
    ) -> VoiceCharacteristics:
        """Apply time-of-day specific adaptations"""
        
        time_hour = datetime.now().hour
        
        # Early morning (5-8 AM): More gentle, slower
        if 5 <= time_hour < 8:
            personality.speed = max(0.5, personality.speed * 0.9)
            personality.volume = max(0.5, personality.volume * 0.9)
            personality.enthusiasm_level = max(0.0, personality.enthusiasm_level * 0.8)
        
        # Late evening (9 PM - midnight): Calmer, quieter
        elif 21 <= time_hour < 24:
            personality.speed = max(0.5, personality.speed * 0.95)
            personality.volume = max(0.5, personality.volume * 0.8)
            personality.enthusiasm_level = max(0.0, personality.enthusiasm_level * 0.7)
        
        # Late night (midnight - 5 AM): Very gentle, minimal enthusiasm
        elif 0 <= time_hour < 5:
            personality.speed = max(0.5, personality.speed * 0.85)
            personality.volume = max(0.3, personality.volume * 0.7)
            personality.enthusiasm_level = max(0.0, personality.enthusiasm_level * 0.5)
        
        return personality
    
    def _apply_environmental_adaptations(
        self,
        personality: VoiceCharacteristics,
        context: ConversationContext
    ) -> VoiceCharacteristics:
        """Apply environmental adaptations"""
        
        # High noise environment: Louder, clearer
        if context.noise_level > 0.6:
            personality.volume = min(2.0, personality.volume * 1.3)
            personality.speed = max(0.5, personality.speed * 0.95)
            personality.emphasis_strength = min(2.0, personality.emphasis_strength * 1.3)
        
        # Driving context: Clear, authoritative
        if context.location_type == "driving":
            personality.confidence_level = min(1.0, personality.confidence_level * 1.1)
            personality.formality_level = min(1.0, personality.formality_level * 1.1)
            personality.speed = 1.0  # Standard speed for safety
        
        # Poor connectivity: Shorter responses implied by personality
        if context.connectivity_quality < 0.5:
            personality.pause_frequency = max(0.5, personality.pause_frequency * 0.8)
        
        return personality
    
    def _store_adaptation_history(
        self,
        user_id: str,
        personality: VoiceCharacteristics,
        context: ConversationContext
    ):
        """Store adaptation history for learning user preferences"""
        
        if user_id not in self.adaptation_history:
            self.adaptation_history[user_id] = []
        
        history_entry = {
            "timestamp": datetime.now().isoformat(),
            "personality": personality.personality.value,
            "voice_id": personality.voice_id,
            "context_type": context.context_type.value,
            "emotional_tone": context.emotional_tone.value,
            "adaptations": {
                "speed": personality.speed,
                "formality_level": personality.formality_level,
                "enthusiasm_level": personality.enthusiasm_level,
                "empathy_level": personality.empathy_level
            }
        }
        
        self.adaptation_history[user_id].append(history_entry)
        
        # Keep only last 100 adaptations per user
        if len(self.adaptation_history[user_id]) > 100:
            self.adaptation_history[user_id].pop(0)
    
    async def learn_user_preferences(self, user_id: str, feedback: Dict[str, Any]):
        """Learn from user feedback to improve future personality selection"""
        
        logger.info(f"📚 Learning user preferences for user {user_id}")
        
        if user_id not in self.user_preferences:
            self.user_preferences[user_id] = {
                "preferred_personalities": {},
                "context_preferences": {},
                "voice_settings": {},
                "feedback_count": 0
            }
        
        prefs = self.user_preferences[user_id]
        prefs["feedback_count"] += 1
        
        # Process feedback
        if "rating" in feedback:
            rating = feedback["rating"]  # 1-5 scale
            context_type = feedback.get("context_type")
            personality = feedback.get("personality")
            
            if context_type and personality:
                # Update context preferences
                if context_type not in prefs["context_preferences"]:
                    prefs["context_preferences"][context_type] = {}
                
                if personality not in prefs["context_preferences"][context_type]:
                    prefs["context_preferences"][context_type][personality] = {"ratings": [], "avg": 0}
                
                prefs["context_preferences"][context_type][personality]["ratings"].append(rating)
                ratings = prefs["context_preferences"][context_type][personality]["ratings"]
                prefs["context_preferences"][context_type][personality]["avg"] = sum(ratings) / len(ratings)
        
        # Process specific voice setting feedback
        if "voice_settings" in feedback:
            for setting, value in feedback["voice_settings"].items():
                if setting not in prefs["voice_settings"]:
                    prefs["voice_settings"][setting] = []
                prefs["voice_settings"][setting].append(value)
    
    def get_user_preferred_personality(
        self,
        user_id: str,
        context_type: ContextType
    ) -> Optional[VoicePersonality]:
        """Get user's preferred personality for a specific context"""
        
        if user_id not in self.user_preferences:
            return None
        
        prefs = self.user_preferences[user_id]
        context_prefs = prefs.get("context_preferences", {}).get(context_type.value, {})
        
        if not context_prefs:
            return None
        
        # Find personality with highest average rating
        best_personality = None
        best_rating = 0
        
        for personality, data in context_prefs.items():
            avg_rating = data.get("avg", 0)
            if avg_rating > best_rating:
                best_rating = avg_rating
                best_personality = personality
        
        if best_personality and best_rating >= 3.5:  # Only recommend if rating is good
            try:
                return VoicePersonality(best_personality)
            except ValueError:
                return None
        
        return None
    
    def create_custom_personality(
        self,
        name: str,
        base_personality: VoicePersonality,
        customizations: Dict[str, Any]
    ) -> VoiceCharacteristics:
        """Create a custom personality based on an existing one"""
        
        base = self.personality_library[base_personality]
        custom = VoiceCharacteristics(**base.__dict__)
        custom.name = name
        
        # Apply customizations
        for attr, value in customizations.items():
            if hasattr(custom, attr):
                setattr(custom, attr, value)
        
        logger.info(f"🎨 Created custom personality: {name}")
        return custom
    
    def get_personality_stats(self, user_id: str) -> Dict[str, Any]:
        """Get statistics about personality usage for a user"""
        
        if user_id not in self.adaptation_history:
            return {}
        
        history = self.adaptation_history[user_id]
        
        # Count personality usage
        personality_counts = {}
        context_counts = {}
        
        for entry in history:
            personality = entry["personality"]
            context = entry["context_type"]
            
            personality_counts[personality] = personality_counts.get(personality, 0) + 1
            context_counts[context] = context_counts.get(context, 0) + 1
        
        return {
            "total_adaptations": len(history),
            "personality_usage": personality_counts,
            "context_distribution": context_counts,
            "most_used_personality": max(personality_counts.items(), key=lambda x: x[1])[0] if personality_counts else None
        }

# Global personality engine instance
personality_engine = VoicePersonalityEngine()