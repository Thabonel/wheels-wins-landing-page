"""
Voice Mapping System for TTS Engines
Provides comprehensive voice ID translation and mapping between different TTS engines.
"""

from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
from dataclasses import dataclass
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class VoiceCharacteristic(Enum):
    """Voice characteristics for mapping"""
    GENDER_FEMALE = "female"
    GENDER_MALE = "male"
    AGE_YOUNG = "young"
    AGE_MIDDLE = "middle"
    AGE_ADULT = "adult"
    AGE_ELDERLY = "elderly"
    ACCENT_AMERICAN = "american"
    ACCENT_BRITISH = "british"
    ACCENT_AUSTRALIAN = "australian"
    ACCENT_CANADIAN = "canadian"
    ACCENT_IRISH = "irish"
    ACCENT_SCOTTISH = "scottish"
    STYLE_CASUAL = "casual"
    STYLE_PROFESSIONAL = "professional"
    STYLE_FRIENDLY = "friendly"
    STYLE_ENERGETIC = "energetic"
    STYLE_CALM = "calm"
    STYLE_AUTHORITATIVE = "authoritative"


@dataclass
class VoiceMapping:
    """Maps a generic voice ID to engine-specific implementations"""
    generic_id: str
    display_name: str
    description: str
    gender: VoiceCharacteristic
    age: VoiceCharacteristic  
    accent: VoiceCharacteristic
    style: VoiceCharacteristic
    quality_score: float  # 1.0-10.0 quality rating
    
    # Engine-specific mappings
    edge_voice_id: Optional[str] = None
    coqui_voice_id: Optional[str] = None
    system_voice_id: Optional[str] = None
    supabase_voice_id: Optional[str] = None
    
    # Additional metadata
    is_neural: bool = True
    supports_ssml: bool = True
    languages: List[str] = None
    
    def __post_init__(self):
        if self.languages is None:
            self.languages = ["en-US"]


class VoiceMappingService:
    """
    Central service for voice ID mapping and translation between TTS engines.
    
    This service provides:
    1. Generic voice IDs that map to engine-specific implementations
    2. Voice characteristic-based matching
    3. Fallback voice selection
    4. Quality-based voice ranking
    """
    
    def __init__(self):
        self.voice_mappings: Dict[str, VoiceMapping] = {}
        self.characteristic_index: Dict[str, List[str]] = {}
        self.quality_rankings: List[str] = []
        self._initialize_voice_mappings()
        self._build_indexes()
    
    def _initialize_voice_mappings(self):
        """Initialize comprehensive voice mapping database"""
        
        # High-quality female voices
        self.voice_mappings["pam_female_professional"] = VoiceMapping(
            generic_id="pam_female_professional",
            display_name="PAM Professional (Female)",
            description="Professional, mature female voice for business contexts",
            gender=VoiceCharacteristic.GENDER_FEMALE,
            age=VoiceCharacteristic.AGE_MIDDLE,
            accent=VoiceCharacteristic.ACCENT_AMERICAN,
            style=VoiceCharacteristic.STYLE_PROFESSIONAL,
            quality_score=9.2,
            edge_voice_id="en-US-JennyNeural",
            coqui_voice_id="p267",  # Professional female
            system_voice_id="default_female",
            supabase_voice_id="nari-dia",
            languages=["en-US", "en-GB"]
        )
        
        self.voice_mappings["pam_female_friendly"] = VoiceMapping(
            generic_id="pam_female_friendly",
            display_name="PAM Friendly (Female)",
            description="Warm, friendly female voice for casual conversations",
            gender=VoiceCharacteristic.GENDER_FEMALE,
            age=VoiceCharacteristic.AGE_YOUNG,
            accent=VoiceCharacteristic.ACCENT_AMERICAN,
            style=VoiceCharacteristic.STYLE_FRIENDLY,
            quality_score=9.0,
            edge_voice_id="en-US-AriaNeural",
            coqui_voice_id="p225",  # Emma (British Female)
            system_voice_id="default_female",
            supabase_voice_id="nari-dia"
        )
        
        self.voice_mappings["pam_female_energetic"] = VoiceMapping(
            generic_id="pam_female_energetic", 
            display_name="PAM Energetic (Female)",
            description="Upbeat, energetic female voice for exciting content",
            gender=VoiceCharacteristic.GENDER_FEMALE,
            age=VoiceCharacteristic.AGE_YOUNG,
            accent=VoiceCharacteristic.ACCENT_AMERICAN,
            style=VoiceCharacteristic.STYLE_ENERGETIC,
            quality_score=8.8,
            edge_voice_id="en-US-SaraNeural",
            coqui_voice_id="p229",  # Sophie (Energetic)
            system_voice_id="default_female"
        )
        
        # High-quality male voices
        self.voice_mappings["pam_male_professional"] = VoiceMapping(
            generic_id="pam_male_professional",
            display_name="PAM Professional (Male)",
            description="Authoritative, professional male voice for formal contexts",
            gender=VoiceCharacteristic.GENDER_MALE,
            age=VoiceCharacteristic.AGE_MIDDLE,
            accent=VoiceCharacteristic.ACCENT_AMERICAN,
            style=VoiceCharacteristic.STYLE_PROFESSIONAL,
            quality_score=9.1,
            edge_voice_id="en-US-DavisNeural",
            coqui_voice_id="p228",  # James (Professional)
            system_voice_id="default_male"
        )
        
        self.voice_mappings["pam_male_calm"] = VoiceMapping(
            generic_id="pam_male_calm",
            display_name="PAM Calm (Male)",
            description="Calm, reassuring male voice for assistance and guidance",
            gender=VoiceCharacteristic.GENDER_MALE,
            age=VoiceCharacteristic.AGE_MIDDLE,
            accent=VoiceCharacteristic.ACCENT_AMERICAN,
            style=VoiceCharacteristic.STYLE_CALM,
            quality_score=8.9,
            edge_voice_id="en-US-GuyNeural",
            coqui_voice_id="p232",  # David (Calm)
            system_voice_id="default_male"
        )
        
        self.voice_mappings["pam_male_friendly"] = VoiceMapping(
            generic_id="pam_male_friendly",
            display_name="PAM Friendly (Male)",
            description="Approachable, friendly male voice for casual interactions",
            gender=VoiceCharacteristic.GENDER_MALE,
            age=VoiceCharacteristic.AGE_YOUNG,
            accent=VoiceCharacteristic.ACCENT_AMERICAN,
            style=VoiceCharacteristic.STYLE_FRIENDLY,
            quality_score=8.7,
            edge_voice_id="en-US-JasonNeural",
            coqui_voice_id="p226",  # Alex (British Male)
            system_voice_id="default_male"
        )
        
        # Context-specific voice mappings
        self.voice_mappings["pam_travel_guide"] = VoiceMapping(
            generic_id="pam_travel_guide",
            display_name="PAM Travel Guide",
            description="Enthusiastic voice for travel planning and guidance",
            gender=VoiceCharacteristic.GENDER_FEMALE,
            age=VoiceCharacteristic.AGE_YOUNG,
            accent=VoiceCharacteristic.ACCENT_AMERICAN,
            style=VoiceCharacteristic.STYLE_ENERGETIC,
            quality_score=9.0,
            edge_voice_id="en-US-SaraNeural",
            coqui_voice_id="p229",
            system_voice_id="default_female"
        )
        
        self.voice_mappings["pam_financial_advisor"] = VoiceMapping(
            generic_id="pam_financial_advisor",
            display_name="PAM Financial Advisor",
            description="Professional, trustworthy voice for financial guidance",
            gender=VoiceCharacteristic.GENDER_MALE,
            age=VoiceCharacteristic.AGE_MIDDLE,
            accent=VoiceCharacteristic.ACCENT_AMERICAN,
            style=VoiceCharacteristic.STYLE_AUTHORITATIVE,
            quality_score=9.3,
            edge_voice_id="en-US-DavisNeural",
            coqui_voice_id="p228",
            system_voice_id="default_male"
        )
        
        # Emergency and important contexts
        self.voice_mappings["pam_emergency"] = VoiceMapping(
            generic_id="pam_emergency",
            display_name="PAM Emergency",
            description="Clear, calm voice for emergency situations",
            gender=VoiceCharacteristic.GENDER_MALE,
            age=VoiceCharacteristic.AGE_MIDDLE,
            accent=VoiceCharacteristic.ACCENT_AMERICAN,
            style=VoiceCharacteristic.STYLE_AUTHORITATIVE,
            quality_score=9.5,
            edge_voice_id="en-US-GuyNeural",
            coqui_voice_id="p232",
            system_voice_id="default_male"
        )
        
        # British voices for variety
        self.voice_mappings["pam_british_female"] = VoiceMapping(
            generic_id="pam_british_female",
            display_name="PAM British (Female)",
            description="Sophisticated British female voice",
            gender=VoiceCharacteristic.GENDER_FEMALE,
            age=VoiceCharacteristic.AGE_MIDDLE,
            accent=VoiceCharacteristic.ACCENT_BRITISH,
            style=VoiceCharacteristic.STYLE_PROFESSIONAL,
            quality_score=8.9,
            edge_voice_id="en-GB-SoniaNeural",
            coqui_voice_id="p227",  # Sarah (British Female)
            system_voice_id="default_female"
        )
        
        self.voice_mappings["pam_british_male"] = VoiceMapping(
            generic_id="pam_british_male",
            display_name="PAM British (Male)",
            description="Distinguished British male voice",
            gender=VoiceCharacteristic.GENDER_MALE,
            age=VoiceCharacteristic.AGE_MIDDLE,
            accent=VoiceCharacteristic.ACCENT_BRITISH,
            style=VoiceCharacteristic.STYLE_PROFESSIONAL,
            quality_score=8.8,
            edge_voice_id="en-GB-RyanNeural",
            coqui_voice_id="p230",  # Oliver (British Male)
            system_voice_id="default_male"
        )
        
        # Default/fallback voices
        self.voice_mappings["pam_default"] = VoiceMapping(
            generic_id="pam_default",
            display_name="PAM Default",
            description="Default PAM voice - friendly and professional",
            gender=VoiceCharacteristic.GENDER_FEMALE,
            age=VoiceCharacteristic.AGE_MIDDLE,
            accent=VoiceCharacteristic.ACCENT_AMERICAN,
            style=VoiceCharacteristic.STYLE_FRIENDLY,
            quality_score=9.0,
            edge_voice_id="en-US-JennyNeural", 
            coqui_voice_id="p225",
            system_voice_id="default_female",
            supabase_voice_id="nari-dia"
        )

        # ===== REGIONAL MATURE VOICES (Location-based selection) =====

        # Australian mature female voice
        self.voice_mappings["pam_australian_mature"] = VoiceMapping(
            generic_id="pam_australian_mature",
            display_name="PAM Australian (Mature)",
            description="Mature, warm Australian female voice for Australian users",
            gender=VoiceCharacteristic.GENDER_FEMALE,
            age=VoiceCharacteristic.AGE_MIDDLE,
            accent=VoiceCharacteristic.ACCENT_AUSTRALIAN,
            style=VoiceCharacteristic.STYLE_FRIENDLY,
            quality_score=9.2,
            edge_voice_id="en-AU-ElsieNeural",
            languages=["en-AU"]
        )

        # American mature female voice (warmer than Jenny)
        self.voice_mappings["pam_american_mature"] = VoiceMapping(
            generic_id="pam_american_mature",
            display_name="PAM American (Mature)",
            description="Mature, warm American female voice for US users",
            gender=VoiceCharacteristic.GENDER_FEMALE,
            age=VoiceCharacteristic.AGE_MIDDLE,
            accent=VoiceCharacteristic.ACCENT_AMERICAN,
            style=VoiceCharacteristic.STYLE_FRIENDLY,
            quality_score=9.3,
            edge_voice_id="en-US-AriaNeural",
            languages=["en-US"]
        )

        # British mature female voice
        self.voice_mappings["pam_british_mature"] = VoiceMapping(
            generic_id="pam_british_mature",
            display_name="PAM British (Mature)",
            description="Mature, warm British female voice for UK users",
            gender=VoiceCharacteristic.GENDER_FEMALE,
            age=VoiceCharacteristic.AGE_MIDDLE,
            accent=VoiceCharacteristic.ACCENT_BRITISH,
            style=VoiceCharacteristic.STYLE_FRIENDLY,
            quality_score=9.2,
            edge_voice_id="en-GB-SoniaNeural",
            languages=["en-GB"]
        )

        # Canadian mature female voice
        self.voice_mappings["pam_canadian_mature"] = VoiceMapping(
            generic_id="pam_canadian_mature",
            display_name="PAM Canadian (Mature)",
            description="Mature, warm Canadian female voice for Canadian users",
            gender=VoiceCharacteristic.GENDER_FEMALE,
            age=VoiceCharacteristic.AGE_MIDDLE,
            accent=VoiceCharacteristic.ACCENT_CANADIAN,
            style=VoiceCharacteristic.STYLE_FRIENDLY,
            quality_score=9.2,
            edge_voice_id="en-CA-ClaraNeural",
            languages=["en-CA"]
        )

        logger.info(f"✅ Initialized {len(self.voice_mappings)} voice mappings")
    
    def _build_indexes(self):
        """Build indexes for fast characteristic-based lookups"""
        
        # Build characteristic index
        for voice_id, mapping in self.voice_mappings.items():
            # Index by characteristics
            characteristics = [
                mapping.gender.value,
                mapping.age.value,
                mapping.accent.value,
                mapping.style.value
            ]
            
            for char in characteristics:
                if char not in self.characteristic_index:
                    self.characteristic_index[char] = []
                self.characteristic_index[char].append(voice_id)
        
        # Build quality rankings
        self.quality_rankings = sorted(
            self.voice_mappings.keys(),
            key=lambda x: self.voice_mappings[x].quality_score,
            reverse=True
        )
        
        logger.info(f"✅ Built indexes for {len(self.characteristic_index)} characteristics")
    
    def get_engine_voice_id(self, generic_id: str, engine: str) -> Optional[str]:
        """
        Get engine-specific voice ID for a generic voice ID.
        
        Args:
            generic_id: Generic voice identifier
            engine: Target engine ('edge', 'coqui', 'system', 'supabase')
            
        Returns:
            Engine-specific voice ID or None if not found
        """
        
        if generic_id not in self.voice_mappings:
            # Try to find by legacy mapping
            legacy_mapping = self._resolve_legacy_voice_id(generic_id)
            if legacy_mapping:
                generic_id = legacy_mapping
            else:
                logger.warning(f"❌ Unknown generic voice ID: {generic_id}")
                return self._get_fallback_voice_id(engine)
        
        mapping = self.voice_mappings[generic_id]
        
        engine_lower = engine.lower()
        if engine_lower == "edge":
            return mapping.edge_voice_id
        elif engine_lower == "coqui":
            return mapping.coqui_voice_id
        elif engine_lower in ["system", "pyttsx3"]:
            return mapping.system_voice_id
        elif engine_lower == "supabase":
            return mapping.supabase_voice_id
        else:
            logger.warning(f"❌ Unknown engine: {engine}")
            return None
    
    def _resolve_legacy_voice_id(self, voice_id: str) -> Optional[str]:
        """
        Resolve legacy voice IDs to generic IDs.
        
        This handles backward compatibility with existing voice IDs.
        """
        
        # Legacy Coqui voice ID mappings
        legacy_coqui_mappings = {
            "p225": "pam_female_friendly",      # Emma (British Female)
            "p226": "pam_male_friendly",        # Alex (British Male)  
            "p227": "pam_british_female",       # Sarah (British Female)
            "p228": "pam_male_professional",    # James (Professional)
            "p229": "pam_female_energetic",     # Sophie (Energetic)
            "p230": "pam_british_male",         # Oliver (British Male)
            "p231": "pam_female_friendly",      # Grace (American Female)
            "p232": "pam_male_calm",            # David (Calm)
            "p267": "pam_female_professional",  # Professional female
            "p376": "pam_male_professional",    # Formal male
        }
        
        # Legacy Edge TTS mappings
        legacy_edge_mappings = {
            "en-US-JennyNeural": "pam_female_professional",
            "en-US-AriaNeural": "pam_female_friendly",
            "en-US-SaraNeural": "pam_female_energetic",
            "en-US-DavisNeural": "pam_male_professional",
            "en-US-GuyNeural": "pam_male_calm",
            "en-US-JasonNeural": "pam_male_friendly",
            "en-GB-SoniaNeural": "pam_british_female",
            "en-GB-RyanNeural": "pam_british_male",
        }
        
        # Check legacy mappings
        if voice_id in legacy_coqui_mappings:
            logger.info(f"🔄 Mapped legacy Coqui voice {voice_id} -> {legacy_coqui_mappings[voice_id]}")
            return legacy_coqui_mappings[voice_id]
        
        if voice_id in legacy_edge_mappings:
            logger.info(f"🔄 Mapped legacy Edge voice {voice_id} -> {legacy_edge_mappings[voice_id]}")
            return legacy_edge_mappings[voice_id]
        
        # Check for direct matches in existing mappings
        for generic_id, mapping in self.voice_mappings.items():
            if (voice_id == mapping.edge_voice_id or 
                voice_id == mapping.coqui_voice_id or
                voice_id == mapping.system_voice_id or
                voice_id == mapping.supabase_voice_id):
                logger.info(f"🔄 Found direct match {voice_id} -> {generic_id}")
                return generic_id
        
        return None
    
    def _get_fallback_voice_id(self, engine: str) -> str:
        """Get fallback voice ID for engine when mapping fails"""
        
        fallback_mapping = self.voice_mappings["pam_default"]
        
        engine_lower = engine.lower()
        if engine_lower == "edge":
            return fallback_mapping.edge_voice_id or "en-US-JennyNeural"
        elif engine_lower == "coqui":
            return fallback_mapping.coqui_voice_id or "p225"
        elif engine_lower in ["system", "pyttsx3"]:
            return fallback_mapping.system_voice_id or "default"
        elif engine_lower == "supabase":
            return fallback_mapping.supabase_voice_id or "nari-dia"
        else:
            return "default"
    
    def find_voice_by_characteristics(
        self,
        gender: Optional[str] = None,
        age: Optional[str] = None,
        accent: Optional[str] = None,
        style: Optional[str] = None,
        context: Optional[str] = None
    ) -> str:
        """
        Find best voice ID by characteristics.
        
        Returns generic voice ID that best matches the criteria.
        """
        
        # Context-specific mappings
        context_mappings = {
            "travel_planning": "pam_travel_guide",
            "budget_management": "pam_financial_advisor",
            "financial": "pam_financial_advisor",
            "emergency": "pam_emergency",
            "professional": "pam_female_professional",
            "casual": "pam_female_friendly",
            "general_conversation": "pam_default"
        }
        
        # Check context mapping first
        if context and context in context_mappings:
            return context_mappings[context]
        
        # Score all voices based on characteristics
        scored_voices = []
        
        for voice_id, mapping in self.voice_mappings.items():
            score = 0
            
            # Gender match (high priority)
            if gender and mapping.gender.value.lower() == gender.lower():
                score += 4
            
            # Style match (high priority)
            if style and mapping.style.value.lower() == style.lower():
                score += 4
                
            # Age match (medium priority)
            if age and mapping.age.value.lower() == age.lower():
                score += 2
                
            # Accent match (low priority)
            if accent and mapping.accent.value.lower() == accent.lower():
                score += 1
            
            # Quality bonus
            score += mapping.quality_score / 10.0
            
            if score > 0:
                scored_voices.append((voice_id, score))
        
        # Return highest scoring voice
        if scored_voices:
            scored_voices.sort(key=lambda x: x[1], reverse=True)
            best_voice = scored_voices[0][0]
            logger.info(f"🎯 Found voice by characteristics: {best_voice}")
            return best_voice
        
        # Fallback to default
        logger.info("🔄 Using default voice for characteristic search")
        return "pam_default"

    def select_voice_by_region(
        self,
        country: Optional[str] = None,
        region: Optional[str] = None,
        user_location: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Select voice based on user's geographic region.

        Args:
            country: ISO country code or country name (e.g., "AU", "Australia")
            region: Region/state (e.g., "NSW", "California")
            user_location: Full location dict with country, region, city, etc.

        Returns:
            Generic voice ID for the user's region
        """

        # Extract country from user_location if provided
        if user_location:
            country = user_location.get("country") or country
            region = user_location.get("region") or region

        if not country:
            logger.info("🌍 No country provided, using default voice")
            return "pam_american_mature"  # Default to American mature voice

        # Normalize country name/code
        country_lower = country.lower()

        # Regional voice mappings
        regional_voices = {
            # Australian variants
            "au": "pam_australian_mature",
            "australia": "pam_australian_mature",

            # American variants
            "us": "pam_american_mature",
            "usa": "pam_american_mature",
            "united states": "pam_american_mature",
            "america": "pam_american_mature",

            # British variants
            "gb": "pam_british_mature",
            "uk": "pam_british_mature",
            "united kingdom": "pam_british_mature",
            "britain": "pam_british_mature",
            "england": "pam_british_mature",
            "scotland": "pam_british_mature",
            "wales": "pam_british_mature",

            # Canadian variants
            "ca": "pam_canadian_mature",
            "canada": "pam_canadian_mature"
        }

        # Check if country matches any regional voice
        selected_voice = regional_voices.get(country_lower)

        if selected_voice:
            logger.info(f"🌍 Selected regional voice: {selected_voice} for country: {country}")
            return selected_voice

        # Fallback logic based on region patterns
        # (e.g., New Zealand uses Australian English)
        if country_lower in ["nz", "new zealand"]:
            logger.info(f"🌍 Using Australian voice for New Zealand user")
            return "pam_australian_mature"

        # For other countries, default to American mature voice
        logger.info(f"🌍 No specific regional voice for {country}, using American mature voice")
        return "pam_american_mature"

    def get_voice_info(self, generic_id: str) -> Optional[Dict[str, Any]]:
        """Get comprehensive information about a voice"""
        
        if generic_id not in self.voice_mappings:
            # Try legacy resolution
            resolved_id = self._resolve_legacy_voice_id(generic_id)
            if resolved_id:
                generic_id = resolved_id
            else:
                return None
        
        mapping = self.voice_mappings[generic_id]
        
        return {
            "generic_id": mapping.generic_id,
            "display_name": mapping.display_name,
            "description": mapping.description,
            "characteristics": {
                "gender": mapping.gender.value,
                "age": mapping.age.value,
                "accent": mapping.accent.value,
                "style": mapping.style.value
            },
            "quality_score": mapping.quality_score,
            "engine_mappings": {
                "edge": mapping.edge_voice_id,
                "coqui": mapping.coqui_voice_id,
                "system": mapping.system_voice_id,
                "supabase": mapping.supabase_voice_id
            },
            "features": {
                "is_neural": mapping.is_neural,
                "supports_ssml": mapping.supports_ssml,
                "languages": mapping.languages
            }
        }
    
    def get_available_voices(self, engine: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get list of available voices, optionally filtered by engine"""
        
        voices = []
        
        for voice_id, mapping in self.voice_mappings.items():
            # Check if voice is available for the specified engine
            if engine:
                engine_voice_id = self.get_engine_voice_id(voice_id, engine)
                if not engine_voice_id:
                    continue
            
            voice_info = self.get_voice_info(voice_id)
            if voice_info:
                voices.append(voice_info)
        
        # Sort by quality score
        voices.sort(key=lambda x: x["quality_score"], reverse=True)
        
        return voices
    
    def get_recommended_voices_for_context(self, context: str, limit: int = 3) -> List[str]:
        """Get recommended voice IDs for a specific context"""
        
        context_lower = context.lower()
        
        # Context-specific recommendations
        context_recommendations = {
            "travel_planning": ["pam_travel_guide", "pam_female_energetic", "pam_female_friendly"],
            "budget_management": ["pam_financial_advisor", "pam_male_professional", "pam_female_professional"],
            "financial": ["pam_financial_advisor", "pam_male_professional", "pam_female_professional"],
            "emergency": ["pam_emergency", "pam_male_calm", "pam_male_professional"],
            "social_interaction": ["pam_female_friendly", "pam_male_friendly", "pam_female_energetic"],
            "professional": ["pam_female_professional", "pam_male_professional", "pam_british_female"],
            "casual": ["pam_female_friendly", "pam_male_friendly", "pam_female_energetic"],
            "general_conversation": ["pam_default", "pam_female_friendly", "pam_male_calm"]
        }
        
        if context_lower in context_recommendations:
            recommendations = context_recommendations[context_lower][:limit]
        else:
            # Fallback to highest quality voices
            recommendations = self.quality_rankings[:limit]
        
        logger.info(f"🎯 Recommended voices for {context}: {recommendations}")
        return recommendations
    
    def validate_voice_mapping(self, generic_id: str, engine: str) -> Tuple[bool, str]:
        """
        Validate that a voice mapping exists and is properly configured.
        
        Returns:
            Tuple of (is_valid, message)
        """
        
        if generic_id not in self.voice_mappings:
            resolved_id = self._resolve_legacy_voice_id(generic_id)
            if not resolved_id:
                return False, f"Generic voice ID '{generic_id}' not found in mapping database"
            generic_id = resolved_id
        
        engine_voice_id = self.get_engine_voice_id(generic_id, engine)
        if not engine_voice_id:
            return False, f"No {engine} voice mapping found for '{generic_id}'"
        
        return True, f"Valid mapping: {generic_id} -> {engine}:{engine_voice_id}"
    
    def get_mapping_stats(self) -> Dict[str, Any]:
        """Get statistics about the voice mapping system"""
        
        engine_counts = {"edge": 0, "coqui": 0, "system": 0, "supabase": 0}
        quality_distribution = {"high": 0, "medium": 0, "low": 0}
        characteristic_counts = {}
        
        for mapping in self.voice_mappings.values():
            # Count engine mappings
            if mapping.edge_voice_id:
                engine_counts["edge"] += 1
            if mapping.coqui_voice_id:
                engine_counts["coqui"] += 1
            if mapping.system_voice_id:
                engine_counts["system"] += 1
            if mapping.supabase_voice_id:
                engine_counts["supabase"] += 1
            
            # Quality distribution
            if mapping.quality_score >= 9.0:
                quality_distribution["high"] += 1
            elif mapping.quality_score >= 7.0:
                quality_distribution["medium"] += 1
            else:
                quality_distribution["low"] += 1
            
            # Characteristic counts
            for char in [mapping.gender.value, mapping.age.value, mapping.accent.value, mapping.style.value]:
                characteristic_counts[char] = characteristic_counts.get(char, 0) + 1
        
        return {
            "total_voices": len(self.voice_mappings),
            "engine_coverage": engine_counts,
            "quality_distribution": quality_distribution,
            "characteristic_distribution": characteristic_counts,
            "last_updated": datetime.utcnow().isoformat()
        }


# Global voice mapping service instance
voice_mapping_service = VoiceMappingService()


def get_voice_mapping_service() -> VoiceMappingService:
    """Get the global voice mapping service instance"""
    return voice_mapping_service