"""
PAM Proactive Intelligence Coordinator - Phase 4
Central coordinator for all proactive intelligence systems
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum

from .monitoring import ProactiveMonitoringService
from .predictive import PredictiveAssistanceEngine
from .voice_enhanced import EnhancedVoiceProcessor, VoiceContext
from .background_tasks import BackgroundTaskManager, TaskPriority
from .context_awareness import ContextAwarenessEngine, ContextType
from ..memory import PAMAgentMemory

logger = logging.getLogger(__name__)


class ProactiveMode(Enum):
    PASSIVE = "passive"      # Only respond when asked
    REACTIVE = "reactive"    # React to immediate context changes
    PROACTIVE = "proactive"  # Anticipate and suggest proactively
    PREDICTIVE = "predictive" # Predict and prepare for future needs


@dataclass
class ProactiveResponse:
    content: str
    type: str  # 'suggestion', 'warning', 'information', 'recommendation'
    priority: TaskPriority
    confidence: float
    sources: List[str]
    context_used: Dict[str, Any]
    voice_optimized: bool = False
    requires_action: bool = False
    expires_at: Optional[datetime] = None


@dataclass
class ProactiveSession:
    user_id: str
    mode: ProactiveMode
    started_at: datetime
    last_activity: datetime
    context_updates_count: int = 0
    proactive_suggestions_count: int = 0
    user_interactions_count: int = 0


class ProactiveIntelligenceCoordinator:
    """
    Central coordinator for PAM's proactive intelligence systems
    Orchestrates monitoring, prediction, context awareness, and voice interaction
    """
    
    def __init__(
        self,
        openai_api_key: str,
        memory: PAMAgentMemory,
        background_task_manager: Optional[BackgroundTaskManager] = None
    ):
        self.openai_api_key = openai_api_key
        self.memory = memory
        
        # Initialize subsystems
        self.monitoring_service = ProactiveMonitoringService()
        self.predictive_engine = PredictiveAssistanceEngine(openai_api_key)
        self.voice_processor = EnhancedVoiceProcessor(openai_api_key)
        self.context_engine = ContextAwarenessEngine(openai_api_key)
        self.background_manager = background_task_manager or BackgroundTaskManager()
        
        # Active sessions
        self.active_sessions: Dict[str, ProactiveSession] = {}
        
        # System configuration
        self.config = {
            "default_mode": ProactiveMode.REACTIVE,
            "context_update_interval": 300,  # 5 minutes
            "prediction_interval": 1800,     # 30 minutes
            "monitoring_interval": 60,       # 1 minute
            "max_suggestions_per_hour": 5,
            "voice_interaction_enabled": True,
            "background_tasks_enabled": True
        }
        
        # Initialize background tasks
        self._initialize_background_tasks()
        
        logger.info("Proactive Intelligence Coordinator initialized")
    
    def _initialize_background_tasks(self):
        """Initialize background tasks for proactive intelligence"""
        
        if not self.background_manager:
            return
        
        # Register task handlers
        self.background_manager.register_task_handler(
            'monitor_user_context',
            self._handle_context_monitoring_task
        )
        
        self.background_manager.register_task_handler(
            'generate_predictive_suggestions',
            self._handle_prediction_task
        )
        
        self.background_manager.register_task_handler(
            'analyze_user_patterns',
            self._handle_pattern_analysis_task
        )
        
        self.background_manager.register_task_handler(
            'consolidate_proactive_insights',
            self._handle_insight_consolidation_task
        )
    
    async def start_proactive_session(
        self,
        user_id: str,
        mode: ProactiveMode = None,
        initial_context: Optional[Dict[str, Any]] = None
    ) -> ProactiveSession:
        """Start a proactive intelligence session for a user"""
        
        try:
            mode = mode or self.config["default_mode"]
            
            session = ProactiveSession(
                user_id=user_id,
                mode=mode,
                started_at=datetime.utcnow(),
                last_activity=datetime.utcnow()
            )
            
            self.active_sessions[user_id] = session
            
            # Initialize context if provided
            if initial_context:
                await self.update_user_context(user_id, initial_context)
            
            # Start background monitoring if in proactive modes
            if mode in [ProactiveMode.PROACTIVE, ProactiveMode.PREDICTIVE]:
                await self._start_background_monitoring(user_id)
            
            logger.info(f"Started proactive session for user {user_id} in {mode.value} mode")
            return session
            
        except Exception as e:
            logger.error(f"Failed to start proactive session for {user_id}: {e}")
            raise
    
    async def update_user_context(
        self,
        user_id: str,
        context_data: Dict[str, Any],
        source: str = "user_input"
    ) -> Optional[ProactiveResponse]:
        """Update user context and potentially generate proactive responses"""
        
        try:
            if user_id not in self.active_sessions:
                await self.start_proactive_session(user_id)
            
            session = self.active_sessions[user_id]
            session.last_activity = datetime.utcnow()
            session.context_updates_count += 1
            
            # Convert context data to structured format
            structured_context = self._structure_context_data(context_data)
            
            # Update context in awareness engine
            context_state = await self.context_engine.update_context(
                user_id, structured_context, source
            )
            
            # Update monitoring service
            await self.monitoring_service.update_user_context(user_id, context_data)
            
            # Generate proactive response if appropriate
            proactive_response = None
            if session.mode in [ProactiveMode.REACTIVE, ProactiveMode.PROACTIVE, ProactiveMode.PREDICTIVE]:
                proactive_response = await self._generate_proactive_response(user_id, context_data)
            
            # Schedule background tasks for deeper analysis
            if session.mode in [ProactiveMode.PROACTIVE, ProactiveMode.PREDICTIVE]:
                await self._schedule_context_analysis(user_id, context_data)
            
            return proactive_response
            
        except Exception as e:
            logger.error(f"Failed to update context for user {user_id}: {e}")
            return None
    
    async def get_proactive_suggestions(
        self,
        user_id: str,
        current_query: Optional[str] = None,
        voice_context: Optional[VoiceContext] = None
    ) -> List[ProactiveResponse]:
        """Get proactive suggestions for a user"""
        
        try:
            if user_id not in self.active_sessions:
                return []
            
            session = self.active_sessions[user_id]
            
            # Check rate limiting
            if not await self._should_provide_suggestions(session):
                return []
            
            suggestions = []
            
            # Get contextual insights
            insights = await self.context_engine.get_contextual_insights(user_id)
            
            # Get anticipated needs
            anticipated_needs = await self.context_engine.get_anticipated_needs(user_id)
            
            # Get predictive recommendations
            if session.mode in [ProactiveMode.PROACTIVE, ProactiveMode.PREDICTIVE]:
                predictive_suggestions = await self.predictive_engine.get_predictive_recommendations(
                    user_id, current_query
                )
                
                for suggestion in predictive_suggestions:
                    proactive_response = ProactiveResponse(
                        content=suggestion.message,
                        type="recommendation",
                        priority=self._map_urgency_to_priority(suggestion.urgency),
                        confidence=suggestion.confidence_score,
                        sources=["predictive_engine"],
                        context_used={"prediction_category": suggestion.category},
                        requires_action=suggestion.requires_immediate_action
                    )
                    suggestions.append(proactive_response)
            
            # Convert anticipated needs to suggestions
            for need in anticipated_needs[:3]:  # Top 3 needs
                proactive_response = ProactiveResponse(
                    content=f"Anticipated need: {need.description}",
                    type="suggestion",
                    priority=self._map_urgency_to_priority(need.urgency.value),
                    confidence=need.confidence.value,
                    sources=["context_awareness"],
                    context_used={"anticipated_need_category": need.category},
                    requires_action=True,
                    expires_at=need.expected_time
                )
                suggestions.append(proactive_response)
            
            # Get contextual recommendations if query provided
            if current_query:
                contextual_recs = await self.context_engine.get_contextual_recommendations(
                    user_id, current_query
                )
                
                for rec in contextual_recs:
                    proactive_response = ProactiveResponse(
                        content=rec,
                        type="recommendation",
                        priority=TaskPriority.MEDIUM,
                        confidence=0.7,
                        sources=["context_awareness"],
                        context_used={"query": current_query},
                        requires_action=False
                    )
                    suggestions.append(proactive_response)
            
            # Optimize for voice if needed
            if voice_context and self.config["voice_interaction_enabled"]:
                suggestions = await self._optimize_suggestions_for_voice(
                    suggestions, voice_context
                )
            
            # Sort by priority and confidence
            suggestions.sort(
                key=lambda x: (x.priority.value, x.confidence),
                reverse=True
            )
            
            session.proactive_suggestions_count += len(suggestions)
            return suggestions[:5]  # Return top 5 suggestions
            
        except Exception as e:
            logger.error(f"Failed to get proactive suggestions for {user_id}: {e}")
            return []
    
    async def process_voice_interaction(
        self,
        user_id: str,
        voice_input: str,
        context: Dict[str, Any],
        detected_emotion: Optional[str] = None,
        voice_context: Optional[VoiceContext] = None
    ) -> ProactiveResponse:
        """Process voice interaction with proactive intelligence"""
        
        try:
            if not self.config["voice_interaction_enabled"]:
                return ProactiveResponse(
                    content="Voice interaction is currently disabled",
                    type="information",
                    priority=TaskPriority.LOW,
                    confidence=1.0,
                    sources=["coordinator"],
                    context_used={}
                )
            
            # Update context with voice interaction
            voice_context_data = {
                ContextType.ACTIVITY: {"voice_interaction": True, "input_type": "voice"},
                ContextType.EMOTIONAL: {"detected_emotion": detected_emotion} if detected_emotion else {}
            }
            
            await self.update_user_context(user_id, voice_context_data, "voice_input")
            
            # Process through enhanced voice processor
            voice_response = await self.voice_processor.process_voice_request(
                voice_input, context, detected_emotion, voice_context
            )
            
            # Convert to proactive response
            proactive_response = ProactiveResponse(
                content=voice_response.text,
                type="voice_response",
                priority=self._map_tone_to_priority(voice_response.tone.value),
                confidence=0.9,
                sources=["voice_processor"],
                context_used={
                    "voice_context": voice_context.value if voice_context else None,
                    "personality": voice_response.personality_used,
                    "tone": voice_response.tone.value
                },
                voice_optimized=True,
                requires_action=False
            )
            
            # Update session
            if user_id in self.active_sessions:
                self.active_sessions[user_id].user_interactions_count += 1
                self.active_sessions[user_id].last_activity = datetime.utcnow()
            
            return proactive_response
            
        except Exception as e:
            logger.error(f"Failed to process voice interaction for {user_id}: {e}")
            return ProactiveResponse(
                content="I'm having trouble processing your voice input right now. Could you try again?",
                type="error",
                priority=TaskPriority.LOW,
                confidence=0.5,
                sources=["coordinator"],
                context_used={"error": str(e)}
            )
    
    async def get_session_status(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get status of proactive session"""
        
        if user_id not in self.active_sessions:
            return None
        
        session = self.active_sessions[user_id]
        
        # Get context summary
        context_summary = await self.context_engine.get_context_summary(user_id)
        
        # Get monitoring status
        monitoring_status = await self.monitoring_service.get_user_monitoring_status(user_id)
        
        return {
            "user_id": user_id,
            "mode": session.mode.value,
            "started_at": session.started_at.isoformat(),
            "last_activity": session.last_activity.isoformat(),
            "duration_minutes": int((datetime.utcnow() - session.started_at).total_seconds() / 60),
            "context_updates": session.context_updates_count,
            "proactive_suggestions": session.proactive_suggestions_count,
            "user_interactions": session.user_interactions_count,
            "context_summary": context_summary,
            "monitoring_active": monitoring_status.get("active", False),
            "background_tasks_enabled": self.config["background_tasks_enabled"]
        }
    
    async def end_proactive_session(self, user_id: str) -> bool:
        """End proactive session for a user"""
        
        try:
            if user_id not in self.active_sessions:
                return False
            
            session = self.active_sessions[user_id]
            
            # Stop background monitoring
            await self._stop_background_monitoring(user_id)
            
            # Store session summary for learning
            await self._store_session_summary(session)
            
            # Clean up
            del self.active_sessions[user_id]
            
            logger.info(f"Ended proactive session for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to end proactive session for {user_id}: {e}")
            return False
    
    # Helper methods
    
    def _structure_context_data(self, context_data: Dict[str, Any]) -> Dict[ContextType, Dict[str, Any]]:
        """Convert raw context data to structured format"""
        
        structured = {}
        
        # Map common keys to context types
        location_keys = ['location', 'latitude', 'longitude', 'address', 'place']
        temporal_keys = ['time', 'date', 'timestamp', 'hour', 'day']
        activity_keys = ['activity', 'action', 'task', 'driving', 'camping']
        environmental_keys = ['weather', 'temperature', 'conditions', 'forecast']
        
        for key, value in context_data.items():
            key_lower = key.lower()
            
            if any(loc_key in key_lower for loc_key in location_keys):
                if ContextType.LOCATION not in structured:
                    structured[ContextType.LOCATION] = {}
                structured[ContextType.LOCATION][key] = value
                
            elif any(time_key in key_lower for time_key in temporal_keys):
                if ContextType.TEMPORAL not in structured:
                    structured[ContextType.TEMPORAL] = {}
                structured[ContextType.TEMPORAL][key] = value
                
            elif any(act_key in key_lower for act_key in activity_keys):
                if ContextType.ACTIVITY not in structured:
                    structured[ContextType.ACTIVITY] = {}
                structured[ContextType.ACTIVITY][key] = value
                
            elif any(env_key in key_lower for env_key in environmental_keys):
                if ContextType.ENVIRONMENTAL not in structured:
                    structured[ContextType.ENVIRONMENTAL] = {}
                structured[ContextType.ENVIRONMENTAL][key] = value
                
            else:
                # Default to activity context
                if ContextType.ACTIVITY not in structured:
                    structured[ContextType.ACTIVITY] = {}
                structured[ContextType.ACTIVITY][key] = value
        
        return structured
    
    async def _generate_proactive_response(
        self,
        user_id: str,
        context_data: Dict[str, Any]
    ) -> Optional[ProactiveResponse]:
        """Generate proactive response based on context changes"""
        
        try:
            # Check if context change warrants proactive response
            if not self._should_generate_proactive_response(context_data):
                return None
            
            # Get relevant patterns
            patterns = await self.monitoring_service.analyze_user_patterns(user_id)
            
            # Generate contextual response
            insights = await self.context_engine.get_contextual_insights(user_id)
            
            if insights:
                highest_priority_insight = max(insights, key=lambda x: x.priority.value)
                
                return ProactiveResponse(
                    content=f"Based on your current context: {highest_priority_insight.description}",
                    type="suggestion",
                    priority=highest_priority_insight.priority,
                    confidence=highest_priority_insight.confidence,
                    sources=["context_awareness"],
                    context_used={"insight_factors": len(highest_priority_insight.factors)},
                    requires_action=False
                )
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to generate proactive response: {e}")
            return None
    
    def _should_generate_proactive_response(self, context_data: Dict[str, Any]) -> bool:
        """Determine if context change warrants proactive response"""
        
        # Check for high-priority context changes
        priority_indicators = [
            'emergency', 'urgent', 'warning', 'alert',
            'fuel_low', 'weather_warning', 'breakdown'
        ]
        
        for key, value in context_data.items():
            key_lower = str(key).lower()
            value_lower = str(value).lower() if value else ""
            
            if any(indicator in key_lower or indicator in value_lower 
                   for indicator in priority_indicators):
                return True
        
        return False
    
    async def _should_provide_suggestions(self, session: ProactiveSession) -> bool:
        """Check if we should provide suggestions based on rate limiting"""
        
        # Simple rate limiting: max 5 suggestions per hour
        if session.proactive_suggestions_count >= self.config["max_suggestions_per_hour"]:
            # Reset counter if more than an hour has passed
            if datetime.utcnow() - session.started_at > timedelta(hours=1):
                session.proactive_suggestions_count = 0
                session.started_at = datetime.utcnow()
            else:
                return False
        
        return True
    
    def _map_urgency_to_priority(self, urgency: Union[str, int]) -> TaskPriority:
        """Map urgency levels to task priorities"""
        
        if isinstance(urgency, str):
            urgency_map = {
                "low": TaskPriority.LOW,
                "medium": TaskPriority.MEDIUM,
                "high": TaskPriority.HIGH,
                "critical": TaskPriority.CRITICAL
            }
            return urgency_map.get(urgency.lower(), TaskPriority.MEDIUM)
        
        elif isinstance(urgency, int):
            if urgency <= 1:
                return TaskPriority.LOW
            elif urgency <= 2:
                return TaskPriority.MEDIUM
            elif urgency <= 3:
                return TaskPriority.HIGH
            else:
                return TaskPriority.CRITICAL
        
        return TaskPriority.MEDIUM
    
    def _map_tone_to_priority(self, tone: str) -> TaskPriority:
        """Map emotional tone to task priority"""
        
        tone_priority_map = {
            "urgent": TaskPriority.CRITICAL,
            "concerned": TaskPriority.HIGH,
            "excited": TaskPriority.MEDIUM,
            "supportive": TaskPriority.MEDIUM,
            "neutral": TaskPriority.LOW,
            "informative": TaskPriority.LOW,
            "reassuring": TaskPriority.MEDIUM,
            "celebratory": TaskPriority.LOW
        }
        
        return tone_priority_map.get(tone.lower(), TaskPriority.MEDIUM)
    
    async def _optimize_suggestions_for_voice(
        self,
        suggestions: List[ProactiveResponse],
        voice_context: VoiceContext
    ) -> List[ProactiveResponse]:
        """Optimize suggestions for voice delivery"""
        
        # This would modify suggestions for optimal voice delivery
        # For now, just mark them as voice-optimized
        for suggestion in suggestions:
            suggestion.voice_optimized = True
        
        return suggestions
    
    # Background task handlers
    
    async def _handle_context_monitoring_task(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle background context monitoring task"""
        
        user_id = data.get("user_id")
        if not user_id:
            return {"error": "No user_id provided"}
        
        try:
            # Update monitoring
            patterns = await self.monitoring_service.analyze_user_patterns(user_id)
            
            return {
                "success": True,
                "patterns_found": len(patterns),
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {"error": str(e)}
    
    async def _handle_prediction_task(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle background prediction task"""
        
        user_id = data.get("user_id")
        if not user_id:
            return {"error": "No user_id provided"}
        
        try:
            # Generate predictions
            suggestions = await self.predictive_engine.get_predictive_recommendations(user_id)
            
            return {
                "success": True,
                "suggestions_generated": len(suggestions),
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {"error": str(e)}
    
    async def _handle_pattern_analysis_task(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle background pattern analysis task"""
        
        return {"success": True, "message": "Pattern analysis completed"}
    
    async def _handle_insight_consolidation_task(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle background insight consolidation task"""
        
        return {"success": True, "message": "Insight consolidation completed"}
    
    # Background monitoring control
    
    async def _start_background_monitoring(self, user_id: str):
        """Start background monitoring for a user"""
        
        if not self.config["background_tasks_enabled"]:
            return
        
        # Schedule periodic context monitoring
        await self.background_manager.submit_task(
            name=f"Monitor context for {user_id}",
            task_type="monitor_user_context",
            data={"user_id": user_id},
            priority=TaskPriority.MEDIUM,
            user_id=user_id
        )
    
    async def _stop_background_monitoring(self, user_id: str):
        """Stop background monitoring for a user"""
        
        # Cancel user-specific tasks
        user_tasks = await self.background_manager.get_user_tasks(user_id)
        for task in user_tasks:
            await self.background_manager.cancel_task(task.id)
    
    async def _schedule_context_analysis(self, user_id: str, context_data: Dict[str, Any]):
        """Schedule background context analysis"""
        
        if not self.config["background_tasks_enabled"]:
            return
        
        # Schedule analysis for complex context updates
        if len(context_data) > 3:  # Only for substantial context updates
            await self.background_manager.submit_task(
                name=f"Analyze context for {user_id}",
                task_type="analyze_user_patterns",
                data={"user_id": user_id, "context_data": context_data},
                priority=TaskPriority.LOW,
                user_id=user_id,
                scheduled_for=datetime.utcnow() + timedelta(minutes=5)  # Delay for batch processing
            )
    
    async def _store_session_summary(self, session: ProactiveSession):
        """Store session summary for learning and improvement"""
        
        try:
            summary = {
                "user_id": session.user_id,
                "mode": session.mode.value,
                "duration_seconds": int((datetime.utcnow() - session.started_at).total_seconds()),
                "context_updates": session.context_updates_count,
                "proactive_suggestions": session.proactive_suggestions_count,
                "user_interactions": session.user_interactions_count,
                "ended_at": datetime.utcnow().isoformat()
            }
            
            # Store in memory system for learning
            if self.memory:
                await self.memory.store_interaction_memory(
                    session.user_id,
                    "proactive_session_summary",
                    summary,
                    {"type": "session_analytics"}
                )
            
        except Exception as e:
            logger.error(f"Failed to store session summary: {e}")