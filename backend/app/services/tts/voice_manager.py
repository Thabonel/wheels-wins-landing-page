"""
Voice Profile Management System
Manages user voice preferences, profiles, and personalization
"""

import asyncio
import json
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from dataclasses import asdict
import logging

from .base_tts import (
    VoiceProfile, VoiceSettings, VoiceStyle, TTSEngine, AudioFormat
)
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

class VoicePersonalization:
    """Handles voice personalization and user preferences"""
    
    def __init__(self):
        # In-memory storage for demo - in production use database
        self.user_voice_profiles: Dict[str, Dict[str, Any]] = {}
        self.usage_analytics: Dict[str, List[Dict[str, Any]]] = {}
        self.voice_ratings: Dict[str, Dict[str, float]] = {}
        
        # Default voice profiles for different contexts using Coqui TTS
        self.context_profiles = {
            "casual": VoiceProfile(
                voice_id="p225",
                name="Emma (Casual)",
                gender="female",
                age="young",
                accent="british",
                engine=TTSEngine.COQUI,
                settings=VoiceSettings(
                    stability=0.8,
                    similarity_boost=0.75,
                    speed=1.1,
                    pitch=1.0,
                    volume=1.0,
                    style=VoiceStyle.CASUAL
                )
            ),
            "professional": VoiceProfile(
                voice_id="p228",
                name="James (Professional)",
                gender="male",
                age="middle",
                accent="british",
                engine=TTSEngine.COQUI,
                settings=VoiceSettings(
                    stability=0.9,
                    similarity_boost=0.8,
                    speed=0.95,
                    pitch=0.95,
                    volume=1.0,
                    style=VoiceStyle.PROFESSIONAL
                )
            ),
            "energetic": VoiceProfile(
                voice_id="p229",
                name="Sophie (Energetic)",
                gender="female",
                age="young",
                accent="british",
                engine=TTSEngine.COQUI,
                settings=VoiceSettings(
                    stability=0.7,
                    similarity_boost=0.8,
                    speed=1.2,
                    pitch=1.1,
                    volume=1.0,
                    style=VoiceStyle.ENERGETIC
                )
            ),
            "calm": VoiceProfile(
                voice_id="p232",
                name="David (Calm)",
                gender="male",
                age="middle",
                accent="american",
                engine=TTSEngine.COQUI,
                settings=VoiceSettings(
                    stability=0.95,
                    similarity_boost=0.7,
                    speed=0.9,
                    pitch=0.9,
                    volume=0.9,
                    style=VoiceStyle.CALM
                )
            )
        }
        
        # PAM context-specific voice mapping
        self.pam_context_voices = {
            "travel_planning": "professional",
            "budget_management": "professional", 
            "social_interaction": "casual",
            "emergency_assistance": "calm",
            "entertainment": "energetic",
            "general_conversation": "casual"
        }
    
    async def get_user_voice_profile(
        self, 
        user_id: str, 
        context: str = "general_conversation"
    ) -> VoiceProfile:
        """Get the best voice profile for a user and context"""
        
        # Check if user has custom preferences
        if user_id in self.user_voice_profiles:
            user_prefs = self.user_voice_profiles[user_id]
            
            # Check for context-specific preference
            if context in user_prefs.get("context_preferences", {}):
                profile_data = user_prefs["context_preferences"][context]
                return self._dict_to_voice_profile(profile_data)
            
            # Use default user preference
            if "default_profile" in user_prefs:
                profile_data = user_prefs["default_profile"]
                return self._dict_to_voice_profile(profile_data)
        
        # Use context-based default
        context_key = self.pam_context_voices.get(context, "casual")
        return self.context_profiles[context_key]
    
    async def set_user_voice_preference(
        self,
        user_id: str,
        voice_profile: VoiceProfile,
        context: Optional[str] = None,
        is_default: bool = False
    ):
        """Set user voice preference"""
        
        if user_id not in self.user_voice_profiles:
            self.user_voice_profiles[user_id] = {
                "created_at": datetime.utcnow().isoformat(),
                "context_preferences": {},
                "usage_history": []
            }
        
        user_prefs = self.user_voice_profiles[user_id]
        profile_data = asdict(voice_profile)
        
        if context:
            user_prefs["context_preferences"][context] = profile_data
        
        if is_default:
            user_prefs["default_profile"] = profile_data
        
        user_prefs["last_updated"] = datetime.utcnow().isoformat()
        
        logger.info(f"📝 Updated voice preference for user {user_id}, context: {context}")
    
    async def rate_voice_interaction(
        self,
        user_id: str,
        voice_profile: VoiceProfile,
        rating: float,  # 1.0 - 5.0
        feedback: Optional[str] = None
    ):
        """Rate a voice interaction for learning"""
        
        voice_key = f"{voice_profile.engine.value}:{voice_profile.voice_id}"
        
        if user_id not in self.voice_ratings:
            self.voice_ratings[user_id] = {}
        
        if voice_key not in self.voice_ratings[user_id]:
            self.voice_ratings[user_id][voice_key] = []
        
        rating_data = {
            "rating": rating,
            "feedback": feedback,
            "timestamp": datetime.utcnow().isoformat(),
            "voice_profile": asdict(voice_profile)
        }
        
        self.voice_ratings[user_id][voice_key].append(rating_data)
        
        # Learn from ratings to improve recommendations
        await self._learn_from_rating(user_id, voice_profile, rating)
        
        logger.info(f"⭐ Voice rating recorded: {rating}/5.0 for {voice_key}")
    
    async def _learn_from_rating(
        self,
        user_id: str,
        voice_profile: VoiceProfile,
        rating: float
    ):
        """Learn from user ratings to improve voice selection"""
        
        # If rating is high (4+), consider this voice for similar contexts
        if rating >= 4.0:
            # This would implement ML-based learning in production
            # For now, just log the positive feedback
            logger.info(f"🎯 Positive voice feedback for user {user_id}: {voice_profile.name}")
        
        # If rating is low (2-), avoid similar voice characteristics
        elif rating <= 2.0:
            logger.info(f"⚠️ Negative voice feedback for user {user_id}: {voice_profile.name}")
    
    async def get_recommended_voices(
        self,
        user_id: str,
        context: str,
        available_voices: List[VoiceProfile],
        limit: int = 5
    ) -> List[VoiceProfile]:
        """Get personalized voice recommendations"""
        
        # Start with available voices
        recommendations = []
        
        # Get user's rating history
        user_ratings = self.voice_ratings.get(user_id, {})
        
        # Score voices based on user history and context
        scored_voices = []
        for voice in available_voices:
            voice_key = f"{voice.engine.value}:{voice.voice_id}"
            
            # Base score from context appropriateness
            context_score = self._get_context_score(voice, context)
            
            # User preference score
            user_score = self._get_user_preference_score(user_id, voice, user_ratings)
            
            # Combine scores
            total_score = (context_score * 0.6) + (user_score * 0.4)
            
            scored_voices.append({
                "voice": voice,
                "score": total_score,
                "context_score": context_score,
                "user_score": user_score
            })
        
        # Sort by score and return top recommendations
        scored_voices.sort(key=lambda x: x["score"], reverse=True)
        recommendations = [item["voice"] for item in scored_voices[:limit]]
        
        return recommendations
    
    def _get_context_score(self, voice: VoiceProfile, context: str) -> float:
        """Score voice appropriateness for context"""
        
        context_preferences = {
            "travel_planning": {
                "preferred_styles": [VoiceStyle.PROFESSIONAL, VoiceStyle.FRIENDLY],
                "preferred_gender": None,
                "preferred_age": ["middle", "young"]
            },
            "budget_management": {
                "preferred_styles": [VoiceStyle.PROFESSIONAL, VoiceStyle.AUTHORITATIVE],
                "preferred_gender": None,
                "preferred_age": ["middle"]
            },
            "social_interaction": {
                "preferred_styles": [VoiceStyle.CASUAL, VoiceStyle.FRIENDLY],
                "preferred_gender": None,
                "preferred_age": ["young", "middle"]
            },
            "emergency_assistance": {
                "preferred_styles": [VoiceStyle.CALM, VoiceStyle.AUTHORITATIVE],
                "preferred_gender": None,
                "preferred_age": ["middle"]
            }
        }
        
        if context not in context_preferences:
            return 0.5  # Neutral score for unknown contexts
        
        prefs = context_preferences[context]
        score = 0.5  # Base score
        
        # Style match
        if voice.settings.style in prefs["preferred_styles"]:
            score += 0.3
        
        # Age match
        if voice.age in prefs["preferred_age"]:
            score += 0.2
        
        return min(score, 1.0)
    
    def _get_user_preference_score(
        self,
        user_id: str,
        voice: VoiceProfile,
        user_ratings: Dict[str, List[Dict[str, Any]]]
    ) -> float:
        """Score voice based on user's historical preferences"""
        
        voice_key = f"{voice.engine.value}:{voice.voice_id}"
        
        # Direct rating for this voice
        if voice_key in user_ratings:
            ratings = [r["rating"] for r in user_ratings[voice_key]]
            avg_rating = sum(ratings) / len(ratings)
            return avg_rating / 5.0  # Normalize to 0-1
        
        # Similarity to rated voices
        similarity_scores = []
        for rated_voice_key, ratings in user_ratings.items():
            avg_rating = sum(r["rating"] for r in ratings) / len(ratings)
            
            # Calculate similarity (simplified)
            similarity = self._calculate_voice_similarity(voice, rated_voice_key, ratings[0]["voice_profile"])
            weighted_score = similarity * (avg_rating / 5.0)
            similarity_scores.append(weighted_score)
        
        if similarity_scores:
            return sum(similarity_scores) / len(similarity_scores)
        
        return 0.5  # Neutral score for new users
    
    def _calculate_voice_similarity(
        self,
        voice1: VoiceProfile,
        voice2_key: str,
        voice2_data: Dict[str, Any]
    ) -> float:
        """Calculate similarity between two voices"""
        
        # Simple similarity based on characteristics
        similarity = 0.5  # Base similarity
        
        # Gender match
        if voice1.gender == voice2_data.get("gender"):
            similarity += 0.2
        
        # Age match
        if voice1.age == voice2_data.get("age"):
            similarity += 0.2
        
        # Accent match
        if voice1.accent == voice2_data.get("accent"):
            similarity += 0.1
        
        return min(similarity, 1.0)
    
    def _dict_to_voice_profile(self, profile_data: Dict[str, Any]) -> VoiceProfile:
        """Convert dictionary to VoiceProfile object"""
        
        settings_data = profile_data.get("settings", {})
        settings = VoiceSettings(
            stability=settings_data.get("stability", 0.75),
            similarity_boost=settings_data.get("similarity_boost", 0.75),
            speed=settings_data.get("speed", 1.0),
            pitch=settings_data.get("pitch", 1.0),
            volume=settings_data.get("volume", 1.0),
            style=VoiceStyle(settings_data.get("style", "friendly"))
        )
        
        return VoiceProfile(
            voice_id=profile_data["voice_id"],
            name=profile_data["name"],
            gender=profile_data["gender"],
            age=profile_data["age"],
            accent=profile_data["accent"],
            language=profile_data.get("language", "en"),
            engine=TTSEngine(profile_data["engine"]),
            settings=settings
        )
    
    async def get_user_analytics(self, user_id: str) -> Dict[str, Any]:
        """Get voice usage analytics for a user"""
        
        analytics = {
            "user_id": user_id,
            "total_interactions": 0,
            "favorite_voices": [],
            "context_usage": {},
            "average_rating": 0.0,
            "preferences_set": user_id in self.user_voice_profiles
        }
        
        # Usage history
        if user_id in self.usage_analytics:
            analytics["total_interactions"] = len(self.usage_analytics[user_id])
            
            # Context breakdown
            for interaction in self.usage_analytics[user_id]:
                context = interaction.get("context", "unknown")
                analytics["context_usage"][context] = analytics["context_usage"].get(context, 0) + 1
        
        # Ratings analysis
        if user_id in self.voice_ratings:
            all_ratings = []
            voice_ratings = {}
            
            for voice_key, ratings in self.voice_ratings[user_id].items():
                voice_avg = sum(r["rating"] for r in ratings) / len(ratings)
                voice_ratings[voice_key] = {
                    "average_rating": voice_avg,
                    "total_ratings": len(ratings),
                    "voice_name": ratings[0]["voice_profile"]["name"]
                }
                all_ratings.extend(r["rating"] for r in ratings)
            
            if all_ratings:
                analytics["average_rating"] = sum(all_ratings) / len(all_ratings)
            
            # Top voices
            sorted_voices = sorted(
                voice_ratings.items(),
                key=lambda x: (x[1]["average_rating"], x[1]["total_ratings"]),
                reverse=True
            )
            analytics["favorite_voices"] = [
                {
                    "voice_key": voice_key,
                    "name": data["voice_name"],
                    "rating": data["average_rating"],
                    "uses": data["total_ratings"]
                }
                for voice_key, data in sorted_voices[:5]
            ]
        
        return analytics
    
    async def log_voice_usage(
        self,
        user_id: str,
        voice_profile: VoiceProfile,
        context: str,
        text_length: int,
        generation_time_ms: int
    ):
        """Log voice usage for analytics"""
        
        if user_id not in self.usage_analytics:
            self.usage_analytics[user_id] = []
        
        usage_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "voice_id": voice_profile.voice_id,
            "voice_name": voice_profile.name,
            "engine": voice_profile.engine.value,
            "context": context,
            "text_length": text_length,
            "generation_time_ms": generation_time_ms
        }
        
        self.usage_analytics[user_id].append(usage_entry)
        
        # Keep only last 100 entries per user
        if len(self.usage_analytics[user_id]) > 100:
            self.usage_analytics[user_id] = self.usage_analytics[user_id][-100:]

# Global voice manager instance
voice_manager = VoicePersonalization()