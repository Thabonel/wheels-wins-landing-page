"""
PAM Advanced Personalization and Adaptation System
Implements sophisticated personalization using machine learning, behavioral analysis,
and adaptive user modeling for highly personalized experiences.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Union
from dataclasses import dataclass, asdict
from enum import Enum
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.ensemble import RandomForestClassifier
import openai
from openai import AsyncOpenAI
from collections import defaultdict, deque
import pickle
import hashlib

from app.core.config import get_settings
from app.services.database import get_database
from app.services.embeddings import VectorEmbeddingService
from app.ai.continuous_learning import learning_system, FeedbackType
from app.ai.emotional_intelligence import emotional_intelligence

settings = get_settings()
logger = logging.getLogger(__name__)
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

class PersonalizationDimension(Enum):
    """Dimensions of personalization"""
    COMMUNICATION_STYLE = "communication_style"
    CONTENT_PREFERENCE = "content_preference"
    INTERACTION_TIMING = "interaction_timing"
    COMPLEXITY_LEVEL = "complexity_level"
    EMOTIONAL_TONE = "emotional_tone"
    RESPONSE_LENGTH = "response_length"
    DOMAIN_INTEREST = "domain_interest"
    LEARNING_STYLE = "learning_style"
    SUPPORT_PREFERENCE = "support_preference"

class AdaptationStrategy(Enum):
    """Strategies for adaptation"""
    IMMEDIATE = "immediate"
    GRADUAL = "gradual"
    CONTEXTUAL = "contextual"
    PREDICTIVE = "predictive"
    COLLABORATIVE = "collaborative"

class PersonalizationConfidence(Enum):
    """Confidence levels for personalization decisions"""
    VERY_LOW = 0.1
    LOW = 0.3
    MODERATE = 0.5
    HIGH = 0.7
    VERY_HIGH = 0.9

@dataclass
class UserBehaviorPattern:
    """Represents a user behavior pattern"""
    pattern_id: str
    user_id: str
    pattern_type: str
    frequency: int
    context_triggers: List[str]
    behavioral_indicators: Dict[str, float]
    temporal_patterns: Dict[str, Any]
    confidence: float
    last_observed: datetime

@dataclass
class PersonalizationProfile:
    """Comprehensive user personalization profile"""
    user_id: str
    preferences: Dict[PersonalizationDimension, Any]
    behavioral_patterns: List[UserBehaviorPattern]
    adaptation_history: List[Dict[str, Any]]
    personality_traits: Dict[str, float]
    contextual_preferences: Dict[str, Dict[str, Any]]
    learning_trajectory: Dict[str, float]
    interaction_style_evolution: List[Dict[str, Any]]
    last_updated: datetime
    profile_confidence: float

@dataclass
class PersonalizedResponse:
    """Personalized response with adaptation metadata"""
    response_id: str
    user_id: str
    original_response: str
    personalized_response: str
    personalization_applied: List[str]
    adaptation_confidence: float
    personalization_reasoning: str
    context_factors: Dict[str, Any]
    performance_prediction: float
    generated_at: datetime

@dataclass
class AdaptationDecision:
    """Decision about how to adapt interaction"""
    decision_id: str
    user_id: str
    dimension: PersonalizationDimension
    current_value: Any
    proposed_value: Any
    adaptation_rationale: str
    confidence: float
    expected_impact: float
    adaptation_strategy: AdaptationStrategy
    context: Dict[str, Any]

class PAMAdvancedPersonalizationSystem:
    """
    Advanced personalization and adaptation system for PAM.
    
    Features:
    - Multi-dimensional user profiling
    - Behavioral pattern recognition and prediction
    - Adaptive interaction strategies
    - Real-time personalization decisions
    - Cross-session learning and adaptation
    - Contextual preference modeling
    - Personality-based customization
    - Performance-driven optimization
    """
    
    def __init__(self):
        self.db = get_database()
        self.embedding_service = VectorEmbeddingService()
        self.user_profiles = {}
        self.behavior_patterns = defaultdict(list)
        self.adaptation_queue = deque(maxlen=1000)
        
        # Machine learning models
        self.personality_classifier = None
        self.preference_predictor = None
        self.behavior_clusterer = None
        self.scaler = StandardScaler()
        
        # Personalization configuration
        self.min_interactions_for_personalization = 5
        self.adaptation_learning_rate = 0.1
        self.personality_update_threshold = 0.3
        self.behavioral_pattern_min_frequency = 3
        
        # Personalization dimensions and their possible values
        self.dimension_values = {
            PersonalizationDimension.COMMUNICATION_STYLE: ["formal", "casual", "friendly", "professional", "empathetic"],
            PersonalizationDimension.RESPONSE_LENGTH: ["brief", "moderate", "detailed", "comprehensive"],
            PersonalizationDimension.COMPLEXITY_LEVEL: ["simple", "intermediate", "advanced", "expert"],
            PersonalizationDimension.EMOTIONAL_TONE: ["neutral", "warm", "encouraging", "supportive", "analytical"],
            PersonalizationDimension.LEARNING_STYLE: ["visual", "auditory", "kinesthetic", "analytical", "social"]
        }
        
        # Initialize models
        asyncio.create_task(self._initialize_personalization_models())
    
    async def _initialize_personalization_models(self):
        """Initialize machine learning models for personalization"""
        try:
            # Load existing models or create new ones
            await self._load_personalization_models()
            
            # Initialize user profiles from database
            await self._load_user_profiles()
            
            logger.info("Advanced personalization system initialized")
            
        except Exception as e:
            logger.error(f"Error initializing personalization models: {e}")
    
    async def analyze_user_behavior(
        self,
        user_id: str,
        interaction_data: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> UserBehaviorPattern:
        """
        Analyze user behavior from interaction data.
        
        Args:
            user_id: User identifier
            interaction_data: Data about the interaction
            context: Additional context information
            
        Returns:
            Identified behavior pattern
        """
        try:
            # Extract behavioral indicators
            behavioral_indicators = await self._extract_behavioral_indicators(
                interaction_data, context
            )
            
            # Identify pattern type
            pattern_type = await self._classify_behavior_pattern(behavioral_indicators)
            
            # Extract temporal patterns
            temporal_patterns = await self._analyze_temporal_patterns(
                user_id, interaction_data
            )
            
            # Calculate pattern confidence
            confidence = self._calculate_pattern_confidence(
                behavioral_indicators, temporal_patterns
            )
            
            # Create behavior pattern
            pattern_id = f"pattern_{user_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
            
            behavior_pattern = UserBehaviorPattern(
                pattern_id=pattern_id,
                user_id=user_id,
                pattern_type=pattern_type,
                frequency=1,  # Will be updated as pattern is observed more
                context_triggers=list(context.keys()) if context else [],
                behavioral_indicators=behavioral_indicators,
                temporal_patterns=temporal_patterns,
                confidence=confidence,
                last_observed=datetime.utcnow()
            )
            
            # Update user's behavioral patterns
            await self._update_user_behavioral_patterns(user_id, behavior_pattern)
            
            return behavior_pattern
            
        except Exception as e:
            logger.error(f"Error analyzing user behavior: {e}")
            return self._create_default_behavior_pattern(user_id)
    
    async def generate_personalized_response(
        self,
        user_id: str,
        base_response: str,
        context: Optional[Dict[str, Any]] = None,
        adaptation_constraints: Optional[List[str]] = None
    ) -> PersonalizedResponse:
        """
        Generate personalized response based on user profile.
        
        Args:
            user_id: User identifier
            base_response: Original response to personalize
            context: Interaction context
            adaptation_constraints: Constraints on adaptation
            
        Returns:
            Personalized response with metadata
        """
        try:
            response_id = f"personalized_{user_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
            
            # Get user personalization profile
            profile = await self._get_personalization_profile(user_id)
            if not profile:
                # Create initial profile if none exists
                profile = await self._create_initial_profile(user_id)
            
            # Determine personalization adaptations needed
            adaptations = await self._determine_personalizations(
                profile, base_response, context, adaptation_constraints
            )
            
            # Apply personalizations
            personalized_response = await self._apply_personalizations(
                base_response, adaptations, profile
            )
            
            # Generate personalization reasoning
            reasoning = await self._generate_personalization_reasoning(
                adaptations, profile, context
            )
            
            # Calculate adaptation confidence
            adaptation_confidence = self._calculate_adaptation_confidence(adaptations)
            
            # Predict performance
            performance_prediction = await self._predict_response_performance(
                personalized_response, profile, context
            )
            
            # Extract context factors
            context_factors = {
                "time_of_day": context.get("time_of_day") if context else "unknown",
                "conversation_length": context.get("conversation_length", 0) if context else 0,
                "user_mood": context.get("user_mood") if context else "neutral",
                "domain": context.get("domain") if context else "general"
            }
            
            personalized_resp = PersonalizedResponse(
                response_id=response_id,
                user_id=user_id,
                original_response=base_response,
                personalized_response=personalized_response,
                personalization_applied=[a["type"] for a in adaptations],
                adaptation_confidence=adaptation_confidence,
                personalization_reasoning=reasoning,
                context_factors=context_factors,
                performance_prediction=performance_prediction,
                generated_at=datetime.utcnow()
            )
            
            # Store personalized response for learning
            await self._store_personalized_response(personalized_resp)
            
            return personalized_resp
            
        except Exception as e:
            logger.error(f"Error generating personalized response: {e}")
            return self._create_fallback_personalized_response(user_id, base_response)
    
    async def adapt_user_experience(
        self,
        user_id: str,
        feedback_data: Dict[str, Any],
        adaptation_strategy: AdaptationStrategy = AdaptationStrategy.GRADUAL
    ) -> List[AdaptationDecision]:
        """
        Adapt user experience based on feedback and performance data.
        
        Args:
            user_id: User identifier
            feedback_data: User feedback and performance metrics
            adaptation_strategy: Strategy for making adaptations
            
        Returns:
            List of adaptation decisions made
        """
        try:
            profile = await self._get_personalization_profile(user_id)
            if not profile:
                return []
            
            adaptation_decisions = []
            
            # Analyze performance metrics
            performance_analysis = await self._analyze_performance_metrics(
                user_id, feedback_data
            )
            
            # Identify adaptation opportunities
            adaptation_opportunities = await self._identify_adaptation_opportunities(
                profile, performance_analysis, adaptation_strategy
            )
            
            # Make adaptation decisions
            for opportunity in adaptation_opportunities:
                decision = await self._make_adaptation_decision(
                    profile, opportunity, adaptation_strategy
                )
                
                if decision and decision.confidence > 0.6:
                    adaptation_decisions.append(decision)
                    
                    # Apply adaptation to profile
                    await self._apply_adaptation_to_profile(profile, decision)
            
            # Update user profile with adaptations
            if adaptation_decisions:
                await self._update_personalization_profile(profile)
            
            return adaptation_decisions
            
        except Exception as e:
            logger.error(f"Error adapting user experience: {e}")
            return []
    
    async def predict_user_preferences(
        self,
        user_id: str,
        context: Optional[Dict[str, Any]] = None,
        prediction_horizon: str = "short_term"
    ) -> Dict[str, Any]:
        """
        Predict user preferences based on historical data and context.
        
        Args:
            user_id: User identifier
            context: Current context
            prediction_horizon: Time horizon for predictions (short_term, long_term)
            
        Returns:
            Predicted preferences and confidence scores
        """
        try:
            profile = await self._get_personalization_profile(user_id)
            if not profile:
                return {"error": "No profile available for predictions"}
            
            # Get historical interaction data
            historical_data = await self._get_user_interaction_history(
                user_id, lookback_days=30 if prediction_horizon == "short_term" else 90
            )
            
            # Extract features for prediction
            features = await self._extract_prediction_features(
                profile, historical_data, context
            )
            
            # Make predictions for each dimension
            predictions = {}
            for dimension in PersonalizationDimension:
                if dimension in profile.preferences:
                    prediction = await self._predict_preference_dimension(
                        dimension, features, profile
                    )
                    predictions[dimension.value] = prediction
            
            # Predict emerging preferences
            emerging_preferences = await self._predict_emerging_preferences(
                features, profile, context
            )
            
            # Calculate overall prediction confidence
            overall_confidence = np.mean([
                pred.get("confidence", 0.5) for pred in predictions.values()
            ]) if predictions else 0.5
            
            return {
                "user_id": user_id,
                "predictions": predictions,
                "emerging_preferences": emerging_preferences,
                "overall_confidence": float(overall_confidence),
                "prediction_horizon": prediction_horizon,
                "context_influence": await self._assess_context_influence(context, predictions),
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error predicting user preferences: {e}")
            return {"error": "Failed to predict user preferences"}
    
    async def get_personalization_insights(
        self,
        user_id: str,
        insight_types: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Get insights about user's personalization profile and trends.
        
        Args:
            user_id: User identifier
            insight_types: Types of insights to generate
            
        Returns:
            Comprehensive personalization insights
        """
        try:
            profile = await self._get_personalization_profile(user_id)
            if not profile:
                return {"error": "No personalization profile available"}
            
            insights = {
                "user_id": user_id,
                "profile_maturity": self._calculate_profile_maturity(profile),
                "personalization_effectiveness": await self._calculate_personalization_effectiveness(user_id),
                "behavioral_consistency": self._analyze_behavioral_consistency(profile),
                "adaptation_responsiveness": await self._analyze_adaptation_responsiveness(user_id),
                "preference_stability": self._analyze_preference_stability(profile),
                "context_sensitivity": await self._analyze_context_sensitivity(user_id),
                "recommendations": await self._generate_personalization_recommendations(profile)
            }
            
            # Add specific insight types if requested
            if insight_types:
                for insight_type in insight_types:
                    if insight_type == "personality_analysis":
                        insights["personality_analysis"] = await self._analyze_personality_traits(profile)
                    elif insight_type == "learning_progression":
                        insights["learning_progression"] = await self._analyze_learning_progression(user_id)
                    elif insight_type == "interaction_patterns":
                        insights["interaction_patterns"] = await self._analyze_interaction_patterns(user_id)
            
            return insights
            
        except Exception as e:
            logger.error(f"Error getting personalization insights: {e}")
            return {"error": "Failed to generate personalization insights"}
    
    # Private methods for personalization implementation
    
    async def _extract_behavioral_indicators(
        self,
        interaction_data: Dict[str, Any],
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, float]:
        """Extract behavioral indicators from interaction data"""
        indicators = {}
        
        # Response time indicators
        if "response_time" in interaction_data:
            response_time = interaction_data["response_time"]
            indicators["quick_responder"] = 1.0 if response_time < 2.0 else 0.0
            indicators["thoughtful_responder"] = 1.0 if response_time > 10.0 else 0.0
        
        # Message length indicators
        if "message_length" in interaction_data:
            msg_length = interaction_data["message_length"]
            indicators["concise_communicator"] = 1.0 if msg_length < 50 else 0.0
            indicators["detailed_communicator"] = 1.0 if msg_length > 200 else 0.0
        
        # Interaction frequency
        if "session_length" in interaction_data:
            session_length = interaction_data["session_length"]
            indicators["engaged_user"] = min(1.0, session_length / 300.0)  # Normalize to 5 minutes
        
        # Question types
        if "question_types" in interaction_data:
            q_types = interaction_data["question_types"]
            indicators["analytical_questions"] = q_types.count("analytical") / len(q_types) if q_types else 0.0
            indicators["practical_questions"] = q_types.count("practical") / len(q_types) if q_types else 0.0
        
        # Emotional indicators (if available)
        if "emotional_state" in interaction_data:
            emotional_state = interaction_data["emotional_state"]
            indicators["emotional_expressiveness"] = emotional_state.get("intensity", 0.5)
            indicators["positive_sentiment"] = 1.0 if emotional_state.get("primary_emotion") in ["joy", "excitement", "gratitude"] else 0.0
        
        return indicators
    
    async def _classify_behavior_pattern(self, behavioral_indicators: Dict[str, float]) -> str:
        """Classify the type of behavior pattern"""
        # Simple classification based on dominant indicators
        if behavioral_indicators.get("analytical_questions", 0) > 0.6:
            return "analytical_user"
        elif behavioral_indicators.get("quick_responder", 0) > 0.7:
            return "rapid_fire_user"
        elif behavioral_indicators.get("detailed_communicator", 0) > 0.7:
            return "thorough_communicator"
        elif behavioral_indicators.get("engaged_user", 0) > 0.8:
            return "highly_engaged_user"
        elif behavioral_indicators.get("emotional_expressiveness", 0) > 0.7:
            return "emotionally_expressive_user"
        else:
            return "balanced_user"
    
    async def _determine_personalizations(
        self,
        profile: PersonalizationProfile,
        base_response: str,
        context: Optional[Dict[str, Any]],
        constraints: Optional[List[str]]
    ) -> List[Dict[str, Any]]:
        """Determine what personalizations to apply"""
        adaptations = []
        
        # Communication style adaptation
        if PersonalizationDimension.COMMUNICATION_STYLE in profile.preferences:
            style = profile.preferences[PersonalizationDimension.COMMUNICATION_STYLE]
            if style != "neutral":
                adaptations.append({
                    "type": "communication_style",
                    "value": style,
                    "confidence": profile.profile_confidence
                })
        
        # Response length adaptation
        if PersonalizationDimension.RESPONSE_LENGTH in profile.preferences:
            length_pref = profile.preferences[PersonalizationDimension.RESPONSE_LENGTH]
            current_length = len(base_response.split())
            
            if length_pref == "brief" and current_length > 50:
                adaptations.append({
                    "type": "response_length",
                    "value": "brief",
                    "confidence": profile.profile_confidence
                })
            elif length_pref == "detailed" and current_length < 30:
                adaptations.append({
                    "type": "response_length",
                    "value": "detailed",
                    "confidence": profile.profile_confidence
                })
        
        # Emotional tone adaptation
        if PersonalizationDimension.EMOTIONAL_TONE in profile.preferences:
            tone = profile.preferences[PersonalizationDimension.EMOTIONAL_TONE]
            if tone != "neutral":
                adaptations.append({
                    "type": "emotional_tone",
                    "value": tone,
                    "confidence": profile.profile_confidence
                })
        
        # Complexity level adaptation
        if PersonalizationDimension.COMPLEXITY_LEVEL in profile.preferences:
            complexity = profile.preferences[PersonalizationDimension.COMPLEXITY_LEVEL]
            adaptations.append({
                "type": "complexity_level",
                "value": complexity,
                "confidence": profile.profile_confidence
            })
        
        # Filter out adaptations that conflict with constraints
        if constraints:
            adaptations = [a for a in adaptations if a["type"] not in constraints]
        
        return adaptations
    
    async def _apply_personalizations(
        self,
        base_response: str,
        adaptations: List[Dict[str, Any]],
        profile: PersonalizationProfile
    ) -> str:
        """Apply personalization adaptations to the response"""
        try:
            if not adaptations:
                return base_response
            
            # Create personalization prompt
            adaptation_instructions = []
            for adaptation in adaptations:
                if adaptation["type"] == "communication_style":
                    style = adaptation["value"]
                    if style == "casual":
                        adaptation_instructions.append("Make the response more casual and conversational")
                    elif style == "formal":
                        adaptation_instructions.append("Make the response more formal and professional")
                    elif style == "friendly":
                        adaptation_instructions.append("Make the response more warm and friendly")
                
                elif adaptation["type"] == "response_length":
                    if adaptation["value"] == "brief":
                        adaptation_instructions.append("Make the response concise and to the point")
                    elif adaptation["value"] == "detailed":
                        adaptation_instructions.append("Provide more detail and elaboration")
                
                elif adaptation["type"] == "emotional_tone":
                    tone = adaptation["value"]
                    if tone == "encouraging":
                        adaptation_instructions.append("Make the response more encouraging and supportive")
                    elif tone == "analytical":
                        adaptation_instructions.append("Make the response more analytical and objective")
                
                elif adaptation["type"] == "complexity_level":
                    level = adaptation["value"]
                    if level == "simple":
                        adaptation_instructions.append("Simplify the language and concepts")
                    elif level == "advanced":
                        adaptation_instructions.append("Use more sophisticated language and concepts")
            
            if not adaptation_instructions:
                return base_response
            
            # Apply personalizations using AI
            personalization_prompt = f"""
            Original response: "{base_response}"
            
            Please adapt this response with the following personalizations:
            {chr(10).join(f"- {instruction}" for instruction in adaptation_instructions)}
            
            Keep the core information intact while applying the personalizations.
            """
            
            response = await client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert at personalizing responses while maintaining their core message."},
                    {"role": "user", "content": personalization_prompt}
                ],
                temperature=0.3,
                max_tokens=1000
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"Error applying personalizations: {e}")
            return base_response
    
    def _calculate_adaptation_confidence(self, adaptations: List[Dict[str, Any]]) -> float:
        """Calculate confidence in the adaptations made"""
        if not adaptations:
            return 0.5
        
        confidences = [a.get("confidence", 0.5) for a in adaptations]
        return float(np.mean(confidences))
    
    async def _create_initial_profile(self, user_id: str) -> PersonalizationProfile:
        """Create initial personalization profile for new user"""
        return PersonalizationProfile(
            user_id=user_id,
            preferences={},
            behavioral_patterns=[],
            adaptation_history=[],
            personality_traits={},
            contextual_preferences={},
            learning_trajectory={},
            interaction_style_evolution=[],
            last_updated=datetime.utcnow(),
            profile_confidence=0.1
        )
    
    def _create_fallback_personalized_response(self, user_id: str, base_response: str) -> PersonalizedResponse:
        """Create fallback personalized response"""
        return PersonalizedResponse(
            response_id=f"fallback_{user_id}_{datetime.utcnow().timestamp()}",
            user_id=user_id,
            original_response=base_response,
            personalized_response=base_response,
            personalization_applied=[],
            adaptation_confidence=0.0,
            personalization_reasoning="No personalization applied due to system error",
            context_factors={},
            performance_prediction=0.5,
            generated_at=datetime.utcnow()
        )
    
    async def _store_personalized_response(self, response: PersonalizedResponse):
        """Store personalized response in database"""
        try:
            query = """
            INSERT INTO pam_personalized_responses (
                response_id, user_id, original_response, personalized_response,
                personalization_applied, adaptation_confidence, personalization_reasoning,
                context_factors, performance_prediction, generated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            """
            
            await self.db.execute(
                query,
                response.response_id,
                response.user_id,
                response.original_response,
                response.personalized_response,
                json.dumps(response.personalization_applied),
                response.adaptation_confidence,
                response.personalization_reasoning,
                json.dumps(response.context_factors),
                response.performance_prediction,
                response.generated_at
            )
            
        except Exception as e:
            logger.error(f"Error storing personalized response: {e}")


# Global personalization system instance
personalization_system = PAMAdvancedPersonalizationSystem()

# Utility functions for easy integration

async def personalize_response(
    user_id: str,
    base_response: str,
    context: Optional[Dict[str, Any]] = None,
    constraints: Optional[List[str]] = None
) -> PersonalizedResponse:
    """Convenience function for response personalization"""
    return await personalization_system.generate_personalized_response(
        user_id=user_id,
        base_response=base_response,
        context=context,
        adaptation_constraints=constraints
    )

async def analyze_behavior(
    user_id: str,
    interaction_data: Dict[str, Any],
    context: Optional[Dict[str, Any]] = None
) -> UserBehaviorPattern:
    """Convenience function for behavior analysis"""
    return await personalization_system.analyze_user_behavior(
        user_id=user_id,
        interaction_data=interaction_data,
        context=context
    )

async def adapt_experience(
    user_id: str,
    feedback_data: Dict[str, Any],
    strategy: str = "gradual"
) -> List[AdaptationDecision]:
    """Convenience function for experience adaptation"""
    adaptation_strategy = AdaptationStrategy(strategy)
    return await personalization_system.adapt_user_experience(
        user_id=user_id,
        feedback_data=feedback_data,
        adaptation_strategy=adaptation_strategy
    )

async def predict_preferences(
    user_id: str,
    context: Optional[Dict[str, Any]] = None,
    horizon: str = "short_term"
) -> Dict[str, Any]:
    """Convenience function for preference prediction"""
    return await personalization_system.predict_user_preferences(
        user_id=user_id,
        context=context,
        prediction_horizon=horizon
    )