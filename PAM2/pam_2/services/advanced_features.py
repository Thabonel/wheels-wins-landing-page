"""
Advanced Features Service for PAM 2.0
Provides multi-modal processing, proactive suggestions, and intelligent context awareness
"""

import asyncio
import json
import logging
from typing import Dict, Any, List, Optional, Tuple, Union
from dataclasses import dataclass
from enum import Enum
from datetime import datetime, timedelta
import uuid

from pam_2.core.types import ServiceResponse, ServiceStatus
from pam_2.core.config import get_settings
from pam_2.core.exceptions import PAMServiceError

logger = logging.getLogger(__name__)
settings = get_settings()


class ContextAwarenessLevel(Enum):
    """Levels of context awareness"""
    BASIC = "basic"
    ENHANCED = "enhanced"
    PROACTIVE = "proactive"
    PREDICTIVE = "predictive"


class SuggestionType(Enum):
    """Types of proactive suggestions"""
    TRIP_PLANNING = "trip_planning"
    FINANCIAL_INSIGHT = "financial_insight"
    SOCIAL_ACTIVITY = "social_activity"
    TASK_REMINDER = "task_reminder"
    OPTIMIZATION = "optimization"
    SAFETY_ALERT = "safety_alert"


class PersonalityTrait(Enum):
    """AI personality traits"""
    HELPFUL = "helpful"
    FRIENDLY = "friendly"
    PROFESSIONAL = "professional"
    CASUAL = "casual"
    ENTHUSIASTIC = "enthusiastic"
    CALM = "calm"
    DETAILED = "detailed"
    CONCISE = "concise"


@dataclass
class UserContext:
    """Enhanced user context for personalization"""
    user_id: str
    location: Optional[Tuple[float, float]] = None
    timezone: str = "UTC"
    preferences: Dict[str, Any] = None
    recent_activities: List[Dict[str, Any]] = None
    conversation_history: List[Dict[str, Any]] = None
    personality_profile: Dict[PersonalityTrait, float] = None
    context_level: ContextAwarenessLevel = ContextAwarenessLevel.BASIC

    def __post_init__(self):
        if self.preferences is None:
            self.preferences = {}
        if self.recent_activities is None:
            self.recent_activities = []
        if self.conversation_history is None:
            self.conversation_history = []
        if self.personality_profile is None:
            self.personality_profile = {trait: 0.5 for trait in PersonalityTrait}


@dataclass
class ProactiveSuggestion:
    """Proactive suggestion from AI"""
    id: str
    type: SuggestionType
    title: str
    description: str
    confidence: float
    priority: int  # 1-10, 10 being highest
    context_data: Dict[str, Any]
    created_at: datetime
    expires_at: Optional[datetime] = None
    action_required: bool = False
    estimated_value: Optional[str] = None  # "Save $50", "Save 30 minutes", etc.


@dataclass
class MultiModalInput:
    """Multi-modal input data"""
    text: Optional[str] = None
    audio_data: Optional[bytes] = None
    image_data: Optional[bytes] = None
    document_data: Optional[bytes] = None
    location: Optional[Tuple[float, float]] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class IntelligentResponse:
    """Enhanced AI response with multiple modalities"""
    text: str
    audio_enabled: bool = False
    visual_elements: Optional[List[Dict[str, Any]]] = None
    suggested_actions: Optional[List[Dict[str, Any]]] = None
    proactive_suggestions: Optional[List[ProactiveSuggestion]] = None
    confidence: float = 1.0
    reasoning: Optional[str] = None
    context_used: Optional[List[str]] = None


class PersonalityEngine:
    """AI personality management and adaptation"""

    def __init__(self):
        self.user_profiles: Dict[str, Dict[PersonalityTrait, float]] = {}
        self.conversation_patterns: Dict[str, List[str]] = {}

    def adapt_personality(self, user_id: str, conversation_history: List[Dict[str, Any]]) -> Dict[PersonalityTrait, float]:
        """Adapt personality based on user interaction patterns"""
        if user_id not in self.user_profiles:
            self.user_profiles[user_id] = {trait: 0.5 for trait in PersonalityTrait}

        profile = self.user_profiles[user_id].copy()

        # Analyze recent conversations
        recent_messages = conversation_history[-10:] if conversation_history else []

        for message in recent_messages:
            if message.get("role") == "user":
                content = message.get("content", "").lower()

                # Adjust based on user communication style
                if any(word in content for word in ["please", "thank", "appreciate"]):
                    profile[PersonalityTrait.FRIENDLY] = min(1.0, profile[PersonalityTrait.FRIENDLY] + 0.1)

                if any(word in content for word in ["quick", "brief", "short"]):
                    profile[PersonalityTrait.CONCISE] = min(1.0, profile[PersonalityTrait.CONCISE] + 0.1)
                    profile[PersonalityTrait.DETAILED] = max(0.0, profile[PersonalityTrait.DETAILED] - 0.1)

                if any(word in content for word in ["explain", "detail", "more"]):
                    profile[PersonalityTrait.DETAILED] = min(1.0, profile[PersonalityTrait.DETAILED] + 0.1)
                    profile[PersonalityTrait.CONCISE] = max(0.0, profile[PersonalityTrait.CONCISE] - 0.1)

                if any(word in content for word in ["excited", "awesome", "amazing"]):
                    profile[PersonalityTrait.ENTHUSIASTIC] = min(1.0, profile[PersonalityTrait.ENTHUSIASTIC] + 0.1)

        self.user_profiles[user_id] = profile
        return profile

    def format_response_for_personality(self, response: str, personality: Dict[PersonalityTrait, float]) -> str:
        """Format response based on personality profile"""
        # Apply personality modifications
        if personality[PersonalityTrait.ENTHUSIASTIC] > 0.7:
            response = response.replace(".", "! ")
            if not response.endswith("!"):
                response += "!"

        if personality[PersonalityTrait.FRIENDLY] > 0.7:
            if not any(greeting in response.lower() for greeting in ["hi", "hello", "hey"]):
                response = "Hi there! " + response

        if personality[PersonalityTrait.PROFESSIONAL] > 0.7:
            response = response.replace("!", ".")
            response = response.replace("Hey", "Hello")

        return response


class ProactiveEngine:
    """Proactive suggestion and discovery engine"""

    def __init__(self):
        self.suggestion_history: Dict[str, List[ProactiveSuggestion]] = {}
        self.pattern_analyzers = {
            SuggestionType.TRIP_PLANNING: self._analyze_trip_patterns,
            SuggestionType.FINANCIAL_INSIGHT: self._analyze_financial_patterns,
            SuggestionType.SOCIAL_ACTIVITY: self._analyze_social_patterns,
            SuggestionType.TASK_REMINDER: self._analyze_task_patterns,
            SuggestionType.OPTIMIZATION: self._analyze_optimization_opportunities,
            SuggestionType.SAFETY_ALERT: self._analyze_safety_concerns
        }

    async def generate_suggestions(self, user_context: UserContext) -> List[ProactiveSuggestion]:
        """Generate proactive suggestions based on user context"""
        suggestions = []

        for suggestion_type, analyzer in self.pattern_analyzers.items():
            try:
                type_suggestions = await analyzer(user_context)
                suggestions.extend(type_suggestions)
            except Exception as e:
                logger.warning(f"Failed to generate {suggestion_type.value} suggestions: {e}")

        # Sort by priority and confidence
        suggestions.sort(key=lambda s: (s.priority, s.confidence), reverse=True)

        # Store in history
        if user_context.user_id not in self.suggestion_history:
            self.suggestion_history[user_context.user_id] = []

        self.suggestion_history[user_context.user_id].extend(suggestions)

        # Keep only recent suggestions
        cutoff = datetime.now() - timedelta(days=7)
        self.suggestion_history[user_context.user_id] = [
            s for s in self.suggestion_history[user_context.user_id]
            if s.created_at > cutoff
        ]

        return suggestions[:5]  # Return top 5 suggestions

    async def _analyze_trip_patterns(self, user_context: UserContext) -> List[ProactiveSuggestion]:
        """Analyze user patterns for trip planning suggestions"""
        suggestions = []

        # Example: Suggest trip based on location and time
        if user_context.location and datetime.now().weekday() == 4:  # Friday
            suggestion = ProactiveSuggestion(
                id=str(uuid.uuid4()),
                type=SuggestionType.TRIP_PLANNING,
                title="Weekend Trip Suggestion",
                description="Based on your location, there are some great weekend destinations nearby!",
                confidence=0.7,
                priority=6,
                context_data={"current_location": user_context.location},
                created_at=datetime.now(),
                expires_at=datetime.now() + timedelta(hours=24),
                estimated_value="Save 2 hours of planning"
            )
            suggestions.append(suggestion)

        return suggestions

    async def _analyze_financial_patterns(self, user_context: UserContext) -> List[ProactiveSuggestion]:
        """Analyze financial patterns for insights"""
        suggestions = []

        # Example: Budget optimization suggestion
        if user_context.recent_activities:
            spending_activities = [
                activity for activity in user_context.recent_activities
                if activity.get("type") == "expense"
            ]

            if len(spending_activities) > 5:
                suggestion = ProactiveSuggestion(
                    id=str(uuid.uuid4()),
                    type=SuggestionType.FINANCIAL_INSIGHT,
                    title="Spending Pattern Insight",
                    description="You've made several purchases recently. Let me help you track your budget!",
                    confidence=0.8,
                    priority=7,
                    context_data={"expense_count": len(spending_activities)},
                    created_at=datetime.now(),
                    action_required=True,
                    estimated_value="Save $200 this month"
                )
                suggestions.append(suggestion)

        return suggestions

    async def _analyze_social_patterns(self, user_context: UserContext) -> List[ProactiveSuggestion]:
        """Analyze social activity patterns"""
        return []  # Placeholder

    async def _analyze_task_patterns(self, user_context: UserContext) -> List[ProactiveSuggestion]:
        """Analyze task and reminder patterns"""
        return []  # Placeholder

    async def _analyze_optimization_opportunities(self, user_context: UserContext) -> List[ProactiveSuggestion]:
        """Find optimization opportunities"""
        return []  # Placeholder

    async def _analyze_safety_concerns(self, user_context: UserContext) -> List[ProactiveSuggestion]:
        """Identify safety concerns and alerts"""
        return []  # Placeholder


class MultiModalProcessor:
    """Multi-modal input processing and understanding"""

    def __init__(self):
        self.supported_formats = {
            "image": ["jpg", "jpeg", "png", "gif", "webp"],
            "document": ["pdf", "doc", "docx", "txt"],
            "audio": ["mp3", "wav", "ogg", "webm"]
        }

    async def process_multimodal_input(self, input_data: MultiModalInput) -> Dict[str, Any]:
        """Process multi-modal input and extract insights"""
        insights = {
            "text_analysis": None,
            "audio_analysis": None,
            "image_analysis": None,
            "document_analysis": None,
            "combined_insights": None
        }

        # Process text
        if input_data.text:
            insights["text_analysis"] = await self._analyze_text(input_data.text)

        # Process audio
        if input_data.audio_data:
            insights["audio_analysis"] = await self._analyze_audio(input_data.audio_data)

        # Process image
        if input_data.image_data:
            insights["image_analysis"] = await self._analyze_image(input_data.image_data)

        # Process document
        if input_data.document_data:
            insights["document_analysis"] = await self._analyze_document(input_data.document_data)

        # Combine insights
        insights["combined_insights"] = await self._combine_insights(insights)

        return insights

    async def _analyze_text(self, text: str) -> Dict[str, Any]:
        """Analyze text content"""
        return {
            "content": text,
            "length": len(text),
            "sentiment": "neutral",  # Placeholder
            "intent": "general",     # Placeholder
            "entities": []           # Placeholder
        }

    async def _analyze_audio(self, audio_data: bytes) -> Dict[str, Any]:
        """Analyze audio content"""
        return {
            "duration": 0,           # Placeholder
            "format": "unknown",     # Placeholder
            "speech_detected": True, # Placeholder
            "quality": "good"        # Placeholder
        }

    async def _analyze_image(self, image_data: bytes) -> Dict[str, Any]:
        """Analyze image content"""
        return {
            "size": len(image_data),
            "format": "unknown",     # Placeholder
            "objects": [],           # Placeholder
            "text_detected": False,  # Placeholder
            "scene": "unknown"       # Placeholder
        }

    async def _analyze_document(self, document_data: bytes) -> Dict[str, Any]:
        """Analyze document content"""
        return {
            "size": len(document_data),
            "type": "unknown",       # Placeholder
            "pages": 1,              # Placeholder
            "text_extracted": False, # Placeholder
            "content": ""            # Placeholder
        }

    async def _combine_insights(self, insights: Dict[str, Any]) -> Dict[str, Any]:
        """Combine insights from all modalities"""
        combined = {
            "modalities_processed": 0,
            "primary_content": None,
            "supporting_data": [],
            "confidence": 1.0
        }

        if insights["text_analysis"]:
            combined["modalities_processed"] += 1
            combined["primary_content"] = "text"

        if insights["audio_analysis"]:
            combined["modalities_processed"] += 1
            if not combined["primary_content"]:
                combined["primary_content"] = "audio"

        if insights["image_analysis"]:
            combined["modalities_processed"] += 1
            if not combined["primary_content"]:
                combined["primary_content"] = "image"

        if insights["document_analysis"]:
            combined["modalities_processed"] += 1
            if not combined["primary_content"]:
                combined["primary_content"] = "document"

        return combined


class AdvancedFeaturesService:
    """
    Advanced Features Service for PAM 2.0
    Orchestrates multi-modal processing, proactive suggestions, and personality adaptation
    """

    def __init__(self):
        self.personality_engine = PersonalityEngine()
        self.proactive_engine = ProactiveEngine()
        self.multimodal_processor = MultiModalProcessor()
        self.user_contexts: Dict[str, UserContext] = {}
        self._initialized = False

        # Performance metrics
        self.metrics = {
            "multimodal_requests": 0,
            "suggestions_generated": 0,
            "personality_adaptations": 0,
            "context_updates": 0,
            "avg_processing_time_ms": 0
        }

    async def initialize(self) -> ServiceResponse:
        """Initialize advanced features service"""
        try:
            logger.info("🧠 Initializing Advanced Features Service...")

            # Initialize components
            # (No special initialization needed for current implementation)

            self._initialized = True
            logger.info("✅ Advanced Features Service initialized")

            return ServiceResponse(
                status=ServiceStatus.SUCCESS,
                data={"features": ["multimodal", "proactive", "personality"]},
                message="Advanced features service initialized"
            )

        except Exception as e:
            logger.error(f"Failed to initialize advanced features: {e}")
            return ServiceResponse(
                status=ServiceStatus.ERROR,
                error=str(e),
                message="Failed to initialize advanced features service"
            )

    async def process_intelligent_request(
        self,
        user_id: str,
        input_data: MultiModalInput,
        conversation_history: Optional[List[Dict[str, Any]]] = None
    ) -> ServiceResponse:
        """
        Process intelligent request with advanced features

        Args:
            user_id: User identifier
            input_data: Multi-modal input data
            conversation_history: Recent conversation history

        Returns:
            ServiceResponse with intelligent response
        """
        if not self._initialized:
            await self.initialize()

        import time
        start_time = time.time()

        try:
            # Get or create user context
            if user_id not in self.user_contexts:
                self.user_contexts[user_id] = UserContext(
                    user_id=user_id,
                    conversation_history=conversation_history or []
                )
            else:
                # Update conversation history
                if conversation_history:
                    self.user_contexts[user_id].conversation_history = conversation_history

            user_context = self.user_contexts[user_id]

            # Process multi-modal input
            self.metrics["multimodal_requests"] += 1
            multimodal_insights = await self.multimodal_processor.process_multimodal_input(input_data)

            # Adapt personality
            personality_profile = self.personality_engine.adapt_personality(
                user_id,
                user_context.conversation_history
            )
            self.metrics["personality_adaptations"] += 1

            # Generate proactive suggestions
            suggestions = await self.proactive_engine.generate_suggestions(user_context)
            self.metrics["suggestions_generated"] += len(suggestions)

            # Create intelligent response
            base_text = input_data.text or "I'm here to help!"
            enhanced_text = self.personality_engine.format_response_for_personality(
                base_text,
                personality_profile
            )

            response = IntelligentResponse(
                text=enhanced_text,
                audio_enabled=bool(input_data.audio_data),
                visual_elements=[],
                suggested_actions=[],
                proactive_suggestions=suggestions,
                confidence=0.9,
                reasoning="Based on multi-modal analysis and user context",
                context_used=["personality", "history", "location"] if user_context.location else ["personality", "history"]
            )

            # Update metrics
            processing_time = (time.time() - start_time) * 1000
            current_avg = self.metrics["avg_processing_time_ms"]
            total_requests = self.metrics["multimodal_requests"]
            self.metrics["avg_processing_time_ms"] = (
                (current_avg * (total_requests - 1) + processing_time) / total_requests
            )

            return ServiceResponse(
                status=ServiceStatus.SUCCESS,
                data={
                    "response": {
                        "text": response.text,
                        "audio_enabled": response.audio_enabled,
                        "visual_elements": response.visual_elements,
                        "suggested_actions": response.suggested_actions,
                        "proactive_suggestions": [
                            {
                                "id": s.id,
                                "type": s.type.value,
                                "title": s.title,
                                "description": s.description,
                                "confidence": s.confidence,
                                "priority": s.priority,
                                "estimated_value": s.estimated_value
                            }
                            for s in response.proactive_suggestions or []
                        ],
                        "confidence": response.confidence,
                        "context_used": response.context_used
                    },
                    "multimodal_insights": multimodal_insights,
                    "personality_profile": {trait.value: score for trait, score in personality_profile.items()},
                    "processing_time_ms": processing_time
                },
                message="Intelligent response generated with advanced features"
            )

        except Exception as e:
            logger.error(f"Advanced features processing failed: {e}")
            return ServiceResponse(
                status=ServiceStatus.ERROR,
                error=str(e),
                message="Failed to process with advanced features"
            )

    async def update_user_context(
        self,
        user_id: str,
        location: Optional[Tuple[float, float]] = None,
        preferences: Optional[Dict[str, Any]] = None,
        activities: Optional[List[Dict[str, Any]]] = None
    ) -> ServiceResponse:
        """Update user context for better personalization"""
        try:
            if user_id not in self.user_contexts:
                self.user_contexts[user_id] = UserContext(user_id=user_id)

            context = self.user_contexts[user_id]

            if location:
                context.location = location
            if preferences:
                context.preferences.update(preferences)
            if activities:
                context.recent_activities.extend(activities)
                # Keep only recent activities (last 50)
                context.recent_activities = context.recent_activities[-50:]

            self.metrics["context_updates"] += 1

            return ServiceResponse(
                status=ServiceStatus.SUCCESS,
                data={"user_id": user_id, "context_updated": True},
                message="User context updated successfully"
            )

        except Exception as e:
            logger.error(f"Context update failed: {e}")
            return ServiceResponse(
                status=ServiceStatus.ERROR,
                error=str(e),
                message="Failed to update user context"
            )

    def get_metrics(self) -> Dict[str, Any]:
        """Get service metrics"""
        return {
            **self.metrics,
            "active_users": len(self.user_contexts),
            "total_suggestions_in_history": sum(
                len(suggestions) for suggestions in self.proactive_engine.suggestion_history.values()
            )
        }

    async def health_check(self) -> ServiceResponse:
        """Check advanced features service health"""
        try:
            components = {
                "personality_engine": self.personality_engine is not None,
                "proactive_engine": self.proactive_engine is not None,
                "multimodal_processor": self.multimodal_processor is not None
            }

            all_healthy = all(components.values())

            return ServiceResponse(
                status=ServiceStatus.SUCCESS if all_healthy else ServiceStatus.ERROR,
                data={
                    "components": components,
                    "metrics": self.get_metrics()
                },
                message=f"Advanced features {'healthy' if all_healthy else 'degraded'}"
            )

        except Exception as e:
            return ServiceResponse(
                status=ServiceStatus.ERROR,
                error=str(e),
                message="Advanced features health check failed"
            )


# Module-level singleton
advanced_features_service = AdvancedFeaturesService()


async def get_advanced_features_service() -> AdvancedFeaturesService:
    """Get the advanced features service singleton"""
    if not advanced_features_service._initialized:
        await advanced_features_service.initialize()
    return advanced_features_service