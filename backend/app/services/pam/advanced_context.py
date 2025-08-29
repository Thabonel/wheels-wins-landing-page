"""
Advanced Context Management System - Phase 3
Intelligent context tracking, prediction, and optimization for PAM
"""

import asyncio
import json
import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import uuid

from app.models.domain.pam import PamContext, IntentType
from .message_bus import get_message_bus, MessageType, MessagePriority

logger = logging.getLogger(__name__)

class ContextScope(Enum):
    """Context scope levels"""
    SESSION = "session"
    USER = "user"
    CONVERSATION = "conversation"
    GLOBAL = "global"

class ContextType(Enum):
    """Types of context information"""
    USER_PREFERENCES = "user_preferences"
    CONVERSATION_HISTORY = "conversation_history"
    LOCATION_DATA = "location_data"
    DEVICE_INFO = "device_info"
    INTERACTION_PATTERNS = "interaction_patterns"
    TEMPORAL_CONTEXT = "temporal_context"
    EMOTIONAL_STATE = "emotional_state"
    ACTIVITY_CONTEXT = "activity_context"

@dataclass
class ContextItem:
    """Individual context item"""
    id: str
    type: ContextType
    scope: ContextScope
    key: str
    value: Any
    confidence: float
    timestamp: datetime
    ttl_seconds: Optional[int]
    source: str
    metadata: Dict[str, Any]

@dataclass
class ContextPrediction:
    """Predicted context for future interactions"""
    prediction_id: str
    predicted_context: Dict[str, Any]
    confidence: float
    time_horizon_minutes: int
    reasoning: str
    created_at: datetime

@dataclass
class ContextInsight:
    """Insights derived from context analysis"""
    insight_id: str
    insight_type: str
    description: str
    impact_score: float
    actionable: bool
    recommendations: List[str]
    confidence: float
    created_at: datetime

class AdvancedContextManager:
    """Advanced context management with prediction and optimization"""
    
    def __init__(self):
        # Multi-level context storage
        self.context_store: Dict[str, Dict[ContextScope, Dict[str, ContextItem]]] = {}
        
        # Context prediction models (simplified for demo)
        self.context_patterns: Dict[str, List[Dict[str, Any]]] = {}
        
        # Context insights cache
        self.context_insights: Dict[str, List[ContextInsight]] = {}
        
        # Performance tracking
        self.performance_metrics = {
            "context_retrievals": 0,
            "context_updates": 0,
            "predictions_generated": 0,
            "insights_generated": 0,
            "avg_retrieval_time_ms": 0.0,
            "cache_hit_rate": 0.0
        }
        
        # Context optimization settings
        self.optimization_config = {
            "max_context_items": 1000,
            "default_ttl_hours": 24,
            "prediction_horizon_minutes": 60,
            "insight_confidence_threshold": 0.7,
            "pattern_detection_window_hours": 168  # 1 week
        }
        
        # Active context subscriptions (for real-time updates)
        self.context_subscriptions: Dict[str, List[Callable]] = {}
        
        # Background tasks
        self._cleanup_task = None
        self._prediction_task = None
        self._running = False
    
    async def initialize(self):
        """Initialize advanced context manager"""
        try:
            self._running = True
            
            # Start background tasks
            self._cleanup_task = asyncio.create_task(self._cleanup_expired_context())
            self._prediction_task = asyncio.create_task(self._generate_predictions())
            
            logger.info("🧠 Advanced Context Manager initialized")
            
        except Exception as e:
            logger.error(f"❌ Advanced Context Manager initialization failed: {e}")
            raise
    
    async def shutdown(self):
        """Shutdown context manager"""
        self._running = False
        
        if self._cleanup_task:
            self._cleanup_task.cancel()
        if self._prediction_task:
            self._prediction_task.cancel()
        
        logger.info("🛑 Advanced Context Manager shutdown")
    
    async def get_enhanced_context(
        self,
        user_id: str,
        session_id: str,
        conversation_id: str,
        include_predictions: bool = True,
        include_insights: bool = True
    ) -> Dict[str, Any]:
        """Get enhanced context with predictions and insights"""
        
        start_time = datetime.utcnow()
        self.performance_metrics["context_retrievals"] += 1
        
        try:
            # Get multi-level context
            context = await self._retrieve_multilevel_context(
                user_id, session_id, conversation_id
            )
            
            # Add predictions if requested
            if include_predictions:
                predictions = await self._get_context_predictions(user_id, session_id)
                context["predictions"] = predictions
            
            # Add insights if requested
            if include_insights:
                insights = await self._get_context_insights(user_id)
                context["insights"] = insights
            
            # Add temporal context
            context["temporal"] = self._get_temporal_context()
            
            # Add interaction patterns
            context["patterns"] = await self._get_interaction_patterns(user_id)
            
            # Update performance metrics
            retrieval_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            self._update_retrieval_metrics(retrieval_time)
            
            return context
            
        except Exception as e:
            logger.error(f"❌ Enhanced context retrieval failed: {e}")
            return {}
    
    async def _retrieve_multilevel_context(
        self,
        user_id: str,
        session_id: str,
        conversation_id: str
    ) -> Dict[str, Any]:
        """Retrieve context from multiple scopes"""
        
        context = {
            "user_id": user_id,
            "session_id": session_id,
            "conversation_id": conversation_id,
            "user_level": {},
            "session_level": {},
            "conversation_level": {},
            "global_level": {}
        }
        
        # Get user-level context
        if user_id in self.context_store:
            user_contexts = self.context_store[user_id]
            
            # User scope
            if ContextScope.USER in user_contexts:
                for key, item in user_contexts[ContextScope.USER].items():
                    if not self._is_expired(item):
                        context["user_level"][key] = item.value
            
            # Session scope
            session_key = f"{session_id}"
            if ContextScope.SESSION in user_contexts:
                for key, item in user_contexts[ContextScope.SESSION].items():
                    if key.startswith(session_key) and not self._is_expired(item):
                        clean_key = key.replace(f"{session_key}_", "")
                        context["session_level"][clean_key] = item.value
            
            # Conversation scope
            conv_key = f"{conversation_id}"
            if ContextScope.CONVERSATION in user_contexts:
                for key, item in user_contexts[ContextScope.CONVERSATION].items():
                    if key.startswith(conv_key) and not self._is_expired(item):
                        clean_key = key.replace(f"{conv_key}_", "")
                        context["conversation_level"][clean_key] = item.value
        
        # Global context (shared across all users)
        global_key = "global"
        if global_key in self.context_store:
            global_contexts = self.context_store[global_key]
            if ContextScope.GLOBAL in global_contexts:
                for key, item in global_contexts[ContextScope.GLOBAL].items():
                    if not self._is_expired(item):
                        context["global_level"][key] = item.value
        
        return context
    
    async def update_context(
        self,
        user_id: str,
        session_id: str,
        conversation_id: str,
        context_updates: Dict[str, Any],
        scope: ContextScope = ContextScope.SESSION,
        source: str = "pam_orchestrator",
        ttl_hours: Optional[int] = None
    ) -> bool:
        """Update context with new information"""
        
        try:
            self.performance_metrics["context_updates"] += 1
            
            # Ensure user exists in context store
            if user_id not in self.context_store:
                self.context_store[user_id] = {scope: {} for scope in ContextScope}
            
            user_contexts = self.context_store[user_id]
            if scope not in user_contexts:
                user_contexts[scope] = {}
            
            # Calculate TTL
            ttl_seconds = None
            if ttl_hours:
                ttl_seconds = ttl_hours * 3600
            elif self.optimization_config["default_ttl_hours"]:
                ttl_seconds = self.optimization_config["default_ttl_hours"] * 3600
            
            # Update context items
            for key, value in context_updates.items():
                # Create scope-specific key
                if scope == ContextScope.SESSION:
                    scoped_key = f"{session_id}_{key}"
                elif scope == ContextScope.CONVERSATION:
                    scoped_key = f"{conversation_id}_{key}"
                else:
                    scoped_key = key
                
                # Determine context type
                context_type = self._infer_context_type(key, value)
                
                # Create context item
                context_item = ContextItem(
                    id=str(uuid.uuid4()),
                    type=context_type,
                    scope=scope,
                    key=scoped_key,
                    value=value,
                    confidence=0.9,  # Default confidence
                    timestamp=datetime.utcnow(),
                    ttl_seconds=ttl_seconds,
                    source=source,
                    metadata={}
                )
                
                user_contexts[scope][scoped_key] = context_item
            
            # Trigger pattern analysis
            await self._analyze_context_patterns(user_id)
            
            # Notify subscribers
            await self._notify_context_subscribers(user_id, context_updates)
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Context update failed: {e}")
            return False
    
    def _infer_context_type(self, key: str, value: Any) -> ContextType:
        """Infer context type from key and value"""
        
        key_lower = key.lower()
        
        if "location" in key_lower or "coordinates" in key_lower:
            return ContextType.LOCATION_DATA
        elif "preference" in key_lower or "setting" in key_lower:
            return ContextType.USER_PREFERENCES
        elif "history" in key_lower or "conversation" in key_lower:
            return ContextType.CONVERSATION_HISTORY
        elif "device" in key_lower or "platform" in key_lower:
            return ContextType.DEVICE_INFO
        elif "emotion" in key_lower or "mood" in key_lower:
            return ContextType.EMOTIONAL_STATE
        elif "activity" in key_lower or "action" in key_lower:
            return ContextType.ACTIVITY_CONTEXT
        elif "time" in key_lower or "temporal" in key_lower:
            return ContextType.TEMPORAL_CONTEXT
        else:
            return ContextType.INTERACTION_PATTERNS
    
    async def _get_context_predictions(
        self,
        user_id: str,
        session_id: str
    ) -> List[ContextPrediction]:
        """Generate context predictions for the user"""
        
        try:
            predictions = []
            
            # Analyze user patterns
            if user_id in self.context_patterns:
                patterns = self.context_patterns[user_id]
                
                # Simple prediction based on time patterns
                current_hour = datetime.utcnow().hour
                
                # Predict likely next actions based on time
                if 6 <= current_hour <= 9:  # Morning
                    predictions.append(ContextPrediction(
                        prediction_id=str(uuid.uuid4()),
                        predicted_context={
                            "likely_intent": "route_planning",
                            "activity_context": "morning_departure",
                            "urgency_level": "high"
                        },
                        confidence=0.75,
                        time_horizon_minutes=30,
                        reasoning="User typically plans routes in the morning",
                        created_at=datetime.utcnow()
                    ))
                
                elif 17 <= current_hour <= 20:  # Evening
                    predictions.append(ContextPrediction(
                        prediction_id=str(uuid.uuid4()),
                        predicted_context={
                            "likely_intent": "campground_search",
                            "activity_context": "evening_arrival",
                            "urgency_level": "medium"
                        },
                        confidence=0.65,
                        time_horizon_minutes=60,
                        reasoning="User typically searches for camping spots in the evening",
                        created_at=datetime.utcnow()
                    ))
            
            self.performance_metrics["predictions_generated"] += len(predictions)
            return predictions
            
        except Exception as e:
            logger.error(f"❌ Context prediction failed: {e}")
            return []
    
    async def _get_context_insights(self, user_id: str) -> List[ContextInsight]:
        """Generate insights from context analysis"""
        
        try:
            insights = []
            
            if user_id in self.context_insights:
                # Return cached insights that are still relevant
                cached_insights = self.context_insights[user_id]
                recent_insights = [
                    insight for insight in cached_insights
                    if (datetime.utcnow() - insight.created_at).total_seconds() < 3600  # 1 hour
                ]
                insights.extend(recent_insights)
            
            # Generate new insights if needed
            if len(insights) < 3:
                new_insights = await self._generate_new_insights(user_id)
                insights.extend(new_insights)
                
                # Cache insights
                if user_id not in self.context_insights:
                    self.context_insights[user_id] = []
                self.context_insights[user_id].extend(new_insights)
            
            self.performance_metrics["insights_generated"] += len(insights)
            return insights
            
        except Exception as e:
            logger.error(f"❌ Context insights generation failed: {e}")
            return []
    
    async def _generate_new_insights(self, user_id: str) -> List[ContextInsight]:
        """Generate new insights for the user"""
        
        insights = []
        
        try:
            # Analyze user context for insights
            if user_id in self.context_store:
                user_contexts = self.context_store[user_id]
                
                # Check for location-based insights
                location_items = []
                for scope_contexts in user_contexts.values():
                    for item in scope_contexts.values():
                        if item.type == ContextType.LOCATION_DATA and not self._is_expired(item):
                            location_items.append(item)
                
                if len(location_items) >= 3:
                    insights.append(ContextInsight(
                        insight_id=str(uuid.uuid4()),
                        insight_type="travel_pattern",
                        description="User shows consistent travel patterns on weekends",
                        impact_score=0.8,
                        actionable=True,
                        recommendations=[
                            "Proactively suggest weekend camping spots",
                            "Prepare route recommendations for Friday evenings"
                        ],
                        confidence=0.75,
                        created_at=datetime.utcnow()
                    ))
                
                # Check for preference insights
                pref_items = []
                for scope_contexts in user_contexts.values():
                    for item in scope_contexts.values():
                        if item.type == ContextType.USER_PREFERENCES and not self._is_expired(item):
                            pref_items.append(item)
                
                if len(pref_items) >= 5:
                    insights.append(ContextInsight(
                        insight_id=str(uuid.uuid4()),
                        insight_type="preference_stability",
                        description="User has stable preferences for voice interaction and route types",
                        impact_score=0.9,
                        actionable=True,
                        recommendations=[
                            "Use preferred voice settings by default",
                            "Prioritize scenic routes in recommendations"
                        ],
                        confidence=0.85,
                        created_at=datetime.utcnow()
                    ))
        
        except Exception as e:
            logger.error(f"❌ New insights generation failed: {e}")
        
        return insights
    
    def _get_temporal_context(self) -> Dict[str, Any]:
        """Get current temporal context"""
        
        now = datetime.utcnow()
        
        return {
            "current_time": now.isoformat(),
            "hour_of_day": now.hour,
            "day_of_week": now.weekday(),
            "is_weekend": now.weekday() >= 5,
            "is_business_hours": 9 <= now.hour <= 17,
            "season": self._get_season(now),
            "time_zone": "UTC"
        }
    
    def _get_season(self, date: datetime) -> str:
        """Determine season from date"""
        month = date.month
        if month in [12, 1, 2]:
            return "winter"
        elif month in [3, 4, 5]:
            return "spring"
        elif month in [6, 7, 8]:
            return "summer"
        else:
            return "fall"
    
    async def _get_interaction_patterns(self, user_id: str) -> Dict[str, Any]:
        """Get user interaction patterns"""
        
        patterns = {
            "total_interactions": 0,
            "preferred_times": [],
            "common_intents": [],
            "interaction_frequency": "unknown"
        }
        
        if user_id in self.context_patterns:
            user_patterns = self.context_patterns[user_id]
            patterns["total_interactions"] = len(user_patterns)
            
            # Analyze time patterns
            time_patterns = {}
            for pattern in user_patterns:
                hour = pattern.get("hour", 0)
                time_patterns[hour] = time_patterns.get(hour, 0) + 1
            
            # Find preferred times (top 3 hours)
            sorted_times = sorted(time_patterns.items(), key=lambda x: x[1], reverse=True)
            patterns["preferred_times"] = [hour for hour, count in sorted_times[:3]]
        
        return patterns
    
    async def _analyze_context_patterns(self, user_id: str):
        """Analyze and store context patterns for the user"""
        
        try:
            current_pattern = {
                "timestamp": datetime.utcnow().isoformat(),
                "hour": datetime.utcnow().hour,
                "day_of_week": datetime.utcnow().weekday(),
                "context_types": []
            }
            
            # Analyze current context
            if user_id in self.context_store:
                user_contexts = self.context_store[user_id]
                for scope_contexts in user_contexts.values():
                    for item in scope_contexts.values():
                        if not self._is_expired(item):
                            current_pattern["context_types"].append(item.type.value)
            
            # Store pattern
            if user_id not in self.context_patterns:
                self.context_patterns[user_id] = []
            
            self.context_patterns[user_id].append(current_pattern)
            
            # Limit pattern history
            max_patterns = 100
            if len(self.context_patterns[user_id]) > max_patterns:
                self.context_patterns[user_id] = self.context_patterns[user_id][-max_patterns:]
        
        except Exception as e:
            logger.error(f"❌ Pattern analysis failed: {e}")
    
    async def _notify_context_subscribers(
        self,
        user_id: str,
        context_updates: Dict[str, Any]
    ):
        """Notify subscribers of context changes"""
        
        if user_id in self.context_subscriptions:
            for callback in self.context_subscriptions[user_id]:
                try:
                    await callback(user_id, context_updates)
                except Exception as e:
                    logger.error(f"❌ Context subscriber notification failed: {e}")
    
    def _is_expired(self, context_item: ContextItem) -> bool:
        """Check if context item is expired"""
        
        if context_item.ttl_seconds is None:
            return False
        
        age_seconds = (datetime.utcnow() - context_item.timestamp).total_seconds()
        return age_seconds > context_item.ttl_seconds
    
    async def _cleanup_expired_context(self):
        """Background task to clean up expired context"""
        
        while self._running:
            try:
                await asyncio.sleep(300)  # Check every 5 minutes
                
                removed_count = 0
                for user_id, user_contexts in self.context_store.items():
                    for scope, scope_contexts in user_contexts.items():
                        expired_keys = [
                            key for key, item in scope_contexts.items()
                            if self._is_expired(item)
                        ]
                        
                        for key in expired_keys:
                            del scope_contexts[key]
                            removed_count += 1
                
                if removed_count > 0:
                    logger.info(f"🧹 Cleaned up {removed_count} expired context items")
            
            except Exception as e:
                logger.error(f"❌ Context cleanup error: {e}")
    
    async def _generate_predictions(self):
        """Background task to generate context predictions"""
        
        while self._running:
            try:
                await asyncio.sleep(1800)  # Generate every 30 minutes
                
                # Generate predictions for active users
                for user_id in self.context_store.keys():
                    if user_id != "global":
                        predictions = await self._get_context_predictions(user_id, "background")
                        logger.info(f"🔮 Generated {len(predictions)} predictions for user {user_id}")
            
            except Exception as e:
                logger.error(f"❌ Prediction generation error: {e}")
    
    def _update_retrieval_metrics(self, retrieval_time_ms: float):
        """Update context retrieval performance metrics"""
        
        total_retrievals = self.performance_metrics["context_retrievals"]
        if total_retrievals == 1:
            self.performance_metrics["avg_retrieval_time_ms"] = retrieval_time_ms
        else:
            current_avg = self.performance_metrics["avg_retrieval_time_ms"]
            new_avg = ((current_avg * (total_retrievals - 1)) + retrieval_time_ms) / total_retrievals
            self.performance_metrics["avg_retrieval_time_ms"] = new_avg
    
    def get_context_analytics(self) -> Dict[str, Any]:
        """Get context management analytics"""
        
        total_context_items = 0
        context_by_type = {}
        context_by_scope = {}
        
        for user_contexts in self.context_store.values():
            for scope, scope_contexts in user_contexts.items():
                for item in scope_contexts.values():
                    if not self._is_expired(item):
                        total_context_items += 1
                        
                        # Count by type
                        item_type = item.type.value
                        context_by_type[item_type] = context_by_type.get(item_type, 0) + 1
                        
                        # Count by scope
                        scope_name = scope.value
                        context_by_scope[scope_name] = context_by_scope.get(scope_name, 0) + 1
        
        return {
            "performance_metrics": self.performance_metrics,
            "context_distribution": {
                "total_items": total_context_items,
                "by_type": context_by_type,
                "by_scope": context_by_scope
            },
            "optimization_config": self.optimization_config,
            "active_users": len([uid for uid in self.context_store.keys() if uid != "global"]),
            "predictions_cached": sum(len(patterns) for patterns in self.context_patterns.values()),
            "insights_cached": sum(len(insights) for insights in self.context_insights.values())
        }

# Global advanced context manager
advanced_context_manager = AdvancedContextManager()

async def get_advanced_context_manager() -> AdvancedContextManager:
    """Get advanced context manager instance"""
    if not advanced_context_manager._running:
        await advanced_context_manager.initialize()
    return advanced_context_manager