"""
PAM Continuous Learning System
Implements advanced machine learning capabilities for continuous improvement
from user interactions and feedback.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from enum import Enum
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
from sklearn.metrics.pairwise import cosine_similarity
from collections import defaultdict, deque
import pickle
import hashlib

from app.core.config import get_settings
from app.services.database import get_database
from app.services.embeddings import VectorEmbeddingService

settings = get_settings()
logger = logging.getLogger(__name__)

class LearningType(Enum):
    """Types of learning PAM can perform"""
    CONVERSATIONAL_PATTERNS = "conversational_patterns"
    USER_PREFERENCES = "user_preferences"
    RESPONSE_EFFECTIVENESS = "response_effectiveness"
    DOMAIN_KNOWLEDGE = "domain_knowledge"
    ERROR_CORRECTION = "error_correction"

class FeedbackType(Enum):
    """Types of user feedback"""
    EXPLICIT_POSITIVE = "explicit_positive"
    EXPLICIT_NEGATIVE = "explicit_negative"
    IMPLICIT_ENGAGEMENT = "implicit_engagement"
    IMPLICIT_ABANDONMENT = "implicit_abandonment"
    CORRECTION = "correction"

@dataclass
class LearningDataPoint:
    """Single learning observation"""
    user_id: str
    timestamp: datetime
    interaction_type: str
    context: Dict[str, Any]
    user_input: str
    pam_response: str
    feedback_type: FeedbackType
    feedback_score: float
    metadata: Dict[str, Any]

@dataclass
class ConversationalPattern:
    """Identified conversational pattern"""
    pattern_id: str
    pattern_type: str
    trigger_phrases: List[str]
    expected_responses: List[str]
    success_rate: float
    usage_frequency: int
    last_updated: datetime

@dataclass
class UserPreferenceProfile:
    """Learned user preferences"""
    user_id: str
    communication_style: str
    preferred_response_length: str
    topic_interests: Dict[str, float]
    interaction_patterns: Dict[str, Any]
    learning_preferences: Dict[str, Any]
    last_updated: datetime

class PAMContinuousLearningSystem:
    """
    Advanced continuous learning system for PAM.
    
    Implements multiple learning mechanisms:
    - Conversational pattern recognition
    - User preference learning
    - Response effectiveness optimization
    - Domain knowledge expansion
    - Error correction and adaptation
    """
    
    def __init__(self):
        self.db = get_database()
        self.embedding_service = VectorEmbeddingService()
        self.learning_buffer = deque(maxlen=10000)
        self.pattern_cache = {}
        self.user_profiles = {}
        self.vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
        self.pattern_clusters = None
        self.last_model_update = None
        
        # Learning configuration
        self.min_pattern_frequency = 5
        self.pattern_similarity_threshold = 0.8
        self.preference_learning_rate = 0.1
        self.model_update_interval = timedelta(hours=6)
        
        # Initialize learning models
        asyncio.create_task(self._initialize_learning_models())
        
    async def _initialize_learning_models(self):
        """Initialize or load existing learning models"""
        try:
            # Load existing patterns and preferences
            await self._load_conversational_patterns()
            await self._load_user_preferences()
            
            # Initialize clustering model if we have enough data
            await self._update_pattern_clustering()
            
            self.last_model_update = datetime.utcnow()
            logger.info("Continuous learning system initialized")
            
        except Exception as e:
            logger.error(f"Error initializing learning models: {e}")
    
    async def record_interaction(
        self,
        user_id: str,
        user_input: str,
        pam_response: str,
        feedback_type: FeedbackType,
        feedback_score: float,
        context: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Record a user interaction for learning.
        
        Args:
            user_id: User identifier
            user_input: What the user said/asked
            pam_response: PAM's response
            feedback_type: Type of feedback received
            feedback_score: Numerical feedback score (0-1)
            context: Interaction context
            metadata: Additional metadata
            
        Returns:
            Success status
        """
        try:
            data_point = LearningDataPoint(
                user_id=user_id,
                timestamp=datetime.utcnow(),
                interaction_type="conversation",
                context=context or {},
                user_input=user_input,
                pam_response=pam_response,
                feedback_type=feedback_type,
                feedback_score=feedback_score,
                metadata=metadata or {}
            )
            
            # Add to learning buffer
            self.learning_buffer.append(data_point)
            
            # Store in database
            await self._store_learning_data_point(data_point)
            
            # Immediate learning for high-impact interactions
            if feedback_score > 0.8 or feedback_score < 0.2:
                await self._process_immediate_learning(data_point)
            
            # Trigger model updates if needed
            if self._should_update_models():
                asyncio.create_task(self._update_learning_models())
            
            return True
            
        except Exception as e:
            logger.error(f"Error recording interaction for learning: {e}")
            return False
    
    async def get_personalized_response_suggestion(
        self,
        user_id: str,
        user_input: str,
        base_response: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Tuple[str, float]:
        """
        Get personalized response suggestion based on learned preferences.
        
        Args:
            user_id: User identifier
            user_input: User's input
            base_response: Base response from PAM
            context: Interaction context
            
        Returns:
            Tuple of (personalized_response, confidence_score)
        """
        try:
            # Get user preference profile
            user_profile = await self._get_user_preference_profile(user_id)
            if not user_profile:
                return base_response, 0.5
            
            # Apply personalization
            personalized_response = await self._personalize_response(
                base_response, user_profile, user_input, context
            )
            
            # Calculate confidence based on profile completeness
            confidence = min(0.9, len(user_profile.topic_interests) / 10 * 0.8 + 0.1)
            
            return personalized_response, confidence
            
        except Exception as e:
            logger.error(f"Error generating personalized response: {e}")
            return base_response, 0.5
    
    async def identify_conversational_patterns(
        self,
        user_input: str,
        context: Optional[Dict[str, Any]] = None
    ) -> List[ConversationalPattern]:
        """
        Identify matching conversational patterns for user input.
        
        Args:
            user_input: User's input text
            context: Interaction context
            
        Returns:
            List of matching conversational patterns
        """
        try:
            # Get input embedding
            input_embedding = await self.embedding_service.generate_embedding(user_input)
            
            matching_patterns = []
            
            # Check against known patterns
            for pattern in self.pattern_cache.values():
                for trigger in pattern.trigger_phrases:
                    trigger_embedding = await self.embedding_service.generate_embedding(trigger)
                    similarity = cosine_similarity([input_embedding], [trigger_embedding])[0][0]
                    
                    if similarity > self.pattern_similarity_threshold:
                        matching_patterns.append(pattern)
                        break
            
            # Sort by success rate and frequency
            matching_patterns.sort(
                key=lambda p: (p.success_rate * p.usage_frequency),
                reverse=True
            )
            
            return matching_patterns[:5]  # Top 5 patterns
            
        except Exception as e:
            logger.error(f"Error identifying conversational patterns: {e}")
            return []
    
    async def learn_from_correction(
        self,
        user_id: str,
        original_response: str,
        corrected_response: str,
        user_input: str,
        context: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Learn from user corrections to improve future responses.
        
        Args:
            user_id: User identifier
            original_response: PAM's original response
            corrected_response: User's correction
            user_input: Original user input
            context: Interaction context
            
        Returns:
            Success status
        """
        try:
            # Record correction as learning data
            await self.record_interaction(
                user_id=user_id,
                user_input=user_input,
                pam_response=original_response,
                feedback_type=FeedbackType.CORRECTION,
                feedback_score=0.1,  # Low score for incorrect response
                context=context,
                metadata={
                    "correction": corrected_response,
                    "correction_type": "user_provided"
                }
            )
            
            # Extract learning insights
            correction_insight = await self._analyze_correction(
                user_input, original_response, corrected_response
            )
            
            # Update knowledge base
            if correction_insight:
                await self._update_knowledge_from_correction(correction_insight)
            
            return True
            
        except Exception as e:
            logger.error(f"Error learning from correction: {e}")
            return False
    
    async def get_learning_analytics(
        self,
        user_id: Optional[str] = None,
        time_range: Optional[Tuple[datetime, datetime]] = None
    ) -> Dict[str, Any]:
        """
        Get analytics about learning progress and insights.
        
        Args:
            user_id: Optional user filter
            time_range: Optional time range filter
            
        Returns:
            Learning analytics data
        """
        try:
            # Get learning data
            learning_data = await self._get_learning_data(user_id, time_range)
            
            # Calculate metrics
            total_interactions = len(learning_data)
            avg_feedback_score = np.mean([d.feedback_score for d in learning_data]) if learning_data else 0
            
            # Pattern analysis
            pattern_usage = defaultdict(int)
            for pattern in self.pattern_cache.values():
                pattern_usage[pattern.pattern_type] += pattern.usage_frequency
            
            # User preference insights
            preference_coverage = len(self.user_profiles) if user_id is None else (1 if user_id in self.user_profiles else 0)
            
            # Learning effectiveness
            recent_data = [d for d in learning_data if d.timestamp > datetime.utcnow() - timedelta(days=7)]
            recent_improvement = 0
            if len(recent_data) > 10:
                recent_scores = [d.feedback_score for d in recent_data[-10:]]
                earlier_scores = [d.feedback_score for d in recent_data[-20:-10]] if len(recent_data) > 20 else []
                if earlier_scores:
                    recent_improvement = np.mean(recent_scores) - np.mean(earlier_scores)
            
            return {
                "total_interactions": total_interactions,
                "average_feedback_score": float(avg_feedback_score),
                "pattern_usage": dict(pattern_usage),
                "preference_coverage": preference_coverage,
                "recent_improvement": float(recent_improvement),
                "learning_rate": self.preference_learning_rate,
                "model_last_updated": self.last_model_update.isoformat() if self.last_model_update else None,
                "buffer_size": len(self.learning_buffer),
                "patterns_discovered": len(self.pattern_cache)
            }
            
        except Exception as e:
            logger.error(f"Error getting learning analytics: {e}")
            return {}
    
    # Private methods
    
    async def _store_learning_data_point(self, data_point: LearningDataPoint):
        """Store learning data point in database"""
        query = """
        INSERT INTO pam_learning_data (
            user_id, timestamp, interaction_type, context, user_input,
            pam_response, feedback_type, feedback_score, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        """
        
        await self.db.execute(
            query,
            data_point.user_id,
            data_point.timestamp,
            data_point.interaction_type,
            json.dumps(data_point.context),
            data_point.user_input,
            data_point.pam_response,
            data_point.feedback_type.value,
            data_point.feedback_score,
            json.dumps(data_point.metadata)
        )
    
    async def _process_immediate_learning(self, data_point: LearningDataPoint):
        """Process high-impact interactions immediately"""
        # Update user preferences for strong positive/negative feedback
        if data_point.feedback_score > 0.8:
            await self._reinforce_positive_pattern(data_point)
        elif data_point.feedback_score < 0.2:
            await self._learn_from_negative_feedback(data_point)
    
    async def _reinforce_positive_pattern(self, data_point: LearningDataPoint):
        """Reinforce patterns that received positive feedback"""
        # Extract successful response patterns
        pattern_id = hashlib.md5(
            f"{data_point.user_input}:{data_point.pam_response}".encode()
        ).hexdigest()[:8]
        
        if pattern_id in self.pattern_cache:
            pattern = self.pattern_cache[pattern_id]
            pattern.success_rate = min(1.0, pattern.success_rate + 0.1)
            pattern.usage_frequency += 1
        else:
            # Create new positive pattern
            self.pattern_cache[pattern_id] = ConversationalPattern(
                pattern_id=pattern_id,
                pattern_type="successful_response",
                trigger_phrases=[data_point.user_input],
                expected_responses=[data_point.pam_response],
                success_rate=0.8,
                usage_frequency=1,
                last_updated=datetime.utcnow()
            )
    
    async def _learn_from_negative_feedback(self, data_point: LearningDataPoint):
        """Learn from negative feedback to avoid similar responses"""
        # Mark response patterns to avoid
        pattern_id = f"avoid_{hashlib.md5(data_point.pam_response.encode()).hexdigest()[:8]}"
        
        if pattern_id in self.pattern_cache:
            pattern = self.pattern_cache[pattern_id]
            pattern.success_rate = max(0.0, pattern.success_rate - 0.1)
        else:
            self.pattern_cache[pattern_id] = ConversationalPattern(
                pattern_id=pattern_id,
                pattern_type="avoid_response",
                trigger_phrases=[data_point.user_input],
                expected_responses=[],  # Empty - response to avoid
                success_rate=0.2,
                usage_frequency=1,
                last_updated=datetime.utcnow()
            )
    
    async def _personalize_response(
        self,
        base_response: str,
        user_profile: UserPreferenceProfile,
        user_input: str,
        context: Optional[Dict[str, Any]]
    ) -> str:
        """Personalize response based on user preferences"""
        personalized = base_response
        
        # Adjust response length based on preference
        if user_profile.preferred_response_length == "brief":
            # Shorten response
            sentences = personalized.split('. ')
            if len(sentences) > 2:
                personalized = '. '.join(sentences[:2]) + '.'
        elif user_profile.preferred_response_length == "detailed":
            # Add more detail if response is too brief
            if len(personalized.split()) < 30:
                personalized += " Let me know if you'd like me to elaborate on any aspect of this."
        
        # Adjust communication style
        if user_profile.communication_style == "formal":
            personalized = personalized.replace("you're", "you are")
            personalized = personalized.replace("can't", "cannot")
            personalized = personalized.replace("won't", "will not")
        elif user_profile.communication_style == "casual":
            personalized = personalized.replace("you are", "you're")
            personalized = personalized.replace("cannot", "can't")
        
        return personalized
    
    async def _get_user_preference_profile(self, user_id: str) -> Optional[UserPreferenceProfile]:
        """Get user preference profile"""
        if user_id in self.user_profiles:
            return self.user_profiles[user_id]
        
        # Load from database
        query = """
        SELECT communication_style, preferred_response_length, topic_interests,
               interaction_patterns, learning_preferences, last_updated
        FROM pam_user_preferences WHERE user_id = $1
        """
        
        result = await self.db.fetchrow(query, user_id)
        if result:
            profile = UserPreferenceProfile(
                user_id=user_id,
                communication_style=result['communication_style'],
                preferred_response_length=result['preferred_response_length'],
                topic_interests=json.loads(result['topic_interests']),
                interaction_patterns=json.loads(result['interaction_patterns']),
                learning_preferences=json.loads(result['learning_preferences']),
                last_updated=result['last_updated']
            )
            self.user_profiles[user_id] = profile
            return profile
        
        return None
    
    def _should_update_models(self) -> bool:
        """Check if models should be updated"""
        if not self.last_model_update:
            return True
        
        return (
            datetime.utcnow() - self.last_model_update > self.model_update_interval
            or len(self.learning_buffer) > 1000
        )
    
    async def _update_learning_models(self):
        """Update learning models with new data"""
        try:
            # Update conversational patterns
            await self._update_conversational_patterns()
            
            # Update user preferences
            await self._update_user_preferences()
            
            # Update clustering models
            await self._update_pattern_clustering()
            
            self.last_model_update = datetime.utcnow()
            logger.info("Learning models updated successfully")
            
        except Exception as e:
            logger.error(f"Error updating learning models: {e}")
    
    async def _update_conversational_patterns(self):
        """Update conversational patterns from recent interactions"""
        # Analyze recent interactions for patterns
        recent_data = list(self.learning_buffer)[-1000:]  # Last 1000 interactions
        
        # Group by similar inputs
        input_groups = defaultdict(list)
        for data_point in recent_data:
            # Simple grouping by first few words
            key = ' '.join(data_point.user_input.lower().split()[:3])
            input_groups[key].append(data_point)
        
        # Identify patterns with sufficient frequency
        for key, group in input_groups.items():
            if len(group) >= self.min_pattern_frequency:
                # Calculate pattern success rate
                success_rate = np.mean([d.feedback_score for d in group])
                
                pattern_id = hashlib.md5(key.encode()).hexdigest()[:8]
                
                self.pattern_cache[pattern_id] = ConversationalPattern(
                    pattern_id=pattern_id,
                    pattern_type="discovered_pattern",
                    trigger_phrases=[d.user_input for d in group[:5]],
                    expected_responses=[d.pam_response for d in group[:5]],
                    success_rate=float(success_rate),
                    usage_frequency=len(group),
                    last_updated=datetime.utcnow()
                )
    
    async def _update_user_preferences(self):
        """Update user preference profiles"""
        # Analyze user behavior patterns
        user_data = defaultdict(list)
        for data_point in self.learning_buffer:
            user_data[data_point.user_id].append(data_point)
        
        for user_id, interactions in user_data.items():
            if len(interactions) >= 10:  # Minimum interactions for preference learning
                await self._analyze_user_preferences(user_id, interactions)
    
    async def _analyze_user_preferences(self, user_id: str, interactions: List[LearningDataPoint]):
        """Analyze and update preferences for a specific user"""
        # Determine communication style preference
        formal_score = 0
        casual_score = 0
        
        for interaction in interactions:
            if any(word in interaction.user_input.lower() for word in ['please', 'thank you', 'could you']):
                formal_score += 1
            if any(word in interaction.user_input.lower() for word in ['hey', 'yo', 'sup', 'gonna']):
                casual_score += 1
        
        communication_style = "formal" if formal_score > casual_score else "casual"
        
        # Determine response length preference
        positive_responses = [i for i in interactions if i.feedback_score > 0.7]
        if positive_responses:
            avg_preferred_length = np.mean([len(i.pam_response.split()) for i in positive_responses])
            if avg_preferred_length < 20:
                preferred_length = "brief"
            elif avg_preferred_length > 50:
                preferred_length = "detailed"
            else:
                preferred_length = "moderate"
        else:
            preferred_length = "moderate"
        
        # Extract topic interests
        topic_interests = {}
        for interaction in interactions:
            # Simple keyword extraction - in production, use more sophisticated NLP
            words = interaction.user_input.lower().split()
            for word in words:
                if len(word) > 4 and word.isalpha():
                    topic_interests[word] = topic_interests.get(word, 0) + 1
        
        # Normalize topic interests
        if topic_interests:
            max_count = max(topic_interests.values())
            topic_interests = {k: v/max_count for k, v in topic_interests.items()}
        
        # Create or update user profile
        profile = UserPreferenceProfile(
            user_id=user_id,
            communication_style=communication_style,
            preferred_response_length=preferred_length,
            topic_interests=topic_interests,
            interaction_patterns={"total_interactions": len(interactions)},
            learning_preferences={"adaptation_rate": "normal"},
            last_updated=datetime.utcnow()
        )
        
        self.user_profiles[user_id] = profile
        
        # Store in database
        await self._store_user_preferences(profile)
    
    async def _store_user_preferences(self, profile: UserPreferenceProfile):
        """Store user preferences in database"""
        query = """
        INSERT INTO pam_user_preferences (
            user_id, communication_style, preferred_response_length,
            topic_interests, interaction_patterns, learning_preferences, last_updated
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id) DO UPDATE SET
            communication_style = EXCLUDED.communication_style,
            preferred_response_length = EXCLUDED.preferred_response_length,
            topic_interests = EXCLUDED.topic_interests,
            interaction_patterns = EXCLUDED.interaction_patterns,
            learning_preferences = EXCLUDED.learning_preferences,
            last_updated = EXCLUDED.last_updated
        """
        
        await self.db.execute(
            query,
            profile.user_id,
            profile.communication_style,
            profile.preferred_response_length,
            json.dumps(profile.topic_interests),
            json.dumps(profile.interaction_patterns),
            json.dumps(profile.learning_preferences),
            profile.last_updated
        )
    
    async def _update_pattern_clustering(self):
        """Update pattern clustering models"""
        if len(self.pattern_cache) < 10:
            return  # Need more patterns for meaningful clustering
        
        try:
            # Extract pattern features
            patterns = list(self.pattern_cache.values())
            pattern_texts = []
            
            for pattern in patterns:
                text = ' '.join(pattern.trigger_phrases + pattern.expected_responses)
                pattern_texts.append(text)
            
            # Vectorize patterns
            if pattern_texts:
                tfidf_matrix = self.vectorizer.fit_transform(pattern_texts)
                
                # Cluster patterns
                n_clusters = min(5, len(patterns) // 3)  # Dynamic cluster count
                if n_clusters >= 2:
                    kmeans = KMeans(n_clusters=n_clusters, random_state=42)
                    self.pattern_clusters = kmeans.fit(tfidf_matrix)
            
        except Exception as e:
            logger.error(f"Error updating pattern clustering: {e}")
    
    async def _analyze_correction(
        self,
        user_input: str,
        original_response: str,
        corrected_response: str
    ) -> Optional[Dict[str, Any]]:
        """Analyze user correction to extract learning insights"""
        try:
            # Generate embeddings for analysis
            input_embedding = await self.embedding_service.generate_embedding(user_input)
            original_embedding = await self.embedding_service.generate_embedding(original_response)
            corrected_embedding = await self.embedding_service.generate_embedding(corrected_response)
            
            # Calculate semantic differences
            correction_magnitude = cosine_similarity(
                [original_embedding], [corrected_embedding]
            )[0][0]
            
            return {
                "user_input": user_input,
                "original_response": original_response,
                "corrected_response": corrected_response,
                "correction_magnitude": float(1 - correction_magnitude),
                "analysis_timestamp": datetime.utcnow().isoformat(),
                "correction_type": "semantic_improvement" if correction_magnitude < 0.7 else "minor_adjustment"
            }
            
        except Exception as e:
            logger.error(f"Error analyzing correction: {e}")
            return None
    
    async def _update_knowledge_from_correction(self, correction_insight: Dict[str, Any]):
        """Update knowledge base from correction insights"""
        # Store correction insight for pattern learning
        correction_id = hashlib.md5(
            f"{correction_insight['user_input']}:{correction_insight['corrected_response']}".encode()
        ).hexdigest()[:8]
        
        # Create improved response pattern
        self.pattern_cache[f"improved_{correction_id}"] = ConversationalPattern(
            pattern_id=f"improved_{correction_id}",
            pattern_type="corrected_pattern",
            trigger_phrases=[correction_insight['user_input']],
            expected_responses=[correction_insight['corrected_response']],
            success_rate=0.9,  # High confidence in corrected responses
            usage_frequency=1,
            last_updated=datetime.utcnow()
        )
    
    async def _load_conversational_patterns(self):
        """Load existing conversational patterns from database"""
        try:
            query = """
            SELECT pattern_id, pattern_type, trigger_phrases, expected_responses,
                   success_rate, usage_frequency, last_updated
            FROM pam_conversational_patterns
            """
            
            results = await self.db.fetch(query)
            for row in results:
                pattern = ConversationalPattern(
                    pattern_id=row['pattern_id'],
                    pattern_type=row['pattern_type'],
                    trigger_phrases=json.loads(row['trigger_phrases']),
                    expected_responses=json.loads(row['expected_responses']),
                    success_rate=row['success_rate'],
                    usage_frequency=row['usage_frequency'],
                    last_updated=row['last_updated']
                )
                self.pattern_cache[pattern.pattern_id] = pattern
            
            logger.info(f"Loaded {len(results)} conversational patterns")
            
        except Exception as e:
            logger.error(f"Error loading conversational patterns: {e}")
    
    async def _load_user_preferences(self):
        """Load user preferences from database"""
        try:
            query = """
            SELECT user_id, communication_style, preferred_response_length,
                   topic_interests, interaction_patterns, learning_preferences, last_updated
            FROM pam_user_preferences
            """
            
            results = await self.db.fetch(query)
            for row in results:
                profile = UserPreferenceProfile(
                    user_id=row['user_id'],
                    communication_style=row['communication_style'],
                    preferred_response_length=row['preferred_response_length'],
                    topic_interests=json.loads(row['topic_interests']),
                    interaction_patterns=json.loads(row['interaction_patterns']),
                    learning_preferences=json.loads(row['learning_preferences']),
                    last_updated=row['last_updated']
                )
                self.user_profiles[row['user_id']] = profile
            
            logger.info(f"Loaded {len(results)} user preference profiles")
            
        except Exception as e:
            logger.error(f"Error loading user preferences: {e}")
    
    async def _get_learning_data(
        self,
        user_id: Optional[str] = None,
        time_range: Optional[Tuple[datetime, datetime]] = None
    ) -> List[LearningDataPoint]:
        """Get learning data with optional filters"""
        try:
            query_parts = ["SELECT * FROM pam_learning_data WHERE 1=1"]
            params = []
            
            if user_id:
                query_parts.append("AND user_id = $" + str(len(params) + 1))
                params.append(user_id)
            
            if time_range:
                query_parts.append("AND timestamp >= $" + str(len(params) + 1))
                params.append(time_range[0])
                query_parts.append("AND timestamp <= $" + str(len(params) + 1))
                params.append(time_range[1])
            
            query_parts.append("ORDER BY timestamp DESC LIMIT 10000")
            query = " ".join(query_parts)
            
            results = await self.db.fetch(query, *params)
            
            learning_data = []
            for row in results:
                data_point = LearningDataPoint(
                    user_id=row['user_id'],
                    timestamp=row['timestamp'],
                    interaction_type=row['interaction_type'],
                    context=json.loads(row['context']),
                    user_input=row['user_input'],
                    pam_response=row['pam_response'],
                    feedback_type=FeedbackType(row['feedback_type']),
                    feedback_score=row['feedback_score'],
                    metadata=json.loads(row['metadata'])
                )
                learning_data.append(data_point)
            
            return learning_data
            
        except Exception as e:
            logger.error(f"Error getting learning data: {e}")
            return []


# Global learning system instance
learning_system = PAMContinuousLearningSystem()

# Utility functions for easy integration

async def record_user_interaction(
    user_id: str,
    user_input: str,
    pam_response: str,
    feedback_type: str,
    feedback_score: float,
    context: Optional[Dict[str, Any]] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> bool:
    """Convenience function to record user interaction"""
    return await learning_system.record_interaction(
        user_id=user_id,
        user_input=user_input,
        pam_response=pam_response,
        feedback_type=FeedbackType(feedback_type),
        feedback_score=feedback_score,
        context=context,
        metadata=metadata
    )

async def get_personalized_response(
    user_id: str,
    user_input: str,
    base_response: str,
    context: Optional[Dict[str, Any]] = None
) -> Tuple[str, float]:
    """Get personalized response for user"""
    return await learning_system.get_personalized_response_suggestion(
        user_id=user_id,
        user_input=user_input,
        base_response=base_response,
        context=context
    )

async def learn_from_user_correction(
    user_id: str,
    original_response: str,
    corrected_response: str,
    user_input: str,
    context: Optional[Dict[str, Any]] = None
) -> bool:
    """Learn from user correction"""
    return await learning_system.learn_from_correction(
        user_id=user_id,
        original_response=original_response,
        corrected_response=corrected_response,
        user_input=user_input,
        context=context
    )