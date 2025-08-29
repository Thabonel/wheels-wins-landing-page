"""
Voice Personality Matching System
Matches AI text responses to different voice personalities and characteristics.
"""

from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import json
import re
from openai import AsyncOpenAI

from app.core.logging import get_logger
from app.core.config import settings

logger = get_logger(__name__)


class VoicePersonality(Enum):
    """Available voice personality types."""
    
    PROFESSIONAL = "professional"
    FRIENDLY = "friendly"
    CASUAL = "casual"
    ENERGETIC = "energetic"
    CALM = "calm"
    HUMOROUS = "humorous"
    EMPATHETIC = "empathetic"
    AUTHORITATIVE = "authoritative"
    SUPPORTIVE = "supportive"
    CONCISE = "concise"


class EmotionalTone(Enum):
    """Emotional tone classifications."""
    
    NEUTRAL = "neutral"
    HAPPY = "happy"
    EXCITED = "excited"
    CONCERNED = "concerned"
    FRUSTRATED = "frustrated"
    CONFIDENT = "confident"
    REASSURING = "reassuring"
    APOLOGETIC = "apologetic"
    ENCOURAGING = "encouraging"
    INFORMATIVE = "informative"


@dataclass
class PersonalityProfile:
    """Complete personality profile for voice matching."""
    
    primary_personality: VoicePersonality
    secondary_personality: Optional[VoicePersonality]
    emotional_tone: EmotionalTone
    formality_level: float  # 0.0 (casual) to 1.0 (formal)
    enthusiasm_level: float  # 0.0 (subdued) to 1.0 (enthusiastic)
    verbosity: float  # 0.0 (concise) to 1.0 (verbose)
    empathy_level: float  # 0.0 (neutral) to 1.0 (highly empathetic)
    technical_level: float  # 0.0 (simple) to 1.0 (technical)
    
    # Voice-specific characteristics
    speaking_pace: str  # "slow", "normal", "fast"
    emphasis_style: str  # "subtle", "moderate", "strong"
    pause_patterns: str  # "minimal", "natural", "dramatic"


@dataclass
class ResponseAdaptation:
    """Adapted response with personality matching."""
    
    original_text: str
    adapted_text: str
    personality_profile: PersonalityProfile
    adaptation_confidence: float
    voice_instructions: Dict[str, Any]
    prosody_suggestions: Dict[str, Any]


class PersonalityMatcher:
    """
    Voice personality matching system that adapts text responses to match
    specific voice personalities and speaking characteristics.
    """
    
    def __init__(self):
        self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY.get_secret_value())
        self.personality_templates = self._initialize_personality_templates()
        self.emotion_patterns = self._initialize_emotion_patterns()
        self.user_profiles = {}  # Cache user personality preferences
    
    def _initialize_personality_templates(self) -> Dict[VoicePersonality, Dict[str, Any]]:
        """Initialize personality-specific templates and characteristics."""
        return {
            VoicePersonality.PROFESSIONAL: {
                "formality": 0.8,
                "enthusiasm": 0.4,
                "verbosity": 0.6,
                "empathy": 0.5,
                "technical": 0.7,
                "pace": "normal",
                "emphasis": "subtle",
                "patterns": {
                    "greetings": ["Good morning", "Hello", "Thank you for"],
                    "transitions": ["Additionally", "Furthermore", "In summary"],
                    "qualifiers": ["Please note", "It's important to", "I recommend"]
                },
                "avoid": ["slang", "contractions", "exclamations"]
            },
            
            VoicePersonality.FRIENDLY: {
                "formality": 0.3,
                "enthusiasm": 0.7,
                "verbosity": 0.7,
                "empathy": 0.8,
                "technical": 0.4,
                "pace": "normal",
                "emphasis": "moderate",
                "patterns": {
                    "greetings": ["Hey there", "Hi", "Great to help"],
                    "transitions": ["Also", "By the way", "Oh, and"],
                    "qualifiers": ["I'd suggest", "You might want to", "How about"]
                },
                "encourage": ["contractions", "warm_language", "personal_touch"]
            },
            
            VoicePersonality.CASUAL: {
                "formality": 0.2,
                "enthusiasm": 0.5,
                "verbosity": 0.4,
                "empathy": 0.6,
                "technical": 0.3,
                "pace": "normal",
                "emphasis": "subtle",
                "patterns": {
                    "greetings": ["Hey", "What's up", "Sure thing"],
                    "transitions": ["So", "Anyway", "Yeah"],
                    "qualifiers": ["Maybe", "Probably", "I think"]
                },
                "encourage": ["slang", "contractions", "informal_language"]
            },
            
            VoicePersonality.ENERGETIC: {
                "formality": 0.4,
                "enthusiasm": 0.9,
                "verbosity": 0.8,
                "empathy": 0.7,
                "technical": 0.5,
                "pace": "fast",
                "emphasis": "strong",
                "patterns": {
                    "greetings": ["Awesome", "Fantastic", "Let's do this"],
                    "transitions": ["And", "Plus", "Even better"],
                    "qualifiers": ["Definitely", "Absolutely", "For sure"]
                },
                "encourage": ["exclamations", "positive_language", "action_words"]
            },
            
            VoicePersonality.CALM: {
                "formality": 0.6,
                "enthusiasm": 0.3,
                "verbosity": 0.5,
                "empathy": 0.7,
                "technical": 0.6,
                "pace": "slow",
                "emphasis": "subtle",
                "patterns": {
                    "greetings": ["Hello", "I understand", "Let me help"],
                    "transitions": ["Now", "Next", "Then"],
                    "qualifiers": ["Gently", "Carefully", "Take your time"]
                },
                "encourage": ["soothing_language", "measured_pace", "reassurance"]
            },
            
            VoicePersonality.EMPATHETIC: {
                "formality": 0.5,
                "enthusiasm": 0.6,
                "verbosity": 0.7,
                "empathy": 0.9,
                "technical": 0.4,
                "pace": "normal",
                "emphasis": "moderate",
                "patterns": {
                    "greetings": ["I understand", "I'm here to help", "That sounds challenging"],
                    "transitions": ["I can imagine", "It makes sense that", "I hear you"],
                    "qualifiers": ["It's completely normal", "Many people feel", "You're not alone"]
                },
                "encourage": ["emotional_validation", "supportive_language", "understanding"]
            }
        }
    
    def _initialize_emotion_patterns(self) -> Dict[EmotionalTone, Dict[str, Any]]:
        """Initialize emotion-specific patterns and adjustments."""
        return {
            EmotionalTone.HAPPY: {
                "words": ["great", "wonderful", "fantastic", "excellent", "amazing"],
                "modifiers": ["really", "quite", "very", "so", "absolutely"],
                "tone_adjustment": 0.2,
                "pace_modifier": 1.1
            },
            
            EmotionalTone.EXCITED: {
                "words": ["awesome", "incredible", "brilliant", "perfect", "outstanding"],
                "modifiers": ["totally", "completely", "absolutely", "definitely"],
                "tone_adjustment": 0.4,
                "pace_modifier": 1.2
            },
            
            EmotionalTone.CONCERNED: {
                "words": ["important", "careful", "attention", "notice", "consider"],
                "modifiers": ["quite", "rather", "particularly", "especially"],
                "tone_adjustment": -0.2,
                "pace_modifier": 0.9
            },
            
            EmotionalTone.REASSURING: {
                "words": ["safe", "secure", "protected", "handled", "taken care of"],
                "modifiers": ["completely", "fully", "properly", "carefully"],
                "tone_adjustment": 0.1,
                "pace_modifier": 0.95
            }
        }
    
    async def match_personality_to_response(
        self,
        response_text: str,
        user_id: str,
        context: Optional[Dict[str, Any]] = None,
        desired_personality: Optional[VoicePersonality] = None
    ) -> ResponseAdaptation:
        """
        Match and adapt response text to a specific voice personality.
        
        Args:
            response_text: Original AI response text
            user_id: User identifier for personality preferences
            context: Additional context (emotion, urgency, etc.)
            desired_personality: Override personality selection
            
        Returns:
            ResponseAdaptation with personality-matched text and voice instructions
        """
        try:
            # Determine target personality
            personality_profile = await self._determine_personality_profile(
                user_id, response_text, context, desired_personality
            )
            
            # Adapt text to personality
            adapted_text = await self._adapt_text_to_personality(
                response_text, personality_profile, context
            )
            
            # Generate voice instructions
            voice_instructions = self._generate_voice_instructions(personality_profile)
            
            # Generate prosody suggestions
            prosody_suggestions = self._generate_prosody_suggestions(
                adapted_text, personality_profile, context
            )
            
            # Calculate adaptation confidence
            confidence = self._calculate_adaptation_confidence(
                response_text, adapted_text, personality_profile
            )
            
            adaptation = ResponseAdaptation(
                original_text=response_text,
                adapted_text=adapted_text,
                personality_profile=personality_profile,
                adaptation_confidence=confidence,
                voice_instructions=voice_instructions,
                prosody_suggestions=prosody_suggestions
            )
            
            logger.info(f"Adapted response for {personality_profile.primary_personality.value} personality")
            return adaptation
            
        except Exception as e:
            logger.error(f"Error in personality matching: {e}")
            # Return original text with neutral personality
            return ResponseAdaptation(
                original_text=response_text,
                adapted_text=response_text,
                personality_profile=self._get_default_personality_profile(),
                adaptation_confidence=0.1,
                voice_instructions={},
                prosody_suggestions={}
            )
    
    async def _determine_personality_profile(
        self,
        user_id: str,
        response_text: str,
        context: Optional[Dict[str, Any]],
        desired_personality: Optional[VoicePersonality]
    ) -> PersonalityProfile:
        """Determine the best personality profile for the response."""
        
        # Use explicit personality if provided
        if desired_personality:
            return self._create_personality_profile(desired_personality, context)
        
        # Check user's saved personality preferences
        if user_id in self.user_profiles:
            saved_profile = self.user_profiles[user_id]
            return self._adjust_profile_for_context(saved_profile, context)
        
        # Analyze context and content to determine personality
        analysis = await self._analyze_response_for_personality(response_text, context)
        personality = analysis["recommended_personality"]
        
        # Create and cache profile
        profile = self._create_personality_profile(personality, context)
        self.user_profiles[user_id] = profile
        
        return profile
    
    async def _analyze_response_for_personality(
        self, 
        response_text: str, 
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze response content to recommend appropriate personality."""
        
        # Basic content analysis
        content_indicators = {
            "technical_terms": len(re.findall(r'\b(?:algorithm|protocol|system|database|configuration)\b', response_text.lower())),
            "emotional_words": len(re.findall(r'\b(?:sorry|understand|feel|help|support|worry)\b', response_text.lower())),
            "action_words": len(re.findall(r'\b(?:create|add|update|delete|go|start|stop)\b', response_text.lower())),
            "urgency_words": len(re.findall(r'\b(?:urgent|important|critical|immediately|asap)\b', response_text.lower())),
            "length": len(response_text.split())
        }
        
        # Context analysis
        urgency = context.get("urgency", 0.0) if context else 0.0
        user_emotion = context.get("detected_emotion", "neutral") if context else "neutral"
        
        # AI-powered personality recommendation
        ai_recommendation = await self._ai_recommend_personality(
            response_text, content_indicators, urgency, user_emotion
        )
        
        return {
            "recommended_personality": ai_recommendation,
            "content_indicators": content_indicators,
            "confidence": 0.8
        }
    
    async def _ai_recommend_personality(
        self,
        response_text: str,
        content_indicators: Dict[str, int],
        urgency: float,
        user_emotion: str
    ) -> VoicePersonality:
        """Use AI to recommend the best personality for the response."""
        
        personalities_desc = "\n".join([
            f"- {p.value}: {self._get_personality_description(p)}"
            for p in VoicePersonality
        ])
        
        prompt = f"""
        Recommend the best voice personality for this response:
        
        Response: "{response_text}"
        
        Context:
        - Technical terms: {content_indicators['technical_terms']}
        - Emotional words: {content_indicators['emotional_words']}
        - Urgency level: {urgency:.2f}
        - User emotion: {user_emotion}
        - Response length: {content_indicators['length']} words
        
        Available personalities:
        {personalities_desc}
        
        Return only the personality name (e.g., "professional").
        """
        
        try:
            response = await self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=50,
                temperature=0.3
            )
            
            personality_name = response.choices[0].message.content.strip().lower()
            
            # Convert to enum
            for personality in VoicePersonality:
                if personality.value == personality_name:
                    return personality
            
            # Default fallback
            return VoicePersonality.FRIENDLY
            
        except Exception as e:
            logger.warning(f"AI personality recommendation failed: {e}")
            return VoicePersonality.FRIENDLY
    
    def _get_personality_description(self, personality: VoicePersonality) -> str:
        """Get description for personality type."""
        descriptions = {
            VoicePersonality.PROFESSIONAL: "Formal, authoritative, business-like",
            VoicePersonality.FRIENDLY: "Warm, approachable, conversational",
            VoicePersonality.CASUAL: "Relaxed, informal, laid-back",
            VoicePersonality.ENERGETIC: "Enthusiastic, upbeat, dynamic",
            VoicePersonality.CALM: "Soothing, measured, tranquil",
            VoicePersonality.EMPATHETIC: "Understanding, supportive, emotionally aware"
        }
        return descriptions.get(personality, "Balanced and helpful")
    
    def _create_personality_profile(
        self, 
        personality: VoicePersonality, 
        context: Optional[Dict[str, Any]]
    ) -> PersonalityProfile:
        """Create a complete personality profile."""
        
        template = self.personality_templates[personality]
        
        # Determine emotional tone from context
        emotional_tone = EmotionalTone.NEUTRAL
        if context:
            if context.get("urgency", 0) > 0.7:
                emotional_tone = EmotionalTone.CONCERNED
            elif context.get("detected_emotion") == "happy":
                emotional_tone = EmotionalTone.HAPPY
            elif context.get("success", False):
                emotional_tone = EmotionalTone.CONFIDENT
        
        return PersonalityProfile(
            primary_personality=personality,
            secondary_personality=None,
            emotional_tone=emotional_tone,
            formality_level=template["formality"],
            enthusiasm_level=template["enthusiasm"],
            verbosity=template["verbosity"],
            empathy_level=template["empathy"],
            technical_level=template["technical"],
            speaking_pace=template["pace"],
            emphasis_style=template["emphasis"],
            pause_patterns="natural"
        )
    
    def _adjust_profile_for_context(
        self, 
        base_profile: PersonalityProfile, 
        context: Optional[Dict[str, Any]]
    ) -> PersonalityProfile:
        """Adjust personality profile based on current context."""
        if not context:
            return base_profile
        
        # Create adjusted profile
        adjusted = PersonalityProfile(**base_profile.__dict__)
        
        # Adjust for urgency
        urgency = context.get("urgency", 0.0)
        if urgency > 0.7:
            adjusted.speaking_pace = "fast"
            adjusted.verbosity = max(0.2, adjusted.verbosity - 0.3)
            adjusted.emotional_tone = EmotionalTone.CONCERNED
        
        # Adjust for user emotion
        user_emotion = context.get("detected_emotion", "neutral")
        if user_emotion == "frustrated":
            adjusted.empathy_level = min(1.0, adjusted.empathy_level + 0.2)
            adjusted.emotional_tone = EmotionalTone.REASSURING
        elif user_emotion == "happy":
            adjusted.enthusiasm_level = min(1.0, adjusted.enthusiasm_level + 0.1)
            adjusted.emotional_tone = EmotionalTone.HAPPY
        
        return adjusted
    
    async def _adapt_text_to_personality(
        self,
        original_text: str,
        personality_profile: PersonalityProfile,
        context: Optional[Dict[str, Any]]
    ) -> str:
        """Adapt text content to match personality profile."""
        
        # Apply personality-specific transformations
        adapted_text = self._apply_personality_patterns(original_text, personality_profile)
        
        # Apply emotional tone adjustments
        adapted_text = self._apply_emotional_tone(adapted_text, personality_profile.emotional_tone)
        
        # Adjust formality level
        adapted_text = self._adjust_formality(adapted_text, personality_profile.formality_level)
        
        # Adjust verbosity
        adapted_text = await self._adjust_verbosity(adapted_text, personality_profile.verbosity)
        
        # Add personality-specific flourishes
        adapted_text = self._add_personality_flourishes(adapted_text, personality_profile)
        
        return adapted_text
    
    def _apply_personality_patterns(
        self, 
        text: str, 
        personality_profile: PersonalityProfile
    ) -> str:
        """Apply personality-specific language patterns."""
        
        template = self.personality_templates[personality_profile.primary_personality]
        patterns = template.get("patterns", {})
        
        # Replace greetings
        greetings = patterns.get("greetings", [])
        if greetings and any(greeting in text.lower() for greeting in ["hello", "hi", "hey"]):
            # Replace with personality-appropriate greeting
            for old_greeting in ["Hello", "Hi", "Hey"]:
                if old_greeting in text:
                    text = text.replace(old_greeting, greetings[0], 1)
                    break
        
        # Add transitions if text is long
        if len(text.split()) > 20:
            transitions = patterns.get("transitions", [])
            if transitions:
                # Insert transitions at sentence boundaries
                sentences = text.split(". ")
                if len(sentences) > 2:
                    sentences[1] = f"{transitions[0]}, {sentences[1].lower()}"
                    text = ". ".join(sentences)
        
        return text
    
    def _apply_emotional_tone(self, text: str, emotional_tone: EmotionalTone) -> str:
        """Apply emotional tone adjustments to text."""
        
        if emotional_tone == EmotionalTone.NEUTRAL:
            return text
        
        tone_patterns = self.emotion_patterns.get(emotional_tone, {})
        
        # Add emotional words
        emotional_words = tone_patterns.get("words", [])
        modifiers = tone_patterns.get("modifiers", [])
        
        # Add appropriate modifiers
        if emotional_tone in [EmotionalTone.HAPPY, EmotionalTone.EXCITED]:
            # Add positive modifiers
            text = re.sub(r'\b(good|nice|great)\b', r'\1 ' + modifiers[0] if modifiers else r'\1', text, count=1)
        
        elif emotional_tone == EmotionalTone.REASSURING:
            # Add reassuring language
            if not any(word in text.lower() for word in ["don't worry", "no problem", "certainly"]):
                text = "Certainly! " + text
        
        return text
    
    def _adjust_formality(self, text: str, formality_level: float) -> str:
        """Adjust text formality level."""
        
        if formality_level > 0.7:
            # Make more formal
            contractions = {
                "don't": "do not",
                "won't": "will not",
                "can't": "cannot",
                "it's": "it is",
                "you're": "you are",
                "we're": "we are",
                "they're": "they are"
            }
            
            for contraction, full_form in contractions.items():
                text = text.replace(contraction, full_form)
                text = text.replace(contraction.capitalize(), full_form.capitalize())
        
        elif formality_level < 0.4:
            # Make more casual
            formal_phrases = {
                "I would recommend": "I'd suggest",
                "It is important": "It's important",
                "You should consider": "You might wanna",
                "Please ensure": "Make sure",
                "Additionally": "Also"
            }
            
            for formal, casual in formal_phrases.items():
                text = text.replace(formal, casual)
        
        return text
    
    async def _adjust_verbosity(self, text: str, verbosity_level: float) -> str:
        """Adjust text verbosity based on personality."""
        
        if verbosity_level < 0.4:
            # Make more concise
            text = await self._make_text_concise(text)
        elif verbosity_level > 0.7:
            # Make more elaborate
            text = await self._make_text_elaborate(text)
        
        return text
    
    async def _make_text_concise(self, text: str) -> str:
        """Make text more concise while preserving meaning."""
        
        # Remove redundant phrases
        redundant_phrases = [
            "I want to let you know that",
            "I'd like to inform you that",
            "Please be aware that",
            "It should be noted that"
        ]
        
        for phrase in redundant_phrases:
            text = text.replace(phrase, "")
        
        # Shorten common phrases
        shortenings = {
            "in order to": "to",
            "due to the fact that": "because",
            "at this point in time": "now",
            "for the reason that": "because"
        }
        
        for long_form, short_form in shortenings.items():
            text = text.replace(long_form, short_form)
        
        return text.strip()
    
    async def _make_text_elaborate(self, text: str) -> str:
        """Make text more elaborate and detailed."""
        
        # Add elaborative phrases
        if len(text.split()) < 10:
            elaborations = [
                "Let me provide you with some details about this.",
                "I'd be happy to explain this further.",
                "Here's what I can tell you about that."
            ]
            text = f"{elaborations[0]} {text}"
        
        return text
    
    def _add_personality_flourishes(
        self, 
        text: str, 
        personality_profile: PersonalityProfile
    ) -> str:
        """Add personality-specific flourishes and characteristics."""
        
        personality = personality_profile.primary_personality
        
        if personality == VoicePersonality.ENERGETIC:
            # Add enthusiasm
            if not text.endswith("!"):
                text = text.rstrip(".") + "!"
            
        elif personality == VoicePersonality.EMPATHETIC:
            # Add understanding phrases
            if not any(phrase in text.lower() for phrase in ["understand", "feel", "know"]):
                text = f"I understand this is important to you. {text}"
        
        elif personality == VoicePersonality.PROFESSIONAL:
            # Add professional courtesy
            if not text.startswith(("Thank you", "I appreciate")):
                text = f"Thank you for your question. {text}"
        
        return text
    
    def _generate_voice_instructions(self, personality_profile: PersonalityProfile) -> Dict[str, Any]:
        """Generate voice synthesis instructions for personality matching."""
        
        instructions = {
            "speaking_rate": self._get_speaking_rate(personality_profile.speaking_pace),
            "pitch_variance": self._get_pitch_variance(personality_profile.enthusiasm_level),
            "emphasis_strength": personality_profile.emphasis_style,
            "pause_duration": self._get_pause_duration(personality_profile.pause_patterns),
            "emotional_intensity": personality_profile.enthusiasm_level,
            "formality_indicator": personality_profile.formality_level
        }
        
        # Add personality-specific voice settings
        personality_settings = self._get_personality_voice_settings(personality_profile.primary_personality)
        instructions.update(personality_settings)
        
        return instructions
    
    def _get_speaking_rate(self, pace: str) -> float:
        """Convert pace to numerical speaking rate."""
        pace_mapping = {
            "slow": 0.8,
            "normal": 1.0,
            "fast": 1.2
        }
        return pace_mapping.get(pace, 1.0)
    
    def _get_pitch_variance(self, enthusiasm: float) -> float:
        """Calculate pitch variance based on enthusiasm."""
        # Higher enthusiasm = more pitch variation
        return 0.5 + (enthusiasm * 0.5)
    
    def _get_pause_duration(self, patterns: str) -> float:
        """Get pause duration multiplier."""
        pattern_mapping = {
            "minimal": 0.7,
            "natural": 1.0,
            "dramatic": 1.4
        }
        return pattern_mapping.get(patterns, 1.0)
    
    def _get_personality_voice_settings(self, personality: VoicePersonality) -> Dict[str, Any]:
        """Get voice-specific settings for each personality."""
        
        settings_map = {
            VoicePersonality.PROFESSIONAL: {
                "voice_id": "professional_voice",
                "stability": 0.8,
                "clarity": 0.9,
                "warmth": 0.4
            },
            VoicePersonality.FRIENDLY: {
                "voice_id": "friendly_voice", 
                "stability": 0.6,
                "clarity": 0.8,
                "warmth": 0.8
            },
            VoicePersonality.ENERGETIC: {
                "voice_id": "energetic_voice",
                "stability": 0.5,
                "clarity": 0.7,
                "warmth": 0.7
            },
            VoicePersonality.CALM: {
                "voice_id": "calm_voice",
                "stability": 0.9,
                "clarity": 0.9,
                "warmth": 0.6
            }
        }
        
        return settings_map.get(personality, {
            "voice_id": "default_voice",
            "stability": 0.7,
            "clarity": 0.8,
            "warmth": 0.6
        })
    
    def _generate_prosody_suggestions(
        self,
        text: str,
        personality_profile: PersonalityProfile,
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate prosody and intonation suggestions."""
        
        prosody = {
            "stress_patterns": self._identify_stress_patterns(text, personality_profile),
            "intonation_contour": self._generate_intonation_contour(text, personality_profile),
            "breath_groups": self._identify_breath_groups(text),
            "emphasis_words": self._identify_emphasis_words(text, personality_profile),
            "emotional_coloring": self._get_emotional_coloring(personality_profile.emotional_tone)
        }
        
        return prosody
    
    def _identify_stress_patterns(self, text: str, personality_profile: PersonalityProfile) -> List[Dict[str, Any]]:
        """Identify which words should be stressed based on personality."""
        
        words = text.split()
        stress_patterns = []
        
        # Content words typically get stress
        content_word_patterns = r'\b(noun|verb|adjective|adverb)\b'
        
        for i, word in enumerate(words):
            stress_level = "normal"
            
            # Increase stress for important words based on personality
            if personality_profile.emphasis_style == "strong":
                if word.lower() in ["important", "critical", "amazing", "perfect"]:
                    stress_level = "strong"
            elif personality_profile.emphasis_style == "subtle":
                stress_level = "weak"
            
            stress_patterns.append({
                "word": word,
                "position": i,
                "stress_level": stress_level
            })
        
        return stress_patterns
    
    def _generate_intonation_contour(self, text: str, personality_profile: PersonalityProfile) -> str:
        """Generate intonation pattern for the text."""
        
        # Simple contour generation based on sentence structure
        if text.endswith("?"):
            return "rising"
        elif text.endswith("!"):
            return "high_falling" if personality_profile.enthusiasm_level > 0.6 else "falling"
        else:
            return "falling"
    
    def _identify_breath_groups(self, text: str) -> List[str]:
        """Identify natural breath group boundaries."""
        
        # Split on natural boundaries
        breath_groups = []
        
        # Split on punctuation and conjunctions
        current_group = ""
        words = text.split()
        
        for word in words:
            current_group += word + " "
            
            # Natural break points
            if (word.endswith((",", ";", ".", "!")) or 
                word.lower() in ["and", "but", "however", "therefore"] or
                len(current_group.split()) >= 7):
                
                breath_groups.append(current_group.strip())
                current_group = ""
        
        if current_group:
            breath_groups.append(current_group.strip())
        
        return breath_groups
    
    def _identify_emphasis_words(self, text: str, personality_profile: PersonalityProfile) -> List[str]:
        """Identify words that should receive emphasis."""
        
        emphasis_words = []
        words = text.lower().split()
        
        # Content-based emphasis
        important_categories = {
            "action": ["add", "create", "delete", "update", "find", "search"],
            "emotion": ["love", "hate", "enjoy", "worry", "excited", "concerned"],
            "quantity": ["all", "none", "many", "few", "most", "least"],
            "quality": ["best", "worst", "amazing", "terrible", "perfect", "awful"]
        }
        
        for category, word_list in important_categories.items():
            for word in word_list:
                if word in words:
                    emphasis_words.append(word)
        
        # Personality-specific emphasis
        if personality_profile.primary_personality == VoicePersonality.ENERGETIC:
            energetic_words = ["awesome", "fantastic", "incredible", "amazing"]
            emphasis_words.extend([w for w in energetic_words if w in words])
        
        return list(set(emphasis_words))
    
    def _get_emotional_coloring(self, emotional_tone: EmotionalTone) -> Dict[str, float]:
        """Get emotional coloring parameters for voice synthesis."""
        
        coloring_map = {
            EmotionalTone.HAPPY: {"joy": 0.8, "energy": 0.7, "warmth": 0.8},
            EmotionalTone.EXCITED: {"joy": 0.9, "energy": 0.9, "warmth": 0.7},
            EmotionalTone.CONCERNED: {"worry": 0.6, "seriousness": 0.8, "care": 0.7},
            EmotionalTone.REASSURING: {"calm": 0.8, "confidence": 0.7, "warmth": 0.9},
            EmotionalTone.NEUTRAL: {"balance": 0.5, "stability": 0.8, "clarity": 0.9}
        }
        
        return coloring_map.get(emotional_tone, {"balance": 0.5, "stability": 0.8, "clarity": 0.9})
    
    def _calculate_adaptation_confidence(
        self,
        original_text: str,
        adapted_text: str,
        personality_profile: PersonalityProfile
    ) -> float:
        """Calculate confidence score for the adaptation."""
        
        # Base confidence from text similarity (shouldn't be too different)
        similarity = self._calculate_text_similarity(original_text, adapted_text)
        base_confidence = 0.7 if 0.6 <= similarity <= 0.9 else 0.4
        
        # Boost for personality-specific patterns
        template = self.personality_templates[personality_profile.primary_personality]
        patterns = template.get("patterns", {})
        
        pattern_match_score = 0.0
        for pattern_list in patterns.values():
            if any(pattern.lower() in adapted_text.lower() for pattern in pattern_list):
                pattern_match_score += 0.1
        
        return min(1.0, base_confidence + pattern_match_score)
    
    def _calculate_text_similarity(self, text1: str, text2: str) -> float:
        """Calculate simple text similarity score."""
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        
        if not words1 or not words2:
            return 0.0
        
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        return len(intersection) / len(union)
    
    def _get_default_personality_profile(self) -> PersonalityProfile:
        """Get default personality profile for fallback."""
        return PersonalityProfile(
            primary_personality=VoicePersonality.FRIENDLY,
            secondary_personality=None,
            emotional_tone=EmotionalTone.NEUTRAL,
            formality_level=0.5,
            enthusiasm_level=0.5,
            verbosity=0.5,
            empathy_level=0.6,
            technical_level=0.5,
            speaking_pace="normal",
            emphasis_style="moderate",
            pause_patterns="natural"
        )
    
    async def save_user_personality_preference(
        self,
        user_id: str,
        personality_profile: PersonalityProfile
    ):
        """Save user's personality preferences for future use."""
        self.user_profiles[user_id] = personality_profile
        logger.info(f"Saved personality preference for user {user_id}: {personality_profile.primary_personality.value}")
    
    async def get_user_personality_preference(
        self,
        user_id: str
    ) -> Optional[PersonalityProfile]:
        """Get user's saved personality preferences."""
        return self.user_profiles.get(user_id)


# Global instance
personality_matcher = PersonalityMatcher()


async def get_personality_matcher() -> PersonalityMatcher:
    """Get the global personality matcher instance."""
    return personality_matcher